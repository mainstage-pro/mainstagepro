const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cxc = await prisma.cuentaCobrar.findMany({
      where: {
          id: {
              in: [
                  'cmoly120s000jtp1176f8yrjb',
                  'cmp3aydas000qqfejm4s8gsx2',
                  'cmohohs34000ifyfkuoswlvqa',
                  'cmoizhc5j000kqkk5y9xw2e2p',
                  'cmrp2vpmk000wplegyg9h6m4d',
                  'cmpogalk6000jhy9zvx2zjx0j',
                  'cmqsoqxkd000msbmckkmxhya5',
                  'cmt0comud000jlbmftknabjyz'
              ]
          }
      },
      include: {
          cotizacion: {
              include: {
                  lineas: true
              }
          }
      }
  });
  
  for (const c of cxc) {
      console.log(`CxC ID: ${c.id} - Monto: ${c.monto}`);
      if (c.cotizacion) {
          console.log(`  Cotizacion ID: ${c.cotizacion.id}, Gran Total: ${c.cotizacion.granTotal}`);
          for (const l of c.cotizacion.lineas) {
              console.log(`    Linea: ${l.descripcion}, Cantidad: ${l.cantidad}, Precio Unitario: ${l.precioUnitario}, Subtotal: ${l.subtotal}`);
          }
      }
  }
}
main().then(() => prisma.$disconnect()).catch(console.error);
