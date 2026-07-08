"use client";
import { useState, useEffect } from "react";

interface Acceso { id: string; userId: string; user: { id: string; name: string } }
interface Proyecto {
  id: string; nombre: string; color: string | null;
  carpeta: { id: string; nombre: string } | null;
  accesos: Acceso[];
}
interface Usuario { id: string; name: string }

interface Props {
  onClose: () => void;
}

export default function ProyectoAccesoPanel({ onClose }: Props) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null); // proyectoId

  useEffect(() => {
    fetch("/api/admin/tareas/accesos")
      .then(r => r.json())
      .then(d => { setProyectos(d.proyectos ?? []); setUsuarios(d.usuarios ?? []); })
      .finally(() => setLoading(false));
  }, []);

  async function addAcceso(proyectoId: string, userId: string) {
    const res = await fetch("/api/admin/tareas/accesos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoId, userId }),
    });
    if (res.ok) {
      const { acceso } = await res.json();
      setProyectos(prev => prev.map(p =>
        p.id === proyectoId ? { ...p, accesos: [...p.accesos, acceso] } : p
      ));
    }
    setDropdownOpen(null);
  }

  async function removeAcceso(proyectoId: string, userId: string) {
    await fetch("/api/admin/tareas/accesos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoId, userId }),
    });
    setProyectos(prev => prev.map(p =>
      p.id === proyectoId ? { ...p, accesos: p.accesos.filter(a => a.userId !== userId) } : p
    ));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl h-full bg-[#0a0a0a] border-l border-[#1e1e1e] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] shrink-0">
          <div>
            <h2 className="text-white font-semibold text-sm">Acceso a proyectos</h2>
            <p className="text-[#555] text-xs mt-0.5">Controla quién puede ver cada proyecto</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-[#444] hover:text-white hover:bg-[#1a1a1a] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Note */}
        <div className="mx-5 mt-4 mb-2 px-3 py-2 bg-[#B3985B]/8 border border-[#B3985B]/20 rounded-lg text-xs text-[#B3985B]/80 shrink-0">
          Los Administradores siempre ven todos los proyectos. Esta tabla controla el acceso para el resto del equipo.
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {loading ? (
            <p className="text-[#555] text-sm text-center py-8">Cargando...</p>
          ) : proyectos.length === 0 ? (
            <p className="text-[#555] text-sm text-center py-8">Sin proyectos</p>
          ) : proyectos.map(p => {
            const usersWithAccess = p.accesos.map(a => a.user);
            const usersWithoutAccess = usuarios.filter(u => !p.accesos.some(a => a.userId === u.id));
            const isDropOpen = dropdownOpen === p.id;

            return (
              <div key={p.id} className="ms-stat-card">
                <div className="flex items-center gap-2 mb-3">
                  {p.color && <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
                  <p className="text-white text-sm font-medium">{p.nombre}</p>
                  {p.carpeta && <span className="text-[#555] text-[10px]">· {p.carpeta.nombre}</span>}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {usersWithAccess.length === 0 && (
                    <span className="text-[#444] text-xs italic">Sin acceso asignado</span>
                  )}
                  {usersWithAccess.map(u => (
                    <span key={u.id} className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-2 py-0.5 text-xs text-gray-300">
                      {u.name.split(" ").slice(0, 2).join(" ")}
                      <button
                        onClick={() => removeAcceso(p.id, u.id)}
                        className="text-[#444] hover:text-red-400 transition-colors ml-0.5"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </span>
                  ))}

                  {usersWithoutAccess.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setDropdownOpen(isDropOpen ? null : p.id)}
                        className="flex items-center gap-1 bg-[#B3985B]/10 hover:bg-[#B3985B]/20 border border-[#B3985B]/20 hover:border-[#B3985B]/40 rounded-full px-2 py-0.5 text-xs text-[#B3985B] transition-all"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Agregar
                      </button>
                      {isDropOpen && (
                        <div className="absolute left-0 top-full mt-1 z-10 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                          {usersWithoutAccess.map(u => (
                            <button
                              key={u.id}
                              onClick={() => addAcceso(p.id, u.id)}
                              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#1e1e1e] hover:text-white transition-colors"
                            >
                              {u.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
