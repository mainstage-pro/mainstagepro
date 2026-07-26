"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Rocket, Inbox } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { SkeletonPage } from "@/components/Skeleton";
import { AREAS, areaLabel, AREA_DOT } from "@/lib/gestion";
import IdeaModal, { type Idea } from "./IdeaModal";
import ConvertirModal from "./ConvertirModal";

interface Usuario { id: string; name: string }

export default function BandejaPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Idea | null>(null);
  const [convirtiendo, setConvirtiendo] = useState<Idea | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    Promise.all([
      fetch("/api/proyectos-internos/ideas").then(r => r.json()),
      fetch("/api/usuarios").then(r => r.json()),
    ]).then(([di, du]) => {
      setIdeas(di.ideas ?? []);
      setUsuarios(du.usuarios ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const nombreDe = useMemo(() => {
    const map = new Map(usuarios.map(u => [u.id, u.name]));
    return (id: string | null) => (id ? map.get(id) ?? "—" : null);
  }, [usuarios]);

  const pendientes = ideas.filter(i => i.estado === "PENDIENTE");
  const convertidas = ideas.filter(i => i.estado === "CONVERTIDA");

  function onSaved(idea: Idea) {
    setIdeas(prev => prev.some(x => x.id === idea.id) ? prev.map(x => x.id === idea.id ? idea : x) : [idea, ...prev]);
    toast.success(editando ? "Idea actualizada" : "Idea agregada");
  }

  async function eliminar(idea: Idea) {
    const ok = await confirm({ message: `¿Eliminar la idea "${idea.titulo}"?`, danger: true, confirmText: "Eliminar" });
    if (!ok) return;
    const res = await fetch(`/api/proyectos-internos/ideas/${idea.id}`, { method: "DELETE" });
    if (res.ok) { setIdeas(prev => prev.filter(x => x.id !== idea.id)); toast.success("Idea eliminada"); }
    else toast.error("No se pudo eliminar");
  }

  function abrirNueva() { setEditando(null); setModalOpen(true); }
  function abrirEditar(idea: Idea) { setEditando(idea); setModalOpen(true); }

  function IdeaCard({ idea }: { idea: Idea }) {
    return (
      <div className="group rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] hover:bg-[#0d0d0d] transition-colors p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium leading-snug">{idea.titulo}</p>
            {idea.descripcion && <p className="text-gray-500 text-[12px] mt-1 leading-snug whitespace-pre-wrap">{idea.descripcion}</p>}
            {nombreDe(idea.responsableId) && (
              <p className="text-[11px] text-gray-500 mt-2">{nombreDe(idea.responsableId)}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setConvirtiendo(idea)}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[#B3985B]/30 text-[#B3985B] hover:bg-[#B3985B]/10 transition-all"
              title="Pasar a proyecto activo">
              <Rocket size={13} /> <span className="hidden sm:inline">A proyecto</span>
            </button>
            <button onClick={() => abrirEditar(idea)}
              className="p-1.5 rounded-lg text-[#444] hover:text-white transition-colors opacity-0 group-hover:opacity-100" title="Editar">
              <Pencil size={14} />
            </button>
            <button onClick={() => eliminar(idea)}
              className="p-1.5 rounded-lg text-[#444] hover:text-red-500/70 transition-colors opacity-0 group-hover:opacity-100" title="Eliminar">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Bandeja de entrada</h1>
          <p className="ms-subtitle mt-0.5">
            {loading ? "Cargando..." : `${pendientes.length} ${pendientes.length === 1 ? "idea pendiente" : "ideas pendientes"}`}
          </p>
        </div>
        <button onClick={abrirNueva}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-lg bg-[#B3985B] hover:bg-[#c9aa6a] text-[#080808] transition-all">
          <Plus size={15} /> Nueva idea
        </button>
      </div>

      {loading ? (
        <SkeletonPage rows={5} cols={2} />
      ) : pendientes.length === 0 && convertidas.length === 0 ? (
        <div className="ms-empty-state flex flex-col items-center gap-2 py-16">
          <Inbox size={28} className="text-[#2a2a2a]" />
          <p className="text-gray-600 text-sm">Sin ideas todavía. Captura la primera.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {AREAS.map(area => {
            const delArea = pendientes.filter(i => (i.area || "").toUpperCase() === area);
            return (
              <div key={area}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: AREA_DOT[area] }} />
                  <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">{areaLabel(area)}</p>
                  <span className="text-[11px] text-gray-600">{delArea.length}</span>
                  <div className="h-px flex-1 bg-[#111]" />
                </div>
                {delArea.length > 0 ? (
                  <div className="space-y-2">
                    {delArea.map(idea => <IdeaCard key={idea.id} idea={idea} />)}
                  </div>
                ) : (
                  <p className="text-[12px] text-gray-700 pl-4 py-1">Sin ideas en esta área.</p>
                )}
              </div>
            );
          })}

          {convertidas.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-700">Convertidas en proyecto</p>
                <div className="h-px flex-1 bg-[#111]" />
              </div>
              <div className="space-y-2 opacity-60">
                {convertidas.map(idea => (
                  <div key={idea.id} className="rounded-xl border border-[#141414] bg-[#080808] p-3 flex items-center gap-3">
                    <Rocket size={13} className="text-[#B3985B]/60 shrink-0" />
                    <a href={idea.proyectoId ? `/proyectos-de-empresa/${idea.proyectoId}` : undefined}
                      className="flex-1 min-w-0 text-[13px] text-gray-400 hover:text-white truncate">{idea.titulo}</a>
                    <button onClick={() => eliminar(idea)}
                      className="p-1.5 rounded-lg text-[#333] hover:text-red-500/70 transition-colors" title="Eliminar de la bandeja">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <IdeaModal open={modalOpen} onClose={() => setModalOpen(false)} usuarios={usuarios} idea={editando} onSaved={onSaved} />
      <ConvertirModal open={!!convirtiendo} onClose={() => setConvirtiendo(null)} idea={convirtiendo} usuarios={usuarios} />
    </div>
  );
}
