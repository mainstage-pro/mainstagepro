"use client";
import { SERVICIOS_DETALLE } from "@/lib/presentacion-servicios";
import { R, GOLD } from "@/components/presentacion/anim";
import { usePresentacionEdit, EditableImage, type EditCtx } from "@/components/presentacion/editable";

// Tarjetas de los 3 servicios con foto de fondo. Fuente única para la home,
// /servicios, tipos de evento y categorías: se ven idénticas en toda la
// presentación y comparten los mismos overrides de imagen (`home.servicio.*`).
export default function ServiciosCards({ edit: editProp }: { edit?: EditCtx }) {
  const own = usePresentacionEdit();
  const edit = editProp ?? own;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {SERVICIOS_DETALLE.map((s, i) => (
        <R key={s.slug} delay={i * 120}>
          <a
            href={`/presentacion/servicio/${s.slug}`}
            className="group relative rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-300 block"
            style={{ background: "#060606", border: "1px solid rgba(255,255,255,0.06)", minHeight: "440px" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${GOLD}40`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
          >
            <EditableImage
              edit={edit}
              okey={`home.servicio.${s.tipoServicio}.img`}
              fallback={s.hero}
              alt={s.title}
              wrapClassName="absolute inset-0"
              imgClassName="w-full h-full object-cover scale-105 transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(6,6,6,0.96) 0%, rgba(6,6,6,0.78) 35%, rgba(6,6,6,0.6) 70%, rgba(6,6,6,0.5) 100%)" }} />
            <div className="relative flex flex-col flex-1 items-center text-center p-8">
              <span className="text-white/60 text-xs font-mono tracking-widest">{s.n}</span>
              <div className="flex-1 flex flex-col justify-center items-center">
                <h3 className="font-bold text-white text-3xl leading-tight mb-4" style={{ letterSpacing: "-0.02em" }}>{s.title}</h3>
                <p className="text-white/70 text-base leading-relaxed max-w-[22rem]">{s.tagline}</p>
              </div>
              <p className="text-[#B3985B]/70 text-xs leading-relaxed mb-4">{s.detailChips}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/75 group-hover:text-white transition-transform duration-300 group-hover:translate-x-1">
                Ver servicio <span aria-hidden>→</span>
              </span>
            </div>
          </a>
        </R>
      ))}
    </div>
  );
}
