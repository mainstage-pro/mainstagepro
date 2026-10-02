"use client";

import { useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { coincide } from "@/lib/buscar";
import { ROLES_EN_ESCENA, ROLES_PERSONA, ROL_PERSONA_LABEL } from "@/lib/giras";

export interface PersonaFila {
  id: string;
  nombre: string;
  rol: string;
  instrumento: string | null;
  esIntegrante: boolean;
  esContactoClave: boolean;
  telefono: string | null;
  email: string | null;
  tallaPlayera: string | null;
  notasHospitalidad: string | null;
  notas: string | null;
  orden: number;
}

interface Props {
  artistaId: string;
  integrantesNum: number | null;
  personasIniciales: PersonaFila[];
}

type Campos = Partial<Record<keyof PersonaFila, unknown>>;

const DEMORA_GUARDADO = 700;

const NUEVA_VACIA = { nombre: "", rol: "MUSICO", instrumento: "" };

export default function PersonasArtistaClient({ artistaId, integrantesNum, personasIniciales }: Props) {
  const toast = useToast();
  const confirm = useConfirm();

  const [personas, setPersonas] = useState<PersonaFila[]>(personasIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [rolFiltro, setRolFiltro] = useState("");
  const [nueva, setNueva] = useState<typeof NUEVA_VACIA | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [guardadas, setGuardadas] = useState<Set<string>>(new Set());

  const pendientes = useRef(new Map<string, Campos>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // ── Guardado por renglón: cada persona es su propia fila editable ──────────
  async function descargar(personaId: string) {
    const campos = pendientes.current.get(personaId);
    pendientes.current.delete(personaId);
    const t = timers.current.get(personaId);
    if (t) clearTimeout(t);
    timers.current.delete(personaId);
    if (!campos) return;

    const res = await fetch(`/api/artista-personas/${personaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar la persona");
      return;
    }
    setGuardadas((prev) => new Set(prev).add(personaId));
    setTimeout(
      () =>
        setGuardadas((prev) => {
          const s = new Set(prev);
          s.delete(personaId);
          return s;
        }),
      1500,
    );
  }

  function editar(personaId: string, campos: Campos, inmediato = false) {
    setPersonas((prev) => prev.map((p) => (p.id === personaId ? ({ ...p, ...campos } as PersonaFila) : p)));
    pendientes.current.set(personaId, { ...(pendientes.current.get(personaId) ?? {}), ...campos });
    const t = timers.current.get(personaId);
    if (t) clearTimeout(t);
    if (inmediato) {
      void descargar(personaId);
      return;
    }
    timers.current.set(personaId, setTimeout(() => void descargar(personaId), DEMORA_GUARDADO));
  }

  async function agregar() {
    if (!nueva || !nueva.nombre.trim()) return;
    setAgregando(true);
    try {
      const res = await fetch(`/api/artistas/${artistaId}/personas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nueva.nombre.trim(),
          rol: nueva.rol,
          instrumento: nueva.instrumento.trim() || null,
          // El elenco en escena se marca solo por el rol; lo demás es staff.
          esIntegrante: ROLES_EN_ESCENA.includes(nueva.rol),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar");
        return;
      }
      setPersonas((prev) => [...prev, d.persona]);
      setNueva({ nombre: "", rol: nueva.rol, instrumento: "" });
    } finally {
      setAgregando(false);
    }
  }

  async function quitar(p: PersonaFila) {
    const ok = await confirm({
      message: `¿Quitar a «${p.nombre}» del elenco del artista? Se da de baja, no se borra el historial.`,
      danger: true,
      confirmText: "Quitar",
    });
    if (!ok) return;
    const res = await fetch(`/api/artista-personas/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar");
      return;
    }
    setPersonas((prev) => prev.filter((x) => x.id !== p.id));
  }

  const enEscena = useMemo(() => personas.filter((p) => p.esIntegrante).length, [personas]);
  const clave = useMemo(() => personas.filter((p) => p.esContactoClave).length, [personas]);

  const rolesPresentes = ROLES_PERSONA.filter((r) => personas.some((p) => p.rol === r));

  const visibles = personas.filter(
    (p) =>
      (!rolFiltro || p.rol === rolFiltro) &&
      coincide(busqueda, p.nombre, p.instrumento, p.email, p.telefono, ROL_PERSONA_LABEL[p.rol]),
  );

  const descuadre = integrantesNum !== null && integrantesNum !== enEscena;

  return (
    <div className="ms-page space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ms-h2">Personas del artista</h2>
          <p className="ms-subtitle mt-1">
            Quién viaja, quién mezcla y a quién se le llama. De aquí sale el crew, el rooming y los mixes de monitor.
          </p>
        </div>
        <button
          className="ms-btn-primary"
          onClick={() => setNueva((n) => (n ? null : { ...NUEVA_VACIA }))}
        >
          {nueva ? "Cerrar" : "Agregar persona"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label">En escena</p>
          <p className="text-xl font-semibold mt-1 text-white">{enEscena}</p>
          {descuadre && (
            <p className="ms-micro text-amber-300 mt-0.5">
              La ficha del artista dice {integrantesNum}: revisa cuál manda.
            </p>
          )}
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Contactos clave</p>
          <p className="text-xl font-semibold mt-1 text-[#B3985B]">{clave}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label">Total registradas</p>
          <p className="text-xl font-semibold mt-1 text-white">{personas.length}</p>
        </div>
      </div>

      {nueva && (
        <div className="ms-card-deep p-3 grid grid-cols-1 md:grid-cols-[1fr_200px_1fr_auto] gap-2 items-end">
          <div>
            <label className="ms-label block mb-1">Nombre</label>
            <input
              autoFocus
              className="ms-input-inline w-full"
              placeholder="ej. Daniela Ruiz"
              value={nueva.nombre}
              onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void agregar();
              }}
            />
          </div>
          <div>
            <label className="ms-label block mb-1">Rol</label>
            <select
              className="ms-input-inline w-full"
              value={nueva.rol}
              onChange={(e) => setNueva({ ...nueva, rol: e.target.value })}
            >
              {ROLES_PERSONA.map((r) => (
                <option key={r} value={r}>
                  {ROL_PERSONA_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ms-label block mb-1">Instrumento / puesto</label>
            <input
              className="ms-input-inline w-full"
              placeholder="ej. Voz y guitarra"
              value={nueva.instrumento}
              onChange={(e) => setNueva({ ...nueva, instrumento: e.target.value })}
            />
          </div>
          <button
            onClick={() => void agregar()}
            disabled={agregando || !nueva.nombre.trim()}
            className="ms-btn-primary disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="ms-input-search flex-1"
          placeholder="Buscar por nombre, instrumento, teléfono o correo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className={rolFiltro ? "ms-filter-select-active" : "ms-filter-select"}
          value={rolFiltro}
          onChange={(e) => setRolFiltro(e.target.value)}
        >
          <option value="">Todos los roles</option>
          {rolesPresentes.map((r) => (
            <option key={r} value={r}>
              {ROL_PERSONA_LABEL[r]} ({personas.filter((p) => p.rol === r).length})
            </option>
          ))}
        </select>
      </div>

      {visibles.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-[#6b7280]">
            {personas.length === 0
              ? "Todavía no hay personas registradas. Empieza por el tour manager y el ingeniero de FOH."
              : "Nadie coincide con el filtro."}
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full min-w-[1420px]">
            <thead className="ms-thead">
              <tr>
                <th className="ms-th text-left w-[220px]">Nombre</th>
                <th className="ms-th text-left w-[180px]">Rol</th>
                <th className="ms-th text-left w-[170px]">Instrumento / puesto</th>
                <th className="ms-th text-center w-[80px]">En escena</th>
                <th className="ms-th text-center w-[80px]">Clave</th>
                <th className="ms-th text-left w-[140px]">Teléfono</th>
                <th className="ms-th text-left w-[200px]">Correo</th>
                <th className="ms-th text-left w-[80px]">Talla</th>
                <th className="ms-th text-left w-[200px]">Hospitalidad</th>
                <th className="ms-th text-left w-[200px]">Notas</th>
                <th className="ms-th w-[40px]" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id} className="ms-tr align-top">
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      value={p.nombre}
                      onChange={(e) => editar(p.id, { nombre: e.target.value })}
                    />
                    {guardadas.has(p.id) && <span className="ms-micro text-emerald-400">guardado</span>}
                  </td>
                  <td className="ms-td">
                    <select
                      className="ms-input-inline w-full"
                      value={p.rol}
                      onChange={(e) => editar(p.id, { rol: e.target.value }, true)}
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
                      placeholder="…"
                      value={p.instrumento ?? ""}
                      onChange={(e) => editar(p.id, { instrumento: e.target.value })}
                    />
                  </td>
                  <td className="ms-td text-center">
                    <input
                      type="checkbox"
                      className="accent-[#B3985B] w-4 h-4"
                      checked={p.esIntegrante}
                      onChange={(e) => editar(p.id, { esIntegrante: e.target.checked }, true)}
                      title="Sube al escenario"
                    />
                  </td>
                  <td className="ms-td text-center">
                    <input
                      type="checkbox"
                      className="accent-[#B3985B] w-4 h-4"
                      checked={p.esContactoClave}
                      onChange={(e) => editar(p.id, { esContactoClave: e.target.checked }, true)}
                      title="A quién se le llama para resolver"
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="…"
                      value={p.telefono ?? ""}
                      onChange={(e) => editar(p.id, { telefono: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      type="email"
                      className="ms-input-inline w-full"
                      placeholder="…"
                      value={p.email ?? ""}
                      onChange={(e) => editar(p.id, { email: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="M"
                      value={p.tallaPlayera ?? ""}
                      onChange={(e) => editar(p.id, { tallaPlayera: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="alergias, dieta, bebida…"
                      value={p.notasHospitalidad ?? ""}
                      onChange={(e) => editar(p.id, { notasHospitalidad: e.target.value })}
                    />
                  </td>
                  <td className="ms-td">
                    <input
                      className="ms-input-inline w-full"
                      placeholder="…"
                      value={p.notas ?? ""}
                      onChange={(e) => editar(p.id, { notas: e.target.value })}
                    />
                  </td>
                  <td className="ms-td text-right">
                    <button
                      onClick={() => void quitar(p)}
                      className="text-[#555] hover:text-red-400 transition-colors"
                      title="Quitar persona"
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

      <p className="ms-micro">
        Cada celda se guarda sola al dejar de escribir. Las personas marcadas «en escena» son el elenco; las «clave»
        son a quienes se les llama cuando algo se mueve en una plaza.
      </p>
    </div>
  );
}
