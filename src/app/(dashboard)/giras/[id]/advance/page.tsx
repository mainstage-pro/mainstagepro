import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { faltantesPorProveedor, matrizAdvance, type CeldaMatriz } from "@/lib/advance-gira";
import {
  CUBIERTO_POR_LABEL,
  DISCIPLINA_LABEL,
  ESTADOS_RESUELTOS,
  ESTADO_ADVANCE_LABEL,
  PRIORIDAD_COLOR,
  PRIORIDAD_LABEL,
  SEMAFORO_COLOR,
  SEMAFORO_LABEL,
  fmtFechaCorta,
  fmtMoneda,
  resumirAdvance,
} from "@/lib/giras";

export const dynamic = "force-dynamic";

/// Códigos cortos: la matriz necesita que la celda quepa en una columna angosta.
const SIGLA: Record<string, string> = {
  POR_DEFINIR: "?",
  CASA: "Casa",
  MAINSTAGE: "Nosotros",
  PROVEEDOR: "Proveedor",
  ARTISTA: "Artista",
  SUSTITUIDO: "Sustituto",
  NO_CUBIERTO: "Sin cubrir",
  NO_APLICA: "N/A",
};

function colorCelda(c: CeldaMatriz): string {
  if (c.cubiertoPor === "NO_APLICA") return "bg-white/[0.02] text-[#555] border-[#1a1a1a]";
  if (ESTADOS_RESUELTOS.includes(c.estado)) return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
  if (c.faltante > 0 && c.prioridad === "INDISPENSABLE") return "bg-red-500/10 text-red-300 border-red-500/30";
  if (c.faltante > 0) return "bg-amber-500/10 text-amber-300 border-amber-500/30";
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

  const [matriz, grupos] = await Promise.all([matrizAdvance(id), faltantesPorProveedor(id)]);

  const resumenPorShow = new Map(gira.shows.map((s) => [s.id, resumirAdvance(s.riderLineas)]));
  const costoTotal = grupos.reduce((s, g) => s + g.costoEstimado, 0);
  const piezasTotal = grupos.reduce((s, g) => s + g.piezasFaltantes, 0);

  return (
    <div className="ms-page space-y-6 pb-16">
      <div>
        <h1 className="ms-h1">Advance de toda la gira</h1>
        <p className="ms-subtitle">
          {gira.artista.nombre} · {gira.nombre} · un renglón por concepto del rider, una columna por plaza
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Plazas</p>
          <p className="text-white text-xl font-semibold">{matriz.columnas.length}</p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Piezas por conseguir en la gira</p>
          <p className={`text-xl font-semibold ${piezasTotal > 0 ? "text-amber-300" : "text-emerald-300"}`}>
            {piezasTotal}
          </p>
        </div>
        <div className="ms-stat-card">
          <p className="ms-label mb-1">Costo estimado del faltante</p>
          <p className="text-white text-xl font-semibold">{fmtMoneda(costoTotal)}</p>
        </div>
      </div>

      {/* Matriz concepto × plaza */}
      {matriz.filas.length === 0 ? (
        <div className="ms-empty-state">
          <p className="text-sm text-gray-400">
            Todavía no hay advance en ninguna plaza. Entra a un show y ármalo desde el rider maestro.
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
                        {f.plazasConFaltante > 1 && (
                          <span className="ms-micro text-amber-300 block">
                            falta en {f.plazasConFaltante} plazas — conviene conseguirlo una sola vez
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
                              <span className="block text-[11px] font-semibold">{SIGLA[celda.cubiertoPor]}</span>
                              <span className="block text-[10px] opacity-80">
                                {celda.faltante > 0
                                  ? `falta ${celda.faltante} de ${celda.cantidadPedida}`
                                  : `${celda.cantidadCubierta}/${celda.cantidadPedida}`}
                              </span>
                              {celda.proveedorNombre && (
                                <span className="block text-[10px] opacity-70 truncate">{celda.proveedorNombre}</span>
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

      {/* Qué falta y con quién conseguirlo */}
      <div className="space-y-3">
        <h2 className="ms-h2">Qué falta conseguir, por plaza y disciplina</h2>
        {grupos.length === 0 ? (
          <div className="ms-empty-state">
            <p className="text-sm text-gray-400">No hay faltantes abiertos en la gira.</p>
          </div>
        ) : (
          grupos.map((g) => (
            <div key={`${g.ciudad}-${g.disciplina}`} className="ms-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-white font-semibold">
                    {g.ciudad} · {g.disciplinaLabel}
                  </p>
                  <p className="ms-meta">
                    {g.filas.length} conceptos · {g.piezasFaltantes} piezas · {g.indispensables} indispensables ·{" "}
                    {fmtMoneda(g.costoEstimado)} estimado
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full">
                  <thead className="ms-thead">
                    <tr>
                      <th className="ms-th">Concepto</th>
                      <th className="ms-th">Plaza</th>
                      <th className="ms-th">Falta</th>
                      <th className="ms-th">Prioridad</th>
                      <th className="ms-th">Estado</th>
                      <th className="ms-th">Proveedor asignado</th>
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
                        <td className="ms-td text-red-300 font-semibold">
                          {f.faltante} <span className="text-[#555] font-normal">de {f.cantidadPedida}</span>
                        </td>
                        <td className="ms-td">
                          <span className={`ms-badge ${PRIORIDAD_COLOR[f.prioridad]}`}>
                            {PRIORIDAD_LABEL[f.prioridad]}
                          </span>
                        </td>
                        <td className="ms-td text-gray-400">{ESTADO_ADVANCE_LABEL[f.estado]}</td>
                        <td className="ms-td text-gray-400">{f.proveedorNombre ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <p className="ms-label mb-1.5">Proveedores con cobertura en {g.ciudad}</p>
                {g.proveedores.length === 0 ? (
                  <p className="ms-meta">
                    Ninguno declarado para esta plaza y disciplina. Captura ciudades y disciplinas en el{" "}
                    <Link href="/directorio/proveedores" className="ms-link-gold">
                      directorio de proveedores
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {g.proveedores.map((p) => (
                      <span key={p.id} className="ms-card-inset px-3 py-1.5 text-xs text-gray-300">
                        {p.nombre}
                        {p.empresa && p.empresa !== p.nombre ? ` — ${p.empresa}` : ""}
                        {p.telefono ? ` · ${p.telefono}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
