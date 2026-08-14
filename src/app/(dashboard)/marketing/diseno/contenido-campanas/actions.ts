"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import { briefToData, decodeBrief } from "@/lib/diseno/campanas/data";
import { CAMPANA_TEMPLATE } from "@/lib/diseno/campanas/guardados";

const RUTA = "/marketing/diseno/contenido-campanas";

// Guarda el brief actual como una plantilla de campaña reutilizable. Congela el
// CampanaData en snapshot para que el render por disenoId sea idéntico.
export async function guardarPlantillaAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) redirect("/login");

  const b = decodeBrief(String(formData.get("brief") ?? ""));
  if (!b) redirect(RUTA);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const formato = String(formData.get("formato") ?? "story");
  const titulo = nombre || `${b.tituloGold} ${b.tituloWhite}`.trim() || "Campaña";
  const snapshot = briefToData(b) as unknown as object;

  await prisma.disenoGuardado.create({
    data: { template: CAMPANA_TEMPLATE, proyectoId: null, titulo, formato, snapshot, estado: "GENERADO" },
  });
  revalidatePath(RUTA);
  redirect(`${RUTA}?guardada=1`);
}

// Elimina una plantilla guardada.
export async function eliminarPlantillaAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.disenoGuardado.deleteMany({ where: { id, template: CAMPANA_TEMPLATE } });
    revalidatePath(RUTA);
  }
  redirect(RUTA);
}
