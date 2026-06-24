import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";

// ─── Paleta (idéntica a CotizacionPDF) ───────────────────────────────────────
const GOLD = "#B3985B";
const BLACK = "#0a0a0a";
const GRAY = "#4a4a4a";
const LIGHT_GRAY = "#888888";
const WHITE = "#FFFFFF";
const BG_SECTION = "#F7F5F0";

function fmtMXN(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}
function fmtDate(v: Date | string | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v + (v.length === 10 ? "T12:00:00" : "")) : v;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: WHITE, paddingTop: 36, paddingBottom: 40, paddingHorizontal: 0, fontSize: 9, color: BLACK },
  header: { backgroundColor: BLACK, paddingHorizontal: 40, paddingTop: 30, paddingBottom: 25, marginTop: -36, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerLeft: { flexDirection: "column" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 2, marginBottom: 3 },
  tagline: { fontSize: 8, color: "#888888", letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  numCotizacion: { fontSize: 11, fontFamily: "Helvetica-Bold", color: WHITE, marginBottom: 2 },
  fechaHeader: { fontSize: 8, color: "#888888" },
  goldBar: { height: 3, backgroundColor: GOLD },
  gracias: { backgroundColor: BG_SECTION, paddingVertical: 10, paddingHorizontal: 40, fontSize: 9, color: GRAY, textAlign: "center", letterSpacing: 0.5, fontFamily: "Helvetica-Oblique" },
  infoBloque: { paddingHorizontal: 40, paddingTop: 20, paddingBottom: 16, flexDirection: "row" },
  infoCol: { flex: 1 },
  infoColRight: { flex: 1, paddingLeft: 20, borderLeft: "1 solid #e0ddd8" },
  infoLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: LIGHT_GRAY, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 8, marginBottom: 1 },
  infoValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK },
  infoValueLight: { fontSize: 9.5, color: GRAY },
  divisor: { height: 1, backgroundColor: "#e8e5e0", marginHorizontal: 40, marginBottom: 14 },
  tablaHeader: { flexDirection: "row", backgroundColor: BLACK, paddingHorizontal: 40, paddingVertical: 7 },
  tablaHeaderTexto: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 0.8 },
  tablaFila: { flexDirection: "row", paddingHorizontal: 40, paddingVertical: 9, borderBottom: "1 solid #eeebe6", alignItems: "flex-start" },
  tablaFilaAlt: { backgroundColor: BG_SECTION },
  cellEvento: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLACK },
  cellSub: { fontSize: 8, color: GRAY, marginTop: 2 },
  cellMonto: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "right" },
  totalesBloque: { paddingHorizontal: 40, paddingTop: 16, paddingBottom: 8, flexDirection: "row", justifyContent: "flex-end" },
  totalesTabla: { width: 240, borderTop: "2 solid " + GOLD },
  totalFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 8, borderBottom: "1 solid #eeebe6" },
  totalFilaDes: { fontSize: 8.5, color: GRAY, flex: 1 },
  totalFilaMonto: { fontSize: 8.5, color: BLACK, fontFamily: "Helvetica-Bold" },
  totalGranTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, paddingHorizontal: 8, backgroundColor: BLACK },
  totalGranLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GOLD },
  totalGranMonto: { fontSize: 10, fontFamily: "Helvetica-Bold", color: WHITE },
  anticipo: { marginHorizontal: 40, marginTop: 12, marginBottom: 8, flexDirection: "row", gap: 8 },
  anticipoItem: { flex: 1, backgroundColor: BG_SECTION, borderRadius: 4, padding: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  anticipoLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.6 },
  anticipoMonto: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK },
  pagoBloque: { marginHorizontal: 40, marginTop: 16, flexDirection: "row", gap: 10 },
  pagoCard: { flex: 1, backgroundColor: BLACK, borderRadius: 6, padding: 12 },
  pagoTitulo: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" },
  pagoFila: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  pagoLabel: { fontSize: 7.5, color: LIGHT_GRAY, flex: 1 },
  pagoValor: { fontSize: 7.5, color: WHITE, fontFamily: "Helvetica-Bold", textAlign: "right", flex: 1.5 },
  terminosBloque: { marginHorizontal: 40, marginTop: 16, padding: 12, backgroundColor: BG_SECTION, borderRadius: 4 },
  terminosTitulo: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  terminoItem: { flexDirection: "row", marginBottom: 4 },
  terminoBullet: { fontSize: 8, color: GOLD, marginRight: 5, marginTop: 1 },
  terminoTexto: { fontSize: 7.5, color: GRAY, flex: 1, lineHeight: 1.5 },
  firmaBloque: { marginHorizontal: 40, marginTop: 20, flexDirection: "row", justifyContent: "flex-end" },
  firmaCol: { alignItems: "flex-start", width: 180 },
  firmaEspacio: { height: 40 },
  firmaLinea: { height: 1.5, backgroundColor: GOLD, width: 180, marginBottom: 5 },
  firmaNombre: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK },
  firmaCargo: { fontSize: 7, color: GRAY, marginTop: 2 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerBrand: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1 },
  footerContacto: { fontSize: 7, color: LIGHT_GRAY },
  footerVigencia: { fontSize: 7, color: LIGHT_GRAY },
  confidencial: { fontSize: 6.5, color: "#cccccc", textAlign: "center", marginHorizontal: 40, marginTop: 8, fontFamily: "Helvetica-Oblique" },
});

export interface EventoResumenData {
  id: string;
  numeroCotizacion: string;
  nombreCotizacion: string | null;
  nombreEvento: string | null;
  fechaEvento: string | null;
  lugarEvento: string | null;
  total: number;
  aplicaIva: boolean;
  montoIva: number;
  granTotal: number;
  gastosProduccionActivo: boolean;
  gastosProduccionMonto: number;
}

export interface ResumenGlobalData {
  cliente: { nombre: string; empresa: string | null; telefono?: string | null; correo?: string | null };
  trato: { nombreEvento: string | null; responsable?: { name: string } | null } | null;
  eventos: EventoResumenData[];
  totales: { totalBruto: number; totalGastosProd: number; totalIva: number; granTotalProyecto: number; numeroEventos: number };
  vigenciaDias?: number;
  createdAt?: Date | string;
}

export function ResumenGlobalPDF({ data, logoSrc }: { data: ResumenGlobalData; logoSrc?: string | null }) {
  const { cliente, trato, eventos, totales } = data;
  const vigenciaDias = data.vigenciaDias ?? 7;
  const createdAt = data.createdAt ? new Date(data.createdAt as string) : new Date();
  const vigenciaDate = new Date(createdAt);
  vigenciaDate.setDate(vigenciaDate.getDate() + vigenciaDias);
  const granTotal = totales.granTotalProyecto;
  const anticipo = granTotal * 0.5;
  const liquidacion = granTotal * 0.5;
  const proyectoLabel = trato?.nombreEvento || cliente.nombre;

  const TERMINOS = [
    `Se solicita un anticipo del 50% ($${anticipo.toLocaleString("es-MX", { maximumFractionDigits: 0 })}) para reservar la(s) fecha(s).`,
    `El saldo restante ($${liquidacion.toLocaleString("es-MX", { maximumFractionDigits: 0 })}) se liquida como máximo 1 día antes del primer evento.`,
    `Esta cotización tiene una vigencia de ${vigenciaDias} días (vence el ${fmtDate(vigenciaDate)}).`,
    "El pago puede realizarse por transferencia o efectivo (coordinar entrega vía WhatsApp con el vendedor).",
    "En caso de no requerir factura y pago en efectivo, podemos aplicar el descuento del IVA.",
    "Cotización confidencial y exclusiva para el destinatario. Prohibida su difusión sin autorización de Mainstage Producciones.",
    "Cualquier duda, cambio o sugerencia hacerla por medio de WhatsApp: (446) 143 2565.",
  ];

  return (
    <Document title={`Resumen Global — ${proyectoLabel}`} author="Mainstage Producciones" subject="Propuesta Global del Proyecto">
      <Page size="LETTER" style={s.page}>

        <View style={s.header}>
          <View style={s.headerLeft}>
            {logoSrc
              ? <Image src={logoSrc} style={{ width: 150, alignSelf: "flex-start" }} />
              : <Text style={s.brand}>MAINSTAGE PRODUCCIONES</Text>}
            <Text style={s.tagline}>AUDIO · ILUMINACIÓN · VIDEO · PRODUCCIÓN TÉCNICA</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.numCotizacion}>COTIZACIÓN GLOBAL</Text>
            <Text style={[s.numCotizacion, { fontSize: 9, color: GOLD }]}>{proyectoLabel}</Text>
            <Text style={s.fechaHeader}>Elaborada el {fmtDate(createdAt)}</Text>
          </View>
        </View>
        <View style={s.goldBar} />

        <Text style={s.gracias}>
          ¡Agradecemos la oportunidad de presentarte esta propuesta de nuestros servicios!
        </Text>

        <View style={s.infoBloque}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Cliente</Text>
            <Text style={s.infoValue}>{cliente.nombre}</Text>
            {cliente.empresa && <>
              <Text style={s.infoLabel}>Empresa</Text>
              <Text style={s.infoValue}>{cliente.empresa}</Text>
            </>}
            {trato?.responsable?.name && <>
              <Text style={s.infoLabel}>Vendedor</Text>
              <Text style={s.infoValueLight}>{trato.responsable.name}</Text>
            </>}
          </View>
          <View style={s.infoColRight}>
            <Text style={s.infoLabel}>Proyecto</Text>
            <Text style={s.infoValue}>{proyectoLabel}</Text>
            <Text style={s.infoLabel}>Número de eventos</Text>
            <Text style={s.infoValue}>{totales.numeroEventos} evento{totales.numeroEventos !== 1 ? "s" : ""}</Text>
            <Text style={s.infoLabel}>Total del proyecto</Text>
            <Text style={[s.infoValue, { color: GOLD }]}>{fmtMXN(granTotal)}</Text>
          </View>
        </View>

        <View style={s.divisor} />

        <View style={s.tablaHeader}>
          <Text style={[s.tablaHeaderTexto, { flex: 3 }]}>EVENTO / SERVICIO</Text>
          <Text style={[s.tablaHeaderTexto, { flex: 1.5, textAlign: "center" }]}>FECHA</Text>
          <Text style={[s.tablaHeaderTexto, { flex: 1.5, textAlign: "right" }]}>TOTAL</Text>
        </View>

        {eventos.map((ev, i) => {
          const nombre = ev.nombreCotizacion || ev.nombreEvento || `Evento ${i + 1}`;
          return (
            <View key={ev.id} style={[s.tablaFila, i % 2 === 1 ? s.tablaFilaAlt : {}]}>
              <View style={{ flex: 3 }}>
                <Text style={s.cellEvento}>{nombre}</Text>
                {ev.lugarEvento && <Text style={s.cellSub}>📍 {ev.lugarEvento}</Text>}
                <Text style={[s.cellSub, { color: "#aaaaaa" }]}>{ev.numeroCotizacion}</Text>
              </View>
              <View style={{ flex: 1.5, alignItems: "center" }}>
                <Text style={{ fontSize: 8.5, color: GRAY }}>{ev.fechaEvento ? fmtDate(ev.fechaEvento) : "—"}</Text>
              </View>
              <View style={{ flex: 1.5, alignItems: "flex-end" }}>
                <Text style={s.cellMonto}>{fmtMXN(ev.granTotal)}</Text>
                {ev.gastosProduccionActivo && ev.gastosProduccionMonto > 0 && (
                  <Text style={{ fontSize: 7.5, color: "#c97a10" }}>+{fmtMXN(ev.gastosProduccionMonto)} G.Prod</Text>
                )}
                {ev.aplicaIva && <Text style={{ fontSize: 7.5, color: LIGHT_GRAY }}>IVA incl.</Text>}
              </View>
            </View>
          );
        })}

        <View style={s.totalesBloque}>
          <View style={s.totalesTabla}>
            {eventos.map((ev, i) => (
              <View key={ev.id} style={s.totalFila}>
                <Text style={s.totalFilaDes}>{ev.nombreCotizacion || ev.nombreEvento || `Evento ${i + 1}`}</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(ev.granTotal)}</Text>
              </View>
            ))}
            {totales.totalGastosProd > 0 && (
              <View style={s.totalFila}>
                <Text style={[s.totalFilaDes, { color: "#c97a10" }]}>Gastos de producción</Text>
                <Text style={[s.totalFilaMonto, { color: "#c97a10" }]}>{fmtMXN(totales.totalGastosProd)}</Text>
              </View>
            )}
            <View style={{ borderTop: "1.5 solid " + GOLD, borderBottom: "1 solid #e0ddd8", flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 8, backgroundColor: "#FFFDF7" }}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK }}>SUBTOTAL DEL PROYECTO</Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: BLACK }}>{fmtMXN(totales.totalBruto)}</Text>
            </View>
            {totales.totalIva > 0 && (
              <View style={s.totalFila}>
                <Text style={s.totalFilaDes}>IVA 16%</Text>
                <Text style={s.totalFilaMonto}>{fmtMXN(totales.totalIva)}</Text>
              </View>
            )}
            <View style={s.totalGranTotal}>
              <Text style={s.totalGranLabel}>{totales.totalIva > 0 ? "TOTAL CON IVA" : "GRAN TOTAL"}</Text>
              <Text style={s.totalGranMonto}>{fmtMXN(granTotal)}</Text>
            </View>
            <View style={{ paddingHorizontal: 8, paddingTop: 6, paddingBottom: 2 }}>
              <Text style={{ fontSize: 7, color: LIGHT_GRAY, lineHeight: 1.5, fontFamily: "Helvetica-Oblique" }}>
                * Cada evento tiene su propia cotización detallada. Este resumen agrupa el total del proyecto.
              </Text>
            </View>
          </View>
        </View>

        <View style={s.anticipo}>
          <View style={s.anticipoItem}>
            <Text style={s.anticipoLabel}>ANTICIPO (50%)</Text>
            <Text style={s.anticipoMonto}>{fmtMXN(anticipo)}</Text>
          </View>
          <View style={s.anticipoItem}>
            <Text style={s.anticipoLabel}>SALDO A LIQUIDAR (50%)</Text>
            <Text style={s.anticipoMonto}>{fmtMXN(liquidacion)}</Text>
          </View>
        </View>

        <View style={s.pagoBloque}>
          <View style={s.pagoCard}>
            <Text style={s.pagoTitulo}>TRANSFERENCIA CUENTA FISCAL</Text>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Razón Social</Text><Text style={s.pagoValor}>Escenario Principal Producciones</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>RFC</Text><Text style={s.pagoValor}>EPP2502068Q8</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Banco</Text><Text style={s.pagoValor}>Banorte</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>No. Cuenta</Text><Text style={s.pagoValor}>1313102977</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>CLABE</Text><Text style={s.pagoValor}>072 680 013131029777</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Tarjeta</Text><Text style={s.pagoValor}>4189 2810 0070 3307</Text></View>
          </View>
          <View style={s.pagoCard}>
            <Text style={s.pagoTitulo}>TRANSFERENCIA CUENTA NO FISCAL</Text>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Beneficiario</Text><Text style={s.pagoValor}>Jose Mauricio A. Hernández V.M.</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>RFC</Text><Text style={s.pagoValor}>HEVM9611179YA</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Banco</Text><Text style={s.pagoValor}>Banorte</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>No. Cuenta</Text><Text style={s.pagoValor}>1314637038</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>CLABE</Text><Text style={s.pagoValor}>072 680 013146370385</Text></View>
            <View style={s.pagoFila}><Text style={s.pagoLabel}>Correo</Text><Text style={s.pagoValor}>mainstageqro@gmail.com</Text></View>
          </View>
        </View>

        <View style={s.terminosBloque}>
          <Text style={s.terminosTitulo}>INFORMACIÓN IMPORTANTE</Text>
          {TERMINOS.map((t, i) => (
            <View key={i} style={s.terminoItem}>
              <Text style={s.terminoBullet}>•</Text>
              <Text style={s.terminoTexto}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={s.firmaBloque}>
          <View style={s.firmaCol}>
            <View style={s.firmaEspacio} />
            <View style={s.firmaLinea} />
            <Text style={s.firmaNombre}>Jose Mauricio Alejandro Hernández Vázquez Mellado</Text>
            <Text style={s.firmaCargo}>Director General · Mainstage Pro</Text>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerBrand}>MAINSTAGE PRODUCCIONES</Text>
          <Text style={s.footerContacto}>WhatsApp: (446) 143 2565  |  mainstageqro@gmail.com</Text>
          <Text style={s.footerVigencia}>Vigencia: {vigenciaDias} días</Text>
        </View>
        <Text style={s.confidencial}>
          Cotización confidencial y exclusiva para el destinatario. Prohibida su difusión sin autorización de Mainstage Producciones.
        </Text>

      </Page>
    </Document>
  );
}
