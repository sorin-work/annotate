import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Highlight, SourceType } from '../api/types';
import type { Block } from '../lib/blocks';
import { layoutPieces, parseInline } from '../lib/inline';
import type { Piece } from '../lib/inline';
import { segmentRange } from '../lib/segments';

interface Props {
  block: Block;
  content: string;
  sourceType: SourceType;
  /** Only the highlights that overlap this block. */
  highlights: Highlight[];
  /** The active highlight, if it is one of `highlights`. */
  activeId: number | null;
}

function ReaderBlock({ block, content, sourceType, highlights, activeId }: Props) {
  const ranges = useMemo(
    () => highlights.map((h) => ({ id: h.id, start: h.start_offset, end: h.end_offset })),
    [highlights],
  );
  const byId = useMemo(() => new Map(highlights.map((h) => [h.id, h])), [highlights]);

  function renderPiece(piece: Piece) {
    const text = content.slice(piece.start, piece.end);
    // The most recently created highlight wins when several overlap.
    const topId = piece.highlightIds[piece.highlightIds.length - 1];
    const top = topId !== undefined ? byId.get(topId) : undefined;
    if (!top) {
      return (
        <span key={piece.start} data-offset={piece.start}>
          {text}
        </span>
      );
    }
    const active = piece.highlightIds.includes(activeId ?? -1);
    return (
      <mark
        key={piece.start}
        data-offset={piece.start}
        data-highlight-id={top.id}
        className={`hl hl-${top.color}${active ? ' hl-active' : ''}`}
        title={top.note ?? undefined}
      >
        {text}
      </mark>
    );
  }

  function renderBlock() {
    const segments = segmentRange(block.textStart, block.end, ranges);
    const inline =
      sourceType === 'markdown' && block.kind !== 'code'
        ? layoutPieces(segments, parseInline(content, block.textStart, block.end))
        : segments;

    // Neighbouring pieces of one bold/italic/code span share a wrapper element.
    const pieces: ReactNode[] = [];
    for (let i = 0; i < inline.length;) {
      const piece: Piece = inline[i]!;
      if (piece.span === undefined) {
        pieces.push(renderPiece(piece));
        i++;
        continue;
      }
      const group: Piece[] = [];
      while (i < inline.length && (inline[i] as Piece).span === piece.span)
        group.push(inline[i++]!);
      const key = `s${piece.start}`;
      if (piece.style === 'link') {
        pieces.push(
          <a key={key} href={piece.href} target="_blank" rel="noreferrer noopener">
            {group.map(renderPiece)}
          </a>,
        );
      } else {
        const Wrapper = piece.style!;
        pieces.push(<Wrapper key={key}>{group.map(renderPiece)}</Wrapper>);
      }
    }

    switch (block.kind) {
      case 'heading': {
        const level = Math.min(block.level ?? 2, 4) + 1;
        const Tag = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5';
        return <Tag>{pieces}</Tag>;
      }
      case 'quote':
        return <blockquote>{pieces}</blockquote>;
      case 'list-item':
        return <p className="list-item">{pieces}</p>;
      case 'code':
        return <pre>{pieces}</pre>;
      default:
        return <p>{pieces}</p>;
    }
  }

  return renderBlock();
}

function sameHighlights(a: Highlight[], b: Highlight[]) {
  return a.length === b.length && a.every((h, i) => h === b[i]);
}

/**
 * Re-rendering a long document on every click is slow, so a block only
 * updates when its own highlights or the active state inside it change.
 */
export default memo(
  ReaderBlock,
  (prev, next) =>
    prev.block === next.block &&
    prev.content === next.content &&
    prev.sourceType === next.sourceType &&
    prev.activeId === next.activeId &&
    sameHighlights(prev.highlights, next.highlights),
);
