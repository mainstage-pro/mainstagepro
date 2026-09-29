// Lectura del marco de identidad vigente (propósito/misión/visión + valores y
// conductas) para congelarlo dentro de documentos laborales y onboarding.
// Fuente única: /direccion/cultura. `identidadVersion` queda en el snapshot para
// poder detectar documentos firmados con una identidad anterior.

import { prisma } from "@/lib/prisma";
import { parseConductas, noNegociables } from "@/lib/estrategia";

export interface MarcoIdentidadSnapshot {
  identidadVersion: number;
  frase?: string | null;
  proposito: string;
  mision: string;
  vision: string;
  valores: { nombre: string; comoSeVive?: string | null; esperadas: string[] }[];
  noNegociables: string[];
}

export async function getMarcoIdentidad(): Promise<MarcoIdentidadSnapshot | null> {
  const [identidad, valores] = await Promise.all([
    prisma.identidad.findFirst({ where: { vigente: true } }),
    prisma.valorEmpresa.findMany({ where: { activo: true }, orderBy: { orden: "asc" } }),
  ]);
  if (!identidad) return null;
  return {
    identidadVersion: identidad.version,
    frase: identidad.frase,
    proposito: identidad.proposito,
    mision: identidad.mision,
    vision: identidad.vision,
    valores: valores.map((v) => ({
      nombre: v.nombre,
      comoSeVive: v.comoSeVive,
      esperadas: parseConductas(v.conductas)
        .filter((c) => c.tipo === "ESPERADA")
        .map((c) => c.texto),
    })),
    noNegociables: noNegociables(valores),
  };
}
