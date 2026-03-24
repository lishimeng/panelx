/** 标准化为 #RRGGBB；非法输入回退 fallback。 */
export function normalizeHexColor(v: unknown, fallback = '#38bdf8'): string {
  const s = typeof v === 'string' ? v.trim() : ''
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s
  const noHash = s.startsWith('#') ? s.slice(1) : s
  if (/^[0-9a-fA-F]{6}$/.test(noHash)) return `#${noHash}`
  return fallback
}

