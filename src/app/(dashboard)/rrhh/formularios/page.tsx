"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { SkeletonCards } from "@/components/Skeleton";
import { Modal } from "@/components/Modal";
import { Copy, Trash2, Files, Lock, Unlock } from "lucide-react";

interface Puesto { id: string; nombre: string; area: string }
interface Formulario {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  aceptaRespuestas: boolean;
  updatedAt: string;
  puestos: { puesto: Puesto }[];
  _count: { respuestas: number };
  pendientesCount: number;
  ultimaRespuesta: string | null;
}

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-800 text-gray-300",
  PUBLICADO: "bg-green-900/30 text-green-300",
  CERRADO: "bg-red-900/30 text-red-300",
};
const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  PUBLICADO: "Publicado",
  CERRADO: "Cerrado",
};

function fecha(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FormulariosListaPage() {
  const router = useRouter();
  const toast = useToast();
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuevo, setShowNuevo] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [saving, setSaving] = useState(false);
  const [aEliminar, setAEliminar] = useState<Formulario | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/rrhh/formularios");
    if (r.status === 401 || r.status === 403) {
      toast.error("No tienes permiso para ver formularios.");
      setLoading(false);
      return;
    }
    const d = await r.json();
    setFormularios(d.formularios ?? []);
    setLoading(false);
  }, [toast]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde API
  useEffect(() => { void load(); }, [load]);

  async function crear() {
    if (!titulo.trim()) return;
    setSaving(true);
    const r = await fetch("/api/rrhh/formularios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: titulo.trim() }),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { toast.error(d.error ?? "Error al crear"); return; }
    setShowNuevo(false);
    setTitulo("");
    router.push(`/organizacion/formularios/${d.formulario.id}`);
  }

  async function duplicar(f: Formulario) {
    const r = await fetch(`/api/rrhh/formularios/${f.id}/duplicar`, { method: "POST" });
    const d = await r.json();
    if (!r.ok) { toast.error(d.error ?? "Error al duplicar"); return; }
    toast.success("Formulario duplicado");
    load();
  }

  async function toggleEstado(f: Formulario) {
    const nuevo = f.estado === "CERRADO" ? "PUBLICADO" : "CERRADO";
    const r = await fetch(`/api/rrhh/formularios/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevo }),
    });
    if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Error"); return; }
    toast.success(nuevo === "CERRADO" ? "Formulario cerrado" : "Formulario reabierto");
    load();
  }

  async function copiarEnlace(f: Formulario) {
    const url = `${window.location.origin}/postular/${f.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    const r = await fetch(`/api/rrhh/formularios/${aEliminar.id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); toast.error(d.error ?? "Error al eliminar"); return; }
    toast.success("Formulario eliminado");
    setAEliminar(null);
    load();
  }

  const inputCls = "w-full bg-[#0d0d0d] border border-[#222] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B] placeholder-gray-600";

  return (
    <div className="ms-page space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ms-h1">Formularios</h1>
          <p className="ms-subtitle">{formularios.length} formulario(s) · Reclutamiento y postulación</p>
        </div>
        <button onClick={() => setShowNuevo(true)} className="ms-btn-primary">
          + Nuevo formulario
        </button>
      </div>

      {loading ? (
        <SkeletonCards count={3} />
      ) : formularios.length === 0 ? (
        <div className="ms-card p-12 text-center">
          <p className="text-gray-400 text-sm mb-4">Aún no hay formularios.</p>
          <button onClick={() => setShowNuevo(true)} className="ms-btn-primary">
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formularios.map(f => (
            <div key={f.id} className="ms-card p-5 hover:border-[#333] transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/organizacion/formularios/${f.id}`} className="block">
                    <p className="text-white font-semibold truncate hover:text-[#B3985B] transition-colors">{f.titulo}</p>
                    <p className="text-gray-600 text-xs mt-0.5">/{f.slug}</p>
                  </Link>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${ESTADO_COLORS[f.estado]}`}>
                  {ESTADO_LABELS[f.estado]}
                </span>
              </div>

              {f.puestos.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {f.puestos.slice(0, 3).map(fp => (
                    <span key={fp.puesto.id} className="text-[10px] bg-[#1a1a1a] text-gray-400 px-2 py-0.5 rounded">
                      {fp.puesto.nombre}
                    </span>
                  ))}
                  {f.puestos.length > 3 && (
                    <span className="text-[10px] text-gray-600">+{f.puestos.length - 3}</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                <div>
                  <p className="text-gray-600">Respuestas</p>
                  <p className="text-white font-medium">{f._count.respuestas}</p>
                </div>
                <div>
                  <p className="text-gray-600">Pendientes</p>
                  <p className="text-[#B3985B] font-medium">{f.pendientesCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Última</p>
                  <p className="text-gray-400 font-medium">{fecha(f.ultimaRespuesta)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#1a1a1a]">
                <Link href={`/organizacion/formularios/${f.id}`} className="text-xs text-[#B3985B] hover:underline">
                  Editar
                </Link>
                <Link href={`/organizacion/formularios/${f.id}?tab=respuestas`} className="text-xs text-gray-400 hover:text-white">
                  Respuestas
                </Link>
                <div className="flex-1" />
                <button onClick={() => copiarEnlace(f)} title="Copiar enlace" className="text-gray-500 hover:text-white">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => duplicar(f)} title="Duplicar" className="text-gray-500 hover:text-white">
                  <Files className="w-4 h-4" />
                </button>
                <button onClick={() => toggleEstado(f)} title={f.estado === "CERRADO" ? "Reabrir" : "Cerrar"} className="text-gray-500 hover:text-white">
                  {f.estado === "CERRADO" ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
                <button onClick={() => setAEliminar(f)} title="Eliminar" className="text-red-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo */}
      <Modal open={showNuevo} onClose={() => setShowNuevo(false)} title="Nuevo formulario" maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Título</label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className={inputCls}
              placeholder="Postulación — Producción"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter" && titulo.trim()) crear(); }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowNuevo(false)} className="text-gray-500 hover:text-white text-sm px-4 py-2">Cancelar</button>
            <button onClick={crear} disabled={saving || !titulo.trim()}
              className="bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold text-sm px-6 py-2 rounded-lg">
              {saving ? "Creando..." : "Crear →"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal open={!!aEliminar} onClose={() => setAEliminar(null)} title="Eliminar formulario" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            ¿Eliminar <span className="text-white font-medium">{aEliminar?.titulo}</span>?
            {aEliminar?._count.respuestas ? (
              <span className="block text-red-400 mt-2">
                Se borrarán también sus {aEliminar._count.respuestas} respuesta(s). Esta acción no se puede deshacer.
              </span>
            ) : null}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setAEliminar(null)} className="text-gray-500 hover:text-white text-sm px-4 py-2">Cancelar</button>
            <button onClick={confirmarEliminar}
              className="bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-200 font-semibold text-sm px-6 py-2 rounded-lg">
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
