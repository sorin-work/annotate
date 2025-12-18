import type { SourceType } from '../api/types';

/**
 * A block of the document as it is rendered in the reader.
 *
 * Offsets always point into the original document text, so a selection inside
 * any block maps straight back to the offsets the API stores. `textStart` is
 * where the visible text begins: Markdown markers such as `## ` or `> ` sit
 * between `start` and `textStart` and are not rendered.
 */
export interface Block {
  kind: 'paragraph' | 'heading' | 'quote' | 'list-item' | 'code';
  level?: number;
  start: number;
  textStart: number;
  end: number;
}

interface Line {
  text: string;
  start: number;
  end: number;
}

function splitLines(content: string): Line[] {
  const lines: Line[] = [];
  let start = 0;
  for (const text of content.split('\n')) {
    lines.push({ text, start, end: start + text.length });
    start += text.length + 1;
  }
  return lines;
}

const HEADING = /^(#{1,6})\s+/;
const QUOTE = /^>\s?/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+/;
const FENCE = /^(```|~~~)/;

function paragraphs(lines: Line[]): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const line of lines) {
    if (line.text.trim() === '') {
      current = null;
      continue;
    }
    if (current) {
      current.end = line.end;
    } else {
      current = { kind: 'paragraph', start: line.start, textStart: line.start, end: line.end };
      blocks.push(current);
    }
  }
  return blocks;
}

function markdownBlocks(lines: Line[]): Block[] {
  const blocks: Block[] = [];
  let paragraph: Block | null = null;
  let code: Block | null = null;

  for (const line of lines) {
    const text = line.text;

    if (code) {
      if (FENCE.test(text.trim())) {
        code = null;
      } else {
        if (code.textStart === -1) code.textStart = line.start;
        code.end = line.end;
      }
      continue;
    }
    if (FENCE.test(text.trim())) {
      paragraph = null;
      code = { kind: 'code', start: line.start, textStart: -1, end: line.end };
      blocks.push(code);
      continue;
    }
    if (text.trim() === '') {
      paragraph = null;
      continue;
    }

    const heading = HEADING.exec(text);
    const quote = QUOTE.exec(text);
    const listItem = LIST_ITEM.exec(text);
    const marker = heading ?? quote ?? listItem;
    if (marker) {
      paragraph = null;
      blocks.push({
        kind: heading ? 'heading' : quote ? 'quote' : 'list-item',
        level: heading ? heading[1]!.length : undefined,
        start: line.start,
        textStart: line.start + marker[0].length,
        end: line.end,
      });
      continue;
    }

    if (paragraph) {
      paragraph.end = line.end;
    } else {
      paragraph = { kind: 'paragraph', start: line.start, textStart: line.start, end: line.end };
      blocks.push(paragraph);
    }
  }

  // Empty fenced blocks have nothing to show.
  return blocks.filter((block) => block.textStart !== -1 && block.end > block.textStart);
}

export function toBlocks(content: string, sourceType: SourceType): Block[] {
  const lines = splitLines(content);
  return sourceType === 'markdown' ? markdownBlocks(lines) : paragraphs(lines);
}
