"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { use } from "react";
export default function ResponsivasAdminPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [responsivas, setResponsivas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const fetchResponsivas = () => {
    fetch(`/api/proyectos/${params.id}/responsivas`)
      .then(r => r.json())
      .then(r => {
        setToken(r.token);
        setResponsivas(r.responsivas || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchResponsivas();
  }, [params.id]);

  const updateStatus = async (id: string, status: string, motivoCorreccion?: string) => {
    const res = await fetch(`/api/responsivas/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, motivoCorreccion })
    });
    if (res.ok) {
      toast({ title: `Carta ${status.toLowerCase()}`, type: "success" });
      fetchResponsivas();
    } else {
      toast({ title: "Error al actualizar", type: "error" });
    }
  };

  if (loading) return <div className="p-8 text-white">Cargando...</div>;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/proyectos/${params.id}`} className="p-2 rounded-full hover:bg-[#1a1a1a] text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Cartas Responsivas</h1>
          <p className="text-sm text-gray-400 mt-1">Revisión administrativa del staff</p>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#111] border-b border-[#1a1a1a]">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Técnico</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha envío</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Firma</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {responsivas.map(r => (
              <tr key={r.id} className="hover:bg-[#111] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{r.tecnico?.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{r.tipoResponsiva === 'RIGGER' ? 'Rigger' : 'General'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(r.enviadoEn).toLocaleDateString('es-MX')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {r.status === 'VALIDADA' && <span className="text-green-500">✓ Validada</span>}
                  {r.status === 'RECIBIDA' && <span className="text-yellow-500">● Por revisar</span>}
                  {r.status === 'REQUIERE_CORRECCION' && <span className="text-red-500">⚠ Corrección solicitada</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {r.firmaUrl && (
                    <img src={r.firmaUrl} alt="Firma" className="h-8 rounded bg-white" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                  {r.status === 'RECIBIDA' && (
                    <>
                      <button onClick={() => updateStatus(r.id, 'VALIDADA')} className="text-xs bg-green-900/30 text-green-500 hover:bg-green-900/50 border border-green-800/50 px-3 py-1.5 rounded-lg transition-colors">
                        Aprobar
                      </button>
                      <button onClick={() => {
                        const m = prompt("Motivo de corrección (ej. Falta completar nombre):");
                        if (m) updateStatus(r.id, 'REQUIERE_CORRECCION', m);
                      }} className="text-xs bg-red-900/30 text-red-500 hover:bg-red-900/50 border border-red-800/50 px-3 py-1.5 rounded-lg transition-colors">
                        Solicitar corrección
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {responsivas.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">No hay responsivas registradas aún.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
