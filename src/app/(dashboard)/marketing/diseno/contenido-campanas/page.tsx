import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { FORMATOS, type FormatoId } from "@/lib/diseno/formatos";
import {
  CAMPANA_MUESTRA_BRIEF,
  CTA_OPCIONES,
  FONDOS_CAMPANA,
  OBJETIVOS,
  OBJETIVO_LABEL,
  bgDeFondo,
  encodeBrief,
  idDeFondo,
  type CampanaBrief,
  type CampanaObjetivo,
} from "@/lib/diseno/campanas/data";
import FondoPicker from "./FondoPicker";

export const dynamic = "force-dynamic";

const GOLD = "#B3985B";
const CARD = "#141210";
const BORDE = "rgba(179,152,91,0.28)";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f0e0c",
  border: `1px solid ${BORDE}`,
  borderRadius: 10,
  color: "#fff",
  fontSize: 14,
  fontWeight: 500,
  padding: "10px 12px",
  outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#8a8578",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  marginBottom: 6,
};

type Raw = {
  objetivo?: string;
  tituloGold?: string;
  tituloWhite?: string;
  mensaje?: string;
  oferta?: string;
  cta?: string;
  fondo?: string;
  formato?: string;
};

export default async function ContenidoCampanas({ searchParams }: { searchParams: Promise<Raw> }) {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  const raw = await searchParams;
  // La primera vez (sin envío) mostramos la muestra; el select de objetivo siempre
  // viaja al enviar, así que su presencia = el usuario ya editó el brief.
  const enviado = raw.objetivo !== undefined;
  const brief: CampanaBrief = enviado
    ? {
        objetivo: (OBJETIVOS.includes(raw.objetivo as CampanaObjetivo) ? raw.objetivo : "promocion") as CampanaObjetivo,
        tituloGold: raw.tituloGold ?? "",
        tituloWhite: raw.tituloWhite ?? "",
        mensaje: raw.mensaje ?? "",
        oferta: raw.oferta ?? "",
        cta: raw.cta ?? CAMPANA_MUESTRA_BRIEF.cta,
        bg: bgDeFondo(raw.fondo),
      }
    : { ...CAMPANA_MUESTRA_BRIEF };

  const formato: FormatoId = (["story", "post", "cuadrado"] as const).includes(raw.formato as FormatoId)
    ? (raw.formato as FormatoId)
    : "story";
  const fmt = FORMATOS[formato];
  const aspect = `${fmt.w} / ${fmt.h}`;
  const fondoId = idDeFondo(brief.bg);
  const encoded = encodeBrief(brief);
  const src = `/api/diseno/render?template=contenido-campanas&slide=creativo&brief=${encoded}&formato=${formato}`;

  // Links que preservan el brief y solo cambian el formato (recargan la página).
  const pageQS = (f: string) => {
    const p = new URLSearchParams({
      objetivo: brief.objetivo,
      tituloGold: brief.tituloGold,
      tituloWhite: brief.tituloWhite,
      mensaje: brief.mensaje,
      oferta: brief.oferta,
      cta: brief.cta,
      fondo: fondoId,
      formato: f,
    });
    return `?${p.toString()}`;
  };

  return (
    <div className="ms-page">
      <div style={{ maxWidth: 1200 }}>
        <a href="/marketing/diseno" className="ms-subtitle hover:text-white transition-colors">
          ← Diseño
        </a>
        <h1 className="ms-h1 mt-3">Contenido para campañas</h1>
        <p className="ms-subtitle mt-1.5 mb-7" style={{ maxWidth: 720 }}>
          Llena el brief —breve y estándar— y arma el creativo del anuncio al instante. Edita lo que quieras y actualiza la
          vista previa; cuando esté listo, genera y descarga la pieza.
        </p>

        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* ── Formulario del brief ── */}
          <form method="get" style={{ flex: "1 1 380px", maxWidth: 460, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Objetivo</label>
              <select name="objetivo" defaultValue={brief.objetivo} style={inputStyle}>
                {OBJETIVOS.map((o) => (
                  <option key={o} value={o} style={{ background: CARD }}>
                    {OBJETIVO_LABEL[o]}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Titular (dorado)</label>
                <input name="tituloGold" defaultValue={brief.tituloGold} placeholder="TU EVENTO" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Titular (blanco)</label>
                <input name="tituloWhite" defaultValue={brief.tituloWhite} placeholder="SUENA MEJOR" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Mensaje de apoyo</label>
              <textarea name="mensaje" defaultValue={brief.mensaje} rows={3} placeholder="De qué trata la campaña" style={{ ...inputStyle, resize: "vertical" }} />
            </div>

            <div>
              <label style={labelStyle}>Oferta / gancho (opcional)</label>
              <input name="oferta" defaultValue={brief.oferta} placeholder="Visita técnica sin costo" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Llamado a la acción</label>
              <select name="cta" defaultValue={brief.cta} style={inputStyle}>
                {CTA_OPCIONES.map((c) => (
                  <option key={c} value={c} style={{ background: CARD }}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <FondoPicker
              fondos={FONDOS_CAMPANA}
              value={fondoId}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              card={CARD}
              gold={GOLD}
              borde={BORDE}
            />

            <input type="hidden" name="formato" value={formato} />
            <button type="submit" className="ms-btn-primary mt-1">
              Actualizar vista previa
            </button>
          </form>

          {/* ── Vista previa + descarga ── */}
          <div style={{ flex: "1 1 320px", maxWidth: 460, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["story", "post", "cuadrado"] as FormatoId[]).map((k) => {
                const activo = k === formato;
                return (
                  <a
                    key={k}
                    href={pageQS(k)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      textDecoration: "none",
                      fontSize: 14,
                      fontWeight: 700,
                      color: activo ? "#0a0a0a" : "#fff",
                      background: activo ? GOLD : "transparent",
                      border: `1px solid ${activo ? GOLD : BORDE}`,
                    }}
                  >
                    {FORMATOS[k].label}
                  </a>
                );
              })}
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Creativo de campaña"
              style={{ width: "100%", aspectRatio: aspect, objectFit: "cover", borderRadius: 14, border: `1px solid ${BORDE}`, display: "block", background: CARD }}
            />

            <a href={src} download={`campana-${brief.objetivo}-${formato}.png`} className="ms-btn-primary text-center">
              Generar y descargar
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
