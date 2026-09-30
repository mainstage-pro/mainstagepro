"use client";

import { useEffect, useState, use } from "react";

interface Proyecto {
  id: string;
  numeroProyecto: string;
  nombre: string;
  fechaEvento: string;
  lugarEvento: string | null;
  encargado: { name: string } | null;
}

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

export default function CartaResponsivaSubarrendadosPage({ params }: { params: Promise<{ proyectoId: string }> }) {
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
  const [nombreProveedor, setNombreProveedor]   = useState("");
  const [representanteProveedor, setRepresentanteProveedor] = useState("");
  const [descripcionEquipoSubarrendado, setDescripcionEquipoSubarrendado] = useState("");

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
      nombreProveedor,
      representanteProveedor,
      descripcionEquipoSubarrendado,
    });
    return `/api/proyectos/${proyectoId}/carta-responsiva-subarrendados?${q.toString()}`;
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
  const hoy = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const fechaCarta = ciudad ? `${ciudad}, ${hoy}` : hoy;

  const inputCls = "w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#B3985B]/60 placeholder-white/20";
  const labelCls = "block text-xs text-white/30 mb-1";

  return (
    <div className="min-h-screen bg-[#0a0a0a]" style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif' }}>
      <div className="sticky top-0 z-50 bg-[#0d0d0d] border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="text-white/30 hover:text-white text-sm transition-colors">
            ← Volver
          </button>
          <span className="text-white/10">|</span>
          <span className="text-white/40 text-sm">Responsiva Subarrendados — {proyecto.nombre}</span>
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
        <div className="w-80 shrink-0 space-y-4">
          <div className="bg-white/[0.025] border border-white/8 rounded-xl p-4 space-y-4">
            <p className="text-xs text-white/30 uppercase tracking-wider">Datos del documento</p>

            <div>
              <label className={labelCls}>Destinatario (Opcional)</label>
              <input
                className={inputCls}
                placeholder="A quien corresponda"
                value={destinatario}
                onChange={e => setDestinatario(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Ciudad</label>
              <input
                className={inputCls}
                placeholder="Ej: Guadalajara, Jalisco"
                value={ciudad}
                onChange={e => setCiudad(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Responsable Mainstage</label>
              <input
                className={inputCls}
                placeholder="Nombre completo"
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Cargo Mainstage</label>
              <input
                className={inputCls}
                placeholder="Ej: Director de Producción"
                value={cargo}
                onChange={e => setCargo(e.target.value)}
              />
            </div>
            
            <div className="border-t border-white/10 my-2 pt-2">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Datos del Proveedor</p>
              <div>
                <label className={labelCls}>Nombre de la Empresa Externa</label>
                <input
                  className={inputCls}
                  placeholder="Ej: Estructuras y Rigging S.A."
                  value={nombreProveedor}
                  onChange={e => setNombreProveedor(e.target.value)}
                />
              </div>
              <div className="mt-2">
                <label className={labelCls}>Representante / Responsable Técnico</label>
                <input
                  className={inputCls}
                  placeholder="Ej: Juan Pérez"
                  value={representanteProveedor}
                  onChange={e => setRepresentanteProveedor(e.target.value)}
                />
              </div>
              <div className="mt-2">
                <label className={labelCls}>Descripción del equipo o servicio</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  placeholder="Ej: montaje de estructura tipo ground support, rigging y templetes"
                  value={descripcionEquipoSubarrendado}
                  onChange={e => setDescripcionEquipoSubarrendado(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl text-[#0a0a0a] font-sans">
            <div className="bg-[#0a0a0a] px-10 py-6 flex items-end justify-between border-b-2 border-[#B3985B]">
              <div>
                <p className="text-[#B3985B] font-bold tracking-widest text-base">MAINSTAGE PRODUCCIONES</p>
                <p className="text-white/30 text-[10px] tracking-widest mt-1">PRODUCCIÓN TÉCNICA · AUDIO · ILUMINACIÓN · VIDEO</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold tracking-wider text-sm">ASIGNACIÓN DE RESPONSABILIDAD</p>
                <p className="text-[#B3985B] font-bold tracking-wider text-[10px] mt-1">SERVICIOS SUBARRENDADOS</p>
                <p className="text-white/30 text-xs mt-1">Proyecto {proyecto.numeroProyecto}</p>
              </div>
            </div>

            <div className="px-10 py-8 text-sm leading-relaxed">
              <p className="mb-5 text-gray-700">{fechaCarta}</p>

              <p className="font-bold mb-0.5">
                {destinatario || <span className="text-gray-300 italic">A QUIEN CORRESPONDA:</span>}
              </p>
              {destinatario && <p className="mb-6 text-white/20">Presente</p>}

              <p className="mb-4 text-justify text-gray-800">
                Por medio de la presente, quien suscribe{" "}
                <strong>{responsable || <span className="text-gray-400 italic">nombre del responsable</span>}</strong>, en representación de{" "}
                <strong>Mainstage Producciones</strong>, manifiesta que, con motivo del evento{" "}
                <strong>{proyecto.nombre}</strong> a celebrarse el día{" "}
                <strong>{fechaEventoStr}</strong> en{" "}
                <strong>{proyecto.lugarEvento || <span className="text-gray-400 italic">nombre del recinto</span>}</strong>
                {ciudad ? <>, ubicado en <strong>{ciudad}</strong></> : ""}, nuestra empresa fungirá como coordinador y/o integrador de servicios.
              </p>

              <p className="mb-4 text-justify text-gray-800">
                Para el desarrollo de dicho evento, se informa que los servicios y/o equipos correspondientes a{" "}
                <strong>{descripcionEquipoSubarrendado || <span className="text-gray-400 italic">descripción del equipo/servicio</span>}</strong>{" "}
                son suministrados, instalados y operados por el proveedor externo{" "}
                <strong>{nombreProveedor || <span className="text-gray-400 italic">nombre del proveedor</span>}</strong>.
              </p>

              <p className="mb-4 text-justify text-gray-800">
                Se establece expresamente que dicho proveedor externo asume la responsabilidad total sobre su alcance contratado, incluyendo de manera enunciativa más no limitativa: el estado del equipo, condiciones técnicas, seguridad, diseño (cuando aplique), cálculo estructural, capacidad de carga, instalación, montaje, anclajes, contrapesos, nivelación, estabilidad, operación, supervisión, personal utilizado, desmontaje y retiro. Asimismo, será el único responsable de cualquier falla, defecto, negligencia o incidente directamente atribuible a su servicio o equipo.
              </p>

              <p className="mb-4 text-justify text-gray-800">
                El proveedor <strong>{nombreProveedor || <span className="text-gray-400 italic">nombre del proveedor</span>}</strong> deberá proporcionar la documentación técnica y de seguridad que corresponda según el evento, recinto o autoridad competente, lo cual puede incluir (según aplique): carta responsiva técnica, memoria de cálculo, dictamen estructural, responsable técnico, fichas técnicas, certificaciones, póliza de responsabilidad civil, y cualquier otra documentación solicitada por Protección Civil o el recinto.
              </p>
              
              <p className="mb-4 text-justify text-gray-800">
                <strong>Mainstage Producciones</strong> conserva expresamente la responsabilidad correspondiente única y exclusivamente a los servicios, actividades y equipos que realiza y opera de forma directa con su propio personal, sin asumir responsabilidad técnica, de diseño, de fabricación, de cálculo estructural, de instalación, de operación o legal sobre el equipo suministrado y ejecutado por el proveedor externo mencionado.
              </p>

              <div className="border-t border-gray-200 my-6" />

              <p className="mb-6 text-gray-800">De conformidad con lo anterior, firman:</p>

              <div className="flex gap-8 mt-12">
                <div className="border-t border-gray-300 pt-3 flex-1">
                  <p className="font-bold text-sm">Mainstage Producciones</p>
                  <p className="font-bold text-sm">{responsable || <span className="text-gray-400 italic">Nombre del responsable</span>}</p>
                  <p className="text-gray-500 text-xs mt-1">{cargo}</p>
                </div>
                <div className="border-t border-gray-300 pt-3 flex-1">
                  <p className="font-bold text-sm">{nombreProveedor || <span className="text-gray-400 italic">Proveedor Externo</span>}</p>
                  <p className="font-bold text-sm">{representanteProveedor || <span className="text-gray-400 italic">Nombre del representante</span>}</p>
                  <p className="text-gray-500 text-xs mt-1">Representante Legal / Responsable Técnico</p>
                </div>
              </div>
            </div>

            <div className="bg-[#f7f5f0] border-t border-gray-200 px-10 py-3 flex justify-between items-center">
              <p className="text-[10px] text-gray-500 tracking-wider">MAINSTAGE PRODUCCIONES</p>
              <p className="text-[10px] text-gray-400">Documento confidencial · Uso exclusivo de las partes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
