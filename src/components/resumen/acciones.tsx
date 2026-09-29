"use client";

// Operar desde el resumen.
//
// Un resumen que solo informa obliga a navegar a la ficha para hacer lo obvio
// (cobrar lo vencido, reprogramar el compromiso, cerrar la falla). Aquí el
// renglón trae sus acciones: se capturan los datos mínimos en línea y se
// refresca el server component, así la cifra de arriba cuadra con lo que se
// acaba de hacer.
//
// Las acciones se declaran como datos, no como callbacks: el resumen es un
// server component y una función no cruza esa frontera.

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useToast } from "@/components/Toast";
import { BARRA, TEXTO, type Tono } from "./ui";

export interface CampoAccion {
  nombre: string;
  etiqueta: string;
  tipo: "monto" | "fecha" | "texto" | "opcion";
  requerido?: boolean;
  inicial?: string;
  opciones?: { value: string; label: string }[];
  placeholder?: string;
}

export interface Accion {
  clave: string;
  label: string;
  endpoint: string;
  metodo?: "POST" | "PATCH";
  tono?: Tono;
  /** Lo que el usuario captura antes de ejecutar. Sin campos, se ejecuta directo. */
  campos?: CampoAccion[];
  /** Valores que siempre viajan en el cuerpo. */
  cuerpo?: Record<string, unknown>;
  /** Pregunta previa para acciones sin captura. */
  confirmar?: string;
  hecho?: string;
}

const BOTON: Record<Tono, string> = {
  neutro: "border-[#333] text-gray-300 hover:text-white hover:border-[#555]",
  oro: "border-[#B3985B]/40 text-[#B3985B] hover:bg-[#B3985B]/10",
  verde: "border-green-500/40 text-green-400 hover:bg-green-500/10",
  ambar: "border-amber-500/40 text-amber-400 hover:bg-amber-500/10",
  rojo: "border-red-500/40 text-red-400 hover:bg-red-500/10",
  azul: "border-blue-500/40 text-blue-400 hover:bg-blue-500/10",
};

export function FilaOperable({
  href,
  titulo,
  meta,
  valor,
  valorNota,
  tono = "neutro",
  tonoValor,
  badge,
  acciones,
}: {
  href?: string;
  titulo: ReactNode;
  meta?: ReactNode;
  valor?: ReactNode;
  valorNota?: ReactNode;
  tono?: Tono;
  /** Color sólo de la cifra, cuando no debe heredar la alarma de la barra. */
  tonoValor?: Tono;
  badge?: ReactNode;
  acciones: Accion[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const activa = acciones.find(a => a.clave === abierta) ?? null;

  function abrir(a: Accion) {
    setAbierta(a.clave);
    setValores(Object.fromEntries((a.campos ?? []).map(c => [c.nombre, c.inicial ?? ""])));
  }

  async function ejecutar(a: Accion) {
    const falta = (a.campos ?? []).find(c => c.requerido && !valores[c.nombre]?.trim());
    if (falta) {
      toast.error(`Falta ${falta.etiqueta.toLowerCase()}`);
      return;
    }

    setGuardando(true);
    try {
      const cuerpo: Record<string, unknown> = { ...(a.cuerpo ?? {}) };
      for (const c of a.campos ?? []) {
        const v = valores[c.nombre];
        if (v === undefined || v === "") continue;
        cuerpo[c.nombre] = c.tipo === "monto" ? Number(v) : v;
      }

      const res = await fetch(a.endpoint, {
        method: a.metodo ?? "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || "No se pudo completar la acción");
        return;
      }

      toast.success(a.hecho ?? "Listo");
      setAbierta(null);
      router.refresh();
    } catch {
      toast.error("Sin conexión con el servidor");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="border-t border-[#1a1a1a]">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className={`w-1 h-8 rounded-full shrink-0 ${BARRA[tono]}`} aria-hidden />
        <div className="min-w-0 flex-1">
          {href ? (
            <Link href={href} className="text-[13px] text-white truncate leading-tight block hover:text-[#B3985B] transition-colors">
              {titulo}
            </Link>
          ) : (
            <p className="text-[13px] text-white truncate leading-tight">{titulo}</p>
          )}
          {meta && <p className="ms-meta truncate mt-0.5">{meta}</p>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
        {valor !== undefined && (
          <div className="text-right shrink-0">
            <p className={`text-[13px] font-semibold tabular-nums ${TEXTO[tonoValor ?? tono]}`}>{valor}</p>
            {valorNota && <p className="ms-micro mt-0.5">{valorNota}</p>}
          </div>
        )}
        {acciones.length > 0 && (
          <button
            type="button"
            onClick={() => (abierta ? setAbierta(null) : abrir(acciones[0]))}
            className="shrink-0 ms-micro px-2 py-1 rounded-md border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#555] transition-colors"
            aria-expanded={abierta !== null}
          >
            {abierta ? "Cerrar" : "Operar"}
          </button>
        )}
      </div>

      {activa && (
        <div className="px-4 pb-3 pl-8">
          {acciones.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {acciones.map(a => (
                <button
                  key={a.clave}
                  type="button"
                  onClick={() => abrir(a)}
                  className={`ms-micro px-2 py-1 rounded-md border transition-colors ${
                    a.clave === activa.clave ? BOTON[a.tono ?? "oro"] + " bg-white/5" : BOTON["neutro"]
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {activa.confirmar && <p className="ms-meta mb-2">{activa.confirmar}</p>}

          {(activa.campos ?? []).length > 0 && (
            <div className="flex flex-wrap items-end gap-2 mb-2">
              {(activa.campos ?? []).map(c => (
                <label key={c.nombre} className="flex flex-col gap-1 min-w-0">
                  <span className="ms-micro">{c.etiqueta}</span>
                  {c.tipo === "opcion" ? (
                    <select
                      value={valores[c.nombre] ?? ""}
                      onChange={e => setValores(v => ({ ...v, [c.nombre]: e.target.value }))}
                      className="bg-[#1a1a1a] border border-[#333] rounded-md px-2 py-1 text-xs text-white focus:border-[#B3985B] outline-none"
                    >
                      <option value="">—</option>
                      {(c.opciones ?? []).map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={c.tipo === "monto" ? "number" : c.tipo === "fecha" ? "date" : "text"}
                      step={c.tipo === "monto" ? "0.01" : undefined}
                      value={valores[c.nombre] ?? ""}
                      placeholder={c.placeholder}
                      onChange={e => setValores(v => ({ ...v, [c.nombre]: e.target.value }))}
                      className={`bg-[#1a1a1a] border border-[#333] rounded-md px-2 py-1 text-xs text-white focus:border-[#B3985B] outline-none ${
                        c.tipo === "texto" ? "w-48" : "w-32"
                      }`}
                    />
                  )}
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={() => ejecutar(activa)}
              className={`ms-micro px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50 ${BOTON[activa.tono ?? "oro"]}`}
            >
              {guardando ? "Guardando…" : activa.label}
            </button>
            <button
              type="button"
              onClick={() => setAbierta(null)}
              className="ms-micro text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
