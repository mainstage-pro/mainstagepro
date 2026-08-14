"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface PorUsuario {
  id: string;
  nombre: string;
  area: string | null;
  completadas: number;
  enProgreso: number;
  segundos: number;
  promedio: number | null;
  evaluaciones: number;
}
export interface Registro {
  usuario: { id: string; name: string; email: string; area: string | null };
  sesionTitulo: string;
  sesionNumero: number;
  categoria: { nombre: string; color: string } | null;
  estado: string;
  segundos: number;
  completadoEn: string | null;
  calificacion: number | null;
  aprobado: boolean | null;
}
export interface DetalleItem { pregunta: string; elegida: string; correcta: string; ok: boolean }
export interface Intento {
  usuario: string;
  area: string | null;
  sesionTitulo: string;
  categoria: { nombre: string; color: string } | null;
  calificacion: number;
  aprobado: boolean;
  minAprobar: number;
  creadoEn: string;
  aciertos: number;
  total: number;
  detalle: DetalleItem[];
}
export interface PreguntaFallada {
  sesionTitulo: string;
  categoria: { nombre: string; color: string } | null;
  pregunta: string;
  fallos: number;
  total: number;
  tasaFallo: number;
}
export interface Curso {
  id: string;
  titulo: string;
  numero: number;
  area: string | null;
  areaColor: string;
  subArea: string;
  duracion: number;
  tienePresentacion: boolean;
  tieneContenido: boolean;
  tieneEvaluacion: boolean;
  personas: number;
  completadas: number;
  califPromedio: number | null;
  intentos: number;
}
export interface Area {
  nombre: string;
  slug: string;
  color: string;
  cursos: number;
  conContenido: number;
  conEval: number;
  completadas: number;
}

export interface ResumenData {
  porUsuario: PorUsuario[];
  registros: Registro[];
  historial: Intento[];
  preguntasFalladas: PreguntaFallada[];
  porCurso: Curso[];
  porArea: Area[];
}

interface Ctx { data: ResumenData | null; loading: boolean; error: "forbidden" | "other" | null }
const ResumenCtx = createContext<Ctx>({ data: null, loading: true, error: null });

export function useResumen() { return useContext(ResumenCtx); }

export function ResumenProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"forbidden" | "other" | null>(null);

  useEffect(() => {
    fetch("/api/capacitacion/resumen", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401 || r.status === 403) throw new Error("forbidden");
        if (!r.ok) throw new Error("other");
        return r.json();
      })
      .then((d: ResumenData) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message === "forbidden" ? "forbidden" : "other"); setLoading(false); });
  }, []);

  return <ResumenCtx.Provider value={{ data, loading, error }}>{children}</ResumenCtx.Provider>;
}

// Estados compartidos entre pestañas.
export function Aviso({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border p-10 text-center" style={{ background: "#111", borderColor: "#262626" }}><p className="text-sm" style={{ color: "#9ca3af" }}>{children}</p></div>;
}
export function Skeleton() {
  return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#111" }} />)}</div>;
}

// Formateadores compartidos entre pestañas.
export function fmtFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
export function fmtTiempo(seg: number) {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
