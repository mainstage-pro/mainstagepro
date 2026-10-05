"use client";

import {
  type Capa,
  type ObjetoPlano,
  anclaRotulo,
  colorDe,
  medidaDe,
  puntaDeFlecha,
  radioDe,
  RELLENO_DEFAULT,
  TAMANO_PIN_DEFAULT,
  TAMANO_TEXTO_DEFAULT,
} from "@/lib/site-plan";
import { iconoDe } from "@/lib/site-plan-iconos";

/**
 * Dibujo de los objetos del plano. Lo usan el editor, la vista pública y la vista
 * de impresión: si el polígono se viera distinto en el editor que en el plano que
 * se le manda al venue, el plano dejaría de ser un acuerdo.
 *
 * `unidad` son los píxeles de imagen que mide un píxel de pantalla (1/zoom). Todo
 * lo que debe verse del mismo grosor sin importar el acercamiento —contornos,
 * rótulos, manijas— se multiplica por ella.
 */

export function TrazoDeObjeto({ o, color }: { o: ObjetoPlano; color: string }) {
  const puntos = o.puntos.map(p => `${p.x},${p.y}`).join(" ");

  switch (o.tipo) {
    case "ZONA":
      return <polygon points={puntos} fill={color} fillOpacity={o.relleno ?? RELLENO_DEFAULT} stroke="none" />;
    case "CIRCULO":
      return (
        <circle
          cx={o.puntos[0].x}
          cy={o.puntos[0].y}
          r={radioDe(o.puntos)}
          fill={color}
          fillOpacity={o.relleno ?? RELLENO_DEFAULT}
          stroke="none"
        />
      );
    default:
      return null;
  }
}

function PuntaDeFlecha({ o, color }: { o: ObjetoPlano; color: string }) {
  const punta = puntaDeFlecha(o);
  if (!punta) return null;
  return <polygon points={punta.map(p => `${p.x},${p.y}`).join(" ")} fill={color} />;
}

export function ContornoDeObjeto({ o, color, unidad }: { o: ObjetoPlano; color: string; unidad: number }) {
  const puntos = o.puntos.map(p => `${p.x},${p.y}`).join(" ");
  const borde = 2 * unidad;

  switch (o.tipo) {
    case "ZONA":
      return (
        <polygon
          points={puntos}
          fill="none"
          stroke={color}
          strokeWidth={borde}
          strokeLinejoin="round"
          strokeDasharray={o.punteado ? `${borde * 4} ${borde * 3}` : undefined}
        />
      );
    case "CIRCULO":
      return (
        <circle
          cx={o.puntos[0].x}
          cy={o.puntos[0].y}
          r={radioDe(o.puntos)}
          fill="none"
          stroke={color}
          strokeWidth={borde}
          strokeDasharray={o.punteado ? `${borde * 4} ${borde * 3}` : undefined}
        />
      );
    case "TRAZO": {
      const g = o.grosor ?? 6;
      return (
        <>
          <polyline
            points={puntos}
            fill="none"
            stroke={color}
            strokeWidth={g}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={o.punteado ? `${g * 2} ${g * 1.6}` : undefined}
          />
          {o.flecha ? <PuntaDeFlecha o={o} color={color} /> : null}
        </>
      );
    }
    default:
      return null;
  }
}

export function PinDeObjeto({ o, color, unidad }: { o: ObjetoPlano; color: string; unidad: number }) {
  const def = iconoDe(o.icono);
  const Icono = def?.Icono;
  const d = o.tamano ?? TAMANO_PIN_DEFAULT;
  const r = d / 2;
  const { x, y } = o.puntos[0];
  const lado = d * 0.56;

  return (
    <>
      <circle cx={x} cy={y} r={r} fill={color} stroke="#0b0b0b" strokeWidth={Math.max(1.5 * unidad, d * 0.045)} />
      {Icono ? (
        <Icono
          x={x - lado / 2}
          y={y - lado / 2}
          width={lado}
          height={lado}
          color="#0b0b0b"
          strokeWidth={2.4}
          absoluteStrokeWidth
        />
      ) : null}
    </>
  );
}

/**
 * El nombre del objeto sobre una pastilla oscura. La pastilla no es decorado: sin
 * ella el texto blanco desaparece sobre el pasto claro de una foto satelital.
 */
export function RotuloDeObjeto({
  o,
  color,
  unidad,
  escala,
  conMedida,
}: {
  o: ObjetoPlano;
  color: string;
  unidad: number;
  escala?: number | null;
  conMedida?: boolean;
}) {
  if (o.tipo === "TEXTO") {
    const fs = o.tamano ?? TAMANO_TEXTO_DEFAULT;
    return (
      <text
        x={o.puntos[0].x}
        y={o.puntos[0].y}
        fill={color}
        fontSize={fs}
        fontWeight={700}
        stroke="#0b0b0b"
        strokeWidth={fs * 0.14}
        paintOrder="stroke"
        strokeLinejoin="round"
        style={{ userSelect: "none" }}
      >
        {o.etiqueta}
      </text>
    );
  }

  if (!o.etiqueta.trim()) return null;

  const medida = conMedida ? medidaDe(o, escala) : null;
  const ancla = anclaRotulo(o);
  const esPin = o.tipo === "PIN";
  const fs = 13 * unidad;
  const altoLinea = fs * 1.25;
  const lineas = medida ? [o.etiqueta, medida] : [o.etiqueta];
  const ancho = Math.max(...lineas.map(l => l.length)) * fs * 0.58 + fs * 1.1;
  const alto = altoLinea * lineas.length + fs * 0.5;
  // El pin ya ocupa su punto: su nombre se cuelga debajo para no taparlo.
  const cy = esPin ? ancla.y + (o.tamano ?? TAMANO_PIN_DEFAULT) / 2 + alto / 2 + fs * 0.4 : ancla.y;

  return (
    <g style={{ pointerEvents: "none", userSelect: "none" }}>
      <rect
        x={ancla.x - ancho / 2}
        y={cy - alto / 2}
        width={ancho}
        height={alto}
        rx={fs * 0.45}
        fill="#0b0b0bE6"
        stroke={color}
        strokeWidth={unidad}
      />
      {lineas.map((linea, i) => (
        <text
          key={i}
          x={ancla.x}
          y={cy - alto / 2 + fs * 0.25 + altoLinea * (i + 0.72)}
          textAnchor="middle"
          fill={i === 0 ? "#f5f5f5" : color}
          fontSize={i === 0 ? fs : fs * 0.85}
          fontWeight={i === 0 ? 700 : 500}
        >
          {linea}
        </text>
      ))}
    </g>
  );
}

/**
 * Un objeto completo. Se dibuja en dos pasadas desde fuera (primero todos los
 * rellenos, luego contornos y rótulos) para que ninguna zona traslúcida apague el
 * nombre de la de al lado.
 */
export function CapaDeObjetos({
  objetos,
  capas,
  unidad,
  escala,
  conMedidas,
  conRotulos = true,
}: {
  objetos: ObjetoPlano[];
  capas: Capa[];
  unidad: number;
  escala?: number | null;
  conMedidas?: boolean;
  conRotulos?: boolean;
}) {
  return (
    <>
      <g>
        {objetos.map(o => (
          <TrazoDeObjeto key={`f-${o.id}`} o={o} color={colorDe(o, capas)} />
        ))}
      </g>
      <g>
        {objetos.map(o => (
          <ContornoDeObjeto key={`c-${o.id}`} o={o} color={colorDe(o, capas)} unidad={unidad} />
        ))}
      </g>
      <g>
        {objetos
          .filter(o => o.tipo === "PIN")
          .map(o => (
            <PinDeObjeto key={`p-${o.id}`} o={o} color={colorDe(o, capas)} unidad={unidad} />
          ))}
      </g>
      {conRotulos ? (
        <g>
          {objetos.map(o => (
            <RotuloDeObjeto
              key={`r-${o.id}`}
              o={o}
              color={colorDe(o, capas)}
              unidad={unidad}
              escala={escala}
              conMedida={conMedidas}
            />
          ))}
        </g>
      ) : null}
    </>
  );
}

/**
 * Barra de escala: la referencia que vuelve usable un plano impreso, donde ya no
 * se puede pedirle al sistema que mida. Elige una longitud redonda (10, 25, 50,
 * 100 m…) que quepa en el ancho dado.
 */
export function BarraDeEscala({ escala, anchoPx }: { escala: number | null | undefined; anchoPx: number }) {
  if (!escala) return null;
  const metrosMax = anchoPx * escala;
  const pasos = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const metros = [...pasos].reverse().find(p => p <= metrosMax) ?? 1;
  const largo = metros / escala;

  return (
    <g>
      <rect x={0} y={-10} width={largo} height={6} fill="#f5f5f5" stroke="#0b0b0b" strokeWidth={1} />
      <rect x={0} y={-10} width={largo / 2} height={6} fill="#0b0b0b" />
      <text x={largo + 8} y={-4} fill="#f5f5f5" fontSize={12} fontWeight={600}>
        {metros} m
      </text>
    </g>
  );
}
