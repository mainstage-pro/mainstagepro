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
          nombre: tecnicoSeleccionado.nombre,
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
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tipo de responsiva</p>
                      <p className="text-sm">{tecnicoSeleccionado.esRigger ? "Carta Responsiva de Rigger" : "Carta Responsiva General"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Roles asignados</p>
                      <p className="text-sm text-gray-300">{tecnicoSeleccionado.roles.join(', ') || "Técnico"}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Firma digital</p>
                    <SignaturePad onEnd={setFirma} />
                  </div>

                  <label className="flex items-start gap-3 mb-6 p-3 bg-[#1a1a1a] rounded-xl border border-[#333] cursor-pointer">
                    <input type="checkbox" checked={aceptado} onChange={e => setAceptado(e.target.checked)} className="mt-1 bg-black border-[#444] rounded" />
                    <span className="text-xs text-gray-300 leading-relaxed">
                      He leído y acepto el contenido de esta carta responsiva y confirmo que la información proporcionada es correcta.
                    </span>
                  </label>

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
