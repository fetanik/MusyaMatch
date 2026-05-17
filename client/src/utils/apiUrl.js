/**
 * Build absolute or same-origin API URLs from VITE_API_BASE_URL.
 * Accepts origin only (http://localhost:5000) or root already ending with /api.
 */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '');
  if (!raw) {
    if (p.startsWith('/api')) return p;
    return `/api${p.startsWith('/') ? p : `/${p}`}`;
  }

  const base = raw.endsWith('/api') ? raw : `${raw}/api`;
  const rest = p.startsWith('/api') ? p.slice(4) : p;
  const suffix = rest.startsWith('/') ? rest : `/${rest}`;
  return `${base}${suffix}`;
}
