import Link from "next/link";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export type CierreMes = { fecha: string; posicion: number };

/** Calendario mensual de cierres guardados. Un día con cierre es clickeable hacia su foto. */
export function Calendario({
  anio,
  mes, // 0-indexado
  cierres,
  hoyStr,
  base,
}: {
  anio: number;
  mes: number;
  cierres: CierreMes[];
  hoyStr: string;
  base: string;
}) {
  const primerDia = new Date(Date.UTC(anio, mes, 1)).getUTCDay();
  const offset = primerDia === 0 ? 6 : primerDia - 1;
  const diasEnMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const celdas = Math.ceil((offset + diasEnMes) / 7) * 7;
  const porDia = new Map(cierres.map(c => [c.fecha, c]));

  const mesPrev = mes === 0 ? 11 : mes - 1;
  const anioPrev = mes === 0 ? anio - 1 : anio;
  const mesSig = mes === 11 ? 0 : mes + 1;
  const anioSig = mes === 11 ? anio + 1 : anio;
  const param = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const tituloMes = new Date(Date.UTC(anio, mes, 1)).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="ms-card p-3 md:p-4">
      <div className="flex items-center justify-between mb-3">
        <Link href={`${base}?mes=${param(anioPrev, mesPrev)}`} className="ms-micro text-gray-400 hover:text-white px-2">
          ←
        </Link>
        <p className="text-sm font-semibold text-white capitalize">{tituloMes}</p>
        <Link href={`${base}?mes=${param(anioSig, mesSig)}`} className="ms-micro text-gray-400 hover:text-white px-2">
          →
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS.map(d => (
          <div key={d} className="text-center text-[10px] text-gray-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: celdas }).map((_, i) => {
          const dia = i - offset + 1;
          if (dia < 1 || dia > diasEnMes) return <div key={i} />;
          const fecha = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const c = porDia.get(fecha);
          const esHoy = fecha === hoyStr;
          const celda = (
            <div
              className={`aspect-square rounded-md flex items-center justify-center text-xs border transition-colors ${
                c
                  ? c.posicion >= 0
                    ? "bg-green-500/15 text-green-400 border-green-500/40 hover:bg-green-500/25 font-semibold cursor-pointer"
                    : "bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25 font-semibold cursor-pointer"
                  : "text-gray-600 border-[#1a1a1a]"
              } ${esHoy ? "ring-2 ring-[#B3985B]" : ""}`}
            >
              {dia}
            </div>
          );
          return <div key={i}>{c ? <Link href={`${base}/${fecha}`}>{celda}</Link> : celda}</div>;
        })}
      </div>
      <p className="ms-micro mt-3 text-gray-500">
        Verde = posición neta positiva ese día · Rojo = negativa · Días sin color no tienen cierre guardado.
      </p>
    </div>
  );
}
