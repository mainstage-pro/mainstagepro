import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/nav";
import TratamientosClient from "./TratamientosClient";

export const dynamic = "force-dynamic";

const GOLD = "#B3985B";

export default async function TratamientosPage() {
  const session = await getSession();
  if (!session || session.email !== OWNER_EMAIL) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", padding: "44px 36px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <Link href="/marketing/diseno" style={{ color: GOLD, fontSize: 13, textDecoration: "none" }}>
          ← Diseño
        </Link>
        <h1 style={{ color: "#fff", fontSize: 30, fontWeight: 800, letterSpacing: -0.6, margin: "10px 0 0" }}>
          Tratamiento de equipos
        </h1>
        <p style={{ color: "#8a8578", fontSize: 15, marginTop: 8, marginBottom: 24, maxWidth: 720 }}>
          Cómo se pinta cada equipo en las piezas: <b style={{ color: "#b8b0a0" }}>PNG sin fondo</b> (recorte que se
          estampa libre) o <b style={{ color: "#b8b0a0" }}>Foto con marco</b> (imagen rectangular en tarjeta). El sistema
          ya propuso por transparencia; corrige lo que haga falta.
        </p>
        <TratamientosClient />
      </div>
    </div>
  );
}
