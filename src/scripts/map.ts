import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Point {
  label: string;
  note: string;
  lat: number;
  lon: number;
  href: string;
}

function isPoint(value: unknown): value is Point {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { label, note, lat, lon, href } = Object.fromEntries(
    Object.entries(value),
  );

  return (
    typeof label === 'string' &&
    typeof note === 'string' &&
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    typeof href === 'string'
  );
}

function readPoints(element: HTMLElement): Point[] {
  const parsed: unknown = JSON.parse(element.dataset['points'] ?? '[]');

  return Array.isArray(parsed) ? parsed.filter(isPoint) : [];
}

function buildPopup(point: Point): HTMLElement {
  const wrapper = document.createElement('div');
  const link = document.createElement('a');
  const note = document.createElement('div');

  link.href = point.href;
  link.textContent = point.label;
  link.className = 'map__link';
  note.textContent = point.note;
  note.className = 'map__note';
  wrapper.append(link, note);
  return wrapper;
}

function setupMap(element: HTMLElement): void {
  const points = readPoints(element);

  if (points.length === 0) {
    return;
  }

  // Page scrolling must not get trapped by the map.
  const map = L.map(element, { scrollWheelZoom: false });
  const color = getComputedStyle(element).getPropertyValue('--map-marker');

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 15,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  for (const point of points) {
    L.circleMarker([point.lat, point.lon], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: color.trim() || '#1d4ed8',
      fillOpacity: 1,
    })
      .bindPopup(buildPopup(point))
      .bindTooltip(point.label)
      .addTo(map);
  }
  map.fitBounds(L.latLngBounds(points.map((point) => [point.lat, point.lon])), {
    padding: [32, 32],
    maxZoom: 9,
  });
  element.dataset['ready'] = 'true';
}

for (const element of document.querySelectorAll<HTMLElement>('.js-map')) {
  setupMap(element);
}
