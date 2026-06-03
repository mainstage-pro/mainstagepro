// Tipos de seguimiento por etapa y textos guía
export type SeguimientoTipoItem = {
  key: string;
  label: string;
  getGuia: (nombre?: string, tipoEvento?: string) => string;
};

export const SEGUIMIENTO_TIPOS: Record<string, SeguimientoTipoItem[]> = {
  LEAD: [
    {
      key: 'primer_contacto',
      label: 'Primer contacto',
      getGuia: (nombre = '[nombre]', tipoEvento = '') => {
        const n = nombre.split(' ')[0];
        if (tipoEvento === 'MUSICAL')
          return `Hola ${n}, te escribo de Mainstage Pro. Vimos que te interesó nuestra producción técnica para eventos musicales. ¿Me puedes contar un poco más sobre tu evento, fecha, lugar y qué tipo de show es? Con eso te damos una propuesta muy puntual.`;
        if (tipoEvento === 'SOCIAL')
          return `Hola ${n}, te contacto de Mainstage Pro, nos especializamos en producción técnica para bodas y eventos sociales. ¿Ya tienes fecha definida? Con gusto te orientamos sobre lo que necesitas para que todo suene y se vea perfecto.`;
        if (tipoEvento === 'EMPRESARIAL')
          return `Hola ${n}, te escribo de Mainstage Pro. Nos especializamos en producción técnica para eventos corporativos: audio, iluminación, video y escenario. ¿Me compartes de qué tipo de evento se trata y cuándo lo tienen planeado?`;
        return `Hola ${n}, te escribo de Mainstage Pro. Nos especializamos en producción técnica para todo tipo de eventos. ¿Me cuentas un poco sobre tu evento?`;
      },
    },
    {
      key: 'segundo_intento',
      label: 'Segundo intento',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, quería asegurarme de que recibiste mi mensaje. Si tienes preguntas sobre producción técnica para tu evento, con gusto te oriento, sin compromiso.`,
    },
    {
      key: 'ultimo_intento',
      label: 'Último intento',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, te escribo por última vez de Mainstage Pro. Si en algún momento retomas la planeación de tu evento, aquí estaremos.`,
    },
    {
      key: 'archivar_sin_respuesta',
      label: 'Archivar sin respuesta',
      getGuia: () =>
        'El lead no ha respondido. Considera mover el trato a Venta Perdida y registrar el motivo.',
    },
  ],
  DESCUBRIMIENTO: [
    {
      key: 'llamada_descubrimiento',
      label: 'Contacto de descubrimiento',
      getGuia: () =>
        'Preguntas clave para la llamada:\n\n- ¿Cuál es la fecha exacta del evento?\n- ¿Cuál es el lugar o salón?\n- ¿Cuántos invitados esperan y cuál es la capacidad del venue?\n- ¿Cuál es la duración aproximada, incluyendo montaje y desmontaje?\n- ¿Qué servicios técnicos necesitan: audio, iluminación, video, escenario?',
    },
    {
      key: 'envio_brief',
      label: 'Envío de formulario de brief',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, para poder prepararte una propuesta bien armada necesito algunos detalles de tu evento. Te comparto este formulario rápido para que lo llenes cuando puedas: [link]`,
    },
    {
      key: 'seguimiento_post_brief',
      label: 'Seguimiento post-brief',
      getGuia: () =>
        'Revisar lo que llenó el cliente en el formulario. Confirmar dudas antes de cotizar. Si falta información, pedirla antes de avanzar.',
    },
    {
      key: 'aclaracion_tecnica',
      label: 'Aclaración técnica',
      getGuia: () =>
        'Resolver dudas técnicas específicas del cliente sobre los servicios o el equipo necesario para el evento.',
    },
    {
      key: 'reactivacion',
      label: 'Reactivación',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, quería retomar nuestra conversación sobre tu evento. Quedamos en [lo que quedaron] y quiero asegurarme de poder darte una propuesta a tiempo.`,
    },
  ],
  OPORTUNIDAD: [
    {
      key: 'envio_cotizacion',
      label: 'Envío de cotización',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, aquí te comparto la propuesta técnica para tu evento: [link cotización]. Cualquier duda o ajuste, con gusto lo revisamos.`,
    },
    {
      key: 'seguimiento_post_cotizacion',
      label: 'Seguimiento post-cotización',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, quería saber si tuviste oportunidad de revisar la propuesta que te mandé. Estoy disponible para resolver cualquier duda o hacer algún ajuste.`,
    },
    {
      key: 'negociacion',
      label: 'Negociación',
      getGuia: () =>
        'El cliente tiene dudas sobre precio o servicios. Objetivo: encontrar un acuerdo sin sacrificar rentabilidad mínima. Registrar en nota qué se ofreció y qué se aceptó.',
    },
    {
      key: 'confirmacion_anticipo',
      label: 'Confirmación y anticipo',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, para confirmar tu evento y apartar la fecha necesitamos el anticipo del 50%. Te comparto los datos: [datos de pago]. Con eso quedamos listos.`,
    },
    {
      key: 'reactivacion',
      label: 'Reactivación',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, quería retomar el tema de la producción de tu evento. La fecha se acerca y quiero asegurarme de que tenemos todo listo para ti.`,
    },
  ],
  VENTA_CERRADA: [
    {
      key: 'llamada_post_evento',
      label: 'Llamada post-evento',
      getGuia: () =>
        'Verificar que el cliente quedó satisfecho con el servicio. Identificar oportunidades de mejora y próximos eventos.',
    },
    {
      key: 'solicitar_resena',
      label: 'Solicitar reseña',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, fue un placer trabajar en tu evento. Si tienes un momento, nos ayudaría mucho una reseña o comentario sobre el servicio.`,
    },
    {
      key: 'seguimiento_pago',
      label: 'Seguimiento de pago',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, quería recordarte el saldo pendiente del evento. Cuando puedas, te comparto los datos de pago.`,
    },
    {
      key: 'nota_interna',
      label: 'Nota interna',
      getGuia: () =>
        'Registrar información relevante sobre el evento o el cliente para referencia futura.',
    },
  ],
  VENTA_PERDIDA: [
    {
      key: 'reactivacion',
      label: 'Reactivación',
      getGuia: (nombre = '[nombre]') =>
        `Hola ${nombre.split(' ')[0]}, hace tiempo hablamos sobre tu evento. Si en algún momento retomas la planeación, aquí estaremos con gusto.`,
    },
    {
      key: 'nota_cierre',
      label: 'Nota de cierre',
      getGuia: () =>
        'Registrar el motivo de la pérdida y cualquier información relevante para referencia futura.',
    },
  ],
};

// Label lookup for displaying saved seguimientos (titulo field contains the key)
export const SEGUIMIENTO_TIPO_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(SEGUIMIENTO_TIPOS)
    .flat()
    .map(t => [t.key, t.label])
);

// WA first contact message by tipoEvento
export function getWaMensajePrimerContacto(nombre: string, tipoEvento: string): string {
  const tipos = SEGUIMIENTO_TIPOS['LEAD'];
  const item = tipos.find(t => t.key === 'primer_contacto');
  return item ? item.getGuia(nombre, tipoEvento) : '';
}
