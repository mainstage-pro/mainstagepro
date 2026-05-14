// Seed plan de trabajo SO v2.0 — usa neon HTTP driver (TCP bloqueado localmente)
import { neon } from "@neondatabase/serverless";

const DIRECT_URL = "postgresql://neondb_owner:npg_0qjmIyDp6kHc@ep-noisy-firefly-an5vzlqv.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DIRECT_URL);

// IDs reales de la DB (verificados)
const MAURICIO_ID   = "cmnrpg62h0000zmizxpydetsm";
const EMILIANO_ID   = "cmo7ikcc00000oqfsqwzys8g4";
const SEBASTIAN_ID  = "cmo6mbjqy0001eruqem29tp7k";
const CARLOS_ID     = "cmnxjcynq0000aloaylskv8g6";

async function main() {
  // Borrar actividades existentes
  const deleted = await sql`DELETE FROM "plan_trabajo_actividades" RETURNING id`;
  console.log(`Eliminadas ${deleted.length} actividades existentes\n`);

  const actividades = [
    // ADMINISTRACIÓN (9) — Emiliano Pérez
    { area:"ADMINISTRACION", rid: EMILIANO_ID,  titulo:"Registrar movimientos financieros por proyecto",  frecuencia:"POR_EVENTO",  dias:null,                       hora:null,    entregable:"Registro en plataforma",            orden:1  },
    { area:"ADMINISTRACION", rid: EMILIANO_ID,  titulo:"Registrar movimientos generales de la empresa",   frecuencia:"DIARIO",      dias:null,                       hora:null,    entregable:"Plataforma actualizada",            orden:2  },
    { area:"ADMINISTRACION", rid: EMILIANO_ID,  titulo:"Gestión y seguimiento de cuentas por cobrar",     frecuencia:"LUNES_JUEVES",dias:null,                       hora:null,    entregable:"Lista actualizada",                 orden:3  },
    { area:"ADMINISTRACION", rid: EMILIANO_ID,  titulo:"Llenar reporte semanal de área",                  frecuencia:"SEMANAL",     dias:["lunes"],                  hora:"09:00", entregable:"Reporte antes de las 10:30am",      orden:4  },
    { area:"ADMINISTRACION", rid: EMILIANO_ID,  titulo:"Actualizar flujo de caja proyectado",             frecuencia:"SEMANAL",     dias:null,                       hora:null,    entregable:"Proyección actualizada",            orden:5  },
    { area:"ADMINISTRACION", rid: EMILIANO_ID,  titulo:"Pago de sueldos semanales al equipo",             frecuencia:"SEMANAL",     dias:null,                       hora:null,    entregable:"Transferencias realizadas",         orden:6  },
    { area:"ADMINISTRACION", rid: EMILIANO_ID,  titulo:"Cierre financiero de cada evento ejecutado",      frecuencia:"POR_EVENTO",  dias:null,                       hora:null,    entregable:"Rentabilidad registrada",           orden:7  },
    { area:"ADMINISTRACION", rid: EMILIANO_ID,  titulo:"Consolidar KPIs de todas las áreas",              frecuencia:"SEMANAL",     dias:null,                       hora:null,    entregable:"Dashboard completo",                orden:8  },
    { area:"ADMINISTRACION", rid: EMILIANO_ID,  titulo:"Entregar semáforo de salud del negocio",          frecuencia:"MENSUAL",     dias:null,                       hora:null,    entregable:"Semáforo actualizado",              orden:9  },

    // MARKETING (7) — Sebastián Pérez
    { area:"MARKETING", rid: SEBASTIAN_ID, titulo:"Planear y entregar parrilla de contenido",              frecuencia:"SEMANAL",     dias:["lunes"],                  hora:null,    entregable:"Parrilla aprobada",                 orden:1  },
    { area:"MARKETING", rid: SEBASTIAN_ID, titulo:"Publicar contenido orgánico 3x semana",                 frecuencia:"SEMANAL",     dias:null,                       hora:null,    entregable:"3 posts publicados",                orden:2  },
    { area:"MARKETING", rid: SEBASTIAN_ID, titulo:"Publicar reel semanal",                                 frecuencia:"SEMANAL",     dias:null,                       hora:null,    entregable:"Reel publicado",                    orden:3  },
    { area:"MARKETING", rid: SEBASTIAN_ID, titulo:"Gestionar y optimizar campañas Meta Ads",               frecuencia:"SEMANAL",     dias:null,                       hora:null,    entregable:"Reporte de campaña",                orden:4  },
    { area:"MARKETING", rid: SEBASTIAN_ID, titulo:"Registrar leads entrantes en plataforma",               frecuencia:"POR_EVENTO",  dias:null,                       hora:null,    entregable:"Lead registrado máx 2hrs",          orden:5  },
    { area:"MARKETING", rid: SEBASTIAN_ID, titulo:"Documentar eventos con foto y video",                   frecuencia:"POR_EVENTO",  dias:null,                       hora:null,    entregable:"Material editado ≤48hrs",           orden:6  },
    { area:"MARKETING", rid: SEBASTIAN_ID, titulo:"Llenar reporte semanal de área",                        frecuencia:"SEMANAL",     dias:["lunes"],                  hora:"09:00", entregable:"Reporte antes de las 10:30am",      orden:7  },

    // VENTAS (4) — Mauricio Hernández
    { area:"VENTAS", rid: MAURICIO_ID, titulo:"Revisar pipeline activo y priorizar oportunidades",          frecuencia:"LUNES_JUEVES",dias:null,                       hora:null,    entregable:"Pipeline priorizado",               orden:1  },
    { area:"VENTAS", rid: MAURICIO_ID, titulo:"Dar seguimiento a oportunidades sin respuesta +3 días",      frecuencia:"SEMANAL",     dias:null,                       hora:null,    entregable:"Contacto realizado",                orden:2  },
    { area:"VENTAS", rid: MAURICIO_ID, titulo:"Preparar y enviar cotizaciones máx 24hrs",                   frecuencia:"POR_EVENTO",  dias:null,                       hora:null,    entregable:"Cotización enviada",                orden:3  },
    { area:"VENTAS", rid: MAURICIO_ID, titulo:"Prospectar y contactar outbound",                            frecuencia:"SEMANAL",     dias:null,                       hora:null,    entregable:"Prospectos registrados",            orden:4  },

    // PRODUCCIÓN (5) — Carlos Luna
    { area:"PRODUCCION", rid: CARLOS_ID, titulo:"Checklist semanal de equipos en bodega",                  frecuencia:"SEMANAL",     dias:["lunes"],                  hora:null,    entregable:"Checklist completado",              orden:1  },
    { area:"PRODUCCION", rid: CARLOS_ID, titulo:"Plan de producción completo por evento",                   frecuencia:"POR_EVENTO",  dias:null,                       hora:null,    entregable:"Plan con 72hrs de anticipación",    orden:2  },
    { area:"PRODUCCION", rid: CARLOS_ID, titulo:"Revisar funcionamiento de equipos en bodega",              frecuencia:"SEMANAL",     dias:null,                       hora:null,    entregable:"Estado registrado",                 orden:3  },
    { area:"PRODUCCION", rid: CARLOS_ID, titulo:"Supervisar regreso y conteo de equipo post-evento",        frecuencia:"POR_EVENTO",  dias:null,                       hora:null,    entregable:"Lista verificada",                  orden:4  },
    { area:"PRODUCCION", rid: CARLOS_ID, titulo:"Reporte de coordinación post-evento",                      frecuencia:"POR_EVENTO",  dias:null,                       hora:null,    entregable:"Reporte de Andrés ≤48hrs",          orden:5  },

    // DIRECCIÓN (4) — Mauricio Hernández
    { area:"DIRECCION", rid: MAURICIO_ID, titulo:"Leer reportes y preparar agenda de juntas",               frecuencia:"SEMANAL",     dias:["lunes"],                  hora:"09:00", entregable:"Agenda lista a las 10:30",          orden:1  },
    { area:"DIRECCION", rid: MAURICIO_ID, titulo:"Sesión de Deep Work",                                     frecuencia:"SEMANAL",     dias:["martes","jueves"],        hora:"09:00", entregable:"Avance documentado",                orden:2  },
    { area:"DIRECCION", rid: MAURICIO_ID, titulo:"Cierre de semana — revisión de KPIs",                     frecuencia:"SEMANAL",     dias:["viernes"],                hora:"09:00", entregable:"Semáforo actualizado",              orden:3  },
    { area:"DIRECCION", rid: MAURICIO_ID, titulo:"Ejecutar sesión de capacitación",                         frecuencia:"SEMANAL",     dias:["miercoles"],              hora:"09:00", entregable:"Sesión impartida",                  orden:4  },
  ];

  let inserted = 0;
  for (const a of actividades) {
    const diasJson = a.dias ? JSON.stringify(a.dias) : null;
    await sql`
      INSERT INTO "plan_trabajo_actividades"
        (id, area, "responsableId", titulo, frecuencia, "diasSemana", "horaEspecifica",
         entregable, "origenSO", activa, "generarTareas", orden, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        ${a.area},
        ${a.rid},
        ${a.titulo},
        ${a.frecuencia},
        ${diasJson},
        ${a.hora},
        ${a.entregable},
        true,
        true,
        false,
        ${a.orden},
        NOW(),
        NOW()
      )
    `;
    inserted++;
    process.stdout.write(`  ✓ [${a.area}] ${a.titulo}\n`);
  }

  console.log(`\n✅ Insertadas ${inserted} actividades`);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
