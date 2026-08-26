import { useCallback, useRef, useState } from 'react';

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
  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

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
        className="drawer-panel open"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Schritt bewerten"
      >
        <div
          className="drawer-resize-handle"
          onMouseDown={startResize}
        />
        {children}
      </div>
    </div>
  );
}
