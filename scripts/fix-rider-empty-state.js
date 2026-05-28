const fs = require('fs');
const file = '/Users/mauriciohernandez/mainstage-pro/src/app/(dashboard)/proyectos/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The old ternary that ignores cotización lines when riderEquipos is empty
const OLD_EMPTY_STATE = `              {riderEquipos.length === 0 ? (
                <div className="bg-[#111] border border-[#222] rounded-xl py-12 text-center">
                  <p className="text-gray-600 text-sm">Sin equipos en este proyecto</p>
                  <p className="text-gray-700 text-xs mt-1">Agrega equipos en la pestaña Equipos</p>
                </div>
              ) : (() => {
                const grupos: Record<string, typeof riderEquipos> = {};
                for (const e of riderEquipos) { const cat = e.equipo.categoria.nombre; if (!grupos[cat]) grupos[cat] = []; grupos[cat].push(e); }
                return (
                  <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                    {Object.entries(grupos).map(([cat, items]) => (`;

const NEW_EMPTY_STATE = `              {(() => {
                // Compute cotización additional lines FIRST so empty state is aware of them
                const cotLineas = (proyecto.cotizacion?.lineas ?? []).filter(
                  (l: { tipo: string; descripcion: string }) =>
                    (l.tipo === "EQUIPO_EXTERNO" || l.tipo === "OTRO") && !!l.descripcion
                ) as { id: string; tipo: string; descripcion: string; marca: string | null; cantidad: number; notas: string | null }[];

                if (riderEquipos.length === 0 && cotLineas.length === 0) {
                  return (
                    <div className="bg-[#111] border border-[#222] rounded-xl py-12 text-center">
                      <p className="text-gray-600 text-sm">Sin equipos en este proyecto</p>
                      <p className="text-gray-700 text-xs mt-1">Agrega equipos en la pestaña Equipos o cotización</p>
                    </div>
                  );
                }

                const grupos: Record<string, typeof riderEquipos> = {};
                for (const e of riderEquipos) { const cat = e.equipo.categoria.nombre; if (!grupos[cat]) grupos[cat] = []; grupos[cat].push(e); }
                return (
                  <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                    {Object.entries(grupos).map(([cat, items]) => (`;

if (!content.includes(OLD_EMPTY_STATE)) {
  console.error('OLD_EMPTY_STATE NOT FOUND');
  process.exit(1);
}
content = content.replace(OLD_EMPTY_STATE, NEW_EMPTY_STATE);

// Now find and remove the duplicate extLineas block that was added inside the inventory-only branch
// (since we now compute cotLineas outside)
const OLD_EXT_BLOCK = `                    {/* ── Equipos adicionales / terceros desde cotización ── */}
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
              })()}`;

const NEW_EXT_BLOCK = `                    {/* ── Equipos adicionales / terceros desde cotización ── */}
                    {cotLineas.length > 0 && (
                      <div>
                        <div className="px-4 py-1.5 bg-[#0a0a0a] border-b border-t border-[#1a1a1a] flex items-center gap-2">
                          <span className="text-[10px] text-orange-400/70 font-bold uppercase tracking-widest">Equipos adicionales / Terceros</span>
                          <span className="text-[10px] text-gray-600">desde cotización · sin verificación de inventario</span>
                        </div>
                        {cotLineas.map(l => (
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
                    )}
                  </div>
                );
              })()}`;

if (!content.includes(OLD_EXT_BLOCK)) {
  console.error('OLD_EXT_BLOCK NOT FOUND');
  // Debug
  const idx = content.indexOf('Equipos adicionales / terceros desde cotización');
  console.log('Found at char', idx);
  process.exit(1);
}
content = content.replace(OLD_EXT_BLOCK, NEW_EXT_BLOCK);

// Also update the "Imprimir rider" button to show when either inventory OR cotLineas exist
const OLD_PRINT_BTN = `                {riderEquipos.length > 0 && (
                  <a href={`;
const NEW_PRINT_BTN = `                {(riderEquipos.length > 0 || (proyecto.cotizacion?.lineas ?? []).some((l: {tipo:string}) => l.tipo === "EQUIPO_EXTERNO" || l.tipo === "OTRO")) && (
                  <a href={`;

if (!content.includes(OLD_PRINT_BTN)) {
  console.error('OLD_PRINT_BTN NOT FOUND');
  process.exit(1);
}
content = content.replace(OLD_PRINT_BTN, NEW_PRINT_BTN);

fs.writeFileSync(file, content);
console.log('OK - Rider now shows cotización OTRO/EXTERNO lines even when riderEquipos is empty');
