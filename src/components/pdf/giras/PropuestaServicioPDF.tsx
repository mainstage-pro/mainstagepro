/**
 * PropuestaServicioPDF.tsx — La propuesta de production management en papel.
 *
 * Es el documento que el cliente abre, imprime y reenvía a su jefe, así que
 * hereda la base de los documentos de gira: el mismo hero, la misma banda y la
 * misma tabla. Una propuesta y un rider del mismo proveedor tienen que verse
 * como del mismo proveedor.
 *
 * Aquí NO entra nada del lado nuestro: ni costo unitario, ni margen, ni notas
 * internas. El modelo los trae, pero este archivo sale de la casa.
 */
import React from "react";
import { StyleSheet } from "@react-pdf/renderer";
import { C } from "../PdfShared";
import {
  BandaGira,
  Cuerpo,
  Document,
  DORADO_TXT,
  HeroGira,
  PaginaGira,
  PieGira,
  Seccion,
  Tabla,
  Text,
  View,
  g,
  type ItemBanda,
  type RenglonTabla,
} from "./GiraDocBase";

const p = StyleSheet.create({
  parrafo: { fontSize: 8.8, color: C.negro, lineHeight: 1.6 },
  // Bloque de totales: pegado a la derecha, como una factura.
  totales: { marginTop: 10, flexDirection: "row", justifyContent: "flex-end" },
  totalesCaja: { width: "58%" },
  totalFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.2,
    borderBottomWidth: 0.3,
    borderBottomColor: "#eeeeee",
    borderBottomStyle: "solid",
  },
  totalLabel: { fontSize: 8.4, color: C.grisMedio },
  totalLabelNota: { fontSize: 6.4, color: C.grisClaro, marginTop: 1 },
  totalVal: { fontSize: 8.6, color: C.negro },
  granFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.negro,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 3,
    marginTop: 6,
  },
  granLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.dorado,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  granVal: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.blanco },
  granNota: { fontSize: 6.4, color: C.grisClaro, textAlign: "right", marginTop: 4 },
  // Firma
  firmaCaja: {
    borderWidth: 0.5,
    borderColor: C.grisLinea,
    borderStyle: "solid",
    borderRadius: 3,
    padding: 11,
    marginTop: 4,
  },
  firmaTxt: { fontSize: 8.2, color: C.grisMedio, lineHeight: 1.55 },
  firmaLineas: { flexDirection: "row", marginTop: 20 },
  firmaCol: { flex: 1, paddingRight: 16 },
  firmaRaya: { borderTopWidth: 0.5, borderTopColor: C.negro, borderTopStyle: "solid", paddingTop: 3 },
  firmaLabel: { fontSize: 6.2, color: C.grisClaro, textTransform: "uppercase", letterSpacing: 0.7 },
  aprobada: {
    backgroundColor: "#f2f8f3",
    borderLeftWidth: 2.5,
    borderLeftColor: "#2f7d47",
    borderLeftStyle: "solid",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 2,
  },
  aprobadaLabel: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: "#2f7d47",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  aprobadaTxt: { fontSize: 8.6, color: C.negro, lineHeight: 1.5 },
});

// ── Datos que pide el documento ──────────────────────────────────────────────

export interface PropuestaLineaDoc {
  id: string;
  grupo: "honorarios" | "equipo" | "logistica" | "reembolsables";
  tipoLabel: string;
  concepto: string;
  descripcion: string | null;
  entregables: string | null;
  unidadLabel: string;
  cantidad: number;
  subtotal: number;
  esIncluido: boolean;
  esReembolsable: boolean;
  showEtiqueta: string | null;
}

export interface PropuestaShowDoc {
  id: string;
  fechaLarga: string;
  ciudad: string | null;
  venue: string | null;
}

export interface PropuestaServicioData {
  numero: string;
  version: number;
  titulo: string;
  estadoLabel: string;
  clienteNombre: string | null;
  artistaNombre: string | null;
  giraNombre: string | null;
  modeloCobroLabel: string;
  moneda: string;
  vigenciaHasta: string | null;
  alcance: string | null;
  exclusiones: string | null;
  supuestos: string | null;
  condicionesPago: string | null;
  aplicaIva: boolean;
  totales: {
    honorarios: number;
    equipo: number;
    logistica: number;
    reembolsables: number;
    descuentoMonto: number;
    descuentoRazon: string | null;
    subtotal: number;
    montoIva: number;
    granTotal: number;
  };
  conteo: { shows: number; venues: number; ciudades: number };
  shows: PropuestaShowDoc[];
  lineas: PropuestaLineaDoc[];
  aprobacion: { nombre: string | null; fecha: string } | null;
  logoSrc: string | null;
  logoArtistaSrc: string | null;
  generadoEn: string;
}

const TITULO_GRUPO: Record<PropuestaLineaDoc["grupo"], string> = {
  honorarios: "Honorarios de production management",
  equipo: "Equipo y producción local",
  logistica: "Logística del equipo de trabajo",
  reembolsables: "Gastos reembolsables",
};

const ORDEN_GRUPO: PropuestaLineaDoc["grupo"][] = ["honorarios", "equipo", "logistica", "reembolsables"];

function moneda(n: number, cur: string): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}

// ── Documento ────────────────────────────────────────────────────────────────

export function PropuestaServicioPDF({ data }: { data: PropuestaServicioData }) {
  const m = (n: number) => moneda(n, data.moneda);
  const t = data.totales;

  const banda: ItemBanda[] = [
    { label: "Inversión total", valor: m(t.granTotal), sub: data.aplicaIva ? "IVA incluido" : "más IVA" },
    { label: "Modelo de cobro", valor: data.modeloCobroLabel },
  ];
  if (data.conteo.shows > 0) {
    banda.push({
      label: "Alcance",
      valor: `${data.conteo.shows} ${data.conteo.shows === 1 ? "show" : "shows"}`,
      sub: `${data.conteo.venues} ${data.conteo.venues === 1 ? "venue" : "venues"} · ${data.conteo.ciudades} ${
        data.conteo.ciudades === 1 ? "ciudad" : "ciudades"
      }`,
    });
  }
  if (data.vigenciaHasta) banda.push({ label: "Vigencia", valor: data.vigenciaHasta });

  // Las líneas van agrupadas por el subtotal al que suman: el cliente lee
  // "esto son honorarios y esto son gastos", no una lista plana de conceptos.
  const renglones: RenglonTabla[] = [];
  for (const grupo of ORDEN_GRUPO) {
    const delGrupo = data.lineas.filter((l) => l.grupo === grupo);
    if (delGrupo.length === 0) continue;
    renglones.push({ tipo: "grupo", clave: `g-${grupo}`, texto: TITULO_GRUPO[grupo] });
    for (const l of delGrupo) {
      const detalle = [
        l.descripcion,
        l.entregables ? `Entregables: ${l.entregables}` : null,
        l.showEtiqueta,
        l.esReembolsable && grupo !== "reembolsables" ? "Se factura contra comprobante, al costo." : null,
      ]
        .filter(Boolean)
        .join("\n");

      renglones.push({
        tipo: "fila",
        clave: l.id,
        celdas: [
          { texto: l.concepto, sub: detalle || null, fuerte: true },
          { texto: l.tipoLabel, sub: l.unidadLabel },
          { texto: String(l.cantidad) },
          l.esIncluido
            ? { texto: "Incluido", color: DORADO_TXT }
            : { texto: m(l.subtotal), fuerte: true },
        ],
      });
    }
  }

  const sinCargo = data.lineas.filter((l) => l.esIncluido).length;

  return (
    <Document
      title={`${data.numero} — ${data.titulo}`}
      author="Mainstage Pro"
      subject="Propuesta de servicios de production management"
    >
      <PaginaGira>
        <HeroGira
          tag={`Propuesta de servicios · ${data.numero}${data.version > 1 ? ` v${data.version}` : ""}`}
          titulo={data.titulo}
          subtitulo={[data.clienteNombre, data.artistaNombre].filter(Boolean).join(" · ") || null}
          meta={data.giraNombre}
          logoSrc={data.logoSrc}
          logoArtistaSrc={data.logoArtistaSrc}
        />
        <BandaGira items={banda} />

        <Cuerpo>
          {data.alcance?.trim() ? (
            <Seccion titulo="Alcance del servicio">
              <Text style={p.parrafo}>{data.alcance.trim()}</Text>
            </Seccion>
          ) : null}

          {data.shows.length > 0 ? (
            <Seccion titulo="Fechas que cubre">
              <Tabla
                columnas={[
                  { label: "Fecha", flex: 2 },
                  { label: "Ciudad", flex: 1.6 },
                  { label: "Venue", flex: 2.4 },
                ]}
                renglones={data.shows.map((s) => ({
                  tipo: "fila" as const,
                  clave: s.id,
                  celdas: [
                    { texto: s.fechaLarga, fuerte: true },
                    { texto: s.ciudad ?? "—" },
                    { texto: s.venue ?? "Por confirmar" },
                  ],
                }))}
              />
            </Seccion>
          ) : null}

          <Seccion
            titulo="Qué incluye la propuesta"
            nota={
              sinCargo > 0
                ? `${sinCargo} ${sinCargo === 1 ? "concepto se entrega" : "conceptos se entregan"} sin cargo y van marcados como incluidos.`
                : null
            }
          >
            <Tabla
              columnas={[
                { label: "Concepto", flex: 4 },
                { label: "Concepto / unidad", flex: 1.7 },
                { label: "Cant.", ancho: 30, alinear: "right" },
                { label: "Importe", ancho: 64, alinear: "right" },
              ]}
              renglones={renglones}
            />

            {/* El desglose y la cifra final no se separan: un salto de página
                en medio deja al cliente leyendo un total sin su desglose. */}
            <View style={p.totales} wrap={false}>
              <View style={p.totalesCaja}>
                <FilaTotal label="Honorarios" valor={m(t.honorarios)} />
                {t.equipo !== 0 ? <FilaTotal label="Equipo y producción" valor={m(t.equipo)} /> : null}
                {t.logistica !== 0 ? <FilaTotal label="Logística" valor={m(t.logistica)} /> : null}
                {t.reembolsables !== 0 ? (
                  <FilaTotal
                    label="Reembolsables"
                    nota="Estimado — se factura contra comprobante"
                    valor={m(t.reembolsables)}
                  />
                ) : null}
                {t.descuentoMonto > 0 ? (
                  <FilaTotal
                    label="Descuento"
                    nota={t.descuentoRazon}
                    valor={`- ${m(t.descuentoMonto)}`}
                  />
                ) : null}
                <FilaTotal label="Subtotal" valor={m(t.subtotal)} />
                {data.aplicaIva ? <FilaTotal label="IVA 16%" valor={m(t.montoIva)} /> : null}

                <View style={p.granFila}>
                  <Text style={p.granLabel}>Inversión total</Text>
                  <Text style={p.granVal}>{m(t.granTotal)}</Text>
                </View>
                <Text style={p.granNota}>
                  {data.moneda}
                  {data.aplicaIva ? " · IVA incluido" : " · los precios no incluyen IVA"}
                </Text>
              </View>
            </View>
          </Seccion>

          {data.condicionesPago?.trim() ? (
            <Seccion titulo="Condiciones de pago">
              <Text style={p.parrafo}>{data.condicionesPago.trim()}</Text>
            </Seccion>
          ) : null}

          {data.supuestos?.trim() ? (
            <Seccion titulo="Supuestos">
              <Text style={p.parrafo}>{data.supuestos.trim()}</Text>
            </Seccion>
          ) : null}

          {data.exclusiones?.trim() ? (
            <Seccion titulo="No incluye">
              <Text style={p.parrafo}>{data.exclusiones.trim()}</Text>
            </Seccion>
          ) : null}

          <Seccion titulo="Aceptación">
            {data.aprobacion ? (
              <View style={p.aprobada} wrap={false}>
                <Text style={p.aprobadaLabel}>Propuesta aprobada</Text>
                <Text style={p.aprobadaTxt}>
                  {data.aprobacion.nombre
                    ? `Confirmada por ${data.aprobacion.nombre} el ${data.aprobacion.fecha}.`
                    : `Confirmada el ${data.aprobacion.fecha}.`}
                </Text>
              </View>
            ) : (
              <View style={p.firmaCaja} wrap={false}>
                <Text style={p.firmaTxt}>
                  La firma de esta propuesta autoriza a Mainstage Pro a arrancar el advance técnico con los venues y a
                  reservar al equipo de trabajo para las fechas indicadas.
                  {data.vigenciaHasta ? ` Vigente hasta el ${data.vigenciaHasta}.` : ""}
                </Text>
                <View style={p.firmaLineas}>
                  <View style={p.firmaCol}>
                    <View style={p.firmaRaya}>
                      <Text style={p.firmaLabel}>
                        {data.clienteNombre ? `Por ${data.clienteNombre}` : "Por el cliente"}
                      </Text>
                    </View>
                  </View>
                  <View style={p.firmaCol}>
                    <View style={p.firmaRaya}>
                      <Text style={p.firmaLabel}>Por Mainstage Pro</Text>
                    </View>
                  </View>
                  <View style={{ width: 90 }}>
                    <View style={p.firmaRaya}>
                      <Text style={p.firmaLabel}>Fecha</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </Seccion>

          <Text style={g.secNota}>
            Mainstage Pro · Producción técnica para eventos · Querétaro, CDMX y Bajío
          </Text>
        </Cuerpo>

        <PieGira
          izquierda={`${data.numero}${data.version > 1 ? ` v${data.version}` : ""} · ${data.estadoLabel} · generada ${data.generadoEn}`}
          derecha="Mainstage Pro"
        />
      </PaginaGira>
    </Document>
  );
}

function FilaTotal({ label, valor, nota }: { label: string; valor: string; nota?: string | null }) {
  return (
    <View style={p.totalFila}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={p.totalLabel}>{label}</Text>
        {nota ? <Text style={p.totalLabelNota}>{nota}</Text> : null}
      </View>
      <Text style={p.totalVal}>{valor}</Text>
    </View>
  );
}
