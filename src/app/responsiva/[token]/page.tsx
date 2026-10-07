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

  useEffect(() => {
    if (data?.tecnicos && tecnicoId) {
      const t = data.tecnicos.find((x: any) => x.id === tecnicoId);
      if (t) setNombreEditado(t.nombre);
    }
  }, [tecnicoId, data?.tecnicos]);

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
          roles: tecnicoSeleccionado.roles
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
          <p className="text-gray-500 text-xs mt-1">{proyecto.lugar} · {proyecto.fechaEvento?.substring(0,10)}</p>
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
    En <strong>{proyecto.lugar || "______________"}</strong>, a <strong>{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
  </p>

  <p className="text-justify">
    Yo <strong>{nombreEditado}</strong> (Cel: {tecnicoSeleccionado.telefono || "______________"}), acepto prestar mis servicios especializados de RIGGING para Mainstage Pro en el evento <strong>{proyecto.nombre}</strong>. Debido al alto riesgo inherente al trabajo en alturas y elevación de cargas, me obligo a cumplir estrictamente los siguientes lineamientos:
  </p>

  <ol className="list-decimal pl-5 space-y-2.5 text-justify">
    <li><strong>Capacidad y Certificación:</strong> Declaro contar con la experiencia, capacitación técnica y capacidad física necesarias para realizar cálculos de carga segura, instalación de puntos de anclaje, manejo de polipastos/motores y trabajo en alturas. Asumo la responsabilidad técnica de las maniobras a mi cargo.</li>
    <li><strong>Uso de EPP:</strong> Es obligatorio el uso en todo momento de casco de seguridad (con barboquejo), arnés de cuerpo entero, líneas de vida (Y-lanyard), botas de seguridad y guantes. Está estrictamente prohibido iniciar trabajos en altura sin el EPP correctamente colocado.</li>
    <li><strong>Aseguramiento de Herramientas:</strong> Todas las herramientas manuales, radios y accesorios deben estar sujetos obligatoriamente con cintas o líneas de seguridad (tool lanyards).</li>
    <li><strong>Inspección Previa de Equipo:</strong> Me comprometo a inspeccionar visual y operativamente todos los motores, eslingas, grilletes, steels y estructuras antes de su izaje.</li>
    <li><strong>Stop Work Authority (SWA):</strong> Tengo el derecho y la obligación de detener cualquier maniobra de elevación si detecto que los puntos de anclaje no son seguros, si hay sobrecarga, vientos fuertes, o condiciones que comprometan la seguridad estructural.</li>
    <li><strong>Cargas y Puntos del Recinto:</strong> Me apegaré estrictamente a los límites de carga establecidos por la ingeniería del recinto y el plot aprobado. Queda estrictamente prohibido improvisar puntos de anclaje.</li>
    <li><strong>Zona Cero y Elevación:</strong> Durante el izaje o descenso de estructuras, coordinaré el despeje total del área inferior ("zona cero"). Ningún técnico debe permanecer debajo de una estructura en movimiento.</li>
    <li><strong>Estado Físico y Cero Tolerancia:</strong> Declaro presentarme a laborar descansado. Está estrictamente prohibido laborar bajo la influencia de alcohol, drogas, o medicamentos que alteren el sistema nervioso.</li>
    <li><strong>Responsabilidad Civil:</strong> Asumo responsabilidad total sobre accidentes, colapsos o lesiones a terceros ocasionados por mi negligencia directa, mala práctica, o por omitir deliberadamente estas normativas de seguridad.</li>
  </ol>

  <p className="font-bold text-center mt-6 uppercase text-[11px] border-y border-gray-200 py-3">
    Declaro que leí, entiendo la responsabilidad técnica, y acepto el contenido de esta carta responsiva.
  </p>

  <div className="mt-8">
    <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider text-center">Firma del Técnico Rigger</p>
    <div className="max-w-[320px] mx-auto border border-gray-300 rounded-lg overflow-hidden bg-white shadow-inner">
      <SignaturePad onEnd={setFirma} theme="light" />
    </div>
    
    <div className="mt-4 text-center space-y-1">
      <input 
        type="text" 
        value={nombreEditado} 
        onChange={e => setNombreEditado(e.target.value)}
        className="font-bold text-center w-full border-b border-gray-300 focus:border-[#B3985B] focus:outline-none pb-1 bg-transparent"
        placeholder="Escribe tu nombre completo"
      />
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
    En <strong>{proyecto.lugar || "______________"}</strong>, a <strong>{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
  </p>

  <p className="text-justify">
    Yo <strong>{nombreEditado}</strong> (Cel: {tecnicoSeleccionado.telefono || "______________"}), acepto prestar servicios como freelance para Mainstage Pro en el evento <strong>{proyecto.nombre}</strong> y me obligo a cumplir los siguientes lineamientos:
  </p>

  <ol className="list-decimal pl-5 space-y-2.5 text-justify">
    <li><strong>Alcance y rol:</strong> Cumpliré con las responsabilidades técnicas del puesto asignado.</li>
    <li><strong>Horarios y permanencia:</strong> Cumpliré puntualmente los horarios establecidos para bodega, carga, traslado, montaje, show y desmontaje. Permaneceré disponible en mi área durante toda la jornada y avisaré cualquier salida al responsable.</li>
    <li><strong>Conducta y ética:</strong> Respeto total a cliente, venue, proveedores y equipo. Queda prohibido: agresiones, acoso, discriminación, conflictos y consumo de alcohol o sustancias durante el servicio.</li>
    <li><strong>Presentación:</strong> Ropa negra o uniforme cuando se solicite; higiene personal y lenguaje profesional en todo momento.</li>
    <li><strong>Seguridad (EHS):</strong> Seguridad primero: usaré EPP cuando aplique y realizaré únicamente maniobras dentro de mi capacidad y certificación. Si identifico un riesgo, detengo la operación y reporto de inmediato.</li>
    <li><strong>Comunicación:</strong> Usaré los canales oficiales del evento. Ante duda o error potencial, consulto antes de ejecutar. Reporto avances y envío evidencia cuando se solicite.</li>
    <li><strong>Orden, limpieza e higiene:</strong> Mantendré las áreas técnicas funcionales, limpias e higiénicas: sin basura, líquidos ni obstáculos. Cableado ordenado e identificable.</li>
    <li><strong>Uso y cuidado del equipo:</strong> Uso correcto del equipo asignado, sin préstamos ni uso personal. Orden por zonas y resguardo adecuado al finalizar.</li>
    <li><strong>Daños, pérdidas y faltantes:</strong> Reportaré de inmediato cualquier daño, falla o extravío. Acepto responsabilidad por negligencia, mal uso o falta de reporte oportuno.</li>
    <li><strong>Incidencias y reporte:</strong> Las incidencias técnicas, operativas o de seguridad se reportan en el momento y al cierre del evento.</li>
    <li><strong>Operación estándar:</strong> Carga segura; plan de zona; descarga ordenada; seguridad antes que estética; pruebas completas; desmontaje calmado; cables por tipo; regreso y orden final en bodega.</li>
    <li><strong>Confidencialidad e imagen:</strong> No divulgaré información interna ni publicaré fotos o videos del backstage sin autorización expresa de Mainstage Pro.</li>
  </ol>

  <p className="font-bold text-center mt-6 uppercase text-[11px] border-y border-gray-200 py-3">
    Declaro que leí, entiendo y acepto el contenido de esta carta responsiva.
  </p>

  <div className="mt-8">
    <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider text-center">Firma del Técnico</p>
    <div className="max-w-[320px] mx-auto border border-gray-300 rounded-lg overflow-hidden bg-white shadow-inner">
      <SignaturePad onEnd={setFirma} theme="light" />
    </div>
    
    <div className="mt-4 text-center space-y-1">
      <input 
        type="text" 
        value={nombreEditado} 
        onChange={e => setNombreEditado(e.target.value)}
        className="font-bold text-center w-full border-b border-gray-300 focus:border-[#B3985B] focus:outline-none pb-1 bg-transparent"
        placeholder="Escribe tu nombre completo"
      />
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
