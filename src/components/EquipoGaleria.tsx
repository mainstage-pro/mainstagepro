"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";

export type GaleriaFoto = { url: string; nombre: string; uso: "INTERNO" | "EXTERNO" };

export function parseGaleria(raw: string | null | undefined): GaleriaFoto[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item): GaleriaFoto | null => {
        if (typeof item === "string") return { url: item, nombre: "", uso: "EXTERNO" };
        if (item && typeof item === "object" && typeof item.url === "string") {
          return {
            url: item.url,
            nombre: typeof item.nombre === "string" ? item.nombre : "",
            uso: item.uso === "INTERNO" ? "INTERNO" : "EXTERNO",
          };
        }
        return null;
      })
      .filter((f): f is GaleriaFoto => f !== null);
  } catch {
    return [];
  }
}

export function EquipoGaleria({ equipoId, initial }: { equipoId: string; initial?: string | null }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [fotos, setFotos] = useState<GaleriaFoto[]>(() => parseGaleria(initial));
  const [subiendo, setSubiendo] = useState(false);
  const [lightbox, setLightbox] = useState<GaleriaFoto | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Si no recibimos las fotos como prop, las cargamos por equipoId
  useEffect(() => {
    if (initial !== undefined) return;
    let cancel = false;
    fetch(`/api/equipos/${equipoId}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (!cancel) setFotos(parseGaleria(d.equipo?.imagenesUrls)); })
      .catch(() => {});
    return () => { cancel = true; };
  }, [equipoId, initial]);

  async function persistir(next: GaleriaFoto[]) {
    const r = await fetch(`/api/equipos/${equipoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagenesUrls: JSON.stringify(next) }),
    });
    if (!r.ok) { toast.error("Error al guardar la galería"); return false; }
    return true;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setSubiendo(true);
    const nuevas: GaleriaFoto[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const blob = await upload(`inventario/galeria/${equipoId}/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload/token",
        });
        nuevas.push({ url: blob.url, nombre: file.name, uso: "EXTERNO" });
      }
      if (nuevas.length === 0) { setSubiendo(false); return; }
      const next = [...fotos, ...nuevas];
      const ok = await persistir(next);
      if (ok) { setFotos(next); toast.success(`${nuevas.length} foto(s) agregada(s)`); }
    } catch (e) {
      toast.error((e as Error).message || "Error al subir");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function eliminar(url: string) {
    const ok = await confirm({ title: "Eliminar foto", message: "¿Quitar esta foto de la galería?", confirmText: "Eliminar", danger: true });
    if (!ok) return;
    const next = fotos.filter(f => f.url !== url);
    const prev = fotos;
    setFotos(next);
    if (!(await persistir(next))) setFotos(prev);
  }

  async function toggleUso(url: string) {
    const next = fotos.map(f => f.url === url ? { ...f, uso: f.uso === "EXTERNO" ? "INTERNO" as const : "EXTERNO" as const } : f);
    const prev = fotos;
    setFotos(next);
    if (!(await persistir(next))) setFotos(prev);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">
            Galería {fotos.length > 0 && <span className="text-[#555] font-normal">({fotos.length})</span>}
          </h2>
          <p className="text-[10px] text-[#555] mt-1">Fotos del equipo en eventos · <span className="text-emerald-500">Externo</span> = cotizaciones/presentaciones · <span className="text-sky-500">Interno</span> = montaje</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="px-3 py-1.5 bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-40 text-black text-xs font-semibold rounded-lg transition-colors shrink-0"
        >
          {subiendo ? "Subiendo…" : "+ Agregar fotos"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {fotos.length === 0 ? (
        <p className="text-[#333] text-xs text-center py-6">Aún no hay fotos en la galería de este equipo</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fotos.map(f => (
            <div key={f.url} className="group relative rounded-lg overflow-hidden bg-[#0a0a0a] border border-[#1a1a1a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.url}
                alt={f.nombre}
                className="w-full aspect-square object-cover cursor-pointer"
                onClick={() => setLightbox(f)}
              />
              <button
                type="button"
                onClick={() => toggleUso(f.url)}
                title="Cambiar uso (interno / externo)"
                className={`absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${f.uso === "EXTERNO" ? "bg-emerald-900/70 text-emerald-300" : "bg-sky-900/70 text-sky-300"}`}
              >
                {f.uso === "EXTERNO" ? "Externo" : "Interno"}
              </button>
              <button
                type="button"
                onClick={() => eliminar(f.url)}
                title="Eliminar foto"
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-red-600 text-white rounded p-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.url} alt={lightbox.nombre} className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 rounded-full p-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
