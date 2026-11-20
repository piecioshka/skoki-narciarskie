import {
  pickVideoType,
  POSTER_VIDEO_BITRATE,
  POSTER_VIDEO_SECONDS,
  posterFileName,
  posterSize,
  seededRandom,
  splitAtHyphens,
  videoExtension,
  type PosterFormat,
} from '../lib/poster';
import { getPhase, type Slot } from '../lib/schedule';
import { countdown } from '../lib/time';

// The exported file is drawn on a canvas rather than copied from the page, so
// it has a fixed size and the video can animate the snow and the seconds.

const COLORS = {
  night: '#050b1f',
  brand: '#1d4ed8',
  ink: '#ffffff',
  muted: 'rgba(255, 255, 255, 0.72)',
  accent: '#ffd23f',
  glow: 'rgba(255, 210, 63, 0.45)',
  tile: 'rgba(5, 11, 31, 0.55)',
  tileBorder: 'rgba(255, 255, 255, 0.18)',
  live: '#ff4d5e',
};

// Sizes in percent of the poster width, the same as `cqw` in the page CSS.
const SIZES = {
  wide: {
    padX: 6,
    padY: 5,
    column: 62,
    gap: 1.6,
    kicker: 1.5,
    city: 8.5,
    kind: 2.1,
    digits: 7,
    label: 1.4,
    tileGap: 1.4,
    live: 6,
    small: 1.7,
    footer: 1.5,
    flight: 0.6,
  },
  story: {
    padX: 8,
    padY: 10,
    column: 84,
    gap: 3.2,
    kicker: 3,
    city: 15,
    kind: 3.6,
    digits: 13,
    label: 2.8,
    tileGap: 2.4,
    live: 10,
    small: 3.6,
    footer: 3,
    flight: 1,
  },
};

type Sizes = (typeof SIZES)[PosterFormat];

interface PosterContent {
  format: PosterFormat;
  slot: Slot;
  slug: string;
  photo: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  sans: string;
  mono: string;
  kicker: string;
  flag: string;
  city: string;
  kind: string;
  hill: string;
  units: string[];
  live: string;
  startLabel: string;
  start: string;
  record: { before: string; value: string; after: string } | undefined;
  site: string;
}

interface Flake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  alpha: number;
}

interface Frame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  u: number;
  sizes: Sizes;
  content: PosterContent;
  photo: HTMLCanvasElement | null;
}

function text(root: ParentNode, selector: string): string {
  return (
    root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  );
}

function readRecord(element: HTMLElement): PosterContent['record'] {
  const record = element.querySelector('.poster__record');
  const value = text(element, '.poster__record-value');

  if (!record || !value) {
    return undefined;
  }

  const whole = text(element, '.poster__record');
  const at = whole.indexOf(value);

  return {
    before: whole.slice(0, at),
    value,
    after: whole.slice(at + value.length),
  };
}

function readContent(
  element: HTMLElement,
  slot: Slot,
  format: PosterFormat,
  live: string,
): PosterContent {
  const lang = document.documentElement.lang;
  const fontOf = (selector: string): string => {
    const target = element.querySelector(selector);

    return target ? getComputedStyle(target).fontFamily : 'sans-serif';
  };

  return {
    format,
    slot,
    slug: element.dataset['event'] ?? 'poster',
    photo: element.querySelector<HTMLImageElement>('.poster__photo'),
    logo: element.querySelector<HTMLImageElement>('.poster__logo'),
    sans: fontOf('.poster__city'),
    mono: fontOf('.poster__digits'),
    kicker: text(element, '.poster__kicker').toLocaleUpperCase(lang),
    flag: text(element, '.poster__flag'),
    city: text(element, '.poster__city-name').toLocaleUpperCase(lang),
    kind: text(element, '.poster__kind-name'),
    hill: text(element, '.poster__hill'),
    units: [...element.querySelectorAll('.poster__unit-label')].map(
      (label) => label.textContent?.trim().toLocaleUpperCase(lang) ?? '',
    ),
    live: live.toLocaleUpperCase(lang),
    startLabel: text(element, '.poster__start-label'),
    start: text(element, '.poster__start .slot-time'),
    record: readRecord(element),
    site: text(element, '.poster__site'),
  };
}

function makeSnow(): Flake[] {
  const random = seededRandom(2027);

  return Array.from({ length: 160 }, () => ({
    x: random(),
    y: random(),
    radius: 0.08 + random() * 0.22,
    speed: 0.02 + random() * 0.05,
    drift: (random() - 0.5) * 0.02,
    alpha: 0.4 + random() * 0.5,
  }));
}

const SNOW = makeSnow();

function drawBackground(frame: Frame, time: number): void {
  const { ctx, width, height } = frame;
  const glow = ctx.createRadialGradient(
    width * 0.85,
    0,
    0,
    width * 0.85,
    0,
    Math.max(width, height) * 0.9,
  );

  ctx.fillStyle = COLORS.night;
  ctx.fillRect(0, 0, width, height);
  glow.addColorStop(0, COLORS.brand);
  glow.addColorStop(1, 'rgba(29, 78, 216, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const photo = frame.photo;

  if (photo) {
    // Cover the canvas and zoom in slowly, like the page animation.
    const zoom = 1.06 + 0.06 * Math.min(1, time / POSTER_VIDEO_SECONDS);
    const scale = Math.max(width / photo.width, height / photo.height) * zoom;
    const w = photo.width * scale;
    const h = photo.height * scale;

    ctx.drawImage(photo, (width - w) / 2, (height - h) / 2, w, h);
  }
}

/** The photo with its color filter applied once, so frames stay cheap. */
function preparePhoto(
  image: HTMLImageElement | null,
): HTMLCanvasElement | null {
  if (!image || image.naturalWidth === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  ctx.filter = 'saturate(1.15) contrast(1.05)';
  ctx.drawImage(image, 0, 0);
  return canvas;
}

function fillGradient(
  frame: Frame,
  coords: [number, number, number, number],
  stops: [number, string][],
): void {
  const gradient = frame.ctx.createLinearGradient(...coords);

  for (const [offset, color] of stops) {
    gradient.addColorStop(offset, color);
  }
  frame.ctx.fillStyle = gradient;
  frame.ctx.fillRect(0, 0, frame.width, frame.height);
}

function drawShade(frame: Frame): void {
  const { width: w, height: h } = frame;

  if (frame.content.format === 'story') {
    fillGradient(
      frame,
      [0, 0, 0, h],
      [
        [0, 'rgba(5, 11, 31, 0.55)'],
        [0.45, 'rgba(5, 11, 31, 0.88)'],
        [1, 'rgba(5, 11, 31, 0.96)'],
      ],
    );
    fillGradient(
      frame,
      [0, h, 0, h * 0.4],
      [
        [0, 'rgba(29, 78, 216, 0.3)'],
        [1, 'rgba(29, 78, 216, 0)'],
      ],
    );
    return;
  }
  fillGradient(
    frame,
    [0, 0, w, h * 0.18],
    [
      [0, 'rgba(5, 11, 31, 0.94)'],
      [0.42, 'rgba(5, 11, 31, 0.78)'],
      [1, 'rgba(29, 78, 216, 0.25)'],
    ],
  );
  fillGradient(
    frame,
    [0, h, 0, h * 0.55],
    [
      [0, 'rgba(5, 11, 31, 0.85)'],
      [1, 'rgba(5, 11, 31, 0)'],
    ],
  );
}

function drawSnow(frame: Frame, time: number): void {
  const { ctx, width, height, u } = frame;

  ctx.fillStyle = COLORS.ink;
  for (const flake of SNOW) {
    const y = (flake.y + flake.speed * time) % 1;
    const x = (flake.x + flake.drift * time + 1) % 1;

    ctx.globalAlpha = flake.alpha * 0.7;
    ctx.beginPath();
    ctx.arc(x * width, y * height, flake.radius * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFlight(frame: Frame, time: number): void {
  const { ctx, width, height, sizes } = frame;
  const boxWidth = width * sizes.flight;
  const k = boxWidth / 400;
  const hill = new Path2D('M0 40 Q 120 60 160 110 T 400 200');
  const path = new Path2D('M150 92 Q 260 70 380 170');

  ctx.save();
  ctx.globalAlpha = frame.content.format === 'story' ? 0.35 : 0.5;
  ctx.translate(width - boxWidth, height - 200 * k);
  ctx.scale(k, k);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke(hill);
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([2, 9]);
  ctx.lineDashOffset = -((time / 3) * 22);
  ctx.stroke(path);
  ctx.restore();
}

function font(
  frame: Frame,
  size: number,
  weight: number,
  family: 'sans' | 'mono',
  italic = false,
): void {
  const name = family === 'sans' ? frame.content.sans : frame.content.mono;

  frame.ctx.font = `${italic ? 'italic ' : ''}${weight} ${size * frame.u}px ${name}`;
}

function spacing(frame: Frame, em: number, size: number): void {
  frame.ctx.letterSpacing = `${em * size * frame.u}px`;
}

/** City lines and their font size, shrunk until the longest line fits. */
function fitCity(
  frame: Frame,
  available: number,
): { lines: string[]; size: number } {
  const { content, sizes } = frame;
  const attempt = (lines: string[], size: number): boolean => {
    font(frame, size, 900, 'sans', true);
    spacing(frame, -0.03, size);
    return lines.every(
      (line) => frame.ctx.measureText(line).width <= available,
    );
  };

  for (const lines of [[content.city], splitAtHyphens(content.city)]) {
    for (let size = sizes.city; size >= sizes.city * 0.55; size -= 0.25) {
      if (attempt(lines, size)) {
        return { lines, size };
      }
    }
  }
  return { lines: splitAtHyphens(content.city), size: sizes.city * 0.55 };
}

interface Run {
  text: string;
  color: string;
  weight: number;
  family: 'sans' | 'mono';
}

interface Block {
  height: number;
  draw: (top: number) => void;
}

function kickerBlock(frame: Frame, left: number): Block {
  const { ctx, u, sizes, content } = frame;
  const size = sizes.kicker;
  const padX = size * 1.07;
  const height = size * u * 2;

  return {
    height,
    draw: (top) => {
      font(frame, size, 700, 'sans');
      spacing(frame, 0.12, size);
      const width = ctx.measureText(content.kicker).width + padX * u * 2;

      ctx.fillStyle = COLORS.accent;
      ctx.beginPath();
      ctx.roundRect(left, top, width, height, height / 2);
      ctx.fill();
      ctx.fillStyle = COLORS.night;
      ctx.textBaseline = 'middle';
      ctx.fillText(content.kicker, left + padX * u, top + height / 2);
    },
  };
}

function cityBlock(frame: Frame, left: number, right: number): Block {
  const { ctx, u, content } = frame;
  const flagGap = 2 * u;
  const flagWidth = (size: number): number => size * u * 0.9;
  const first = fitCity(
    frame,
    right - left - flagWidth(frame.sizes.city) - flagGap,
  );
  const { lines, size } = fitCity(
    frame,
    right - left - flagWidth(first.size) - flagGap,
  );
  const lineHeight = size * u * 0.95;

  return {
    height: lineHeight * lines.length,
    draw: (top) => {
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '0px';
      ctx.font = `${size * u * 0.7}px ${content.sans}`;
      ctx.fillText(content.flag, left, top + lineHeight / 2);
      font(frame, size, 900, 'sans', true);
      spacing(frame, -0.03, size);
      ctx.fillStyle = COLORS.ink;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 2.4 * u;
      ctx.shadowOffsetY = 0.4 * u;
      lines.forEach((line, index) => {
        ctx.fillText(
          line,
          left + flagWidth(size) + flagGap,
          top + lineHeight * (index + 0.5),
        );
      });
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    },
  };
}

/** One line of text runs, each with its own color and weight. */
function runsBlock(
  frame: Frame,
  left: number,
  right: number,
  base: number,
  runs: Run[],
): Block {
  const { ctx, u } = frame;
  const measure = (size: number): number =>
    runs.reduce((sum, run) => {
      font(frame, size, run.weight, run.family);
      ctx.letterSpacing = '0px';
      return sum + ctx.measureText(run.text).width;
    }, 0);
  // A long line (a record holder with a long name) gets smaller type.
  const size = base * Math.min(1, (right - left) / measure(base));

  return {
    height: base * u * 1.4,
    draw: (top) => {
      let x = left;

      ctx.textBaseline = 'middle';
      for (const run of runs) {
        font(frame, size, run.weight, run.family);
        ctx.letterSpacing = '0px';
        ctx.fillStyle = run.color;
        ctx.fillText(run.text, x, top + base * u * 0.7);
        x += ctx.measureText(run.text).width;
      }
    },
  };
}

function clockBlock(frame: Frame, left: number, now: Date): Block {
  const { ctx, u, sizes, content } = frame;
  const gap = sizes.tileGap * u;
  const tileWidth = (sizes.column * u - gap * 3) / 4;
  // Padding, digits, a small gap and the unit label, in poster units.
  const padTop = sizes.digits * 0.22;
  const midGap = sizes.label * 0.6;
  const height =
    (padTop + sizes.digits + midGap + sizes.label * 1.2 + sizes.digits * 0.16) *
    u;
  const remaining = countdown(now, content.slot.start);
  const values = [
    remaining.days,
    remaining.hours,
    remaining.minutes,
    remaining.seconds,
  ];

  return {
    height,
    draw: (top) => {
      values.forEach((value, index) => {
        const x = left + index * (tileWidth + gap);
        const middle = x + tileWidth / 2;

        ctx.fillStyle = COLORS.tile;
        ctx.strokeStyle = COLORS.tileBorder;
        ctx.lineWidth = Math.max(1, u * 0.1);
        ctx.beginPath();
        ctx.roundRect(x, top, tileWidth, height, 1.4 * u);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        font(frame, sizes.digits, 800, 'mono');
        ctx.letterSpacing = '0px';
        ctx.fillStyle = COLORS.accent;
        ctx.shadowColor = COLORS.glow;
        ctx.shadowBlur = 2.4 * u;
        ctx.fillText(
          String(value).padStart(2, '0'),
          middle,
          top + (padTop + sizes.digits * 0.86) * u,
        );
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        font(frame, sizes.label, 600, 'sans');
        spacing(frame, 0.14, sizes.label);
        ctx.fillStyle = COLORS.muted;
        ctx.fillText(
          content.units[index] ?? '',
          middle,
          top + (padTop + sizes.digits + midGap + sizes.label) * u,
        );
        ctx.textAlign = 'left';
      });
    },
  };
}

function liveBlock(frame: Frame, left: number, time: number): Block {
  const { ctx, u, sizes, content } = frame;
  const size = sizes.live;
  const height = size * u * 1.5;

  return {
    height,
    draw: (top) => {
      const pulse = 1 + 0.04 * Math.sin((time / 1.6) * Math.PI * 2);

      font(frame, size, 900, 'sans', true);
      ctx.letterSpacing = '0px';
      const width = ctx.measureText(content.live).width + size * u;

      ctx.save();
      ctx.translate(left + width / 2, top + height / 2);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = COLORS.live;
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, 1.4 * u);
      ctx.fill();
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(content.live, 0, 0);
      ctx.restore();
    },
  };
}

function footerBlock(frame: Frame, left: number, right: number): Block {
  const { ctx, u, sizes, content } = frame;
  const size = sizes.footer;
  const height = size * u * 3;

  return {
    height,
    draw: (top) => {
      const middle = top + height * 0.62;
      const logo = size * u * 1.4;

      ctx.fillStyle = COLORS.tileBorder;
      ctx.fillRect(left, top, right - left, Math.max(1, u * 0.1));
      if (content.logo && content.logo.complete) {
        ctx.drawImage(content.logo, left, middle - logo / 2, logo, logo);
      }
      font(frame, size, 700, 'sans');
      ctx.letterSpacing = '0px';
      ctx.fillStyle = COLORS.ink;
      ctx.textBaseline = 'middle';
      ctx.fillText(content.site, left + logo + size * u * 0.8, middle);
    },
  };
}

function buildBlocks(frame: Frame, now: Date, time: number): Block[] {
  const { u, sizes, content, width } = frame;
  const left = sizes.padX * u;
  const right = width - sizes.padX * u;
  const upcoming = getPhase(now, content.slot) === 'upcoming';
  const record = content.record;

  return [
    kickerBlock(frame, left),
    cityBlock(frame, left, right),
    runsBlock(frame, left, right, sizes.kind, [
      {
        text: `${content.kind}   `,
        color: COLORS.ink,
        weight: 600,
        family: 'sans',
      },
      { text: content.hill, color: COLORS.muted, weight: 600, family: 'sans' },
    ]),
    upcoming ? clockBlock(frame, left, now) : liveBlock(frame, left, time),
    runsBlock(frame, left, right, sizes.small, [
      {
        text: `${content.startLabel} `,
        color: COLORS.muted,
        weight: 400,
        family: 'sans',
      },
      { text: content.start, color: COLORS.ink, weight: 700, family: 'mono' },
    ]),
    ...(record
      ? [
          runsBlock(frame, left, right, sizes.small, [
            {
              text: record.before,
              color: COLORS.muted,
              weight: 400,
              family: 'sans',
            },
            {
              text: record.value,
              color: COLORS.ink,
              weight: 700,
              family: 'sans',
            },
            {
              text: record.after,
              color: COLORS.muted,
              weight: 400,
              family: 'sans',
            },
          ]),
        ]
      : []),
    footerBlock(frame, left, right),
  ];
}

function drawPoster(frame: Frame, now: Date, time: number): void {
  const { u, sizes, height, content } = frame;

  drawBackground(frame, time);
  drawShade(frame);
  drawSnow(frame, time);
  drawFlight(frame, time);

  const blocks = buildBlocks(frame, now, time);
  const gap = sizes.gap * u;
  const total =
    blocks.reduce((sum, block) => sum + block.height, 0) +
    gap * (blocks.length - 1);
  // Landscape centers the text, the story keeps it in the lower part.
  let top =
    content.format === 'story'
      ? height - sizes.padY * u - total
      : (height - total) / 2;

  for (const block of blocks) {
    block.draw(top);
    top += block.height + gap;
  }
}

function createFrame(content: PosterContent): {
  canvas: HTMLCanvasElement;
  frame: Frame;
} {
  const { width, height } = posterSize(content.format);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D is not available');
  }
  canvas.width = width;
  canvas.height = height;
  return {
    canvas,
    frame: {
      ctx,
      width,
      height,
      u: width / 100,
      sizes: SIZES[content.format],
      content,
      photo: preparePhoto(content.photo),
    },
  };
}

function download(blob: Blob, name: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = href;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

async function renderImage(content: PosterContent): Promise<Blob> {
  const { canvas, frame } = createFrame(content);

  drawPoster(frame, new Date(), 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    throw new Error('The canvas gave no image');
  }
  return blob;
}

async function exportImage(content: PosterContent): Promise<void> {
  download(
    await renderImage(content),
    posterFileName(content.slug, content.slot.start, content.format, 'png'),
  );
}

function canCopyImage(): boolean {
  return 'ClipboardItem' in window && 'write' in navigator.clipboard;
}

/**
 * Safari accepts a clipboard write only within the click itself, so the item
 * gets a promise of the image right away and the drawing happens inside it.
 */
async function copyImage(content: Promise<PosterContent>): Promise<void> {
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': content.then(renderImage) }),
  ]);
}

async function exportVideo(
  content: PosterContent,
  type: string,
): Promise<void> {
  const { canvas, frame } = createFrame(content);
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: type,
    videoBitsPerSecond: POSTER_VIDEO_BITRATE,
  });
  const chunks: Blob[] = [];
  const started = performance.now();
  const stopped = new Promise<void>((resolve) => {
    recorder.addEventListener('stop', () => resolve());
  });

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });
  drawPoster(frame, new Date(), 0);
  recorder.start(1000);

  // The clock on the video ticks in real time, so it is recorded in real time.
  const tick = (): void => {
    const time = (performance.now() - started) / 1000;

    if (time >= POSTER_VIDEO_SECONDS) {
      recorder.stop();
      return;
    }
    drawPoster(frame, new Date(), time);
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
  await stopped;
  for (const track of stream.getTracks()) {
    track.stop();
  }
  download(
    new Blob(chunks, { type }),
    posterFileName(
      content.slug,
      content.slot.start,
      content.format,
      videoExtension(type),
    ),
  );
}

export interface PosterExportOptions {
  /** The poster on screen and its time slot, if there is one. */
  current: () => { element: HTMLElement; slot: Slot } | undefined;
  liveLabel: (slot: Slot) => string;
}

function setBusy(
  buttons: HTMLElement[],
  active: HTMLElement | undefined,
): void {
  for (const button of buttons) {
    const busy = button === active;
    const label = button.querySelector('.js-poster-export-label');

    button.toggleAttribute('disabled', active !== undefined);
    button.setAttribute('aria-busy', String(busy));
    if (label) {
      label.textContent =
        (busy ? button.dataset['busy'] : button.dataset['idle']) ?? '';
    }
  }
}

export function setupPosterExport(options: PosterExportOptions): void {
  const buttons = [
    ...document.querySelectorAll<HTMLElement>('.js-poster-export'),
  ];
  const status = document.querySelector('.js-poster-export-status');
  const stage = document.querySelector<HTMLElement>('.js-poster-stage');
  const videoType =
    'MediaRecorder' in window
      ? pickVideoType((type) => MediaRecorder.isTypeSupported(type))
      : undefined;

  const formatOf = (): PosterFormat =>
    stage?.dataset['format'] === 'story' ? 'story' : 'wide';
  const contentOf = async (
    current: NonNullable<ReturnType<PosterExportOptions['current']>>,
  ): Promise<PosterContent> => {
    await document.fonts.ready;
    return readContent(
      current.element,
      current.slot,
      formatOf(),
      options.liveLabel(current.slot),
    );
  };
  const exportFor = (
    kind: string | undefined,
    content: Promise<PosterContent>,
  ): Promise<void> => {
    if (kind === 'copy') {
      return copyImage(content);
    }
    return content.then((value) =>
      kind === 'video' && videoType
        ? exportVideo(value, videoType)
        : exportImage(value),
    );
  };

  const run = async (button: HTMLElement): Promise<void> => {
    const current = options.current();
    const kind = button.dataset['kind'];

    if (!current || !status) {
      return;
    }
    if (
      (kind === 'video' && !videoType) ||
      (kind === 'copy' && !canCopyImage())
    ) {
      status.textContent = button.dataset['unsupported'] ?? '';
      return;
    }

    // Started before any await, so the clipboard still sees the click.
    const job = exportFor(kind, contentOf(current));

    setBusy(buttons, button);
    status.textContent = '';
    try {
      await job;
      status.textContent = button.dataset['done'] ?? '';
    } catch (error) {
      console.error(error);
      status.textContent = button.dataset['failed'] ?? '';
    } finally {
      setBusy(buttons, undefined);
    }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      void run(button);
    });
  }
}
