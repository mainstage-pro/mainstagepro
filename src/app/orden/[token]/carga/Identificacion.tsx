"use client";

import { useState } from "react";
import { useOrden } from "../OrdenContext";

export type Verificador = { id: string; nombre: string; tipo: string };

const LLAVE = (token: string) => `orden-verificador:${token}`;

/** Quién marcó qué tiene que sobrevivir al cierre del navegador en la camioneta. */
export function leerVerificador(token: string): Verificador | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LLAVE(token));
    return raw ? (JSON.parse(raw) as Verificador) : null;
  } catch {
    return null;
  }
}

export function guardarVerificador(token: string, v: Verificador | null) {
  try {
    if (v) localStorage.setItem(LLAVE(token), JSON.stringify(v));
    else localStorage.removeItem(LLAVE(token));
  } catch { /* modo privado — se opera sin recordar */ }
}

/**
 * Puerta de identificación. El link es uno por proyecto, así que la firma de
 * cada marca viene de aquí: interno = técnico asignado al proyecto; externo =
 * ayudante, chofer o staff del venue, que se registra con nombre y teléfono.
 */
export default function Identificacion({ onListo }: { onListo: (v: Verificador) => void }) {
  const { orden, token } = useOrden();
  const [modo, setModo] = useState<"INTERNO" | "EXTERNO">("INTERNO");
  const [tecnicoId, setTecnicoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function registrar() {
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/orden/${token}/verificador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          modo === "INTERNO" ? { tipo: "INTERNO", tecnicoId } : { tipo: "EXTERNO", nombre, telefono, empresa }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No pudimos registrarte");
        return;
      }
      guardarVerificador(token, data.verificador);
      onListo(data.verificador);
    } catch {
      setError("Sin conexión. Conéctate para identificarte.");
    } finally {
      setEnviando(false);
    }
  }

  const puede = modo === "INTERNO" ? !!tecnicoId : nombre.trim().length >= 3 && telefono.replace(/\D/g, "").length >= 10;
  const input = "w-full border border-[#e0e0e0] rounded-md px-3 py-2.5 text-[13.5px] outline-none focus:border-[#B3985B]";

  return (
    <div className="border border-[#e8e8e8] rounded-md overflow-hidden">
      <div className="bg-[#0d0d0d] px-4 py-2.5">
        <span className="text-white text-[10px] font-bold uppercase tracking-[0.15em]">¿Quién está revisando?</span>
      </div>
      <div className="p-4">
      <p className="text-[#5a5a5a] text-[12px] mb-4 leading-relaxed">
        Cada casilla queda firmada con tu nombre. Solo se pide una vez en este dispositivo.
      </p>

      <div className="flex gap-2 mb-4">
        {(["INTERNO", "EXTERNO"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setModo(m); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-[12.5px] font-bold border transition-colors ${
              modo === m
                ? "bg-[#0d0d0d] border-[#0d0d0d] text-white"
                : "bg-white border-[#e0e0e0] text-[#5a5a5a]"
            }`}
          >
            {m === "INTERNO" ? "Soy del equipo" : "Soy externo"}
          </button>
        ))}
      </div>

      {modo === "INTERNO" ? (
        orden && orden.personal.length > 0 ? (
          <div className="space-y-2">
            {orden.personal.map((t) => (
              <button
                key={t.id}
                onClick={() => setTecnicoId(t.tecnicoId)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  tecnicoId === t.tecnicoId ? "bg-[#f7f0e2] border-[#B3985B]" : "bg-white border-[#e0e0e0]"
                }`}
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    tecnicoId === t.tecnicoId ? "border-[#B3985B] bg-[#B3985B]" : "border-[#c0c0c0]"
                  }`}
                >
                  {tecnicoId === t.tecnicoId && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[#0d0d0d] text-[13.5px] font-bold truncate">{t.nombre}</span>
                  {t.rol && <span className="block text-[#5a5a5a] text-[11.5px] truncate">{t.rol}</span>}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[#5a5a5a] text-[13px] py-3">
            Este proyecto no tiene técnicos asignados todavía. Regístrate como externo.
          </p>
        )
      ) : (
        <div className="space-y-3">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" className={input} autoComplete="name" />
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono (10 dígitos)" className={input} inputMode="tel" autoComplete="tel" />
          <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Empresa (opcional)" className={input} autoComplete="organization" />
        </div>
      )}

      {error && <p className="text-[#b91c1c] text-[12px] mt-4">{error}</p>}

      <button
        onClick={registrar}
        disabled={!puede || enviando}
        className="w-full mt-4 py-3.5 bg-[#B3985B] text-[#0d0d0d] rounded-lg text-[14px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {enviando ? "Registrando…" : "Continuar"}
      </button>
      </div>
    </div>
  );
}
