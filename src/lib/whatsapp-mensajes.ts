"use client";

// Mensajes de WhatsApp para iniciar conversación con clientes y prospectos.
// Los textos se editan en Admin → Configuración → Plantillas de mensajes (sección "plantillas",
// claves plantillas.waSaludoSimple y plantillas.waPresentacionProspecto). Este archivo solo
// trae valores por defecto como respaldo mientras carga la configuración real.
//
// Reglas:
//  - Cliente (o prospecto ya contactado)  → saludo simple, sin presentación.
//  - Prospecto de primera vez (sin actividad) → saludo + presentación de Mainstage Pro.
// La variante se elige de forma estable por contacto (mismo contacto → mismo saludo),
// dando variedad entre contactos sin romper la hidratación de React.

import { useEffect, useState } from "react";

const DEFAULT_SALUDO_SIMPLE = [
  "Qué tal, NOMBRE! Excelente día, cómo estás?",
  "Hola NOMBRE! Cómo va todo? Espero que muy bien.",
  "Hola NOMBRE! Cómo estás? Un gusto saludarte.",
  "Qué tal, NOMBRE! Espero que tengas un excelente día. Cómo estás?",
];

const DEFAULT_PRESENTACION_PROSPECTO = [
  "Hola NOMBRE! Soy Mauricio, de Mainstage Pro. Somos una empresa de producción de eventos y renta de equipo de audio, iluminación, video y más. Me encantaría platicar contigo. Tienes un momento?",
  "Qué tal, NOMBRE! Te saluda Mauricio de Mainstage Pro, producción de eventos y renta de equipo (audio, iluminación, video y más). Me gustaría conocer tu proyecto. Cómo estás?",
  "Hola NOMBRE! Soy Mauricio, de Mainstage Pro. Nos dedicamos a la producción de eventos y renta de equipo de audio, iluminación y video. Si estás planeando algo, con gusto te ayudo. Platicamos?",
];

let SALUDO_SIMPLE: string[] = DEFAULT_SALUDO_SIMPLE;
let PRESENTACION_PROSPECTO: string[] = DEFAULT_PRESENTACION_PROSPECTO;
let cargaIniciada = false;
const listeners = new Set<() => void>();

async function cargarPlantillasWhatsapp() {
  if (cargaIniciada) return;
  cargaIniciada = true;
  try {
    const res = await fetch("/api/config/whatsapp-templates");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.saludoSimple) && data.saludoSimple.length) SALUDO_SIMPLE = data.saludoSimple;
    if (Array.isArray(data.presentacionProspecto) && data.presentacionProspecto.length) {
      PRESENTACION_PROSPECTO = data.presentacionProspecto;
    }
    listeners.forEach(fn => fn());
  } catch {
    // se conservan las plantillas por defecto
  }
}

// Llamar en componentes que usan mensajeWhatsappContacto/waUrlContacto para que
// se actualicen con las plantillas configuradas en Admin → Configuración en cuanto carguen.
export function useWhatsappPlantillas() {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const listener = () => forceRender(t => t + 1);
    listeners.add(listener);
    cargarPlantillasWhatsapp();
    return () => { listeners.delete(listener); };
  }, []);
}

function primerNombre(nombre: string): string {
  return (nombre || "").trim().split(/\s+/)[0] || "";
}

// Índice estable a partir de una semilla (id del contacto) para elegir variante.
function indiceEstable(seed: string, len: number): number {
  if (len <= 0) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % len;
}

interface ContactoWa {
  id: string;
  nombre: string;
  esProspecto: boolean;
  // true si el contacto ya tiene actividad (tratos/prospecciones/cotizaciones).
  tieneActividad: boolean;
}

export function mensajeWhatsappContacto(c: ContactoWa): string {
  const usarPresentacion = c.esProspecto && !c.tieneActividad;
  const variantes = usarPresentacion ? PRESENTACION_PROSPECTO : SALUDO_SIMPLE;
  const plantilla = variantes[indiceEstable(c.id, variantes.length)];
  return plantilla.replace(/NOMBRE/g, primerNombre(c.nombre));
}

function normalizarTelefonoMx(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  let num = telefono.replace(/\D/g, "");
  if (!num) return null;
  if (num.length === 10) num = `52${num}`; // número nacional MX sin lada país
  return num;
}

// Devuelve la URL wa.me con el mensaje prellenado, o null si no hay teléfono válido.
export function waUrlContacto(
  c: ContactoWa & { telefono: string | null | undefined },
): string | null {
  const num = normalizarTelefonoMx(c.telefono);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(mensajeWhatsappContacto(c))}`;
}
