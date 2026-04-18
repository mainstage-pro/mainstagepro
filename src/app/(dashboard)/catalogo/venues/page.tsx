"use client";

import { useEffect, useState, useRef } from "react";

interface Venue {
  id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  contacto: string | null;
  telefonoContacto: string | null;
  emailContacto: string | null;
  capacidadPersonas: number | null;
  largoM: number | null;
  anchoM: number | null;
  alturaMaximaM: number | null;
  accesoVehicular: string | null;
  puntoDescarga: string | null;
  voltajeDisponible: string | null;
  amperajeTotal: number | null;
  fases: string | null;
  ubicacionTablero: string | null;
  restriccionDecibeles: string | null;
  restriccionHorario: string | null;
  restriccionInstalacion: string | null;
  tiposEvento: string | null;
  calificacion: number | null;
  notas: string | null;
  fotoPortada: string | null;
  activo: boolean;
}

const FORM_EMPTY: Omit<Venue, "id" | "activo"> = {
  nombre: "", direccion: null, ciudad: null, contacto: null,
  telefonoContacto: null, emailContacto: null, capacidadPersonas: null,
  largoM: null, anchoM: null, alturaMaximaM: null,
  accesoVehicular: null, puntoDescarga: null,
  voltajeDisponible: null, amperajeTotal: null, fases: null, ubicacionTablero: null,
  restriccionDecibeles: null, restriccionHorario: null, restriccionInstalacion: null,
  tiposEvento: null, calificacion: null, notas: null, fotoPortada: null,
};

type FormData = {
  nombre: string; direccion: string; ciudad: string; contacto: string;
  telefonoContacto: string; emailContacto: string; capacidadPersonas: string;
  largoM: string; anchoM: string; alturaMaximaM: string;
  accesoVehicular: string; puntoDescarga: string;
  voltajeDisponible: string; amperajeTotal: string; fases: string; ubicacionTablero: string;
  restriccionDecibeles: string; restriccionHorario: string; restriccionInstalacion: string;
  tiposEvento: string[]; calificacion: string; notas: string; fotoPortada: string;
};

const FORM_DEFAULTS: FormData = {
  nombre: "", direccion: "", ciudad: "", contacto: "",
  telefonoContacto: "", emailContacto: "", capacidadPersonas: "",
  largoM: "", anchoM: "", alturaMaximaM: "",
  accesoVehicular: "", puntoDescarga: "",
  voltajeDisponible: "", amperajeTotal: "", fases: "", ubicacionTablero: "",
  restriccionDecibeles: "", restriccionHorario: "", restriccionInstalacion: "",
  tiposEvento: [], calificacion: "", notas: "", fotoPortada: "",
};

const TIPOS_EVENTO = [
  { id: "MUSICAL", label: "Musical" },
  { id: "SOCIAL", label: "Social" },
  { id: "EMPRESARIAL", label: "Empresarial" },
];

async function comprimirImagen(file: File, maxW = 1200, quality = 0.75): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Venue | null>(null);
  const [form, setForm] = useState<FormData>(FORM_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const currentEditId = useRef<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historialVenue, setHistorialVenue] = useState<Record<string, {id:string;nombre:string;numeroProyecto:string;fechaEvento:string|null;estado:string;cliente:{nombre:string}}[]>>({});

  useEffect(() => {
    fetch("/api/venues").then(r => r.json()).then(d => {
      setVenues(d.venues ?? []);
      setLoading(false);
    });
  }, []);

  function venueToForm(v: Venue): FormData {
    return {
      nombre: v.nombre ?? "",
      direccion: v.direccion ?? "",
      ciudad: v.ciudad ?? "",
      contacto: v.contacto ?? "",
      telefonoContacto: v.telefonoContacto ?? "",
      emailContacto: v.emailContacto ?? "",
      capacidadPersonas: v.capacidadPersonas?.toString() ?? "",
      largoM: v.largoM?.toString() ?? "",
      anchoM: v.anchoM?.toString() ?? "",
      alturaMaximaM: v.alturaMaximaM?.toString() ?? "",
      accesoVehicular: v.accesoVehicular ?? "",
      puntoDescarga: v.puntoDescarga ?? "",
      voltajeDisponible: v.voltajeDisponible ?? "",
      amperajeTotal: v.amperajeTotal?.toString() ?? "",
      fases: v.fases ?? "",
      ubicacionTablero: v.ubicacionTablero ?? "",
      restriccionDecibeles: v.restriccionDecibeles ?? "",
      restriccionHorario: v.restriccionHorario ?? "",
      restriccionInstalacion: v.restriccionInstalacion ?? "",
      tiposEvento: v.tiposEvento ? JSON.parse(v.tiposEvento) : [],
      calificacion: v.calificacion?.toString() ?? "",
      notas: v.notas ?? "",
      fotoPortada: v.fotoPortada ?? "",
    };
  }

  // Auto-save when editing existing venue
  useEffect(() => {
    if (!editing || editing.id !== currentEditId.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const payload = { nombre: form.nombre, direccion: form.direccion || null, ciudad: form.ciudad || null, contacto: form.contacto || null, telefonoContacto: form.telefonoContacto || null, emailContacto: form.emailContacto || null, capacidadPersonas: form.capacidadPersonas || null, largoM: form.largoM || null, anchoM: form.anchoM || null, alturaMaximaM: form.alturaMaximaM || null, accesoVehicular: form.accesoVehicular || null, puntoDescarga: form.puntoDescarga || null, voltajeDisponible: form.voltajeDisponible || null, amperajeTotal: form.amperajeTotal || null, fases: form.fases || null, ubicacionTablero: form.ubicacionTablero || null, restriccionDecibeles: form.restriccionDecibeles || null, restriccionHorario: form.restriccionHorario || null, restriccionInstalacion: form.restriccionInstalacion || null, tiposEvento: form.tiposEvento, calificacion: form.calificacion || null, notas: form.notas || null, fotoPortada: form.fotoPortada || null };
      const res = await fetch(`/api/venues/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (d.venue) setVenues(prev => prev.map(v => v.id === editing.id ? d.venue : v));
      setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000);
    }, 1200);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() {
    currentEditId.current = null;
    setEditing(null);
    setForm(FORM_DEFAULTS);
    setShowForm(true);
  }

  function openEdit(v: Venue) {
    currentEditId.current = v.id;
    setEditing(v);
    setForm(venueToForm(v));
    setShowForm(true);
  }

  async function guardar() {
    setSaving(true);
    const payload = {
      nombre: form.nombre,
      direccion: form.direccion || null,
      ciudad: form.ciudad || null,
      contacto: form.contacto || null,
      telefonoContacto: form.telefonoContacto || null,
      emailContacto: form.emailContacto || null,
      capacidadPersonas: form.capacidadPersonas || null,
      largoM: form.largoM || null,
      anchoM: form.anchoM || null,
      alturaMaximaM: form.alturaMaximaM || null,
      accesoVehicular: form.accesoVehicular || null,
      puntoDescarga: form.puntoDescarga || null,
      voltajeDisponible: form.voltajeDisponible || null,
      amperajeTotal: form.amperajeTotal || null,
      fases: form.fases || null,
      ubicacionTablero: form.ubicacionTablero || null,
      restriccionDecibeles: form.restriccionDecibeles || null,
      restriccionHorario: form.restriccionHorario || null,
      restriccionInstalacion: form.restriccionInstalacion || null,
      tiposEvento: form.tiposEvento,
      calificacion: form.calificacion || null,
      notas: form.notas || null,
      fotoPortada: form.fotoPortada || null,
    };

    if (editing) {
      const res = await fetch(`/api/venues/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json();
      setVenues(prev => prev.map(v => v.id === editing.id ? d.venue : v));
    } else {
      const res = await fetch("/api/venues", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json();
      setVenues(prev => [...prev, d.venue]);
    }
    setShowForm(false);
    setSaving(false);
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este venue?")) return;
    await fetch(`/api/venues/${id}`, { method: "DELETE" });
    setVenues(prev => prev.filter(v => v.id !== id));
  }

  const filtered = venues.filter(v =>
    !search || v.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (v.ciudad?.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="text-gray-400 text-sm">Cargando...</div>;

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Venues</h1>
          <p className="text-gray-400 text-sm mt-0.5">Base de datos de recintos y espacios de eventos</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 bg-[#B3985B] text-black font-semibold rounded-lg text-sm hover:bg-[#c9a96a] transition-colors">
          + Nuevo venue
        </button>
      </div>

      {/* Buscador */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre o ciudad..."
        className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]"
      />

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-4xl mb-4">🏛️</p>
          <p className="text-gray-400 text-sm">{search ? "Sin resultados" : "Sin venues registrados"}</p>
          {!search && <button onClick={openNew} className="mt-4 text-[#B3985B] text-sm hover:underline">Agregar el primero →</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => {
            const tipos: string[] = v.tiposEvento ? JSON.parse(v.tiposEvento) : [];
            const isExpanded = expandedId === v.id;
            return (
              <div key={v.id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                {/* Card header */}
                <div className="flex items-start gap-4 p-4">
                  {v.fotoPortada ? (
                    <img src={v.fotoPortada} alt={v.nombre} className="w-16 h-16 object-cover rounded-lg shrink-0 border border-[#2a2a2a]" />
                  ) : (
                    <div className="w-16 h-16 bg-[#1a1a1a] rounded-lg flex items-center justify-center shrink-0 border border-[#2a2a2a]">
                      <span className="text-2xl">🏛️</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-white font-semibold text-base">{v.nombre}</p>
                        {v.ciudad && <p className="text-gray-400 text-xs mt-0.5">{v.ciudad}</p>}
                        {v.direccion && <p className="text-gray-500 text-xs">{v.direccion}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {v.calificacion && (
                          <span className="text-[#B3985B] text-xs font-medium">{"★".repeat(Math.round(v.calificacion))}{v.calificacion.toFixed(1)}</span>
                        )}
                        {tipos.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-[#222] text-gray-400">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {v.capacidadPersonas && (
                        <span className="text-gray-400 text-xs">👥 {v.capacidadPersonas.toLocaleString()} personas</span>
                      )}
                      {(v.largoM && v.anchoM) && (
                        <span className="text-gray-400 text-xs">📐 {v.largoM}×{v.anchoM}m{v.alturaMaximaM ? ` h${v.alturaMaximaM}m` : ""}</span>
                      )}
                      {v.amperajeTotal && (
                        <span className="text-gray-400 text-xs">⚡ {v.amperajeTotal}A{v.voltajeDisponible ? ` · ${v.voltajeDisponible}V` : ""}</span>
                      )}
                      {v.telefonoContacto && (
                        <span className="text-gray-400 text-xs">📞 {v.telefonoContacto}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones + expandir */}
                <div className="flex items-center justify-between px-4 pb-3 gap-2">
                  <button onClick={() => {
                    const next = isExpanded ? null : v.id;
                    setExpandedId(next);
                    if (next && !historialVenue[next]) {
                      fetch(`/api/proyectos?lugarEvento=${encodeURIComponent(v.nombre)}`)
                        .then(r => r.json())
                        .then(d => setHistorialVenue(prev => ({ ...prev, [v.id]: d.proyectos ?? [] })));
                    }
                  }}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    {isExpanded ? "▲ Menos detalles" : "▼ Ver ficha técnica + historial"}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(v)} className="text-xs text-[#B3985B] hover:underline">Editar</button>
                    <button onClick={() => eliminar(v.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-[#1a1a1a] px-4 py-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {v.contacto && (
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">Contacto</p>
                          <p className="text-white text-sm">{v.contacto}</p>
                          {v.emailContacto && <p className="text-gray-400 text-xs">{v.emailContacto}</p>}
                        </div>
                      )}
                      {v.accesoVehicular && (
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">Acceso vehicular</p>
                          <p className="text-white text-sm">{v.accesoVehicular}</p>
                        </div>
                      )}
                      {v.puntoDescarga && (
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">Punto de descarga</p>
                          <p className="text-white text-sm">{v.puntoDescarga}</p>
                        </div>
                      )}
                      {v.fases && (
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">Fases eléctricas</p>
                          <p className="text-white text-sm">{v.fases}</p>
                        </div>
                      )}
                      {v.ubicacionTablero && (
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">Tablero eléctrico</p>
                          <p className="text-white text-sm">{v.ubicacionTablero}</p>
                        </div>
                      )}
                    </div>
                    {(v.restriccionDecibeles || v.restriccionHorario || v.restriccionInstalacion) && (
                      <div>
                        <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Restricciones</p>
                        <div className="space-y-1">
                          {v.restriccionDecibeles && <p className="text-sm text-orange-300">🔊 {v.restriccionDecibeles}</p>}
                          {v.restriccionHorario && <p className="text-sm text-orange-300">🕐 {v.restriccionHorario}</p>}
                          {v.restriccionInstalacion && <p className="text-sm text-orange-300">🔧 {v.restriccionInstalacion}</p>}
                        </div>
                      </div>
                    )}
                    {v.notas && (
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Notas</p>
                        <p className="text-gray-300 text-sm leading-relaxed">{v.notas}</p>
                      </div>
                    )}
                    {/* Historial de proyectos en este venue */}
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Historial de eventos</p>
                      {!historialVenue[v.id] ? (
                        <p className="text-gray-600 text-xs italic">Cargando...</p>
                      ) : historialVenue[v.id].length === 0 ? (
                        <p className="text-gray-600 text-xs italic">Ningún proyecto registrado en este venue</p>
                      ) : (
                        <div className="space-y-1.5">
                          {historialVenue[v.id].map(p => (
                            <a key={p.id} href={`/proyectos/${p.id}`} className="flex items-center justify-between bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 hover:border-[#333] transition-colors">
                              <div>
                                <p className="text-white text-xs font-medium">{p.nombre}</p>
                                <p className="text-gray-600 text-[10px]">{p.numeroProyecto} · {p.cliente?.nombre}</p>
                              </div>
                              <div className="text-right ml-3 shrink-0">
                                {p.fechaEvento && <p className="text-gray-400 text-xs">{new Date(p.fechaEvento).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</p>}
                                <span className={`text-[10px] ${p.estado === "COMPLETADO" ? "text-green-400" : "text-yellow-400"}`}>{p.estado}</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-2xl my-6">
            <div className="flex items-center justify-between p-5 border-b border-[#222]">
              <h2 className="text-white font-semibold">{editing ? "Editar venue" : "Nuevo venue"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Info básica */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Información básica</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Nombre del venue *</label>
                    <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Ciudad</label>
                    <input value={form.ciudad} onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Capacidad (personas)</label>
                    <input type="number" value={form.capacidadPersonas} onChange={e => setForm(p => ({ ...p, capacidadPersonas: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Dirección / Google Maps</label>
                    <input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-400 block mb-2">Tipo de evento</label>
                  <div className="flex gap-2">
                    {TIPOS_EVENTO.map(t => (
                      <button key={t.id} onClick={() => setForm(p => ({
                        ...p, tiposEvento: p.tiposEvento.includes(t.id)
                          ? p.tiposEvento.filter(x => x !== t.id)
                          : [...p.tiposEvento, t.id],
                      }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.tiposEvento.includes(t.id) ? "bg-[#B3985B] text-black border-[#B3985B]" : "bg-[#1a1a1a] text-gray-400 border-[#2a2a2a] hover:border-[#B3985B]"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contacto</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Nombre</label>
                    <input value={form.contacto} onChange={e => setForm(p => ({ ...p, contacto: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Teléfono</label>
                    <input value={form.telefonoContacto} onChange={e => setForm(p => ({ ...p, telefonoContacto: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Email</label>
                    <input value={form.emailContacto} onChange={e => setForm(p => ({ ...p, emailContacto: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>

              {/* Dimensiones */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dimensiones del espacio</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Largo (m)", field: "largoM" as const },
                    { label: "Ancho (m)", field: "anchoM" as const },
                    { label: "Altura máx. (m)", field: "alturaMaximaM" as const },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <label className="text-xs text-gray-400 block mb-1">{label}</label>
                      <input type="number" step="0.1" value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Acceso y logística */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Acceso y logística</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Acceso vehicular</label>
                    <input value={form.accesoVehicular} onChange={e => setForm(p => ({ ...p, accesoVehicular: e.target.value }))}
                      placeholder="ej. Entrada lateral con rampa" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Punto de descarga</label>
                    <input value={form.puntoDescarga} onChange={e => setForm(p => ({ ...p, puntoDescarga: e.target.value }))}
                      placeholder="ej. Muelle trasero" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>

              {/* Electricidad */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Electricidad</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Voltaje (V)</label>
                    <input value={form.voltajeDisponible} onChange={e => setForm(p => ({ ...p, voltajeDisponible: e.target.value }))}
                      placeholder="127 / 220" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Amperaje (A)</label>
                    <input type="number" value={form.amperajeTotal} onChange={e => setForm(p => ({ ...p, amperajeTotal: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Fases</label>
                    <input value={form.fases} onChange={e => setForm(p => ({ ...p, fases: e.target.value }))}
                      placeholder="Monofásico / Trifásico" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Ubicación tablero</label>
                    <input value={form.ubicacionTablero} onChange={e => setForm(p => ({ ...p, ubicacionTablero: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
              </div>

              {/* Restricciones */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Restricciones</p>
                <div className="space-y-3">
                  {[
                    { label: "Restricción de decibeles", field: "restriccionDecibeles" as const, placeholder: "ej. Máx. 95dB después de las 22:00" },
                    { label: "Restricción de horario", field: "restriccionHorario" as const, placeholder: "ej. Acceso desde 08:00, desalojo antes de 01:00" },
                    { label: "Restricción de instalación", field: "restriccionInstalacion" as const, placeholder: "ej. No clavar en paredes, truss a max 200kg" },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="text-xs text-gray-400 block mb-1">{label}</label>
                      <input value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                        placeholder={placeholder} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Calificación y notas */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Evaluación</p>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-xs text-gray-400">Calificación</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setForm(p => ({ ...p, calificacion: n.toString() }))}
                        className={`text-lg transition-colors ${parseInt(form.calificacion) >= n ? "text-[#B3985B]" : "text-gray-700"}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <label className="text-xs text-gray-400 block mb-1">Notas internas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                  rows={3} placeholder="Observaciones, tips, experiencias previas..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
              </div>

              {/* Foto portada */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Foto del venue</p>
                {form.fotoPortada ? (
                  <div className="relative inline-block">
                    <img src={form.fotoPortada} alt="Portada" className="w-40 h-28 object-cover rounded-lg border border-[#2a2a2a]" />
                    <button onClick={() => setForm(p => ({ ...p, fotoPortada: "" }))}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">✕</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#B3985B] hover:text-[#c9a96a]">
                    <span>+ Agregar foto</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file) { const b64 = await comprimirImagen(file); setForm(p => ({ ...p, fotoPortada: b64 })); }
                    }} />
                  </label>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[#222] space-y-2">
              {editing && autoSaved && <p className="text-xs text-green-500 text-center">✓ Cambios guardados automáticamente</p>}
              <div className="flex gap-3">
                <button onClick={() => { currentEditId.current = null; setShowForm(false); }} className="flex-1 py-2.5 rounded-lg border border-[#333] text-gray-400 hover:text-white text-sm transition-colors">
                  Cerrar
                </button>
                {!editing && (
                  <button onClick={guardar} disabled={saving || !form.nombre.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-60 transition-colors">
                    {saving ? "Guardando..." : "Crear venue"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
