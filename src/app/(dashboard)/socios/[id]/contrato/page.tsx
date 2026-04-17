import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: Date | null | string | undefined) => {
  if (!d) return "_______________";
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
};

const CAT_LABEL: Record<string, string> = {
  AUDIO: "Audio", ILUMINACION: "Iluminación", VIDEO: "Video",
  ESTRUCTURAS: "Estructuras", ACCESORIOS: "Accesorios", OTRO: "Otro",
};

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const socio = await prisma.socio.findUnique({
    where: { id },
    include: {
      activos: { where: { activo: true }, orderBy: { codigoInventario: "asc" } },
    },
  });

  if (!socio) notFound();

  const totalValorDeclarado = socio.activos.reduce((s, a) => s + a.valorDeclarado, 0);
  const hoy = new Date();

  return (
    <html lang="es">
      <head>
        <title>Contrato de Aportación de Activos — {socio.nombre}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #111; background: #fff; }
          .page { max-width: 780px; margin: 0 auto; padding: 40px 50px; }
          h1 { font-size: 14pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
          h2 { font-size: 12pt; text-transform: uppercase; margin: 24px 0 8px; border-bottom: 1px solid #333; padding-bottom: 3px; }
          h3 { font-size: 11pt; margin: 18px 0 6px; }
          p { line-height: 1.7; margin-bottom: 8px; text-align: justify; }
          .subtitle { text-align: center; font-size: 10pt; color: #444; margin-bottom: 6px; }
          .header-date { text-align: right; font-size: 10pt; color: #555; margin-bottom: 30px; }
          .partes { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 16px 0; }
          .parte-box { border: 1px solid #ccc; border-radius: 4px; padding: 12px; }
          .parte-box h4 { font-size: 10pt; text-transform: uppercase; color: #555; margin-bottom: 6px; }
          .parte-box p { font-size: 10pt; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
          th { background: #f0f0f0; border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-weight: bold; }
          td { border: 1px solid #ccc; padding: 5px 8px; }
          .total-row td { font-weight: bold; background: #f9f9f9; }
          .clausula { margin-bottom: 16px; }
          .clausula-num { font-weight: bold; }
          .firmas { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
          .firma-box { text-align: center; }
          .firma-linea { border-top: 1px solid #333; padding-top: 8px; margin-top: 60px; font-size: 10pt; }
          .highlight { font-weight: bold; }
          .no-print { display: block; }
          @media print {
            .no-print { display: none !important; }
            body { font-size: 10pt; }
            .page { padding: 20px 30px; }
          }
        `}</style>
      </head>
      <body>
        {/* Botón imprimir (oculto al imprimir) */}
        <div className="no-print" style={{ position: "fixed", top: 16, right: 16, zIndex: 99 }}>
          <button
            onClick={() => { if (typeof window !== "undefined") window.print(); }}
            style={{
              background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8,
              padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "sans-serif",
            }}>
            Imprimir / Guardar PDF
          </button>
        </div>

        <div className="page">
          {/* Encabezado */}
          <h1>Contrato de Aportación de Activos</h1>
          <p className="subtitle">Modelo de integración a inventario operacional — Mainstage Pro</p>
          <p className="header-date">Ciudad de México, {fmtDate(hoy)}</p>

          {/* Partes */}
          <h2>Partes contratantes</h2>
          <div className="partes">
            <div className="parte-box">
              <h4>Parte A — Empresa Operadora</h4>
              <p><strong>Mainstage Pro S.A. de C.V.</strong></p>
              <p>Empresa de producción audiovisual y gestión de eventos</p>
              <p>En adelante: <strong>&quot;Mainstage&quot;</strong></p>
            </div>
            <div className="parte-box">
              <h4>Parte B — Socio Aportante</h4>
              <p><strong>{socio.nombre}</strong></p>
              {socio.rfc && <p>RFC: {socio.rfc}</p>}
              {socio.curp && <p>CURP: {socio.curp}</p>}
              {socio.domicilio && <p>{socio.domicilio}{socio.colonia ? `, ${socio.colonia}` : ""}</p>}
              {socio.ciudad && <p>{socio.ciudad}{socio.estado ? `, ${socio.estado}` : ""}{socio.cp ? ` C.P. ${socio.cp}` : ""}</p>}
              <p>En adelante: <strong>&quot;El Socio&quot;</strong></p>
            </div>
          </div>

          {/* Vigencia */}
          <p style={{ fontSize: "10pt", background: "#f9f9f9", border: "1px solid #ddd", padding: "10px 14px", borderRadius: 4, margin: "12px 0" }}>
            <strong>Vigencia:</strong> del {fmtDate(socio.contratoInicio)} al {fmtDate(socio.contratoFin)} · Renovación automática anual salvo aviso de 30 días.
          </p>

          {/* Cláusulas */}
          <h2>Cláusulas</h2>

          <div className="clausula">
            <p><span className="clausula-num">PRIMERA. OBJETO DEL CONTRATO.</span> El Socio aporta a Mainstage los activos
            físicos listados en el Anexo A del presente contrato, con el propósito de integrarlos al inventario operacional
            de Mainstage para su uso en eventos de producción audiovisual, iluminación, sonido y afines. Los activos
            permanecen en propiedad exclusiva del Socio en todo momento. Mainstage no adquiere derecho de propiedad
            sobre dichos activos bajo ninguna circunstancia.</p>
          </div>

          <div className="clausula">
            <p><span className="clausula-num">SEGUNDA. DISTRIBUCIÓN DE INGRESOS.</span> Por cada renta generada con
            los activos aportados, Mainstage liquidará al Socio el <span className="highlight">{socio.pctSocio}%</span> del
            ingreso neto facturado al cliente por concepto de uso de los activos, reteniendo el{" "}
            <span className="highlight">{socio.pctMainstage}%</span> restante como comisión de gestión, operación,
            logística y administración. Los porcentajes específicos por equipo se detallan en el Anexo A. En casos
            especiales acordados por escrito, los porcentajes podrán diferir de los anteriores.</p>
          </div>

          <div className="clausula">
            <p><span className="clausula-num">TERCERA. LIQUIDACIÓN MENSUAL.</span> Mainstage emitirá un reporte
            mensual detallado de las rentas generadas con los activos del Socio durante los primeros{" "}
            <span className="highlight">5 días hábiles</span> del mes siguiente al período reportado. El pago
            correspondiente al Socio se realizará dentro de los <span className="highlight">15 días naturales</span>{" "}
            siguientes a la aprobación del reporte por ambas partes. En caso de controversia sobre el reporte,
            las partes dispondrán de 3 días hábiles para resolver la discrepancia.</p>
          </div>

          <div className="clausula">
            <p><span className="clausula-num">CUARTA. MANTENIMIENTO PREVENTIVO.</span> Mainstage realizará
            mantenimiento preventivo periódico a los activos aportados. El costo del mantenimiento preventivo
            es absorbido íntegramente por Mainstage. El mantenimiento correctivo derivado de daños ocasionados
            por mal uso, accidente o negligencia durante operaciones de Mainstage será documentado detalladamente
            y el costo será cubierto por Mainstage en su totalidad. El mantenimiento correctivo derivado del
            desgaste natural corresponde a cargo compartido acordado entre las partes con base en el valor
            declarado de los activos ({fmt(totalValorDeclarado)} en total, conforme al Anexo A).</p>
          </div>

          <div className="clausula">
            <p><span className="clausula-num">QUINTA. RESPONSABILIDAD, SEGUROS Y CUSTODIA.</span> El valor
            declarado de los activos aportados a efectos de responsabilidad civil y referencia de cobertura
            asciende a <span className="highlight">{fmt(totalValorDeclarado)}</span> (desglose en Anexo A).
            Mainstage incluirá los activos en su póliza de seguro operativo durante toda la vigencia de este
            contrato. En caso de pérdida total por robo o daño irreparable imputable a Mainstage, la empresa
            compensará al Socio por el valor declarado del activo afectado.</p>
          </div>

          <div className="clausula">
            <p><span className="clausula-num">SEXTA. RETIRO DE ACTIVOS.</span> El Socio podrá solicitar
            el retiro de uno o más activos mediante notificación escrita con un mínimo de{" "}
            <span className="highlight">30 días naturales</span> de anticipación. Los activos serán devueltos
            en condiciones equivalentes a las documentadas al ingreso, descontando el desgaste normal
            por uso ordinario. Ningún activo podrá ser retirado mientras esté asignado a un evento confirmado
            o en período de movilización activa.</p>
          </div>

          <div className="clausula">
            <p><span className="clausula-num">SÉPTIMA. EXCLUSIVIDAD OPERACIONAL.</span> Los activos aportados
            serán gestionados exclusivamente por Mainstage durante la vigencia del contrato. El Socio no
            podrá rentarlos de manera independiente a terceros sin notificación previa a Mainstage.
            En períodos de baja demanda, el Socio podrá solicitar la devolución temporal de activos
            específicos con aviso de 7 días naturales.</p>
          </div>

          <div className="clausula">
            <p><span className="clausula-num">OCTAVA. TERMINACIÓN ANTICIPADA.</span> Cualquiera de las
            partes podrá dar por terminado el presente contrato mediante notificación escrita con{" "}
            <span className="highlight">60 días</span> de anticipación. En caso de terminación, Mainstage
            liquidará al Socio todos los montos pendientes de pago dentro de los{" "}
            <span className="highlight">30 días</span> siguientes a la devolución física de la totalidad
            de los activos aportados. La terminación anticipada no exime a ninguna parte de sus
            obligaciones derivadas de eventos previamente contratados.</p>
          </div>

          <div className="clausula">
            <p><span className="clausula-num">NOVENA. CONFIDENCIALIDAD.</span> Las partes se obligan a
            guardar confidencialidad sobre las condiciones económicas del presente contrato, la información
            operacional compartida entre sí y la información de clientes de Mainstage a la que El Socio
            pudiera tener acceso. Esta obligación subsistirá por un período de 2 años tras la terminación
            del contrato.</p>
          </div>

          <div className="clausula">
            <p><span className="clausula-num">DÉCIMA. JURISDICCIÓN.</span> Para la interpretación y
            cumplimiento del presente contrato, las partes se someten expresamente a las leyes aplicables
            de los Estados Unidos Mexicanos y a la jurisdicción de los tribunales competentes de la
            Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles.</p>
          </div>

          {/* Anexo A */}
          <h2>Anexo A — Activos aportados</h2>

          {socio.activos.length === 0 ? (
            <p style={{ color: "#999", fontStyle: "italic" }}>No hay activos registrados aún.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Equipo</th>
                  <th>Marca / Modelo</th>
                  <th>Categoría</th>
                  <th>Condición</th>
                  <th style={{ textAlign: "right" }}>Valor declarado</th>
                  <th style={{ textAlign: "right" }}>Precio / día</th>
                  <th style={{ textAlign: "center" }}>Split</th>
                </tr>
              </thead>
              <tbody>
                {socio.activos.map((a) => {
                  const pS = a.pctSocioOverride ?? socio.pctSocio;
                  const pM = a.pctMainstageOverride ?? socio.pctMainstage;
                  return (
                    <tr key={a.id}>
                      <td style={{ fontFamily: "monospace", fontSize: "9pt" }}>{a.codigoInventario}</td>
                      <td>{a.nombre}</td>
                      <td style={{ fontSize: "9pt" }}>{[a.marca, a.modelo].filter(Boolean).join(" / ") || "—"}</td>
                      <td style={{ fontSize: "9pt" }}>{CAT_LABEL[a.categoria] || a.categoria}</td>
                      <td style={{ fontSize: "9pt" }}>{a.condicion}</td>
                      <td style={{ textAlign: "right" }}>{fmt(a.valorDeclarado)}</td>
                      <td style={{ textAlign: "right" }}>{fmt(a.precioDia)}</td>
                      <td style={{ textAlign: "center", fontSize: "9pt" }}>{pS}% / {pM}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={5} style={{ textAlign: "right" }}>TOTAL</td>
                  <td style={{ textAlign: "right" }}>{fmt(totalValorDeclarado)}</td>
                  <td style={{ textAlign: "right" }}>{fmt(socio.activos.reduce((s, a) => s + a.precioDia, 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* Firmas */}
          <div className="firmas">
            <div className="firma-box">
              <div className="firma-linea">
                <p><strong>Mainstage Pro S.A. de C.V.</strong></p>
                <p>Representante Legal</p>
                <p style={{ marginTop: 4, fontSize: "10pt", color: "#555" }}>Firma y sello</p>
              </div>
            </div>
            <div className="firma-box">
              <div className="firma-linea">
                <p><strong>{socio.nombre}</strong></p>
                {socio.rfc && <p style={{ fontSize: "9pt", color: "#555" }}>RFC: {socio.rfc}</p>}
                <p style={{ marginTop: 4, fontSize: "10pt", color: "#555" }}>Firma</p>
              </div>
            </div>
          </div>

          <p style={{ marginTop: 40, fontSize: "9pt", color: "#888", textAlign: "center" }}>
            Generado por Mainstage Pro — {fmtDate(hoy)} — Documento para firma
          </p>
        </div>
      </body>
    </html>
  );
}
