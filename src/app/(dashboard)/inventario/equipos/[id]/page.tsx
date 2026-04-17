"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Equipo = {
  id: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  tipo: string;
  estado: string;
  precioRenta: number;
  costoProveedor: number | null;
  cantidadTotal: number;
  notas: string | null;
  activo: boolean;
  amperajeRequerido: number | null;
  voltajeRequerido: number | null;
  imagenUrl: string | null;
  imagenesUrls: string | null;
  categoria: { id: string; nombre: string };
  proveedorDefault: { id: string; nombre: string; correo: string | null; telefono: string | null } | null;
  mantenimientos: Array<{
    id: string; fecha: string; tipo: string;
    accionRealizada: string; estadoEquipo: string;
    comentarios: string | null; proximoMantenimiento: string | null;
  }>;
  proyectoEquipos: Array<{
    id: string;
    proyecto: {
      id: string; nombre: string; numeroProyecto: number;
      fechaEvento: string | null; estado: string;
      cliente: { nombre: string };
    };
  }>;
};

function fmt(n: number) {
  if (n === 0) return "INCLUYE";
  return `$${n.toLocaleString("es-MX")}`;
}

async function compressImage(file: File, maxPx = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function EquipoFichaPage() {
  const { id } = useParams<{ id: string }>();
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileMainRef = useRef<HTMLInputElement>(null);
  const fileExtraRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/equipos/${id}`);
    const data = await res.json();
    setEquipo(data.equipo ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleMainFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await compressImage(file);
      await fetch(`/api/equipos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenUrl: base64 }),
      });
      await load();
    } finally {
      setUploading(false);
      if (fileMainRef.current) fileMainRef.current.value = "";
    }
  }

  async function handleExtraFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !equipo) return;
    setUploading(true);
    try {
      const base64 = await compressImage(file);
      const existing: string[] = equipo.imagenesUrls ? JSON.parse(equipo.imagenesUrls) : [];
      await fetch(`/api/equipos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenesUrls: JSON.stringify([...existing, base64]) }),
      });
      await load();
    } finally {
      setUploading(false);
      if (fileExtraRef.current) fileExtraRef.current.value = "";
    }
  }

  async function removeExtra(index: number) {
    if (!equipo) return;
    const existing: string[] = equipo.imagenesUrls ? JSON.parse(equipo.imagenesUrls) : [];
    const filtered = existing.filter((_, i) => i !== index);
    await fetch(`/api/equipos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagenesUrls: filtered.length ? JSON.stringify(filtered) : null }),
    });
    await load();
  }

  async function removePrimary() {
    if (!equipo) return;
    const extras: string[] = equipo.imagenesUrls ? JSON.parse(equipo.imagenesUrls) : [];
    const newPrimary = extras[0] ?? null;
    const newExtras = extras.length > 1 ? JSON.stringify(extras.slice(1)) : null;
    await fetch(`/api/equipos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagenUrl: newPrimary, imagenesUrls: newExtras }),
    });
    await load();
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-[#1a1a1a] rounded w-48" />
          <div className="h-7 bg-[#1a1a1a] rounded w-96" />
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="h-64 bg-[#1a1a1a] rounded-xl" />
            <div className="h-64 bg-[#1a1a1a] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center space-y-3">
        <p className="text-[#6b7280]">Equipo no encontrado.</p>
        <Link href="/inventario/equipos" className="text-[#B3985B] text-sm hover:underline">← Volver al inventario</Link>
      </div>
    );
  }

  const extras: string[] = equipo.imagenesUrls ? JSON.parse(equipo.imagenesUrls) : [];

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/inventario/equipos" className="text-xs text-[#6b7280] hover:text-[#B3985B] transition-colors mb-1.5 inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Inventario de equipos
          </Link>
          <h1 className="text-xl font-semibold text-white">{equipo.descripcion}</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
            {[equipo.marca, equipo.modelo].filter(Boolean).length > 0 && " · "}
            {equipo.categoria.nombre}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded font-medium ${equipo.activo ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
            {equipo.activo ? "ACTIVO" : "INACTIVO"}
          </span>
          <span className="text-xs px-2 py-1 rounded bg-[#1a1a1a] text-[#6b7280] border border-[#222]">
            {equipo.tipo === "PROPIO" ? "Propio" : "Externo"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Imágenes ── */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Imágenes del equipo</h2>

          {/* Imagen principal */}
          <div>
            {equipo.imagenUrl ? (
              <div
                className="w-full aspect-video bg-[#0a0a0a] rounded-lg overflow-hidden flex items-center justify-center cursor-zoom-in mb-3"
                onClick={() => setLightbox(equipo.imagenUrl!)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={equipo.imagenUrl}
                  alt={equipo.descripcion}
                  className={`max-h-full max-w-full object-contain transition-opacity ${uploading ? "opacity-40" : ""}`}
                />
              </div>
            ) : (
              <div className="w-full aspect-video bg-[#0a0a0a] rounded-lg border-2 border-dashed border-[#222] flex flex-col items-center justify-center gap-3 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-icon.png" alt="" className="w-16 h-16 object-contain opacity-10" />
                <p className="text-[#444] text-sm">Sin imagen principal</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input ref={fileMainRef} type="file" accept="image/*" className="hidden" onChange={handleMainFile} />
              <button
                onClick={() => fileMainRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold px-3 py-2 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploading ? "Subiendo..." : equipo.imagenUrl ? "Cambiar imagen principal" : "Subir imagen principal"}
              </button>
              {equipo.imagenUrl && !uploading && (
                <button
                  onClick={removePrimary}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-700/60 px-2.5 py-2 rounded-lg transition-colors"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          {/* Imágenes adicionales */}
          <div>
            <p className="text-xs text-[#555] mb-2">
              Imágenes adicionales{extras.length > 0 ? ` (${extras.length})` : ""}
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              {extras.map((url, i) => (
                <div key={i} className="relative group/thumb">
                  <div
                    className="w-16 h-16 bg-[#0a0a0a] rounded-lg border border-[#222] overflow-hidden flex items-center justify-center cursor-zoom-in"
                    onClick={() => setLightbox(url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                  <button
                    onClick={() => removeExtra(i)}
                    className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity leading-none"
                  >✕</button>
                </div>
              ))}

              {/* Agregar extra */}
              <label className="w-16 h-16 bg-[#0a0a0a] rounded-lg border border-dashed border-[#2a2a2a] hover:border-[#B3985B]/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <span className="text-[#444] text-xl leading-none">+</span>
                <span className="text-[9px] text-[#444] mt-0.5">Agregar</span>
                <input ref={fileExtraRef} type="file" accept="image/*" className="hidden" onChange={handleExtraFile} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>

        {/* ── Info técnica ── */}
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-3">Datos del equipo</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#6b7280]">Precio al cliente</dt>
                <dd className="text-white font-medium">{fmt(equipo.precioRenta)}</dd>
              </div>
              {equipo.tipo === "EXTERNO" && equipo.costoProveedor != null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6b7280]">Costo proveedor</dt>
                  <dd className="text-white">{fmt(equipo.costoProveedor)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-[#6b7280]">Cantidad en inventario</dt>
                <dd className="text-white">{equipo.cantidadTotal}</dd>
              </div>
              {(equipo.amperajeRequerido != null || equipo.voltajeRequerido != null) && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#6b7280]">Requerimientos eléctricos</dt>
                  <dd className="text-yellow-400 text-xs">
                    {equipo.amperajeRequerido != null ? `${equipo.amperajeRequerido}A` : ""}
                    {equipo.amperajeRequerido != null && equipo.voltajeRequerido != null ? " · " : ""}
                    {equipo.voltajeRequerido != null ? `${equipo.voltajeRequerido}V` : ""}
                  </dd>
                </div>
              )}
              {equipo.notas && (
                <div className="pt-2 border-t border-[#1a1a1a]">
                  <dt className="text-[#6b7280] text-xs mb-1">Notas internas</dt>
                  <dd className="text-[#9ca3af] text-xs leading-relaxed">{equipo.notas}</dd>
                </div>
              )}
              {equipo.proveedorDefault && (
                <div className="pt-2 border-t border-[#1a1a1a]">
                  <dt className="text-[#6b7280] text-xs mb-1">Proveedor</dt>
                  <dd className="text-white text-xs">{equipo.proveedorDefault.nombre}</dd>
                  {equipo.proveedorDefault.telefono && (
                    <dd className="text-[#6b7280] text-xs mt-0.5">{equipo.proveedorDefault.telefono}</dd>
                  )}
                </div>
              )}
            </dl>
          </div>

          {/* Últimos proyectos */}
          {equipo.proyectoEquipos.length > 0 && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
              <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-3">
                Últimos proyectos ({equipo.proyectoEquipos.length})
              </h2>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {equipo.proyectoEquipos.slice(0, 12).map(pe => (
                  <Link
                    key={pe.id}
                    href={`/proyectos/${pe.proyecto.id}`}
                    className="flex items-center justify-between text-xs p-2 rounded bg-[#0d0d0d] hover:bg-[#1a1a1a] transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-white group-hover:text-[#B3985B] transition-colors truncate">
                        #{pe.proyecto.numeroProyecto} — {pe.proyecto.nombre}
                      </p>
                      <p className="text-[#555] truncate">{pe.proyecto.cliente.nombre}</p>
                    </div>
                    {pe.proyecto.fechaEvento && (
                      <span className="text-[#555] shrink-0 ml-3">
                        {new Date(pe.proyecto.fechaEvento).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "2-digit" })}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historial de mantenimiento */}
      {equipo.mantenimientos.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <h2 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider mb-3">
            Historial de mantenimiento ({equipo.mantenimientos.length})
          </h2>
          <div className="space-y-2">
            {equipo.mantenimientos.map(m => (
              <div key={m.id} className="flex items-start gap-4 text-xs p-3 bg-[#0d0d0d] rounded-lg">
                <div className="shrink-0 text-[#555] w-20 pt-0.5">
                  {new Date(m.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white">{m.accionRealizada}</p>
                  {m.comentarios && <p className="text-[#6b7280] mt-0.5">{m.comentarios}</p>}
                  {m.proximoMantenimiento && (
                    <p className="text-yellow-600/70 mt-0.5">
                      Próximo: {new Date(m.proximoMantenimiento).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" })}
                    </p>
                  )}
                </div>
                <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#6b7280] text-[10px]">{m.tipo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 text-white text-xl bg-black/60 hover:bg-black/90 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          >✕</button>
        </div>
      )}
    </div>
  );
}
