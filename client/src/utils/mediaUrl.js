/**
 * Cat/event images: absolute Cloudinary URLs, or server paths like `/uploads/...`.
 * In dev, relative `/uploads` would hit the Vite port unless proxied — combine with `vite.config` proxy.
 * With `VITE_API_BASE_URL=http://localhost:5000`, relative paths are prefixed with that origin.
 */
export function resolveUploadedImageUrl(url) {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw || raw === 'null' || raw === 'undefined') return '';
  if (raw.startsWith('blob:') || raw.startsWith('data:')) return raw;

  const loopbackPath = raw.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/.*)$/i);
  if (loopbackPath) {
    return resolveUploadedImageUrl(loopbackPath[1]);
  }

  if (/^https?:\/\//i.test(raw)) return raw;

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const envBase = String(import.meta.env.VITE_API_BASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '');
  if (envBase) {
    const origin = envBase.replace(/\/api\/?$/i, '');
    return `${origin}${path}`;
  }
  return path;
}
