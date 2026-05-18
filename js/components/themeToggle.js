/*
  Purpose: Reusable dark mode toggle component.

  Workflow:
  1. Read saved theme from localStorage.
  2. Apply theme on document root using data-theme attribute.
  3. Render floating button and allow user to switch theme.
*/

import { safeReadStorage, safeWriteStorage } from '../core/runtimeConfig.js';

const THEME_KEY = 'aptimaster_theme';

function getSavedTheme() {
  const theme = safeReadStorage(THEME_KEY, 'light');
  return theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function getToggleText(theme) {
  return theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

export function initThemeToggle() {
  const savedTheme = getSavedTheme();
  applyTheme(savedTheme);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'theme-toggle';
  button.setAttribute('aria-label', 'Toggle dark mode');
  button.textContent = getToggleText(savedTheme);

  button.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    safeWriteStorage(THEME_KEY, nextTheme);

    applyTheme(nextTheme);
    button.textContent = getToggleText(nextTheme);
  });

  document.body.appendChild(button);
}
