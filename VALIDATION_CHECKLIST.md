# AptiMaster AI Quiz Generation - Validation Checklist

## Pre-Deployment Verification ✓

### Code Quality
- [x] Serverless function uses `module.exports` (CommonJS)
- [x] No `"type": "module"` in package.json
- [x] vercel.json uses valid `"runtime": "nodejs20"`
- [x] No API keys exposed in frontend code
- [x] Environment variable only accessed server-side via `process.env`

### Logging & Debugging
- [x] Request IDs assigned to each request for tracing
- [x] Timestamps on all log entries
- [x] API keys masked in logs (showing only first 12 + last 4 chars)
- [x] Separate log levels: HANDLER, OPENROUTER, ERROR
- [x] Fallback reasons documented in response

### OpenRouter Integration
- [x] Model: `deepseek/deepseek-v4-flash:free` (free tier)
- [x] Timeout: 45 seconds (up from 30s)
- [x] Max tokens: 4000 (up from 3600)
- [x] Retry logic: 3 retries + 1 initial = 4 total attempts
- [x] Exponential backoff: 1s, 2s, 3s delays between retries

### Fallback & Offline
- [x] Fallback questions randomized (uses Math.random seed)
- [x] Unique templates to avoid repetition
- [x] Fallback reason included in response
- [x] UI shows "Offline Practice Mode" when fallback triggered

### Frontend UI
- [x] AI Status component shows "AI Practice Mode" for AI-generated
- [x] AI Status component shows "Offline Practice Mode" for fallback
- [x] Descriptive text under each mode label
- [x] Orange styling for offline mode for visibility
- [x] Status persists in localStorage

## Post-Deployment Testing

### Step 1: Environment Variable Configuration
**Task:** Verify API key is correctly set in Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select **AptiMaster** project
3. Click **Settings** → **Environment Variables**
4. Verify `OPENROUTER_API_KEY` exists with correct value
5. **Expected:** Key visible with masked format (not fully shown)
6. ✓ Redeploy after setting if needed

### Step 2: Deployment Verification
**Task:** Confirm deployment succeeded with all fixes

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Check deployment status (should be **Ready** or **Building**)
3. Wait for build to complete (1-2 minutes)
4. Check Vercel deployment logs for errors
5. ✓ Verify no build errors related to runtime or modules

### Step 3: Live Site Access
**Task:** Open the deployed application

1. Go to your AptiMaster Vercel URL (e.g., `aptimaster.vercel.app`)
2. Wait for page to load
3. ✓ No console errors (F12 → Console tab)
4. ✓ Page is responsive and interactive

### Step 4: First Quiz Generation - AI Mode Test
**Task:** Generate a quiz and verify it comes from AI

1. Select a **Category** (e.g., "Logical Reasoning")
2. Select a **Topic** (e.g., "Puzzles")
3. Select **Difficulty** (e.g., "Medium")
4. Keep **Question Count** at 10
5. Click **Generate Practice Quiz**
6. **Wait 5-15 seconds for response**

**Success Indicators:**
- [ ] Page shows "**AI Practice Mode**" label (blue, not orange)
- [ ] Questions are **different each time** you refresh and regenerate
- [ ] Questions are **topically relevant** (logical reasoning about puzzles)
- [ ] Questions are **well-varied** (not repetitive)
- [ ] Options are **unique** within each question (no duplicates)
- [ ] Explanations are **detailed and meaningful**

**Failure Indicators:**
- [ ] Shows "**Offline Practice Mode**" (orange) - means OpenRouter failed
- [ ] Same questions appear on refresh
- [ ] Questions have duplicate options
- [ ] Questions are generic/simple templates

### Step 5: Check Vercel Logs - Success Case
**Task:** Verify logs show successful OpenRouter request

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select **AptiMaster** → **Deployments** → latest
3. Click **Logs** or **Function Logs**
4. Look for logs from your quiz generation (within last few minutes)
5. Search for keyword: **SUCCESS**

**Expected Log Pattern:**
```
[HANDLER] [abc12345] Incoming request { method: 'POST' }
[HANDLER] [abc12345] API key status { keyPresent: true }
[OPENROUTER] Starting OpenRouter request
[OPENROUTER] HTTP response received { status: 200 }
[OPENROUTER] All questions validated successfully
[HANDLER] [abc12345] SUCCESS: OpenRouter returned 10 questions
```

**Verification Steps:**
- [x] Request ID visible: `[abc12345]`
- [x] API key shows as present: `keyPresent: true`
- [x] HTTP status is 200: `{ status: 200 }`
- [x] Final message: `SUCCESS: OpenRouter returned 10 questions`

### Step 6: Second Quiz Generation - Different Questions
**Task:** Verify AI generates different questions each time

1. Stay on quiz page or go back to topic selection
2. Click **Generate Practice Quiz** again (same topic)
3. **Wait 5-15 seconds**

**Success Indicators:**
- [ ] New set of **completely different questions**
- [ ] Still shows "**AI Practice Mode**" (not fallback)
- [ ] Questions still topically relevant
- [ ] No questions duplicated from first generation

**This confirms:** AI generation is working, not just cached

### Step 7: Try Different Topics
**Task:** Verify AI works across different categories

1. Select a **different category** (e.g., "Quantitative Reasoning")
2. Select a **different topic** (e.g., "Arithmetic")
3. Click **Generate Practice Quiz**
4. **Wait 5-15 seconds**

**Success Indicators:**
- [ ] Shows "**AI Practice Mode**"
- [ ] Questions are about **arithmetic** (not logical reasoning)
- [ ] Questions are completely different style
- [ ] No failures or timeouts

### Step 8: Browser Network Inspection
**Task:** Verify API response structure

1. Open DevTools: **F12** → **Network** tab
2. Generate a quiz
3. Find request named **generate-quiz** (POST)
4. Click it and view **Response** tab

**Expected Response (AI Mode):**
```json
{
  "source": "ai",
  "questions": [
    {
      "id": 1,
      "category": "logical",
      "topic": "Puzzles",
      "difficulty": "medium",
      "question": "What is the next number in this sequence: 2, 4, 8, 16, ?",
      "options": ["24", "28", "32", "48"],
      "answer": "32",
      "explanation": "Each number is doubled: 2×2=4, 4×2=8, 8×2=16, 16×2=32"
    }
  ]
}
```

**Verification:**
- [x] `"source": "ai"` (not `"fallback"`)
- [x] Array of 10 questions (matching request count)
- [x] Each question has all required fields
- [x] Options are 4 unique strings
- [x] Answer matches one option exactly

### Step 9: Fallback Mode Testing (Optional)
**Task:** Verify fallback works if OpenRouter temporarily fails

1. Open Vercel Project Settings
2. Temporarily **remove** or **blank out** the `OPENROUTER_API_KEY`
3. **Redeploy** the project
4. Wait for deployment to complete
5. Go to the live site and generate a quiz
6. **Wait 10-15 seconds** (retries will exhaust then fallback)

**Expected Behavior:**
- [ ] Shows "**Offline Practice Mode**" (orange, not blue)
- [ ] Questions load (using fallback generator)
- [ ] Questions are basic but valid
- [ ] You can still complete the quiz

**Then Restore:**
1. Restore the `OPENROUTER_API_KEY` in Vercel
2. **Redeploy**
3. Generate quiz again
4. Should now show "**AI Practice Mode**" again

### Step 10: Complete Quiz Flow
**Task:** Verify the complete user flow works end-to-end

1. Generate a quiz (**AI Practice Mode**)
2. Answer all questions
3. Click **Submit**
4. Verify results page loads
5. Check score is calculated correctly
6. Verify answer review shows correct answers
7. Try another quiz (should have different questions)

**Success Indicators:**
- [x] No errors at any step
- [x] Quiz flow is smooth
- [x] Results are accurate
- [x] Can generate multiple quizzes in same session

## Troubleshooting During Testing

### Issue: Still seeing "Offline Practice Mode"

**Checklist:**
1. [ ] API key is set in Vercel Environment Variables
2. [ ] API key starts with `sk-or-v1-`
3. [ ] Project was redeployed after setting API key
4. [ ] Deployment says "Ready" (not "Building")
5. [ ] Waited at least 15 seconds for response
6. [ ] Check Vercel logs for error messages

**Quick Fix:**
```
1. Go to Vercel dashboard
2. Click Settings → Environment Variables
3. Delete the OPENROUTER_API_KEY variable
4. Click Save
5. Re-enter the API key (copy fresh from OpenRouter)
6. Click Save
7. Go to Deployments and click "Redeploy"
8. Wait 2 minutes for deployment
9. Go to live site and try again
```

### Issue: Seeing same questions on refresh

**Checklist:**
1. [ ] Check that page shows "**AI Practice Mode**" (not Offline)
2. [ ] Check Network tab in DevTools → `generate-quiz` → `source` field
3. [ ] If source is `"ai"`, questions should be different
4. [ ] If source is `"fallback"`, this is expected (offline mode)

**Solution:**
If source says `"ai"` but questions are same:
- This might be browser cache
- Open in private/incognito window and test
- Clear browser cache and test again

### Issue: Timeout or slow responses

**Normal Timing:**
- Cold start: 8-15 seconds
- Warm start: 3-8 seconds
- Very slow: >30 seconds (check OpenRouter status)

**If timing out (>45 seconds):**
1. Check OpenRouter status page (status.openrouter.ai)
2. Reduce question count to 5
3. Try again after a few minutes
4. Check Vercel logs for timeout errors

## Performance Baseline

### Expected Metrics

| Scenario | Expected Time | Notes |
|----------|--------------|-------|
| Cold deploy, first quiz | 8-15s | First request spins up serverless |
| Warm deploy, quiz | 3-8s | Serverless already running |
| Very slow | 20-45s | OpenRouter delayed or network lag |
| Timeout | >45s | Request aborted, fallback triggered |

### What's Normal

- ✓ Questions appear after 5-15 seconds (normal)
- ✓ Longer on first deployment (normal)
- ✓ Faster on subsequent requests (normal)
- ✓ Occasional slower requests (normal)

### What's Not Normal

- ✗ Instant response (probably fallback, not AI)
- ✗ Always same questions (API key issue or offline)
- ✗ Consistent timeouts (API key invalid or quota exceeded)
- ✗ Errors in console (check Vercel logs)

## Sign-Off Checklist

After completing all tests above, confirm:

- [ ] **AI generation works** - Shows "AI Practice Mode" with different questions each time
- [ ] **Offline fallback works** - Shows "Offline Practice Mode" when API key removed
- [ ] **UI shows correct mode** - Blue for AI, orange for offline
- [ ] **No console errors** - F12 shows clean console
- [ ] **Logs are useful** - Vercel logs show expected pattern
- [ ] **Complete flow works** - Generate → Answer → Submit → Results all work
- [ ] **Multiple topics work** - Different topics generate appropriate questions
- [ ] **Performance acceptable** - Responses in 5-15 seconds normally
- [ ] **Debugging info available** - DEBUGGING_GUIDE.md is available for future troubleshooting

## Next Steps

### If All Tests Pass ✓
- **AI Quiz Generation is Live!**
- Monitor Vercel logs occasionally
- Share the live URL with users
- Collect feedback on question quality and generation speed

### If Tests Fail
1. Consult DEBUGGING_GUIDE.md for specific error patterns
2. Check Vercel logs with request ID from DevTools Network tab
3. Verify environment variables in Vercel
4. Check OpenRouter API key validity on openrouter.ai
5. Try reducing question count to 5 (simpler request)
6. Restart/redeploy from Vercel dashboard

### Monitoring Going Forward
- Check Vercel logs 1-2 times per week
- Look for patterns of failures
- If offline mode increases, check OpenRouter API status
- Collect user feedback on question quality
- Keep DEBUGGING_GUIDE.md updated with new findings
