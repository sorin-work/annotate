import { COLORS } from '../api/types';
import type { Color } from '../api/types';

interface Props {
  value?: Color | null;
  onChange: (color: Color) => void;
  size?: 'small' | 'normal';
  /** Mention the 1-5 keyboard shortcuts in the tooltips. */
  numbered?: boolean;
}

export default function ColorPicker({ value, onChange, size = 'normal', numbered = false }: Props) {
  return (
    <div className={`color-picker color-picker-${size}`} role="group" aria-label="Highlight color">
      {COLORS.map((color, index) => (
        <button
          key={color}
          type="button"
          className={`swatch swatch-${color}`}
          aria-label={color}
          aria-pressed={value === color}
          title={numbered ? `${color} (${index + 1})` : color}
          aria-keyshortcuts={numbered ? String(index + 1) : undefined}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
