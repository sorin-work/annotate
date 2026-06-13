import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { MouseEvent } from 'react';
import type { Highlight, SourceType } from '../api/types';
import { toBlocks } from '../lib/blocks';
import type { Range } from '../lib/segments';
import { selectionToRange } from '../lib/selection';
import ReaderBlock from './ReaderBlock';

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

  // Each block gets the highlights overlapping it, recomputed only when they change.
  const blockHighlights = useMemo(
    () =>
      blocks.map((block) =>
        highlights.filter((h) => h.end_offset > block.textStart && h.start_offset < block.end),
      ),
    [blocks, highlights],
  );

  return (
    <div
      ref={containerRef}
      className={`reader reader-${sourceType}`}
      onMouseUp={reportSelection}
      onClick={handleClick}
      data-testid="reader"
    >
      {blocks.map((block, i) => {
        const own = blockHighlights[i]!;
        return (
          <ReaderBlock
            key={block.start}
            block={block}
            content={content}
            sourceType={sourceType}
            highlights={own}
            activeId={own.some((h) => h.id === activeId) ? (activeId ?? null) : null}
          />
        );
      })}
    </div>
  );
}

export default memo(Reader);
