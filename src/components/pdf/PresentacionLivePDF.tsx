/**
 * PresentacionLivePDF — versión descargable de /presentacion/live.
 * Deck oscuro 16:9 (960x540pt), mismo acento violeta que la web. Helvetica
 * core únicamente (sin Font.register): nada de ✓ ★ → − ni em dash; solo
 * puntuación segura (• × » · – †) y acentos/ñ, que sí imprime Helvetica.
 */
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const G = "#8b5cf6";
const BG = "#0a0a0a";
const W = "#f0f0f0";
const RED = "#f87171";
const GREEN = "#4ade80";
const PAGE_W = 960;
const PAGE_H = 540;

const s = StyleSheet.create({
  page: { backgroundColor: BG, fontFamily: "Helvetica", color: W, padding: 0 },
  pad: { paddingHorizontal: 64, paddingVertical: 48, height: "100%" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000000" },
  bgImg: { position: "absolute", top: 0, left: 0, width: PAGE_W, height: PAGE_H, objectFit: "cover" },
  label: { fontSize: 10, color: G, fontFamily: "Helvetica-Bold", letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 14 },
  h1: { fontSize: 34, fontFamily: "Helvetica-Bold", color: W, lineHeight: 1.15, marginBottom: 16 },
  h2: { fontSize: 24, fontFamily: "Helvetica-Bold", color: W, lineHeight: 1.2, marginBottom: 14 },
  rule: { width: 40, height: 1.5, backgroundColor: G, marginBottom: 18 },
  body: { fontSize: 10.5, color: "#b8b8b8", lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 24, left: 64, right: 64, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerTxt: { fontSize: 8, color: "#555555", letterSpacing: 1 },
});

function Footer({ n }: { n: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>MAINSTAGE LIVE</Text>
      <Text style={s.footerTxt}>{n}</Text>
    </View>
  );
}

function Card({ color, title, body, flex = 1 }: { color: string; title: string; body: string; flex?: number }) {
  return (
    <View style={{ flex, backgroundColor: "#141414", borderWidth: 1, borderColor: "#262626", borderStyle: "solid", borderRadius: 8, padding: 16 }}>
      <Text style={{ fontSize: 12.5, fontFamily: "Helvetica-Bold", color, marginBottom: 8 }}>{title}</Text>
      <Text style={{ fontSize: 9.5, color: "#aaaaaa", lineHeight: 1.55 }}>{body}</Text>
    </View>
  );
}

function Item({ n, text, color = G }: { n?: string; text: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, backgroundColor: "#141414", borderWidth: 1, borderColor: "#262626", borderStyle: "solid", borderRadius: 7, padding: "9px 12px", marginBottom: 7 }}>
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color, width: 14 }}>{n ?? "•"}</Text>
      <Text style={{ fontSize: 9.5, color: "#c4c4c4", lineHeight: 1.5, flex: 1 }}>{text}</Text>
    </View>
  );
}

export function PresentacionLivePDF({
  logoSrc,
  portadaSrc,
  cierreSrc,
}: {
  logoSrc: string | null;
  portadaSrc: string | null;
  cierreSrc: string | null;
}) {
  return (
    <Document>
      {/* 01 — Portada */}
      <Page size={[PAGE_W, PAGE_H]} style={s.page}>
        {portadaSrc && <Image src={portadaSrc} style={s.bgImg} />}
        <View style={[s.overlay, { opacity: 0.82 }]} />
        <View style={{ height: "100%", alignItems: "center", justifyContent: "center" }}>
          {logoSrc && (
            <View style={{ width: 76, height: 76, marginBottom: 22, alignItems: "center", justifyContent: "center" }}>
              <View style={{ position: "absolute", width: 76, height: 76, borderRadius: 18, backgroundColor: "#000000", opacity: 0.55 }} />
              <Image src={logoSrc} style={{ width: 64, height: 64, borderRadius: 14 }} />
            </View>
          )}
          <Text style={{ fontSize: 46, fontFamily: "Helvetica-Bold", color: W, marginBottom: 6 }}>Mainstage <Text style={{ color: G }}>Live</Text></Text>
          <View style={{ width: 120, height: 1, backgroundColor: G, marginVertical: 18 }} />
          <Text style={{ fontSize: 14, color: "#cfcfcf", marginBottom: 14, textAlign: "center" }}>
            Producción de gira para artistas que están construyendo algo real.
          </Text>
          <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: G, letterSpacing: 2, textTransform: "uppercase" }}>
            Production Management · Tour Management · Stage Management
          </Text>
        </View>
      </Page>

      {/* 02 — Quienes somos / Que nos mueve */}
      <Page size={[PAGE_W, PAGE_H]} style={s.page}>
        <View style={[s.pad, { flexDirection: "row", gap: 48 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Quiénes somos</Text>
            <Text style={s.h2}>El equipo que falta en tu equipo.</Text>
            <View style={s.rule} />
            <Text style={s.body}>
              Mainstage Live nace dentro de Grupo Mainstage – el mismo grupo que ya mueve equipo técnico y diseño creativo para cientos de shows al año – con una misión específica: que un artista emergente pueda subirse a cualquier escenario, en cualquier ciudad, y que la producción nunca sea la razón por la que algo salió mal.{"\n\n"}
              No llegamos como proveedor externo que se va al terminar el show. Llegamos como la parte del equipo que se encarga de que el show exista.
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Qué nos mueve</Text>
            <Text style={s.h2}>Que el artista crezca, y la producción con él.</Text>
            <View style={s.rule} />
            <Text style={s.body}>
              Hemos visto el patrón demasiadas veces: un artista explota, las fechas se multiplican, y el management termina apagando incendios de logística en vez de construir carrera. El show se sostiene a pesar de la producción, no gracias a ella.{"\n\n"}
              Un artista no debería tener que elegir entre crecer rápido y crecer bien.
            </Text>
          </View>
        </View>
        <Footer n="02" />
      </Page>

      {/* 03 — Mision / Vision */}
      <Page size={[PAGE_W, PAGE_H]} style={s.page}>
        <View style={[s.pad, { flexDirection: "row", gap: 48 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Misión</Text>
            <Text style={s.h2}>Que toquen como grandes, desde su primera gira.</Text>
            <View style={s.rule} />
            <Text style={s.body}>
              Ser la estructura de producción que un artista emergente necesita para tocar como uno grande, desde su primera gira. Convertirnos en la extensión operativa del management y del artista: la gente que resuelve, anticipa y ejecuta.
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Visión</Text>
            <Text style={s.h2}>Crecer rápido y sonar bien no son opuestos.</Text>
            <View style={s.rule} />
            <Text style={s.body}>
              Que ningún artista en ascenso tenga que elegir entre crecer rápido y sonar o verse bien en el escenario. Ser el estándar de producción para la nueva generación de talento urbano en México.
            </Text>
          </View>
        </View>
        <Footer n="03" />
      </Page>

      {/* 04 — Estructura de servicios */}
      <Page size={[PAGE_W, PAGE_H]} style={s.page}>
        <View style={s.pad}>
          <Text style={s.label}>Cómo se estructura nuestro servicio</Text>
          <Text style={s.h1}>Tres servicios. Independientes. Combinables.</Text>
          <Text style={[s.body, { marginBottom: 22, maxWidth: 620 }]}>
            Se contratan según lo que necesites hoy – y crecen cuando tú creces. Puedes contratar uno solo, dos, o los tres juntos. Lo que no cambia es el estándar.
          </Text>
          <View style={{ flexDirection: "row", gap: 14, marginBottom: 16 }}>
            <Card color={G} title="Production Management" body="Advance técnico con el venue y proveedores locales, coordinación de todo lo que debe estar listo antes de que el artista llegue, documentación técnica y logística de crew." />
            <Card color={G} title="Tour Management" body="Control del presupuesto completo de la gira, representación frente a promotores, manejo de caja y per diem, y decisiones de logística de alto nivel." />
            <Card color={G} title="Stage Management" body="Stage call, coordinación del crew local de escenario, enlace con la producción del venue durante montaje, show y desmontaje, y resolución de contingencias en vivo." />
          </View>
          <Text style={{ fontSize: 9, color: "#777777" }}>
            + Add-ons que se integran a cualquiera: <Text style={{ color: "#aaaaaa" }}>Audio · Iluminación · Video/Visuales · Backline</Text>
          </Text>
        </View>
        <Footer n="04" />
      </Page>

      {/* 05 — A quien va dirigido */}
      <Page size={[PAGE_W, PAGE_H]} style={s.page}>
        <View style={s.pad}>
          <Text style={s.label}>A quién va dirigido</Text>
          <Text style={[s.h1, { maxWidth: 680 }]}>Artistas urbanos emergentes en la zona donde más se pierde si nadie la cuida.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, marginBottom: 16 }}>
            <View style={{ width: "48.5%" }}>
              <Item n="01" text="Ya tocan más de una ciudad y las fechas empiezan a chocar entre sí en logística." />
            </View>
            <View style={{ width: "48.5%" }}>
              <Item n="02" text="Su management es brillante en carrera y estrategia, pero no tiene por qué ser experto en advance técnico, riders o presupuestos de gira." />
            </View>
            <View style={{ width: "48.5%" }}>
              <Item n="03" text="Cada show se siente distinto según quién les tocó esa noche en el venue, y eso ya les está costando consistencia frente a su público." />
            </View>
            <View style={{ width: "48.5%" }}>
              <Item n="04" text="Están a punto de dar el salto a festivales, giras de varias fechas o mercados nuevos, y necesitan la producción lista para ese salto." />
            </View>
          </View>
          <Text style={[s.body, { fontSize: 9.5, maxWidth: 740 }]}>
            No vendemos esto a quien ya tiene una producción armada de planta. Vendemos esto a quien está en el momento exacto en el que la decisión de cómo se construye su producción define qué tan lejos y qué tan rápido puede llegar.
          </Text>
        </View>
        <Footer n="05" />
      </Page>

      {/* 06 — Problemas */}
      <Page size={[PAGE_W, PAGE_H]} style={s.page}>
        <View style={s.pad}>
          <Text style={[s.label, { color: RED }]}>Los problemas que detectamos</Text>
          <Text style={[s.h1, { maxWidth: 680 }]}>Lo que vemos siempre, la primera vez que entramos a un proyecto.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {[
              "El advance se hace por WhatsApp, un día antes, con quien conteste.",
              "Cada fecha tiene un nivel de producción distinto, según la buena voluntad del promotor local.",
              "El management termina haciendo de tour manager improvisado, entre llamadas de negocio.",
              "No existe documentación técnica de la gira; cada fecha se reinventa desde cero.",
              "El dinero de la gira no tiene un control claro: per diem, presupuesto y settlement se manejan a ojo.",
              "El salto de \"shows sueltos\" a \"gira real\" expone todo lo anterior al mismo tiempo.",
            ].map((t, i) => (
              <View key={i} style={{ width: "48.5%" }}>
                <Item text={t} color={RED} n="×" />
              </View>
            ))}
          </View>
        </View>
        <Footer n="06" />
      </Page>

      {/* 07 — Soluciones */}
      <Page size={[PAGE_W, PAGE_H]} style={s.page}>
        <View style={s.pad}>
          <Text style={[s.label, { color: GREEN }]}>Cómo lo resolvemos</Text>
          <Text style={[s.h1, { maxWidth: 680 }]}>La misma estructura de un artista consolidado, desde el día uno.</Text>
          <View style={{ marginTop: 10 }}>
            <Item text="Un estándar que viaja con ustedes, no que depende del venue de esa noche." color={GREEN} />
            <Item text="Un solo punto de contacto para producción, sin importar si son 1 show o 25 fechas." color={GREEN} />
            <Item text="Presupuesto y caja de gira con control real: per diem, transporte, hospedaje y settlement." color={GREEN} />
            <Item text="Documentación técnica que se queda con ustedes, show tras show, gira tras gira." color={GREEN} />
            <Item text="Un servicio que crece con la gira: empiezan con uno, suman los otros cuando lo necesiten." color={GREEN} />
          </View>
        </View>
        <Footer n="07" />
      </Page>

      {/* 08 — Alianza */}
      <Page size={[PAGE_W, PAGE_H]} style={s.page}>
        <View style={s.pad}>
          <Text style={s.label}>Por qué trabajar con nosotros</Text>
          <Text style={[s.h1, { maxWidth: 700 }]}>No llegamos solos. Llegamos con todo Grupo Mainstage detrás.</Text>
          <Text style={[s.body, { maxWidth: 740, marginBottom: 18 }]}>
            Mainstage Live no opera aislado: es una de tres unidades de un mismo grupo, y eso es justo lo que nos permite ofrecer algo que ningún tour manager independiente puede ofrecer solo.
          </Text>
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
            <Card color={G} title="+ Mainstage Pro (renta de equipo)" body="Cuando una fecha necesita backline, audio o iluminación complementaria, tenemos acceso directo al inventario y al estándar de calidad de la operación de renta técnica más establecida del grupo." />
            <Card color={G} title="+ Mainstage Creative (diseño y desarrollo de shows)" body="Cuando el show necesita verse tan grande como suena, Creative diseña – iluminación, renders, documentación técnica – y Live lo ejecuta en piso, fecha tras fecha." />
          </View>
          <Text style={[s.body, { fontSize: 9.5 }]}>
            La producción, el diseño y el equipo técnico ya hablan el mismo idioma porque vienen de la misma casa. Cero fricción entre lo que se diseñó, el equipo que se rentó y lo que pasa la noche del show.
          </Text>
        </View>
        <Footer n="08" />
      </Page>

      {/* 09 — Por que parte del equipo */}
      <Page size={[PAGE_W, PAGE_H]} style={s.page}>
        <View style={s.pad}>
          <Text style={s.label}>Por qué hacernos parte de tu equipo</Text>
          <Text style={[s.h1, { maxWidth: 700 }]}>No somos un proveedor que contratas por show. Somos el equipo que se queda.</Text>
          <View style={{ marginTop: 10 }}>
            <Item n="01" text="Entendemos tu proyecto, no solo tu rider, y eso se nota en la segunda fecha, no en la primera." />
            <Item n="02" text="Crecemos con la velocidad real de tu carrera: de un show, a una gira corta, a una gira nacional." />
            <Item n="03" text="Te devolvemos el tiempo y la energía que hoy gastas resolviendo logística, para que la pongas en la música y en tu público." />
            <Item n="04" text="Cuando algo se tuerce, porque en gira algo siempre se tuerce, tienes a alguien que ya lo ha resuelto antes." />
          </View>
        </View>
        <Footer n="09" />
      </Page>

      {/* 10 — Cierre */}
      <Page size={[PAGE_W, PAGE_H]} style={s.page}>
        {cierreSrc && <Image src={cierreSrc} style={s.bgImg} />}
        <View style={[s.overlay, { opacity: 0.84 }]} />
        <View style={{ height: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 80 }}>
          <Text style={{ fontSize: 13, color: "#cfcfcf", marginBottom: 16, textAlign: "center" }}>
            La producción no debería ser lo que detiene tu crecimiento.
          </Text>
          <Text style={{ fontSize: 32, fontFamily: "Helvetica-Bold", color: G, textAlign: "center", lineHeight: 1.15, marginBottom: 22 }}>
            Debería ser lo que lo sostiene.
          </Text>
          <View style={{ width: 90, height: 1, backgroundColor: G, marginBottom: 20 }} />
          <Text style={{ fontSize: 11, color: "#d8d8d8", marginBottom: 28, textAlign: "center" }}>
            Hablemos de tu próxima fecha, o de tu próxima gira completa.
          </Text>
          {logoSrc && <Image src={logoSrc} style={{ width: 44, height: 44, borderRadius: 10 }} />}
        </View>
      </Page>
    </Document>
  );
}
