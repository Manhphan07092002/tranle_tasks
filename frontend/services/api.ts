import { getAccessToken, refreshAccessToken, clearAccessToken } from './tokenStore';

function hardLogout() {
  clearAccessToken();
  try {
    localStorage.removeItem('tranle_user');
    localStorage.removeItem('orange_task_user_id');
    // Drop any legacy long-lived token that may predate the refresh-token rollout.
    localStorage.removeItem('tranle_token');
  } catch { /* ignore */ }
  window.location.href = '/';
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const doFetch = (token: string | null) =>
    fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

  let response = await doFetch(getAccessToken());

  if (response.status === 401) {
    const isMailEndpoint = url.includes('/api/mail/');
    // Access tokens live 15 minutes — try one silent refresh before giving up.
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await doFetch(getAccessToken());
      if (response.status !== 401) return response;
    }
    // Refresh failed or retry still unauthorized.
    if (!isMailEndpoint) {
      hardLogout();
    } else {
      // Mail endpoints also return 401 for wrong IMAP credentials.
      // Only bounce to login when the session itself is dead (refresh failed).
      if (!refreshed) hardLogout();
    }
  }

  return response;
}
