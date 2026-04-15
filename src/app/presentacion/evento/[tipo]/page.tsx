import { notFound } from "next/navigation";
import EventoClient from "./EventoClient";

export function generateStaticParams() {
  return [{ tipo: "musical" }, { tipo: "social" }, { tipo: "empresarial" }];
}

export const dynamic = "force-static";

export default async function EventoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  if (!["musical", "social", "empresarial"].includes(tipo)) notFound();
  return <EventoClient tipo={tipo as "musical" | "social" | "empresarial"} />;
}
