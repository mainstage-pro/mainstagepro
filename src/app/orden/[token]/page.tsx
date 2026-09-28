"use client";

import Link from "next/link";
import { useOrden } from "./OrdenContext";
import { Barra, Cargando, Chip, Dato, Seccion, Telefono, fechaLarga, horaCorta } from "./ui";
import { PASE_LABEL, type TipoPase } from "@/lib/control-carga";

export default function ResumenPage() {
  const { orden, cargando, token } = useOrden();
  if (cargando || !orden) return <Cargando />;

  const o = orden;
  const abierto = o.pases.find((p) => p.estado === "EN_CURSO");

  return (
    <>
      {/* Lo primero que alguien necesita saber al abrir el link en la camioneta. */}
      <Seccion titulo="El evento">
        <Dato label="Cliente" valor={o.cliente.empresa || o.cliente.nombre} />
        <Dato label="Tipo" valor={[o.tipoEvento, o.tipoServicio].filter(Boolean).join(" · ")} />
        <Dato label="Fecha del evento" valor={fechaLarga(o.fechaEvento)} />
        <Dato
          label="Horario"
          valor={[o.horaInicioEvento, o.horaFinEvento].filter(Boolean).join(" – ")}
        />
        <Dato label="Lugar" valor={o.lugarEvento} />
        <Dato
          label="Dirección"
          valor={
            o.direccionVenue && (
              <>
                <p>{o.direccionVenue}</p>
                {o.linkMaps && (
                  <a
                    href={o.linkMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-2 bg-[#B3985B]/10 border border-[#B3985B]/25 rounded-lg text-[#B3985B] text-xs font-semibold"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Abrir en Maps
                  </a>
                )}
              </>
            )
          }
        />
        <Dato label="Indicaciones de acceso" valor={o.indicacionesAcceso} />
      </Seccion>

      {/* Antes que cualquier dato operativo: a quién le hago caso y quién autoriza. */}
      <Seccion titulo="Quién manda" descripcion="Las tres preguntas que en sitio se resuelven a gritos.">
        <div className="space-y-3">
          {o.mando.map((e, i) => (
            <div key={i} className="py-2 border-b border-white/5 last:border-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-white/30 text-[11px] uppercase tracking-wide shrink-0">{e.rol}</span>
                <span className={`text-sm font-semibold text-right ${e.nombre ? "text-white/85" : "text-amber-400"}`}>
                  {e.nombre ?? "Sin asignar"}
                </span>
              </div>
              {e.contacto && <p className="text-xs text-right mt-0.5"><Telefono numero={e.contacto} /></p>}
              <p className="text-white/30 text-xs mt-1">{e.regla}</p>
            </div>
          ))}
        </div>
      </Seccion>

      {/* Entarimado: dónde van las bajadas es lo que nadie trae anotado. */}
      {o.escenario && (
        <Seccion titulo="Escenario y entarimado">
          <Dato label="Medidas" valor={o.escenario.medidas} />
          <Dato label="Altura" valor={o.escenario.alturaM != null ? `${o.escenario.alturaM} m` : null} />
          <Dato label="Lo pone" valor={o.escenario.proveedor} />
          <Dato
            label="Bajadas / escaleras"
            valor={
              o.escenario.accesos ?? (
                <span className="text-amber-400">Por confirmar con el cliente</span>
              )
            }
          />
          <Dato label="Notas" valor={o.escenario.notas} />
        </Seccion>
      )}

      {/* Salida de bodega: la hora que determina si el día arranca bien. */}
      {(o.llamadoBodega || o.horaSalidaBodega || o.lugarLlamado || o.choferNombre || o.transportes.length > 0) && (
        <Seccion titulo="Salida de bodega">
          <Dato
            label="Llamado"
            valor={[fechaLarga(o.llamadoBodega), horaCorta(o.llamadoBodega)].filter(Boolean).join(" · ")}
          />
          <Dato label="Punto de reunión" valor={o.lugarLlamado || o.puntoSalidaBodega} />
          <Dato label="Hora de salida" valor={o.horaSalidaBodega} />
          <Dato label="Chofer" valor={o.choferNombre} />
          {o.transportes.length > 0 && (
            <Dato
              label="Transportes"
              valor={
                <ul className="space-y-1">
                  {o.transportes.map((t, i) => (
                    <li key={i}>
                      {[t.vehiculoNombre, t.choferNombre, t.horaSalida].filter(Boolean).join(" · ")}
                    </li>
                  ))}
                </ul>
              }
            />
          )}
        </Seccion>
      )}

      {/* Estado del control de carga con acceso directo: es la acción del día. */}
      <Seccion
        titulo="Control de carga"
        descripcion="Salida y retorno del equipo, marcado en sitio."
        accion={
          <Link
            href={`/orden/${token}/carga`}
            className="shrink-0 px-3 py-1.5 bg-[#B3985B] text-black rounded-lg text-xs font-bold"
          >
            {abierto ? "Continuar" : "Abrir pase"}
          </Link>
        }
      >
        {o.pases.length === 0 ? (
          <p className="text-white/25 text-sm">Todavía no se abre ningún pase.</p>
        ) : (
          <div className="space-y-3">
            {o.pases.map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-white/70 text-sm font-medium">
                    {PASE_LABEL[p.tipo as TipoPase] ?? p.tipo}
                    {p.etiqueta ? ` · ${p.etiqueta}` : ""}
                  </span>
                  <Chip tono={p.estado === "CERRADA" ? "verde" : "ambar"}>
                    {p.estado === "CERRADA" ? "Cerrado" : "En curso"}
                  </Chip>
                </div>
                <Barra pct={p.avance.pct} tono={p.estado === "CERRADA" ? "verde" : "oro"} />
                <p className="text-white/30 text-[11px] mt-1.5">
                  {p.avance.revisados}/{p.avance.total} revisados
                  {p.avance.faltantes > 0 && ` · ${p.avance.faltantes} faltante(s)`}
                  {p.avance.danados > 0 && ` · ${p.avance.danados} dañado(s)`}
                </p>
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {(o.briefObjetivo || o.briefAcomodo || o.briefRestricciones) && (
        <Seccion titulo="Brief de producción" descripcion="Qué se busca lograr y con qué límites.">
          <Dato label="Objetivo" valor={o.briefObjetivo} />
          <Dato label="Acomodo" valor={o.briefAcomodo} />
          <Dato label="Restricciones" valor={o.briefRestricciones} />
        </Seccion>
      )}

      <Seccion titulo="Contactos">
        <Dato label="Encargado Mainstage" valor={o.encargadoNombre} />
        <Dato
          label="Encargado del cliente"
          valor={o.encargadoCliente && <>{o.encargadoCliente} {o.encargadoClienteContacto && <>· <Telefono numero={o.encargadoClienteContacto} /></>}</>}
        />
        <Dato
          label="Encargado del lugar"
          valor={o.encargadoLugar && <>{o.encargadoLugar} {o.encargadoLugarContacto && <>· <Telefono numero={o.encargadoLugarContacto} /></>}</>}
        />
        <Dato label="Emergencias" valor={o.contactosEmergencia} />
        <Dato label="Indicaciones del cliente" valor={o.indicacionesCliente} />
        <Dato label="Catering" valor={o.aplicaCatering ? o.proveedorCatering || "Sí aplica" : null} />
      </Seccion>

      {o.personal.length > 0 && (
        <Seccion titulo="Equipo de trabajo">
          <div className="space-y-2">
            {o.personal.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="text-white/80 text-sm font-medium truncate">
                    {t.coordinaEnSitio && <span className="text-[#B3985B]">★ </span>}
                    {t.nombre}
                  </p>
                  <p className="text-white/30 text-xs truncate">
                    {[t.rol, t.participacion].filter(Boolean).join(" · ") || "Sin rol asignado"}
                  </p>
                  {t.responsabilidad && (
                    <p className="text-white/40 text-xs mt-0.5">{t.responsabilidad}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {t.celular && <p className="text-xs"><Telefono numero={t.celular} /></p>}
                  {!t.confirmado && <Chip tono="ambar">Sin confirmar</Chip>}
                </div>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {o.proveedores.length > 0 && (
        <Seccion titulo="Proveedores">
          <div className="space-y-2">
            {o.proveedores.map((pv, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="text-white/80 text-sm font-medium truncate">{pv.nombre}</p>
                  <p className="text-white/30 text-xs truncate">
                    {pv.servicio}
                    {/* Sin dueño nadie lo recibe ni lo revisa: se ve como pendiente. */}
                    {pv.responsable
                      ? `${pv.servicio ? " · " : ""}Lo atiende ${pv.responsable}`
                      : null}
                  </p>
                  {!pv.responsable && (
                    <p className="text-amber-400/80 text-xs mt-0.5">Sin responsable asignado</p>
                  )}
                </div>
                {pv.telefono && <p className="shrink-0 text-xs"><Telefono numero={pv.telefono} /></p>}
              </div>
            ))}
          </div>
        </Seccion>
      )}

      <p className="text-white/15 text-xs text-center mt-8">Mainstage Pro · Orden de producción</p>
    </>
  );
}
