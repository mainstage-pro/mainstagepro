// Utilidades de hora en formato de 12 horas (AM/PM).
// Almacenamiento canónico: "HH:MM" en 24 horas (hora de pared, sin zona horaria).

export function fmt24to12(val: string | null | undefined): string {
  if (!val) return "";
  const [hStr, mStr] = val.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return "";
  const m = (mStr ?? "00").padStart(2, "0").slice(0, 2);
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

// Interpreta texto libre escrito a mano y lo normaliza a "HH:MM" 24h.
// Acepta: "2:30 pm", "230pm", "2 pm", "14:30", "1430", "8", etc.
// Devuelve "" si no se puede interpretar.
export function parseHora(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "";

  let period: "am" | "pm" | null = null;
  if (s.includes("p")) period = "pm";
  else if (s.includes("a")) period = "am";

  const digits = s.replace(/[^\d:]/g, "");
  if (!digits) return "";

  let h: number;
  let m: number;
  if (digits.includes(":")) {
    const [hs, ms] = digits.split(":");
    h = parseInt(hs, 10);
    m = ms ? parseInt(ms.slice(0, 2), 10) : 0;
  } else if (digits.length <= 2) {
    h = parseInt(digits, 10);
    m = 0;
  } else if (digits.length === 3) {
    h = parseInt(digits.slice(0, 1), 10);
    m = parseInt(digits.slice(1), 10);
  } else {
    h = parseInt(digits.slice(0, 2), 10);
    m = parseInt(digits.slice(2, 4), 10);
  }

  if (isNaN(h) || isNaN(m)) return "";
  if (m > 59) m = 59;

  if (period === "pm") {
    if (h < 12) h += 12;
  } else if (period === "am") {
    if (h === 12) h = 0;
  }
  // Sin AM/PM se interpreta tal cual (permite escribir directo en 24h).

  if (h > 23) h = 23;
  if (h < 0) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
