import type { ChatChunk } from './types';

// Empty string = relative URLs go through Vite proxy
const API_URL = import.meta.env.VITE_API_URL || '';

// localStorage key for user ID persistence
const USER_ID_KEY = 'orbital_user_id';

/**
 * Get or create a persistent user ID stored in localStorage
 * This ensures connections persist across page reloads
 */
function getOrCreateUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * Get the current user ID (creates one if doesn't exist)
 */
export function getUserId(): string {
  return getOrCreateUserId();
}

/**
 * Initiate OAuth flow for a specific app (gmail, slack, notion)
 * Redirects the user to the OAuth provider via Composio
 */
export async function initiateOAuth(app: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/${app}/start`, {
    credentials: 'include', // Send cookies for session
  });
  if (!response.ok) throw new Error('Failed to initiate OAuth');
  const data = await response.json();
  // Store which app we're connecting (to show loading state on return)
  sessionStorage.setItem('oauth_pending', app);
  window.location.href = data.redirect_url;
}

/**
 * Get list of connected apps for the current user
 * Returns array of app names with ACTIVE status (e.g., ["gmail", "slack"])
 */
export async function getConnections(): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/auth/connections`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch connections');
  const data = await response.json();
  return data.connected_apps;
}

/**
 * Check if there's a pending OAuth flow that just completed
 * Clears the pending state after checking
 */
export function checkOAuthPending(): string | null {
  const pending = sessionStorage.getItem('oauth_pending');
  if (pending) {
    sessionStorage.removeItem('oauth_pending');
  }
  return pending;
}

/**
 * Stream chat messages to the backend and receive SSE response chunks.
 * Uses fetch + ReadableStream (NOT EventSource, which only supports GET).
 * 
 * @param messages - Array of chat messages to send
 * @param onChunk - Callback invoked for each parsed SSE chunk
 */
export async function streamChat(
  messages: { role: string; content: string }[],
  onChunk: (chunk: ChatChunk) => void
): Promise<void> {
  const entityId = getUserId();
  
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-entity-id': entityId,
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat request failed: ${error}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Decode the chunk and add to buffer
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE format: "data: {...}\n\n"
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || ''; // Keep incomplete chunk in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6); // Remove "data: " prefix
        
        // Handle end signal
        if (data === '[DONE]') {
          return;
        }
        
        try {
          const chunk = JSON.parse(data) as ChatChunk;
          onChunk(chunk);
        } catch (e) {
          console.error('Failed to parse SSE chunk:', data, e);
        }
      }
    }
  }
}
