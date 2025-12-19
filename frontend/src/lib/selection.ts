import type { Range as OffsetRange } from './segments';

/** Finds the document offset for a DOM position inside the reader. */
function pointToOffset(node: Node, offset: number): number | null {
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const holder = node.parentElement?.closest<HTMLElement>('[data-offset]');
  if (!holder) return null;
  return Number(holder.dataset.offset) + offset;
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
