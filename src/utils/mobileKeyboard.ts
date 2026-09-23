import { useState, useEffect } from 'react';

/**
 * useKeyboardSafeInput
 * Tracks visualViewport resize (especially on Android keyboards)
 * Exposes: keyboardOffset (px) — 0 when keyboard is closed
 */
export function useKeyboardSafeInput() {
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        const vv = window.visualViewport;
        // In mobile browsers (especially Android Chrome in landscape/portrait),
        // window.innerHeight - visualViewport.height - visualViewport.offsetTop represents the keyboard height.
        const heightDiff = window.innerHeight - vv.height - (vv.offsetTop || 0);
        if (heightDiff > 50) {
          setKeyboardOffset(Math.round(heightDiff));
        } else {
          setKeyboardOffset(0);
        }
      } else {
        setKeyboardOffset(0);
      }
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  return { keyboardOffset };
}
