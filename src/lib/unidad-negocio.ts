// Corte transversal "qué unidad de negocio generó este dinero" — se deriva,
// nunca se guarda. Mismo criterio que ya usa `unidadPropuesta` en
// giras/propuesta/[id]/page.tsx: una PropuestaServicio es de Creative si
// está ligada a un ProyectoCreativo, de Live si está ligada a una Gira, y
// cualquier otra cosa (proyecto de Pro, o sin propuesta) es PRO.
export type UnidadNegocio = "PRO" | "LIVE" | "CREATIVE";

export function unidadDeCuentaCobrar(c: {
  proyectoId: string | null;
  propuestaServicio: { giraId: string | null; proyectoCreativoId: string | null } | null;
}): UnidadNegocio {
  if (c.propuestaServicio?.proyectoCreativoId) return "CREATIVE";
  if (c.propuestaServicio?.giraId) return "LIVE";
  return "PRO";
}
