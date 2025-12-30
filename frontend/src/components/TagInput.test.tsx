import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import TagInput, { normaliseTag } from './TagInput';

function Controlled({
  initial = [],
  onChange,
}: {
  initial?: string[];
  onChange?: (t: string[]) => void;
}) {
  const [tags, setTags] = useState(initial);
  return (
    <TagInput
      value={tags}
      onChange={(next) => {
        setTags(next);
        onChange?.(next);
      }}
    />
  );
}

describe('TagInput', () => {
  it('adds tags on Enter and comma, normalised and without duplicates', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByLabelText('Add tag');

    await userEvent.type(input, '#Stoicism{Enter}');
    await userEvent.type(input, 'deep  work,');
    await userEvent.type(input, 'stoicism{Enter}');

    expect(screen.getByText('#stoicism')).toBeInTheDocument();
    expect(screen.getByText('#deep work')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(['stoicism', 'deep work']);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('removes tags with the button and with backspace', async () => {
    render(<Controlled initial={['one', 'two', 'three']} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove tag two' }));
    expect(screen.queryByText('#two')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Add tag'), '{Backspace}');
    expect(screen.queryByText('#three')).not.toBeInTheDocument();
    expect(screen.getByText('#one')).toBeInTheDocument();
  });
});

describe('normaliseTag', () => {
  it('matches what the API stores', () => {
    expect(normaliseTag('  ##Deep   Work ')).toBe('deep work');
  });
});
