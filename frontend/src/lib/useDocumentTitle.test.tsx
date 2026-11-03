import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  it('names the page in the browser tab', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Walden' as string | null },
    });
    expect(document.title).toBe('Walden · annotate');
    rerender({ title: null });
    expect(document.title).toBe('annotate');
  });
});
