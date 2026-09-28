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
  const input = "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#B3985B]/40";

  return (
    <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-5">
      <h2 className="text-white font-bold text-base mb-1">¿Quién está revisando?</h2>
      <p className="text-white/35 text-xs mb-5 leading-relaxed">
        Cada casilla queda firmada con tu nombre. Solo se pide una vez en este dispositivo.
      </p>

      <div className="flex gap-2 mb-5">
        {(["INTERNO", "EXTERNO"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setModo(m); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
              modo === m
                ? "bg-[#B3985B]/15 border-[#B3985B]/40 text-[#B3985B]"
                : "bg-white/[0.025] border-white/8 text-white/40"
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
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${
                  tecnicoId === t.tecnicoId
                    ? "bg-[#B3985B]/10 border-[#B3985B]/40"
                    : "bg-white/[0.02] border-white/8"
                }`}
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    tecnicoId === t.tecnicoId ? "border-[#B3985B] bg-[#B3985B]" : "border-white/20"
                  }`}
                >
                  {tecnicoId === t.tecnicoId && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-white/85 text-sm font-medium truncate">{t.nombre}</span>
                  {t.rol && <span className="block text-white/30 text-xs truncate">{t.rol}</span>}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-sm py-4">
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

      {error && <p className="text-red-400 text-xs mt-4">{error}</p>}

      <button
        onClick={registrar}
        disabled={!puede || enviando}
        className="w-full mt-5 py-3.5 bg-[#B3985B] text-black rounded-xl text-sm font-bold disabled:opacity-25 disabled:cursor-not-allowed"
      >
        {enviando ? "Registrando…" : "Continuar"}
      </button>
    </div>
  );
}
