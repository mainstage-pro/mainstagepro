// Colores de los tipos de movimiento. Client-safe (sin imports de Prisma).
// Las clases están escritas completas para que Tailwind las incluya en el build.

export const COLOR_BADGE: Record<string, string> = {
  green:  "bg-green-900/50 text-green-300",
  red:    "bg-red-900/50 text-red-300",
  blue:   "bg-blue-900/50 text-blue-300",
  purple: "bg-purple-900/50 text-purple-300",
  orange: "bg-orange-900/50 text-orange-300",
  teal:   "bg-teal-900/50 text-teal-300",
  pink:   "bg-pink-900/50 text-pink-300",
  amber:  "bg-amber-900/50 text-amber-300",
  cyan:   "bg-cyan-900/50 text-cyan-300",
  gray:   "bg-gray-800 text-gray-400",
};

// Botón seleccionado (fondo + borde + texto) para el selector de tipo en el form.
export const COLOR_BUTTON: Record<string, string> = {
  green:  "bg-green-900/40 border-green-600 text-green-400",
  red:    "bg-red-900/40 border-red-600 text-red-400",
  blue:   "bg-blue-900/40 border-blue-600 text-blue-400",
  purple: "bg-purple-900/40 border-purple-600 text-purple-400",
  orange: "bg-orange-900/40 border-orange-600 text-orange-400",
  teal:   "bg-teal-900/40 border-teal-600 text-teal-400",
  pink:   "bg-pink-900/40 border-pink-600 text-pink-400",
  amber:  "bg-amber-900/40 border-amber-600 text-amber-400",
  cyan:   "bg-cyan-900/40 border-cyan-600 text-cyan-400",
  gray:   "bg-gray-800/60 border-gray-600 text-gray-300",
};

export function badgeClass(color: string): string {
  return COLOR_BADGE[color] ?? COLOR_BADGE.gray;
}

export function buttonClass(color: string): string {
  return COLOR_BUTTON[color] ?? COLOR_BUTTON.gray;
}

export const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: "green", label: "Verde" },
  { value: "red", label: "Rojo" },
  { value: "blue", label: "Azul" },
  { value: "purple", label: "Morado" },
  { value: "orange", label: "Naranja" },
  { value: "teal", label: "Verde azulado" },
  { value: "pink", label: "Rosa" },
  { value: "amber", label: "Ámbar" },
  { value: "cyan", label: "Cian" },
  { value: "gray", label: "Gris" },
];

export const NATURALEZA_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "ENTRADA", label: "Entrada (el dinero entra a una cuenta)", hint: "Como un ingreso: se abona a una cuenta." },
  { value: "SALIDA", label: "Salida (el dinero sale de una cuenta)", hint: "Como un gasto: se descuenta de una cuenta." },
  { value: "NEUTRO", label: "Entre cuentas (transferencia interna)", hint: "Mueve dinero entre dos cuentas propias. No afecta ingresos ni gastos." },
];
