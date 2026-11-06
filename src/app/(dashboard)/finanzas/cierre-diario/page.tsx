import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { cierreDiarioEnVivo, cierresEnRango } from "@/lib/resumen/cierre-diario";
import { ventana, inicioDeMes, finDeMes } from "@/lib/resumen/base";
import { EncabezadoResumen } from "@/components/resumen/ui";
import { CierreSnapshot } from "./CierreSnapshot";
import { Calendario } from "./Calendario";

export const dynamic = "force-dynamic";

function parseMesParam(mesParam: string | undefined, hoy: Date): { anio: number; mes: number } {
  if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
    const [a, m] = mesParam.split("-").map(Number);
    return { anio: a, mes: m - 1 };
  }
  return { anio: hoy.getUTCFullYear(), mes: hoy.getUTCMonth() };
}

export default async function CierreDiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/finanzas/resumen");

  const { mes: mesParam } = await searchParams;
  const { hoy } = ventana();
  const { anio, mes } = parseMesParam(mesParam, hoy);
  const desdeMes = inicioDeMes(new Date(Date.UTC(anio, mes, 1)));
  const hastaMes = finDeMes(new Date(Date.UTC(anio, mes, 1)));

  const [c, cierresMes] = await Promise.all([cierreDiarioEnVivo(), cierresEnRango(desdeMes, hastaMes)]);
  const hoyStr = hoy.toISOString().slice(0, 10);

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Cierre diario"
        subtitulo="Foto de caja al momento — se guarda automático lunes, miércoles y viernes"
      />

      <CierreSnapshot c={c} cobradoLabel="Cobrado hoy" pagadoLabel="Pagado hoy" />

      <div className="mt-4">
        <Calendario
          anio={anio}
          mes={mes}
          hoyStr={hoyStr}
          base="/finanzas/cierre-diario"
          cierres={cierresMes.map(h => ({ fecha: h.fecha.toISOString().slice(0, 10), posicion: h.posicion }))}
        />
      </div>
    </div>
  );
}
