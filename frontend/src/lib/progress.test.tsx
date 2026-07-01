import { render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  firstVisibleOffset,
  measureProgress,
  scrollToOffset,
  useReadingProgress,
} from './progress';

function container(offsets: number[], bottoms: number[]) {
  const { container: root } = render(
    <div>
      {offsets.map((offset) => (
        <p key={offset}>
          <span data-offset={offset}>text</span>
        </p>
      ))}
    </div>,
  );
  const spans = root.querySelectorAll<HTMLElement>('[data-offset]');
  spans.forEach((span, i) => {
    span.getBoundingClientRect = () => ({ bottom: bottoms[i] }) as DOMRect;
    span.scrollIntoView = vi.fn();
  });
  return { root: root.firstElementChild as HTMLElement, spans };
}

describe('measureProgress', () => {
  it('measures how much of the text has been on screen', () => {
    expect(measureProgress(100, 1000, 600)).toBe(0.5);
    expect(measureProgress(-2000, 1000, 600)).toBe(1);
    expect(measureProgress(900, 1000, 600)).toBe(0);
    expect(measureProgress(0, 0, 600)).toBe(1);
  });
});

describe('positions', () => {
  it('finds the first text still on screen', () => {
    const { root } = container([0, 120, 300], [-40, 10, 200]);
    expect(firstVisibleOffset(root)).toBe(120);
  });

  it('scrolls to the piece containing an offset', () => {
    const { root, spans } = container([0, 120, 300], [0, 0, 0]);
    scrollToOffset(root, 150);
    expect(spans[1]!.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(spans[2]!.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('useReadingProgress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves once scrolling settles and skips unchanged spots', () => {
    const { root } = container([0, 120], [-10, 50]);
    root.getBoundingClientRect = () => ({ top: -200, height: 1000 }) as DOMRect;
    const onSave = vi.fn();
    renderHook(() => useReadingProgress({ current: root }, true, onSave));

    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(1000);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0]).toEqual({
      progress: Math.round(((window.innerHeight + 200) / 1000) * 1000) / 1000,
      position: 120,
    });
    expect(onSave.mock.calls[0]![1]).toBe(false);

    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(1000);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
