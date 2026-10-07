import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { faltantesDeLaGira, fmtCantidad, matrizAdvance, type CeldaMatriz } from "@/lib/advance-gira";
import {
  CUBIERTO_POR_LABEL,
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

/// El color de la celda contesta "¿cómo va audio en Monterrey?" de un vistazo.
/// Lo que pide el rider y nadie repartió pesa más que lo abierto: un renglón
/// pendiente ya está en la lista de alguien, uno sin repartir no existe.
function colorCelda(c: CeldaMatriz): string {
  if (c.sinRepartir > 0) return "bg-amber-500/10 text-amber-200 border-amber-500/30";
  if (c.indispensablesAbiertos > 0) return "bg-red-500/10 text-red-300 border-red-500/30";
  if (c.abiertos > 0) return "bg-sky-500/10 text-sky-300 border-sky-500/30";
  if (c.total === 0) return "bg-white/[0.02] text-[#555] border-[#1a1a1a]";
  return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
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
          repartos: { select: { prioridad: true, estado: true, cubiertoPor: true } },
        },
      },
    },
  });

  if (!gira) notFound();

  const [matriz, grupos] = await Promise.all([matrizAdvance(id), faltantesDeLaGira(id)]);

  const resumenPorShow = new Map(gira.shows.map((s) => [s.id, resumirAdvance(s.repartos)]));
  const abiertosTotal = grupos.reduce((s, g) => s + g.filas.length, 0);
  const promotorTotal = grupos.reduce((s, g) => s + g.alPromotor, 0);
  const renglones = gira.shows.reduce((s, x) => s + x.repartos.length, 0);
  const sinRepartirTotal = matriz.filas.reduce(
    (s, f) => s + Object.values(f.celdas).reduce((t, c) => t + c.sinRepartir, 0),
    0,
  );

  return (
    <div className="ms-page space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ms-h1">Advance de toda la gira</h1>
          <p className="ms-subtitle">
            {gira.artista.nombre} · {gira.nombre} · un renglón por departamento, una columna por fecha
          </p>
        </div>

        {/* El libro de gira es recortable, así que el estado del advance de toda
            la gira no necesita otro PDF: es su sección. */}
        <BotonDocumentoGira
          url={`/api/giras/${id}/documentos/libro-gira`}
          query="secciones=advance"
          label="Estado del advance PDF"
          falta={renglones === 0 ? "repartir el advance en alguna fecha" : null}
          className="shrink-0 max-w-xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Fechas</p>
          <p className="text-white text-xl font-semibold">{matriz.columnas.length}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Renglones por cerrar</p>
          <p className={`text-xl font-semibold ${abiertosTotal > 0 ? "text-amber-300" : "text-emerald-300"}`}>
            {abiertosTotal}
          </p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Del rider sin repartir</p>
          <p className={`text-xl font-semibold ${sinRepartirTotal > 0 ? "text-amber-300" : "text-emerald-300"}`}>
            {sinRepartirTotal}
          </p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Para pedirle al promotor</p>
          <p className="text-white text-xl font-semibold">{promotorTotal}</p>
        </div>
      </div>

      {/* Matriz departamento × fecha */}
      {matriz.filas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            Todavía no hay nada que cotejar: ni el rider del artista pide algo marcado para el advance ni se ha
            repartido ningún departamento. Entra a una fecha y arma el reparto desde ahí. Lo que haya que perseguir a
            mano se anota en{" "}
            <Link href={`/giras/${id}/tareas`} className="text-[#B3985B] hover:underline">
              Tareas
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="ms-table-wrapper overflow-x-auto">
          <table className="w-full" style={{ minWidth: `${260 + matriz.columnas.length * 160}px` }}>
            <thead className="ms-thead">
              <tr>
                <th className="ms-th w-[260px]">Departamento</th>
                {matriz.columnas.map((c) => {
                  const r = resumenPorShow.get(c.showId);
                  return (
                    <th key={c.showId} className="ms-th w-[160px]">
                      <Link href={`/giras/${id}/show/${c.showId}/advance`} className="ms-link-gold block">
                        {fmtFechaCorta(c.fecha)}
                      </Link>
                      <span className="block text-[10px] normal-case text-[#8b8f97] font-normal">
                        {c.venueNombre ?? c.ciudad ?? "Sin venue"}
                      </span>
                      {r && r.total > 0 && (
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
              {matriz.filas.map((f) => (
                <tr key={f.disciplina} className="ms-tr">
                  <td className="ms-td text-white">
                    {f.label}
                    {f.showsAbiertos > 1 && (
                      <span className="ms-micro text-amber-300 block">
                        sigue abierto en {f.showsAbiertos} fechas — conviene resolverlo de una sola vez
                      </span>
                    )}
                  </td>
                  {matriz.columnas.map((c) => {
                    const celda = f.celdas[c.showId];
                    if (!celda) {
                      return (
                        <td key={c.showId} className="ms-td">
                          <span className="ms-micro text-[#333]">no aplica en esta fecha</span>
                        </td>
                      );
                    }
                    return (
                      <td key={c.showId} className="ms-td">
                        <Link
                          href={`/giras/${id}/show/${c.showId}/advance`}
                          className={`block rounded-lg border px-2 py-1.5 ${colorCelda(celda)}`}
                        >
                          <span className="block text-[11px] font-semibold">
                            {celda.abiertos === 0 && celda.sinRepartir === 0
                              ? celda.total > 0
                                ? "cerrado"
                                : "sin repartir"
                              : `${celda.abiertos} por cerrar`}
                          </span>
                          <span className="block text-[10px] opacity-80">
                            {celda.total} {celda.total === 1 ? "renglón" : "renglones"}
                          </span>
                          {celda.sinRepartir > 0 && (
                            <span className="block text-[10px] opacity-90">
                              {celda.sinRepartir} del rider sin repartir
                            </span>
                          )}
                          {celda.indispensablesAbiertos > 0 && (
                            <span className="block text-[10px] opacity-90">
                              {celda.indispensablesAbiertos} indispensables
                            </span>
                          )}
                          {celda.alPromotor > 0 && (
                            <span className="block text-[10px] opacity-70">{celda.alPromotor} al promotor</span>
                          )}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Qué sigue abierto, por ciudad y departamento */}
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
                <table className="min-w-[820px] w-full">
                  <thead className="ms-thead">
                    <tr>
                      <th className="ms-th">Qué es</th>
                      <th className="ms-th">Cuánto</th>
                      <th className="ms-th">Fecha</th>
                      <th className="ms-th">Prioridad</th>
                      <th className="ms-th">Quién lo pone</th>
                      <th className="ms-th">Cómo va</th>
                      <th className="ms-th">Qué falta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.filas.map((f) => (
                      <tr key={f.repartoId} className="ms-tr">
                        <td className="ms-td text-white">{f.descripcion}</td>
                        <td className="ms-td text-gray-400">{fmtCantidad(f.cantidad, f.unidad)}</td>
                        <td className="ms-td">
                          <Link href={`/giras/${id}/show/${f.showId}/advance`} className="ms-link-gold">
                            {fmtFechaCorta(f.fecha)} {f.venueNombre ?? ""}
                          </Link>
                        </td>
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
                        <td className="ms-td text-amber-200">{f.porConseguir ?? "—"}</td>
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
