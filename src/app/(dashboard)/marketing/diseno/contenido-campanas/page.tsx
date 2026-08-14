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
import { getCampanaGuardada, listarCampanas } from "@/lib/diseno/campanas/guardados";
import { guardarPlantillaAction, eliminarPlantillaAction } from "./actions";

export const dynamic = "force-dynamic";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fechaCorta = (d: Date) => `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

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
  abrir?: string; // id de una plantilla guardada a reabrir
  guardada?: string; // "1" tras guardar (mensaje de éxito)
};

export default async function ContenidoCampanas({ searchParams }: { searchParams: Promise<Raw> }) {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  const raw = await searchParams;
  // La primera vez (sin envío) mostramos la muestra; el select de objetivo siempre
  // viaja al enviar, así que su presencia = el usuario ya editó el brief.
  const enviado = raw.objetivo !== undefined;
  const abierta = !enviado && raw.abrir ? await getCampanaGuardada(raw.abrir) : null;
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
    : abierta
      ? { ...abierta.brief }
      : { ...CAMPANA_MUESTRA_BRIEF };

  const guardadas = await listarCampanas();

  const formato: FormatoId = (["story", "post", "cuadrado"] as const).includes(raw.formato as FormatoId)
    ? (raw.formato as FormatoId)
    : "story";
  const fmt = FORMATOS[formato];
  const aspect = `${fmt.w} / ${fmt.h}`;
  const fondoId = idDeFondo(brief.bg);
  const encoded = encodeBrief(brief);
  const src = `/api/diseno/render?template=contenido-campanas&slide=creativo&brief=${encoded}&formato=${formato}`;
  const nombreBase = `campana-${brief.objetivo}`;
  const zipHref = `/api/diseno/campanas/zip?brief=${encoded}&nombre=${nombreBase}`;

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
              Descargar {FORMATOS[formato].label} (PNG)
            </a>

            <a href={zipHref} download={`${nombreBase}.zip`} className="ms-btn-secondary text-center">
              Descargar los 3 formatos (ZIP)
            </a>

            {/* Guardar la plantilla para reusarla después */}
            <form action={guardarPlantillaAction} className="flex flex-col gap-2.5 rounded-xl px-4 py-4 mt-1" style={{ background: CARD, border: `1px solid ${BORDE}` }}>
              <input type="hidden" name="brief" value={encoded} />
              <input type="hidden" name="formato" value={formato} />
              <label style={labelStyle}>Guardar esta plantilla</label>
              <input
                name="nombre"
                defaultValue={`${brief.tituloGold} ${brief.tituloWhite}`.trim()}
                placeholder="Nombre de la plantilla"
                style={inputStyle}
              />
              <button type="submit" className="ms-btn-primary">
                Guardar plantilla
              </button>
              {raw.guardada === "1" && (
                <span className="text-[12.5px] font-medium" style={{ color: "#7cc47c" }}>
                  ✓ Plantilla guardada. La ves abajo en “Plantillas guardadas”.
                </span>
              )}
            </form>
          </div>
        </div>

        {/* ── Plantillas guardadas ── */}
        <section className="mt-12">
          <h2 className="ms-section-label mb-1">Plantillas guardadas</h2>
          <p className="ms-subtitle mb-5" style={{ maxWidth: 720 }}>
            {guardadas.length === 0
              ? "Aún no guardas ninguna. Arma un creativo y usa “Guardar plantilla” para tenerlo aquí."
              : "Ábrelas para editarlas, descarga los 3 formatos en ZIP o elimínalas."}
          </p>

          {guardadas.length > 0 && (
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {guardadas.map((g) => {
                const thumb = `/api/diseno/render?disenoId=${g.id}&slide=creativo&formato=cuadrado`;
                const zip = `/api/diseno/campanas/zip?disenoId=${g.id}&nombre=${g.id}`;
                return (
                  <div key={g.id} className="flex flex-col gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb}
                      alt={g.titulo}
                      className="w-full block rounded-xl"
                      style={{ aspectRatio: "1 / 1", objectFit: "cover", border: `1px solid ${BORDE}`, background: CARD }}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13.5px] font-semibold leading-tight" style={{ color: "#e8e2d6" }}>
                        {g.titulo || "Campaña"}
                      </span>
                      <span className="text-[11px] font-bold tracking-wide" style={{ color: "#8a8578" }}>
                        {fechaCorta(g.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={`?abrir=${g.id}`} className="ms-btn-ghost">
                        Abrir
                      </a>
                      <a href={zip} download={`campana-${g.id}.zip`} className="ms-btn-ghost">
                        ZIP
                      </a>
                      <form action={eliminarPlantillaAction} className="m-0">
                        <input type="hidden" name="id" value={g.id} />
                        <button type="submit" className="ms-btn-ghost" style={{ color: "#e08a8a" }}>
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
