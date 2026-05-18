# AptiMaster - AI-Powered Aptitude Platform

Professional, beginner-friendly frontend project built for portfolio presentation and real-world Vercel deployment.

Repository: https://github.com/Jithendranageswarareddy/aptimaster_quiz_app

## Project Overview
AptiMaster is a modular aptitude learning platform built with HTML, CSS, and vanilla JavaScript. It supports secure AI quiz generation through a Vercel serverless function backed by OpenRouter, timer-based quiz sessions, score analytics, result dashboards, and attempt history using localStorage.

The codebase is intentionally structured to be easy for beginners to understand while following industry-style separation of concerns.

## Features
- Clean responsive multi-page UI: Home, Quiz, Result
- Dark mode toggle with persistent theme preference
- Dynamic quiz generation through `/api/generate-quiz`
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
- OpenRouter Chat Completions API via Vercel serverless functions
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
Runtime configuration is centralized in `api/generate-quiz.js` for server-side usage and `js/core/runtimeConfig.js` for browser-safe settings.

Set `OPENROUTER_API_KEY` as a Vercel environment variable. The key is only read inside the serverless function and is never exposed to browser JavaScript.

## Deployment (Vercel)
This project is a static frontend plus one Vercel serverless API route. No build step is required.

**Vercel Configuration:**
1. Push code to GitHub.
2. Import repository in Vercel.
3. Framework preset: Other.
4. Build Command: leave empty.
5. Output Directory: leave empty.
6. Add the environment variable `OPENROUTER_API_KEY` in Vercel Project Settings.

**Before Deploying:**
Ensure these files exist and are correct:
- `vercel.json` with `"runtime": "nodejs20"` (not `nodejs20.x`)
- `package.json` with Node.js engine specification
- `api/generate-quiz.js` serverless function
- `.env.example` with OpenRouter key placeholder

**After Deployment:**
The quiz page calls `/api/generate-quiz` on the production Vercel domain. No CORS configuration is required for same-origin requests.

Vercel configuration is already included in vercel.json.
## Debugging AI Quiz Generation

If the quiz always shows "Offline Practice Mode" instead of "AI Practice Mode", follow these steps:

**Quick Verification:**
1. Open `verify-ai-generation.html` in a browser (it's in the project root)
2. Run the interactive tests to check deployment health
3. If Test 2 shows "AI Practice Mode", generation is working ✓
4. If Test 2 shows "Offline Practice Mode", check Vercel logs

**Comprehensive Debugging:**
See `DEBUGGING_GUIDE.md` for:
- How to access Vercel serverless logs
- Understanding log formats and timestamps
- Common issues and solutions (API key, timeouts, parsing errors)
- Browser debugging (Network tab, localStorage)
- Request ID tracking for troubleshooting

**Post-Deployment Testing:**
See `VALIDATION_CHECKLIST.md` for:
- Step-by-step verification after deployment
- Environment variable configuration
- Live site testing procedures
- Performance baseline expectations
- Sign-off checklist for production readiness

**Key Files:**
- `api/generate-quiz.js` — Serverless function with detailed logging
- `DEBUGGING_GUIDE.md` — Comprehensive troubleshooting reference
- `VALIDATION_CHECKLIST.md` — Testing and verification steps
- `IMPLEMENTATION_SUMMARY.md` — Technical overview of debugging improvements
- `verify-ai-generation.html` — Interactive testing tool

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
