/**
 * ProveedoresEvento.tsx — Sección exclusiva de proveedores externos para los PDFs.
 *
 * La cronología operativa solo trae lo de la casa; todo lo del proveedor vive aquí, en
 * una ficha por proveedor: quién es, a quién llamar, cómo llega y se va el equipo, y sus
 * tres ventanas (instalación, operación, recolección) con fecha y hora. Debajo, las
 * subrentas, que solo necesitan contacto y equipo.
 */
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { C } from "./PdfShared";
import type { VentanaProveedor } from "@/lib/cronologia-evento";

export type ProveedorFicha = {
  nombre: string;
  /** Frente + servicio ya unidos ("Planta de luz · 2 plantas 100 kVA"). */
  servicio: string | null;
  /** Quién responde en sitio por parte del proveedor. */
  responsable: string | null;
  telefono: string | null;
  correo: string | null;
  entrega: string | null;
  regreso: string | null;
  notas: string | null;
  ventanas: VentanaProveedor[];
};

export type SubrentaFicha = { nombre: string; contacto: string | null; equipos: string[] };

const FASES = ["INSTALACION", "OPERACION", "RECOLECCION"] as const;
const TITULO: Record<string, string> = { INSTALACION: "Instalación", OPERACION: "Operación", RECOLECCION: "Recolección" };

const s = StyleSheet.create({
  card: {
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: C.grisLinea,
    borderStyle: "solid",
    borderRadius: 3,
  },
  hd: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.grisFondo,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.grisLinea,
    borderBottomStyle: "solid",
  },
  nombre: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.negro, flexShrink: 1 },
  servicio: { fontSize: 7, color: C.grisMedio, maxWidth: 260, textAlign: "right" },
  fila: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.3,
    borderBottomColor: "#f0f0f0",
    borderBottomStyle: "solid",
  },
  celda: { flex: 1, paddingRight: 6 },
  lbl: {
    fontSize: 5.8,
    fontFamily: "Helvetica-Bold",
    color: C.grisClaro,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  val: { fontSize: 8, color: C.negro },
  valFalta: { fontSize: 8, color: C.grisClaro },
  ventana: { flex: 1, paddingRight: 6 },
  ventanaSep: { borderLeftWidth: 0.5, borderLeftColor: C.grisLinea, borderLeftStyle: "solid", paddingLeft: 8 },
  fase: {
    fontSize: 5.8,
    fontFamily: "Helvetica-Bold",
    color: C.dorado,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  hora: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.negro },
  horaFalta: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.grisClaro },
  fecha: { fontSize: 7, color: C.grisMedio, textTransform: "capitalize", marginTop: 1 },
  detalle: { fontSize: 7, color: C.grisMedio, marginTop: 2 },
  notas: { paddingVertical: 5, paddingHorizontal: 8, backgroundColor: C.amarilloFondo },
  notasTxt: { fontSize: 7.5, color: C.grisOscuro, lineHeight: 1.4 },
  subTitulo: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.grisMedio,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 4,
  },
  tbl: { borderWidth: 0.5, borderColor: C.grisLinea, borderStyle: "solid", borderRadius: 3 },
  tblHd: {
    flexDirection: "row",
    backgroundColor: C.grisFondo,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.grisLinea,
    borderBottomStyle: "solid",
  },
  tblHdTxt: { fontSize: 6, fontFamily: "Helvetica-Bold", color: C.grisMedio, textTransform: "uppercase", letterSpacing: 0.5 },
  tblRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.3,
    borderBottomColor: "#f0f0f0",
    borderBottomStyle: "solid",
  },
  tblRowLast: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8 },
  tblTxt: { fontSize: 8, color: C.negro },
  tblMuted: { fontSize: 7.5, color: C.grisMedio },
});

function Dato({ lbl, val }: { lbl: string; val: string | null }) {
  return (
    <View style={s.celda}>
      <Text style={s.lbl}>{lbl}</Text>
      <Text style={val ? s.val : s.valFalta}>{val ?? "Por confirmar"}</Text>
    </View>
  );
}

function Ventana({ fase, v, primera }: { fase: string; v: VentanaProveedor | undefined; primera: boolean }) {
  const rango = v?.hora ? (v.horaFin ? `${v.hora} – ${v.horaFin}` : v.hora) : null;
  return (
    <View style={primera ? s.ventana : [s.ventana, s.ventanaSep]}>
      <Text style={s.fase}>{TITULO[fase]}</Text>
      <Text style={rango ? s.hora : s.horaFalta}>{rango ?? "Por definir"}</Text>
      {v?.fecha ? <Text style={s.fecha}>{v.fecha}</Text> : null}
      {v?.detalle ? <Text style={s.detalle}>{v.detalle}</Text> : null}
    </View>
  );
}

export function ProveedoresEvento({
  proveedores,
  subrentas = [],
}: {
  proveedores: ProveedorFicha[];
  subrentas?: SubrentaFicha[];
}) {
  if (!proveedores.length && !subrentas.length) return null;
  return (
    <View>
      {proveedores.map((p, i) => {
        const porFase = new Map(p.ventanas.map((v) => [v.fase, v]));
        // Una ventana capturada con otra fase (dato viejo) no se pierde: se suma al final.
        const extra = p.ventanas.filter((v) => !FASES.includes(v.fase as (typeof FASES)[number]));
        return (
          <View key={i} style={s.card} wrap={false}>
            <View style={s.hd}>
              <Text style={s.nombre}>{p.nombre}</Text>
              {p.servicio ? <Text style={s.servicio}>{p.servicio}</Text> : null}
            </View>

            <View style={s.fila}>
              <Dato lbl="Contacto en sitio" val={p.responsable} />
              <Dato lbl="Teléfono" val={p.telefono} />
              <Dato lbl="Correo" val={p.correo} />
            </View>

            {(p.entrega || p.regreso) && (
              <View style={s.fila}>
                <Dato lbl="Entrega del equipo" val={p.entrega} />
                <Dato lbl="Regreso del equipo" val={p.regreso} />
                {/* Tercera columna vacía: alinea con contacto / teléfono / correo. */}
                <View style={s.celda} />
              </View>
            )}

            <View style={p.notas ? s.fila : [s.fila, { borderBottomWidth: 0 }]}>
              {FASES.map((f, fi) => (
                <Ventana key={f} fase={f} v={porFase.get(f)} primera={fi === 0} />
              ))}
              {extra.map((v, vi) => (
                <Ventana key={`x${vi}`} fase={v.fase} v={{ ...v }} primera={false} />
              ))}
            </View>

            {p.notas ? (
              <View style={s.notas}>
                <Text style={s.notasTxt}>{p.notas}</Text>
              </View>
            ) : null}
          </View>
        );
      })}

      {subrentas.length > 0 && (
        <View>
          <Text style={s.subTitulo} minPresenceAhead={40}>Subrentas</Text>
          <View style={s.tbl}>
            <View style={s.tblHd}>
              <Text style={[s.tblHdTxt, { width: 130 }]}>Proveedor</Text>
              <Text style={[s.tblHdTxt, { flex: 1 }]}>Equipo</Text>
              <Text style={[s.tblHdTxt, { width: 100 }]}>Contacto</Text>
            </View>
            {subrentas.map((r, i) => (
              <View key={i} style={i < subrentas.length - 1 ? s.tblRow : s.tblRowLast}>
                <Text style={[s.tblTxt, { width: 130, fontFamily: "Helvetica-Bold" }]}>{r.nombre}</Text>
                <Text style={[s.tblMuted, { flex: 1 }]}>{r.equipos.join(", ") || "—"}</Text>
                <Text style={[s.tblMuted, { width: 100 }]}>{r.contacto || "—"}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
