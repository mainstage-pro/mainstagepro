"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { coincide } from "@/lib/buscar";
import { Mic2, AtSign, Globe, Phone, Mail } from "lucide-react";

interface Artista {
  id: string;
  nombre: string;
  genero: string | null;
  origen: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  instagram: string | null;
  sitioWeb: string | null;
  notas: string | null;
  activo: boolean;
  _count?: { tratos: number; proyectos: number };
}

type FormData = {
  nombre: string; genero: string; origen: string;
  contactoNombre: string; contactoTelefono: string; contactoEmail: string;
  instagram: string; sitioWeb: string; notas: string;
};

const FORM_DEFAULTS: FormData = {
  nombre: "", genero: "", origen: "",
  contactoNombre: "", contactoTelefono: "", contactoEmail: "",
  instagram: "", sitioWeb: "", notas: "",
};

const CAMPO = "w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]";

export default function ArtistasPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Artista | null>(null);
  const [form, setForm] = useState<FormData>(FORM_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/artistas?conUso=1").then(r => r.json()).then(d => {
      setArtistas(d.artistas ?? []);
      setLoading(false);
    });
  }, []);

  function openNew() {
    setEditing(null);
    setForm(FORM_DEFAULTS);
    setShowForm(true);
  }

  function openEdit(a: Artista) {
    setEditing(a);
    setForm({
      nombre: a.nombre ?? "",
      genero: a.genero ?? "",
      origen: a.origen ?? "",
      contactoNombre: a.contactoNombre ?? "",
      contactoTelefono: a.contactoTelefono ?? "",
      contactoEmail: a.contactoEmail ?? "",
      instagram: a.instagram ?? "",
      sitioWeb: a.sitioWeb ?? "",
      notas: a.notas ?? "",
    });
    setShowForm(true);
  }

  async function guardar() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    const payload = { ...form, nombre: form.nombre.trim() };
    const res = editing
      ? await fetch(`/api/artistas/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/artistas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al guardar");
      setSaving(false);
      return;
    }
    const d = await res.json();
    setArtistas(prev => editing
      ? prev.map(a => (a.id === editing.id ? { ...a, ...d.artista } : a))
      : [...prev, d.artista]);
    if (d.yaExistia) toast.success("Ese artista ya estaba en el catálogo.");
    setShowForm(false);
    setSaving(false);
  }

  async function eliminar(a: Artista) {
    if (!await confirm({ message: `¿Dar de baja a ${a.nombre}? Los tratos que ya lo usan lo conservan.`, danger: true, confirmText: "Dar de baja" })) return;
    const res = await fetch(`/api/artistas/${a.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al dar de baja"); return; }
    setArtistas(prev => prev.filter(x => x.id !== a.id));
  }

  const usos = (a: Artista) => (a._count ? a._count.tratos + a._count.proyectos : 0);
  const filtered = artistas
    .filter(a => coincide(search, a.nombre, a.genero, a.origen))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  if (loading) return <div className="text-gray-400 text-sm">Cargando...</div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ms-h1">Artistas</h1>
          <p className="text-gray-400 text-sm mt-0.5">Catálogo de artistas y su contacto de booking</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 bg-[#B3985B] text-black font-semibold rounded-lg text-sm hover:bg-[#c9a96a] transition-colors">
          + Nuevo artista
        </button>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre, género u origen..."
        className="w-full ms-card px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Mic2 strokeWidth={1.75} className="w-10 h-10 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-sm">{search ? "Sin resultados" : "Sin artistas registrados"}</p>
          {!search && <button onClick={openNew} className="mt-4 text-[#B3985B] text-sm hover:underline">Agregar el primero →</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="ms-table-wrapper p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-base">{a.nombre}</p>
                  {(a.genero || a.origen) && (
                    <p className="text-gray-400 text-xs mt-0.5">{[a.genero, a.origen].filter(Boolean).join(" · ")}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {a.contactoNombre && <span className="text-gray-400 text-xs">{a.contactoNombre}</span>}
                    {a.contactoTelefono && (
                      <span className="inline-flex items-center gap-1.5 text-gray-400 text-xs"><Phone strokeWidth={1.75} className="w-3.5 h-3.5" />{a.contactoTelefono}</span>
                    )}
                    {a.contactoEmail && (
                      <span className="inline-flex items-center gap-1.5 text-gray-400 text-xs"><Mail strokeWidth={1.75} className="w-3.5 h-3.5" />{a.contactoEmail}</span>
                    )}
                    {a.instagram && (
                      <span className="inline-flex items-center gap-1.5 text-gray-400 text-xs"><AtSign strokeWidth={1.75} className="w-3.5 h-3.5" />{a.instagram}</span>
                    )}
                    {a.sitioWeb && (
                      <a href={a.sitioWeb} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#B3985B] text-xs hover:underline">
                        <Globe strokeWidth={1.75} className="w-3.5 h-3.5" />Sitio
                      </a>
                    )}
                  </div>
                  {a.notas && <p className="text-gray-500 text-xs mt-2 leading-relaxed">{a.notas}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {usos(a) > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#B3985B]/15 text-[#B3985B] font-medium">
                      {usos(a)} {usos(a) === 1 ? "evento" : "eventos"}
                    </span>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(a)} className="text-xs text-[#B3985B] hover:underline">Editar</button>
                    <button onClick={() => eliminar(a)} className="text-xs text-red-500 hover:underline">Dar de baja</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="ms-card rounded-2xl w-full max-w-xl my-6">
            <div className="flex items-center justify-between p-5 border-b border-[#222]">
              <h2 className="text-white font-semibold">{editing ? "Editar artista" : "Nuevo artista"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre del artista *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} className={CAMPO} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Género</label>
                  <input value={form.genero} onChange={e => setForm(p => ({ ...p, genero: e.target.value }))} placeholder="Banda, pop, electrónica…" className={CAMPO} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Origen</label>
                  <input value={form.origen} onChange={e => setForm(p => ({ ...p, origen: e.target.value }))} placeholder="Querétaro, MX" className={CAMPO} />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Booking / management</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Contacto</label>
                  <input value={form.contactoNombre} onChange={e => setForm(p => ({ ...p, contactoNombre: e.target.value }))} className={CAMPO} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Teléfono</label>
                  <input value={form.contactoTelefono} onChange={e => setForm(p => ({ ...p, contactoTelefono: e.target.value }))} className={CAMPO} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Email</label>
                  <input value={form.contactoEmail} onChange={e => setForm(p => ({ ...p, contactoEmail: e.target.value }))} className={CAMPO} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Instagram</label>
                  <input value={form.instagram} onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))} placeholder="@artista" className={CAMPO} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Sitio web</label>
                  <input value={form.sitioWeb} onChange={e => setForm(p => ({ ...p, sitioWeb: e.target.value }))} placeholder="https://…" className={CAMPO} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Notas internas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={3}
                  placeholder="Rider particular, experiencias previas…"
                  className={`${CAMPO} resize-none`} />
              </div>
            </div>
            <div className="p-5 border-t border-[#222] flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving || !form.nombre.trim()}
                className="flex-1 py-2.5 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-60 transition-colors">
                {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear artista"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
