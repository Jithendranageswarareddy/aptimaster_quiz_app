# AptiMaster

AptiMaster is a lightweight aptitude practice platform built with HTML, CSS, and vanilla JavaScript. It uses a Vercel serverless function to generate AI questions securely through OpenRouter, while keeping the frontend simple, modular, and interview-friendly.

## Features
- AI-generated quiz sessions with secure server-side API access
- AI question discussion assistant for step-by-step explanations and follow-up doubts
- Category, topic, difficulty, and session-size selection
- Timer, previous/next navigation, and progress tracking
- Result analysis with answer review and history
- Responsive layout and dark mode
- Graceful fallback when AI generation is unavailable

## Architecture
- Frontend: `index.html`, `pages/`, `css/`, `js/`
- API: `api/generate-quiz.js`, `api/chat-assistant.js`
- Deployment: Vercel serverless functions + static hosting
- Configuration: `package.json`, `.gitignore`, `.env.example`

## Topics
- Quantitative Aptitude: Percentages, Profit and Loss, Time and Work, Averages, Ratio and Proportion, Number Systems, and more
- Logical Reasoning: Blood Relations, Coding-Decoding, Puzzles, Direction Sense, Number Series, and more
- Verbal Ability: Synonyms, Antonyms, Fill in the Blanks, Reading Comprehension, Sentence Correction, and more
- Mixed Practice: Dynamically combines topic coverage across categories

## Local Setup
1. Clone the repository.
2. Open the project in VS Code.
3. Use a static server such as Live Server for the frontend.
4. Ensure Node.js 18+ is available if you want to run the Vercel function locally.

## Environment Variables
Set this only in Vercel Project Settings:
- `OPENROUTER_API_KEY`

The API key must not be stored in frontend code, runtime config, or local storage.

## Vercel Deployment
1. Push the cleaned repository to GitHub.
2. Import the repository into Vercel.
3. Use the default static + serverless setup.
4. Add `OPENROUTER_API_KEY` in Vercel Environment Variables.

No build command is required for the current architecture.

## Screenshots
Add screenshots or short GIFs here after deployment.

## Future Improvements
- Add automated tests for core quiz logic
- Add end-to-end checks for quiz flow and result rendering
- Expand question bank coverage for more topic variety
