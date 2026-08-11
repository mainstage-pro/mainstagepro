"use client";

import { useEffect, useState, useCallback, type DragEvent } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { SkeletonPage } from "@/components/Skeleton";

interface Foto {
  id: string;
  url: string;
  caption: string | null;
  orden: number;
  destacada: boolean;
}

interface Tipo {
  id: string;
  slug: string;
  nombre: string;
  emoji: string | null;
  subtitulo: string | null;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  fotos: Foto[];
}

interface Slide {
  id: string;
  url: string;
  caption: string | null;
  orden: number;
}

export default function TiposEventoConfigPage() {
  const [tipos, setTipos] = useState<Tipo[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/tipos-evento");
    const d = await r.json();
    setTipos(d.tipos ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function crearTipo() {
    if (!nuevoNombre.trim()) return;
    setCreating(true);
    const r = await fetch("/api/tipos-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre.trim(), orden: tipos?.length ?? 0 }),
    });
    setCreating(false);
    if (r.ok) {
      setNuevoNombre("");
      load();
    } else {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? "No se pudo crear");
    }
  }

  if (!tipos) return <SkeletonPage rows={3} cols={2} />;

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/ventas/configuracion" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Configuración · Comercial</Link>
        <h1 className="ms-h1 mt-1">Tipos de evento</h1>
        <p className="text-gray-400 text-sm mt-1">
          Catálogo que categoriza tratos y cotizaciones, y alimenta las galerías y presentaciones con las fotos y descripciones preseleccionadas de cada tipo.
        </p>
      </div>

      {/* Slides del inicio de la galería */}
      <HeroSlidesManager />

      <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider mb-3 mt-8">Tipos de evento</h2>

      {/* Crear nuevo */}
      <div className="ms-card p-4 mb-6 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Nuevo tipo de evento</label>
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") crearTipo(); }}
            placeholder="Ej: Eventos Musicales"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>
        <button
          onClick={crearTipo}
          disabled={creating || !nuevoNombre.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#B3985B] text-black disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {creating ? "Creando…" : "Agregar"}
        </button>
      </div>

      <div className="space-y-4">
        {tipos.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Aún no hay tipos de evento. Crea el primero arriba.</p>
        )}
        {tipos.map((tipo) => (
          <TipoCard key={tipo.id} tipo={tipo} onChange={load} />
        ))}
      </div>

      {/* Tipos de servicio: renta, producción, dirección y operación técnica */}
      <TiposServicioSection />
    </div>
  );
}

// ── Tipos de servicio (renta de equipo, producción/dirección/operación técnica) ─
function TiposServicioSection() {
  const [tipos, setTipos] = useState<Tipo[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/tipos-servicio");
    const d = await r.json();
    setTipos(d.tipos ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function crearTipo() {
    if (!nuevoNombre.trim()) return;
    setCreating(true);
    const r = await fetch("/api/tipos-servicio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre.trim(), orden: tipos?.length ?? 0 }),
    });
    setCreating(false);
    if (r.ok) {
      setNuevoNombre("");
      load();
    } else {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? "No se pudo crear");
    }
  }

  return (
    <div className="mt-12 border-t border-[#1a1a1a] pt-8">
      <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider mb-1">Tipos de servicio</h2>
      <p className="text-gray-400 text-sm mb-5">
        Renta de equipo, producción técnica, dirección técnica y operación técnica. Cárgales fotos y genera la descripción con IA; alimentan las galerías y presentaciones de servicios.
      </p>

      <div className="ms-card p-4 mb-6 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Nuevo tipo de servicio</label>
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") crearTipo(); }}
            placeholder="Ej: Operación técnica"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>
        <button
          onClick={crearTipo}
          disabled={creating || !nuevoNombre.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#B3985B] text-black disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {creating ? "Creando…" : "Agregar"}
        </button>
      </div>

      {tipos === null ? (
        <p className="text-xs text-gray-600 py-3">Cargando…</p>
      ) : (
        <div className="space-y-4">
          {tipos.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">Aún no hay tipos de servicio. Crea el primero arriba.</p>
          )}
          {tipos.map((tipo) => (
            <TipoCard key={tipo.id} tipo={tipo} onChange={load} apiBase="/api/tipos-servicio" aiEnabled />
          ))}
        </div>
      )}
    </div>
  );
}

function TipoCard({
  tipo,
  onChange,
  apiBase = "/api/tipos-evento",
  aiEnabled = false,
}: {
  tipo: Tipo;
  onChange: () => void;
  apiBase?: string;
  aiEnabled?: boolean;
}) {
  const [form, setForm] = useState({
    nombre: tipo.nombre,
    emoji: tipo.emoji ?? "",
    subtitulo: tipo.subtitulo ?? "",
    descripcion: tipo.descripcion ?? "",
    orden: String(tipo.orden),
    activo: tipo.activo,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [fotos, setFotos] = useState<Foto[]>(tipo.fotos);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFotos(tipo.fotos);
  }, [tipo.fotos]);

  function moverFoto(from: number, to: number) {
    if (from === to) return;
    const arr = [...fotos];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    // Calcular los PATCH desde `arr`, que aún conserva el `orden` anterior de
    // cada foto, ANTES de normalizar. Si normalizáramos primero, todos los
    // `orden` ya coincidirían con su índice y no se enviaría ningún PATCH
    // (por eso el cambio de portada no se guardaba al refrescar).
    const patches = arr
      .map((f, i) => ({ id: f.id, orden: i, cambia: f.orden !== i }))
      .filter((p) => p.cambia);
    setFotos(arr.map((f, i) => ({ ...f, orden: i })));
    Promise.all(
      patches.map((p) =>
        fetch(`${apiBase}/fotos/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orden: p.orden }),
        })
      )
    ).catch(() => {});
  }

  async function guardar() {
    setSaving(true);
    setSaved(false);
    const r = await fetch(`${apiBase}/${tipo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre,
        emoji: form.emoji || null,
        subtitulo: form.subtitulo || null,
        descripcion: form.descripcion || null,
        orden: parseInt(form.orden) || 0,
        activo: form.activo,
      }),
    });
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function eliminarTipo() {
    if (!confirm(`¿Eliminar "${tipo.nombre}" y todas sus fotos?`)) return;
    await fetch(`${apiBase}/${tipo.id}`, { method: "DELETE" });
    onChange();
  }

  async function subirFotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: `${apiBase}/imagenes`,
        });
        await fetch(`${apiBase}/${tipo.id}/fotos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url, orden: tipo.fotos.length + i }),
        });
      }
      onChange();
    } catch (err) {
      alert("Error al subir: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  }

  async function generarDescripcion() {
    setGenerando(true);
    try {
      const r = await fetch(`${apiBase}/${tipo.id}/generar-descripcion`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) {
        alert(d.error ?? "No se pudo generar");
        return;
      }
      setForm((f) => ({
        ...f,
        subtitulo: d.subtitulo || f.subtitulo,
        descripcion: d.descripcion || f.descripcion,
      }));
    } catch (err) {
      alert("Error al generar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGenerando(false);
    }
  }

  const destacadas = fotos.filter((f) => f.destacada).length;

  return (
    <div className="ms-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-mono bg-[#1a1a1a] border border-[#333] rounded px-2 py-0.5">{tipo.slug}</span>
          <span>{tipo.fotos.length} fotos · {destacadas} destacadas</span>
        </div>
        <button onClick={eliminarTipo} className="text-xs text-red-500/70 hover:text-red-400 transition-colors">Eliminar</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[3rem_1fr_5rem] gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Emoji</label>
          <input
            value={form.emoji}
            onChange={(e) => setForm({ ...form, emoji: e.target.value })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-[#B3985B]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Nombre</label>
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Orden</label>
          <input
            type="number"
            value={form.orden}
            onChange={(e) => setForm({ ...form, orden: e.target.value })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-[#B3985B]"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Subtítulo (tagline)</label>
        <input
          value={form.subtitulo}
          onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
          placeholder="Conciertos · Festivales · DJ Sets"
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]"
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-gray-400">Descripción / base</label>
          {aiEnabled && (
            <button
              onClick={generarDescripcion}
              disabled={generando}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-[#B3985B]/50 text-[#B3985B] hover:bg-[#B3985B]/10 disabled:opacity-40 transition-colors"
            >
              {generando ? "Generando…" : "✨ Generar con IA"}
            </button>
          )}
        </div>
        <textarea
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          rows={3}
          placeholder="Texto base que describe este servicio para las presentaciones."
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-y"
        />
      </div>

      {/* Fotos */}
      <div className="border-t border-[#1a1a1a] pt-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Fotos de la galería</h3>
          <label className="text-xs px-3 py-1.5 rounded-lg border border-[#333] text-gray-300 hover:border-[#B3985B] cursor-pointer transition-colors">
            {uploading ? "Subiendo…" : "+ Subir fotos"}
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
              onChange={(e) => subirFotos(e.target.files)} />
          </label>
        </div>
        <p className="text-gray-500 text-[11px] mb-3">
          Arrastra para reordenar. La primera es la portada de la categoría. La estrella ★ marca las que alimentan el hero de las presentaciones.
        </p>

        {fotos.length === 0 ? (
          <p className="text-xs text-gray-600 py-3">Sin fotos todavía.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fotos.map((foto, i) => (
              <FotoTile
                key={foto.id}
                foto={foto}
                index={i}
                esPortada={i === 0}
                apiBase={apiBase}
                onChange={onChange}
                onHacerPortada={() => moverFoto(i, 0)}
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdx !== null) moverFoto(dragIdx, i); setDragIdx(null); }}
                dragging={dragIdx === i}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end items-center gap-3 mt-4">
        <label className="flex items-center gap-2 text-xs text-gray-400 mr-auto">
          <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
          Activo
        </label>
        {saved && <span className="text-xs text-green-500">✓ Guardado</span>}
        <button onClick={guardar} disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#B3985B] text-black disabled:opacity-40 hover:opacity-90 transition-opacity">
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function FotoTile({
  foto,
  index,
  esPortada,
  apiBase,
  onChange,
  onHacerPortada,
  onDragStart,
  onDragOver,
  onDrop,
  dragging,
}: {
  foto: Foto;
  index: number;
  esPortada: boolean;
  apiBase: string;
  onChange: () => void;
  onHacerPortada: () => void;
  onDragStart: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: () => void;
  dragging: boolean;
}) {
  const [caption, setCaption] = useState(foto.caption ?? "");

  async function toggleDestacada() {
    await fetch(`${apiBase}/fotos/${foto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destacada: !foto.destacada }),
    });
    onChange();
  }

  async function guardarCaption() {
    if (caption === (foto.caption ?? "")) return;
    await fetch(`${apiBase}/fotos/${foto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: caption || null }),
    });
  }

  async function eliminar() {
    if (!confirm("¿Eliminar esta foto?")) return;
    await fetch(`${apiBase}/fotos/${foto.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="relative rounded-lg overflow-hidden border bg-[#1a1a1a] cursor-grab active:cursor-grabbing"
      style={{ borderColor: esPortada ? "#B3985B" : "#333", opacity: dragging ? 0.4 : 1 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto.url} alt={foto.caption ?? ""} className="w-full aspect-[4/3] object-cover pointer-events-none" />
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
        <span className="text-[9px] font-mono bg-black/60 text-white/80 rounded px-1.5 py-0.5">{index + 1}</span>
        {esPortada ? (
          <span className="text-[9px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ background: "#B3985B", color: "#000" }}>Portada</span>
        ) : (
          <button onClick={onHacerPortada} title="Hacer portada de la categoría"
            className="text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 bg-black/60 text-white/80 hover:text-white">
            Hacer portada
          </button>
        )}
      </div>
      <div className="absolute top-1.5 right-1.5 flex gap-1">
        <button onClick={toggleDestacada}
          title={foto.destacada ? "Quitar del hero de presentaciones" : "Marcar para el hero de presentaciones"}
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{ background: foto.destacada ? "#B3985B" : "rgba(0,0,0,0.6)", color: foto.destacada ? "#000" : "#fff" }}>
          ★
        </button>
        <button onClick={eliminar} title="Eliminar"
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-black/60 text-white hover:bg-red-600/80">
          ×
        </button>
      </div>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={guardarCaption}
        placeholder="Descripción…"
        className="w-full bg-[#111] border-t border-[#333] px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#B3985B]"
      />
    </div>
  );
}

// ── Slides del inicio (hero del carrusel de la galería pública) ────────────────
function HeroSlidesManager() {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/galeria-inicio");
    const d = await r.json();
    setSlides(d.slides ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function subir(files: FileList | null) {
    if (!files || files.length === 0 || !slides) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const blob = await upload(files[i].name, files[i], {
          access: "public",
          handleUploadUrl: "/api/tipos-evento/imagenes",
        });
        await fetch("/api/galeria-inicio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url, orden: slides.length + i }),
        });
      }
      load();
    } catch (err) {
      alert("Error al subir: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  }

  function onDrop(target: number) {
    if (dragIdx === null || dragIdx === target || !slides) { setDragIdx(null); return; }
    const arr = [...slides];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(target, 0, moved);
    // Calcular los PATCH desde `arr` (conserva el `orden` previo) antes de
    // normalizar, o el guard `s.orden === i` cancelaría todos los envíos.
    const patches = arr
      .map((s, i) => ({ id: s.id, orden: i, cambia: s.orden !== i }))
      .filter((p) => p.cambia);
    setSlides(arr.map((s, i) => ({ ...s, orden: i })));
    setDragIdx(null);
    Promise.all(
      patches.map((p) =>
        fetch(`/api/galeria-inicio/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orden: p.orden }),
        })
      )
    ).catch(() => {});
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta slide del inicio?")) return;
    await fetch(`/api/galeria-inicio/${id}`, { method: "DELETE" });
    load();
  }

  async function guardarCaption(id: string, caption: string, prev: string) {
    if (caption === prev) return;
    await fetch(`/api/galeria-inicio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: caption || null }),
    });
  }

  return (
    <div className="ms-card p-5 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-[#B3985B] uppercase tracking-wider">Slides del inicio</h2>
        <label className="text-xs px-3 py-1.5 rounded-lg border border-[#333] text-gray-300 hover:border-[#B3985B] cursor-pointer transition-colors">
          {uploading ? "Subiendo…" : "+ Subir fotos"}
          <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
            onChange={(e) => subir(e.target.files)} />
        </label>
      </div>
      <p className="text-gray-500 text-xs mb-4">
        Fotos que rotan como carrusel al inicio de la galería pública. Arrastra para reordenar; la primera es la que se ve primero.
      </p>

      {slides === null ? (
        <p className="text-xs text-gray-600 py-3">Cargando…</p>
      ) : slides.length === 0 ? (
        <p className="text-xs text-gray-600 py-3">Sin slides. Si no hay ninguna, el inicio usa la portada del primer tipo de evento.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {slides.map((s, i) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className="relative rounded-lg overflow-hidden border border-[#333] bg-[#1a1a1a] cursor-grab active:cursor-grabbing"
              style={{ opacity: dragIdx === i ? 0.4 : 1 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt={s.caption ?? ""} className="w-full aspect-[16/9] object-cover pointer-events-none" />
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                <span className="text-[9px] font-mono bg-black/60 text-white/80 rounded px-1.5 py-0.5">{i + 1}</span>
                {i === 0 && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ background: "#B3985B", color: "#000" }}>Primera</span>
                )}
              </div>
              <button onClick={() => eliminar(s.id)} title="Eliminar"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs bg-black/60 text-white hover:bg-red-600/80">
                ×
              </button>
              <input
                defaultValue={s.caption ?? ""}
                onBlur={(e) => guardarCaption(s.id, e.target.value, s.caption ?? "")}
                placeholder="Texto opcional…"
                className="w-full bg-[#111] border-t border-[#333] px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#B3985B]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
