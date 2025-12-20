import { COLORS } from '../api/types';
import type { Color } from '../api/types';

interface Props {
  value?: Color | null;
  onChange: (color: Color) => void;
  size?: 'small' | 'normal';
}

export default function ColorPicker({ value, onChange, size = 'normal' }: Props) {
  return (
    <div className={`color-picker color-picker-${size}`} role="group" aria-label="Highlight color">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`swatch swatch-${color}`}
          aria-label={color}
          aria-pressed={value === color}
          title={color}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
