/**
 * Icono y chip de disciplina para los PDF (react-pdf). Dibuja los mismos trazos
 * que `DisciplinaBadge` en pantalla, con los tonos oscurecidos para papel.
 */
import React from "react";
import { Svg, Path, Circle, Rect, View, Text } from "@react-pdf/renderer";
import { DISCIPLINA_COLORS_PRINT, DISCIPLINA_LABELS, type Disciplina } from "@/lib/disciplinaColors";
import { ICONO_DISCIPLINA } from "@/lib/disciplinaIconos";

export function DisciplinaIconoPdf({ disciplina, size = 9, color }: { disciplina: Disciplina; size?: number; color?: string }) {
  const stroke = color ?? DISCIPLINA_COLORS_PRINT[disciplina];
  const comun = { stroke, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {ICONO_DISCIPLINA[disciplina].map((tr, i) =>
        tr.t === "path" ? <Path key={i} d={tr.d} {...comun} />
        : tr.t === "circle" ? <Circle key={i} cx={tr.cx} cy={tr.cy} r={tr.r} {...comun} />
        : <Rect key={i} x={tr.x} y={tr.y} width={tr.width} height={tr.height} rx={tr.rx} {...comun} />
      )}
    </Svg>
  );
}

/** `#rrggbb` → rgba con opacidad; react-pdf no lee hex de 8 dígitos. */
function tenue(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Chip: icono + nombre de la disciplina sobre un fondo tenue de su color. */
export function DisciplinaChipPdf({ disciplina }: { disciplina: Disciplina }) {
  const color = DISCIPLINA_COLORS_PRINT[disciplina];
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
      paddingVertical: 1.5, paddingHorizontal: 4, borderRadius: 3,
      borderWidth: 0.6, borderColor: color, backgroundColor: tenue(color, 0.08),
    }}>
      <DisciplinaIconoPdf disciplina={disciplina} size={7.5} />
      <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color, marginLeft: 3, textTransform: "uppercase", letterSpacing: 0.3 }}>
        {DISCIPLINA_LABELS[disciplina]}
      </Text>
    </View>
  );
}
