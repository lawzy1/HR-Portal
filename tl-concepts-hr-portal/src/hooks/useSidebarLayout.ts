import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

const WIDTH_KEY = 'tl-hr-sidebar-width';
const COLLAPSED_KEY = 'tl-hr-sidebar-collapsed';
const DEFAULT_WIDTH = 256;
const COLLAPSED_WIDTH = 72;
const MIN_WIDTH = 200;
const MAX_WIDTH = 420;

// Desktop sidebar width/collapse persist across sessions; the mobile drawer
// open state does not (it should always start closed on a fresh load).
export function useSidebarLayout() {
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : DEFAULT_WIDTH;
  });
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const isResizing = useRef(false);

  useEffect(() => { localStorage.setItem(WIDTH_KEY, String(width)); }, [width]);
  useEffect(() => { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); }, [collapsed]);

  const toggleCollapsed = useCallback(() => setCollapsed(c => !c), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen(o => !o), []);

  const onResizeStart = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const onMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, moveEvent.clientX)));
    };
    const onUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return {
    width,
    collapsed,
    toggleCollapsed,
    onResizeStart,
    mobileOpen,
    toggleMobile,
    closeMobile,
    effectiveWidth: collapsed ? COLLAPSED_WIDTH : width,
  };
}
