import type { Metadata } from "next";
import PresentacionEquipoClient from "./PresentacionEquipoClient";

export const metadata: Metadata = {
  title: "Alineación Estratégica 2026 · Mainstage Pro",
  description: "Presentación interna de equipo — Mainstage Pro",
};

export default function Page() {
  return <PresentacionEquipoClient />;
}
