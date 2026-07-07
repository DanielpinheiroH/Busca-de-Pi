export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8010" : "");

const SESSION_KEY = "busca_pi_session";

export function getSession() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setSession(session: string) {
  sessionStorage.setItem(SESSION_KEY, session);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function authHeaders(): Record<string, string> {
  const session = getSession();
  if (!session) return {};
  return { "X-Session": session };
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      ...authHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}
