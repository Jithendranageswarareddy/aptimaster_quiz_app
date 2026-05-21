# AptiMaster

AptiMaster is a lightweight aptitude practice platform built with HTML, CSS, and vanilla JavaScript. It pairs AI-generated quiz sessions with a secure serverless backend and an in-browser AI tutor, while keeping the codebase modular, readable, and interview-ready.

## Project Overview
The platform helps users practice aptitude topics, review results, and ask follow-up questions on the active quiz item. It is designed to feel production-ready without introducing frameworks or unnecessary dependencies.

## Features
- AI-generated quiz sessions with secure server-side OpenRouter access
- AI question discussion assistant for step-by-step explanations and follow-up doubts
- Per-question conversational memory with fallback tutoring responses
- Category, topic, difficulty, and session-size selection
- Quiz timer, previous/next navigation, and progress tracking
- Result analysis with answer review and practice history
- Responsive layout, dark mode, and graceful fallback handling

## Architecture
- Frontend shell: `index.html`, `pages/`, `css/`, `js/`
- Quiz generation API: `api/generate-quiz.js`
- Tutor API: `api/chat-assistant.js`
- Client state: small page controllers plus localStorage-backed services
- Deployment target: Vercel static hosting with Node serverless functions

## Tech Stack
- HTML5
- CSS3
- Vanilla JavaScript modules
- Vercel serverless functions
- OpenRouter API

## Core Flows
- Quiz generation requests are sent to the serverless quiz API and fall back to local practice sets when needed.
- The tutor uses question-scoped memory so follow-up questions stay tied to the current quiz item.
- Results and practice history are stored locally for quick reuse without a backend database.
- Dark mode and responsive behavior are handled entirely in the frontend styles.

## AI Tutor
The AI tutor is designed for interview-style learning. It explains the active question, shows shortcuts when helpful, and keeps responses scoped to the current question context so memory does not leak across quiz items.

## Local Setup
1. Clone the repository.
2. Open the project in VS Code.
3. Use a static server or Vercel dev for local testing.
4. Ensure Node.js 18+ is available if you want to run the serverless functions locally.

## Environment Variables
Set this only in Vercel Project Settings:
- `OPENROUTER_API_KEY`

The API key must never be stored in frontend code, runtime config, or local storage.

## Deployment
1. Push the cleaned repository to GitHub.
2. Import the repository into Vercel.
3. Let Vercel serve the static frontend and `api/` functions.
4. Add `OPENROUTER_API_KEY` in Vercel Environment Variables.

No build command is required for the current architecture.

## Screenshots
Add a short homepage, quiz, tutor, and result screenshot set here after deployment.

## Interview Notes
- Demonstrates secure client/server separation for AI usage
- Shows modular vanilla-JS architecture without framework overhead
- Covers real-world concerns like fallback handling, state persistence, and UX stability

## Future Improvements
- Add automated tests for core quiz logic
- Add end-to-end checks for quiz flow and result rendering
- Expand question bank coverage for more topic variety
