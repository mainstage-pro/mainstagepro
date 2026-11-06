"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const HOME_POR_UNIDAD = {
  PRO: "/mi-dashboard",
  LIVE: "/giras/resumen",
  CREATIVE: "/creative/proyectos",
} as const;

export async function seleccionarUnidad(unidad: keyof typeof HOME_POR_UNIDAD) {
  const cookieStore = await cookies();
  cookieStore.set("unidad-activa", unidad, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  redirect(HOME_POR_UNIDAD[unidad]);
}
