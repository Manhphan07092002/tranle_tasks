// In-memory access-token store. The short-lived JWT (15m) never touches
// localStorage anymore — an XSS payload can at most steal a minutes-long token.
// The long-lived refresh token lives in an httpOnly cookie (invisible to JS)
// and is exchanged silently via /api/auth/refresh.
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

/** Exchange the httpOnly refresh cookie for a fresh access token (single-flight). */
export function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (!res.ok) {
          accessToken = null;
          return false;
        }
        const data = await res.json().catch(() => ({}));
        if (typeof data.token === 'string' && data.token) {
          accessToken = data.token;
          try {
            if (data.user) localStorage.setItem('tranle_user', JSON.stringify(data.user));
          } catch { /* ignore */ }
          return true;
        }
        accessToken = null;
        return false;
      } catch {
        accessToken = null;
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}
