# AptiMaster AI Quiz Generation - Debugging Guide

## Overview

This guide explains how to debug the AI quiz generation feature and monitor the OpenRouter integration on Vercel serverless functions.

## How to Access Vercel Logs

### Step 1: Open Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Log in with your account
3. Select the **AptiMaster** project

### Step 2: Navigate to Function Logs
1. Click **Deployments** in the left sidebar
2. Select the latest deployment
3. Click **View Function Logs** or **Logs** tab
4. You'll see real-time logs from serverless function execution

### Step 3: Filter and Search
- Use the search bar to filter by keywords like "OPENROUTER", "HANDLER", "fallback"
- Logs are formatted with timestamps: `[2026-05-18T10:30:45.123Z]`

## Log Format Understanding

### Log Levels

**[HANDLER]** - Main request processing
```
[HANDLER] [abc12345] Incoming request { method: 'POST', path: '/api/generate-quiz' }
[HANDLER] [abc12345] API key status { keyPresent: true, keyMasked: 'sk-or-v1-abcd...1234' }
```

**[OPENROUTER]** - OpenRouter API integration
```
[OPENROUTER] Starting OpenRouter request { model: 'deepseek/deepseek-v4-flash:free', apiKeyPresent: true }
[OPENROUTER] HTTP response received { status: 200, statusText: 'OK', ok: true }
[OPENROUTER] All questions validated successfully { count: 10 }
```

**ERROR logs** - Issues and failures
```
[HANDLER] [abc12345] Attempt 1 failed: Error: OpenRouter HTTP 401: Invalid API key
[HANDLER] [abc12345] All 4 attempts exhausted, triggering fallback
```

## Reading the Request ID

Each request has a unique ID for tracking: `[abc12345]`

Use this ID to trace the entire flow of a single quiz generation request:
```
[HANDLER] [abc12345] Incoming request ...
[HANDLER] [abc12345] Request body parsed ...
[HANDLER] [abc12345] Quiz setup ...
[HANDLER] [abc12345] Attempt 1/4
[OPENROUTER] Starting OpenRouter request ...
[OPENROUTER] HTTP response received { status: 200 }
[HANDLER] [abc12345] SUCCESS: OpenRouter returned 10 questions
```

## Common Issues and Solutions

### Issue 1: Always Shows "Offline Practice Mode"

**Symptom:** Quiz always shows "Offline Practice Mode" even after waiting.

**Root Cause Indicators in Logs:**
```
[HANDLER] [abc12345] OPENROUTER_API_KEY environment variable not set or empty
```

**Solution:**
1. Go to Vercel Project Settings
2. Click **Environment Variables**
3. Verify `OPENROUTER_API_KEY` is set
4. If missing, add it with your actual OpenRouter API key
5. Redeploy the project

### Issue 2: HTTP 401 Error

**Symptom:** Logs show HTTP 401 after several attempts.

**Log Pattern:**
```
[OPENROUTER] HTTP response received { status: 401, statusText: 'Unauthorized', ok: false }
[OPENROUTER] HTTP error (401)
[HANDLER] Attempt 1 failed: Error: OpenRouter HTTP 401: ...
```

**Causes:**
- Invalid API key
- API key prefix incorrect
- Copied extra spaces into environment variable

**Solution:**
1. Verify your OpenRouter API key on [openrouter.ai](https://openrouter.ai)
2. Copy the full key (should start with `sk-or-v1-`)
3. Update the environment variable in Vercel
4. Redeploy

### Issue 3: Timeout (45 seconds)

**Log Pattern:**
```
[OPENROUTER] Request failed: Error: The operation was aborted
[HANDLER] Attempt 1 failed: Error: The operation was aborted
```

**Causes:**
- OpenRouter API is slow/unresponsive
- Large question count (15+ questions)
- Network latency

**Solution:**
- Reduce question count (try 5-10 instead of 15-20)
- Wait and retry (fallback to offline mode temporarily)
- Check OpenRouter status page

### Issue 4: JSON Parsing Error

**Log Pattern:**
```
[OPENROUTER] Content received { contentLength: 234, contentPreview: 'Some text here' }
[OPENROUTER] Request failed: Error: Unexpected token < in JSON at position 0
```

**Causes:**
- Model returned HTML error instead of JSON
- Model returned incomplete response
- Special characters in response

**Solution:**
- Check OpenRouter API status
- Verify API key has sufficient quota
- Retry (automatic retry logic in place)

### Issue 5: Duplicate Questions

**Symptom:** Same questions appear across multiple sessions.

**What to Check:**
- Logs should show `source: 'ai'` when working correctly
- If showing `source: 'fallback'`, check why OpenRouter failed
- Check browser console for API errors

**Monitor:**
```
[HANDLER] SUCCESS: OpenRouter returned 10 questions
```

If NOT seeing this, OpenRouter requests are failing silently.

## Frontend Debug Information

### Check Which Mode is Active

**In Browser Console:**
```javascript
// View the stored source mode
localStorage.getItem('aptimaster_question_source');
// Returns: 'ai' or 'mock' or 'fallback'

// View fallback message if any
localStorage.getItem('aptimaster_ai_fallback_message');
```

### View the API Response

**In Browser Network Tab:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Click **Generate Practice Quiz**
4. Find the `generate-quiz` POST request
5. Click it and view **Response** tab
6. Look for: `"source": "ai"` or `"source": "fallback"`

**Good Response:**
```json
{
  "source": "ai",
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": [...],
      "answer": "...",
      "explanation": "..."
    }
  ]
}
```

**Fallback Response:**
```json
{
  "source": "fallback",
  "fallbackReason": "OPENROUTER_FAILED_ALL_RETRIES",
  "fallbackMessage": "A fresh practice set is ready.",
  "lastError": "OpenRouter HTTP 401: Invalid API key",
  "questions": [...]
}
```

## Troubleshooting Checklist

### Before Deploying
- [ ] Verify `vercel.json` has correct runtime: `"runtime": "nodejs20"`
- [ ] Verify `package.json` exists (no `"type": "module"`)
- [ ] Verify `api/generate-quiz.js` uses `module.exports`

### After Deployment
- [ ] Set `OPENROUTER_API_KEY` in Vercel environment variables
- [ ] Redeploy after setting environment variable
- [ ] Check Vercel logs for `[HANDLER]` entries

### During Testing
1. Open the live quiz page
2. Select topic and difficulty
3. Click "Generate Practice Quiz"
4. Check for "AI Practice Mode" or "Offline Practice Mode" label
5. If offline, check Vercel logs for errors
6. Refresh page and retry
7. Check browser Network tab for API response

### Key Log Patterns to Look For

**Success Pattern:**
```
[HANDLER] Starting request
[HANDLER] API key status { keyPresent: true }
[OPENROUTER] Starting OpenRouter request
[OPENROUTER] HTTP response received { status: 200 }
[OPENROUTER] All questions validated successfully
[HANDLER] SUCCESS: OpenRouter returned 10 questions
```

**Failure Pattern (to fix):**
```
[HANDLER] Starting request
[HANDLER] OPENROUTER_API_KEY not set → FALLBACK
```

**Retry Pattern:**
```
[HANDLER] Attempt 1/4
[OPENROUTER] Request failed
[HANDLER] Attempt 2/4
[OPENROUTER] Request failed
[HANDLER] Attempt 3/4
[OPENROUTER] Request failed
[HANDLER] Attempt 4/4
[OPENROUTER] SUCCESS
```

## Performance Metrics

**Expected Times:**
- Cold start (no cache): 8-15 seconds
- Warm start (cached): 3-8 seconds
- OpenRouter API: 4-10 seconds
- JSON parsing: <100ms

**If taking >45 seconds:**
- Timeout will trigger and fallback to offline
- Check OpenRouter status

## API Key Management

### Viewing Masked Keys in Logs
```
keyMasked: 'sk-or-v1-abcd...1234'
```

This shows:
- First 12 characters: `sk-or-v1-abcd`
- Last 4 characters: `1234`
- Full key: Never logged to protect security

### Rotating API Keys
1. Generate new key on [openrouter.ai](https://openrouter.ai)
2. Update in Vercel Project Settings → Environment Variables
3. Redeploy
4. Test with new key
5. Delete old key from OpenRouter

## Contacting Support

If you encounter issues:
1. Collect the complete log output from Vercel
2. Take a screenshot of the browser Network response
3. Note the request ID from logs: `[abc12345]`
4. Provide error messages and timestamps
5. Include quiz setup: (category, topic, difficulty, count)

## Example: Complete Request Flow

Request ID: `a1b2c3d4`

1. Browser sends POST to `/api/generate-quiz`
2. Server receives and logs:
   ```
   [HANDLER] [a1b2c3d4] Incoming request { method: 'POST' }
   [HANDLER] [a1b2c3d4] Request body parsed { category: 'logical', topic: 'Puzzles', difficulty: 'medium', questionCount: 10 }
   [HANDLER] [a1b2c3d4] Quiz setup { category: 'logical', topic: 'Puzzles', difficulty: 'medium', questionCount: 10 }
   [HANDLER] [a1b2c3d4] API key status { keyPresent: true, keyMasked: 'sk-or-v1-abc...1234' }
   [HANDLER] [a1b2c3d4] Attempt 1/4
   ```

3. OpenRouter request:
   ```
   [OPENROUTER] Starting OpenRouter request { model: 'deepseek/deepseek-v4-flash:free', questionCount: 10, timeout: 45000 }
   [OPENROUTER] Sending HTTP POST request to OpenRouter
   [OPENROUTER] HTTP response received { status: 200, statusText: 'OK', ok: true }
   [OPENROUTER] Raw payload received { hasChoices: true, choicesLength: 1, hasContent: true }
   [OPENROUTER] Content received { contentLength: 2847, contentPreview: '[{"question":"Which of the following..."}' }
   ```

4. Response validation:
   ```
   [OPENROUTER] Cleaned content { cleanedLength: 2847 }
   [OPENROUTER] JSON parsed successfully { isArray: true, itemCount: 10 }
   [OPENROUTER] Validating question set { questionCount: 10, expectedCount: 10 }
   [OPENROUTER] All questions validated successfully { count: 10 }
   ```

5. Success:
   ```
   [HANDLER] [a1b2c3d4] SUCCESS: OpenRouter returned 10 questions
   ```

6. Browser receives:
   ```json
   {
     "source": "ai",
     "questions": [...]
   }
   ```

7. UI displays: **AI Practice Mode** with fresh AI-generated questions
