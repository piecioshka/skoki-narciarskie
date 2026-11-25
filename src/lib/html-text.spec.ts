import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlToText, stripComments } from './html-text';

describe('decodeEntities', () => {
  it('decodes `&amp;` last', () => {
    expect(decodeEntities('&amp;quot; &quot;a&quot; &#039;b&apos;')).toBe(
      `&quot; "a" 'b'`,
    );
  });
});

describe('stripComments', () => {
  it('strips comments that appear once another one is removed', () => {
    expect(stripComments('a<!<!-- x -->-- y -->b', '')).toBe('ab');
  });
});

describe('htmlToText', () => {
  it('drops tags, scripts and styles and collapses whitespace', () => {
    expect(
      htmlToText(
        '<div> Hello&nbsp;<b>world</b><SCRIPT>x()</script >\n<style>p{}</style></div>',
      ),
    ).toBe('Hello world');
  });
});
