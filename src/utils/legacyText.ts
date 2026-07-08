export function isLegacyString(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const p = JSON.parse(raw);
    return !Array.isArray(p); // If it parses as an array, it's NOT legacy (it's the new array format)
  } catch (e) {
    // If it doesn't parse as JSON at all, it IS legacy text
    return true;
  }
}

export function parseLinks(raw: string | null | undefined): { label: string; url: string }[] {
  if (!raw) return [];
  if (isLegacyString(raw)) return []; // legacy string has no structured links
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p;
    return [];
  } catch (e) {
    return [];
  }
}
