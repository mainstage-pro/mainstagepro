import { PrismaClient } from '@prisma/client';
import https from 'https';

const DB_URL = "postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const BLOB_TOKEN = "vercel_blob_rw_h3qMXgZ93fcFNngh_ioJunblc6q8eKI0HabA104BajeuMO8";
const BACKUP_URL = "https://h3qmxgz93fcfnngh.public.blob.vercel-storage.com/backups/mainstage-pro-2026-06-30.json";

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
  console.log('📦 Descargando backup...');
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
