"use client";
import React, { useEffect, useState } from "react";
import { SignaturePad } from "@/components/SignaturePad";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";

import { use } from "react";
export default function ResponsivaPage(props: { params: Promise<{ token: string }> }) {
  const params = use(props.params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [tecnicoId, setTecnicoId] = useState<string>("");
  const [firma, setFirma] = useState<string | null>(null);
  const [aceptado, setAceptado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [success, setSuccess] = useState(false);
  const [nombreEditado, setNombreEditado] = useState("");
  const [comentarios, setComentarios] = useState("");

  useEffect(() => {
    if (data?.tecnicos && tecnicoId) {
      const t = data.tecnicos.find((x: any) => x.id === tecnicoId);
      if (t) setNombreEditado(t.nombre);
      const r = data.responsivas?.find((x: any) => x.tecnicoId === tecnicoId);
      if (r?.datosCapturados?.comentarios) {
        setComentarios(r.datosCapturados.comentarios);
      } else {
        setComentarios("");
      }
    }
  }, [tecnicoId, data]);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/public/responsiva/${params.token}`)
      .then(res => res.json())
      .then(res => {
        if (res.error) setError(res.error);
        else setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.token]);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Cargando...</div>;
  if (error || !data) return <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">Error: {error || "No encontrado"}</div>;

  const { proyecto, tecnicos, responsivas } = data;
  
  const tecnicoSeleccionado = tecnicos.find((t: any) => t.id === tecnicoId);
  const responsivaExistente = responsivas.find((r: any) => r.tecnicoId === tecnicoId);

  const handleSubmit = async () => {
    if (!tecnicoId || !firma || !aceptado) return;
    setEnviando(true);
    try {
      const tipoResponsiva = tecnicoSeleccionado.esRigger ? 'RIGGER' : 'GENERAL';
      const payload = {
        tecnicoId,
        firmaUrl: firma, // in a real app, upload to blob first. here we just save base64
        tipoResponsiva,
        datosCapturados: {
          nombre: nombreEditado,
          telefono: tecnicoSeleccionado.telefono,
          roles: tecnicoSeleccionado.roles,
          comentarios: comentarios.trim() || undefined
        }
      };
      const res = await fetch(`/api/public/responsiva/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) setSuccess(true);
      else toast("Error al enviar", "error");
    } catch (e) {
      toast("Error de red", "error");
    } finally {
      setEnviando(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h1 className="text-xl font-bold mb-2">Responsiva enviada correctamente</h1>
        <p className="text-gray-400 text-sm">Mainstage Pro recibió tu documento.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 pb-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8 pt-6">
          <h1 className="text-[#B3985B] font-bold text-lg tracking-widest uppercase mb-1">Mainstage Pro</h1>
          <p className="text-gray-300 font-medium">{proyecto.nombre}</p>
          <p className="text-gray-500 text-xs mt-1">{proyecto.estadoLugar || proyecto.lugar} · {proyecto.fechaEvento?.substring(0,10)}</p>
        </div>

        {!tecnicoId ? (
          <div className="bg-[#111] border border-[#222] p-5 rounded-2xl shadow-xl">
            <label className="block text-sm text-gray-400 mb-3 text-center">Selecciona tu nombre para continuar</label>
            <select
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#B3985B] appearance-none"
              value={tecnicoId}
              onChange={(e) => setTecnicoId(e.target.value)}
            >
              <option value="">Buscar técnico...</option>
              {tecnicos.map((t: any) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#111] border border-[#222] p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{tecnicoSeleccionado.nombre}</h2>
                <button onClick={() => setTecnicoId("")} className="text-xs text-gray-500 hover:text-white">Cambiar</button>
              </div>
              
              {responsivaExistente?.status === 'VALIDADA' && (
                <div className="p-4 bg-green-900/20 border border-green-800/30 rounded-xl text-center">
                  <p className="text-green-500 font-medium mb-1">Responsiva validada</p>
                  <p className="text-green-400/70 text-xs">Tu documento ya fue aprobado por Mainstage.</p>
                </div>
              )}
              {responsivaExistente?.status === 'RECIBIDA' && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-800/30 rounded-xl text-center">
                  <p className="text-yellow-500 font-medium mb-1">Responsiva en revisión</p>
                  <p className="text-yellow-400/70 text-xs">Tu documento está siendo revisado por Mainstage.</p>
                </div>
              )}
              
              {(!responsivaExistente || responsivaExistente.status === 'PENDIENTE' || responsivaExistente.status === 'REQUIERE_CORRECCION') && (
                <>
                  {responsivaExistente?.status === 'REQUIERE_CORRECCION' && (
                    <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-xl mb-4">
                      <p className="text-red-500 text-sm font-medium mb-1">Se requiere corrección</p>
                      <p className="text-red-400/80 text-xs">{responsivaExistente.motivoCorreccion || "Por favor revisa y firma nuevamente."}</p>
                    </div>
                  )}
                  
                  {tecnicoSeleccionado.esRigger ? (
                    <div className="bg-white text-black p-6 sm:p-8 rounded-sm shadow-xl my-6 text-xs sm:text-sm space-y-4 leading-relaxed max-w-2xl mx-auto">
  <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-4">
    <div>
      <img src="/logo.png" alt="Mainstage Producciones" className="h-6 sm:h-8 object-contain" />
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Producción Técnica</p>
    </div>
    <div className="text-right">
      <h3 className="font-bold text-sm uppercase">Carta Responsiva</h3>
      <p className="text-[10px] text-gray-500 mt-1">Trabajo en Alturas (Rigging)</p>
    </div>
  </div>

  <p className="pt-2">
    En <strong>{proyecto.estadoLugar || "Querétaro"}</strong>, a <strong>{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
  </p>

  <p className="text-justify">
    Yo <strong>{nombreEditado}</strong> (Teléfono celular: {tecnicoSeleccionado.telefono || "______________"}), acepto prestar mis servicios especializados de montaje y trabajo en alturas (Rigging) para Mainstage Pro en el evento <strong>{proyecto.nombre}</strong>. Debido al alto riesgo inherente al trabajo en alturas y elevación de cargas suspendidas, me obligo a cumplir estrictamente con los siguientes lineamientos de seguridad:
  </p>

  <ol className="list-decimal pl-5 space-y-2.5 text-justify">
    <li><strong>Capacidad y certificación técnica:</strong> Declaro contar con la experiencia comprobable, capacitación técnica y capacidad física necesarias para realizar cálculos de carga segura, instalación de puntos de anclaje, operación de polipastos o motores y maniobras en alturas. Asumo la responsabilidad técnica de las maniobras a mi cargo.</li>
    <li><strong>Uso obligatorio de Equipo de Protección Personal (EPP):</strong> Es obligatorio el uso continuo de casco de seguridad con barboquejo, arnés de cuerpo entero debidamente certificado, líneas de vida dobles con amortiguador de impacto, calzado de seguridad con casquillo y guantes de protección. Queda estrictamente prohibido realizar cualquier labor en altura sin portar el equipo completo e inspeccionado.</li>
    <li><strong>Aseguramiento y sujeción de herramientas:</strong> Todas las herramientas manuales, radios de comunicación y accesorios deberán estar permanentemente sujetos mediante cintas o líneas de seguridad anticaídas para prevenir el riesgo de impacto al personal en tierra.</li>
    <li><strong>Inspección previa de herrajes y estructuras:</strong> Me comprometo a revisar física y visualmente todos los motores de elevación, eslingas de carga, grilletes, cables de acero de seguridad y tramos de estructura (truss) antes de cualquier maniobra de izaje. Cualquier elemento que presente deformación, daño estructural o desgaste no será utilizado y se reportará de inmediato.</li>
    <li><strong>Autoridad para detención de trabajo (Stop Work Authority):</strong> Cuento con el derecho y la obligación ineludible de suspender inmediatamente cualquier maniobra de carga o elevación si identifico que los puntos de anclaje no son seguros, si existe sobrepeso, si la velocidad del viento supera los límites tolerables o si cualquier condición ambiental o del recinto compromete la integridad estructural.</li>
    <li><strong>Respeto a límites de carga del recinto:</strong> Me apegaré rigurosamente a las capacidades de carga y especificaciones técnicas autorizadas por la ingeniería del recinto o sede y el plano de rigging aprobado. Queda estrictamente prohibida cualquier improvisación de anclajes en vigas o estructuras no autorizadas.</li>
    <li><strong>Despeje de zona de maniobra (zona cero):</strong> Durante cualquier maniobra de elevación o descenso de estructuras o cargas suspendidas, coordinaré el despeje total del área inferior. Ninguna persona podrá permanecer o transitar debajo de cargas en movimiento.</li>
    <li><strong>Condición física y cero tolerancia:</strong> Me presentaré a laborar descansado y en óptimas condiciones de salud. Está estrictamente prohibido desempeñar labores bajo la influencia de alcohol, sustancias psicotrópicas o medicamentos que alteren los reflejos o la concentración. El incumplimiento causará la baja inmediata del evento.</li>
    <li><strong>Responsabilidad técnica y civil:</strong> Asumo responsabilidad total sobre accidentes, colapsos o lesiones causados por negligencia directa comprobada, mala práctica o por omitir deliberadamente estas normativas de seguridad técnica.</li>
  </ol>

  <div className="mt-6 pt-4 border-t border-gray-200">
    <label className="block text-xs font-semibold text-gray-800 uppercase tracking-wide mb-1.5">
      Comentarios u observaciones del freelance <span className="text-gray-400 font-normal lowercase">(opcional)</span>
    </label>
    <textarea
      rows={3}
      value={comentarios}
      onChange={(e) => setComentarios(e.target.value)}
      placeholder="Escribe aquí cualquier comentario, observación sobre el equipo asignado, estado de entrega o requerimiento especial..."
      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#B3985B] focus:bg-white resize-none transition-colors"
    />
  </div>

  <p className="font-bold text-center mt-6 uppercase text-[11px] border-y border-gray-200 py-3 text-gray-900">
    Declaro que leí, entiendo la responsabilidad técnica, y acepto el contenido de esta carta responsiva.
  </p>

  <div className="mt-8">
    <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider text-center">Firma del Técnico Rigger</p>
    <div className="max-w-[320px] mx-auto border border-gray-300 rounded-lg overflow-hidden bg-white shadow-inner">
      <SignaturePad onEnd={setFirma} theme="light" />
    </div>
    
    <div className="mt-4 text-center">
      <input 
        type="text" 
        value={nombreEditado} 
        onChange={e => setNombreEditado(e.target.value)}
        className="font-bold text-base text-gray-900 text-center w-full border-b border-gray-400 focus:border-[#B3985B] focus:outline-none pb-1 bg-transparent"
        placeholder="Escribe tu nombre completo"
      />
      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mt-1">
        Nombre completo
      </p>
    </div>
  </div>

  <div className="mt-6 pt-4 border-t border-gray-200">
    <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
      <input type="checkbox" checked={aceptado} onChange={e => setAceptado(e.target.checked)} className="mt-1 w-4 h-4 text-[#B3985B] rounded" />
      <span className="text-xs text-gray-700 leading-relaxed font-medium">
        He leído y acepto el contenido de esta carta responsiva y confirmo que la información proporcionada es correcta.
      </span>
    </label>
  </div>
</div>
                  ) : (
                    <div className="bg-white text-black p-6 sm:p-8 rounded-sm shadow-xl my-6 text-xs sm:text-sm space-y-4 leading-relaxed max-w-2xl mx-auto">
  <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-4">
    <div>
      <img src="/logo.png" alt="Mainstage Producciones" className="h-6 sm:h-8 object-contain" />
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Producción Técnica</p>
    </div>
    <div className="text-right">
      <h3 className="font-bold text-sm uppercase">Carta Responsiva</h3>
      <p className="text-[10px] text-gray-500 mt-1">Personal Técnico / Freelance</p>
    </div>
  </div>

  <p className="pt-2">
    En <strong>{proyecto.estadoLugar || "Querétaro"}</strong>, a <strong>{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
  </p>

  <p className="text-justify">
    Yo <strong>{nombreEditado}</strong> (Teléfono celular: {tecnicoSeleccionado.telefono || "______________"}), acepto prestar mis servicios como personal técnico freelance para Mainstage Pro en el evento <strong>{proyecto.nombre}</strong> y me obligo a cumplir con los siguientes lineamientos de operación, seguridad y profesionalismo:
  </p>

  <ol className="list-decimal pl-5 space-y-2.5 text-justify">
    <li><strong>Alcance y funciones técnicas:</strong> Cumpliré cabalmente con las responsabilidades, actividades y funciones técnicas inherentes a mi puesto asignado durante todas las etapas de la producción.</li>
    <li><strong>Horarios y permanencia:</strong> Cumpliré con puntualidad los horarios establecidos para salida de bodega, carga, traslado, montaje, pruebas previas, operación del evento y desmontaje. Permaneceré presente y disponible en mi área de trabajo durante toda la jornada y notificaré cualquier ausencia o desplazamiento temporal al encargado de producción.</li>
    <li><strong>Conducta y ética profesional:</strong> Mantendré un trato de absoluto respeto hacia el cliente, el personal del recinto o sede, proveedores, compañeros de equipo y asistentes. Queda estrictamente prohibido cualquier tipo de agresión física o verbal, acoso, discriminación, incitación a conflictos, así como el consumo o posesión de bebidas alcohólicas o sustancias ilícitas durante el servicio.</li>
    <li><strong>Presentación personal y código de vestimenta:</strong> Me presentaré con vestimenta limpia en color negro (o el uniforme que la empresa proporcione o solicite), cuidando la higiene personal y manteniendo un lenguaje adecuado y profesional en todo momento.</li>
    <li><strong>Seguridad laboral y prevención de riesgos:</strong> La seguridad del personal y de los asistentes es la máxima prioridad. Utilizaré mi Equipo de Protección Personal completo en las etapas de montaje, desmontaje y cuando las condiciones del evento lo requieran. Realizaré únicamente maniobras dentro de mi capacidad técnica, certificación y experiencia. Si detecto cualquier riesgo o condición insegura, detendré la actividad de inmediato y lo comunicaré al responsable.</li>
    <li><strong>Comunicación efectiva:</strong> Mantendré comunicación constante a través de los canales oficiales establecidos para el evento (grupos de mensajería o frecuencias de radio asignadas). Ante cualquier duda técnica o contingencia, consultaré con el encargado antes de proceder. Notificaré los avances de mis tareas y enviaré evidencia técnica cuando me sea requerida.</li>
    <li><strong>Orden, limpieza y cableado técnico:</strong> Mantendré las áreas técnicas de trabajo, escenario y operación limpias, ordenadas y libres de obstáculos, líquidos o basura. La distribución y tendido de cableado se realizará de forma peinada, segura y debidamente protegida con pasacables o cinta según aplique, facilitando la circulación y permitiendo resolver fallas con rapidez.</li>
    <li><strong>Uso, cuidado y resguardo del equipo:</strong> Cuidaré y utilizaré de manera responsable las herramientas y equipos puestos a mi disposición, destinándolos exclusivamente a la operación del evento, sin prestar equipo a personas ajenas ni utilizarlo para fines personales. Al finalizar la jornada, colaboraré en su empaque, clasificación y resguardo en los estuches correspondientes.</li>
    <li><strong>Reporte de daños, pérdidas o faltantes:</strong> Notificaré inmediatamente al coordinador cualquier avería, falla previa, daño o extravío de equipo o herramienta. Asumo la responsabilidad correspondiente por daños ocasionados debido a negligencia comprobada, mal uso o falta de reporte oportuno.</li>
    <li><strong>Gestión y reporte de incidencias:</strong> Cualquier incidente técnico, operativo o de seguridad personal deberá informarse en el momento exacto en que ocurra y quedará registrado al cierre del servicio.</li>
    <li><strong>Procedimientos estándar de operación técnica:</strong> Seguiré los estándares operativos de carga segura en transporte, descarga ordenada, prioridad de la seguridad estructural antes de la estética, pruebas previas integrales, desmontaje cuidadoso sin prisas que comprometan al personal o al equipo, y entrega verificada en bodega.</li>
    <li><strong>Confidencialidad e imagen corporativa:</strong> Guardaré estricta confidencialidad respecto a la información interna del evento, los asistentes y el cliente. No compartiré información sensible ni publicaré fotos o videos de montajes o backstage en redes sociales personales sin previa autorización expresa de Mainstage Pro.</li>
  </ol>

  <div className="mt-6 pt-4 border-t border-gray-200">
    <label className="block text-xs font-semibold text-gray-800 uppercase tracking-wide mb-1.5">
      Comentarios u observaciones del freelance <span className="text-gray-400 font-normal lowercase">(opcional)</span>
    </label>
    <textarea
      rows={3}
      value={comentarios}
      onChange={(e) => setComentarios(e.target.value)}
      placeholder="Escribe aquí cualquier comentario, observación técnica sobre el equipo o nota relevante sobre el servicio..."
      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#B3985B] focus:bg-white resize-none transition-colors"
    />
  </div>

  <p className="font-bold text-center mt-6 uppercase text-[11px] border-y border-gray-200 py-3 text-gray-900">
    Declaro que leí, entiendo y acepto el contenido de esta carta responsiva.
  </p>

  <div className="mt-8">
    <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider text-center">Firma del Técnico</p>
    <div className="max-w-[320px] mx-auto border border-gray-300 rounded-lg overflow-hidden bg-white shadow-inner">
      <SignaturePad onEnd={setFirma} theme="light" />
    </div>
    
    <div className="mt-4 text-center">
      <input 
        type="text" 
        value={nombreEditado} 
        onChange={e => setNombreEditado(e.target.value)}
        className="font-bold text-base text-gray-900 text-center w-full border-b border-gray-400 focus:border-[#B3985B] focus:outline-none pb-1 bg-transparent"
        placeholder="Escribe tu nombre completo"
      />
      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mt-1">
        Nombre completo
      </p>
    </div>
  </div>

  <div className="mt-6 pt-4 border-t border-gray-200">
    <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
      <input type="checkbox" checked={aceptado} onChange={e => setAceptado(e.target.checked)} className="mt-1 w-4 h-4 text-[#B3985B] rounded" />
      <span className="text-xs text-gray-700 leading-relaxed font-medium">
        He leído y acepto el contenido de esta carta responsiva y confirmo que la información proporcionada es correcta.
      </span>
    </label>
  </div>
</div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!firma || !aceptado || enviando}
                    className="w-full py-3.5 bg-[#B3985B] text-black font-bold rounded-xl disabled:opacity-50 transition-colors"
                  >
                    {enviando ? "Enviando..." : "Firmar y enviar"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
