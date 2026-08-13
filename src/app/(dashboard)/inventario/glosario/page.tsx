"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";

type Tipo = "EQUIPO" | "ACCESORIO" | "ROL_TECNICO";
interface Termino {
  id: string;
  termino: string;
  original: string;
  tipoObjetivo: Tipo;
  objetivoId: string;
  fuente: string;
  activo: boolean;
}
interface Objetivo {
  id: string;
  nombre: string;
  detalle: string;
  grupo: string;
}
type Objetivos = Record<Tipo, Objetivo[]>;

const TABS: { key: Tipo; label: string }[] = [
  { key: "EQUIPO", label: "Equipos" },
  { key: "ACCESORIO", label: "Accesorios" },
  { key: "ROL_TECNICO", label: "Personal / Servicios" },
];

export default function GlosarioPage() {
  const [terminos, setTerminos] = useState<Termino[]>([]);
  const [objetivos, setObjetivos] = useState<Objetivos | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tipo>("EQUIPO");
  const [busqueda, setBusqueda] = useState("");
  const [nuevo, setNuevo] = useState<Record<string, string>>({});
  const [generando, setGenerando] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  async function cargar() {
    const res = await fetch("/api/glosario", { cache: "no-store" });
    const data = await res.json();
    setTerminos(data.terminos ?? []);
    setObjetivos(data.objetivos ?? null);
    setLoading(false);
  }
  useEffect(() => {
    cargar();
  }, []);

  const porObjetivo = useMemo(() => {
    const m = new Map<string, Termino[]>();
    for (const t of terminos) {
      const arr = m.get(t.objetivoId) ?? [];
      arr.push(t);
      m.set(t.objetivoId, arr);
    }
    return m;
  }, [terminos]);

  const lista = useMemo(() => {
    const items = objetivos?.[tab] ?? [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (o) =>
        o.nombre.toLowerCase().includes(q) ||
        o.detalle.toLowerCase().includes(q) ||
        (porObjetivo.get(o.id) ?? []).some((t) => t.termino.includes(q))
    );
  }, [objetivos, tab, busqueda, porObjetivo]);

  async function agregar(objetivoId: string) {
    const termino = (nuevo[objetivoId] ?? "").trim();
    if (!termino) return;
    const res = await fetch("/api/glosario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termino, tipoObjetivo: tab, objetivoId }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "No se pudo agregar");
      return;
    }
    setTerminos((prev) => [...prev, data.termino]);
    setNuevo((prev) => ({ ...prev, [objetivoId]: "" }));
  }

  async function eliminar(t: Termino) {
    await fetch(`/api/glosario/${t.id}`, { method: "DELETE" });
    setTerminos((prev) => prev.filter((x) => x.id !== t.id));
  }

  async function autogenerar() {
    const ok = await confirm({
      message: `Generar sinónimos con IA para "${TABS.find((x) => x.key === tab)?.label}" que aún no tengan términos. Puede tardar. ¿Continuar?`,
      confirmText: "Generar",
    });
    if (!ok) return;
    setGenerando(true);
    try {
      const res = await fetch("/api/glosario/autogenerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoObjetivo: tab, soloFaltantes: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al generar");
        return;
      }
      toast.success(`${data.creados} términos creados${data.colisiones ? `, ${data.colisiones} colisiones evitadas` : ""}`);
      await cargar();
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ms-h1">Glosario del inventario</h1>
          <p className="ms-subtitle">Palabras con las que el asistente reconoce cada equipo, accesorio o rol. Únicas: una palabra no puede apuntar a dos objetos.</p>
        </div>
        <button
          onClick={autogenerar}
          disabled={generando}
          className="px-4 py-2 rounded-lg bg-[#B3985B] text-black text-sm font-medium disabled:opacity-40"
        >
          {generando ? "Generando..." : "Autogenerar con IA"}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              tab === t.key ? "bg-[#B3985B] text-black" : "bg-[#111] text-[#888] border border-[#1a1a1a]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar objeto o término..."
        className="w-full md:max-w-md mb-4 bg-[#111] border border-[#1a1a1a] rounded-lg px-4 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50"
      />

      {loading ? (
        <SkeletonPage rows={6} cols={2} />
      ) : (
        <div className="space-y-2">
          {lista.map((o) => {
            const terms = porObjetivo.get(o.id) ?? [];
            return (
              <div key={o.id} className="border border-[#1a1a1a] rounded-lg p-3 bg-[#0c0c0c]">
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <div>
                    <span className="text-white text-sm font-medium">{o.nombre}</span>
                    {o.detalle && <span className="text-[#666] text-xs ml-2">{o.detalle}</span>}
                  </div>
                  <span className="text-[10px] text-[#555] uppercase">{o.grupo}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {terms.length === 0 && <span className="text-[#555] text-xs">Sin términos aún</span>}
                  {terms.map((t) => (
                    <span
                      key={t.id}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                        t.fuente === "ia" ? "border-[#B3985B]/30 text-[#B3985B]" : "border-[#2a2a2a] text-[#ccc]"
                      }`}
                    >
                      {t.termino}
                      <button onClick={() => eliminar(t)} className="text-[#666] hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuevo[o.id] ?? ""}
                    onChange={(e) => setNuevo((prev) => ({ ...prev, [o.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && agregar(o.id)}
                    placeholder="Agregar palabra…"
                    className="flex-1 bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#B3985B]/50"
                  />
                  <button onClick={() => agregar(o.id)} className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-white text-xs">
                    Añadir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
