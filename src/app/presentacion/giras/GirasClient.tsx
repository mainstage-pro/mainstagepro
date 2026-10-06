"use client";

import { Route, ClipboardCheck, FileText } from "lucide-react";
import PresentacionNav from "@/components/presentacion/PresentacionNav";
import { R, GOLD } from "@/components/presentacion/anim";
import { WA_URL, useDescubrimiento } from "@/components/presentacion/descubrimiento";
import { iconoServicio } from "@/lib/servicio-iconos";
import { CATEGORIAS_SERVICIO, CATEGORIA_SERVICIO_LABEL, UNIDAD_COBRO_LABEL } from "@/lib/giras";

export type ServicioGira = {
  clave: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  icono: string;
  unidadDefault: string;
};

// Los tres pilares de la alianza, en el orden en que importan a un manager:
// primero quién responde, luego qué se verifica antes de llegar, y al final el
// papel con el que se trabaja.
const PILARES = [
  {
    Icon: Route,
    titulo: "Una sola dirección para toda la gira",
    cuerpo:
      "La misma cabeza de producción en cada plaza. No vuelves a explicar el show: lo que se aprendió en la primera fecha viaja a las demás.",
  },
  {
    Icon: ClipboardCheck,
    titulo: "El advance, plaza por plaza",
    cuerpo:
      "Tu rider se coteja contra lo que cada venue realmente tiene, punto por punto y fecha por fecha. Lo que falta se resuelve antes de viajar, no al llegar.",
  },
  {
    Icon: FileText,
    titulo: "Documentación que tu equipo ya sabe leer",
    cuerpo:
      "Day sheet, input y output list, libro de gira. Formatos estándar de la industria, generados de la misma información, sin versiones sueltas circulando.",
  },
];

// Qué papel recibe el equipo del artista. Es la prueba concreta de la alianza:
// un manager reconoce estos documentos y sabe lo que cuesta no tenerlos.
const DOCUMENTOS = [
  { nombre: "Rider técnico", cuerpo: "Tu rider versionado, con sus anexos, listo para mandar a cualquier promotor." },
  { nombre: "Input y output list", cuerpo: "Las dos listas de consola de cada fecha, con los invitados de esa noche ya numerados." },
  { nombre: "Day sheet", cuerpo: "La corrida del día y a quién se le marca. Es el que circula cada mañana." },
  { nombre: "Advance del show", cuerpo: "Qué pone la casa, qué llevamos nosotros y qué quedó pendiente con el promotor." },
  { nombre: "Libro de gira", cuerpo: "Routing, crew, hoteles y vuelos, repertorio y pendientes. El documento maestro de la temporada." },
];

// Las tres formas de cobrar, explicadas sin números: el monto es materia de la
// propuesta, no de la vitrina.
const COBRO = [
  { unidad: "SHOW", cuerpo: "Fechas sueltas o un puñado de plazas. Pagas lo que se trabaja en cada show." },
  { unidad: "DIA", cuerpo: "Bloques de días con montaje, ensayo y descanso. Útil en residencias y festivales." },
  { unidad: "GIRA", cuerpo: "La temporada completa cerrada. Es la que más conviene cuando el routing ya está armado." },
];

export default function GirasClient({
  servicios,
  hero,
}: {
  servicios: ServicioGira[];
  hero: string;
}) {
  const { iniciar, loading } = useDescubrimiento();

  // Agrupadas en el orden del catálogo, no el que devolvió la consulta, para que
  // production management abra siempre y las disciplinas vayan después.
  const grupos: { categoria: string; label: string; items: ServicioGira[] }[] = CATEGORIAS_SERVICIO.map(
    (categoria) => ({
      categoria: categoria as string,
      label: CATEGORIA_SERVICIO_LABEL[categoria] ?? categoria,
      items: servicios.filter((s) => s.categoria === categoria),
    }),
  ).filter((g) => g.items.length > 0);

  const sinCategoria = servicios.filter((s) => !s.categoria || !CATEGORIAS_SERVICIO.includes(s.categoria as never));
  if (sinCategoria.length) {
    grupos.push({ categoria: "OTRO", label: "Otros", items: sinCategoria });
  }

  return (
    <div
      className="bg-[#080808] text-white min-h-screen"
      style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}
    >
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: rgba(179,152,91,0.35); border-radius: 2px; }
      `}</style>

      <PresentacionNav />

      {/* ── Hero ── */}
      <section className="relative min-h-[78vh] flex flex-col justify-end overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero} alt="Gira" className="w-full h-full object-cover" style={{ transform: "scale(1.04)" }} />
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,8,8,0.5) 0%, rgba(8,8,8,0.4) 40%, rgba(8,8,8,0.9) 85%, #080808 100%)",
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto w-full px-6 pb-16">
          <p
            className="text-[#B3985B] text-xs font-semibold tracking-[0.24em] uppercase mb-4"
            style={{ animation: "fadeUp 0.8s ease forwards 0.15s", opacity: 0 }}
          >
            Para artistas y managers · Mainstage Pro
          </p>
          <h1
            className="font-bold text-white leading-[1.0] mb-5"
            style={{
              fontSize: "clamp(2.4rem,6.5vw,5rem)",
              letterSpacing: "-0.03em",
              animation: "fadeUp 0.9s ease forwards 0.3s",
              opacity: 0,
            }}
          >
            Sal de gira
            <br />
            <span className="text-white/40">con producción detrás.</span>
          </h1>
          <p
            className="text-white/65 max-w-xl"
            style={{ fontSize: "clamp(1rem,2vw,1.25rem)", animation: "fadeUp 0.9s ease forwards 0.5s", opacity: 0 }}
          >
            Production management para artistas en gira: una dirección de producción que responde por cada fecha, en
            cada plaza.
          </p>
        </div>
      </section>

      {/* ── El problema y los pilares ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-5">Por qué una alianza</p>
            <p
              className="text-white/70 leading-relaxed max-w-3xl mb-14"
              style={{ fontSize: "clamp(1.05rem,2vw,1.3rem)" }}
            >
              En gira el problema no es el equipo: es que cada plaza es distinta y cada promotor entiende tu rider a su
              manera. Aliarte con una sola producción significa que alguien ya habló con el venue antes de que tú
              llegues, y que el show que montaste en la primera fecha es el mismo que sale en la última.
            </p>
          </R>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PILARES.map(({ Icon, titulo, cuerpo }, i) => (
              <R key={titulo} delay={i * 100}>
                <div
                  className="rounded-2xl p-8 h-full"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <Icon size={28} strokeWidth={1.4} style={{ color: GOLD }} />
                  <h3 className="font-semibold text-white mt-6 mb-3 leading-snug text-lg">{titulo}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{cuerpo}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Alcance, del catálogo vivo de servicios ── */}
      {grupos.length > 0 && (
        <section className="py-20 px-6 bg-[#060606] border-y border-white/[0.04]">
          <div className="max-w-5xl mx-auto">
            <R>
              <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Qué abarca</p>
              <h2
                className="font-bold text-white leading-tight mb-3"
                style={{ fontSize: "clamp(1.7rem,3.5vw,2.6rem)", letterSpacing: "-0.02em" }}
              >
                El alcance se arma contigo.
              </h2>
              <p className="text-white/45 text-sm sm:text-base leading-relaxed max-w-2xl mb-12">
                No hay un paquete único. Éstos son los servicios que podemos tomar de tu gira; se eligen los que te
                hacen falta y el resto lo sigue llevando tu equipo.
              </p>
            </R>

            <div className="flex flex-col gap-12">
              {grupos.map((grupo, gi) => (
                <R key={grupo.categoria} delay={gi * 80}>
                  <p className="text-white/30 text-xs tracking-[0.2em] uppercase mb-5">{grupo.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {grupo.items.map((s) => {
                      const Icon = iconoServicio(s.icono);
                      return (
                        <div
                          key={s.clave}
                          className="flex items-start gap-4 rounded-xl px-5 py-5"
                          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <Icon size={20} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: GOLD }} />
                          <div className="min-w-0">
                            <p className="text-white/85 text-sm font-medium leading-snug">{s.nombre}</p>
                            {s.descripcion && (
                              <p className="text-white/40 text-xs leading-relaxed mt-1.5">{s.descripcion}</p>
                            )}
                            <p className="text-[#B3985B]/60 text-[11px] mt-2">
                              Se cobra {UNIDAD_COBRO_LABEL[s.unidadDefault] ?? s.unidadDefault}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </R>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Documentos ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Lo que recibe tu equipo</p>
            <h2
              className="font-bold text-white leading-tight mb-3"
              style={{ fontSize: "clamp(1.7rem,3.5vw,2.6rem)", letterSpacing: "-0.02em" }}
            >
              La gira, en papel.
            </h2>
            <p className="text-white/45 text-sm sm:text-base leading-relaxed max-w-2xl mb-12">
              Todos salen de la misma información, así que no hay dos versiones de la verdad entre tu tour manager, el
              promotor y nosotros.
            </p>
          </R>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DOCUMENTOS.map((d, i) => (
              <R key={d.nombre} delay={i * 60}>
                <div
                  className="rounded-xl px-6 py-6 h-full"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="font-mono mb-4" style={{ fontSize: "0.6rem", color: GOLD, letterSpacing: "0.12em" }}>
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-semibold text-white mb-2 leading-snug">{d.nombre}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{d.cuerpo}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo se cobra ── */}
      <section className="py-20 px-6 bg-[#060606] border-y border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-4">Cómo se cobra</p>
            <h2
              className="font-bold text-white leading-tight mb-3"
              style={{ fontSize: "clamp(1.7rem,3.5vw,2.6rem)", letterSpacing: "-0.02em" }}
            >
              Se cobra como gires.
            </h2>
            <p className="text-white/45 text-sm sm:text-base leading-relaxed max-w-2xl mb-12">
              Los montos van en la propuesta, con el alcance ya definido y los viajes desglosados aparte. Aquí solo la
              forma.
            </p>
          </R>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COBRO.map((c, i) => (
              <R key={c.unidad} delay={i * 100}>
                <div
                  className="rounded-2xl p-8 h-full"
                  style={{ background: "rgba(179,152,91,0.06)", border: `1px solid ${GOLD}22` }}
                >
                  <p className="text-[#B3985B] text-sm font-semibold mb-3">
                    {(UNIDAD_COBRO_LABEL[c.unidad] ?? c.unidad).replace(/^por /, "Por ")}
                  </p>
                  <p className="text-white/55 text-sm leading-relaxed">{c.cuerpo}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6" style={{ background: "#040404" }}>
        <div className="max-w-3xl mx-auto text-center">
          <R>
            <h2
              className="font-bold text-white leading-tight mb-6"
              style={{ fontSize: "clamp(1.8rem,5vw,3.2rem)", letterSpacing: "-0.025em" }}
            >
              ¿Traes <span style={{ color: GOLD }}>fechas</span> este año?
            </h2>
            <p className="text-white/45 mb-10">
              Cuéntanos del artista y del routing que tienes. Te devolvemos una propuesta con el alcance y los números.
              Respondemos en menos de 24 horas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* El lead nace como musical y en el escalón de dirección y
                  operaciones, que es de donde cuelga el production management. */}
              <button
                onClick={() => iniciar({ tipoEvento: "MUSICAL", tipoServicio: "DIRECCION_TECNICA" })}
                disabled={loading}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-black text-sm tracking-wide transition-all duration-300 hover:scale-105 disabled:opacity-60"
                style={{ background: GOLD }}
              >
                {loading ? "Abriendo…" : "Platiquemos de la gira"}
              </button>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-white/80 text-sm tracking-wide border border-white/15 hover:border-white/30 transition-all duration-300"
              >
                WhatsApp
              </a>
            </div>
          </R>
        </div>
      </section>

      {/* ── Siguiente paso ── */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <R>
            <p className="text-[#B3985B] text-xs tracking-[0.22em] uppercase mb-8">También te puede interesar</p>
          </R>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                href: "/presentacion/servicio/direccion-y-operaciones",
                titulo: "Dirección y operaciones",
                sub: "El servicio del que cuelga el production management de gira.",
              },
              {
                href: "/presentacion/galeria/musical",
                titulo: "Galería musical",
                sub: "Conciertos, festivales y shows que hemos producido, en fotos reales.",
              },
            ].map((l, i) => (
              <R key={l.href} delay={i * 100}>
                <a
                  href={l.href}
                  className="group flex items-center justify-between rounded-2xl p-7 transition-all duration-300"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <h3 className="font-bold text-white text-xl">{l.titulo}</h3>
                    <p className="text-white/45 text-sm mt-1">{l.sub}</p>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={GOLD}
                    strokeWidth="2"
                    className="shrink-0 transition-transform group-hover:translate-x-1"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </R>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-white/[0.04] text-center">
        <p className="text-white/20 text-xs tracking-wide">
          © {new Date().getFullYear()} Mainstage Pro · Producción técnica de eventos
        </p>
      </footer>
    </div>
  );
}
