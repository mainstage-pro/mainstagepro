import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resumenEquipos } from "@/lib/resumen/equipos";
import { relativo } from "@/lib/resumen/base";
import { EncabezadoResumen, Fila, Kpi, Panel, Badge, Vacio, BarraDistribucion } from "@/components/resumen/ui";
import { FilaOperable, type Accion } from "@/components/resumen/acciones";

export const dynamic = "force-dynamic";

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** Una falla se cierra, se manda a taller o se descarta; nada de eso mueve el estado del equipo. */
function accionesFalla(id: string): Accion[] {
  return [
    {
      clave: "resolver",
      label: "Resolver",
      endpoint: `/api/fallas/${id}`,
      metodo: "PATCH",
      tono: "verde",
      hecho: "Falla resuelta",
      cuerpo: { estado: "RESUELTA" },
      campos: [{ nombre: "notaCierre", etiqueta: "Qué se hizo", tipo: "texto", placeholder: "Cambio de cable, ajuste…" }],
    },
    {
      clave: "atender",
      label: "En atención",
      endpoint: `/api/fallas/${id}`,
      metodo: "PATCH",
      tono: "ambar",
      hecho: "Falla en atención",
      confirmar: "Marca la falla como ya tomada por alguien.",
      cuerpo: { estado: "EN_ATENCION" },
    },
    {
      clave: "descartar",
      label: "Descartar",
      endpoint: `/api/fallas/${id}`,
      metodo: "PATCH",
      tono: "neutro",
      hecho: "Falla descartada",
      cuerpo: { estado: "DESCARTADA" },
      campos: [{ nombre: "notaCierre", etiqueta: "Por qué", tipo: "texto", placeholder: "No se reprodujo, error de reporte…" }],
    },
  ];
}

/** La recolección se cierra desde aquí: el equipo ya está en bodega o va en camino. */
function accionesRecoleccion(id: string, hoy: string): Accion[] {
  return [
    {
      clave: "completada",
      label: "Ya en bodega",
      endpoint: `/api/proyectos/${id}`,
      metodo: "PATCH",
      tono: "verde",
      hecho: "Recolección cerrada",
      cuerpo: { recoleccionStatus: "COMPLETADA" },
      campos: [
        { nombre: "recoleccionFechaReal", etiqueta: "Cuándo llegó", tipo: "fecha", requerido: true, inicial: hoy },
        { nombre: "recoleccionNotas", etiqueta: "Observaciones", tipo: "texto", placeholder: "Faltantes, daños…" },
      ],
    },
    {
      clave: "camino",
      label: "En camino",
      endpoint: `/api/proyectos/${id}`,
      metodo: "PATCH",
      tono: "azul",
      hecho: "Recolección en camino",
      confirmar: "El equipo ya salió del venue pero aún no está en bodega.",
      cuerpo: { recoleccionStatus: "EN_CAMINO" },
    },
  ];
}

export default async function ResumenEquiposPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const r = await resumenEquipos();
  const fallasCriticas = r.fallas.filter(f => f.severidad === "CRITICA");
  const merma = r.totalUnidades - r.operativas;
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Resumen de equipos"
        subtitulo="Qué hay operativo, qué está caído y qué no va a alcanzar en los próximos eventos"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Kpi
          label="Unidades operativas"
          valor={r.operativas}
          nota={`de ${r.totalUnidades} · ${merma} fuera`}
          tono={merma === 0 ? "verde" : merma / Math.max(r.totalUnidades, 1) > 0.1 ? "rojo" : "ambar"}
          href="/equipos/tablero"
        />
        <Kpi
          label="Conflictos de agenda"
          valor={r.conflictos.length}
          nota="más comprometido que disponible"
          tono={r.conflictos.length > 0 ? "rojo" : "verde"}
          href="/equipos/disponibilidad"
        />
        <Kpi
          label="Fallas abiertas"
          valor={r.fallas.length}
          nota={fallasCriticas.length > 0 ? `${fallasCriticas.length} críticas` : "ninguna crítica"}
          tono={fallasCriticas.length > 0 ? "rojo" : r.fallas.length > 0 ? "ambar" : "verde"}
          href="/equipos/mantenimiento"
        />
        <Kpi
          label="Recolecciones"
          valor={r.recolecciones.length}
          nota="equipo sin regresar a bodega"
          tono={r.recolecciones.length > 0 ? "ambar" : "verde"}
          href="/equipos/recolecciones"
        />
        <Kpi
          label="En mantenimiento"
          valor={r.enMantenimiento.length}
          nota={`${r.dadosDeBaja.length} dados de baja`}
          tono={r.enMantenimiento.length > 0 ? "ambar" : "neutro"}
          href="/equipos/mantenimiento"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          titulo="Disponibilidad comprometida — 21 días"
          nota="pico de demanda por día, no suma del periodo"
          href="/equipos/disponibilidad"
          scroll
        >
          {r.conflictos.length === 0 && r.tension.length === 0 ? (
            <Vacio texto="Todo lo agendado cabe en el inventario" />
          ) : (
            <>
              {r.conflictos.map(c => (
                <Fila
                  key={`c-${c.id}-${c.fecha}`}
                  href="/equipos/disponibilidad"
                  tono="rojo"
                  titulo={c.nombre}
                  meta={fmtFecha(c.fecha)}
                  badge={<Badge tono="rojo">Faltan {c.requerido - c.disponible}</Badge>}
                  valor={`${c.requerido}/${c.disponible}`}
                />
              ))}
              {r.tension.map(c => (
                <Fila
                  key={`t-${c.id}-${c.fecha}`}
                  href="/equipos/disponibilidad"
                  tono="ambar"
                  titulo={c.nombre}
                  meta={fmtFecha(c.fecha)}
                  badge={<Badge tono="ambar">Al límite</Badge>}
                  valor={`${c.requerido}/${c.disponible}`}
                />
              ))}
            </>
          )}
        </Panel>

        <Panel titulo="Recolecciones pendientes" nota="eventos ya realizados con equipo fuera" href="/equipos/recolecciones" scroll>
          {r.recolecciones.length === 0 ? (
            <Vacio texto="Todo el equipo está de regreso" />
          ) : (
            r.recolecciones.map(p => (
              <FilaOperable
                key={p.id}
                href={`/proyectos/${p.id}`}
                tono={p.dias >= 7 ? "rojo" : "ambar"}
                titulo={`${p.numero} · ${p.cliente}`}
                meta={p.nombre}
                badge={p.estado === "EN_CAMINO" ? <Badge tono="azul">En camino</Badge> : undefined}
                valor={`${p.dias}d`}
                valorNota="desde el evento"
                acciones={accionesRecoleccion(p.id, hoy)}
              />
            ))
          )}
        </Panel>

        <Panel titulo="Fallas abiertas" nota={`${r.fallas.length} sin resolver`} href="/equipos/mantenimiento" scroll>
          {r.fallas.length === 0 ? (
            <Vacio texto="Sin fallas reportadas" />
          ) : (
            r.fallas.map(f => (
              <FilaOperable
                key={f.id}
                href={`/equipos/maestro?equipo=${f.equipoId}`}
                tono={f.severidad === "CRITICA" ? "rojo" : f.severidad === "MODERADA" ? "ambar" : "neutro"}
                titulo={f.nombre}
                meta={f.descripcion}
                badge={
                  <Badge tono={f.severidad === "CRITICA" ? "rojo" : f.severidad === "MODERADA" ? "ambar" : "neutro"}>
                    {f.severidad.toLowerCase()}
                  </Badge>
                }
                valor={`${f.dias}d`}
                acciones={accionesFalla(f.id)}
              />
            ))
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel titulo="Estado del inventario" nota={`${r.totalEquipos} equipos activos`} href="/equipos/tablero">
            <BarraDistribucion
              segmentos={[
                { label: "Operativas", valor: r.operativas, tono: "verde" },
                { label: "Fuera de servicio", valor: merma, tono: "rojo" },
              ]}
            />
          </Panel>

          <Panel titulo="Unidades caídas en equipos activos" nota="merma que no aparece en ningún estado" href="/equipos/tablero" scroll>
            {r.unidadesCaidas.length === 0 ? (
              <Vacio texto="Todas las unidades responden" />
            ) : (
              r.unidadesCaidas.map(e => (
                <Fila
                  key={e.id}
                  href={`/equipos/maestro?equipo=${e.id}`}
                  tono="ambar"
                  titulo={e.nombre}
                  meta={`${e.caidas} de ${e.total} unidades fuera`}
                  valor={`${e.operativas}/${e.total}`}
                />
              ))
            )}
          </Panel>

          <Panel titulo="Servicios próximos" nota="mantenimiento y vehículos en 21 días" href="/equipos/vehiculos" scroll>
            {r.mantenimientos.length === 0 && r.serviciosVehiculo.length === 0 ? (
              <Vacio texto="Sin servicios programados" />
            ) : (
              <>
                {r.mantenimientos.map(m => (
                  <Fila
                    key={m.id}
                    href="/equipos/mantenimiento"
                    tono={m.dias < 0 ? "rojo" : m.dias <= 7 ? "ambar" : "neutro"}
                    titulo={m.nombre}
                    meta={m.tipo.toLowerCase()}
                    valor={relativo(m.dias)}
                  />
                ))}
                {r.serviciosVehiculo.map(v => (
                  <Fila
                    key={v.id}
                    href="/equipos/vehiculos"
                    tono={v.dias < 0 ? "rojo" : v.dias <= 7 ? "ambar" : "neutro"}
                    titulo={v.nombre}
                    meta="servicio de vehículo"
                    valor={relativo(v.dias)}
                  />
                ))}
              </>
            )}
          </Panel>
        </div>
      </div>

      {(r.enMantenimiento.length > 0 || r.dadosDeBaja.length > 0) && (
        <Panel
          titulo="Equipos fuera de servicio"
          nota={`${r.enMantenimiento.length} en taller · ${r.dadosDeBaja.length} dados de baja`}
          href="/equipos/tablero"
          className="mt-4"
          scroll="alto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {[...r.enMantenimiento, ...r.dadosDeBaja].map(e => (
              <Fila
                key={e.id}
                href={`/equipos/maestro?equipo=${e.id}`}
                tono={e.estado === "DADO_DE_BAJA" ? "neutro" : "ambar"}
                titulo={e.nombre}
                meta={e.categoria}
                badge={<Badge tono={e.estado === "DADO_DE_BAJA" ? "neutro" : "ambar"}>{e.estadoLabel}</Badge>}
                valor={e.dias !== null ? `${e.dias}d` : undefined}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
