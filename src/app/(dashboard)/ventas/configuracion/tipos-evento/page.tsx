"use client";

import { useEffect, useState, useCallback } from "react";
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
    </div>
  );
}

function TipoCard({ tipo, onChange }: { tipo: Tipo; onChange: () => void }) {
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

  async function guardar() {
    setSaving(true);
    setSaved(false);
    const r = await fetch(`/api/tipos-evento/${tipo.id}`, {
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
    await fetch(`/api/tipos-evento/${tipo.id}`, { method: "DELETE" });
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
          handleUploadUrl: "/api/tipos-evento/imagenes",
        });
        await fetch(`/api/tipos-evento/${tipo.id}/fotos`, {
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

  const destacadas = tipo.fotos.filter((f) => f.destacada).length;

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
        <label className="block text-xs text-gray-400 mb-1">Descripción / base</label>
        <textarea
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          rows={3}
          placeholder="Texto base que describe este tipo de evento para las presentaciones."
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-y"
        />
      </div>

      {/* Fotos */}
      <div className="border-t border-[#1a1a1a] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#B3985B] uppercase tracking-wider">Fotos preseleccionadas</h3>
          <label className="text-xs px-3 py-1.5 rounded-lg border border-[#333] text-gray-300 hover:border-[#B3985B] cursor-pointer transition-colors">
            {uploading ? "Subiendo…" : "+ Subir fotos"}
            <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
              onChange={(e) => subirFotos(e.target.files)} />
          </label>
        </div>

        {tipo.fotos.length === 0 ? (
          <p className="text-xs text-gray-600 py-3">Sin fotos todavía.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tipo.fotos.map((foto) => (
              <FotoTile key={foto.id} foto={foto} onChange={onChange} />
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

function FotoTile({ foto, onChange }: { foto: Foto; onChange: () => void }) {
  const [caption, setCaption] = useState(foto.caption ?? "");

  async function toggleDestacada() {
    await fetch(`/api/tipos-evento/fotos/${foto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destacada: !foto.destacada }),
    });
    onChange();
  }

  async function guardarCaption() {
    if (caption === (foto.caption ?? "")) return;
    await fetch(`/api/tipos-evento/fotos/${foto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: caption || null }),
    });
  }

  async function eliminar() {
    if (!confirm("¿Eliminar esta foto?")) return;
    await fetch(`/api/tipos-evento/fotos/${foto.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-[#333] bg-[#1a1a1a]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto.url} alt={foto.caption ?? ""} className="w-full aspect-[4/3] object-cover" />
      <div className="absolute top-1.5 right-1.5 flex gap-1">
        <button onClick={toggleDestacada}
          title={foto.destacada ? "Quitar de destacadas" : "Marcar como destacada"}
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
