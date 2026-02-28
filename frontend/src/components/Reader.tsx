import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { MouseEvent } from 'react';
import type { Highlight, SourceType } from '../api/types';
import { toBlocks } from '../lib/blocks';
import type { Block } from '../lib/blocks';
import { segmentRange } from '../lib/segments';
import type { Range } from '../lib/segments';
import { selectionToRange } from '../lib/selection';

export interface SelectionInfo extends Range {
  /** Where the selection is on screen, for positioning the toolbar. */
  rect: { top: number; left: number; width: number };
}

interface Props {
  content: string;
  sourceType: SourceType;
  highlights: Highlight[];
  activeId?: number | null;
  onSelect: (selection: SelectionInfo | null) => void;
  onHighlightClick: (id: number) => void;
}

function Reader({ content, sourceType, highlights, activeId, onSelect, onHighlightClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blocks = useMemo(() => toBlocks(content, sourceType), [content, sourceType]);
  const ranges = useMemo(
    () => highlights.map((h) => ({ id: h.id, start: h.start_offset, end: h.end_offset })),
    [highlights],
  );
  const byId = useMemo(() => new Map(highlights.map((h) => [h.id, h])), [highlights]);

  const reportSelection = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const selection = window.getSelection();
    const range = selectionToRange(container, selection, content);
    if (!range || !selection) {
      onSelect(null);
      return;
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect?.() ?? { top: 0, left: 0, width: 0 };
    onSelect({
      ...range,
      rect: { top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width },
    });
  }, [content, onSelect]);

  // Touch screens and keyboard selection (shift + arrows) never fire mouseup,
  // so also follow selection changes once they settle.
  useEffect(() => {
    let timer: number | undefined;
    function onSelectionChange() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const selection = window.getSelection();
        const container = containerRef.current;
        if (!container || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
          return;
        }
        if (container.contains(selection.getRangeAt(0).commonAncestorContainer)) {
          reportSelection();
        }
      }, 300);
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      window.clearTimeout(timer);
    };
  }, [reportSelection]);

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const mark = (event.target as HTMLElement).closest<HTMLElement>('mark[data-highlight-id]');
    if (mark && window.getSelection()?.isCollapsed !== false) {
      onHighlightClick(Number(mark.dataset.highlightId));
    }
  }

  function renderBlock(block: Block) {
    const pieces = segmentRange(block.textStart, block.end, ranges).map((segment) => {
      const text = content.slice(segment.start, segment.end);
      // The most recently created highlight wins when several overlap.
      const topId = segment.highlightIds[segment.highlightIds.length - 1];
      const top = topId !== undefined ? byId.get(topId) : undefined;
      if (!top) {
        return (
          <span key={segment.start} data-offset={segment.start}>
            {text}
          </span>
        );
      }
      const active = segment.highlightIds.includes(activeId ?? -1);
      return (
        <mark
          key={segment.start}
          data-offset={segment.start}
          data-highlight-id={top.id}
          className={`hl hl-${top.color}${active ? ' hl-active' : ''}`}
          title={top.note ?? undefined}
        >
          {text}
        </mark>
      );
    });

    const key = block.start;
    switch (block.kind) {
      case 'heading': {
        const level = Math.min(block.level ?? 2, 4) + 1;
        const Tag = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5';
        return <Tag key={key}>{pieces}</Tag>;
      }
      case 'quote':
        return <blockquote key={key}>{pieces}</blockquote>;
      case 'list-item':
        return (
          <p key={key} className="list-item">
            {pieces}
          </p>
        );
      case 'code':
        return <pre key={key}>{pieces}</pre>;
      default:
        return <p key={key}>{pieces}</p>;
    }
  }

  return (
    <div
      ref={containerRef}
      className={`reader reader-${sourceType}`}
      onMouseUp={reportSelection}
      onClick={handleClick}
      data-testid="reader"
    >
      {blocks.map(renderBlock)}
    </div>
  );
}

export default memo(Reader);
