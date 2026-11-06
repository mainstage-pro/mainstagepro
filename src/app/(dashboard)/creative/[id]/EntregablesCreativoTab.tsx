"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";
import { FileImage, FileText, Ruler, File as FileIcon, ChevronDown, UploadCloud } from "lucide-react";

export interface Entregable {
  id: string;
  tipo: string;
  version: number;
  nombre: string;
  url: string;
  notas: string | null;
  subidoPor: string | null;
  createdAt: string;
}

const TIPOS = ["RENDER", "DOCUMENTACION_TECNICA", "PLOT", "OTRO"] as const;
const TIPO_LABEL: Record<string, string> = {
  RENDER: "Render",
  DOCUMENTACION_TECNICA: "Documentación técnica",
  PLOT: "Plot",
  OTRO: "Otro",
};
const TIPO_ICON: Record<string, typeof FileImage> = {
  RENDER: FileImage,
  DOCUMENTACION_TECNICA: FileText,
  PLOT: Ruler,
  OTRO: FileIcon,
};

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Entregables versionados del proyecto creativo (renders/plots/documentación
 * técnica). Versionado simple: una lista de versiones por tipo, sin
 * comentarios ni aprobación por versión — subir una versión nueva nunca
 * sobreescribe la anterior.
 */
export default function EntregablesCreativoTab({ proyectoCreativoId }: { proyectoCreativoId: string }) {
  const [entregables, setEntregables] = useState<Entregable[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoSubida, setTipoSubida] = useState<string>("RENDER");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const refrescar = useCallback(async () => {
    const res = await fetch(`/api/proyectos-creativos/${proyectoCreativoId}/entregables`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setEntregables(d.entregables ?? []);
    }
    setLoading(false);
  }, [proyectoCreativoId]);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  const porTipo = useMemo(() => {
    const grupos = new Map<string, Entregable[]>();
    for (const e of entregables) {
      const lista = grupos.get(e.tipo) ?? [];
      lista.push(e);
      grupos.set(e.tipo, lista);
    }
    for (const lista of grupos.values()) lista.sort((a, b) => b.version - a.version);
    return grupos;
  }, [entregables]);

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendo(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const blob = await upload(
        `creative/${proyectoCreativoId}/${tipoSubida.toLowerCase()}-${Date.now()}.${ext}`,
        file,
        { access: "public", handleUploadUrl: "/api/upload/token" },
      );

      const res = await fetch(`/api/proyectos-creativos/${proyectoCreativoId}/entregables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, tipo: tipoSubida, nombre: file.name }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo registrar el entregable");
      }
      await refrescar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo");
    } finally {
      setSubiendo(false);
    }
  }

  function toggle(tipo: string) {
    setExpandidos((prev) => {
      const n = new Set(prev);
      if (n.has(tipo)) n.delete(tipo);
      else n.add(tipo);
      return n;
    });
  }

  if (loading) return <p className="text-[#444] text-sm">Cargando…</p>;

  return (
    <div className="space-y-3">
      <div className="ms-card p-4 flex flex-wrap items-center gap-3">
        <select
          value={tipoSubida}
          onChange={(e) => setTipoSubida(e.target.value)}
          className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[12.5px] text-white focus:outline-none focus:border-[#B3985B]/50"
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>{TIPO_LABEL[t]}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-[#888] hover:text-[#B3985B] hover:border-[#B3985B]/30 transition-all text-[12.5px] font-medium cursor-pointer">
          <UploadCloud strokeWidth={1.75} className="w-4 h-4" />
          {subiendo ? "Subiendo…" : "Subir nueva versión"}
          <input type="file" className="hidden" disabled={subiendo} onChange={subir} />
        </label>
        {error && <span className="text-[11.5px] text-red-400">{error}</span>}
      </div>

      {entregables.length === 0 ? (
        <div className="ms-card rounded-2xl p-6 text-center text-gray-500">
          <p className="text-sm">Todavía no hay entregables subidos. Elige el tipo y sube el primer archivo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {TIPOS.filter((t) => porTipo.has(t)).map((tipo) => {
            const versiones = porTipo.get(tipo) ?? [];
            const [ultima, ...anteriores] = versiones;
            const Icon = TIPO_ICON[tipo];
            const abierto = expandidos.has(tipo);
            return (
              <div key={tipo} className="ms-card overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="w-8 h-8 rounded-lg bg-[#B3985B]/15 flex items-center justify-center shrink-0">
                    <Icon strokeWidth={1.75} className="w-4 h-4 text-[#B3985B]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white font-medium">{TIPO_LABEL[tipo]} · v{ultima.version}</p>
                    <a
                      href={ultima.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-[#B3985B] hover:underline truncate block"
                    >
                      {ultima.nombre}
                    </a>
                    <p className="text-[11px] text-gray-500 mt-0.5">{fechaCorta(ultima.createdAt)}</p>
                  </div>
                  {anteriores.length > 0 && (
                    <button
                      onClick={() => toggle(tipo)}
                      className="shrink-0 flex items-center gap-1 text-[11px] text-[#555] hover:text-white transition-colors"
                    >
                      {anteriores.length} versión{anteriores.length !== 1 ? "es" : ""} anterior{anteriores.length !== 1 ? "es" : ""}
                      <ChevronDown strokeWidth={2} className={`w-3.5 h-3.5 transition-transform ${abierto ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
                {abierto && anteriores.length > 0 && (
                  <div className="border-t border-[#141414] divide-y divide-[#141414]">
                    {anteriores.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-2.5 pl-[3.25rem]">
                        <div className="flex-1 min-w-0">
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-gray-400 hover:text-[#B3985B] hover:underline truncate block"
                          >
                            v{v.version} · {v.nombre}
                          </a>
                        </div>
                        <span className="text-[11px] text-gray-600 shrink-0">{fechaCorta(v.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
