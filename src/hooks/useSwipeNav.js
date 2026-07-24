import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Adds left/right swipe-to-navigate on mobile.
 * Right swipe → navigate(-1) [go back]
 * Left swipe → navigate(1)  [go forward]
 *
 * Won't fire if the swipe starts inside:
 *  - a horizontally scrollable element (code blocks, tag rows, heatmap)
 *  - the filter drawer or bottom sheet
 *  - a range input (sliders)
 */
export function useSwipeNav() {
  const navigate = useNavigate();
  const touchStart = useRef(null);

  useEffect(() => {
    const THRESHOLD  = 70;   // min horizontal px to count as a swipe
    const MAX_VERT   = 55;   // max vertical drift before we ignore it
    const EDGE_ZONE  = 30;   // px from left/right edge = native edge-swipe feel

    function isScrollableX(el) {
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const overflowX = style.overflowX;
        if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    }

    function isInsideBlockedEl(el) {
      while (el && el !== document.body) {
        /* filter drawer, bottom sheet, range slider */
        if (
          el.getAttribute('data-no-swipe') === 'true' ||
          el.tagName === 'INPUT' && el.type === 'range' ||
          el.tagName === 'SELECT'
        ) return true;
        el = el.parentElement;
      }
      return false;
    }

    function onTouchStart(e) {
      const t = e.touches[0];
      touchStart.current = {
        x: t.clientX,
        y: t.clientY,
        target: e.target,
        time: Date.now(),
      };
    }

    function onTouchEnd(e) {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const dt = Date.now() - touchStart.current.time;
      const target = touchStart.current.target;
      touchStart.current = null;

      /* ignore vertical-dominant swipes */
      if (Math.abs(dy) > MAX_VERT) return;
      /* ignore short or slow gestures */
      if (Math.abs(dx) < THRESHOLD) return;
      if (dt > 500) return;
      /* ignore scrollable containers */
      if (isScrollableX(target)) return;
      /* ignore blocked elements */
      if (isInsideBlockedEl(target)) return;

      if (dx > 0) {
        /* right swipe → go back */
        navigate(-1);
      }
      /* left swipe: only navigate forward if there's forward history */
      /* We don't navigate(1) blindly - it would be a no-op in most cases */
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate]);
}
