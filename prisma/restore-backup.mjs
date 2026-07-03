import { PrismaClient } from '@prisma/client';
import https from 'https';
import { config } from 'dotenv';
config(); // carga .env automáticamente

// ⚠️ CREDENCIALES — usar variables de entorno, NUNCA hardcodear aquí
const DB_URL     = process.env.DIRECT_URL || process.env.DATABASE_URL;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const BACKUP_URL = process.env.RESTORE_BACKUP_URL; // ej: https://.../.../backup.json

if (!DB_URL)     { console.error('❌ Falta DIRECT_URL o DATABASE_URL en .env'); process.exit(1); }
if (!BACKUP_URL) { console.error('❌ Falta RESTORE_BACKUP_URL en .env'); process.exit(1); }

const p = new PrismaClient({ datasources: { db: { url: DB_URL } } });

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

async function restoreMany(model, items, label) {
  if (!items?.length) { console.log(`⏭  ${label}: vacío`); return; }
  let ok = 0, skip = 0;
  for (const item of items) {
    try {
      await model.upsert({ where: { id: item.id }, update: item, create: item });
      ok++;
    } catch(e) {
      skip++;
    }
  }
  console.log(`✅ ${label}: ${ok} restaurados, ${skip} omitidos`);
}

async function main() {
  console.log('📦 Descargando backup desde:', BACKUP_URL);
  const backup = await fetchJson(BACKUP_URL);
  console.log('📊 Backup del:', backup.meta?.generadoEn);

  // Orden respetando foreign keys
  await restoreMany(p.cliente,               backup.clientes,           'Clientes');
  await restoreMany(p.tecnico,               backup.tecnicos,            'Técnicos');
  await restoreMany(p.equipo,                backup.equipos,             'Equipos');
  await restoreMany(p.categoriaFinanciera,   backup.categorias,          'Categorías financieras');
  await restoreMany(p.movimientoFinanciero,  backup.movimientos,         'Movimientos financieros');
  await restoreMany(p.trato,                 backup.tratos,              'Tratos');
  await restoreMany(p.cotizacion,            backup.cotizaciones?.map(c => { const {lineas,...r}=c; return r; }), 'Cotizaciones');
  for (const cot of backup.cotizaciones || []) {
    if (cot.lineas?.length) await restoreMany(p.lineaCotizacion, cot.lineas, `  Líneas cotización ${cot.id.slice(-6)}`);
  }
  await restoreMany(p.cuentaCobrar,          backup.cuentasCobrar,       'Cuentas por cobrar');
  await restoreMany(p.cuentaPagar,           backup.cuentasPagar,        'Cuentas por pagar');
  await restoreMany(p.proyecto,              backup.proyectos?.map(p => { const {personal,checklist,...r}=p; return r; }), 'Proyectos');
  for (const proy of backup.proyectos || []) {
    if (proy.personal?.length)   await restoreMany(p.proyectoPersonal,  proy.personal,   `  Personal proy ${proy.id.slice(-6)}`);
    if (proy.checklist?.length)  await restoreMany(p.proyectoChecklist, proy.checklist,  `  Checklist proy ${proy.id.slice(-6)}`);
  }
  await restoreMany(p.presentacionVenta,     backup.presentacionesVenta?.map(v => { const {imagenes,...r}=v; return r; }), 'Presentaciones');

  console.log('\n🎉 Restauración completa.');
  await p.$disconnect();
}

main().catch(async e => {
  console.error('❌ Error:', e.message);
  await p.$disconnect();
  process.exit(1);
});
