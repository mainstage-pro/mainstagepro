import { prisma } from "@/lib/prisma";
import { format, isBefore, addMonths, startOfMonth, startOfDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { calcularSiguienteFecha, RecurrenciaConfig } from "@/lib/recurrencia-finanzas";

export async function generarPeriodosGastosRecurrentes() {
  const hoy = startOfDay(new Date());

  // 1. Obtener todos los gastos recurrentes activos o pausados que necesiten evaluación
  // Solo procesamos los que no hayan llegado a su fecha final
  const gastos = await prisma.gastoRecurrente.findMany({
    where: {
      estado: "ACTIVO",
      OR: [
        { fechaFin: null },
        { fechaFin: { gte: hoy } }
      ]
    },
    include: {
      periodos: {
        orderBy: { fechaInicio: 'desc' },
        take: 1
      }
    }
  });

  const resultados = { creados: 0, ignorados: 0, errores: 0 };

  for (const gasto of gastos) {
    try {
      // Determinar la fecha base para el siguiente periodo
      let fechaBase = gasto.fechaInicio;
      if (gasto.periodos.length > 0) {
        // Ya tiene periodos, el siguiente es a partir del último periodo generado
        const ultimoPeriodo = gasto.periodos[0];
        fechaBase = calcularSiguienteFecha(ultimoPeriodo.fechaInicio, {
          frecuencia: gasto.frecuencia as any,
          fechaInicio: gasto.fechaInicio,
          intervalo: 1
        });
      }

      // Si la fecha base es en el futuro muy lejano, no generamos aún.
      // Permitimos generar con 1 mes de anticipación.
      const limiteGeneracion = addDays(hoy, 30);
      
      while (isBefore(fechaBase, limiteGeneracion)) {
        if (gasto.fechaFin && isBefore(gasto.fechaFin, fechaBase)) {
          break; // Llegamos al final del gasto
        }

        // Calcular vencimiento
        let vencimiento = fechaBase;
        if (gasto.diaVencimiento) {
            const year = fechaBase.getFullYear();
            const month = fechaBase.getMonth();
            const diasEnMes = new Date(year, month + 1, 0).getDate();
            const diaAjustado = Math.min(gasto.diaVencimiento, diasEnMes);
            vencimiento = new Date(year, month, diaAjustado);
        }

        const nombrePeriodo = format(fechaBase, "MMM-yyyy", { locale: es }).toUpperCase();

        // Verificar si ya existe este periodo (idempotencia)
        const existe = await prisma.periodoGastoRecurrente.findUnique({
          where: {
            gastoRecurrenteId_periodo: {
              gastoRecurrenteId: gasto.id,
              periodo: nombrePeriodo
            }
          }
        });

        if (existe) {
          resultados.ignorados++;
        } else {
          // Crear el periodo y la cuenta por pagar
          await prisma.$transaction(async (tx) => {
            const estadoPeriodo = gasto.tipoMonto === "FIJO" ? "PENDIENTE_PAGO" : "PENDIENTE_IMPORTE";

            const periodo = await tx.periodoGastoRecurrente.create({
              data: {
                gastoRecurrenteId: gasto.id,
                periodo: nombrePeriodo,
                fechaInicio: fechaBase,
                fechaVencimiento: vencimiento,
                montoEstimado: gasto.tipoMonto === "VARIABLE" ? gasto.montoBase : null,
                montoConfirmado: gasto.tipoMonto === "FIJO" ? gasto.montoBase : null,
                estado: estadoPeriodo
              }
            });

            if (gasto.tipoMonto === "FIJO" && gasto.montoBase) {
              await tx.cuentaPagar.create({
                data: {
                  concepto: `${gasto.nombre} - ${nombrePeriodo}`,
                  monto: gasto.montoBase,
                  fechaCompromiso: vencimiento,
                  tipoAcreedor: gasto.proveedorId ? "PROVEEDOR" : gasto.empresaId ? "EMPRESA" : "OTRO",
                  proveedorId: gasto.proveedorId,
                  empresaId: gasto.empresaId,
                  categoriaId: gasto.categoriaId,
                  proyectoId: gasto.proyectoId,
                  gastoRecurrenteId: gasto.id,
                  periodoGastoId: periodo.id,
                  estado: "PENDIENTE"
                }
              });
            }
          });
          resultados.creados++;
        }

        // Avanzar a la siguiente fecha
        fechaBase = calcularSiguienteFecha(fechaBase, {
          frecuencia: gasto.frecuencia as any,
          fechaInicio: gasto.fechaInicio,
          intervalo: 1
        });
      }
    } catch (error) {
      console.error(`Error generando periodo para gasto ${gasto.id}:`, error);
      resultados.errores++;
    }
  }
  
  return resultados;
}
