"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { NIVELES_INVOLUCRAMIENTO, etiquetaNivel } from "@/lib/servicios-direccion";
import {
  ESTADO_GIRA_COLOR,
  TIPOS_FORMACION,
  TIPO_FORMACION_LABEL,
  ROL_PERSONA_LABEL,
  esGira,
  estadoRegistroLabel,
  fmtRango,
} from "@/lib/giras";

const ROSTER_ESTADOS = ["ACTIVO", "PAUSADO", "TERMINADO"] as const;
const ROSTER_ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  PAUSADO: "Pausado",
  TERMINADO: "Terminado",
};

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
  tiktok: string | null;
  youtube: string | null;
  spotify: string | null;
  bio: string | null;
  notas: string | null;
  clienteId: string | null;
  logoUrl: string | null;
  tipoFormacion: string | null;
  integrantesNum: number | null;
  enRosterGiras: boolean;
  rosterNivelServicio: string | null;
  rosterEstado: string | null;
  rosterFechaAlta: string | null;
  rosterNotas: string | null;
}

interface Representante {
  id: string;
  nombre: string;
  rol: string;
  telefono: string | null;
  email: string | null;
}

interface GiraFila {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  shows: number;
}

interface Props {
  artista: Artista;
  clientes: { id: string; nombre: string; empresa: string | null }[];
  representacion: Representante[];
  giras: GiraFila[];
}

type Formulario = {
  nombre: string;
  genero: string;
  origen: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;
  instagram: string;
  sitioWeb: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  bio: string;
  notas: string;
  clienteId: string;
  logoUrl: string;
  tipoFormacion: string;
  integrantesNum: string;
  enRosterGiras: boolean;
  rosterNivelServicio: string;
  rosterEstado: string;
  rosterNotas: string;
};

function aFormulario(a: Artista): Formulario {
  return {
    nombre: a.nombre,
    genero: a.genero ?? "",
    origen: a.origen ?? "",
    contactoNombre: a.contactoNombre ?? "",
    contactoTelefono: a.contactoTelefono ?? "",
    contactoEmail: a.contactoEmail ?? "",
    instagram: a.instagram ?? "",
    sitioWeb: a.sitioWeb ?? "",
    tiktok: a.tiktok ?? "",
    youtube: a.youtube ?? "",
    spotify: a.spotify ?? "",
    bio: a.bio ?? "",
    notas: a.notas ?? "",
    clienteId: a.clienteId ?? "",
    logoUrl: a.logoUrl ?? "",
    tipoFormacion: a.tipoFormacion ?? "",
    integrantesNum: a.integrantesNum === null ? "" : String(a.integrantesNum),
    enRosterGiras: a.enRosterGiras,
    rosterNivelServicio: a.rosterNivelServicio ?? "",
    rosterEstado: a.rosterEstado ?? (a.enRosterGiras ? "ACTIVO" : ""),
    rosterNotas: a.rosterNotas ?? "",
  };
}

export default function DatosArtistaClient({ artista, clientes, representacion, giras }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [form, setForm] = useState<Formulario>(aFormulario(artista));
  const [original, setOriginal] = useState<Formulario>(aFormulario(artista));
  const [guardando, setGuardando] = useState(false);

  const sucio = JSON.stringify(form) !== JSON.stringify(original);

  function set<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((p) => ({ ...p, [campo]: valor }));
  }

  function alternarRoster(activar: boolean) {
    setForm((p) => ({
      ...p,
      enRosterGiras: activar,
      rosterEstado: activar ? p.rosterEstado || "ACTIVO" : "",
    }));
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      toast.error("El artista necesita nombre.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/artistas/${artista.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nombre: form.nombre.trim(),
          integrantesNum: form.integrantesNum === "" ? null : Number(form.integrantesNum),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar.");
        return;
      }
      setOriginal(form);
      toast.success("Datos guardados");
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  async function darDeBaja() {
    const ok = await confirm({
      message: `¿Dar de baja a «${artista.nombre}» del catálogo? Sus riders, shows y giras se conservan.`,
      danger: true,
      confirmText: "Dar de baja",
    });
    if (!ok) return;
    const res = await fetch(`/api/artistas/${artista.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo dar de baja.");
      return;
    }
    toast.success("Artista dado de baja");
    router.push("/giras/artistas");
  }

  return (
    <div className="ms-page space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="ms-card p-4 space-y-4 border-[#B3985B]/30">
            <div className="flex items-center justify-between gap-2">
              <p className="ms-section-label">Roster de giras</p>
              <button
                onClick={() => alternarRoster(!form.enRosterGiras)}
                className={form.enRosterGiras ? "ms-badge ms-badge-gold" : "ms-badge ms-badge-gray"}
              >
                {form.enRosterGiras ? "En el roster" : "Fuera del roster"}
              </button>
            </div>
            <p className="ms-micro">
              Márcalo cuando el artista es cliente estable de production management / dirección técnica de giras
              (ej. AQUIHAYAQUIHAY), para diferenciarlo de un artista que solo aparece en un rider suelto de renta o
              evento.
            </p>

            {form.enRosterGiras && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="ms-label block mb-1.5">Nivel de servicio</label>
                  <select
                    className="ms-input w-full"
                    value={form.rosterNivelServicio}
                    onChange={(e) => set("rosterNivelServicio", e.target.value)}
                  >
                    <option value="">Sin definir</option>
                    {NIVELES_INVOLUCRAMIENTO.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                  {form.rosterNivelServicio && (
                    <p className="ms-micro mt-1">{etiquetaNivel(form.rosterNivelServicio)}</p>
                  )}
                </div>
                <div>
                  <label className="ms-label block mb-1.5">Estado de la cuenta</label>
                  <select
                    className="ms-input w-full"
                    value={form.rosterEstado}
                    onChange={(e) => set("rosterEstado", e.target.value)}
                  >
                    {ROSTER_ESTADOS.map((e) => (
                      <option key={e} value={e}>
                        {ROSTER_ESTADO_LABEL[e]}
                      </option>
                    ))}
                  </select>
                  {artista.rosterFechaAlta && (
                    <p className="ms-micro mt-1">
                      En el roster desde {new Date(artista.rosterFechaAlta).toLocaleDateString("es-MX")}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="ms-label block mb-1.5">Condiciones del roster</label>
                  <textarea
                    className="ms-textarea w-full"
                    rows={2}
                    placeholder="Acuerdos especiales, SLA, lo que distingue a esta cuenta…"
                    value={form.rosterNotas}
                    onChange={(e) => set("rosterNotas", e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="ms-card p-4 space-y-4">
            <p className="ms-section-label">Identidad</p>

            <div>
              <label className="ms-label block mb-1.5">Nombre</label>
              <input className="ms-input w-full" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Género</label>
                <input
                  className="ms-input w-full"
                  placeholder="ej. rock alternativo"
                  value={form.genero}
                  onChange={(e) => set("genero", e.target.value)}
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Origen</label>
                <input
                  className="ms-input w-full"
                  placeholder="ej. Querétaro, MX"
                  value={form.origen}
                  onChange={(e) => set("origen", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Formación</label>
                <select
                  className="ms-input w-full"
                  value={form.tipoFormacion}
                  onChange={(e) => set("tipoFormacion", e.target.value)}
                >
                  <option value="">Sin definir</option>
                  {TIPOS_FORMACION.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_FORMACION_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ms-label block mb-1.5">Integrantes en escena</label>
                <input
                  type="number"
                  min={1}
                  className="ms-input w-full"
                  value={form.integrantesNum}
                  onChange={(e) => set("integrantesNum", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="ms-label block mb-1.5">Cliente que lo contrata o representa</label>
              <Combobox
                value={form.clienteId}
                onChange={(v) => set("clienteId", v)}
                options={[
                  { value: "", label: "Sin cliente" },
                  ...clientes.map((c) => ({
                    value: c.id,
                    label: c.empresa ? `${c.nombre} — ${c.empresa}` : c.nombre,
                  })),
                ]}
                placeholder="Sin cliente"
              />
            </div>

            <div>
              <label className="ms-label block mb-1.5">Bio corta</label>
              <textarea
                className="ms-textarea w-full"
                rows={2}
                placeholder="Una o dos líneas: encabeza propuestas y el libro de gira."
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
              />
            </div>
          </section>

          <section className="ms-card p-4 space-y-4">
            <p className="ms-section-label">Contacto de management</p>
            <p className="ms-micro">
              Es el contacto comercial del artista. Las personas de producción (tour manager, FOH, músicos) viven en{" "}
              <Link href={`/giras/artista/${artista.id}/personas`} className="ms-link-gold">
                Personas
              </Link>
              .
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Nombre</label>
                <input
                  className="ms-input w-full"
                  value={form.contactoNombre}
                  onChange={(e) => set("contactoNombre", e.target.value)}
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Teléfono</label>
                <input
                  className="ms-input w-full"
                  value={form.contactoTelefono}
                  onChange={(e) => set("contactoTelefono", e.target.value)}
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Correo</label>
                <input
                  type="email"
                  className="ms-input w-full"
                  value={form.contactoEmail}
                  onChange={(e) => set("contactoEmail", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Instagram</label>
                <input
                  className="ms-input w-full"
                  placeholder="@artista"
                  value={form.instagram}
                  onChange={(e) => set("instagram", e.target.value)}
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Sitio web</label>
                <input
                  className="ms-input w-full"
                  placeholder="https://…"
                  value={form.sitioWeb}
                  onChange={(e) => set("sitioWeb", e.target.value)}
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">TikTok</label>
                <input
                  className="ms-input w-full"
                  placeholder="@artista"
                  value={form.tiktok}
                  onChange={(e) => set("tiktok", e.target.value)}
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">YouTube</label>
                <input
                  className="ms-input w-full"
                  placeholder="https://…"
                  value={form.youtube}
                  onChange={(e) => set("youtube", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="ms-label block mb-1.5">Spotify</label>
                <input
                  className="ms-input w-full"
                  placeholder="https://open.spotify.com/artist/…"
                  value={form.spotify}
                  onChange={(e) => set("spotify", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="ms-card p-4 space-y-3">
            <p className="ms-section-label">Notas</p>
            <textarea
              className="ms-textarea w-full"
              rows={4}
              placeholder="Lo que conviene saber antes de operarle: mañas, acuerdos, antecedentes…"
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
            />
          </section>
        </div>

        <div className="space-y-4">
          <section className="ms-card p-4 space-y-3">
            <p className="ms-section-label">Logo</p>
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logoUrl}
                alt=""
                className="w-full aspect-square object-cover rounded-xl border border-[#1e1e1e] bg-[#0d0d0d]"
              />
            ) : (
              <div className="w-full aspect-square rounded-xl border border-dashed border-[#252525] bg-[#0d0d0d] flex items-center justify-center">
                <span className="ms-micro">Sin logo</span>
              </div>
            )}
            <input
              className="ms-input w-full"
              placeholder="https://…"
              value={form.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
            />
            <p className="ms-micro">Encabeza riders, input lists y day sheets.</p>
          </section>

          <section className="ms-card p-4 space-y-3">
            <p className="ms-section-label">Equipo de representación</p>
            {representacion.length === 0 ? (
              <p className="ms-meta">
                Sin manager, booking o tour manager capturado.{" "}
                <Link href={`/giras/artista/${artista.id}/personas`} className="ms-link-gold">
                  Agregar en Personas
                </Link>
                .
              </p>
            ) : (
              <div className="divide-y divide-[#1a1a1a] -mx-4">
                {representacion.map((r) => (
                  <div key={r.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] text-white truncate">{r.nombre}</p>
                      <span className="ms-badge ms-badge-gray shrink-0">
                        {ROL_PERSONA_LABEL[r.rol] ?? r.rol}
                      </span>
                    </div>
                    <p className="ms-micro">{[r.telefono, r.email].filter(Boolean).join(" · ") || "Sin contacto"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="ms-card p-4 space-y-3">
            <p className="ms-section-label">Shows y giras del artista</p>
            {giras.length === 0 ? (
              <p className="ms-meta">Todavía no tiene shows ni giras registrados.</p>
            ) : (
              <div className="divide-y divide-[#1a1a1a] -mx-4">
                {giras.map((g) => (
                  <Link
                    key={g.id}
                    href={`/giras/${g.id}`}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-[#161616] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] text-white truncate">{g.nombre}</p>
                      <p className="ms-micro">
                        {fmtRango(g.fechaInicio, g.fechaFin)}
                        {esGira(g.tipo) ? ` · ${g.shows} ${g.shows === 1 ? "show" : "shows"}` : " · Show suelto"}
                      </p>
                    </div>
                    <span className={`ms-badge shrink-0 ${ESTADO_GIRA_COLOR[g.estado] ?? ""}`}>
                      {estadoRegistroLabel(g.estado, g.tipo)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="ms-card p-4 space-y-2">
            <p className="ms-section-label">Baja del catálogo</p>
            <p className="ms-micro">
              El artista se oculta del catálogo pero no se borra: sus riders, shows y propuestas quedan intactos.
            </p>
            <button onClick={darDeBaja} className="ms-btn-danger">
              Dar de baja
            </button>
          </section>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={guardar} disabled={guardando || !sucio} className="ms-btn-primary disabled:opacity-40">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        {sucio && (
          <button onClick={() => setForm(original)} className="ms-btn-ghost">
            Descartar
          </button>
        )}
        {!sucio && <span className="ms-micro">Sin cambios por guardar.</span>}
      </div>
    </div>
  );
}
