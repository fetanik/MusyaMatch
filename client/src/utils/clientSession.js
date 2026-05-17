/**
 * True when the client has a persisted session (same rules as route guards).
 */
export function isLoggedInClient() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'null' || raw === 'undefined') return false;
    const u = JSON.parse(raw);
    if (!u || typeof u !== 'object' || Array.isArray(u)) return false;
    const idish = u.userId ?? u.id ?? u.user_id;
    if (idish != null && String(idish).trim() !== '') return true;
    if (typeof u.email === 'string' && u.email.trim() !== '') return true;
    return false;
  } catch {
    return false;
  }
}

/** Shelter / organization manager — not the end-user cat owner flow. */
export function isShelterManagerClient() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return false;
    const u = JSON.parse(raw);
    const r = String(u?.role || '').toLowerCase();
    return ['manager', 'shelter_manager', 'shelter-manager'].includes(r);
  } catch {
    return false;
  }
}
