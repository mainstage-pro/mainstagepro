import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const pasivos = await prisma.pasivoDeuda.findMany({
    include: { cuotas: { include: { cuentaPagar: true } } }
  });
  
  for (const pasivo of pasivos) {
    let nuevoPagado = 0;
    let modified = false;

    for (const cuota of pasivo.cuotas) {
      if (cuota.cuentaPagar) {
        const pagadoReal = cuota.cuentaPagar.montoPagado;
        const abonoCuota = Math.min(pagadoReal, cuota.monto); // En caso de que se haya pagado de más
        
        nuevoPagado += abonoCuota;
        
        const targetEstado = cuota.cuentaPagar.estado === 'LIQUIDADO' ? 'PAGADO' : 'PENDIENTE';
        
        if (cuota.estado !== targetEstado) {
          await prisma.cuotaDeuda.update({
            where: { id: cuota.id },
            data: { estado: targetEstado }
          });
          modified = true;
          console.log(`Cuota ${cuota.id} actualizada a ${targetEstado}`);
        }
      }
    }
    
    // Si el monto pagado difiere, lo actualizamos
    if (Math.abs(pasivo.montoPagado - nuevoPagado) > 0.01) {
      await prisma.pasivoDeuda.update({
        where: { id: pasivo.id },
        data: { montoPagado: nuevoPagado }
      });
      console.log(`Pasivo ${pasivo.id} (${pasivo.nombre}) actualizado montoPagado: ${pasivo.montoPagado} -> ${nuevoPagado}`);
    } else if (modified) {
      console.log(`Pasivo ${pasivo.id} verificado.`);
    }
  }
}

fix().catch(console.error).finally(() => prisma.$disconnect());
