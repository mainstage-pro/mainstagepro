"use client";

import { useCallback, useEffect, useState } from "react";
import type { EstadoObjetivo } from "@/lib/estrategia";

export interface TacticaDTO {
  id: string;
  objetivoId: string;
  descripcion: string;
  responsableId: string | null;
  fechaEjecucion: string | null;
  estado: string;
  notas: string | null;
  completadoEn: string | null;
  orden: number;
  vencida: boolean;
}

export interface ObjetivoDTO {
  id: string;
  areaId: string;
  descripcion: string;
  metrica: string;
  unidad: string;
  lineaBase: number | null;
  valorMeta: number | null;
  valorActual: number | null;
  kpiSlug: string | null;
  fechaLimite: string | null;
  orden: number;
  progreso: number;
  estadoCalc: EstadoObjetivo;
  tacticas: TacticaDTO[];
}

export interface AreaDTO {
  id: string;
  codigo: string;
  nombre: string;
  proposito: string | null;
  areaPermiso: string;
  responsableId: string | null;
  orden: number;
  progreso: number;
  enRiesgo: number;
  objetivos: ObjetivoDTO[];
}

export interface IndicadorDTO {
  id: string;
  nombre: string;
  unidad: string;
  lineaBase: number | null;
  valorMeta: number | null;
  valorActual: number | null;
  kpiSlug: string | null;
  orden: number;
}

export interface MetaDTO {
  id: string;
  periodo: string;
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string;
  indicadores: IndicadorDTO[];
}

export interface IdentidadDTO {
  id: string;
  proposito: string;
  mision: string;
  vision: string;
  frase: string | null;
  aQuienNoServimos: string | null;
  version: number;
  notaCambio: string | null;
  publicadaEn: string | null;
}

export interface ValorDTO {
  id: string;
  nombre: string;
  descripcion: string | null;
  comoSeVive: string | null;
  conductas: string | null;
  orden: number;
}

export interface UsuarioLite {
  id: string;
  name: string;
  email: string;
}

export interface EstrategiaData {
  identidad: IdentidadDTO | null;
  historial: { id: string; version: number; vigente: boolean; notaCambio: string | null; publicadaEn: string | null; createdAt: string }[];
  valores: ValorDTO[];
  meta: MetaDTO | null;
  areas: AreaDTO[];
  usuarios: UsuarioLite[];
  resumen: {
    objetivos: number;
    tacticas: number;
    tacticasVencidas: number;
    objetivosEnRiesgo: number;
    progreso: number;
  };
}

export function useEstrategia() {
  const [data, setData] = useState<EstrategiaData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const recargar = useCallback(async () => {
    try {
      const res = await fetch("/api/direccion/estrategia", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error ?? "No se pudo cargar");
      setData(await res.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { data, cargando, error, recargar };
}

export const inputCls =
  "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";
export const labelCls = "block text-xs text-gray-500 mb-1";
export const cardCls = "bg-[#111] border border-[#222] rounded-xl p-5";
export const btnPrimary =
  "px-4 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-medium hover:bg-[#c5a968] disabled:opacity-50";
export const btnGhost =
  "px-3 py-2 rounded-lg border border-[#222] text-gray-400 text-sm hover:text-white hover:border-[#333]";
