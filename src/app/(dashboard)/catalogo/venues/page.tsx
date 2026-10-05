"use client";

import { useEffect, useState, useRef } from "react";
import { useConfirm } from "@/components/Confirm";
import { useToast } from "@/components/Toast";
import { coincide } from "@/lib/buscar";
import { upload } from "@vercel/blob/client";
import { Landmark, Users, Ruler, Zap, Phone, Volume2, Clock, Wrench, Merge } from "lucide-react";
import { VENUE_TIPOS, etiquetaTipoVenue } from "@/lib/venues";
import VenueInventarioPanel from "./VenueInventarioPanel";

interface Venue {
  id: string;
  nombre: string;
  tipo: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  linkMaps: string | null;
  _count?: { tratos: number; cotizaciones: number; proyectos: number };
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
  // Ficha técnica del foro (la cotejamos contra el rider en el advance de gira)
  contactoTecnicoNombre: string | null;
  contactoTecnicoTelefono: string | null;
  contactoTecnicoEmail: string | null;
  medidasEscenario: string | null;
  alturaRejaM: number | null;
  accesoEscenario: string | null;
  camerinos: string | null;
  horarioCarga: string | null;
  riderCasaUrl: string | null;
  notasTecnicas: string | null;
  tiposEvento: string | null;
  calificacion: number | null;
  notas: string | null;
  fotoPortada: string | null;
  activo: boolean;
}

type FormData = {
  nombre: string; tipo: string; estado: string; linkMaps: string; direccion: string; ciudad: string; contacto: string;
  telefonoContacto: string; emailContacto: string; capacidadPersonas: string;
  largoM: string; anchoM: string; alturaMaximaM: string;
  accesoVehicular: string; puntoDescarga: string;
  voltajeDisponible: string; amperajeTotal: string; fases: string; ubicacionTablero: string;
  restriccionDecibeles: string; restriccionHorario: string; restriccionInstalacion: string;
  contactoTecnicoNombre: string; contactoTecnicoTelefono: string; contactoTecnicoEmail: string;
  medidasEscenario: string; alturaRejaM: string; accesoEscenario: string;
  camerinos: string; horarioCarga: string; riderCasaUrl: string; notasTecnicas: string;
  tiposEvento: string[]; calificacion: string; notas: string; fotoPortada: string;
};

const FORM_DEFAULTS: FormData = {
  nombre: "", tipo: "SALON", estado: "", linkMaps: "", direccion: "", ciudad: "", contacto: "",
  telefonoContacto: "", emailContacto: "", capacidadPersonas: "",
  largoM: "", anchoM: "", alturaMaximaM: "",
  accesoVehicular: "", puntoDescarga: "",
  voltajeDisponible: "", amperajeTotal: "", fases: "", ubicacionTablero: "",
  restriccionDecibeles: "", restriccionHorario: "", restriccionInstalacion: "",
  contactoTecnicoNombre: "", contactoTecnicoTelefono: "", contactoTecnicoEmail: "",
  medidasEscenario: "", alturaRejaM: "", accesoEscenario: "",
  camerinos: "", horarioCarga: "", riderCasaUrl: "", notasTecnicas: "",
  tiposEvento: [], calificacion: "", notas: "", fotoPortada: "",
};

/// Un solo armador de payload para el guardado manual y el autosave: no pueden divergir.
function payloadDe(form: FormData) {
  return {
    nombre: form.nombre,
    tipo: form.tipo || null,
    estado: form.estado || null,
    linkMaps: form.linkMaps || null,
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
    contactoTecnicoNombre: form.contactoTecnicoNombre || null,
    contactoTecnicoTelefono: form.contactoTecnicoTelefono || null,
    contactoTecnicoEmail: form.contactoTecnicoEmail || null,
    medidasEscenario: form.medidasEscenario || null,
    alturaRejaM: form.alturaRejaM || null,
    accesoEscenario: form.accesoEscenario || null,
    camerinos: form.camerinos || null,
    horarioCarga: form.horarioCarga || null,
    riderCasaUrl: form.riderCasaUrl || null,
    notasTecnicas: form.notasTecnicas || null,
    tiposEvento: form.tiposEvento,
    calificacion: form.calificacion || null,
    notas: form.notas || null,
    fotoPortada: form.fotoPortada || null,
  };
}

const TIPOS_EVENTO = [
  { id: "MUSICAL", label: "Musical" },
  { id: "SOCIAL", label: "Social" },
  { id: "EMPRESARIAL", label: "Empresarial" },
  { id: "OTRO", label: "Otros eventos" },
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
  const confirm = useConfirm();
  const toast = useToast();
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
  const [filtroTipo, setFiltroTipo] = useState("");
  const [orden, setOrden] = useState<"USO" | "NOMBRE">("USO");
  const [fusionandoId, setFusionandoId] = useState<string | null>(null);
  const [fusionDestino, setFusionDestino] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subiendoRider, setSubiendoRider] = useState(false);
  const [historialVenue, setHistorialVenue] = useState<Record<string, {id:string;nombre:string;numeroProyecto:string;fechaEvento:string|null;estado:string;cliente:{nombre:string}}[]>>({});

  useEffect(() => {
    fetch("/api/venues?conUso=1").then(r => r.json()).then(d => {
      setVenues(d.venues ?? []);
      setLoading(false);
    });
  }, []);

  function venueToForm(v: Venue): FormData {
    return {
      nombre: v.nombre ?? "",
      tipo: v.tipo ?? "OTRO",
      estado: v.estado ?? "",
      linkMaps: v.linkMaps ?? "",
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
      contactoTecnicoNombre: v.contactoTecnicoNombre ?? "",
      contactoTecnicoTelefono: v.contactoTecnicoTelefono ?? "",
      contactoTecnicoEmail: v.contactoTecnicoEmail ?? "",
      medidasEscenario: v.medidasEscenario ?? "",
      alturaRejaM: v.alturaRejaM?.toString() ?? "",
      accesoEscenario: v.accesoEscenario ?? "",
      camerinos: v.camerinos ?? "",
      horarioCarga: v.horarioCarga ?? "",
      riderCasaUrl: v.riderCasaUrl ?? "",
      notasTecnicas: v.notasTecnicas ?? "",
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
      const payload = payloadDe(form);
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
    const payload = payloadDe(form);

    if (editing) {
      const res = await fetch(`/api/venues/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al guardar");
        setSaving(false);
        return;
      }
      const d = await res.json();
      setVenues(prev => prev.map(v => v.id === editing.id ? d.venue : v));
    } else {
      const res = await fetch("/api/venues", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Error al guardar");
        setSaving(false);
        return;
      }
      const d = await res.json();
      setVenues(prev => [...prev, d.venue]);
    }
    setShowForm(false);
    setSaving(false);
  }

  async function eliminar(id: string) {
    if (!await confirm({ message: "¿Dar de baja este venue? Los eventos que ya lo usan lo conservan.", danger: true, confirmText: "Dar de baja" })) return;
    const res = await fetch(`/api/venues/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Error al eliminar");
      return;
    }
    setVenues(prev => prev.filter(v => v.id !== id));
  }

  const usos = (v: Venue) => (v._count ? v._count.tratos + v._count.cotizaciones + v._count.proyectos : 0);
  const tiposPresentes = VENUE_TIPOS.filter(t => venues.some(v => v.tipo === t.value));
  const filtered = venues
    .filter(v => (filtroTipo ? v.tipo === filtroTipo : true))
    .filter(v => coincide(search, v.nombre, v.ciudad, v.estado))
    .sort((a, b) => (orden === "USO" ? usos(b) - usos(a) : a.nombre.localeCompare(b.nombre, "es")));

  async function fusionar(duplicado: Venue) {
    if (!fusionDestino) return;
    const destino = venues.find(v => v.id === fusionDestino);
    if (!destino) return;
    if (!await confirm({
      message: `Todo lo que apunta a "${duplicado.nombre}" pasará a "${destino.nombre}", y "${duplicado.nombre}" se da de baja. ¿Continuar?`,
      confirmText: "Fusionar",
    })) return;
    const res = await fetch(`/api/venues/${fusionDestino}/fusionar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicadoId: duplicado.id }),
    });
    const d = await res.json();
    if (!res.ok) { toast.error(d.error ?? "No se pudo fusionar"); return; }
    toast.success(`Fusionado: ${d.tratos} tratos, ${d.cotizaciones} cotizaciones, ${d.proyectos} proyectos.`);
    setFusionandoId(null);
    setFusionDestino("");
    fetch("/api/venues?conUso=1").then(r => r.json()).then(x => setVenues(x.venues ?? []));
  }

  if (loading) return <div className="text-gray-400 text-sm">Cargando...</div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ms-h1">Venues</h1>
          <p className="text-gray-400 text-sm mt-0.5">Base de datos de recintos y espacios de eventos</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 bg-[#B3985B] text-black font-semibold rounded-lg text-sm hover:bg-[#c9a96a] transition-colors">
          + Nuevo venue
        </button>
      </div>

      {/* Buscador + filtros */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, ciudad o estado..."
            className="flex-1 ms-card px-4 py-3 text-white text-sm focus:outline-none focus:border-[#B3985B]"
          />
          <button onClick={() => setOrden(o => (o === "USO" ? "NOMBRE" : "USO"))}
            className="ms-card px-4 py-3 text-xs text-gray-400 hover:text-white transition-colors whitespace-nowrap">
            Orden: {orden === "USO" ? "más usados" : "alfabético"}
          </button>
        </div>
        {tiposPresentes.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFiltroTipo("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!filtroTipo ? "bg-[#B3985B] text-black border-[#B3985B]" : "bg-[#1a1a1a] text-gray-400 border-[#2a2a2a] hover:border-[#B3985B]"}`}>
              Todos ({venues.length})
            </button>
            {tiposPresentes.map(t => (
              <button key={t.value} onClick={() => setFiltroTipo(f => (f === t.value ? "" : t.value))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filtroTipo === t.value ? "bg-[#B3985B] text-black border-[#B3985B]" : "bg-[#1a1a1a] text-gray-400 border-[#2a2a2a] hover:border-[#B3985B]"}`}>
                {t.label} ({venues.filter(v => v.tipo === t.value).length})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Landmark strokeWidth={1.75} className="w-10 h-10 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-sm">{search ? "Sin resultados" : "Sin venues registrados"}</p>
          {!search && <button onClick={openNew} className="mt-4 text-[#B3985B] text-sm hover:underline">Agregar el primero →</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => {
            const tipos: string[] = v.tiposEvento ? JSON.parse(v.tiposEvento) : [];
            const isExpanded = expandedId === v.id;
            return (
              <div key={v.id} className="ms-table-wrapper">
                {/* Card header */}
                <div className="flex items-start gap-4 p-4">
                  {v.fotoPortada ? (
                    <img src={v.fotoPortada} alt={v.nombre} className="w-16 h-16 object-cover rounded-lg shrink-0 border border-[#2a2a2a]" />
                  ) : (
                    <div className="w-16 h-16 bg-[#1a1a1a] rounded-lg flex items-center justify-center shrink-0 border border-[#2a2a2a]">
                      <Landmark strokeWidth={1.75} className="w-7 h-7 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-white font-semibold text-base">{v.nombre}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {etiquetaTipoVenue(v.tipo)}
                          {v.ciudad ? ` · ${v.ciudad}` : ""}
                          {v.estado ? `, ${v.estado}` : ""}
                        </p>
                        {v.direccion && <p className="text-gray-500 text-xs">{v.direccion}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {usos(v) > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-[#B3985B]/15 text-[#B3985B] font-medium">{usos(v)} {usos(v) === 1 ? "evento" : "eventos"}</span>
                        )}
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
                        <span className="inline-flex items-center gap-1.5 text-gray-400 text-xs"><Users strokeWidth={1.75} className="w-3.5 h-3.5" />{v.capacidadPersonas.toLocaleString()} personas</span>
                      )}
                      {(v.largoM && v.anchoM) && (
                        <span className="inline-flex items-center gap-1.5 text-gray-400 text-xs"><Ruler strokeWidth={1.75} className="w-3.5 h-3.5" />{v.largoM}×{v.anchoM}m{v.alturaMaximaM ? ` h${v.alturaMaximaM}m` : ""}</span>
                      )}
                      {v.amperajeTotal && (
                        <span className="inline-flex items-center gap-1.5 text-gray-400 text-xs"><Zap strokeWidth={1.75} className="w-3.5 h-3.5" />{v.amperajeTotal}A{v.voltajeDisponible ? ` · ${v.voltajeDisponible}V` : ""}</span>
                      )}
                      {v.telefonoContacto && (
                        <span className="inline-flex items-center gap-1.5 text-gray-400 text-xs"><Phone strokeWidth={1.75} className="w-3.5 h-3.5" />{v.telefonoContacto}</span>
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
                      fetch(`/api/proyectos?venueId=${v.id}`)
                        .then(r => r.json())
                        .then(d => setHistorialVenue(prev => ({ ...prev, [v.id]: d.proyectos ?? [] })));
                    }
                  }}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    {isExpanded ? "▲ Menos detalles" : "▼ Ver ficha técnica + historial"}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => { setFusionandoId(fusionandoId === v.id ? null : v.id); setFusionDestino(""); }}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      <Merge strokeWidth={1.75} className="w-3.5 h-3.5" />Fusionar
                    </button>
                    <button onClick={() => openEdit(v)} className="text-xs text-[#B3985B] hover:underline">Editar</button>
                    <button onClick={() => eliminar(v.id)} className="text-xs text-red-500 hover:underline">Dar de baja</button>
                  </div>
                </div>

                {/* Fusionar dentro de otro venue */}
                {fusionandoId === v.id && (
                  <div className="border-t border-[#1a1a1a] px-4 py-3 space-y-2">
                    <p className="text-gray-400 text-xs">
                      «{v.nombre}» es un duplicado de… (todo lo suyo se mueve al venue que elijas y este se da de baja)
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select value={fusionDestino} onChange={e => setFusionDestino(e.target.value)}
                        className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                        <option value="">Elige el venue bueno…</option>
                        {venues.filter(o => o.id !== v.id).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map(o => (
                          <option key={o.id} value={o.id}>{o.nombre}{o.ciudad ? ` — ${o.ciudad}` : ""}</option>
                        ))}
                      </select>
                      <button onClick={() => fusionar(v)} disabled={!fusionDestino}
                        className="px-4 py-2 rounded-lg bg-[#B3985B] text-black font-semibold text-sm hover:bg-[#c9a96a] disabled:opacity-50 transition-colors whitespace-nowrap">
                        Fusionar
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-[#1a1a1a] px-4 py-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {v.linkMaps && (
                        <div>
                          <p className="text-gray-500 text-xs mb-0.5">Ubicación</p>
                          <a href={v.linkMaps} target="_blank" rel="noopener noreferrer" className="text-[#B3985B] text-sm hover:underline">Abrir en Maps →</a>
                        </div>
                      )}
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
                          {v.restriccionDecibeles && <p className="inline-flex items-center gap-1.5 text-sm text-orange-300"><Volume2 strokeWidth={1.75} className="w-3.5 h-3.5" />{v.restriccionDecibeles}</p>}
                          {v.restriccionHorario && <p className="inline-flex items-center gap-1.5 text-sm text-orange-300"><Clock strokeWidth={1.75} className="w-3.5 h-3.5" />{v.restriccionHorario}</p>}
                          {v.restriccionInstalacion && <p className="inline-flex items-center gap-1.5 text-sm text-orange-300"><Wrench strokeWidth={1.75} className="w-3.5 h-3.5" />{v.restriccionInstalacion}</p>}
                        </div>
                      </div>
                    )}
                    {v.notas && (
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Notas</p>
                        <p className="text-gray-300 text-sm leading-relaxed">{v.notas}</p>
                      </div>
                    )}
                    {/* Ficha técnica del foro */}
                    {(v.contactoTecnicoNombre || v.medidasEscenario || v.alturaRejaM || v.accesoEscenario || v.camerinos || v.horarioCarga || v.riderCasaUrl || v.notasTecnicas) && (
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Ficha técnica del foro</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {v.contactoTecnicoNombre && (
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Contacto técnico</p>
                              <p className="text-white text-sm">{v.contactoTecnicoNombre}</p>
                              {v.contactoTecnicoTelefono && <p className="text-gray-400 text-xs">{v.contactoTecnicoTelefono}</p>}
                              {v.contactoTecnicoEmail && <p className="text-gray-400 text-xs">{v.contactoTecnicoEmail}</p>}
                            </div>
                          )}
                          {v.medidasEscenario && (
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Escenario</p>
                              <p className="text-white text-sm">{v.medidasEscenario}</p>
                            </div>
                          )}
                          {v.alturaRejaM && (
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Altura de reja</p>
                              <p className="text-white text-sm">{v.alturaRejaM} m</p>
                            </div>
                          )}
                          {v.accesoEscenario && (
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Acceso al escenario</p>
                              <p className="text-white text-sm">{v.accesoEscenario}</p>
                            </div>
                          )}
                          {v.camerinos && (
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Camerinos</p>
                              <p className="text-white text-sm">{v.camerinos}</p>
                            </div>
                          )}
                          {v.horarioCarga && (
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Horario de carga</p>
                              <p className="text-white text-sm">{v.horarioCarga}</p>
                            </div>
                          )}
                        </div>
                        {v.notasTecnicas && <p className="text-gray-300 text-sm leading-relaxed mt-3">{v.notasTecnicas}</p>}
                        {v.riderCasaUrl && (
                          <a href={v.riderCasaUrl} target="_blank" rel="noopener noreferrer" className="text-[#B3985B] text-sm hover:underline mt-2 inline-block">
                            Abrir el rider del venue →
                          </a>
                        )}
                      </div>
                    )}

                    {/* Inventario del venue, editable renglón por renglón */}
                    <VenueInventarioPanel venueId={v.id} />

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
                                {p.fechaEvento && <p className="text-gray-400 text-xs">{new Date(p.fechaEvento).toLocaleDateString("es-MX", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })}</p>}
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
          <div className="ms-card rounded-2xl w-full max-w-2xl my-6">
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
                    <label className="text-xs text-gray-400 block mb-1">Tipo de recinto</label>
                    <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]">
                      {VENUE_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Capacidad (personas)</label>
                    <input type="number" value={form.capacidadPersonas} onChange={e => setForm(p => ({ ...p, capacidadPersonas: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Ciudad</label>
                    <input value={form.ciudad} onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Estado</label>
                    <input value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                      placeholder="Querétaro" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Dirección</label>
                    <input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Link de Google Maps</label>
                    <input value={form.linkMaps} onChange={e => setForm(p => ({ ...p, linkMaps: e.target.value }))}
                      placeholder="https://maps.app.goo.gl/…" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
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

              {/* Ficha técnica del foro — lo que el advance de gira necesita saber */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ficha técnica del foro</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: "Contacto técnico", field: "contactoTecnicoNombre" as const, placeholder: "Jefe técnico del foro" },
                    { label: "Teléfono técnico", field: "contactoTecnicoTelefono" as const, placeholder: "" },
                    { label: "Email técnico", field: "contactoTecnicoEmail" as const, placeholder: "" },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="text-xs text-gray-400 block mb-1">{label}</label>
                      <input value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                        placeholder={placeholder} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Medidas del escenario</label>
                    <input value={form.medidasEscenario} onChange={e => setForm(p => ({ ...p, medidasEscenario: e.target.value }))}
                      placeholder="10 × 8 m, 1.2 m de alto" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Altura de reja (m)</label>
                    <input type="number" step="0.1" value={form.alturaRejaM} onChange={e => setForm(p => ({ ...p, alturaRejaM: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  {[
                    { label: "Acceso al escenario", field: "accesoEscenario" as const, placeholder: "Rampa por la izquierda, 2.2 m de alto" },
                    { label: "Camerinos", field: "camerinos" as const, placeholder: "2 camerinos con baño" },
                    { label: "Horario de carga", field: "horarioCarga" as const, placeholder: "Load-in desde 09:00" },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="text-xs text-gray-400 block mb-1">{label}</label>
                      <input value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                        placeholder={placeholder} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B]" />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-400 block mb-1">Notas técnicas</label>
                  <textarea value={form.notasTecnicas} onChange={e => setForm(p => ({ ...p, notasTecnicas: e.target.value }))}
                    rows={3} placeholder="Lo que hay que saber del foro antes de llegar: tomas, puntos de rigging, limitaciones…"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#B3985B] resize-none" />
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-400 block mb-1">Rider del venue (PDF)</label>
                  {form.riderCasaUrl ? (
                    <div className="flex items-center gap-3">
                      <a href={form.riderCasaUrl} target="_blank" rel="noopener noreferrer" className="text-[#B3985B] text-sm hover:underline">
                        Abrir el rider del venue →
                      </a>
                      <button onClick={() => setForm(p => ({ ...p, riderCasaUrl: "" }))} className="text-xs text-red-500 hover:underline">
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-[#B3985B] hover:text-[#c9a96a]">
                      <span>{subiendoRider ? "Subiendo…" : "+ Subir el rider / ficha técnica del foro"}</span>
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setSubiendoRider(true);
                        try {
                          const ext = file.name.split(".").pop() ?? "pdf";
                          const blob = await upload(`venues/rider-casa/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`, file, {
                            access: "public",
                            handleUploadUrl: "/api/upload/token",
                          });
                          setForm(p => ({ ...p, riderCasaUrl: blob.url }));
                        } catch {
                          toast.error("No se pudo subir el archivo");
                        } finally {
                          setSubiendoRider(false);
                        }
                      }} />
                    </label>
                  )}
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
