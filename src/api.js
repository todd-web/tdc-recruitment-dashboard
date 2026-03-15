const BASE = import.meta.env.BASE_URL;

export async function fetchEndpoint(endpoint, params = '') {
  // Try live API first (works in dev mode with Vite proxy)
  try {
    const res = await fetch(`/api/${endpoint}${params}`);
    if (res.ok) return res.json();
  } catch (_) {
    // API not available, fall through
  }

  // Fall back to static JSON snapshot (GitHub Pages)
  const res = await fetch(`${BASE}data/${endpoint}.json`);
  if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
  return res.json();
}
