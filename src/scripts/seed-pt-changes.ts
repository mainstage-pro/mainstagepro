import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // IDs confirmed from Step 1 query:
  const OG_AREA_ID          = 'cmpvdtjsr0000v5ygn0clfk8k'; // Operaciones Generales
  const RITMO_OP_SUBAREA_ID = 'cmpvf7zl500bfcctvpg1lq9u2'; // Ritmo Operativo
  const DIR_AREA_ID         = 'cmpvdtjt70001v5yg1iocyhfr'; // Dirección
  const RITMO_DIR_SUBAREA_ID= 'cmpvf7zmz00brcctvgsb30aax'; // Subárea 1 · Ritmo de Dirección
  const DANIEL_SUBAREA_ID   = 'cmpvf7zs600cpcctva2g6jdc9'; // Subárea 5 · Asistente de Dirección
  const MKT_AREA_ID         = 'cmpni9liv002b7vq0elmhjmh5'; // Marketing
  const MATERIAL_SUBAREA_ID = 'cmpvf80ek00g7cctv4mcdtifm'; // Subárea 3 · Producción de Material y Archivo
  const PROD_AREA_ID        = 'cmpni9luh00637vq0d16tiirr'; // Producción
  const BODEGA_SUBAREA_ID   = 'cmpvf816100kdcctvr9cvo45y'; // Bodega · Control de Inventario
  const COORD_SUBAREA_ID    = 'cmpvf80wb00ixcctv6jw1esjx'; // Coordinación · Planeación Operativa

  // User IDs
  const MAURICIO_ID  = 'cmnrpg62h0000zmizxpydetsm';
  const EMILIANO_ID  = 'cmo7ikcc00000oqfsqwzys8g4';
  const SEBASTIAN_ID = 'cmo6mbjqy0001eruqem29tp7k';
  const CARLOS_ID    = 'cmnxjcynq0000aloaylskv8g6';
  const DANIEL_ID    = 'cmo6m98n80000eruqx1tk6er4';
  const ZAID_ID      = 'cmp3ew8mf0000v6xkmwrbuy5w';

  // ── PART 1: Update PTSubArea nombre for Daniel ────────────────────────────
  const danielSubarea = await prisma.pTSubArea.findUnique({
    where: { id: DANIEL_SUBAREA_ID },
  });
  if (danielSubarea && danielSubarea.nombre.includes('Asistente de Dirección')) {
    const updated = await prisma.pTSubArea.update({
      where: { id: DANIEL_SUBAREA_ID },
      data: { nombre: danielSubarea.nombre.replace('Asistente de Dirección', 'Asistente General') },
    });
    console.log('✅ Updated Daniel subarea nombre:', updated.nombre);
  } else {
    console.log('ℹ️ Daniel subarea:', danielSubarea?.nombre);
  }

  // Update puestoDefault for existing Daniel templates
  const updatedTemplates = await prisma.pTTareaTemplate.updateMany({
    where: {
      responsableId: DANIEL_ID,
      puestoDefault: { contains: 'Asistente de Direcci' },
    },
    data: { puestoDefault: 'Asistente General' },
  });
  console.log('✅ Updated Daniel template puestoDefault count:', updatedTemplates.count);

  // ── PART 2: Delete "Junta de área semanal" and add 4 specific juntas ─────
  const juntaToDelete = await prisma.pTTareaTemplate.findFirst({
    where: { nombre: { contains: 'Junta de área semanal', mode: 'insensitive' } },
  });
  if (juntaToDelete) {
    await prisma.pTTareaTemplate.delete({ where: { id: juntaToDelete.id } });
    console.log('✅ Deleted:', juntaToDelete.nombre);
  } else {
    console.log('⚠️ Junta de área semanal not found — checking similar...');
    const juntas = await prisma.pTTareaTemplate.findMany({
      where: { nombre: { contains: 'Junta', mode: 'insensitive' }, areaId: OG_AREA_ID },
    });
    console.log('Juntas in Operaciones Generales:', juntas.map(j => `${j.id}: ${j.nombre}`));
  }

  const JUNTA_DESC = 'Formato fijo de 45 minutos: 0-10 min Resultados (qué logré vs lo que me comprometí), 10-20 min Compromisos (mis 3 prioridades de la semana, las defino yo), 20-35 min Bloqueo (un solo problema que necesita decisión o apoyo de Mauricio), 35-42 min Decisión (Mauricio decide o da dirección), 42-45 min Acuerdo (se registra en plataforma: compromisos, decisión tomada y siguiente punto de revisión).';

  const juntasData = [
    { nombre: 'Junta de área — Administración', responsableId: EMILIANO_ID,  descripcion: 'Junta semanal del área de Administración con Mauricio. ' + JUNTA_DESC },
    { nombre: 'Junta de área — Marketing',      responsableId: SEBASTIAN_ID, descripcion: 'Junta semanal del área de Marketing con Mauricio. ' + JUNTA_DESC },
    { nombre: 'Junta de área — Ventas',         responsableId: MAURICIO_ID,  descripcion: 'Junta semanal del área de Ventas con Mauricio. ' + JUNTA_DESC },
    { nombre: 'Junta de área — Producción',     responsableId: CARLOS_ID,    descripcion: 'Junta semanal del área de Producción con Mauricio. ' + JUNTA_DESC },
  ];

  for (const j of juntasData) {
    await prisma.pTTareaTemplate.create({
      data: {
        areaId: OG_AREA_ID,
        subAreaId: RITMO_OP_SUBAREA_ID,
        responsableId: j.responsableId,
        nombre: j.nombre,
        descripcion: j.descripcion,
        tipo: 'CHECK',
        impacto: 'critico',
        frecuencia: 'SEMANAL',
        diasSemana: [1],
        contexto: 'independiente',
        tipoAsignacion: 'individual',
        activa: true,
      },
    });
    console.log('✅ Created:', j.nombre);
  }

  // ── PART 3: Daniel's tasks in Dirección Subárea 5 ────────────────────────
  const danielTasks = [
    {
      nombre: 'Verificar insumos y materiales de oficina',
      descripcion: 'Revisar nivel de hojas, jaboneras, bolsas de basura, grapas y demás consumibles de oficina. Reportar faltantes y gestionar reposición.',
      impacto: 'estandar', frecuencia: 'SEMANAL', diasSemana: [] as number[],
    },
    {
      nombre: 'Supervisión de instalaciones de oficina',
      descripcion: 'Verificar funcionamiento correcto de lavabos, baños y cocina. Detectar fugas, daños o desperfectos y reportarlos para atención.',
      impacto: 'estandar', frecuencia: 'SEMANAL', diasSemana: [] as number[],
    },
    {
      nombre: 'Checklist de servicio a camioneta',
      descripcion: 'Verificar y documentar estado de la camioneta: afinación pendiente, presión de aire en llantas, aceite y demás puntos del checklist de mantenimiento preventivo.',
      impacto: 'alto', frecuencia: 'SEMANAL', diasSemana: [] as number[],
    },
    {
      nombre: 'Cotización de equipos por adquirir',
      descripcion: 'Cotizar equipos de producción o tecnología identificados como necesarios (SD cards, bocinas, etc.). Presentar opciones con precios y proveedores para aprobación.',
      impacto: 'estandar', frecuencia: 'POR_EVENTO', diasSemana: [] as number[],
    },
    {
      nombre: 'Confirmar servicio de limpieza — Edna',
      descripcion: 'Confirmar cada miércoles que el servicio de limpieza de Edna está programado y confirmar asistencia.',
      impacto: 'estandar', frecuencia: 'SEMANAL', diasSemana: [] as number[],
    },
  ];

  for (const t of danielTasks) {
    await prisma.pTTareaTemplate.create({
      data: {
        areaId: DIR_AREA_ID,
        subAreaId: DANIEL_SUBAREA_ID,
        responsableId: DANIEL_ID,
        nombre: t.nombre,
        descripcion: t.descripcion,
        tipo: 'CHECK',
        impacto: t.impacto,
        frecuencia: t.frecuencia,
        diasSemana: t.diasSemana,
        contexto: 'independiente',
        tipoAsignacion: 'individual',
        activa: true,
      },
    });
    console.log('✅ Created Daniel task:', t.nombre);
  }

  // ── PART 4: Zaid's tasks in Producción / Bodega ───────────────────────────
  const zaidTasks = [
    {
      nombre: 'Mapa de bodega — ubicación de equipos',
      descripcion: 'Diseñar y documentar el mapa físico de bodega indicando la ubicación exacta de cada categoría de equipo. Para implementar en plataforma como referencia visual del inventario.',
      impacto: 'alto', tipo: 'ENTREGABLE', frecuencia: 'POR_EVENTO', diasSemana: [] as number[],
    },
    {
      nombre: 'Inventario semanal de consumibles',
      descripcion: 'Conteo y registro semanal de breakouts, centros de carga, cables, extensiones y demás consumibles de bodega. Reportar faltantes a Rodrigo.',
      impacto: 'alto', tipo: 'ENTREGABLE', frecuencia: 'SEMANAL', diasSemana: [] as number[],
    },
    {
      nombre: 'Impresión de hojas de entrega y checklists',
      descripcion: 'Imprimir y preparar las hojas de entrega de equipo y checklists necesarios para los eventos de la semana.',
      impacto: 'estandar', tipo: 'CHECK', frecuencia: 'POR_EVENTO', diasSemana: [] as number[],
    },
    {
      nombre: 'Solicitar presupuesto para eventos del fin de semana',
      descripcion: 'Subir a la oficina con Mauricio para recibir el sobre de presupuesto para los gastos operativos del fin de semana. Responsable de solicitarlo puntualmente.',
      impacto: 'critico', tipo: 'CHECK', frecuencia: 'SEMANAL', diasSemana: [] as number[],
    },
    {
      nombre: 'Seguimiento de tickets y facturas de proveedores',
      descripcion: 'Recibir, revisar y reportar tickets y facturas que entreguen proveedores durante eventos o entregas. Archivar y trasladar a administración.',
      impacto: 'alto', tipo: 'ENTREGABLE', frecuencia: 'SEMANAL', diasSemana: [] as number[],
    },
    {
      nombre: 'Recolección y firma de cartas responsivas de freelancers',
      descripcion: 'Asegurar que cada técnico freelance que opere en un evento firme su carta responsiva antes de salir a campo. Entregar firmas recopiladas a Carlos Luna para archivo.',
      impacto: 'critico', tipo: 'ENTREGABLE', frecuencia: 'POR_EVENTO', diasSemana: [] as number[],
    },
  ];

  for (const t of zaidTasks) {
    await prisma.pTTareaTemplate.create({
      data: {
        areaId: PROD_AREA_ID,
        subAreaId: BODEGA_SUBAREA_ID,
        responsableId: ZAID_ID,
        nombre: t.nombre,
        descripcion: t.descripcion,
        tipo: t.tipo,
        impacto: t.impacto,
        frecuencia: t.frecuencia,
        diasSemana: t.diasSemana,
        contexto: 'independiente',
        tipoAsignacion: 'individual',
        activa: true,
      },
    });
    console.log('✅ Created Zaid task:', t.nombre);
  }

  // ── PART 5: Sebastian tasks in Marketing / Producción de Material ─────────
  const sebTasks = [
    {
      nombre: 'Subir y organizar contenido grabado con iPhone',
      descripcion: 'Subir a Drive el material fotográfico y de video captado con iPhone durante eventos, oficina o campo. Organizar en la carpeta correspondiente del evento o fecha.',
      impacto: 'alto', tipo: 'CHECK', frecuencia: 'POR_EVENTO',
    },
    {
      nombre: 'Entrega de material de contenido para revisión',
      descripcion: 'Entrega semanal del material de contenido producido para revisión de Mauricio, incluyendo: material de contenido informativo, material de contenido de entretenimiento y brief técnico de eventos próximos.',
      impacto: 'alto', tipo: 'ENTREGABLE', frecuencia: 'SEMANAL',
    },
  ];
  for (const t of sebTasks) {
    await prisma.pTTareaTemplate.create({
      data: {
        areaId: MKT_AREA_ID,
        subAreaId: MATERIAL_SUBAREA_ID,
        responsableId: SEBASTIAN_ID,
        nombre: t.nombre,
        descripcion: t.descripcion,
        tipo: t.tipo,
        impacto: t.impacto,
        frecuencia: t.frecuencia,
        diasSemana: [],
        contexto: 'independiente',
        tipoAsignacion: 'individual',
        activa: true,
      },
    });
    console.log('✅ Created Sebastian task:', t.nombre);
  }

  // ── PART 6: Carlos task in Producción / Coordinación ─────────────────────
  await prisma.pTTareaTemplate.create({
    data: {
      areaId: PROD_AREA_ID,
      subAreaId: COORD_SUBAREA_ID,
      responsableId: CARLOS_ID,
      nombre: 'Reporte semanal de eventos confirmados',
      descripcion: 'Enviar cada viernes al equipo el reporte de eventos confirmados para la semana siguiente, incluyendo: equipos asignados, tipo de montaje, horarios, lugar y nombre del cliente.',
      tipo: 'ENTREGABLE',
      impacto: 'critico',
      frecuencia: 'SEMANAL',
      diasSemana: [5],
      contexto: 'independiente',
      tipoAsignacion: 'individual',
      activa: true,
    },
  });
  console.log('✅ Created Carlos task: Reporte semanal de eventos confirmados');

  // ── PART 7: Mauricio task in Dirección / Ritmo de Dirección ──────────────
  await prisma.pTTareaTemplate.create({
    data: {
      areaId: DIR_AREA_ID,
      subAreaId: RITMO_DIR_SUBAREA_ID,
      responsableId: MAURICIO_ID,
      nombre: 'Envío de reporte semanal general al equipo',
      descripcion: 'Enviar cada viernes a todo el equipo un reporte general con los resultados de la semana, prioridades de la siguiente semana y cualquier comunicado relevante de dirección.',
      tipo: 'ENTREGABLE',
      impacto: 'alto',
      frecuencia: 'SEMANAL',
      diasSemana: [5],
      contexto: 'independiente',
      tipoAsignacion: 'individual',
      activa: true,
    },
  });
  console.log('✅ Created Mauricio task: Envío de reporte semanal general al equipo');

  console.log('\n✅ All DB operations completed!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
