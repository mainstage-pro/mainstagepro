const fs = require('fs');
const path = 'src/app/(dashboard)/proyectos/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Sidebar section replacement
const sidebarTarget = `                  <Link
                    href={\`/carta-responsiva-subarrendados/\${proyecto.id}\`}
                    className="w-full flex items-center gap-2.5 py-[7px] text-left text-gray-400 hover:text-[#B3985B] text-[12.5px] transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="11" y2="16"/></svg>
                    Responsiva Subarrendados
                  </Link>
                </>`;

const sidebarReplacement = `                  <Link
                    href={\`/carta-responsiva-subarrendados/\${proyecto.id}\`}
                    className="w-full flex items-center gap-2.5 py-[7px] text-left text-gray-400 hover:text-[#B3985B] text-[12.5px] transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="11" y2="16"/></svg>
                    Responsiva Subarrendados
                  </Link>

                  <div className="border-t border-[#1e1e1e] my-2" />
                  
                  {proyecto.responsivas && (
                    <div className="bg-[#111] border border-[#222] rounded-xl p-3">
                      <p className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-2">Cartas responsivas del staff</p>
                      <p className="text-xs text-gray-500 mb-2">
                        {proyecto.personal.filter((p: any) => p.tecnicoId).length} técnicos asignados
                      </p>
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs"><span className="text-gray-400">✓ Validadas</span> <span className="text-green-500 font-medium">{proyecto.responsivas.filter((r: any) => r.status === 'VALIDADA').length}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-400">● Por revisar</span> <span className="text-yellow-500 font-medium">{proyecto.responsivas.filter((r: any) => r.status === 'RECIBIDA').length}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-400">○ Pendientes</span> <span className="text-gray-500 font-medium">{proyecto.personal.filter((p: any) => p.tecnicoId).length - proyecto.responsivas.filter((r: any) => r.status === 'VALIDADA' || r.status === 'RECIBIDA').length}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-400">⚠ Corrección</span> <span className="text-red-500 font-medium">{proyecto.responsivas.filter((r: any) => r.status === 'REQUIERE_CORRECCION').length}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!proyecto.responsivaToken) return alert("Guarda o recarga para generar token.");
                            const link = \`\${window.location.origin}/responsiva/\${proyecto.responsivaToken}\`;
                            navigator.clipboard.writeText(link);
                            alert("Link copiado: " + link);
                          }}
                          className="flex-1 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-lg text-[10px] text-gray-300 transition-colors"
                        >
                          Copiar link
                        </button>
                        <button
                          onClick={() => window.open(\`/proyectos/\${proyecto.id}/responsivas\`, '_blank')}
                          className="flex-1 py-1.5 bg-[#B3985B]/10 hover:bg-[#B3985B]/20 border border-[#B3985B]/30 rounded-lg text-[10px] text-[#B3985B] transition-colors"
                        >
                          Ver responsivas
                        </button>
                      </div>
                    </div>
                  )}
                </>`;

code = code.replace(sidebarTarget, sidebarReplacement);

// 2. Technician button replacement
const btnTarget = `{p.tecnico && (
                        <button type="button" onClick={() => downloadPdf(\`/api/proyectos/\${proyecto.id}/personal/\${p.id}/carta\`, \`carta-responsiva-tecnico-freelance-\${proyecto.numeroProyecto}-\${p.id.slice(0, 6)}.pdf\`, "Carta responsiva técnico freelance")} title="Descargar carta responsiva de técnico freelance" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#333] text-gray-500 hover:border-[#B3985B]/50 hover:text-[#B3985B] transition-colors"><FileText strokeWidth={1.75} className="w-3 h-3" /> Carta</button>
                      )}`;

const btnReplacement = `{p.tecnico && (() => {
                        const r = proyecto.responsivas?.find((r: any) => r.tecnicoId === p.tecnicoId);
                        const stateProps = !r || r.status === 'PENDIENTE'
                          ? { cls: 'border-[#333] text-gray-600', text: 'Carta', title: 'Responsiva pendiente' }
                          : r.status === 'RECIBIDA'
                            ? { cls: 'border-yellow-800/50 bg-yellow-900/20 text-yellow-500', text: 'Carta recibida', title: 'Pendiente de revisión' }
                            : r.status === 'VALIDADA'
                              ? { cls: 'border-green-800/50 bg-green-900/20 text-green-500', text: 'Carta validada', title: 'Responsiva revisada y aprobada', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> }
                              : r.status === 'REQUIERE_CORRECCION'
                                ? { cls: 'border-red-800/50 bg-red-900/20 text-red-500', text: 'Corregir carta', title: 'La responsiva requiere corrección' }
                                : { cls: 'border-[#333] text-gray-600', text: 'Carta', title: '' };
                        return (
                          <div title={stateProps.title} className={\`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border \${stateProps.cls}\`}>
                            {stateProps.icon || <FileText strokeWidth={1.75} className="w-3 h-3" />} {stateProps.text}
                          </div>
                        );
                      })()}`;

code = code.replace(btnTarget, btnReplacement);
fs.writeFileSync(path, code);
