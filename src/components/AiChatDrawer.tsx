'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import {
  AlertCircle,
  Bot,
  Loader2,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react';

function extractTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function extractBookPaths(text: string): string[] {
  const matches = text.match(/\/book\/[a-f0-9]{24}/gi) ?? [];
  return Array.from(new Set(matches));
}

function formatAiError(error: Error | string): string {
  let raw = (typeof error === 'string' ? error : error.message)?.trim();
  if (!raw) {
    return 'Could not reach AI Trip Assistant. Check GOOGLE_GENERATIVE_AI_API_KEY in .env.local.';
  }
  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    if (parsed.error) raw = parsed.error;
    else if (parsed.message) raw = parsed.message;
  } catch {
    // Not JSON; keep raw message
  }
  const lower = raw.toLowerCase();
  if (lower.includes('401') || lower.includes('api key') || lower.includes('permission_denied')) {
    return 'Invalid or unauthorized Google Gemini API key. Check GOOGLE_GENERATIVE_AI_API_KEY.';
  }
  if (lower.includes('404') || lower.includes('not found') || lower.includes('not supported')) {
    return 'The configured Gemini model is unavailable. Set GEMINI_MODEL in .env.local to a supported model.';
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate limit')) {
    return 'Gemini API quota or rate limit exceeded. Please wait a moment and try again.';
  }
  return raw;
}

export default function AiChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/chat',
        credentials: 'include',
        fetch: async (url, init) => {
          const timeoutController = new AbortController();
          const timer = setTimeout(() => {
            timeoutController.abort();
          }, 30000);

          const parentSignal = init?.signal;
          const onParentAbort = () => timeoutController.abort();
          if (parentSignal) {
            if (parentSignal.aborted) {
              clearTimeout(timer);
              timeoutController.abort();
            } else {
              parentSignal.addEventListener('abort', onParentAbort, { once: true });
            }
          }

          try {
            const response = await fetch(url, {
              ...init,
              signal: timeoutController.signal,
            });
            if (!response.ok) {
              let errText = `AI request failed (${response.status})`;
              try {
                const body = (await response.json()) as { error?: string };
                if (body.error) errText = body.error;
              } catch {
                // Non-JSON error
              }
              throw new Error(errText);
            }
            return response;
          } catch (err) {
            if (
              err instanceof DOMException &&
              err.name === 'AbortError' &&
              !parentSignal?.aborted
            ) {
              throw new Error(
                'AI request timed out after 30 seconds. Please check your connection or API key.'
              );
            }
            throw err;
          } finally {
            clearTimeout(timer);
            parentSignal?.removeEventListener('abort', onParentAbort);
          }
        },
      }),
    []
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
  });

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-assistant', handleOpen);
    return () => window.removeEventListener('open-ai-assistant', handleOpen);
  }, []);

  const isStreaming =
    localLoading || status === 'submitted' || status === 'streaming';

  // Safety guard: never allow streaming indicator to hang indefinitely
  useEffect(() => {
    if (!isStreaming) return;
    const safetyTimer = setTimeout(() => {
      stop();
      setLocalLoading(false);
      setLocalError(
        'AI assistant took too long to respond. Please try again.'
      );
    }, 32000);
    return () => clearTimeout(safetyTimer);
  }, [isStreaming, stop]);

  const handleSend = async (promptText?: string) => {
    const query = (promptText ?? input).trim();
    if (!query || isStreaming) return;
    if (!promptText) setInput('');
    setLocalError(null);
    setLocalLoading(true);
    try {
      await sendMessage({ text: query });
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? formatAiError(err)
          : 'Failed to reach AI Trip Assistant.'
      );
    } finally {
      setLocalLoading(false);
    }
  };

  const displayError = localError ?? (error ? formatAiError(error) : null);

  const quickPrompts = [
    'Find buses between two cities',
    'Show cheapest sleeper buses',
    'What are my current bookings?',
  ];

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 hover:bg-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          <span>Ask AI Trip Assistant</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-indigo-600 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">AI Trip Assistant</h3>
                <p className="text-[11px] text-indigo-100">
                  Live MongoDB Tool Calling • Gemini
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-indigo-100 hover:bg-white/15 hover:text-white"
              aria-label="Close AI assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 && (
              <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-700 shadow-2xs">
                Hi! I am connected to YatraBus&apos;s live MongoDB database. Ask me
                about routes, fares, open window vs. aisle seats, or your own
                bookings!
              </div>
            )}

            {messages.map((msg) => {
              const text = extractTextFromMessage(msg);
              const bookLinks =
                msg.role === 'assistant' ? extractBookPaths(text) : [];
              if (!text && msg.role === 'assistant') return null;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-br-sm bg-indigo-600 text-white'
                        : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700 shadow-2xs'
                    }`}
                  >
                    <p>{text}</p>
                    {bookLinks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {bookLinks.map((path) => (
                          <Link
                            key={path}
                            href={path}
                            onClick={() => setIsOpen(false)}
                            className="inline-block rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            Select Seats →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isStreaming && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                  <span>Checking live schedules...</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    stop();
                    setLocalLoading(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                  Stop
                </button>
              </div>
            )}

            {displayError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 py-2">
            {quickPrompts.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isStreaming}
                onClick={() => void handleSend(chip)}
                className="rounded-full border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about routes, fares, seats..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
