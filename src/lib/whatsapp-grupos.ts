// Enlaces de grupos de WhatsApp por área de gestión operativa.
// Se rellenan cuando el usuario provea los links (invitación de grupo o wa.me).
// Mientras estén vacíos, el envío usa el "share" universal de WhatsApp con el
// texto prellenado, y el usuario elige el grupo destino manualmente.
export const WHATSAPP_GRUPOS: Record<string, string> = {
  DIRECCION: "",
  ADMINISTRACION: "",
  MARKETING: "",
  VENTAS: "",
  PRODUCCION: "",
  RRHH: "",
  GENERAL: "",
};

export function grupoWhatsappDeArea(area?: string | null): string {
  if (!area) return WHATSAPP_GRUPOS.GENERAL || "";
  return WHATSAPP_GRUPOS[area] || WHATSAPP_GRUPOS.GENERAL || "";
}

// Construye el texto del mensaje de comprobación para el grupo.
export function textoComprobacion(input: {
  titulo: string;
  area?: string | null;
  responsable?: string | null;
  tipoEvidencia?: string | null;
  nota?: string | null;
  urls?: string[];
}): string {
  const lineas: string[] = [];
  lineas.push(`✅ *Tarea realizada:* ${input.titulo}`);
  if (input.area) lineas.push(`📂 Área: ${input.area}`);
  if (input.responsable) lineas.push(`👤 Responsable: ${input.responsable}`);
  const etiquetaEvidencia =
    input.tipoEvidencia === "FOTO" ? "Evidencia fotográfica" :
    input.tipoEvidencia === "ARCHIVO" ? "Reporte / archivo" :
    input.tipoEvidencia === "NOTA" ? "Comunicado por escrito" : "Comprobación";
  lineas.push(`🧾 ${etiquetaEvidencia}`);
  if (input.nota?.trim()) lineas.push(`\n${input.nota.trim()}`);
  if (input.urls && input.urls.length > 0) {
    lineas.push("");
    input.urls.forEach(u => lineas.push(u));
  }
  return lineas.join("\n");
}
