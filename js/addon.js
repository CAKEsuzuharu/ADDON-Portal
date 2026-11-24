(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

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

  // Only start hiding reveal targets when an observer can show them again.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-visible');
        observer.unobserve(e.target);
      }
    }, { threshold: 0.07, rootMargin: '0px 0px -20px 0px' });
    document.documentElement.classList.add('reveal-ready');
    $$('[data-reveal]').forEach(e => observer.observe(e));
  }

  const hero = $('[data-hero-motion]');
  if (hero && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let frame = 0;
    const resetHero = () => {
      cancelAnimationFrame(frame);
      hero.style.removeProperty('--hero-x');
      hero.style.removeProperty('--hero-y');
    };
    hero.addEventListener('pointermove', ({clientX, clientY}) => {
      if (reducedMotion.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        hero.style.setProperty('--hero-x', `${((clientX - bounds.left) / bounds.width - .5) * 24}px`);
        hero.style.setProperty('--hero-y', `${((clientY - bounds.top) / bounds.height - .5) * 18}px`);
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', resetHero);
    reducedMotion.addEventListener('change', resetHero);
  }

  // Keep the local poster in place until the visitor starts the embedded PV.
  $$('[data-video-id]').forEach(cover => cover.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const player = document.createElement('iframe');
    player.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(cover.dataset.videoId)}?autoplay=1&playsinline=1`;
    player.title = cover.dataset.videoTitle;
    player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    cover.replaceWith(player);
    player.focus();
  }));

  // Real feature tabs in ADD:ON ZERO project details.
  const featureTabs = $$('[data-feature]');
  if (featureTabs.length) {
    const compactTabs = matchMedia('(max-width: 590px)');
    const tabList = featureTabs[0].parentElement;
    const syncTabOrientation = () => tabList.setAttribute('aria-orientation', compactTabs.matches ? 'horizontal' : 'vertical');
    syncTabOrientation();
    compactTabs.addEventListener('change', syncTabOrientation);
    const setFeature = (index, focus = false) => {
      featureTabs.forEach((tab, i) => {
        const active = i === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) { panel.hidden = !active; panel.classList.toggle('is-active', active); }
      });
      if (focus) featureTabs[index].focus();
    };
    featureTabs.forEach((tab, i) => {
      tab.addEventListener('click', () => setFeature(i));
      tab.addEventListener('keydown', e => {
        let target;
        const rowStep = compactTabs.matches ? 2 : 1;
        if (e.key === 'ArrowDown') target = i + rowStep;
        if (e.key === 'ArrowUp') target = i - rowStep;
        if (e.key === 'ArrowRight') target = i + 1;
        if (e.key === 'ArrowLeft') target = i - 1;
        if (e.key === 'Home') target = 0;
        if (e.key === 'End') target = featureTabs.length - 1;
        if (target === undefined) return;
        e.preventDefault();
        setFeature((target + featureTabs.length) % featureTabs.length, true);
      });
    });
    setFeature(0);
  }

  // Job-type filters keep the full directory in the page.
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
