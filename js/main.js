/*
  Purpose: Main browser entry point.
  Detects the current page and boots the matching page module.
*/

import { bootstrapApp } from './core/app.js';
import { initThemeToggle } from './components/themeToggle.js';

initThemeToggle();

// Smooth scroll micro-interaction and lightweight UX helpers.
function initSmoothScroll() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    const targetId = href.slice(1);
    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();
    if (prefersReduced) {
      target.scrollIntoView();
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    target.focus({ preventScroll: true });
  });
}

function initMicroInteractions() {
  // Subtle button press feedback for keyboard users
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const el = document.activeElement;
      if (el && el.classList && el.classList.contains('btn')) {
        el.classList.add('btn--pressed');
        setTimeout(() => el.classList.remove('btn--pressed'), 180);
      }
    }
  });
}

initSmoothScroll();
initMicroInteractions();

bootstrapApp();
