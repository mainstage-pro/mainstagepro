"use client";

import { useEffect, useState } from "react";
import { useEstrategia, inputCls, labelCls, cardCls, btnPrimary, btnGhost } from "./useEstrategia";

const CAMPOS = [
  {
    key: "proposito" as const,
    titulo: "Propósito",
    ayuda: "El porqué. La razón de ser humana de la empresa — permanente, no cambia con el mercado.",
    filas: 6,
  },
  {
    key: "mision" as const,
    titulo: "Misión",
    ayuda: "El qué, hoy: a qué se dedica el negocio, a quién sirve y cuál es su ventaja.",
    filas: 5,
  },
  {
    key: "vision" as const,
    titulo: "Visión",
    ayuda: "El hacia dónde, a 3–5 años. Debe poderse reconocer cuando ya se cumplió.",
    filas: 5,
  },
  {
    key: "aQuienNoServimos" as const,
    titulo: "A quién no servimos",
    ayuda: "El filo de la misión. Sirve para decidir a qué evento decir no y a quién no contratar.",
    filas: 4,
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
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Identidad institucional</h1>
        <p className="text-sm text-gray-500 mt-1">
          La base de la que cuelga todo lo demás. Se imprime en el acuerdo de alineación, en la oferta
          de trabajo y en el onboarding, así que cambiarla cambia lo que firma el equipo.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs px-2.5 py-1 rounded-full bg-[#B3985B]/15 text-[#B3985B] border border-[#B3985B]/30">
          Versión {i.version} vigente
        </span>
        {i.publicadaEn && (
          <span className="text-xs text-gray-500">
            Publicada el {new Date(i.publicadaEn).toLocaleDateString("es-MX", { dateStyle: "long" })}
          </span>
        )}
        {!editando && (
          <div className="flex gap-2 ml-auto">
            <button className={btnGhost} onClick={() => setModo("corregir")}>
              Corregir redacción
            </button>
            <button className={btnPrimary} onClick={() => setModo("publicar")}>
              Publicar nueva versión
            </button>
          </div>
        )}
      </div>

      {msg && <div className="text-sm text-[#B3985B]">{msg}</div>}

      {modo === "publicar" && (
        <div className={`${cardCls} border-[#B3985B]/40`}>
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
        </div>
      )}

      <div className={cardCls}>
        <label className={labelCls}>Frase de marca</label>
        {editando ? (
          <input
            className={inputCls}
            value={form.frase ?? ""}
            onChange={e => setForm({ ...form, frase: e.target.value })}
          />
        ) : (
          <p className="text-lg text-[#B3985B] font-medium">{i.frase || "—"}</p>
        )}
      </div>

      {CAMPOS.map(c => (
        <div key={c.key} className={cardCls}>
          <h2 className="text-base font-semibold text-white">{c.titulo}</h2>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">{c.ayuda}</p>
          {editando ? (
            <textarea
              className={inputCls}
              rows={c.filas}
              value={form[c.key] ?? ""}
              onChange={e => setForm({ ...form, [c.key]: e.target.value })}
            />
          ) : (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {i[c.key] || "—"}
            </p>
          )}
        </div>
      ))}

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
        <div className={cardCls}>
          <h2 className="text-base font-semibold text-white mb-3">Historial de versiones</h2>
          <ul className="space-y-2">
            {data.historial.map(h => (
              <li key={h.id} className="flex gap-3 text-sm border-b border-[#1a1a1a] pb-2 last:border-0">
                <span className="text-gray-500 w-16 shrink-0">v{h.version}</span>
                <span className="text-gray-400 flex-1">{h.notaCambio ?? "Versión inicial"}</span>
                <span className="text-gray-600 text-xs shrink-0">
                  {new Date(h.publicadaEn ?? h.createdAt).toLocaleDateString("es-MX")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
