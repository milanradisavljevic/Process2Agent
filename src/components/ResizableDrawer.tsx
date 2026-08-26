import { useCallback, useEffect, useRef, useState } from 'react';

interface ResizableDrawerProps {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onClose: () => void;
  children: React.ReactNode;
}

export function ResizableDrawer({
  initialWidth = 480,
  minWidth = 320,
  maxWidth = 900,
  onClose,
  children,
}: ResizableDrawerProps) {
  const [width, setWidth] = useState(initialWidth);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [onClose]);

  function handleResizeMove(e: MouseEvent) {
    if (!isResizing.current) return;
    const delta = resizeStartX.current - e.clientX;
    setWidth(Math.min(Math.max(resizeStartWidth.current + delta, minWidth), maxWidth));
  }

  function handleResizeEnd() {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }

  const startResize = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [width]);

  return (
    <div className="drawer-overlay open" onClick={onClose}>
      <div
        ref={panelRef}
        className="drawer-panel open"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Schritt bewerten"
        tabIndex={-1}
      >
        <div
          className="drawer-resize-handle"
          onMouseDown={startResize}
          aria-hidden="true"
        />
        {children}
      </div>
    </div>
  );
}
