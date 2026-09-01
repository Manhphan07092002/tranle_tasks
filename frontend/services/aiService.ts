import { apiFetch } from './api';

// ─── Secure AI Service ────────────────────────────────────────────────────────
// API Keys are stored and used exclusively on the backend.
// The frontend never sees or holds any API key.
// All AI calls go through /api/ai/* endpoints which require authentication.

export const generateSubtasksFromTitle = async (taskTitle: string): Promise<string[]> => {
  if (!taskTitle) return [];
  try {
    const res = await apiFetch('/api/ai/generate-subtasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.subtasks) ? data.subtasks : [];
  } catch (error) {
    console.error('AI generateSubtasks Error:', error);
    return [];
  }
};

export const generateTaskDetails = async (
  taskTitle: string
): Promise<{ description: string; subtasks: string[] } | null> => {
  if (!taskTitle) return null;
  try {
    const res = await apiFetch('/api/ai/generate-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('AI generateTaskDetails Error:', error);
    return null;
  }
};

export interface SuggestedTask {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

export const generateTasksFromGoal = async (goal: string): Promise<SuggestedTask[]> => {
  if (!goal) return [];
  try {
    const res = await apiFetch('/api/ai/generate-tasks-from-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.tasks) ? data.tasks : [];
  } catch (error) {
    console.error('AI generateTasksFromGoal Error:', error);
    return [];
  }
};

// ─── Chat Session (SSE stream from backend) ───────────────────────────────────
// Backend streams Server-Sent Events with JSON chunks:
//   data: {"type":"text","content":"..."}
//   data: {"type":"function_call","name":"...","args":{...}}
//   data: {"type":"done"}

export const createChatSession = async (
  contextString?: string,
  history?: { role: 'user' | 'model'; text: string }[]
) => {
  return {
    sendMessageStream: async function* ({ message }: { message: string }) {
      const token = localStorage.getItem('tranle_token') || localStorage.getItem('ctc_token') || '';

      const res = await fetch('/api/ai/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          history: history || [],
          contextString: contextString || '',
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Chat stream failed: HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          let chunk;
          try {
            chunk = JSON.parse(jsonStr);
          } catch {
            continue; // ignore malformed SSE chunk
          }

          if (chunk.type === 'text') {
            yield { text: chunk.content };
          } else if (chunk.type === 'function_call') {
            yield { functionCalls: [{ name: chunk.name, args: chunk.args }] };
          } else if (chunk.type === 'error') {
            throw new Error(chunk.content);
          } else if (chunk.type === 'done') {
            return;
          }
        }
      }
    },
  };
};
