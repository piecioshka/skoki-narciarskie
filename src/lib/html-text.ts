// Turns fragments of FIS pages into plain text. It has no imports on purpose:
// the refresh scripts run it directly under Node, outside of the Astro build.

/** Decodes the entities FIS uses; `&amp;` goes last, so `&amp;quot;` stays the text `&quot;`. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * Removes HTML comments, repeated until nothing changes, so a comment that
 * only appears once another one is removed is stripped as well.
 */
export function stripComments(html: string, replacement: string): string {
  let previous: string;
  let current = html;

  do {
    previous = current;
    current = current.replace(/<!--[\s\S]*?-->/g, replacement);
  } while (current !== previous);
  return current;
}

/** Removes `<script>` and `<style>` elements together with their content. */
export function stripScriptsAndStyles(html: string): string {
  return html.replace(
    /<script\b[\s\S]*?<\/script[^>]*>|<style\b[\s\S]*?<\/style[^>]*>/gi,
    ' ',
  );
}

/** Visible text of an HTML fragment, with whitespace collapsed to single spaces. */
export function htmlToText(html: string): string {
  return decodeEntities(
    stripScriptsAndStyles(stripComments(html, ' ')).replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}
