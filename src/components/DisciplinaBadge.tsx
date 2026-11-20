import { DISCIPLINA_COLORS, DISCIPLINA_LABELS, type Disciplina } from "@/lib/disciplinaColors";
import { ICONO_DISCIPLINA } from "@/lib/disciplinaIconos";

export function DisciplinaIcono({ disciplina, size = 14, color }: { disciplina: Disciplina; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? DISCIPLINA_COLORS[disciplina]}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {ICONO_DISCIPLINA[disciplina].map((tr, i) =>
        tr.t === "path" ? <path key={i} d={tr.d} />
        : tr.t === "circle" ? <circle key={i} cx={tr.cx} cy={tr.cy} r={tr.r} />
        : <rect key={i} x={tr.x} y={tr.y} width={tr.width} height={tr.height} rx={tr.rx} />
      )}
    </svg>
  );
}

/** Chip con icono + nombre de la disciplina, en su color. `compacto` deja solo el icono. */
export function DisciplinaBadge({ disciplina, compacto = false }: { disciplina: Disciplina | null; compacto?: boolean }) {
  if (!disciplina) return null;
  const color = DISCIPLINA_COLORS[disciplina];
  const label = DISCIPLINA_LABELS[disciplina];
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold leading-none shrink-0"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}1a` }}
    >
      <DisciplinaIcono disciplina={disciplina} size={12} />
      {!compacto && label}
    </span>
  );
}
