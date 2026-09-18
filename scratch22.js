const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const ids = [
    'cmohohs34000ifyfkuoswlvqa',
    'cmoizhc5j000kqkk5y9xw2e2p',
    'cmoly120s000jtp1176f8yrjb',
    'cmp3aydas000qqfejm4s8gsx2',
    'cmpogalk6000jhy9zvx2zjx0j',
    'cmqsoqxkd000msbmckkmxhya5'
  ];
  const cxc = await prisma.cuentaCobrar.findMany({
      where: { id: { in: ids } },
      include: { cotizacion: { include: { lineas: true } } }
  });
  
  for (const c of cxc) {
      if (c.cotizacion) {
          const sumLineas = c.cotizacion.lineas.reduce((acc, l) => acc + l.subtotal, 0);
          console.log(`Cotizacion ${c.cotizacion.id}: Gran Total = ${c.cotizacion.granTotal}, Suma Lineas = ${sumLineas}, Descuento = ${c.cotizacion.montoDescuento}, Diff = ${c.cotizacion.granTotal - sumLineas}`);
      }
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
