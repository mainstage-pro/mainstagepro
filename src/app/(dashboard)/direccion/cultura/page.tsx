"use client";

import { useEffect, useState } from "react";
import { Compass, Crosshair, Telescope, ShieldOff, History, BadgeCheck, Presentation } from "lucide-react";
import { useEstrategia, inputCls, labelCls, btnPrimary, btnGhost } from "./useEstrategia";
import { Lienzo, Encabezado, Panel, Cita, Rotulo, GOLD, oro } from "./ui";

const CAMPOS = [
  {
    key: "proposito" as const,
    icono: Compass,
    titulo: "Propósito",
    ayuda: "El porqué. La razón de ser humana de la empresa — permanente, no cambia con el mercado.",
    filas: 6,
  },
  {
    key: "mision" as const,
    icono: Crosshair,
    titulo: "Misión",
    ayuda: "El qué, hoy: a qué se dedica el negocio, a quién sirve y cuál es su ventaja.",
    filas: 5,
  },
  {
    key: "vision" as const,
    icono: Telescope,
    titulo: "Visión",
    ayuda: "El hacia dónde, a 3–5 años. Debe poderse reconocer cuando ya se cumplió.",
    filas: 5,
  },
  {
    key: "aQuienNoServimos" as const,
    icono: ShieldOff,
    titulo: "A quién no servimos",
    ayuda: "El filo de la misión. Sirve para decidir a qué evento decir no y a quién no contratar.",
    filas: 4,
    filo: true,
  },
];

export default function IdentidadPage() {
  const { data, cargando, error, recargar } = useEstrategia();
  const [form, setForm] = useState<Record<string, string>>({});
  const [nota, setNota] = useState("");
  const [modo, setModo] = useState<"ver" | "corregir" | "publicar">("ver");
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!data?.identidad) return;
    const i = data.identidad;
    setForm({
      frase: i.frase ?? "",
      proposito: i.proposito,
      mision: i.mision,
      vision: i.vision,
      aQuienNoServimos: i.aQuienNoServimos ?? "",
    });
  }, [data?.identidad]);

  async function guardar() {
    setGuardando(true);
    setMsg("");
    const publicar = modo === "publicar";
    const res = await fetch("/api/direccion/estrategia/identidad", {
      method: publicar ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(publicar ? { ...form, notaCambio: nota } : form),
    });
    const d = await res.json();
    setGuardando(false);
    if (!res.ok) return setMsg(d.error ?? "No se pudo guardar");
    setMsg(publicar ? "Nueva versión publicada." : "Redacción actualizada.");
    setNota("");
    setModo("ver");
    recargar();
  }

  if (cargando) return <div className="p-6 text-gray-500 text-sm">Cargando…</div>;
  if (error) return <div className="p-6 text-red-400 text-sm">{error}</div>;
  if (!data?.identidad) return <div className="p-6 text-gray-500 text-sm">Sin identidad capturada.</div>;

  const i = data.identidad;
  const editando = modo !== "ver";

  return (
    <Lienzo>
      <Encabezado
        titulo="Identidad institucional"
        bajada="La base de la que cuelga todo lo demás. Se imprime en el acuerdo de alineación, en la oferta de trabajo y en el onboarding, así que cambiarla cambia lo que firma el equipo."
        acciones={
          !editando ? (
            <>
              <a className={btnGhost} href="/presentacion/cultura" target="_blank" rel="noopener noreferrer">
                <span className="flex items-center gap-1.5">
                  <Presentation strokeWidth={1.7} className="w-3.5 h-3.5" />
                  Presentar
                </span>
              </a>
              <button className={btnGhost} onClick={() => setModo("corregir")}>
                Corregir redacción
              </button>
              <button className={btnPrimary} onClick={() => setModo("publicar")}>
                Publicar nueva versión
              </button>
            </>
          ) : undefined
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5"
          style={{ background: oro(0.12), color: GOLD, border: `1px solid ${oro(0.3)}` }}
        >
          <BadgeCheck strokeWidth={2} className="w-3 h-3" />
          Versión {i.version} vigente
        </span>
        {i.publicadaEn && (
          <span className="text-xs text-gray-600">
            Publicada el {new Date(i.publicadaEn).toLocaleDateString("es-MX", { dateStyle: "long" })}
          </span>
        )}
      </div>

      {msg && <div className="text-sm" style={{ color: GOLD }}>{msg}</div>}

      {modo === "publicar" && (
        <Panel acento>
          <label className={labelCls}>
            Por qué cambia la identidad (obligatorio — queda en el historial)
          </label>
          <textarea
            className={inputCls}
            rows={2}
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Ej. La visión se actualizó tras abrir cobertura nacional."
          />
        </Panel>
      )}

      {/* Frase de marca: es la declaración, no un campo más de formulario. */}
      {editando ? (
        <Panel>
          <label className={labelCls}>Frase de marca</label>
          <input
            className={inputCls}
            value={form.frase ?? ""}
            onChange={e => setForm({ ...form, frase: e.target.value })}
          />
        </Panel>
      ) : (
        i.frase && (
          <div className="py-2">
            <Cita>{i.frase}</Cita>
          </div>
        )
      )}

      <div className="space-y-4">
        {CAMPOS.map(c => (
          <Panel key={c.key} peligro={c.filo && !editando}>
            <div className="flex items-start gap-3">
              <c.icono
                strokeWidth={1.6}
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: c.filo ? "rgba(248,113,113,0.85)" : oro(0.8) }}
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold text-white">{c.titulo}</h2>
                <p className="text-xs text-gray-600 mt-0.5 mb-3.5 leading-relaxed">{c.ayuda}</p>
                {editando ? (
                  <textarea
                    className={inputCls}
                    rows={c.filas}
                    value={form[c.key] ?? ""}
                    onChange={e => setForm({ ...form, [c.key]: e.target.value })}
                  />
                ) : (
                  <p className="text-[15px] text-gray-300 leading-[1.75] whitespace-pre-line">
                    {i[c.key] || "—"}
                  </p>
                )}
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {editando && (
        <div className="flex gap-2">
          <button className={btnPrimary} onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : modo === "publicar" ? "Publicar versión" : "Guardar redacción"}
          </button>
          <button
            className={btnGhost}
            onClick={() => {
              setModo("ver");
              setNota("");
              setMsg("");
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {data.historial.length > 1 && (
        <div className="space-y-4 pt-2">
          <Rotulo icono={History}>Historial de versiones</Rotulo>
          <ol className="relative pl-5" style={{ borderLeft: `1px solid ${oro(0.16)}` }}>
            {data.historial.map(h => (
              <li key={h.id} className="relative pb-5 last:pb-0">
                <span
                  className="absolute -left-[26px] top-1 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: h.vigente ? GOLD : "#1c1c1c",
                    border: `1px solid ${h.vigente ? GOLD : oro(0.3)}`,
                  }}
                />
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: h.vigente ? GOLD : "rgba(255,255,255,0.35)" }}
                  >
                    v{h.version}
                  </span>
                  {h.vigente && (
                    <span className="text-[10px] uppercase" style={{ color: oro(0.6), letterSpacing: "0.16em" }}>
                      Vigente
                    </span>
                  )}
                  <span className="text-[11px] text-gray-600 ml-auto">
                    {new Date(h.publicadaEn ?? h.createdAt).toLocaleDateString("es-MX", { dateStyle: "medium" })}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  {h.notaCambio ?? "Versión inicial"}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Lienzo>
  );
}
