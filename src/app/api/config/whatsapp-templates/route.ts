import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConfig } from "@/lib/config";

const DEFAULT_SALUDO_SIMPLE = [
  "Qué tal, NOMBRE! Excelente día, cómo estás?",
  "Hola NOMBRE! Cómo va todo? Espero que muy bien.",
  "Hola NOMBRE! Cómo estás? Un gusto saludarte.",
  "Qué tal, NOMBRE! Espero que tengas un excelente día. Cómo estás?",
].join("\n");

const DEFAULT_PRESENTACION_PROSPECTO = [
  "Hola NOMBRE! Soy Mauricio, de Mainstage Pro. Somos una empresa de producción de eventos y renta de equipo de audio, iluminación, video y más. Me encantaría platicar contigo. Tienes un momento?",
  "Qué tal, NOMBRE! Te saluda Mauricio de Mainstage Pro, producción de eventos y renta de equipo (audio, iluminación, video y más). Me gustaría conocer tu proyecto. Cómo estás?",
  "Hola NOMBRE! Soy Mauricio, de Mainstage Pro. Nos dedicamos a la producción de eventos y renta de equipo de audio, iluminación y video. Si estás planeando algo, con gusto te ayudo. Platicamos?",
].join("\n");

function parseVariantes(raw: string): string[] {
  return raw.split("\n").map(l => l.trim()).filter(Boolean);
}

// GET — plantillas de mensajes de WhatsApp para iniciar conversación (Directorio Comercial, tratos).
// Cualquier usuario con sesión puede leerlas (no requiere admin); solo Configuración las edita.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const saludoRaw = await getConfig("plantillas.waSaludoSimple", DEFAULT_SALUDO_SIMPLE);
  const presentacionRaw = await getConfig("plantillas.waPresentacionProspecto", DEFAULT_PRESENTACION_PROSPECTO);

  const saludoSimple = parseVariantes(saludoRaw ?? DEFAULT_SALUDO_SIMPLE);
  const presentacionProspecto = parseVariantes(presentacionRaw ?? DEFAULT_PRESENTACION_PROSPECTO);

  return NextResponse.json({
    saludoSimple: saludoSimple.length ? saludoSimple : parseVariantes(DEFAULT_SALUDO_SIMPLE),
    presentacionProspecto: presentacionProspecto.length ? presentacionProspecto : parseVariantes(DEFAULT_PRESENTACION_PROSPECTO),
  });
}
