export type LLMErrorType =
  | 'rate_limit'
  | 'context_length'
  | 'auth'
  | 'timeout'
  | 'server'
  | 'unknown';

export interface ClassifiedError {
  type: LLMErrorType;
  message: string;
  retryable: boolean;
  suggestedWaitMs: number;
  userMessage: string;
}

export function classifyLLMError(err: any): ClassifiedError {
  const message = (err?.message || String(err)).toLowerCase();
  const status = err?.status || err?.statusCode || err?.response?.status;

  // Rate limit
  if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
    const retryAfter = err?.headers?.['retry-after']
      ? parseInt(err.headers['retry-after'], 10) * 1000
      : undefined;
    return {
      type: 'rate_limit',
      message: err?.message || 'Rate limit exceeded',
      retryable: true,
      suggestedWaitMs: retryAfter || 60_000,
      userMessage: 'Rate limit hit. Waiting before retry...',
    };
  }

  // Context length / token overflow
  if (
    status === 413 ||
    message.includes('context length') ||
    message.includes('maximum context length') ||
    message.includes('token limit') ||
    message.includes('too large for model') ||
    message.includes('input length')
  ) {
    return {
      type: 'context_length',
      message: err?.message || 'Context too long',
      retryable: true,
      suggestedWaitMs: 0,
      userMessage: 'Context window exceeded. Compacting conversation...',
    };
  }

  // Auth errors
  if (
    status === 401 ||
    status === 403 ||
    message.includes('invalid api key') ||
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('api key')
  ) {
    return {
      type: 'auth',
      message: err?.message || 'Authentication failed',
      retryable: false,
      suggestedWaitMs: 0,
      userMessage: `Authentication error (${status || 401}). Check your API key with /config`,
    };
  }

  // Timeout
  if (
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    message.includes('socket hang up')
  ) {
    return {
      type: 'timeout',
      message: err?.message || 'Request timed out',
      retryable: true,
      suggestedWaitMs: 5000,
      userMessage: 'Request timed out. Retrying...',
    };
  }

  // Server errors (5xx)
  if (status >= 500) {
    return {
      type: 'server',
      message: err?.message || `Server error ${status}`,
      retryable: true,
      suggestedWaitMs: 10_000,
      userMessage: `LLM server error (${status}). Retrying...`,
    };
  }

  return {
    type: 'unknown',
    message: err?.message || String(err),
    retryable: true,
    suggestedWaitMs: 3000,
    userMessage: `LLM error: ${err?.message || String(err)}. Retrying...`,
  };
}
