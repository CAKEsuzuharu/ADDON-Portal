(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Shared navigation: responsive, keyboard accessible, and leaves body scroll alone when closed.
  const header = $('#header');
  const menuButton = $('#menuToggle');
  const menu = $('#mobileNav');
  const progress = $('#scrollProgress');
  const setMenu = (open) => {
    if (!menu || !menuButton) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    document.body.classList.toggle('menu-open', open);
  };
  setMenu(false);
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $$('#mobileNav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });
  addEventListener('resize', () => { if (innerWidth > 820) setMenu(false); }, { passive: true });

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      header?.classList.toggle('is-scrolled', y > 12);
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Short one-way reveals: never hide content for reduced-motion or unsupported observers.
  if (!reduced && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-visible');
        observer.unobserve(e.target);
      }
    }, { threshold: 0.07, rootMargin: '0px 0px -20px 0px' });
    $$('[data-reveal]').forEach(e => observer.observe(e));
  } else $$('[data-reveal]').forEach(e => e.classList.add('is-visible'));

  // Real feature tabs in ADD:ON ZERO project details.
  const featureTabs = $$('[data-feature]');
  if (featureTabs.length) {
    const setFeature = (index, focus = false) => {
      featureTabs.forEach((tab, i) => {
        const active = i === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) { panel.hidden = !active; panel.classList.toggle('is-active', active); }
      });
      if (focus) featureTabs[index]?.focus();
    };
    featureTabs.forEach((tab, i) => {
      tab.addEventListener('click', () => setFeature(i));
      tab.addEventListener('keydown', e => {
        let target;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') target = (i + 1) % featureTabs.length;
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') target = (i - 1 + featureTabs.length) % featureTabs.length;
        if (e.key === 'Home') target = 0;
        if (e.key === 'End') target = featureTabs.length - 1;
        if (target === undefined) return;
        e.preventDefault();
        setFeature(target, true);
      });
    });
    setFeature(0);
  }

  // ADYGTA job-type filters: purely presentational, no contents lost in the source.
  const jobButtons = $$('[data-job-filter]');
  if (jobButtons.length) {
    const groups = $$('[data-job-group]');
    jobButtons.forEach(button => button.addEventListener('click', () => {
      const current = button.dataset.jobFilter;
      jobButtons.forEach(b => {
        const active = b === button;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      groups.forEach(group => { group.hidden = current !== 'all' && group.dataset.jobGroup !== current; });
    }));
  }
})();
