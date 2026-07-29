// Cálculo de vacaciones conforme a la LFT (reforma "Vacaciones Dignas", vigente 2023):
// Año 1 = 12 días. +2 días por cada año subsiguiente hasta el año 5 (20 días).
// A partir del año 6, +2 días por cada 5 años de servicio.
export function diasDerechoLFT(anios: number): number {
  if (anios < 1) return 0;
  if (anios <= 5) return 12 + (anios - 1) * 2; // 12,14,16,18,20
  // 6+: 20 base al cerrar el 5º, y +2 por cada bloque de 5 años completos adicionales
  const bloques = Math.floor((anios - 1) / 5); // años 6-10 => 1, 11-15 => 2, ...
  return 20 + bloques * 2;
}

// Años completos de antigüedad a la fecha de referencia.
export function antiguedadAnios(fechaIngreso: Date | string | null, ref = new Date()): number {
  if (!fechaIngreso) return 0;
  const ini = new Date(fechaIngreso);
  let anios = ref.getFullYear() - ini.getFullYear();
  const m = ref.getMonth() - ini.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < ini.getDate())) anios--;
  return Math.max(0, anios);
}

export interface SaldoVacaciones {
  antiguedad: number;      // años completos
  derecho: number;         // días que le corresponden en el período de aniversario vigente
  tomados: number;         // días aprobados dentro del período vigente
  saldo: number;           // derecho - tomados
  inicioPeriodo: string;   // ISO date del aniversario vigente
  finPeriodo: string;      // ISO date fin del período (aniversario siguiente - 1 día)
}

interface SolLite { fechaInicio: Date | string; dias: number; estado: string }

// Saldo del período de aniversario vigente (desde el último aniversario hasta el siguiente).
export function calcularSaldo(
  fechaIngreso: Date | string | null,
  solicitudes: SolLite[],
  ref = new Date(),
): SaldoVacaciones {
  const anios = antiguedadAnios(fechaIngreso, ref);
  const derecho = diasDerechoLFT(anios + 1); // el derecho del período que ESTÁ corriendo

  let inicioPeriodo = ref, finPeriodo = ref;
  if (fechaIngreso) {
    const ini = new Date(fechaIngreso);
    inicioPeriodo = new Date(ini);
    inicioPeriodo.setFullYear(ini.getFullYear() + anios);
    finPeriodo = new Date(inicioPeriodo);
    finPeriodo.setFullYear(inicioPeriodo.getFullYear() + 1);
    finPeriodo.setDate(finPeriodo.getDate() - 1);
  }

  const tomados = solicitudes
    .filter(s => s.estado === "APROBADA" && new Date(s.fechaInicio) >= inicioPeriodo)
    .reduce((sum, s) => sum + (s.dias || 0), 0);

  return {
    antiguedad: anios,
    derecho,
    tomados,
    saldo: Math.max(0, derecho - tomados),
    inicioPeriodo: inicioPeriodo.toISOString().slice(0, 10),
    finPeriodo: finPeriodo.toISOString().slice(0, 10),
  };
}

// Cuenta días hábiles (lun-vie) entre dos fechas inclusive.
export function diasHabiles(inicio: Date | string, fin: Date | string): number {
  const a = new Date(inicio); a.setHours(0, 0, 0, 0);
  const b = new Date(fin); b.setHours(0, 0, 0, 0);
  if (b < a) return 0;
  let dias = 0;
  const d = new Date(a);
  while (d <= b) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) dias++;
    d.setDate(d.getDate() + 1);
  }
  return dias;
}
