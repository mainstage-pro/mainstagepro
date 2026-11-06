import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { cierrePorFecha } from "@/lib/resumen/cierre-diario";
import { EncabezadoResumen, Vacio } from "@/components/resumen/ui";
import { CierreSnapshot, type CierreSnapshotData } from "../CierreSnapshot";

export const dynamic = "force-dynamic";

const DIA_LABELS: Record<string, string> = {
  DOMINGO: "Domingo", LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles",
  JUEVES: "Jueves", VIERNES: "Viernes", SABADO: "Sábado",
};

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export default async function CierreDiarioFechaPage({
  params,
}: {
  params: Promise<{ fecha: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/finanzas/resumen");

  const { fecha } = await params;
  const mesParam = RE_FECHA.test(fecha) ? fecha.slice(0, 7) : null;
  const volver = mesParam ? `/finanzas/cierre-diario?mes=${mesParam}` : "/finanzas/cierre-diario";

  if (!RE_FECHA.test(fecha)) {
    return (
      <div className="ms-page">
        <EncabezadoResumen titulo="Cierre diario" subtitulo="Fecha inválida" />
        <Vacio texto="Esa fecha no tiene un formato válido." />
      </div>
    );
  }

  const registro = await cierrePorFecha(new Date(`${fecha}T00:00:00.000Z`));

  if (!registro) {
    return (
      <div className="ms-page">
        <EncabezadoResumen
          titulo="Cierre diario"
          subtitulo={fecha}
          acciones={<Link href={volver} className="ms-btn-secondary text-sm">← Volver al calendario</Link>}
        />
        <Vacio texto="No hay un cierre guardado para este día." />
      </div>
    );
  }

  const c = JSON.parse(registro.detalle) as CierreSnapshotData;

  return (
    <div className="ms-page">
      <EncabezadoResumen
        titulo="Cierre diario"
        subtitulo={`${DIA_LABELS[registro.diaSemana] ?? registro.diaSemana} ${fecha} — foto guardada, no se recalcula`}
        acciones={<Link href={volver} className="ms-btn-secondary text-sm">← Volver al calendario</Link>}
      />
      <CierreSnapshot c={c} cobradoLabel={`Cobrado el ${fecha}`} pagadoLabel={`Pagado el ${fecha}`} />
    </div>
  );
}
