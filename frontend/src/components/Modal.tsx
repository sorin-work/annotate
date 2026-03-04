import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ title, onClose, children }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Move focus into the dialog when it opens and give it back when it closes.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      const fields = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
      // Skip the close button when there is anything else to focus.
      (fields[1] ?? fields[0] ?? dialog).focus();
    }
    return () => previous?.focus?.();
  }, []);

  function trapTab(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const fields = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (fields.length === 0) return;
    const first = fields[0]!;
    const last = fields[fields.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
