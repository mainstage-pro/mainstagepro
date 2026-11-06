// Identidad de marca por unidad en el portal público de aprobación. Sin
// infraestructura de imágenes nueva — solo copy de venta propio de cada
// unidad, montado antes del resumen de líneas. PropuestaServicioPDF.tsx se
// queda igual (ya es completo/profesional); esto es solo para el portal.
const COPY: Record<"LIVE" | "CREATIVE", { etiqueta: string; titulo: string; descripcion: string; color: string }> = {
  LIVE: {
    etiqueta: "Mainstage Live",
    titulo: "Producción técnica de gira",
    descripcion: "Audio, iluminación, video y logística de equipo coordinados fecha por fecha, con el mismo estándar en cada venue.",
    color: "#8b5cf6",
  },
  CREATIVE: {
    etiqueta: "Mainstage Creative",
    titulo: "Diseño y render para tu show",
    descripcion: "Visualización técnica, renders y documentación de producción listos para que el equipo en piso ejecute sin ambigüedad.",
    color: "#f59e0b",
  },
};

export default function HeroUnidadPropuesta({ unidad }: { unidad: "LIVE" | "CREATIVE" }) {
  const c = COPY[unidad];
  return (
    <div
      className="mt-10 rounded-2xl border px-6 py-5 text-center"
      style={{ borderColor: `${c.color}40`, background: `${c.color}0f` }}
    >
      <p className="text-[11px] tracking-[0.2em] uppercase font-semibold" style={{ color: c.color }}>
        {c.etiqueta}
      </p>
      <p className="mt-1.5 text-base sm:text-lg font-semibold text-white">{c.titulo}</p>
      <p className="mt-1.5 text-sm text-white/50 max-w-lg mx-auto leading-relaxed">{c.descripcion}</p>
    </div>
  );
}
