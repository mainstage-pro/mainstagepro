"use client";

/**
 * A quién llamar: el directorio que viaja dentro del rider.
 *
 * Dos vías para poblarlo, porque son dos momentos distintos:
 *
 *  · El crew que ya está en la ficha del artista se agrega renglón por renglón
 *    con su botón. El renglón queda ligado a la persona, así que corregir su
 *    celular aquí lo corrige en todos los riders, en el crew de las giras y en
 *    los shows. La constancia de lo que decía el rider cuando se mandó es el
 *    PDF ya generado, no esta tabla.
 *  · El ingeniero contratado solo para esta gira se captura suelto. Si se marca
 *    «guardar también en el artista» se da de alta en el crew, pero no es
 *    obligatorio: nadie abandona la captura para ir a registrarlo, y después se
 *    puede dar de alta desde su propio renglón.
 *
 * El interruptor «en PDF» decide si el contacto sale en el documento. Sirve para
 * tener el teléfono del manager a mano sin publicárselo al promotor.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { ROLES_EN_ESCENA, ROLES_PERSONA, ROL_PERSONA_LABEL } from "@/lib/giras";

export interface ContactoFila {
  id: string;
  personaId: string | null;
  nombre: string;
  rol: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  enPdf: boolean;
  orden: number;
}

export interface PersonaDisponible {
  id: string;
  nombre: string;
  rol: string;
  instrumento: string | null;
  telefono: string | null;
  email: string | null;
}

interface Props {
  artistaId: string;
  riderId: string;
  contactosIniciales: ContactoFila[];
  personas: PersonaDisponible[];
}

type Campos = Partial<Record<keyof ContactoFila, unknown>>;

const DEMORA_GUARDADO = 700;

/// El orden en que el venue busca a alguien cuando algo se mueve.
const ROLES_SUGERIDOS = ["TOUR_MANAGER", "PRODUCTION_MANAGER", "FOH", "MONITORES"];

const NUEVO_VACIO = { nombre: "", rol: "FOH", telefono: "", email: "", alCrew: true };

export default function ContactosRiderClient({ artistaId, riderId, contactosIniciales, personas }: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [contactos, setContactos] = useState<ContactoFila[]>(contactosIniciales);
  const [crew, setCrew] = useState<PersonaDisponible[]>(personas);
  const [nuevo, setNuevo] = useState<typeof NUEVO_VACIO | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [guardados, setGuardados] = useState<Set<string>>(new Set());

  const pendientes = useRef(new Map<string, Campos>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  async function descargar(contactoId: string) {
    const campos = pendientes.current.get(contactoId);
    pendientes.current.delete(contactoId);
    const t = timers.current.get(contactoId);
    if (t) clearTimeout(t);
    timers.current.delete(contactoId);
    if (!campos) return;

    const res = await fetch(`/api/artista-riders/${riderId}/contactos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contactoId, ...campos }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar el contacto");
      return;
    }
    setGuardados((prev) => new Set(prev).add(contactoId));
    setTimeout(
      () =>
        setGuardados((prev) => {
          const s = new Set(prev);
          s.delete(contactoId);
          return s;
        }),
      1500,
    );
  }

  function editar(contactoId: string, campos: Campos, inmediato = false) {
    setContactos((prev) => prev.map((c) => (c.id === contactoId ? ({ ...c, ...campos } as ContactoFila) : c)));
    pendientes.current.set(contactoId, { ...(pendientes.current.get(contactoId) ?? {}), ...campos });
    const t = timers.current.get(contactoId);
    if (t) clearTimeout(t);
    if (inmediato) {
      void descargar(contactoId);
      return;
    }
    timers.current.set(contactoId, setTimeout(() => void descargar(contactoId), DEMORA_GUARDADO));
  }

  async function agregarDelCrew(p: PersonaDisponible) {
    setTrabajando(p.id);
    try {
      const res = await fetch(`/api/artista-riders/${riderId}/contactos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: p.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar");
        return;
      }
      setContactos((prev) => [...prev, d.contacto]);
    } finally {
      setTrabajando(null);
    }
  }

  async function agregarNuevo() {
    if (!nuevo || !nuevo.nombre.trim()) return;
    setTrabajando("nuevo");
    try {
      // Si se pide, primero entra al crew del artista y el contacto del rider
      // queda ligado a esa persona; si falla, el contacto se crea suelto igual.
      let personaId: string | null = null;
      if (nuevo.alCrew) {
        const resP = await fetch(`/api/artistas/${artistaId}/personas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nuevo.nombre.trim(),
            rol: nuevo.rol,
            telefono: nuevo.telefono.trim() || null,
            email: nuevo.email.trim() || null,
            esIntegrante: ROLES_EN_ESCENA.includes(nuevo.rol),
          }),
        });
        const dP = await resP.json().catch(() => ({}));
        if (resP.ok && dP.persona) {
          personaId = dP.persona.id;
          setCrew((prev) => [...prev, dP.persona]);
        } else {
          toast.error("No se pudo dar de alta en el crew; se agrega solo al rider.");
        }
      }

      const res = await fetch(`/api/artista-riders/${riderId}/contactos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          personaId
            ? { personaId }
            : {
                nombre: nuevo.nombre.trim(),
                rol: nuevo.rol,
                telefono: nuevo.telefono.trim() || null,
                email: nuevo.email.trim() || null,
              },
        ),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar");
        return;
      }
      setContactos((prev) => [...prev, d.contacto]);
      setNuevo({ ...NUEVO_VACIO, rol: nuevo.rol, alCrew: nuevo.alCrew });
    } finally {
      setTrabajando(null);
    }
  }

  // Promover un contacto suelto al directorio del artista, sin salir de aquí: a
  // partir de ese momento su teléfono se corrige una vez para todos lados.
  async function darDeAlta(c: ContactoFila) {
    setTrabajando(c.id);
    try {
      // Si se acaba de teclear el nombre, el guardado diferido todavía no llegó
      // a la BD y la persona nacería con el nombre viejo.
      await descargar(c.id);
      const res = await fetch(`/api/artista-riders/${riderId}/contactos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, accion: "alta-directorio" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo dar de alta");
        return;
      }
      setContactos((prev) => prev.map((x) => (x.id === c.id ? d.contacto : x)));
      if (d.contacto?.persona) {
        setCrew((prev) => [...prev, { ...d.contacto.persona, instrumento: null }]);
      }
      toast.success(`${d.contacto.nombre} entró al crew del artista`);
    } finally {
      setTrabajando(null);
    }
  }

  async function quitar(c: ContactoFila) {
    const ok = await confirm({
      message: `¿Quitar a «${c.nombre}» de este rider? Sigue en el crew del artista.`,
      danger: true,
      confirmText: "Quitar del rider",
    });
    if (!ok) return;
    const res = await fetch(`/api/artista-riders/${riderId}/contactos?id=${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar");
      return;
    }
    setContactos((prev) => prev.filter((x) => x.id !== c.id));
  }

  const yaEnRider = useMemo(
    () => new Set(contactos.map((c) => c.personaId).filter((x): x is string => Boolean(x))),
    [contactos],
  );
  const disponibles = crew.filter((p) => !yaEnRider.has(p.id));
  const enPdf = contactos.filter((c) => c.enPdf).length;

  // El rider que no dice a quién llamar obliga al venue a adivinar.
  const faltanClave = ROLES_SUGERIDOS.filter((r) => !contactos.some((c) => c.rol === r));

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">A quién llamar</h2>
          <p className="ms-subtitle mt-1">
            El directorio que viaja dentro del rider: tour manager, FOH, monitores, luces, video y quien más resuelva.
            Lo que está ligado al crew del artista se edita aquí o allá y queda corregido en los dos lados.
          </p>
        </div>
        <button className="ms-btn-primary" onClick={() => setNuevo((n) => (n ? null : { ...NUEVO_VACIO }))}>
          {nuevo ? "Cerrar" : "Contacto que no está en el crew"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label">En el rider</p>
          <p className="text-xl font-semibold mt-1 text-white">{contactos.length}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Salen en el PDF</p>
          <p className="text-xl font-semibold mt-1 text-[#B3985B]">{enPdf}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Crew del artista sin agregar</p>
          <p className="text-xl font-semibold mt-1 text-white">{disponibles.length}</p>
        </div>
      </div>

      {nuevo && (
        <div className="ms-card-deep p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_150px_1fr_auto] gap-2 items-end">
            <div>
              <label className="ms-label block mb-1">Nombre</label>
              <input
                autoFocus
                className="ms-input-inline w-full"
                placeholder="ej. Gerardo Lara"
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void agregarNuevo();
                }}
              />
            </div>
            <div>
              <label className="ms-label block mb-1">Rol</label>
              <select
                className="ms-input-inline w-full"
                value={nuevo.rol}
                onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}
              >
                {ROLES_PERSONA.map((r) => (
                  <option key={r} value={r}>
                    {ROL_PERSONA_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ms-label block mb-1">Teléfono</label>
              <input
                className="ms-input-inline w-full"
                placeholder="…"
                value={nuevo.telefono}
                onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
              />
            </div>
            <div>
              <label className="ms-label block mb-1">Correo</label>
              <input
                type="email"
                className="ms-input-inline w-full"
                placeholder="…"
                value={nuevo.email}
                onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
              />
            </div>
            <button
              onClick={() => void agregarNuevo()}
              disabled={trabajando === "nuevo" || !nuevo.nombre.trim()}
              className="ms-btn-primary disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
          <label className="flex items-center gap-2 ms-micro cursor-pointer">
            <input
              type="checkbox"
              className="accent-[#B3985B] w-3.5 h-3.5"
              checked={nuevo.alCrew}
              onChange={(e) => setNuevo({ ...nuevo, alCrew: e.target.checked })}
            />
            Darlo de alta también en el crew del artista, para que esté disponible en los riders que vengan
          </label>
        </div>
      )}

      {contactos.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            Este rider no dice a quién llamar. Agrega al tour manager y al ingeniero de FOH desde el crew de abajo.
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left w-[180px]">Rol</th>
                <th className="ms-th text-left w-[220px]">Nombre</th>
                <th className="ms-th text-left w-[150px]">Teléfono</th>
                <th className="ms-th text-left w-[220px]">Correo</th>
                <th className="ms-th text-left w-[200px]">Notas</th>
                <th className="ms-th text-center w-[80px]">En PDF</th>
                <th className="ms-th w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {contactos.map((c) => (
                <tr
                  key={c.id}
                  className={`ms-tr align-top border-l-2 ${c.personaId ? "border-l-[#B3985B]" : "border-l-transparent"}`}
                >
                  <td className="ms-td">
                    <select
                      className="ms-input-inline w-full"
                      value={c.rol}
                      onChange={(e) => editar(c.id, { rol: e.target.value }, true)}
                    >
                      {ROLES_PERSONA.map((r) => (
                        <option key={r} value={r}>
                          {ROL_PERSONA_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      value={c.nombre}
                      onChange={(e) => editar(c.id, { nombre: e.target.value })}
                    />
                    {guardados.has(c.id) && <span className="ms-micro text-emerald-400">guardado</span>}
                    {c.personaId ? (
                      <span className="ms-micro">ficha del artista · lo que corrijas aquí se corrige en todos lados</span>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="ms-micro">suelto, vive solo en este rider</span>
                        <button
                          onClick={() => void darDeAlta(c)}
                          disabled={trabajando === c.id}
                          title="Entra al crew del artista y queda disponible en los demás riders, en las giras y en los shows"
                          className="text-xs border border-[#333] px-2 py-0.5 rounded hover:border-[#B3985B] disabled:opacity-50"
                        >
                          Dar de alta
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="…"
                      value={c.telefono ?? ""}
                      onChange={(e) => editar(c.id, { telefono: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      type="email"
                      className="ms-input-inline w-full"
                      placeholder="…"
                      value={c.email ?? ""}
                      onChange={(e) => editar(c.id, { email: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="ej. llega un día antes"
                      value={c.notas ?? ""}
                      onChange={(e) => editar(c.id, { notas: e.target.value })}
                    />
                  </td>
                  <td className="ms-td text-center">
                    <input
                      type="checkbox"
                      className="accent-[#B3985B] w-4 h-4"
                      checked={c.enPdf}
                      onChange={(e) => editar(c.id, { enPdf: e.target.checked }, true)}
                      title="Sale impreso en el rider"
                    />
                  </td>
                  <td className="ms-td text-right">
                    <button
                      onClick={() => void quitar(c)}
                      className="text-[#555] hover:text-red-400 transition-colors"
                      title="Quitar del rider"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {faltanClave.length > 0 && contactos.length > 0 && (
        <p className="ms-micro text-amber-300">
          Falta quién atiende {faltanClave.map((r) => ROL_PERSONA_LABEL[r]).join(", ")}. Si el artista no trae a esa
          persona está bien; si sí la trae y no está aquí, el venue va a adivinar.
        </p>
      )}

      <section className="ms-card p-4 space-y-3">
        <div>
          <p className="ms-section-label">Crew del artista</p>
          <p className="ms-micro mt-0.5">
            Cada quien se agrega por su renglón, con el teléfono y el correo que ya tiene en su ficha.{" "}
            <Link href={`/giras/artista/${artistaId}/personas`} className="ms-link-gold">
              Editar el crew
            </Link>
          </p>
        </div>

        {disponibles.length === 0 ? (
          <p className="ms-micro">
            {crew.length === 0
              ? "El artista no tiene crew registrado todavía."
              : "Todo el crew del artista ya está en este rider."}
          </p>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {disponibles.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="text-[13px] text-white min-w-[160px]">{p.nombre}</span>
                <span className="ms-badge ms-badge-gray">{ROL_PERSONA_LABEL[p.rol] ?? p.rol}</span>
                <span className="ms-micro">
                  {[p.instrumento, p.telefono, p.email].filter(Boolean).join(" · ") || "sin datos de contacto"}
                </span>
                <button
                  onClick={() => void agregarDelCrew(p)}
                  disabled={trabajando === p.id}
                  className="ms-btn-secondary ml-auto disabled:opacity-50"
                >
                  Agregar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="ms-micro">
        Cada celda se guarda sola al dejar de escribir. Quitar un contacto de aquí no lo borra del crew del artista.
      </p>
    </div>
  );
}
