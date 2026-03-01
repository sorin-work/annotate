import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebouncedValue', () => {
  it('only updates after the value settles', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'ab' });
    act(() => vi.advanceTimersByTime(150));
    rerender({ value: 'abc' });
    act(() => vi.advanceTimersByTime(150));
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe('abc');
  });
});
