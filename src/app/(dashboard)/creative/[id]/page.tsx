"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { nivelRenderSugerido } from "@/lib/propuesta-servicio";
import ListaTareasCreativo, { useTareasCreativo, type Usuario } from "./ListaTareasCreativo";
import EntregablesCreativoTab from "./EntregablesCreativoTab";

type Proyecto = {
  id: string;
  numero: string;
  nombre: string;
  estado: string;
  briefing: string | null;
  notas: string | null;
  revisionesIncluidas: number;
  revisionesUsadas: number;
  fechaSolicitud: string;
  fechaEntrega: string | null;
  fixtureCountEstimado: number | null;
  urgente: boolean;
  cliente: { id: string; nombre: string; empresa: string | null } | null;
  artista: { id: string; nombre: string } | null;
  gira: { id: string; nombre: string } | null;
  trato: { id: string; nombreEvento: string | null } | null;
  propuestas: { id: string; numero: string; estado: string; granTotal: number }[];
};

const ESTADOS = ["BRIEF", "EN_PROCESO", "REVISION", "ENTREGADO", "CANCELADO"] as const;
const ESTADO_LABELS: Record<string, string> = {
  BRIEF: "Brief", EN_PROCESO: "En proceso", REVISION: "Revisión", ENTREGADO: "Entregado", CANCELADO: "Cancelado",
};

const inputCls = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[12.5px] text-white placeholder:text-[#444] focus:outline-none focus:border-[#B3985B]/50";
const labelCls = "text-[10px] uppercase tracking-wider text-[#666] mb-1 block";

export default function ProyectoCreativoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const { tareas, upsert, quitar, alternar, eliminar: eliminarTarea } = useTareasCreativo(id);

  useEffect(() => {
    fetch(`/api/proyectos-creativos/${id}`).then(r => r.json()).then(d => {
      setProyecto(d.proyecto ?? null);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    fetch("/api/usuarios-activos").then(r => r.json()).then(d => {
      setUsuarios((d.usuarios ?? []).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
    });
  }, []);

  async function guardar(campos: Partial<Record<string, string | number | boolean | null>>) {
    if (!proyecto) return;
    setSaving(true);
    setProyecto({ ...proyecto, ...campos } as Proyecto);
    await fetch(`/api/proyectos-creativos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    setSaving(false);
  }

  function ajustarRevisionesUsadas(delta: number) {
    if (!proyecto) return;
    const siguiente = Math.max(0, proyecto.revisionesUsadas + delta);
    guardar({ revisionesUsadas: siguiente });
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este proyecto creativo?")) return;
    await fetch(`/api/proyectos-creativos/${id}`, { method: "DELETE" });
    router.push("/creative/proyectos");
  }

  if (loading) return <div className="ms-page-form"><p className="text-[#444] text-sm">Cargando...</p></div>;
  if (!proyecto) return <div className="ms-page-form"><p className="text-[#444] text-sm">No encontrado</p></div>;

  return (
    <div className="ms-page-form space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/creative/proyectos" className="ms-micro text-[#555] hover:text-[#888] transition-colors">← Proyectos creativos</Link>
          <p className="text-[#B3985B] text-xs uppercase tracking-widest font-semibold mt-1 mb-1">{proyecto.numero}</p>
          <input value={proyecto.nombre} onChange={e => setProyecto({ ...proyecto, nombre: e.target.value })}
            onBlur={e => guardar({ nombre: e.target.value })}
            className="ms-h1 bg-transparent border-none outline-none w-full" />
        </div>
        <button onClick={eliminar} className="shrink-0 ms-btn-danger text-xs">Eliminar</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ESTADOS.map(e => (
          <button key={e} onClick={() => guardar({ estado: e })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              proyecto.estado === e ? "bg-[#B3985B] text-black" : "bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-white"
            }`}>
            {ESTADO_LABELS[e]}
          </button>
        ))}
        {saving && <span className="ms-micro text-[#555] self-center">guardando…</span>}
      </div>

      <div className="ms-card p-4 space-y-3">
        <p className="ms-section-label">Origen</p>
        <div className="flex gap-2 flex-wrap text-[12.5px]">
          {proyecto.cliente && <span className="ms-card-inset px-2.5 py-1 rounded-lg text-white">{proyecto.cliente.empresa || proyecto.cliente.nombre}</span>}
          {proyecto.artista && <span className="ms-card-inset px-2.5 py-1 rounded-lg text-white">{proyecto.artista.nombre}</span>}
          {proyecto.gira && (
            <Link href={`/giras/${proyecto.gira.id}`} className="ms-card-inset px-2.5 py-1 rounded-lg text-[#B3985B] hover:text-[#c9a96a]">
              Gira: {proyecto.gira.nombre}
            </Link>
          )}
          {proyecto.trato && (
            <Link href={`/crm/tratos/${proyecto.trato.id}`} className="ms-card-inset px-2.5 py-1 rounded-lg text-[#B3985B] hover:text-[#c9a96a]">
              Trato: {proyecto.trato.nombreEvento || proyecto.trato.id}
            </Link>
          )}
          {!proyecto.cliente && !proyecto.artista && !proyecto.gira && !proyecto.trato && (
            <span className="text-[#444]">Sin origen capturado</span>
          )}
        </div>
      </div>

      <div className="ms-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fecha de solicitud</label>
            <p className="text-sm text-white">{new Date(proyecto.fechaSolicitud).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <div>
            <label className={labelCls}>Fecha de entrega</label>
            <input type="date" defaultValue={proyecto.fechaEntrega?.slice(0, 10) ?? ""}
              onBlur={e => guardar({ fechaEntrega: e.target.value || null })}
              className={inputCls} />
          </div>
        </div>
      </div>

      <div className="ms-card p-4 space-y-2">
        <p className="ms-section-label">Descubrimiento</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fixtures estimados</label>
            <input type="number" min={0} defaultValue={proyecto.fixtureCountEstimado ?? ""}
              placeholder="Ej. 42"
              onBlur={e => guardar({ fixtureCountEstimado: e.target.value ? Math.max(0, parseInt(e.target.value, 10) || 0) : null })}
              className={inputCls} />
          </div>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-[11px] text-[#999] cursor-pointer">
              <input type="checkbox" checked={proyecto.urgente}
                onChange={e => guardar({ urgente: e.target.checked })}
                className="accent-[#B3985B]" />
              Entrega urgente (URGENCIA_RENDER, solo Nivel A)
            </label>
          </div>
        </div>
        {typeof proyecto.fixtureCountEstimado === "number" && proyecto.fixtureCountEstimado > 0 && (
          <p className="text-[11px] text-[#B3985B]">
            Nivel sugerido: {nivelRenderSugerido(proyecto.fixtureCountEstimado).etiqueta} ({nivelRenderSugerido(proyecto.fixtureCountEstimado).rango})
          </p>
        )}
      </div>

      <div className="ms-card p-4 space-y-2">
        <p className="ms-section-label">Revisiones</p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={() => ajustarRevisionesUsadas(-1)} disabled={proyecto.revisionesUsadas <= 0}
              className="w-7 h-7 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] hover:text-white disabled:opacity-30 transition-colors">−</button>
            <span className={`text-sm font-medium ${proyecto.revisionesUsadas > proyecto.revisionesIncluidas ? "text-[#e8a020]" : "text-white"}`}>
              {proyecto.revisionesUsadas} / {proyecto.revisionesIncluidas} usadas
            </span>
            <button onClick={() => ajustarRevisionesUsadas(1)}
              className="w-7 h-7 rounded-lg bg-[#111] border border-[#1a1a1a] text-[#888] hover:text-white transition-colors">+</button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10.5px] text-[#555]">Incluidas en el trato</label>
            <input type="number" min={0} defaultValue={proyecto.revisionesIncluidas}
              onBlur={e => guardar({ revisionesIncluidas: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              className="w-16 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-[12.5px] text-white focus:outline-none focus:border-[#B3985B]/50" />
          </div>
        </div>
        {proyecto.revisionesUsadas > proyecto.revisionesIncluidas && (
          <p className="text-[11px] text-[#e8a020]">
            Ya se pasó de las incluidas — toca cobrar cambio extra (catálogo CAMBIO_ADICIONAL_RENDER).
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="ms-section-label">Entregables</p>
        <EntregablesCreativoTab proyectoCreativoId={proyecto.id} />
      </div>

      <div className="space-y-2">
        <p className="ms-section-label">Checklist operativo</p>
        <ListaTareasCreativo
          proyectoCreativoId={proyecto.id}
          proyectoCreativoNombre={proyecto.nombre}
          usuarios={usuarios}
          tareas={tareas}
          upsert={upsert}
          quitar={quitar}
          alternar={alternar}
          eliminar={eliminarTarea}
        />
      </div>

      <div className="ms-card p-4 space-y-2">
        <label className={labelCls}>Briefing</label>
        <textarea defaultValue={proyecto.briefing ?? ""} rows={4}
          placeholder="¿Qué se necesita diseñar/renderizar/documentar?"
          onBlur={e => guardar({ briefing: e.target.value || null })}
          className={`${inputCls} resize-none`} />
      </div>

      <div className="ms-card p-4 space-y-2">
        <label className={labelCls}>Notas</label>
        <textarea defaultValue={proyecto.notas ?? ""} rows={3}
          placeholder="Notas internas"
          onBlur={e => guardar({ notas: e.target.value || null })}
          className={`${inputCls} resize-none`} />
      </div>

      {proyecto.propuestas.length > 0 && (
        <div className="ms-card p-4 space-y-2">
          <p className="ms-section-label">Propuestas de honorarios</p>
          {proyecto.propuestas.map(p => (
            <Link key={p.id} href={`/giras/propuesta/${p.id}`} className="flex items-center justify-between text-sm hover:text-white">
              <span className="text-white">{p.numero}</span>
              <span className="text-[#777]">{p.estado}</span>
              <span className="text-[#B3985B]">${p.granTotal.toLocaleString("es-MX")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
