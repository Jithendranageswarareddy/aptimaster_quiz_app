/*
  Purpose: Main browser entry point.
  Detects the current page and boots the matching page module.
*/

import { bootstrapApp } from './core/app.js';
import { initThemeToggle } from './components/themeToggle.js';

initThemeToggle();
bootstrapApp();
