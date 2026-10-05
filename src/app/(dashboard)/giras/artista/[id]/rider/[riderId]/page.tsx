import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { leerSeccionesExtra } from "@/lib/giras";
import RiderFichaClient from "./RiderFichaClient";

export const dynamic = "force-dynamic";

export default async function RiderFichaPage({ params }: { params: Promise<{ id: string; riderId: string }> }) {
  const { id, riderId } = await params;

  const rider = await prisma.artistaRider.findFirst({
    where: { id: riderId, artistaId: id },
    select: {
      id: true,
      nombre: true,
      version: true,
      esActivo: true,
      activo: true,
      contexto: true,
      origen: true,
      archivoUrl: true,
      archivoNombre: true,
      archivoTamanoBytes: true,
      formacion: true,
      requerimientosGenerales: true,
      notasFoh: true,
      notasMonitoreo: true,
      notasBackline: true,
      notasIluminacion: true,
      notasVideo: true,
      notasEnergia: true,
      notasEscenario: true,
      notasHospitalidad: true,
      notasCrewRequerido: true,
      seccionesExtra: true,
      escenarioAnchoM: true,
      escenarioProfundoM: true,
      escenarioAlturaM: true,
      stagePlotUrl: true,
      canalesMinimos: true,
      mixesMonitor: true,
      tiempoSoundcheckMin: true,
      tiempoCambioMin: true,
    },
  });

  if (!rider || !rider.activo) notFound();

  return (
    <RiderFichaClient
      artistaId={id}
      rider={{ ...rider, seccionesExtra: leerSeccionesExtra(rider.seccionesExtra) }}
    />
  );
}
