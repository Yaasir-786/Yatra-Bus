export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
}

export function mapGeminiError(error: unknown): {
  status: number;
  message: string;
} {
  console.error('AI Error:', error);

  const statusCode =
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : 500;

  const raw =
    error instanceof Error ? error.message : 'AI assistant error occurred.';
  const lower = raw.toLowerCase();

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    lower.includes('api key') ||
    lower.includes('unauthenticated') ||
    lower.includes('permission_denied')
  ) {
    return {
      status: 401,
      message:
        'Invalid or unauthorized Google Gemini API key. Check GOOGLE_GENERATIVE_AI_API_KEY.',
    };
  }

  if (
    statusCode === 404 ||
    lower.includes('not found') ||
    lower.includes('is not supported')
  ) {
    return {
      status: 404,
      message:
        'The configured Gemini model is unavailable. Set GEMINI_MODEL in .env.local to a supported model.',
    };
  }

  if (
    statusCode === 429 ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('resource_exhausted')
  ) {
    return {
      status: 429,
      message:
        'Gemini API quota or rate limit exceeded. Please wait a moment and try again.',
    };
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      status: 500,
      message: 'AI service is temporarily unavailable. Please try again later.',
    };
  }

  return {
    status: statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    message: raw,
  };
}
