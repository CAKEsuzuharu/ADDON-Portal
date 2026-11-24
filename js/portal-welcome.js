(() => {
  'use strict';

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
