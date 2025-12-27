import { describe, expect, it } from 'vitest';
import { selectionToRange } from './selection';

const CONTENT = 'Hello brave new world';

function setup() {
  // Mirrors what the reader renders: spans tagged with their offset.
  const container = document.createElement('div');
  container.innerHTML =
    '<p><span data-offset="0">Hello </span><mark data-offset="6">brave</mark>' +
    '<span data-offset="11"> new world</span></p>';
  document.body.appendChild(container);
  const [hello, brave, rest] = Array.from(container.querySelectorAll('[data-offset]')).map(
    (el) => el.firstChild as Text,
  );
  return { container, hello: hello!, brave: brave!, rest: rest! };
}

function select(startNode: Node, startOffset: number, endNode: Node, endOffset: number) {
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  selection.addRange(range);
  return selection;
}

describe('selectionToRange', () => {
  it('maps a selection inside one span', () => {
    const { container, rest } = setup();
    const selection = select(rest, 1, rest, 4);
    expect(selectionToRange(container, selection, CONTENT)).toEqual({ start: 12, end: 15 });
  });

  it('maps a selection across spans and trims whitespace', () => {
    const { container, hello, rest } = setup();
    const selection = select(hello, 5, rest, 4);
    expect(selectionToRange(container, selection, CONTENT)).toEqual({ start: 6, end: 15 });
    expect(CONTENT.slice(6, 15)).toBe('brave new');
  });

  it('handles positions given as element offsets', () => {
    const { container } = setup();
    const paragraph = container.querySelector('p')!;
    const selection = select(paragraph, 1, paragraph, 2);
    expect(selectionToRange(container, selection, CONTENT)).toEqual({ start: 6, end: 11 });
  });

  it('ignores collapsed selections and selections outside the container', () => {
    const { container, hello } = setup();
    expect(selectionToRange(container, select(hello, 2, hello, 2), CONTENT)).toBeNull();

    const outside = document.createElement('p');
    outside.textContent = 'elsewhere';
    document.body.appendChild(outside);
    const text = outside.firstChild!;
    expect(selectionToRange(container, select(text, 0, text, 4), CONTENT)).toBeNull();
  });

  it('returns null when only whitespace is selected', () => {
    const { container, hello } = setup();
    expect(selectionToRange(container, select(hello, 5, hello, 6), CONTENT)).toBeNull();
  });
});
