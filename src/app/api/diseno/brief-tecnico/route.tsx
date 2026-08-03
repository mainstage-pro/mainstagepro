import { ImageResponse } from "next/og";
import { interFonts, localImage, localPng } from "@/lib/diseno/assets";
import { renderStory } from "@/lib/diseno/brief-tecnico/templates";
import { SUPRATERRA, STORY_BG } from "@/lib/diseno/brief-tecnico/data";
import { buildBriefTecnicoData } from "@/lib/diseno/brief-tecnico/build";
import { CANVAS } from "@/lib/diseno/tokens";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const story = searchParams.get("story") ?? "portada";
  const proyectoId = searchParams.get("proyectoId");

  const data = proyectoId ? (await buildBriefTecnicoData(proyectoId)) ?? SUPRATERRA : SUPRATERRA;

  const bg = await localImage(STORY_BG[story] ?? STORY_BG.portada);
  const logo = await localPng("logo-white.png");

  const element = renderStory(story, data, { bg, logo });

  return new ImageResponse(element, {
    width: CANVAS.W,
    height: CANVAS.H,
    fonts: interFonts().map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
  });
}
