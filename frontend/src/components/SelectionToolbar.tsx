import type { Color } from '../api/types';
import ColorPicker from './ColorPicker';
import type { SelectionInfo } from './Reader';

interface Props {
  selection: SelectionInfo;
  busy?: boolean;
  onHighlight: (color: Color) => void;
  onCancel: () => void;
}

export default function SelectionToolbar({ selection, busy, onHighlight, onCancel }: Props) {
  const { top, left, width } = selection.rect;
  return (
    <div
      className="selection-toolbar"
      style={{ top: top - 52, left: left + width / 2 }}
      onMouseDown={(e) => e.preventDefault()}
      role="toolbar"
      aria-label="Highlight selection"
    >
      <span className="small">{busy ? 'Saving…' : 'Highlight'}</span>
      <ColorPicker size="small" onChange={(color) => !busy && onHighlight(color)} />
      <button type="button" className="icon-button" aria-label="Cancel" onClick={onCancel}>
        ×
      </button>
    </div>
  );
}
