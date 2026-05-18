# AptiMaster - AI-Powered Aptitude Platform

Professional, beginner-friendly frontend project built for portfolio presentation and real-world static deployment.

Repository: https://github.com/Jithendranageswarareddy/aptimaster_quiz_app

## Project Overview
AptiMaster is a modular aptitude learning platform built with HTML, CSS, and vanilla JavaScript. It supports dynamic quiz generation through OpenRouter, timer-based quiz sessions, score analytics, result dashboards, and attempt history using localStorage.

The codebase is intentionally structured to be easy for beginners to understand while following industry-style separation of concerns.

## Features
- Clean responsive multi-page UI: Home, Quiz, Result
- Dark mode toggle with persistent theme preference
- Dynamic quiz generation using OpenRouter API
- Ready practice recovery if AI generation is unavailable
- Quiz engine with previous/next navigation and no-skip answer rule
- Countdown timer with pause/reset and auto-submit on timeout
- Performance dashboard with score metrics and skill status
- Answer review section (selected vs correct)
- Quiz history persistence with timestamps, categories, and scores
- Accessibility improvements:
	- focus-visible states
	- skip links
	- keyboard quiz navigation (1-4, ArrowLeft, ArrowRight)
	- ARIA labels and semantic regions

## Tech Stack
- HTML5
- CSS3 (modular architecture)
- JavaScript ES Modules (vanilla)
- OpenRouter Chat Completions API
- LocalStorage for client-side persistence

## Folder Structure
```text
aptimaster-quiz-app/
|- index.html
|- pages/
|  |- quiz.html
|  |- result.html
|- css/
|  |- base/
|  |- components/
|  |- pages/
|  |- main.css
|- js/
|  |- api/
|  |- components/
|  |- core/
|  |- data/
|  |- pages/
|  |- services/
|  |- utils/
|  |- main.js
|- PROJECT_METADATA.json
|- vercel.json
|- .gitignore
|- README.md
```

## Installation and Local Setup
1. Clone the repository.
2. Open the project in VS Code.
3. Start a static server.

Example using Live Server:
```bash
# VS Code: right-click index.html -> Open with Live Server
```

## OpenRouter API Configuration
Runtime configuration is centralized in `js/core/runtimeConfig.js`.

For a personal static deployment, place your OpenRouter key in `APP_CONFIG.OPENROUTER_API_KEY` before deploying. The product UI stays focused on practice; configuration remains inside the codebase.

## Deployment (Vercel)
This project is static and does not require a build step.

1. Push code to GitHub.
2. Import repository in Vercel.
3. Framework preset: Other.
4. Build Command: leave empty.
5. Output Directory: leave empty.
6. Deploy.

Vercel configuration is already included in vercel.json.

## Beginner Notes
- Start from js/pages for page-level behavior.
- Reusable UI renderers are in js/components.
- Core logic (quiz engine, timer, score manager) is in js/core.
- API and data handling are in js/api and js/services.
- Styling is split into base, components, and pages under css.

## Portfolio Highlights
- Professional modular frontend architecture
- Accessible and responsive UI design
- API integration with graceful fallback strategy
- State persistence and analytics-style result reporting
