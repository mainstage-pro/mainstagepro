import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { timingSafeEqual } from "crypto";

const BASE_PATH = "/inventario/equipos/";

// All image files in public/inventario/equipos/
const IMAGENES: string[] = [
  "adj_wolfmix.png",
  "allen_&_heath_sq5.png",
  "alphatheta_cdj_3000x.png",
  "alphatheta_cdj_3000x_2.png",
  "asteras_pixel_tube.png",
  "atem_mini_pro.png",
  "backline.png",
  "cabina_pioneer_cdj_3000_+_900_nxs2.png",
  "centro_de_carga_3_fases_lite_tek.png",
  "chauvet_intimidator_spot_260.png",
  "chauvet_intimidator_spot_260_2.png",
  "chauvet_intimidator_spot_260_3.png",
  "chauvet_pinspot_bar_6.png",
  "chauvet_pinspot_bar_6_2.png",
  "chauvet_slimpar_q12_bt.png",
  "consola_ma_grandma2.png",
  "dj_booth_riser.png",
  "electro_voice_ekx_12p.png",
  "electro_voice_ekx_18sp.png",
  "grand_ma3_compact_xt.png",
  "lite_te_par_led_amber_18x10.png",
  "lite_tek_bar_i824.png",
  "lite_tek_beam_280.png",
  "lite_tek_blinder_200.png",
  "lite_tek_fazer_1500.png",
  "lite_tek_flasher_200.png",
  "ma_command_wing.png",
  "pantalla_led.png",
  "par_led_inalambricas_super_bright.png",
  "pioneer_dj_djm_a9.png",
  "pioneer_dj_djm_a9_2.png",
  "pioneer_djm_a9.png",
  "pioneer_djm_s11.png",
  "pioneer_djm_v-10.png",
  "pioneer_rmx_1000.png",
  "planta_de_luz.png",
  "planta_de_luz_2.png",
  "polipasto.png",
  "predator_9500.png",
  "rcf_hdl30a_lineal.png",
  "rcf_hdl6a_individual.png",
  "rcf_hl6a_lineal.png",
  "rcf_sub_8006_as.png",
  "rode_m5.png",
  "sennheiser_g4_iem.png",
  "shure_axient.png",
  "shure_beta52.png",
  "shure_beta57a.png",
  "shure_blx24_sm58.png",
  "shure_sm31.png",
  "shure_sm57.png",
  "shure_sm58_cable.png",
  "shure_sm81.png",
  "sistema_in_ear_shure_psm_1000.png",
  "snake_fisico_analogo_proel.png",
  "stagebox_ar2412.png",
  "steel_pro_razor.png",
  "sun_star_kaleidos.png",
  "sun_star_soul.png",
  "tarima_1.25_x_1.25.png",
  "tarima_1.25x1.25.png",
  "truss_2.5_m.png",
  "truss_3m.png",
  "yamaha_dm7.png",
  "yamaha_mg10xuf.png",
];

// Normalize a string to a set of tokens
function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[_\-+.]/g, " ")
      .replace(/[^a-z0-9 ]/g, "")
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

// Jaccard similarity + bonus for alphanumeric model tokens (e.g. "sq5", "dm7")
function score(aTokens: Set<string>, bTokens: Set<string>): number {
  let intersection = 0;
  let modelBonus = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) {
      intersection++;
      if (/[a-z]+\d/.test(t) || /\d+[a-z]/.test(t)) modelBonus += 2; // model number match
    }
  }
  const union = new Set([...aTokens, ...bTokens]).size;
  return union === 0 ? 0 : (intersection + modelBonus) / union;
}

// Group variant images (base + _2 + _3) — strip trailing _N to get base key
function imgBaseKey(filename: string): string {
  return filename.replace(/\.png$/, "").replace(/_\d+$/, "");
}

// Build groups: base -> [primary, ...variants]
function buildGroups(): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const f of IMAGENES) {
    const base = imgBaseKey(f);
    if (!groups.has(base)) groups.set(base, []);
    const arr = groups.get(base)!;
    if (!f.match(/_\d+\.png$/)) {
      arr.unshift(f); // primary first
    } else {
      arr.push(f);
    }
  }
  return groups;
}

function isAuthorized(session: Awaited<ReturnType<typeof requireAdmin>>, req: NextRequest): boolean {
  if (session) return true;
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  const provided = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-admin-secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(adminSecret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!isAuthorized(session, req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const equipos = await prisma.equipo.findMany({
    select: { id: true, descripcion: true, marca: true, modelo: true, imagenUrl: true },
  });

  const groups = buildGroups();
  const groupKeys = [...groups.keys()];
  const groupTokens = groupKeys.map((k) => ({ key: k, tokens: tokenize(k) }));

  const matches: Array<{
    equipoId: string;
    descripcion: string;
    imagenUrl: string | null;
    imagenPropuesta: string;
    imagenesAdicionales: string[];
    score: number;
  }> = [];
  const equiposSinImagen: Array<{ equipoId: string; descripcion: string }> = [];
  const usedGroupKeys = new Set<string>();

  for (const eq of equipos) {
    const eqText = [eq.descripcion, eq.marca, eq.modelo].filter(Boolean).join(" ");
    const eqTokens = tokenize(eqText);

    let bestScore = 0;
    let bestKey = "";
    for (const g of groupTokens) {
      const s = score(eqTokens, g.tokens);
      if (s > bestScore) {
        bestScore = s;
        bestKey = g.key;
      }
    }

    if (bestScore >= 0.2) {
      const imgs = groups.get(bestKey)!;
      usedGroupKeys.add(bestKey);
      matches.push({
        equipoId: eq.id,
        descripcion: eqText,
        imagenUrl: eq.imagenUrl,
        imagenPropuesta: BASE_PATH + imgs[0],
        imagenesAdicionales: imgs.slice(1).map((f) => BASE_PATH + f),
        score: Math.round(bestScore * 100) / 100,
      });
    } else {
      equiposSinImagen.push({ equipoId: eq.id, descripcion: eqText });
    }
  }

  const imagenesHuerfanas = groupKeys
    .filter((k) => !usedGroupKeys.has(k))
    .map((k) => ({ key: k, archivos: groups.get(k)!.map((f) => BASE_PATH + f) }));

  matches.sort((a, b) => b.score - a.score);
  return NextResponse.json({ total: matches.length, matches, equiposSinImagen, imagenesHuerfanas });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!isAuthorized(session, req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  // Accept either: { apply: true } to auto-apply all matches, or { overrides: [{equipoId, imagenUrl, imagenesUrls}] }
  const { apply, overrides, threshold = 0.2 } = body;

  const equipos = await prisma.equipo.findMany({
    select: { id: true, descripcion: true, marca: true, modelo: true },
  });

  const groups = buildGroups();
  const groupKeys = [...groups.keys()];
  const groupTokens = groupKeys.map((k) => ({ key: k, tokens: tokenize(k) }));

  let applied = 0;

  if (apply) {
    for (const eq of equipos) {
      const eqText = [eq.descripcion, eq.marca, eq.modelo].filter(Boolean).join(" ");
      const eqTokens = tokenize(eqText);

      let bestScore = 0;
      let bestKey = "";
      for (const g of groupTokens) {
        const s = score(eqTokens, g.tokens);
        if (s > bestScore) {
          bestScore = s;
          bestKey = g.key;
        }
      }

      if (bestScore >= threshold && bestKey) {
        const imgs = groups.get(bestKey)!;
        const imagenUrl = BASE_PATH + imgs[0];
        const imagenesUrls = imgs.length > 1 ? JSON.stringify(imgs.map((f) => BASE_PATH + f)) : null;
        await prisma.equipo.update({
          where: { id: eq.id },
          data: { imagenUrl, imagenesUrls },
        });
        applied++;
      }
    }
  }

  if (overrides && Array.isArray(overrides)) {
    for (const o of overrides) {
      await prisma.equipo.update({
        where: { id: o.equipoId },
        data: {
          imagenUrl: o.imagenUrl ?? undefined,
          imagenesUrls: o.imagenesUrls ?? undefined,
        },
      });
      applied++;
    }
  }

  return NextResponse.json({ ok: true, applied });
}
