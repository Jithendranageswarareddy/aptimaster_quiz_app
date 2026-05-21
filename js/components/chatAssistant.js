/*
  Purpose: Quiz question discussion assistant UI.

  The component keeps per-question chat memory and delegates AI requests to the chat service.
*/

import {
  buildChatSessionKey,
  clearChatThread,
  getQuickPrompts,
  loadChatThread,
  saveChatThread,
  sendChatAssistantMessage
} from '../services/chatService.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function escapeHtml(value) {
  return normalizeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMessages(messages, isLoading) {
  if (!messages.length && !isLoading) {
    return `
      <div class="chat-assistant__empty">
        <p>Ask about this question, the answer, the shortcut, or the underlying concept.</p>
      </div>
    `;
  }

  const messageHtml = messages
    .map((message) => {
      const roleClass = message.role === 'assistant' ? 'chat-message--assistant' : 'chat-message--user';
      return `
        <article class="chat-message ${roleClass}">
          <span class="chat-message__role">${message.role === 'assistant' ? 'AptiMaster Tutor' : 'You'}</span>
          <p class="chat-message__content">${escapeHtml(message.content)}</p>
        </article>
      `;
    })
    .join('');

  const typingHtml = isLoading
    ? `
      <article class="chat-message chat-message--assistant chat-message--typing" aria-live="polite">
        <span class="chat-message__role">AptiMaster Tutor</span>
        <div class="typing-indicator" aria-label="Assistant is typing">
          <span></span><span></span><span></span>
        </div>
      </article>
    `
    : '';

  return `${messageHtml}${typingHtml}`;
}

function renderQuickPrompts(prompts) {
  return prompts
    .map(
      (prompt) => `
        <button type="button" class="chat-assistant__chip" data-chat-prompt="${escapeHtml(prompt)}">
          ${escapeHtml(prompt)}
        </button>
      `
    )
    .join('');
}

function createEmptyState() {
  return {
    questionContext: null,
    sessionKey: '',
    messages: [],
    draft: '',
    isLoading: false,
    error: '',
    suggestedFollowUps: []
  };
}

export function mountChatAssistant(rootElement, initialQuestionContext = null) {
  const state = createEmptyState();

  function setQuestionContext(questionContext) {
    state.questionContext = questionContext;
    state.sessionKey = questionContext ? buildChatSessionKey(questionContext) : '';
    const storedThread = questionContext ? loadChatThread(questionContext) : { messages: [] };
    state.messages = storedThread.messages;
    state.draft = '';
    state.isLoading = false;
    state.error = '';
    state.suggestedFollowUps = [];
    render();
  }

  function persistThread() {
    if (!state.questionContext) return;
    saveChatThread(state.questionContext, state.messages);
  }

  function appendMessage(role, content) {
    state.messages = [...state.messages, { role, content: normalizeText(content) }].slice(-12);
    persistThread();
    render();
  }

  async function submitMessage(messageText) {
    const trimmedMessage = normalizeText(messageText);
    if (!trimmedMessage || !state.questionContext) return;

    state.error = '';
    state.isLoading = true;
    state.draft = '';
    appendMessage('user', trimmedMessage);

    try {
      const response = await sendChatAssistantMessage(state.questionContext, trimmedMessage, state.messages);
      state.messages = [
        ...state.messages,
        { role: 'assistant', content: response.reply }
      ].slice(-12);
      state.suggestedFollowUps = Array.isArray(response.suggestedFollowUps) ? response.suggestedFollowUps : [];
      persistThread();
      state.isLoading = false;
      state.draft = '';
      state.error = '';
      render();
    } catch (error) {
      const fallbackReply = 'I could not reach the tutor right now. Try again in a moment, or ask for a simpler step-by-step explanation.';
      state.messages = [
        ...state.messages,
        { role: 'assistant', content: fallbackReply }
      ].slice(-12);
      state.isLoading = false;
      state.error = error?.message || 'Chat assistant is unavailable.';
      state.suggestedFollowUps = [
        'Explain it step-by-step',
        'Show a shortcut method',
        'Why is the correct option right?'
      ];
      persistThread();
      render();
    }
  }

  function resetConversation() {
    if (!state.questionContext) return;
    clearChatThread(state.questionContext);
    state.messages = [];
    state.draft = '';
    state.isLoading = false;
    state.error = '';
    state.suggestedFollowUps = [];
    render();
  }

  function render() {
    const quickPrompts = getQuickPrompts(state.questionContext);
    const promptChips = state.suggestedFollowUps.length ? state.suggestedFollowUps : quickPrompts;

    rootElement.innerHTML = `
      <section class="chat-assistant card">
        <header class="chat-assistant__header">
          <div>
            <p class="section-eyebrow">AI Tutor</p>
            <h2>Question Discussion Assistant</h2>
            <p class="chat-assistant__subtitle">Ask follow-up doubts, shortcuts, or step-by-step explanations for the active quiz question.</p>
          </div>
          <button type="button" class="btn btn-secondary chat-assistant__reset" data-chat-action="reset" ${state.questionContext ? '' : 'disabled'}>
            Clear Chat
          </button>
        </header>

        <div class="chat-assistant__context" aria-label="Current question context">
          ${renderContextBadges(state.questionContext)}
        </div>

        <div class="chat-assistant__messages" aria-live="polite">
          ${renderMessages(state.messages, state.isLoading)}
        </div>

        <div class="chat-assistant__prompts" aria-label="Quick prompts">
          ${renderQuickPrompts(promptChips)}
        </div>

        <form class="chat-assistant__form" data-chat-form>
          <label class="sr-only" for="chat-assistant-input">Ask AptiMaster Tutor</label>
          <textarea
            id="chat-assistant-input"
            class="chat-assistant__input"
            rows="3"
            placeholder="Ask about the current question, a shortcut, or a follow-up doubt..."
            ${state.questionContext ? '' : 'disabled'}
          >${escapeHtml(state.draft)}</textarea>
          <div class="chat-assistant__actions">
            <p class="chat-assistant__status ${state.error ? 'chat-assistant__status--error' : ''}">
              ${state.error ? escapeHtml(state.error) : state.isLoading ? 'Thinking...' : 'Shift+Enter for a new line. Enter sends your question.'}
            </p>
            <button type="submit" class="btn chat-assistant__send" ${state.questionContext && !state.isLoading ? '' : 'disabled'}>
              ${state.isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </section>
    `;

    const textarea = rootElement.querySelector('#chat-assistant-input');
    const form = rootElement.querySelector('[data-chat-form]');
    const resetButton = rootElement.querySelector('[data-chat-action="reset"]');
    const promptButtons = Array.from(rootElement.querySelectorAll('[data-chat-prompt]'));

    if (textarea) {
      textarea.addEventListener('input', (event) => {
        state.draft = event.target.value;
      });

      textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          if (!state.isLoading && state.questionContext) {
            submitMessage(textarea.value);
          }
        }
      });
    }

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!state.isLoading && state.questionContext) {
          submitMessage(textarea?.value || state.draft);
        }
      });
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => resetConversation());
    }

    promptButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const prompt = button.getAttribute('data-chat-prompt') || '';
        state.draft = prompt;
        if (textarea) {
          textarea.value = prompt;
          textarea.focus();
        }
      });
    });
  }

  function renderContextBadges(questionContext) {
    if (!questionContext || !questionContext.question) {
      return '<p class="chat-assistant__context-empty">Select a quiz question to start chatting with the tutor.</p>';
    }

    const question = questionContext.question;
    const optionsPreview = Array.isArray(question.options)
      ? question.options.map((option) => `<span>${escapeHtml(option)}</span>`).join('')
      : '';

    return `
      <div class="chat-assistant__context-grid">
        <span class="chat-assistant__badge">${escapeHtml(questionContext.category || 'mixed')}</span>
        <span class="chat-assistant__badge">${escapeHtml(questionContext.topicLabel || questionContext.topic || 'Mixed Practice')}</span>
        <span class="chat-assistant__badge">${escapeHtml(questionContext.difficulty || 'medium')}</span>
        <span class="chat-assistant__badge">Q${Number(questionContext.questionIndex) + 1 || 1}</span>
      </div>
      <p class="chat-assistant__question">${escapeHtml(question.question)}</p>
      <div class="chat-assistant__options" aria-label="Question options">
        ${optionsPreview}
      </div>
    `;
  }

  setQuestionContext(initialQuestionContext);

  return {
    setQuestionContext,
    resetConversation
  };
}
