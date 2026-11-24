(() => {
  'use strict';

  // Head script: restore a clicked mobile menu before the destination paints.
  try {
    const key = 'addon-mobile-nav-target';
    const destination = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (destination && destination === location.pathname + location.search &&
        matchMedia('(max-width: 820px)').matches) {
      document.documentElement.classList.add('mobile-nav-arrival');
    }
  } catch { /* Storage can be unavailable; normal navigation is unaffected. */ }

  if (!matchMedia('(prefers-reduced-motion: no-preference)').matches) return;

  const sessionKey = 'addon-portal-welcome-seen';
  try {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
  } catch {
    return;
  }

  const root = document.documentElement;
  const events = ['pointerdown', 'keydown', 'wheel', 'pagehide'];
  root.classList.add('portal-welcoming');

  const logo = document.createElement('link');
  logo.rel = 'preload';
  logo.as = 'image';
  logo.href = 'assets/zero-display.png';
  document.head.append(logo);

  function dismiss() {
    clearTimeout(timeout);
    root.classList.remove('portal-welcoming');
    for (const event of events) removeEventListener(event, dismiss, true);
  }

  const timeout = setTimeout(dismiss, 1800);
  for (const event of events) addEventListener(event, dismiss, { capture: true, passive: true });
})();
