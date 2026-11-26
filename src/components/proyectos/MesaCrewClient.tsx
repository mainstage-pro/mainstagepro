"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { SkeletonPage } from "@/components/Skeleton";
import { DisciplinaBadge } from "@/components/DisciplinaBadge";
import { DISCIPLINAS, DISCIPLINA_COLORS, DISCIPLINA_LABELS, type Disciplina } from "@/lib/disciplinaColors";

// ── Tipos (espejo de GET /api/proyectos/crew) ──────────────────────────────
type TecnicoPuesto = { id: string; nombre: string; nivel: string; celular: string | null };
type Puesto = {
  id: string;
  dia: string;
  rol: { id: string; nombre: string } | null;
  disciplina: Disciplina | null;
  participacion: string;
  nivel: string | null;
  tecnico: TecnicoPuesto | null;
  confirmado: boolean;
  confirmRespuesta: string | null;
  necesitaRevision: boolean;
  coordinaEnSitio: boolean;
  esAdicional: boolean;
};
type ProyectoCrew = {
  id: string;
  numeroProyecto: string;
  nombre: string;
  estado: string;
  cliente: string;
  lugar: string | null;
  horaInicio: string | null;
  dias: string[];
  puestos: Puesto[];
};
type TecnicoBase = {
  id: string;
  nombre: string;
  nivel: string;
  prioridad: number;
  disciplina: string[];
  especialidad: string | null;
  rolIds: string[];
};
type Rol = { id: string; nombre: string; disciplina: string | null };
type Datos = { desde: string; hasta: string; proyectos: ProyectoCrew[]; tecnicos: TecnicoBase[]; roles: Rol[] };

// ── Fechas ─────────────────────────────────────────────────────────────────
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sumarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function diaLargo(iso: string) {
  const s = new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function diaCorto(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const sem = d.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");
  return { sem: sem.charAt(0).toUpperCase() + sem.slice(1), num: d.getDate(), mes: d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "") };
}

const RANGOS = [
  { key: "fin", label: "Este fin" },
  { key: "2s", label: "2 semanas" },
  { key: "3s", label: "3 semanas" },
  { key: "6s", label: "6 semanas" },
] as const;
type RangoKey = (typeof RANGOS)[number]["key"];

function rangoFechas(key: RangoKey): { desde: string; hasta: string } {
  const hoy = isoLocal(new Date());
  if (key === "fin") {
    // Hasta el domingo que viene (si hoy es domingo, solo hoy).
    const dow = new Date().getDay();
    return { desde: hoy, hasta: sumarDias(hoy, dow === 0 ? 0 : 7 - dow) };
  }
  const semanas = key === "2s" ? 2 : key === "3s" ? 3 : 6;
  return { desde: hoy, hasta: sumarDias(hoy, semanas * 7 - 1) };
}

const PARTICIPACION_LABEL: Record<string, string> = {
  MONTAJE: "Montaje",
  DESMONTAJE: "Desmontaje",
  TRANSPORTE: "Transporte",
  OTRO: "Otro",
};

const sinAsignar = (p: Puesto) => !p.tecnico;
const porConfirmar = (p: Puesto) => !!p.tecnico && !p.confirmado && p.confirmRespuesta !== "RECHAZADO";

export default function MesaCrewClient() {
  const toast = useToast();
  const [rango, setRango] = useState<RangoKey>("3s");
  const [vista, setVista] = useState<"fecha" | "matriz">("fecha");
  const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [todosEnMatriz, setTodosEnMatriz] = useState(false);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);

  // Asignación inline: un renglón abierto a la vez.
  const [abierto, setAbierto] = useState<string | null>(null);
  const [rolSel, setRolSel] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [nuevoPara, setNuevoPara] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCelular, setNuevoCelular] = useState("");

  const { desde, hasta } = useMemo(() => rangoFechas(rango), [rango]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/proyectos/crew?desde=${desde}&hasta=${hasta}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      setDatos(d);
    } catch {
      toast.error("No se pudo cargar la mesa de crew");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ── Ocupación: técnico → día → proyectos (distintos) ───────────────────
  const ocupacion = useMemo(() => {
    const m = new Map<string, Map<string, { id: string; numero: string; nombre: string }[]>>();
    for (const pr of datos?.proyectos ?? []) {
      for (const pu of pr.puestos) {
        if (!pu.tecnico) continue;
        let porDia = m.get(pu.tecnico.id);
        if (!porDia) m.set(pu.tecnico.id, (porDia = new Map()));
        const lista = porDia.get(pu.dia) ?? [];
        if (!lista.some((x) => x.id === pr.id)) lista.push({ id: pr.id, numero: pr.numeroProyecto, nombre: pr.nombre });
        porDia.set(pu.dia, lista);
      }
    }
    return m;
  }, [datos]);

  const enOtros = useCallback(
    (tecnicoId: string, dia: string, proyectoId: string) =>
      (ocupacion.get(tecnicoId)?.get(dia) ?? []).filter((x) => x.id !== proyectoId),
    [ocupacion],
  );

  const pasaFiltro = useCallback(
    (p: Puesto) => (!disciplina || p.disciplina === disciplina) && (!soloPendientes || sinAsignar(p) || porConfirmar(p)),
    [disciplina, soloPendientes],
  );

  // ── Agrupado por día ───────────────────────────────────────────────────
  const dias = useMemo(() => {
    if (!datos) return [];
    const set = new Set<string>();
    datos.proyectos.forEach((p) => p.dias.forEach((d) => set.add(d)));
    return Array.from(set)
      .sort()
      .map((dia) => {
        const proyectos = datos.proyectos
          .filter((p) => p.dias.includes(dia))
          .map((p) => ({ ...p, puestosDia: p.puestos.filter((x) => x.dia === dia) }));
        const todos = proyectos.flatMap((p) => p.puestosDia).filter((x) => !disciplina || x.disciplina === disciplina);
        return {
          dia,
          proyectos,
          total: todos.length,
          cubiertos: todos.filter((x) => !!x.tecnico).length,
        };
      });
  }, [datos, disciplina]);

  const kpis = useMemo(() => {
    const todos = (datos?.proyectos ?? []).flatMap((p) => p.puestos).filter((x) => !disciplina || x.disciplina === disciplina);
    let dobles = 0;
    ocupacion.forEach((porDia) => porDia.forEach((lista) => { if (lista.length > 1) dobles++; }));
    return {
      total: todos.length,
      sinAsignar: todos.filter(sinAsignar).length,
      porConfirmar: todos.filter(porConfirmar).length,
      dobles,
    };
  }, [datos, disciplina, ocupacion]);

  // ── Acciones ───────────────────────────────────────────────────────────
  function cerrar() {
    setAbierto(null);
    setRolSel("");
    setNuevoPara(null);
    setNuevoNombre("");
    setNuevoCelular("");
  }

  function aplicarLocal(puestoId: string, cambios: Partial<Puesto>) {
    setDatos((prev) =>
      prev && {
        ...prev,
        proyectos: prev.proyectos.map((pr) => ({
          ...pr,
          puestos: pr.puestos.map((pu) => (pu.id === puestoId ? { ...pu, ...cambios } : pu)),
        })),
      },
    );
  }

  async function asignar(proyectoId: string, puesto: Puesto, tecnicoId: string) {
    const rolId = puesto.rol?.id ?? rolSel;
    if (!rolId) {
      toast.error("Elige primero el rol del puesto");
      return;
    }
    setGuardando(true);
    try {
      const body: Record<string, unknown> = { tecnicoId };
      if (!puesto.rol) body.rolTecnicoId = rolId;
      const res = await fetch(`/api/proyectos/${proyectoId}/personal/${puesto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.personal) throw new Error(d.error ?? "Error");
      const per = d.personal;
      aplicarLocal(puesto.id, {
        tecnico: per.tecnico ? { id: per.tecnico.id, nombre: per.tecnico.nombre, nivel: per.tecnico.nivel, celular: per.tecnico.celular ?? null } : null,
        rol: per.rolTecnico ? { id: per.rolTecnico.id, nombre: per.rolTecnico.nombre } : puesto.rol,
        confirmado: per.confirmado,
        confirmRespuesta: per.confirmRespuesta ?? null,
        coordinaEnSitio: per.coordinaEnSitio,
      });
      toast.success(`${per.tecnico?.nombre ?? "Técnico"} asignado`);
      cerrar();
    } catch (e) {
      toast.error(e instanceof Error && e.message !== "Error" ? e.message : "No se pudo asignar");
    } finally {
      setGuardando(false);
    }
  }

  async function crearYAsignar(proyectoId: string, puesto: Puesto) {
    if (!nuevoNombre.trim()) return;
    const rolId = puesto.rol?.id ?? rolSel;
    setGuardando(true);
    try {
      const res = await fetch("/api/tecnicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoNombre.trim(),
          celular: nuevoCelular.trim() || null,
          roles: rolId ? [rolId] : [],
          nivel: "A",
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.tecnico) throw new Error(d.error ?? "No se pudo registrar el técnico");
      setDatos((prev) =>
        prev && {
          ...prev,
          tecnicos: [
            ...prev.tecnicos,
            { id: d.tecnico.id, nombre: d.tecnico.nombre, nivel: d.tecnico.nivel ?? "A", prioridad: 0, disciplina: d.tecnico.disciplina ?? [], especialidad: null, rolIds: rolId ? [rolId] : [] },
          ].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        },
      );
      setGuardando(false);
      await asignar(proyectoId, puesto, d.tecnico.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo registrar el técnico");
      setGuardando(false);
    }
  }

  // Opciones del buscador: primero quien está libre ese día (y cubre el rol),
  // luego quien ya trabaja en otro evento ese día, marcado con dónde.
  function opcionesTecnico(proyectoId: string, puesto: Puesto): ComboboxOption[] {
    const rolId = puesto.rol?.id ?? rolSel;
    const lista = (datos?.tecnicos ?? []).map((t) => {
      const otros = enOtros(t.id, puesto.dia, proyectoId);
      return { t, otros, cubreRol: !!rolId && t.rolIds.includes(rolId) };
    });
    lista.sort((a, b) => {
      if (!!a.otros.length !== !!b.otros.length) return a.otros.length ? 1 : -1;
      if (a.cubreRol !== b.cubreRol) return a.cubreRol ? -1 : 1;
      if (b.t.prioridad !== a.t.prioridad) return b.t.prioridad - a.t.prioridad;
      return a.t.nombre.localeCompare(b.t.nombre);
    });
    return [
      { value: "__nuevo__", label: "＋ Registrar nuevo técnico", pin: true },
      ...lista
        .filter((x) => x.t.id !== puesto.tecnico?.id)
        .map(({ t, otros, cubreRol }) => ({
          value: t.id,
          group: otros.length ? "Ya trabajan ese día" : cubreRol ? "Libres · cubren el rol" : "Libres · otra especialidad",
          label: `${t.nombre} · ${t.nivel}${t.especialidad ? ` · ${t.especialidad}` : ""}${otros.length ? ` — en ${otros.map((o) => o.numero).join(", ")}` : ""}`,
        })),
    ];
  }

  function irAlDia(dia: string) {
    setVista("fecha");
    setTimeout(() => document.getElementById(`dia-${dia}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function renglonPuesto(pr: ProyectoCrew, p: Puesto) {
    const otros = p.tecnico ? enOtros(p.tecnico.id, p.dia, pr.id) : [];
    const rechazado = p.confirmRespuesta === "RECHAZADO";
    const borde = !p.tecnico
      ? "border-l-amber-600/70"
      : otros.length || rechazado
        ? "border-l-red-600/70"
        : p.confirmado
          ? "border-l-green-600/70"
          : "border-l-[#444]";
    const estaAbierto = abierto === p.id;
    return (
      <div key={p.id} className={`border-l-2 ${borde} pl-3 pr-2 py-2`}>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <DisciplinaBadge disciplina={p.disciplina} compacto />
              {p.rol ? (
                <span className="text-sm text-gray-200">{p.rol.nombre}</span>
              ) : (
                <span className="text-sm text-amber-400">Sin rol de puesto</span>
              )}
              {p.nivel && <span className="text-[10px] text-gray-500 font-semibold">{p.nivel}</span>}
              {p.participacion !== "OPERACION" && PARTICIPACION_LABEL[p.participacion] && (
                <span className="px-1.5 py-0.5 rounded border border-[#2a2a2a] text-[10px] text-gray-400">{PARTICIPACION_LABEL[p.participacion]}</span>
              )}
              {p.necesitaRevision && (
                <span className="px-1.5 py-0.5 rounded border border-amber-700/50 text-[10px] text-amber-300" title="El puesto ya no está en la cotización. Decide en el proyecto si lo quitas.">
                  Ya no está en la cotización
                </span>
              )}
            </div>
            {p.tecnico ? (
              <p className="text-xs mt-0.5 text-gray-400">
                {p.coordinaEnSitio && <span className="text-[#B3985B]" title="Coordina en sitio">★ </span>}
                <span className="text-gray-200">{p.tecnico.nombre}</span>
                {" · "}
                {rechazado ? (
                  <span className="text-red-400">Rechazó</span>
                ) : p.confirmado ? (
                  <span className="text-green-400">Confirmado</span>
                ) : (
                  <span className="text-gray-500">Por confirmar</span>
                )}
                {otros.length > 0 && (
                  <span className="text-red-400"> · También ese día en {otros.map((o) => `${o.numero} ${o.nombre}`).join(", ")}</span>
                )}
              </p>
            ) : (
              <p className="text-xs mt-0.5 text-amber-500/90">Pendiente de asignar</p>
            )}
          </div>
          {!estaAbierto && (
            <button
              onClick={() => {
                cerrar();
                setAbierto(p.id);
              }}
              className="shrink-0 text-xs text-gray-400 hover:text-white border border-[#333] hover:border-[#555] px-2 py-0.5 rounded transition-colors"
            >
              {p.tecnico ? "Cambiar" : "Asignar"}
            </button>
          )}
        </div>

        {estaAbierto && (
          <div className="mt-2 space-y-2">
            {!p.rol && (
              <div>
                <p className="text-[11px] text-amber-400 mb-1">Este puesto no tiene rol definido; elígelo para poder asignar</p>
                <Combobox
                  value={rolSel}
                  placeholder="Rol del puesto"
                  onChange={(v) => setRolSel(v)}
                  options={(datos?.roles ?? []).map((r) => ({ value: r.id, label: r.nombre }))}
                  className="w-full bg-[#1a1a1a] border border-amber-800/50 rounded-lg px-2 py-1 text-white text-sm focus:outline-none"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Combobox
                value=""
                disabled={guardando || (!p.rol && !rolSel)}
                placeholder="Buscar técnico…"
                onChange={(v, q) => {
                  if (v === "__nuevo__") {
                    setNuevoPara(p.id);
                    setNuevoNombre(q);
                  } else if (v) {
                    asignar(pr.id, p, v);
                  }
                }}
                options={opcionesTecnico(pr.id, p)}
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-white text-sm focus:outline-none disabled:opacity-40"
              />
              <button onClick={cerrar} className="text-gray-500 hover:text-white text-xs shrink-0">
                Cancelar
              </button>
            </div>
            {nuevoPara === p.id && (
              <div className="p-3 bg-[#0d0d0d] border border-[#333] rounded-lg space-y-2">
                <p className="text-gray-300 text-xs font-semibold">Registrar nuevo técnico</p>
                <input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre completo"
                  autoFocus
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]"
                />
                <input
                  value={nuevoCelular}
                  onChange={(e) => setNuevoCelular(e.target.value)}
                  placeholder="Celular (WhatsApp)"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#555]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => crearYAsignar(pr.id, p)}
                    disabled={guardando || !nuevoNombre.trim()}
                    className="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  >
                    {guardando ? "Guardando…" : "Guardar y asignar"}
                  </button>
                  <button onClick={() => setNuevoPara(null)} className="px-3 text-gray-500 hover:text-white text-xs">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function vistaPorFecha() {
    if (dias.length === 0) {
      return <div className="ms-card p-8 text-center text-gray-500 text-sm">No hay proyectos activos en este rango.</div>;
    }
    return (
      <div className="space-y-6">
        {dias.map(({ dia, proyectos, total, cubiertos }) => {
          const visibles = proyectos
            .map((pr) => ({ ...pr, filtrados: pr.puestosDia.filter(pasaFiltro) }))
            .filter((pr) => (soloPendientes || disciplina ? pr.filtrados.length > 0 : true));
          if (visibles.length === 0) return null;
          const completo = total > 0 && cubiertos === total;
          return (
            <section key={dia} id={`dia-${dia}`} className="scroll-mt-4">
              <div className="flex items-baseline gap-3 border-b border-[#1e1e1e] pb-2 mb-3">
                <h2 className="text-base font-semibold text-white">{diaLargo(dia)}</h2>
                <span className="text-xs text-gray-500">
                  {proyectos.length} proyecto{proyectos.length === 1 ? "" : "s"}
                </span>
                <span className="flex-1" />
                {total > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded border ${completo ? "border-green-700/50 text-green-400" : "border-amber-700/50 text-amber-400"}`}
                  >
                    {cubiertos}/{total} cubiertos
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {visibles.map((pr) => {
                  const n = pr.puestosDia.length;
                  const ok = pr.puestosDia.filter((x) => !!x.tecnico).length;
                  return (
                    <div key={pr.id} className="ms-card overflow-hidden">
                      <div className="px-3 pt-3 pb-2 flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <Link href={`/proyectos/${pr.id}`} className="text-sm font-semibold text-white hover:text-[#B3985B] transition-colors">
                            {pr.nombre}
                          </Link>
                          <p className="text-[11px] text-gray-500 truncate">
                            {pr.numeroProyecto} · {pr.cliente}
                            {pr.lugar ? ` · ${pr.lugar}` : ""}
                            {pr.horaInicio ? ` · ${pr.horaInicio}` : ""}
                          </p>
                        </div>
                        {n > 0 && (
                          <span className={`text-[11px] shrink-0 ${ok === n ? "text-green-400" : "text-gray-400"}`}>
                            {ok}/{n}
                          </span>
                        )}
                      </div>
                      <div className="pb-2 space-y-1">
                        {n === 0 ? (
                          <p className="px-3 pb-1 text-xs text-gray-500">
                            Sin puestos de operación todavía.{" "}
                            <Link href={`/proyectos/${pr.id}`} className="text-[#B3985B] hover:underline">
                              Abrir proyecto
                            </Link>
                          </p>
                        ) : (
                          pr.filtrados.map((p) => renglonPuesto(pr, p))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  function vistaMatriz() {
    const columnas = dias.map((d) => d.dia);
    if (columnas.length === 0) {
      return <div className="ms-card p-8 text-center text-gray-500 text-sm">No hay proyectos activos en este rango.</div>;
    }
    const conTrabajo = new Set(ocupacion.keys());
    const filas = (datos?.tecnicos ?? []).filter((t) => {
      if (!todosEnMatriz && !conTrabajo.has(t.id)) return false;
      if (disciplina && !t.disciplina.includes(disciplina)) {
        // Si trabaja un puesto de esa disciplina en el rango, también cuenta.
        const trabaja = (datos?.proyectos ?? []).some((pr) => pr.puestos.some((pu) => pu.tecnico?.id === t.id && pu.disciplina === disciplina));
        if (!trabaja) return false;
      }
      return true;
    });
    const faltan = (dia: string) =>
      (datos?.proyectos ?? []).flatMap((pr) => pr.puestos).filter((pu) => pu.dia === dia && !pu.tecnico && (!disciplina || pu.disciplina === disciplina)).length;

    return (
      <div className="ms-card overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              <th className="sticky left-0 bg-[#111] text-left font-medium text-gray-400 px-3 py-2 min-w-[150px]">Técnico</th>
              {columnas.map((d) => {
                const c = diaCorto(d);
                return (
                  <th key={d} className="px-1 py-2 font-medium text-gray-400 min-w-[92px]">
                    <button onClick={() => irAlDia(d)} className="hover:text-white">
                      {c.sem} {c.num} <span className="text-gray-600">{c.mes}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#1e1e1e]">
              <td className="sticky left-0 bg-[#111] px-3 py-1.5 text-amber-400">Sin asignar</td>
              {columnas.map((d) => {
                const f = faltan(d);
                return (
                  <td key={d} className="px-1 py-1.5 text-center">
                    {f > 0 ? (
                      <button onClick={() => irAlDia(d)} className="text-amber-400 hover:underline">
                        Faltan {f}
                      </button>
                    ) : (
                      <span className="text-green-500/70">Completo</span>
                    )}
                  </td>
                );
              })}
            </tr>
            {filas.length === 0 && (
              <tr>
                <td colSpan={columnas.length + 1} className="px-3 py-6 text-center text-gray-500">
                  Nadie asignado todavía en este rango.
                </td>
              </tr>
            )}
            {filas.map((t) => (
              <tr key={t.id} className="border-b border-[#161616] last:border-0">
                <td className="sticky left-0 bg-[#111] px-3 py-1.5">
                  <span className="text-gray-200">{t.nombre}</span>
                  <span className="text-gray-600"> · {t.nivel}</span>
                  {t.especialidad && <p className="text-[10px] text-gray-500 truncate max-w-[160px]">{t.especialidad}</p>}
                </td>
                {columnas.map((d) => {
                  const lista = ocupacion.get(t.id)?.get(d) ?? [];
                  const doble = lista.length > 1;
                  return (
                    <td key={d} className="px-1 py-1">
                      {lista.length === 0 ? (
                        <div className="text-center text-gray-700">libre</div>
                      ) : (
                        <button
                          onClick={() => irAlDia(d)}
                          title={lista.map((x) => `${x.numero} ${x.nombre}`).join("\n")}
                          className={`w-full rounded px-1.5 py-1 text-left truncate border ${
                            doble ? "border-red-700/60 bg-red-950/40 text-red-300" : "border-[#B3985B]/30 bg-[#B3985B]/10 text-[#d8c08a]"
                          }`}
                        >
                          {doble ? `${lista.length} eventos` : lista[0].nombre}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-4 px-3 py-2 border-t border-[#1e1e1e] text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-[#B3985B]/30 bg-[#B3985B]/10" /> Trabajando</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-red-700/60 bg-red-950/40" /> Doble reserva</span>
          <span className="flex-1" />
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={todosEnMatriz} onChange={(e) => setTodosEnMatriz(e.target.checked)} className="accent-[#B3985B]" />
            Mostrar también a quien está libre todo el rango
          </label>
        </div>
      </div>
    );
  }

  const kpi = (label: string, valor: number, tono: string, onClick?: () => void, activo?: boolean) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`ms-card px-4 py-3 text-left transition-colors ${onClick ? "hover:border-[#2a2a2a]" : "cursor-default"} ${activo ? "border-[#B3985B]/50" : ""}`}
    >
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold ${valor > 0 ? tono : "text-white"}`}>{valor}</p>
    </button>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="ms-h1">Mesa de crew</h1>
          <p className="text-gray-500 text-sm">Los puestos de todos los proyectos que vienen, para asignar técnicos sin entrar a cada uno.</p>
        </div>
        <div className="flex items-center gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
          {RANGOS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRango(r.key)}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${rango === r.key ? "bg-[#B3985B] text-black font-semibold" : "text-gray-400 hover:text-white"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpi("Puestos", kpis.total, "text-white")}
        {kpi("Sin asignar", kpis.sinAsignar, "text-amber-400", () => { setSoloPendientes((v) => !v); setVista("fecha"); }, soloPendientes)}
        {kpi("Por confirmar", kpis.porConfirmar, "text-gray-200")}
        {kpi("Dobles reservas", kpis.dobles, "text-red-400", kpis.dobles ? () => setVista("matriz") : undefined)}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-[#111] border border-[#1e1e1e] rounded-lg p-1">
          {(
            [
              ["fecha", "Por fecha"],
              ["matriz", "Quién está dónde"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setVista(k)}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${vista === k ? "bg-[#222] text-white" : "text-gray-400 hover:text-white"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="w-px h-5 bg-[#222] mx-1" />
        <button
          onClick={() => setDisciplina(null)}
          className={`text-[11px] px-2 py-1 rounded border transition-colors ${!disciplina ? "border-[#444] text-white" : "border-[#222] text-gray-500 hover:text-gray-300"}`}
        >
          Todas
        </button>
        {DISCIPLINAS.filter((d) => d !== "STAFF_GENERAL").map((d) => (
          <button
            key={d}
            onClick={() => setDisciplina(disciplina === d ? null : d)}
            className="text-[11px] px-2 py-1 rounded border transition-colors"
            style={
              disciplina === d
                ? { color: DISCIPLINA_COLORS[d], borderColor: `${DISCIPLINA_COLORS[d]}88`, backgroundColor: `${DISCIPLINA_COLORS[d]}1a` }
                : { color: "#6b7280", borderColor: "#222" }
            }
          >
            {DISCIPLINA_LABELS[d]}
          </button>
        ))}
        {vista === "fecha" && (
          <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} className="accent-[#B3985B]" />
            Solo lo que falta (sin asignar o por confirmar)
          </label>
        )}
      </div>

      {cargando && !datos ? <SkeletonPage /> : vista === "fecha" ? vistaPorFecha() : vistaMatriz()}
    </div>
  );
}
