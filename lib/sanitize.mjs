export function sanitizeChatText(s) {
  // Store plain text only; clients must escape on render (avoid double-encoding).
  return String(s ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 150);
}

/**
 * Display names reach the admin user table, the chat drawer and toasts, so they
 * must not carry markup or control characters. Registration previously stored
 * whatever was submitted after a trim, which let a nickname smuggle a script
 * into the admin panel. Callers still have to escape on render — this only
 * removes what has no business being in a name.
 */
export function sanitizeNickname(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
