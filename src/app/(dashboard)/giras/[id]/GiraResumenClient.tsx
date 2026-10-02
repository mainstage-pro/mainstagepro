"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/Combobox";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  ESTADOS_GIRA,
  ESTADO_GIRA_LABEL,
  ESTADO_SHOW_COLOR,
  ESTADO_SHOW_LABEL,
  ROL_PERSONA_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  TIPO_SHOW_LABEL,
  fechaInput,
  fmtFechaCorta,
} from "@/lib/giras";

export interface PlazaResumen {
  id: string;
  fecha: string;
  ciudad: string | null;
  venue: string | null;
  estado: string;
  tipoShow: string | null;
  riderEnviado: boolean;
  crew: number;
  avance: number;
  semaforo: string;
  indispensablesAbiertos: number;
  renglones: number;
}

export interface GiraDetalle {
  id: string;
  nombre: string;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  artistaId: string;
  artistaNombre: string;
  clienteId: string | null;
  riderId: string | null;
  contactoPrincipalId: string | null;
  rolMainstage: string | null;
  moneda: string;
  notas: string | null;
  rider: {
    id: string;
    nombre: string;
    version: number;
    esActivo: boolean;
    formacion: string | null;
    canalesMinimos: number | null;
    mixesMonitor: number | null;
    tiempoSoundcheckMin: number | null;
    lineas: number;
    canales: number;
  } | null;
}

interface Persona {
  id: string;
  nombre: string;
  rol: string;
  telefono: string | null;
  email: string | null;
}

interface Props {
  gira: GiraDetalle;
  plazas: PlazaResumen[];
  artistas: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string; empresa: string | null }[];
  riders: { id: string; nombre: string; version: number; esActivo: boolean }[];
  personas: Persona[];
  servicios: { clave: string; nombre: string; categoria: string | null }[];
}

function parseRoles(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function GiraResumenClient({ gira, plazas, artistas, clientes, riders, personas, servicios }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirmar = useConfirm();

  const [form, setForm] = useState({
    nombre: gira.nombre,
    estado: gira.estado,
    fechaInicio: fechaInput(gira.fechaInicio),
    fechaFin: fechaInput(gira.fechaFin),
    artistaId: gira.artistaId,
    clienteId: gira.clienteId ?? "",
    riderId: gira.riderId ?? "",
    contactoPrincipalId: gira.contactoPrincipalId ?? "",
    rolMainstage: parseRoles(gira.rolMainstage),
    notas: gira.notas ?? "",
  });
  const [guardando, setGuardando] = useState(false);

  // Las fechas de la gira son editables, pero si no cuadran con las plazas hay
  // que decirlo: es el error que descuadra viajes y hoteles.
  const derivadas = useMemo(() => {
    if (plazas.length === 0) return null;
    return { inicio: plazas[0].fecha.slice(0, 10), fin: plazas[plazas.length - 1].fecha.slice(0, 10) };
  }, [plazas]);

  const descuadre =
    derivadas && (form.fechaInicio !== derivadas.inicio || form.fechaFin !== derivadas.fin)
      ? `Las plazas van del ${fmtFechaCorta(derivadas.inicio)} al ${fmtFechaCorta(derivadas.fin)}.`
      : null;

  const contacto = personas.find((p) => p.id === form.contactoPrincipalId) ?? null;

  async function guardar() {
    if (!form.nombre.trim()) {
      toast.error("La gira necesita nombre.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/giras/${gira.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          estado: form.estado,
          fechaInicio: form.fechaInicio || null,
          fechaFin: form.fechaFin || null,
          artistaId: form.artistaId,
          clienteId: form.clienteId || null,
          riderId: form.riderId || null,
          contactoPrincipalId: form.contactoPrincipalId || null,
          rolMainstage: form.rolMainstage,
          notas: form.notas,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Gira actualizada");
      router.refresh();
    } catch {
      toast.error("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function archivar() {
    const ok = await confirmar({
      title: "Archivar la gira",
      message: "La gira deja de aparecer en la lista. Sus plazas, advance y documentos se conservan.",
      confirmText: "Archivar",
    });
    if (!ok) return;
    const res = await fetch(`/api/giras/${gira.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo archivar.");
      return;
    }
    toast.success("Gira archivada");
    router.push("/giras/lista");
  }

  function toggleRol(clave: string) {
    setForm((p) => ({
      ...p,
      rolMainstage: p.rolMainstage.includes(clave)
        ? p.rolMainstage.filter((c) => c !== clave)
        : [...p.rolMainstage, clave],
    }));
  }

  return (
    <div className="ms-page space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="ms-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <h2 className="ms-section-label">Ficha de la gira</h2>
            <button onClick={guardar} disabled={guardando} className="ms-btn-primary disabled:opacity-50">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
              <div>
                <label className="ms-label block mb-1.5">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="ms-input w-full"
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}
                  className="ms-input w-full"
                >
                  {ESTADOS_GIRA.map((e) => (
                    <option key={e} value={e}>
                      {ESTADO_GIRA_LABEL[e]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Primera fecha</label>
                <input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) => setForm((p) => ({ ...p, fechaInicio: e.target.value }))}
                  className="ms-input w-full"
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Última fecha</label>
                <input
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) => setForm((p) => ({ ...p, fechaFin: e.target.value }))}
                  className="ms-input w-full"
                />
              </div>
            </div>

            {descuadre && derivadas && (
              <div className="flex flex-wrap items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <p className="text-amber-300 text-xs flex-1 min-w-0">{descuadre}</p>
                <button
                  onClick={() => setForm((p) => ({ ...p, fechaInicio: derivadas.inicio, fechaFin: derivadas.fin }))}
                  className="ms-micro text-amber-300 hover:text-white transition-colors shrink-0"
                >
                  Usar las fechas de las plazas
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Artista</label>
                <Combobox
                  value={form.artistaId}
                  onChange={(v) => setForm((p) => ({ ...p, artistaId: v }))}
                  options={artistas.map((a) => ({ value: a.id, label: a.nombre }))}
                  placeholder="Elige el artista…"
                />
              </div>
              <div>
                <label className="ms-label block mb-1.5">Cliente que contrata</label>
                <Combobox
                  value={form.clienteId}
                  onChange={(v) => setForm((p) => ({ ...p, clienteId: v }))}
                  options={clientes.map((c) => ({
                    value: c.id,
                    label: c.empresa ? `${c.nombre} — ${c.empresa}` : c.nombre,
                  }))}
                  placeholder="Sin cliente"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="ms-label block mb-1.5">Rider maestro de la gira</label>
                <select
                  value={form.riderId}
                  onChange={(e) => setForm((p) => ({ ...p, riderId: e.target.value }))}
                  className="ms-input w-full"
                >
                  <option value="">Sin rider ligado</option>
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>
                      v{r.version} · {r.nombre}
                      {r.esActivo ? " (vigente)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ms-label block mb-1.5">Contacto principal del artista</label>
                <select
                  value={form.contactoPrincipalId}
                  onChange={(e) => setForm((p) => ({ ...p, contactoPrincipalId: e.target.value }))}
                  className="ms-input w-full"
                >
                  <option value="">Sin contacto</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — {ROL_PERSONA_LABEL[p.rol] ?? p.rol}
                    </option>
                  ))}
                </select>
                {contacto && (
                  <p className="ms-meta mt-1.5">
                    {[contacto.telefono, contacto.email].filter(Boolean).join(" · ") || "Sin teléfono ni correo capturado"}
                  </p>
                )}
                {personas.length === 0 && (
                  <p className="ms-meta mt-1.5">
                    El artista no tiene personas registradas.{" "}
                    <Link href={`/giras/artista/${gira.artistaId}`} className="ms-link-gold">
                      Capturarlas
                    </Link>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="ms-label block mb-1.5">Lo que asume Mainstage en esta gira</label>
              {servicios.length === 0 ? (
                <p className="ms-meta">
                  Todavía no hay catálogo de servicios de production management.{" "}
                  <Link href="/giras/propuestas" className="ms-link-gold">
                    Armarlo
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {servicios.map((s) => {
                    const activo = form.rolMainstage.includes(s.clave);
                    return (
                      <button
                        key={s.clave}
                        type="button"
                        onClick={() => toggleRol(s.clave)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                          activo
                            ? "bg-[#B3985B]/15 text-[#B3985B] border-[#B3985B]/40"
                            : "bg-white/5 text-[#9ca3af] border-white/10 hover:text-white"
                        }`}
                      >
                        {s.nombre}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="ms-label block mb-1.5">Notas de la gira</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
                rows={3}
                placeholder="Acuerdos, pendientes con el manager, lo que no cabe en otro campo…"
                className="ms-textarea w-full"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button onClick={archivar} className="ms-btn-ghost text-red-400/80 hover:text-red-300">
                Archivar gira
              </button>
            </div>
          </div>
        </section>

        <section className="ms-card p-4 h-fit">
          <h2 className="ms-section-label mb-3.5">Rider maestro vigente</h2>
          {gira.rider ? (
            <div className="space-y-2.5">
              <div>
                <p className="text-sm text-white">{gira.rider.nombre}</p>
                <p className="ms-meta mt-0.5">
                  Versión {gira.rider.version}
                  {gira.rider.esActivo ? " · vigente" : " · versión histórica"}
                  {gira.rider.formacion ? ` · ${gira.rider.formacion}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Renglones", valor: gira.rider.lineas },
                  { label: "Canales", valor: gira.rider.canales },
                  { label: "Mixes", valor: gira.rider.mixesMonitor ?? "—" },
                ].map((d) => (
                  <div key={d.label} className="ms-card-inset px-2.5 py-2">
                    <p className="ms-micro">{d.label}</p>
                    <p className="text-sm text-white tabular-nums mt-0.5">{d.valor}</p>
                  </div>
                ))}
              </div>

              {gira.rider.tiempoSoundcheckMin && (
                <p className="ms-meta">Soundcheck de {gira.rider.tiempoSoundcheckMin} min.</p>
              )}

              {!gira.rider.esActivo && (
                <p className="text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                  Esta gira quedó amarrada a una versión que ya no es la vigente del artista.
                </p>
              )}

              <Link href={`/giras/artista/${gira.artistaId}`} className="ms-btn-secondary block w-full text-center">
                Editar el rider del artista
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="ms-meta">
                La gira no tiene rider maestro ligado. Sin rider no hay de dónde derivar el advance de cada plaza.
              </p>
              <Link href={`/giras/artista/${gira.artistaId}`} className="ms-btn-secondary block w-full text-center">
                Armar el rider de {gira.artistaNombre}
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="ms-card">
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
          <div>
            <h2 className="ms-section-label">Plazas de la gira</h2>
            <p className="ms-meta mt-0.5">El porcentaje es de renglones indispensables resueltos</p>
          </div>
          <Link href={`/giras/${gira.id}/shows`} className="ms-micro text-[#B3985B] hover:text-white transition-colors">
            Editar plazas →
          </Link>
        </div>

        {plazas.length === 0 ? (
          <div className="px-4 py-8 text-center border-t border-[#1a1a1a]">
            <p className="ms-meta mb-3">La gira todavía no tiene plazas.</p>
            <Link href={`/giras/${gira.id}/shows`} className="ms-btn-primary">
              Agregar la primera plaza
            </Link>
          </div>
        ) : (
          plazas.map((p) => (
            <Link
              key={p.id}
              href={`/giras/${gira.id}/show/${p.id}`}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 border-t border-[#1a1a1a] hover:bg-[#161616] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-white truncate">
                  {fmtFechaCorta(p.fecha)} · {p.ciudad ?? "Sin ciudad"}
                  {p.venue ? ` · ${p.venue}` : " · Sin venue"}
                </p>
                <p className="ms-meta truncate mt-0.5">
                  {p.tipoShow ? `${TIPO_SHOW_LABEL[p.tipoShow] ?? p.tipoShow} · ` : ""}
                  {p.crew} en crew
                  {p.riderEnviado ? " · rider enviado" : " · rider sin enviar"}
                  {p.indispensablesAbiertos > 0 ? ` · ${p.indispensablesAbiertos} indispensables abiertos` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ESTADO_SHOW_COLOR[p.estado] ?? ""}`}>
                  {ESTADO_SHOW_LABEL[p.estado] ?? p.estado}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${SEMAFORO_COLOR[p.semaforo] ?? ""}`}>
                  {p.renglones ? `${p.avance}%` : SEMAFORO_LABEL[p.semaforo]}
                </span>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
