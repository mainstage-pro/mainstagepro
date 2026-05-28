const fs = require('fs');
const file = '/Users/mauriciohernandez/mainstage-pro/src/app/(dashboard)/proyectos/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the exact closing sequence of the inventory groups inside the rider card
const MARKER = '                    ))}\n                  </div>\n                );\n              })()}\n            </div>\n\n\n\n            {/* ═══════ ZONA 1.25';

if (!content.includes(MARKER)) {
  console.error('MARKER NOT FOUND — searching for nearby text...');
  const idx = content.indexOf('══════ ZONA 1.25');
  console.log('ZONA 1.25 found at char', idx);
  console.log('Context around it:', JSON.stringify(content.slice(idx - 200, idx + 50)));
  process.exit(1);
}

const INSERTION = `                    ))}
                    {/* ── Equipos adicionales / terceros desde cotización ── */}
                    {(() => {
                      const extLineas = (proyecto.cotizacion?.lineas ?? []).filter(
                        (l: { tipo: string; descripcion: string }) =>
                          (l.tipo === "EQUIPO_EXTERNO" || l.tipo === "OTRO") && !!l.descripcion
                      ) as { id: string; tipo: string; descripcion: string; marca: string | null; cantidad: number; notas: string | null }[];
                      if (extLineas.length === 0) return null;
                      return (
                        <div>
                          <div className="px-4 py-1.5 bg-[#0a0a0a] border-b border-t border-[#1a1a1a] flex items-center gap-2">
                            <span className="text-[10px] text-orange-400/70 font-bold uppercase tracking-widest">Equipos adicionales / Terceros</span>
                            <span className="text-[10px] text-gray-600">desde cotización · sin verificación de inventario</span>
                          </div>
                          {extLineas.map(l => (
                            <div key={l.id} className="border-b border-[#0d0d0d] last:border-0 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white">
                                    {l.descripcion}
                                    {l.marca && <span className="text-gray-500"> · {l.marca}</span>}
                                  </p>
                                  {l.notas && <p className="text-gray-500 text-xs mt-0.5">{l.notas}</p>}
                                </div>
                                <span className="text-gray-400 text-xs shrink-0">×{l.cantidad}</span>
                                <span className={\`text-[10px] border px-1.5 py-0.5 rounded shrink-0 \${
                                  l.tipo === "EQUIPO_EXTERNO"
                                    ? "text-orange-400/70 border-orange-400/20"
                                    : "text-blue-400/70 border-blue-400/20"
                                }\`}>
                                  {l.tipo === "EQUIPO_EXTERNO" ? "Tercero" : "Adicional"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>



            {/* ═══════ ZONA 1.25`;

content = content.replace(MARKER, INSERTION);
fs.writeFileSync(file, content);
console.log('OK - external equipment section inserted in rider de carga');
