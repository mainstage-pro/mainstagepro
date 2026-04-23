"use client";

import { useEffect, useState, use } from "react";

interface Proyecto {
  id: string;
  numeroProyecto: string;
  nombre: string;
  fechaEvento: string;
  lugarEvento: string | null;
  encargado: { name: string } | null;
  trato: { tipoServicio: string | null } | null;
}

const TIPO_SERVICIO_DESC: Record<string, string> = {
  RENTA: "renta e instalación de equipo de producción técnica",
  PRODUCCION_TECNICA: "producción técnica integral de audio, iluminación y video",
  DIRECCION_TECNICA: "dirección técnica del evento",
  MULTISERVICIO: "servicios integrales de producción técnica",
};

function fmtDateLong(s: string) {
  const [y, m, d] = s.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function extraerCiudad(lugar: string): string {
  if (!lugar) return "";
  const parts = lugar.split(",");
  if (parts.length > 1) return parts[parts.length - 1].trim();
  return "";
}

export default function CartaResponsivaPage({ params }: { params: Promise<{ proyectoId: string }> }) {
  const { proyectoId } = use(params);

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);

  // Campos manuales
  const [destinatario, setDestinatario]         = useState("");
  const [responsable, setResponsable]           = useState("");
  const [cargo, setCargo]                       = useState("Director de Producción");
  const [ciudad, setCiudad]                     = useState("");
  const [telefono, setTelefono]                 = useState("");
  const [correo, setCorreo]                     = useState("");
  const [descripcionEquipo, setDescripcionEquipo] = useState("");

  useEffect(() => {
    fetch(`/api/proyectos/${proyectoId}`)
      .then(r => r.json())
      .then(d => {
        const p = d.proyecto as Proyecto;
        setProyecto(p);
        if (p.encargado?.name) setResponsable(p.encargado.name);
        if (p.lugarEvento)    setCiudad(extraerCiudad(p.lugarEvento));
        setLoading(false);
      });
  }, [proyectoId]);

  function buildDownloadUrl() {
    if (!proyecto) return "#";
    const q = new URLSearchParams({
      destinatario,
      responsable,
      cargo,
      ciudad,
      telefono,
      correo,
      descripcionEquipo,
    });
    return `/api/proyectos/${proyectoId}/carta-responsiva?${q.toString()}`;
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#B3985B] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!proyecto) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-red-400">Proyecto no encontrado</p>
    </div>
  );

  const fechaEventoStr = fmtDateLong(proyecto.fechaEvento);
  const tipoServ = proyecto.trato?.tipoServicio ?? "PRODUCCION_TECNICA";
  const descripcionServicio = TIPO_SERVICIO_DESC[tipoServ] ?? "producción técnica integral";

  const hoy = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const fechaCarta = ciudad ? `${ciudad}, ${hoy}` : hoy;

  const inputCls = "w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/60 placeholder-white/20";
  const labelCls = "block text-xs text-white/30 mb-1";

  return (
    <div className="min-h-screen bg-[#0a0a0a]" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      {/* Barra superior */}
      <div className="sticky top-0 z-50 bg-[#0d0d0d] border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="text-white/30 hover:text-white text-sm transition-colors">
            ← Volver
          </button>
          <span className="text-white/10">|</span>
          <span className="text-white/40 text-sm">Carta Responsiva — {proyecto.nombre}</span>
        </div>
        <a
          href={buildDownloadUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
        >
          Descargar PDF
        </a>
      </div>

      <div className="max-w-6xl mx-auto py-8 px-4 flex gap-6">
        {/* Panel de datos */}
        <div className="w-80 shrink-0 space-y-4">
          <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4 space-y-4">
            <p className="text-xs text-white/30 uppercase tracking-wider">Datos del documento</p>

            <div>
              <label className={labelCls}>Destinatario (institución / dependencia)</label>
              <input
                className={inputCls}
                placeholder="Ej: H. Ayuntamiento de Guadalajara"
                value={destinatario}
                onChange={e => setDestinatario(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Ciudad (para el encabezado de fecha)</label>
              <input
                className={inputCls}
                placeholder="Ej: Guadalajara, Jalisco"
                value={ciudad}
                onChange={e => setCiudad(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Nombre del responsable / firmante</label>
              <input
                className={inputCls}
                placeholder="Nombre completo"
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Cargo</label>
              <input
                className={inputCls}
                placeholder="Ej: Director de Producción"
                value={cargo}
                onChange={e => setCargo(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Teléfono</label>
              <input
                className={inputCls}
                placeholder="33 1234 5678"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Correo electrónico</label>
              <input
                className={inputCls}
                placeholder="produccion@mainstage.mx"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Descripción del equipo a instalar</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Ej: sistema de audio line array, estructura de iluminación y pantallas LED de 6×3 m"
                value={descripcionEquipo}
                onChange={e => setDescripcionEquipo(e.target.value)}
              />
              <p className="text-[10px] text-white/20 mt-1">Deja en blanco para usar texto genérico</p>
            </div>
          </div>

          <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4 space-y-2">
            <p className="text-xs text-white/30 uppercase tracking-wider">Auto-completado</p>
            <div className="space-y-1 text-xs text-gray-400">
              <p><span className="text-white/20">Proyecto</span> · {proyecto.numeroProyecto}</p>
              <p><span className="text-white/20">Evento</span> · {proyecto.nombre}</p>
              <p><span className="text-white/20">Fecha evento</span> · {fechaEventoStr}</p>
              {proyecto.lugarEvento && <p><span className="text-white/20">Lugar</span> · {proyecto.lugarEvento}</p>}
              <p><span className="text-white/20">Servicio</span> · {descripcionServicio}</p>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl text-[#0a0a0a] font-sans">
            {/* Header negro */}
            <div className="bg-[#0a0a0a] px-10 py-6 flex items-end justify-between border-b-2 border-[#B3985B]">
              <div>
                <p className="text-[#B3985B] font-bold tracking-widest text-base">MAINSTAGE PRODUCCIONES</p>
                <p className="text-white/30 text-[10px] tracking-widest mt-1">PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold tracking-wider text-sm">CARTA RESPONSIVA</p>
                <p className="text-white/30 text-xs mt-1">Proyecto {proyecto.numeroProyecto}</p>
              </div>
            </div>

            {/* Cuerpo */}
            <div className="px-10 py-8 text-sm leading-relaxed">
              <p className="mb-5 text-gray-700">{fechaCarta}</p>

              <p className="font-bold mb-0.5">
                {destinatario || <span className="text-gray-300 italic">Nombre de la institución / dependencia</span>}
              </p>
              <p className="mb-6 text-white/20">Presente</p>

              <p className="mb-4 text-justify text-gray-800">
                Por medio de la presente, quien suscribe{" "}
                <strong>{responsable || <span className="text-gray-400 italic">nombre del responsable</span>}</strong>, en representación de{" "}
                <strong>Mainstage Producciones</strong>, manifiesta que, con motivo del evento{" "}
                <strong>{proyecto.nombre}</strong> a celebrarse el día{" "}
                <strong>{fechaEventoStr}</strong> en{" "}
                <strong>{proyecto.lugarEvento || <span className="text-gray-400 italic">nombre del recinto</span>}</strong>
                {ciudad ? <>, ubicado en <strong>{ciudad}</strong></> : ""}, nuestra empresa realizará las actividades
                correspondientes a {descripcionServicio}.
              </p>

              <p className="mb-4 text-justify text-gray-800">
                Para dicho evento, se contempla la instalación y operación de{" "}
                {descripcionEquipo
                  ? <strong>{descripcionEquipo}</strong>
                  : <span className="text-gray-400 italic">los equipos indicados en la cotización correspondiente</span>
                },{" "}
                mismos que serán montados por personal capacitado, aplicando las medidas de seguridad necesarias y observando las disposiciones técnicas correspondientes.
              </p>

              <p className="mb-4 text-justify text-gray-800">
                Asimismo, nos comprometemos a cumplir con la normativa aplicable en materia de seguridad y protección civil dentro del alcance de los servicios proporcionados por nuestra empresa, así como a colaborar con las autoridades competentes en todo lo necesario para contribuir al desarrollo seguro del evento.
              </p>

              <p className="mb-4 text-justify text-gray-800">
                Se hace constar que la responsabilidad respecto a las condiciones estructurales, resistencia y seguridad general del inmueble o recinto corresponde a sus propietarios, administradores o responsables, quienes autorizan su uso para la realización del montaje y desarrollo del evento.
              </p>

              <p className="mb-6 text-gray-800">
                Sin otro particular, quedo a sus órdenes para cualquier aclaración o información adicional.
              </p>

              <div className="border-t border-gray-200 my-6" />

              <p className="mb-6 text-gray-800">Atentamente,</p>

              <div className="mt-12 border-t border-gray-300 pt-3 w-64">
                <p className="font-bold text-sm">Mainstage Producciones</p>
                <p className="font-bold text-sm">{responsable || <span className="text-gray-400 italic">Nombre del responsable</span>}</p>
                <p className="text-white/20 text-xs mt-1">{cargo}</p>
                {telefono && <p className="text-[#B3985B] text-xs mt-1">{telefono}</p>}
                {correo   && <p className="text-white/30 text-xs">{correo}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#f7f5f0] border-t border-gray-200 px-10 py-3 flex justify-between items-center">
              <p className="text-[10px] text-white/30 tracking-wider">MAINSTAGE PRODUCCIONES</p>
              <p className="text-[10px] text-gray-400">Documento confidencial · Uso exclusivo de las partes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
