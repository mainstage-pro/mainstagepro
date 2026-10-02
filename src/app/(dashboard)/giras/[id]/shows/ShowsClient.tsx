"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VenuePicker from "@/components/ui/VenuePicker";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import {
  ESTADOS_SHOW,
  ESTADO_SHOW_COLOR,
  ESTADO_SHOW_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  TIPOS_SHOW,
  TIPO_SHOW_LABEL,
  diasRestantes,
  fechaInput,
  fmtDiasRestantes,
  fmtFechaCorta,
} from "@/lib/giras";

export interface PlazaEditable {
  id: string;
  fecha: string;
  ciudad: string | null;
  venueId: string | null;
  venueNombre: string | null;
  venueCapacidad: number | null;
  estado: string;
  tipoShow: string | null;
  aforoEsperado: number | null;
  promotorNombre: string | null;
  promotorContacto: string | null;
  promotorTelefono: string | null;
  promotorEmail: string | null;
  contactoCasaNombre: string | null;
  contactoCasaTelefono: string | null;
  contactoCasaEmail: string | null;
  notas: string | null;
  riderEnviado: boolean;
  crew: number;
  bloques: number;
  renglones: number;
  avance: number;
  semaforo: string;
  indispensablesAbiertos: number;
}

interface Borrador {
  fecha: string;
  ciudad: string;
  venueId: string | null;
  venueNombre: string;
  estado: string;
  tipoShow: string;
  aforoEsperado: string;
  promotorNombre: string;
  promotorContacto: string;
  promotorTelefono: string;
  promotorEmail: string;
  contactoCasaNombre: string;
  contactoCasaTelefono: string;
  contactoCasaEmail: string;
  notas: string;
}

function aBorrador(p: PlazaEditable): Borrador {
  return {
    fecha: fechaInput(p.fecha),
    ciudad: p.ciudad ?? "",
    venueId: p.venueId,
    venueNombre: p.venueNombre ?? "",
    estado: p.estado,
    tipoShow: p.tipoShow ?? "",
    aforoEsperado: p.aforoEsperado?.toString() ?? "",
    promotorNombre: p.promotorNombre ?? "",
    promotorContacto: p.promotorContacto ?? "",
    promotorTelefono: p.promotorTelefono ?? "",
    promotorEmail: p.promotorEmail ?? "",
    contactoCasaNombre: p.contactoCasaNombre ?? "",
    contactoCasaTelefono: p.contactoCasaTelefono ?? "",
    contactoCasaEmail: p.contactoCasaEmail ?? "",
    notas: p.notas ?? "",
  };
}

const NUEVA: Borrador = {
  fecha: "",
  ciudad: "",
  venueId: null,
  venueNombre: "",
  estado: "POR_CONFIRMAR",
  tipoShow: "HEADLINE",
  aforoEsperado: "",
  promotorNombre: "",
  promotorContacto: "",
  promotorTelefono: "",
  promotorEmail: "",
  contactoCasaNombre: "",
  contactoCasaTelefono: "",
  contactoCasaEmail: "",
  notas: "",
};

function cuerpo(b: Borrador) {
  return {
    fecha: b.fecha,
    ciudad: b.ciudad,
    venueId: b.venueId,
    estado: b.estado,
    tipoShow: b.tipoShow || null,
    aforoEsperado: b.aforoEsperado === "" ? null : Number(b.aforoEsperado),
    promotorNombre: b.promotorNombre,
    promotorContacto: b.promotorContacto,
    promotorTelefono: b.promotorTelefono,
    promotorEmail: b.promotorEmail,
    contactoCasaNombre: b.contactoCasaNombre,
    contactoCasaTelefono: b.contactoCasaTelefono,
    contactoCasaEmail: b.contactoCasaEmail,
    notas: b.notas,
  };
}

export default function ShowsClient({ giraId, plazas }: { giraId: string; plazas: PlazaEditable[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirmar = useConfirm();

  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(NUEVA);
  const [nueva, setNueva] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);

  function abrir(p: PlazaEditable) {
    setNueva(null);
    setEditando(p.id);
    setBorrador(aBorrador(p));
  }

  async function guardar(id: string) {
    if (!borrador.fecha) {
      toast.error("La plaza necesita fecha.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/gira-shows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo(borrador)),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo guardar la plaza.");
        return;
      }
      toast.success("Plaza actualizada");
      setEditando(null);
      router.refresh();
    } catch {
      toast.error("No se pudo guardar la plaza.");
    } finally {
      setGuardando(false);
    }
  }

  async function crear() {
    if (!nueva?.fecha) {
      toast.error("La plaza necesita fecha.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/giras/${giraId}/shows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo(nueva)),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar la plaza.");
        return;
      }
      toast.success("Plaza agregada");
      setNueva(null);
      router.refresh();
    } catch {
      toast.error("No se pudo agregar la plaza.");
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(p: PlazaEditable) {
    const ok = await confirmar({
      title: "Quitar la plaza",
      message:
        p.renglones > 0 || p.crew > 0 || p.bloques > 0
          ? `Se borran también sus ${p.renglones} renglones de advance, ${p.crew} de crew y ${p.bloques} bloques del día. No se puede deshacer.`
          : "La plaza se borra de la gira. No se puede deshacer.",
      confirmText: "Quitar plaza",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/gira-shows/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar la plaza.");
      return;
    }
    toast.success("Plaza eliminada");
    setEditando(null);
    router.refresh();
  }

  function campos(b: Borrador, set: (patch: Partial<Borrador>) => void) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="ms-label block mb-1.5">Fecha</label>
            <input type="date" value={b.fecha} onChange={(e) => set({ fecha: e.target.value })} className="ms-input" />
          </div>
          <div>
            <label className="ms-label block mb-1.5">Ciudad</label>
            <input
              value={b.ciudad}
              onChange={(e) => set({ ciudad: e.target.value })}
              placeholder="ej. Monterrey"
              className="ms-input"
            />
          </div>
          <div>
            <label className="ms-label block mb-1.5">Tipo de show</label>
            <select value={b.tipoShow} onChange={(e) => set({ tipoShow: e.target.value })} className="ms-input">
              <option value="">Sin definir</option>
              {TIPOS_SHOW.map((t) => (
                <option key={t} value={t}>
                  {TIPO_SHOW_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ms-label block mb-1.5">Estado</label>
            <select value={b.estado} onChange={(e) => set({ estado: e.target.value })} className="ms-input">
              {ESTADOS_SHOW.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_SHOW_LABEL[e]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
          <VenuePicker
            label="Venue del catálogo"
            value={b.venueNombre}
            venueId={b.venueId}
            onChange={(nombre, venueId, venue) =>
              set({
                venueNombre: nombre,
                venueId,
                // La ciudad sigue siendo editable; solo se siembra si estaba vacía.
                ...(venue?.ciudad && !b.ciudad ? { ciudad: venue.ciudad } : {}),
              })
            }
          />
          <div>
            <label className="ms-label block mb-1.5">Aforo esperado</label>
            <input
              type="number"
              min={0}
              value={b.aforoEsperado}
              onChange={(e) => set({ aforoEsperado: e.target.value })}
              placeholder="Personas"
              className="ms-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="ms-micro text-[#B3985B]">Promotor</p>
            <input
              value={b.promotorNombre}
              onChange={(e) => set({ promotorNombre: e.target.value })}
              placeholder="Empresa o promotor"
              className="ms-input"
            />
            <input
              value={b.promotorContacto}
              onChange={(e) => set({ promotorContacto: e.target.value })}
              placeholder="Persona de contacto"
              className="ms-input"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={b.promotorTelefono}
                onChange={(e) => set({ promotorTelefono: e.target.value })}
                placeholder="Teléfono"
                className="ms-input"
              />
              <input
                value={b.promotorEmail}
                onChange={(e) => set({ promotorEmail: e.target.value })}
                placeholder="Correo"
                className="ms-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="ms-micro text-[#B3985B]">Contacto de la casa</p>
            <input
              value={b.contactoCasaNombre}
              onChange={(e) => set({ contactoCasaNombre: e.target.value })}
              placeholder="Nombre"
              className="ms-input"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={b.contactoCasaTelefono}
                onChange={(e) => set({ contactoCasaTelefono: e.target.value })}
                placeholder="Teléfono"
                className="ms-input"
              />
              <input
                value={b.contactoCasaEmail}
                onChange={(e) => set({ contactoCasaEmail: e.target.value })}
                placeholder="Correo"
                className="ms-input"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="ms-label block mb-1.5">Notas de la plaza</label>
          <textarea
            value={b.notas}
            onChange={(e) => set({ notas: e.target.value })}
            rows={2}
            className="ms-textarea"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="ms-h2">Plazas</h2>
          <p className="ms-subtitle mt-0.5">
            Se ordenan solas por fecha. Los horarios del día se capturan en el resumen de cada plaza.
          </p>
        </div>
        <button
          onClick={() => {
            setEditando(null);
            setNueva(NUEVA);
          }}
          className="ms-btn-primary"
        >
          Agregar plaza
        </button>
      </div>

      {nueva && (
        <section className="ms-card border-[#B3985B]/30 p-4">
          <h3 className="ms-section-label mb-3.5">Plaza nueva</h3>
          {campos(nueva, (patch) => setNueva((p) => ({ ...(p ?? NUEVA), ...patch })))}
          <div className="flex items-center gap-2 mt-3.5">
            <button onClick={crear} disabled={guardando} className="ms-btn-primary disabled:opacity-50">
              {guardando ? "Agregando…" : "Agregar plaza"}
            </button>
            <button onClick={() => setNueva(null)} className="ms-btn-ghost">
              Cancelar
            </button>
          </div>
        </section>
      )}

      {plazas.length === 0 && !nueva ? (
        <div className="ms-card px-4 py-10 text-center">
          <p className="ms-meta">La gira todavía no tiene plazas. Agrega la primera para empezar el advance.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plazas.map((p, i) => {
            const abierto = editando === p.id;
            const dias = diasRestantes(p.fecha);
            return (
              <section key={p.id} className={`ms-card ${abierto ? "border-[#B3985B]/30" : ""}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 px-4 py-3">
                  <span className="ms-micro text-[#555] tabular-nums shrink-0 w-6">{i + 1}</span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-white truncate">
                      {fmtFechaCorta(p.fecha)} · {p.ciudad ?? "Sin ciudad"}
                      {p.venueNombre ? ` · ${p.venueNombre}` : " · Sin venue"}
                    </p>
                    <p className="ms-meta truncate mt-0.5">
                      {fmtDiasRestantes(dias)}
                      {p.tipoShow ? ` · ${TIPO_SHOW_LABEL[p.tipoShow] ?? p.tipoShow}` : ""}
                      {p.aforoEsperado ? ` · ${p.aforoEsperado.toLocaleString("es-MX")} pax` : ""}
                      {p.promotorNombre ? ` · ${p.promotorNombre}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ESTADO_SHOW_COLOR[p.estado] ?? ""}`}>
                      {ESTADO_SHOW_LABEL[p.estado] ?? p.estado}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${SEMAFORO_COLOR[p.semaforo] ?? ""}`}>
                      {p.renglones ? `Advance ${p.avance}%` : SEMAFORO_LABEL[p.semaforo]}
                    </span>
                    <Link
                      href={`/giras/${giraId}/show/${p.id}`}
                      className="ms-micro text-[#B3985B] hover:text-white transition-colors"
                    >
                      Abrir plaza →
                    </Link>
                    <button
                      onClick={() => (abierto ? setEditando(null) : abrir(p))}
                      className="ms-micro text-[#6b7280] hover:text-white transition-colors"
                    >
                      {abierto ? "Cerrar" : "Editar"}
                    </button>
                  </div>
                </div>

                {abierto && (
                  <div className="px-4 pb-4 pt-1 border-t border-[#1a1a1a]">
                    {campos(borrador, (patch) => setBorrador((b) => ({ ...b, ...patch })))}
                    <div className="flex flex-wrap items-center gap-2 mt-3.5">
                      <button onClick={() => guardar(p.id)} disabled={guardando} className="ms-btn-primary disabled:opacity-50">
                        {guardando ? "Guardando…" : "Guardar plaza"}
                      </button>
                      <button onClick={() => setEditando(null)} className="ms-btn-ghost">
                        Cancelar
                      </button>
                      <button onClick={() => quitar(p)} className="ms-btn-ghost text-red-400/80 hover:text-red-300 ml-auto">
                        Quitar plaza
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
