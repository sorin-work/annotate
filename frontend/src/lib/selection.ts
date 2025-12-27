import type { Range as OffsetRange } from './segments';

/** Finds the document offset for a DOM position inside the reader. */
function pointToOffset(node: Node, offset: number): number | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const holder = node.parentElement?.closest<HTMLElement>('[data-offset]');
    if (!holder) return null;
    return Number(holder.dataset.offset) + offset;
  }

  // Element positions point *between* children: use the next text node, or the
  // end of the previous one when the position is after the last child.
  const element = node as Element;
  const next = element.childNodes[offset];
  if (next) {
    const text = firstText(next);
    if (text) return pointToOffset(text, 0);
  }
  const previous = offset > 0 ? element.childNodes[offset - 1] : undefined;
  if (previous) {
    const text = lastText(previous);
    if (text) return pointToOffset(text, text.textContent?.length ?? 0);
  }
  return null;
}

function firstText(node: Node): Text | null {
  if (node.nodeType === Node.TEXT_NODE) return node as Text;
  for (const child of Array.from(node.childNodes)) {
    const found = firstText(child);
    if (found) return found;
  }
  return null;
}

function lastText(node: Node): Text | null {
  if (node.nodeType === Node.TEXT_NODE) return node as Text;
  const children = Array.from(node.childNodes).reverse();
  for (const child of children) {
    const found = lastText(child);
    if (found) return found;
  }
  return null;
}

/**
 * Converts the current browser selection into `{start, end}` offsets of the
 * document text, trimmed of surrounding whitespace. Returns null when nothing
 * useful is selected or the selection is outside `container`.
 */
export function selectionToRange(
  container: HTMLElement,
  selection: Selection | null,
  content: string,
): OffsetRange | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }

  let start = pointToOffset(range.startContainer, range.startOffset);
  let end = pointToOffset(range.endContainer, range.endOffset);
  if (start === null || end === null) return null;
  if (end < start) [start, end] = [end, start];

  while (start < end && /\s/.test(content[start] ?? '')) start++;
  while (end > start && /\s/.test(content[end - 1] ?? '')) end--;
  return end > start ? { start, end } : null;
}
