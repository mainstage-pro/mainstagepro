import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PersonasArtistaClient, { type PersonaFila } from "./PersonasArtistaClient";

export const dynamic = "force-dynamic";

export default async function ArtistaPersonasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const artista = await prisma.artista.findUnique({
    where: { id },
    select: { id: true, activo: true, integrantesNum: true },
  });
  if (!artista || !artista.activo) notFound();

  const personas = await prisma.artistaPersona.findMany({
    where: { artistaId: id, activo: true },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      nombre: true,
      rol: true,
      instrumento: true,
      esIntegrante: true,
      esContactoClave: true,
      telefono: true,
      email: true,
      tallaPlayera: true,
      notasHospitalidad: true,
      notas: true,
      orden: true,
    },
  });

  return (
    <PersonasArtistaClient
      artistaId={id}
      integrantesNum={artista.integrantesNum}
      personasIniciales={personas as PersonaFila[]}
    />
  );
}
