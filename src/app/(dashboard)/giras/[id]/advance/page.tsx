import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { faltantesDeLaGira, matrizAdvance, type CeldaMatriz } from "@/lib/advance-gira";
import {
  CUBIERTO_POR_CORTO,
  CUBIERTO_POR_LABEL,
  DISCIPLINA_LABEL,
  ESTADO_ADVANCE_CORTO,
  ESTADO_ADVANCE_LABEL,
  PRIORIDAD_COLOR,
  PRIORIDAD_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  fmtFechaCorta,
  resumirAdvance,
} from "@/lib/giras";
import BotonDocumentoGira from "@/components/giras/BotonDocumentoGira";

export const dynamic = "force-dynamic";

function colorCelda(c: CeldaMatriz): string {
  if (c.cubiertoPor === "NO_APLICA") return "bg-white/[0.02] text-[#555] border-[#1a1a1a]";
  if (!c.abierta) return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
  if (c.prioridad === "INDISPENSABLE") return "bg-red-500/10 text-red-300 border-red-500/30";
  if (c.cubiertoPor === "POR_DEFINIR") return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  return "bg-sky-500/10 text-sky-300 border-sky-500/30";
}

export default async function AdvanceGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      artista: { select: { nombre: true } },
      shows: {
        where: { estado: { not: "CANCELADO" } },
        orderBy: [{ fecha: "asc" }, { orden: "asc" }],
        select: {
          id: true,
          riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
        },
      },
    },
  });

  if (!gira) notFound();

  const [matriz, grupos] = await Promise.all([matrizAdvance(id), faltantesDeLaGira(id)]);

  const resumenPorShow = new Map(gira.shows.map((s) => [s.id, resumirAdvance(s.riderLineas)]));
  const abiertosTotal = grupos.reduce((s, g) => s + g.filas.length, 0);
  const promotorTotal = grupos.reduce((s, g) => s + g.alPromotor, 0);
  const renglonesAdvance = gira.shows.reduce((s, x) => s + x.riderLineas.length, 0);

  return (
    <div className="ms-page space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ms-h1">Advance consolidado</h1>
          <p className="ms-subtitle">
            {gira.artista.nombre} · {gira.nombre} · un renglón por concepto del rider, una columna por show
          </p>
        </div>

        {/* El libro de gira es recortable, así que el estado del advance de toda
            la gira no necesita otro PDF: es su sección. */}
        <BotonDocumentoGira
          url={`/api/giras/${id}/documentos/libro-gira`}
          query="secciones=advance"
          label="Estado del advance PDF"
          falta={renglonesAdvance === 0 ? "cotejar el rider en alguna fecha" : null}
          className="shrink-0 max-w-xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Shows</p>
          <p className="text-white text-xl font-semibold">{matriz.columnas.length}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Renglones por cerrar</p>
          <p className={`text-xl font-semibold ${abiertosTotal > 0 ? "text-amber-300" : "text-emerald-300"}`}>
            {abiertosTotal}
          </p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Para pedirle al promotor</p>
          <p className="text-white text-xl font-semibold">{promotorTotal}</p>
        </div>
      </div>

      {/* Matriz concepto × show */}
      {matriz.filas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            Esta matriz es para el equipo que se persigue renglón por renglón, y el rider no trae ninguno desglosado
            así. Los puntos del rider se cotejan fecha por fecha en{" "}
            <a href={`/giras/${id}/pendientes`} className="text-[#B3985B] hover:underline">
              Pendientes y checklist
            </a>
            . Si de algún bloque sí hace falta el desglose, entra a un show y ármalo desde el rider maestro.
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full" style={{ minWidth: `${420 + matriz.columnas.length * 150}px` }}>
            <thead className="ms-thead">
              <tr>
                <th className="ms-th w-[300px]">Concepto del rider</th>
                <th className="ms-th w-[120px]">Prioridad</th>
                {matriz.columnas.map((c) => {
                  const r = resumenPorShow.get(c.showId);
                  return (
                    <th key={c.showId} className="ms-th w-[150px]">
                      <Link href={`/giras/${id}/show/${c.showId}/advance`} className="ms-link-gold block">
                        {fmtFechaCorta(c.fecha)}
                      </Link>
                      <span className="block text-[10px] normal-case text-[#8b8f97] font-normal">
                        {c.venueNombre ?? c.ciudad ?? "Sin venue"}
                      </span>
                      {r && (
                        <span className={`ms-badge mt-1 inline-block ${SEMAFORO_COLOR[r.semaforo]}`}>
                          {SEMAFORO_LABEL[r.semaforo]} {r.avance}%
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {matriz.filas.map((f, i) => {
                const anterior = i > 0 ? matriz.filas[i - 1].disciplina : null;
                return (
                  <Fragment key={f.clave}>
                    {f.disciplina !== anterior && (
                      <tr>
                        <td
                          colSpan={2 + matriz.columnas.length}
                          className="bg-[#0d0d0d] border-y border-[#1e1e1e] px-4 py-2"
                        >
                          <span className="ms-section-label">{DISCIPLINA_LABEL[f.disciplina] ?? f.disciplina}</span>
                        </td>
                      </tr>
                    )}
                    <tr className="ms-tr">
                      <td className="ms-td text-white">
                        {f.concepto}
                        {f.showsAbiertos > 1 && (
                          <span className="ms-micro text-amber-300 block">
                            sigue abierto en {f.showsAbiertos} fechas — conviene resolverlo de una sola vez
                          </span>
                        )}
                      </td>
                      <td className="ms-td">
                        <span className={`ms-badge ${PRIORIDAD_COLOR[f.prioridad]}`}>{PRIORIDAD_LABEL[f.prioridad]}</span>
                      </td>
                      {matriz.columnas.map((c) => {
                        const celda = f.celdas[c.showId];
                        if (!celda) {
                          return (
                            <td key={c.showId} className="ms-td">
                              <span className="ms-micro text-[#333]">no está en el advance</span>
                            </td>
                          );
                        }
                        return (
                          <td key={c.showId} className="ms-td">
                            <Link
                              href={`/giras/${id}/show/${c.showId}/advance`}
                              className={`block rounded-lg border px-2 py-1.5 ${colorCelda(celda)}`}
                              title={`${CUBIERTO_POR_LABEL[celda.cubiertoPor]} · ${ESTADO_ADVANCE_LABEL[celda.estado]}`}
                            >
                              <span className="block text-[11px] font-semibold">
                                {CUBIERTO_POR_CORTO[celda.cubiertoPor] ?? celda.cubiertoPor}
                              </span>
                              <span className="block text-[10px] opacity-80">
                                {ESTADO_ADVANCE_CORTO[celda.estado] ?? celda.estado} · pide {celda.cantidadPedida}
                              </span>
                              {celda.pedirAlPromotor && (
                                <span className="block text-[10px] opacity-70">se le pide al promotor</span>
                              )}
                            </Link>
                          </td>
                        );
                      })}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Qué sigue abierto, por fecha y departamento */}
      <div className="space-y-3">
        <h2 className="ms-h2">Qué falta cerrar, por ciudad y departamento</h2>
        {grupos.length === 0 ? (
          <div className="ms-empty-state">
            <p className="text-sm text-gray-400">No queda nada abierto en el advance de la gira.</p>
          </div>
        ) : (
          grupos.map((g) => (
            <div key={`${g.ciudad}-${g.disciplina}`} className="ms-card p-4 space-y-3">
              <div>
                <p className="text-white font-semibold">
                  {g.ciudad} · {g.disciplinaLabel}
                </p>
                <p className="ms-meta">
                  {g.filas.length} renglones abiertos · {g.indispensables} indispensables · {g.alPromotor} para pedirle
                  al promotor
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full">
                  <thead className="ms-thead">
                    <tr>
                      <th className="ms-th">Concepto</th>
                      <th className="ms-th">Fecha</th>
                      <th className="ms-th">Pide</th>
                      <th className="ms-th">Prioridad</th>
                      <th className="ms-th">Quién lo cubre</th>
                      <th className="ms-th">Cómo va</th>
                      <th className="ms-th">Al promotor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.filas.map((f) => (
                      <tr key={f.lineaId} className="ms-tr">
                        <td className="ms-td text-white">{f.concepto}</td>
                        <td className="ms-td">
                          <Link href={`/giras/${id}/show/${f.showId}/advance`} className="ms-link-gold">
                            {fmtFechaCorta(f.fecha)} {f.venueNombre ?? ""}
                          </Link>
                        </td>
                        <td className="ms-td text-gray-400">{f.cantidadPedida}</td>
                        <td className="ms-td">
                          <span className={`ms-badge ${PRIORIDAD_COLOR[f.prioridad]}`}>
                            {PRIORIDAD_LABEL[f.prioridad]}
                          </span>
                        </td>
                        <td
                          className={`ms-td ${f.cubiertoPor === "POR_DEFINIR" ? "text-amber-300" : "text-gray-400"}`}
                        >
                          {CUBIERTO_POR_LABEL[f.cubiertoPor] ?? f.cubiertoPor}
                        </td>
                        <td className="ms-td text-gray-400">{ESTADO_ADVANCE_LABEL[f.estado] ?? f.estado}</td>
                        <td className="ms-td">
                          {f.pedirAlPromotor ? <span className="text-sky-300">Sí</span> : <span className="text-[#555]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="ms-micro">
        El advance no lleva costo ni proveedor: el equipo de tercero se captura una sola vez en el rider del proyecto y
        de ahí se derivan el proveedor y su cuenta por pagar.
      </p>
    </div>
  );
}
