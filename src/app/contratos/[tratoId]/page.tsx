"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface Trato {
  id: string;
  nombreEvento: string | null;
  tipoEvento: string;
  tipoServicio: string | null;
  fechaEventoEstimada: string | null;
  lugarEstimado: string | null;
  asistentesEstimados: number | null;
  duracionEvento: string | null;
  etapa: string;
  cliente: {
    nombre: string;
    empresa: string | null;
    telefono: string | null;
    correo: string | null;
  };
  responsable: { name: string } | null;
}
interface CxC { tipoPago: string; monto: number; fechaCompromiso: string; estado: string }
interface Linea {
  id: string; tipo: string; descripcion: string;
  marca: string | null; modelo: string | null;
  cantidad: number; dias: number; subtotal: number;
  esIncluido: boolean; notas: string | null;
}
interface Cotizacion {
  id: string;
  numeroCotizacion: string;
  granTotal: number;
  aplicaIva: boolean;
  montoIva: number;
  descuentoTotalPct: number;
  montoDescuento: number;
  subtotalEquiposNeto: number;
  subtotalTransporte: number;
  subtotalHospedaje: number;
  subtotalComidas: number;
  lineas: Linea[];
  cuentasCobrar: CxC[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateShort(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const TIPO_SERVICIO: Record<string, string> = {
  RENTA: "Renta de Equipo",
  PRODUCCION_TECNICA: "Producción Técnica Integral",
  DIRECCION_TECNICA: "Dirección Técnica",
  MULTISERVICIO: "Paquete Multiservicio",
};
const GRUPO_LINEA: Record<string, string> = {
  EQUIPO_PROPIO: "Equipo de Renta",
  EQUIPO_EXTERNO: "Equipo Externo / Subrentado",
  PAQUETE: "Paquetes",
  OPERACION_TECNICA: "Personal Técnico y Operación",
  TRANSPORTE: "Transporte y Logística",
  HOSPEDAJE: "Hospedaje",
  COMIDA: "Alimentación",
  DJ: "Servicios de DJ",
  OTRO: "Servicios Adicionales",
};

export default function ContratoPage({ params }: { params: Promise<{ tratoId: string }> }) {
  const { tratoId } = use(params);
  const [trato, setTrato] = useState<Trato | null>(null);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/contratos/${tratoId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setTrato(d.trato);
        setCotizacion(d.cotizacion);
        setLoading(false);
      });
  }, [tratoId]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-400 text-sm">Generando contrato...</p>
      </div>
    </div>
  );

  if (error || !trato) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-red-400">{error || "No se encontró el trato"}</p>
    </div>
  );

  const anticipo = cotizacion?.cuentasCobrar.find(c => c.tipoPago === "ANTICIPO");
  const liquidacion = cotizacion?.cuentasCobrar.find(c => c.tipoPago === "LIQUIDACION");
  const granTotal = cotizacion?.granTotal ?? 0;
  const montoAnticipo = anticipo?.monto ?? 0;
  const montoSaldo = liquidacion?.monto ?? (granTotal - montoAnticipo);
  const fechaLimiteSaldo = trato.fechaEventoEstimada
    ? new Date(new Date(trato.fechaEventoEstimada).getTime() - 86400000).toISOString()
    : null;

  const grupos: Record<string, Linea[]> = {};
  const incluidos: Linea[] = [];
  if (cotizacion) {
    for (const l of cotizacion.lineas) {
      if (l.esIncluido) { incluidos.push(l); continue; }
      const g = GRUPO_LINEA[l.tipo] ?? "Servicios Adicionales";
      if (!grupos[g]) grupos[g] = [];
      grupos[g].push(l);
    }
  }

  const hoy = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Barra superior */}
      <div className="sticky top-0 z-50 bg-[#0d0d0d] border-b border-[#1a1a1a] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Volver
          </button>
          <span className="text-[#333]">|</span>
          <span className="text-gray-400 text-sm">
            Contrato — {trato.nombreEvento || trato.cliente.nombre}
          </span>
        </div>
        <a
          href={`/api/contratos/${tratoId}/pdf`}
          className="bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
        >
          Descargar PDF
        </a>
      </div>

      {/* Vista previa del contrato */}
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-0">

        {/* Header negro / dorado */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-t-xl overflow-hidden">
          <div className="bg-[#0a0a0a] px-8 py-6 flex items-end justify-between border-b-2 border-[#B3985B]">
            <div>
              <p className="text-[#B3985B] text-xl font-bold tracking-widest">MAINSTAGE PRODUCCIONES</p>
              <p className="text-gray-500 text-xs tracking-widest mt-1">PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold tracking-wider">CONTRATO DE SERVICIOS</p>
              {cotizacion && <p className="text-gray-500 text-xs mt-1">Ref. cotización {cotizacion.numeroCotizacion}</p>}
              <p className="text-gray-500 text-xs">{hoy}</p>
            </div>
          </div>

          {/* Subtítulo */}
          <div className="bg-[#111] px-8 py-3 text-center">
            <p className="text-gray-400 text-xs tracking-widest italic">Contrato de Servicios de Producción Técnica</p>
          </div>

          {/* Partes */}
          <div className="px-8 py-5 grid grid-cols-2 gap-6 border-b border-[#1a1a1a]">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">El Proveedor</p>
              <p className="text-white font-bold">MAINSTAGE PRODUCCIONES</p>
              <p className="text-gray-500 text-xs mt-1">Producción técnica y renta de equipo</p>
            </div>
            <div className="border-l border-[#222] pl-6">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">El Cliente</p>
              <p className="text-white font-bold">{trato.cliente.nombre.toUpperCase()}</p>
              {trato.cliente.empresa && <p className="text-gray-400 text-sm">{trato.cliente.empresa}</p>}
              {trato.cliente.telefono && <p className="text-gray-500 text-xs mt-1">{trato.cliente.telefono}</p>}
              {trato.cliente.correo && <p className="text-gray-500 text-xs">{trato.cliente.correo}</p>}
            </div>
          </div>
        </div>

        {/* Sección 1: Datos del evento */}
        <SeccionCard num="1" titulo="Objeto y Datos del Evento">
          <p className="text-sm text-gray-400 mb-4">
            EL PROVEEDOR prestará servicios de{" "}
            <span className="text-white font-medium">
              {TIPO_SERVICIO[trato.tipoServicio ?? ""] || "producción técnica y/o renta de equipo"}
            </span>{" "}
            para el evento descrito a continuación.
            {cotizacion && ` La cotización aprobada (${cotizacion.numeroCotizacion}) forma parte integral de este contrato.`}
          </p>

          <div className="bg-[#0d0d0d] rounded-lg overflow-hidden mb-4">
            {[
              { label: "Nombre del evento", value: trato.nombreEvento || "—" },
              { label: "Tipo de evento", value: trato.tipoEvento },
              { label: "Fecha del evento", value: fmtDate(trato.fechaEventoEstimada) },
              { label: "Lugar", value: trato.lugarEstimado || "A confirmar" },
              trato.asistentesEstimados ? { label: "Asistentes estimados", value: trato.asistentesEstimados.toLocaleString() } : null,
              trato.duracionEvento ? { label: "Duración del servicio", value: trato.duracionEvento } : null,
              cotizacion ? { label: "Ref. cotización", value: cotizacion.numeroCotizacion } : null,
            ].filter(Boolean).map((row, i) => (
              <div key={i} className="flex items-center border-b border-[#1a1a1a] last:border-0">
                <span className="text-gray-500 text-xs px-4 py-2.5 w-44 shrink-0">{row!.label}</span>
                <span className="text-white text-sm font-medium px-4 py-2.5">{row!.value}</span>
              </div>
            ))}
          </div>

          {/* Tabla de servicios */}
          {Object.keys(grupos).length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Alcance de servicios contratados</p>
              {Object.entries(grupos).map(([grupo, lineas]) => (
                <div key={grupo} className="bg-[#0d0d0d] rounded-lg overflow-hidden">
                  <div className="bg-[#0a0a0a] px-4 py-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{grupo}</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        <th className="text-left text-gray-600 px-4 py-2 font-normal">Descripción</th>
                        <th className="text-center text-gray-600 px-3 py-2 font-normal w-16">Cant.</th>
                        <th className="text-center text-gray-600 px-3 py-2 font-normal w-16">Días</th>
                        <th className="text-right text-gray-600 px-4 py-2 font-normal w-28">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.map((l, i) => (
                        <tr key={l.id} className={`border-b border-[#111] last:border-0 ${i % 2 === 1 ? "bg-[#0f0f0f]" : ""}`}>
                          <td className="px-4 py-2.5">
                            <span className="text-white">{l.descripcion}</span>
                            {(l.marca || l.modelo) && (
                              <span className="text-gray-500 ml-2">{[l.marca, l.modelo].filter(Boolean).join(" ")}</span>
                            )}
                            {l.notas && <p className="text-gray-600 italic text-[10px] mt-0.5">{l.notas}</p>}
                          </td>
                          <td className="text-center text-gray-400 px-3 py-2.5">{l.cantidad}</td>
                          <td className="text-center text-gray-400 px-3 py-2.5">{l.dias}</td>
                          <td className="text-right text-white font-medium px-4 py-2.5">{fmt(l.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {incluidos.length > 0 && (
                <div className="bg-[#0d0d0d] rounded-lg px-4 py-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Incluido sin costo adicional</p>
                  <ul className="space-y-1">
                    {incluidos.map(l => (
                      <li key={l.id} className="text-gray-400 text-xs flex items-center gap-2">
                        <span className="text-[#B3985B]">·</span> {l.descripcion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resumen precios */}
              {cotizacion && (
                <div className="flex justify-end">
                  <div className="w-64 border-t-2 border-[#B3985B] pt-1">
                    {cotizacion.descuentoTotalPct > 0 && (
                      <ResumenFila label={`Descuento (${cotizacion.descuentoTotalPct.toFixed(1)}%)`} value={`−${fmt(cotizacion.montoDescuento)}`} rojo />
                    )}
                    {cotizacion.subtotalTransporte > 0 && <ResumenFila label="Transporte" value={fmt(cotizacion.subtotalTransporte)} />}
                    {cotizacion.subtotalHospedaje > 0 && <ResumenFila label="Hospedaje" value={fmt(cotizacion.subtotalHospedaje)} />}
                    {cotizacion.subtotalComidas > 0 && <ResumenFila label="Alimentación" value={fmt(cotizacion.subtotalComidas)} />}
                    {cotizacion.aplicaIva && <ResumenFila label="IVA (16%)" value={fmt(cotizacion.montoIva)} />}
                    <div className="bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-3 flex justify-between items-center mt-1">
                      <span className="text-white font-bold text-sm">TOTAL</span>
                      <span className="text-[#B3985B] font-bold text-lg">{fmt(granTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SeccionCard>

        {/* Sección 2: Precio y pagos */}
        {trato.tipoServicio === "RENTA" ? (
          <SeccionCard num="2" titulo="Reserva, Pagos y Facturación">
            <div className="grid grid-cols-3 gap-3 mb-5">
              <PagoCard label="Total del servicio" monto={fmt(granTotal)} />
              <PagoCard
                label="Anticipo (50%)"
                monto={montoAnticipo > 0 ? fmt(montoAnticipo) : fmt(granTotal * 0.5)}
                fecha="Requerido para reservar equipo y fecha"
              />
              <PagoCard
                label="Saldo (50%)"
                monto={montoSaldo > 0 ? fmt(montoSaldo) : fmt(granTotal * 0.5)}
                fecha="A la entrega o retiro del equipo"
              />
            </div>
            <ClausulasList items={[
              "Para reservar EL EQUIPO se requiere anticipo del 50% del total indicado en LA COTIZACIÓN.",
              "El 50% restante se paga a la entrega o al retiro del equipo, salvo que LA COTIZACIÓN disponga otro calendario.",
              "Si el anticipo no se paga, EL ARRENDADOR no está obligado a reservar disponibilidad de equipo ni fecha.",
              "Si el saldo no se paga en el momento pactado, EL ARRENDADOR podrá no entregar EL EQUIPO sin penalización.",
            ]} />
          </SeccionCard>
        ) : (
          <SeccionCard num="2" titulo="Precio, Anticipo, Saldo y Cancelaciones">
            <div className="grid grid-cols-3 gap-3 mb-5">
              <PagoCard label="Total del servicio" monto={fmt(granTotal)} />
              <PagoCard
                label="Anticipo"
                monto={montoAnticipo > 0 ? fmt(montoAnticipo) : "A definir"}
                fecha={anticipo?.fechaCompromiso ? `Fecha límite: ${fmtDateShort(anticipo.fechaCompromiso)}` : undefined}
              />
              <PagoCard
                label="Saldo restante"
                monto={montoSaldo > 0 ? fmt(montoSaldo) : "—"}
                fecha={fechaLimiteSaldo ? `Fecha límite: ${fmtDateShort(fechaLimiteSaldo)}` : "1 día antes del evento"}
              />
            </div>
            <ClausulasList items={[
              "Sin pago de anticipo, la fecha no se considera reservada ni el equipo apartado.",
              "Si el saldo no se cubre en la fecha límite, EL PROVEEDOR no estará obligado a montar ni prestar el servicio, considerándose cancelado sin devolución.",
              "En caso de cancelación por parte de EL CLIENTE, el anticipo no es reembolsable.",
              "Para posponer la fecha se requiere aviso con mínimo 14 días naturales. La nueva fecha debe realizarse en los 12 meses siguientes; de lo contrario se considera cancelación.",
              "Cambios de domicilio o horario están sujetos a aprobación y pueden generar cargos adicionales.",
            ]} />
          </SeccionCard>
        )}

        {/* Secciones 3-6: varían según tipo de servicio */}
        {trato.tipoServicio === "RENTA" ? (
          <>
            <SeccionCard num="3" titulo="Entrega, Devolución y Revisión">
              <ClausulasList items={[
                "La entrega/devolución se realizará conforme a lo indicado en LA COTIZACIÓN (retiro en bodega o entrega/recolección a domicilio).",
                "EL EQUIPO se entrega probado y en correcto funcionamiento, salvo constancia escrita en la Hoja de Entrega.",
                "A la devolución se realiza revisión inmediata contra la Hoja de Entrega (Check-in & Check-out).",
                "EL ARRENDADOR tendrá hasta 5 días naturales posteriores a la devolución para notificar daños no aparentes o fallas derivadas de la operación durante la renta.",
              ]} />
            </SeccionCard>

            <SeccionCard num="4" titulo="Uso, Custodia y Responsabilidad">
              <ClausulasList items={[
                "Desde la salida del equipo de bodega y hasta su recepción y revisión de devolución, todo riesgo corre por cuenta de EL CLIENTE (transporte, montaje, operación y desmontaje).",
                "EL CLIENTE se obliga a operar el equipo con personal capacitado y a evitar exposición a lluvia, humedad, alimentos/bebidas, polvo excesivo o golpes.",
                "Queda prohibida la modificación, apertura o reparación del equipo sin autorización expresa de MAINSTAGE.",
              ]} />
            </SeccionCard>

            <SeccionCard num="5" titulo="Daños, Pérdida o Robo">
              <ClausulasList items={[
                "EL CLIENTE responde por cualquier daño, golpe o falla por mal uso, así como por pérdida, extravío o robo del equipo y/o accesorios, por parte de su personal o terceros bajo su control.",
                "En caso de daño, EL CLIENTE cubrirá el costo de reparación con base en cotización de servicio técnico especializado o el valor de reposición.",
                "En caso de pérdida/extravío/robo, EL CLIENTE tendrá hasta 7 días naturales para localizar o recuperar el equipo. Si no se recupera, procederá el cobro total de reposición o reposición en especie (según acuerden las partes).",
              ]} />
            </SeccionCard>

            <SeccionCard num="6" titulo="Fallas Durante la Renta y Soporte">
              <ClausulasList items={[
                "Cualquier falla debe reportarse de inmediato a MAINSTAGE, adjuntando evidencia (foto/video).",
                "MAINSTAGE podrá brindar soporte remoto y/o, si existe disponibilidad, reemplazo de equipo.",
                "MAINSTAGE no será responsable por pérdidas económicas, cancelaciones o daños indirectos derivados de fallas o imposibilidad de reemplazo.",
              ]} />
            </SeccionCard>
          </>
        ) : (
          <>
            <SeccionCard num="3" titulo="Alcance del Servicio y Cambios">
              <ClausulasList items={[
                "EL PROVEEDOR prestará el servicio con el equipo, personal y horarios de la cotización aprobada.",
                "Servicios adicionales, modificaciones u horas extra deben solicitarse por escrito con mínimo 3 días naturales de anticipación.",
                "Ajustes de horario deben comunicarse con al menos 5 días naturales de anticipación.",
                "En caso de indisponibilidad por fuerza mayor, EL PROVEEDOR podrá sustituir equipo por uno de características iguales o superiores.",
                "Modificaciones sustanciales al alcance requieren adenda escrita firmada por ambas partes.",
              ]} />
            </SeccionCard>

            <SeccionCard num="4" titulo="Seguridad, Operación Técnica, Energía y Clima">
              <ClausulasList items={[
                "EL PROVEEDOR tiene la decisión técnica final sobre ubicación, montaje, estructuras y cableado.",
                "Nadie ajeno al personal de EL PROVEEDOR podrá manipular o mover el equipo sin autorización escrita.",
                "EL CLIENTE garantiza suministro eléctrico suficiente. Fallas del venue o terceros son responsabilidad de estos.",
                "Ante condiciones climáticas adversas, EL PROVEEDOR puede suspender el servicio privilegiando la seguridad, sin bonificación.",
                "EL CLIENTE es responsable de obtener los permisos y licencias que el evento requiera.",
              ]} />
            </SeccionCard>

            <SeccionCard num="5" titulo="Daños al Equipo y No Bonificaciones">
              <ClausulasList items={[
                "EL CLIENTE responde por daños al equipo: descargas eléctricas ajenas a EL PROVEEDOR, golpes, manipulación no autorizada, exposición a líquidos o alimentos, extravío o robo.",
                "No habrá bonificación por cortes eléctricos ajenos a EL PROVEEDOR, terminación anticipada por EL CLIENTE, o condiciones del venue que impidan el servicio.",
                "La responsabilidad total de EL PROVEEDOR no excederá el monto total del servicio contratado.",
              ]} />
            </SeccionCard>

            <SeccionCard num="6" titulo="Retrasos Imputables a Mainstage Producciones">
              <p className="text-gray-400 text-sm leading-relaxed">
                En caso de retraso imputable únicamente a EL PROVEEDOR, este compensará cumpliendo las horas pactadas siempre que las condiciones del venue y la seguridad lo permitan, sin otro tipo de penalización económica.
              </p>
            </SeccionCard>
          </>
        )}

        <SeccionCard num="7" titulo="Limitación de Responsabilidad">
          <p className="text-gray-400 text-sm leading-relaxed">
            En la máxima medida permitida por la ley, la responsabilidad total de MAINSTAGE relacionada con {trato.tipoServicio === "RENTA" ? "la renta" : "el servicio"} quedará limitada al monto efectivamente pagado por EL CLIENTE en LA COTIZACIÓN correspondiente, excluyendo daños indirectos, lucro cesante o pérdida de oportunidad.
          </p>
        </SeccionCard>

        <SeccionCard num="8-10" titulo="Disposiciones Generales">
          <div className="space-y-3">
            <SubSeccion titulo="8. Comunicación Oficial">
              Las comunicaciones serán por escrito vía correo electrónico o WhatsApp. Los acuerdos verbales deben confirmarse por escrito. EL CLIENTE autoriza conservar sus datos conforme a la LFPDPPP.
            </SubSeccion>
            {trato.tipoServicio !== "RENTA" && (
              <SubSeccion titulo="8b. Fotografía y Medios">
                EL PROVEEDOR se reserva el derecho de documentar el evento para portafolio y promoción. Si EL CLIENTE desea restringirlo, debe notificarlo por escrito antes de firmar.
              </SubSeccion>
            )}
            <SubSeccion titulo="9. Caso Fortuito y Fuerza Mayor">
              Ninguna parte será responsable por desastres naturales, actos de autoridad, pandemia u otros eventos fuera de su control razonable.
            </SubSeccion>
            <SubSeccion titulo="10. Vigencia y Actualizaciones">
              MAINSTAGE podrá actualizar los Términos y Condiciones aplicables. Los cambios no aplicarán retroactivamente a cotizaciones ya aceptadas, salvo que ambas partes lo acuerden por escrito.
            </SubSeccion>
            <SubSeccion titulo="10b. Jurisdicción">
              Las partes se someten a los tribunales competentes de la ciudad de Querétaro, Qro., renunciando a cualquier otro fuero.
            </SubSeccion>
          </div>
        </SeccionCard>

        {/* Sección: Firmas */}
        <div className="bg-[#111] border border-[#222] rounded-b-xl px-8 py-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#1a1a1a]">
            <div className="w-4 h-0.5 bg-[#B3985B]"></div>
            <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest">11. Aceptación y Firma</p>
          </div>

          <p className="text-gray-400 text-sm mb-8">
            Leído el presente contrato, las partes manifiestan su conformidad y lo aceptan como documento legalmente vinculante, firmándolo en{" "}
            <span className="text-white">{trato.lugarEstimado || "_______________"}</span>, el día{" "}
            <span className="text-white">{hoy}</span>.
          </p>

          <div className="grid grid-cols-2 gap-16">
            <FirmaBloque
              rol="El Cliente"
              nombre={trato.cliente.nombre}
              detalle={trato.cliente.empresa ?? undefined}
            />
            <FirmaBloque
              rol="El Proveedor"
              nombre="MAINSTAGE PRODUCCIONES"
              detalle={trato.responsable?.name}
            />
          </div>

          {/* Nota */}
          <div className="mt-8 bg-[#0d0d0d] border border-[#B3985B]/30 rounded-lg px-4 py-3">
            <p className="text-[#B3985B] text-xs font-bold mb-1">ACEPTACIÓN POR MEDIOS ELECTRÓNICOS</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              {trato.tipoServicio === "RENTA"
                ? "Estos Términos y Condiciones se consideran aceptados cuando EL CLIENTE (i) aprueba/acepta LA COTIZACIÓN por medios digitales (firma, botón de aprobación, respuesta confirmatoria por correo o mensaje) y (ii) realiza el pago del anticipo o del total, según aplique."
                : "Este contrato es válido con la aprobación digital de la cotización, el pago del anticipo correspondiente, o la firma autógrafa de ambas partes. La evidencia digital y los comprobantes de pago forman parte del acuerdo."}
              {cotizacion && ` La cotización de referencia (${cotizacion.numeroCotizacion}) forma parte integral del mismo.`}
              {" "}Contacto: mainstageqro@gmail.com | Tel/WhatsApp: 446 143 2565
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-[#1a1a1a] flex items-center justify-between">
            <p className="text-[#B3985B] text-xs font-bold tracking-wider">MAINSTAGE PRODUCCIONES</p>
            <p className="text-gray-600 text-xs">Producción técnica profesional</p>
            <a
              href={`/api/contratos/${tratoId}/pdf`}
              className="bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
            >
              Descargar PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function SeccionCard({ num, titulo, children }: { num: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border-x border-b border-[#222] px-8 py-5">
      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-[#1a1a1a]">
        <div className="w-4 h-0.5 bg-[#B3985B]"></div>
        <p className="text-[#B3985B] text-xs font-bold uppercase tracking-widest">{num}. {titulo}</p>
      </div>
      {children}
    </div>
  );
}

function PagoCard({ label, monto, fecha }: { label: string; monto: string; fecha?: string }) {
  return (
    <div className="bg-[#0d0d0d] border-l-2 border-[#B3985B] px-4 py-3 rounded-r-lg">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-white font-bold text-base">{monto}</p>
      {fecha && <p className="text-gray-500 text-xs mt-1">{fecha}</p>}
    </div>
  );
}

function ClausulasList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-400 leading-relaxed">
          <span className="text-[#B3985B] font-bold shrink-0 mt-0.5">{i + 1}.</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function SubSeccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-white text-xs font-semibold mb-1">{titulo}</p>
      <p className="text-gray-400 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function ResumenFila({ label, value, rojo }: { label: string; value: string; rojo?: boolean }) {
  return (
    <div className="flex justify-between px-2 py-1.5 border-b border-[#1a1a1a] text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={rojo ? "text-red-400" : "text-white"}>{value}</span>
    </div>
  );
}

function FirmaBloque({ rol, nombre, detalle }: { rol: string; nombre: string; detalle?: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-8 text-center">{rol}</p>
      <div className="border-b border-gray-600 mb-2 h-10"></div>
      <p className="text-white text-sm font-semibold">{nombre}</p>
      {detalle && <p className="text-gray-500 text-xs mt-0.5">{detalle}</p>}
      <div className="mt-5 border-b border-[#333] mb-1 h-6"></div>
      <p className="text-gray-600 text-xs">Lugar y fecha</p>
    </div>
  );
}
