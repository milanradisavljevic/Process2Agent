import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Bestätigen',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel dialog-panel" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label={title}>
        <div className="dialog-body">
          {danger && (
            <span className="dialog-danger-icon"><AlertTriangle size={20} /></span>
          )}
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onCancel}>Abbrechen</button>
          <button
            ref={confirmRef}
            type="button"
            className={danger ? 'danger-button' : 'primary-button compact'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PromptDialogProps {
  title: string;
  placeholder?: string;
  initial?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  title,
  placeholder = '',
  initial = '',
  confirmLabel = 'Erstellen',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  function submit() {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel dialog-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="dialog-body">
          <h2>{title}</h2>
          <input
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onCancel}>Abbrechen</button>
          <button type="button" className="primary-button compact" onClick={submit} disabled={!value.trim()}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
