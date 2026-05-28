const fs = require('fs');
const file = '/Users/mauriciohernandez/mainstage-pro/src/app/(dashboard)/proyectos/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const OLD = `          {/* ── Logística de renta (solo si tipoServicio === RENTA) ── */}
          {esRenta && (() => {
            // Leer datos de renta: primero de logisticaRenta del proyecto, luego del trato
            let rentaData: Record<string, string> = {};
            try {
              if (proyecto.logisticaRenta) {
                rentaData = JSON.parse(proyecto.logisticaRenta);
              } else if (proyecto.trato?.ideasReferencias) {
                const d = JSON.parse(proyecto.trato.ideasReferencias);
                if (d && typeof d === "object" && (d.nivelServicio || d.modalidadServicio || d.fechaEntrega)) rentaData = d;
              }
            } catch { /* vacío */ }

            const NIVEL_LABELS: Record<string, string> = {
              SOLO_RENTA: "Solo renta (cliente recoge)",
              RENTA_ENTREGA: "Renta + entrega",
              RENTA_MONTAJE: "Renta + montaje",
              RENTA_FULL: "Renta + operación",
            };
            const ENTREGA_LABELS: Record<string, string> = {
              RECOGE_BODEGA: "Recoge en bodega (Querétaro)",
              ENTREGA_BODEGA: "Llevamos a su bodega",
              ENTREGA_VENUE: "Llevamos al venue",
            };

            return (
              <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Logística de renta</p>
                  <span className="text-[10px] text-[#B3985B]/50 bg-[#B3985B]/8 px-2 py-0.5 rounded-full">RENTA DE EQUIPO</span>
                </div>
                <p className="text-gray-600 text-xs mb-4">Datos capturados en el descubrimiento del trato. Para modificarlos, edita el trato.</p>
                {Object.keys(rentaData).length === 0 ? (
                  <p className="text-gray-600 text-sm italic">Sin datos de logística. Completa el descubrimiento en el trato asociado para ver esta información.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    {(rentaData.nivelServicio || rentaData.modalidadServicio) && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Nivel de servicio</p>
                        <p className="text-white">{NIVEL_LABELS[rentaData.nivelServicio ?? rentaData.modalidadServicio] ?? (rentaData.nivelServicio ?? rentaData.modalidadServicio)}</p>
                      </div>
                    )}
                    {(rentaData.entrega || rentaData.modalidadEntrega) && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Modalidad de entrega</p>
                        <p className="text-white">{ENTREGA_LABELS[rentaData.entrega ?? rentaData.modalidadEntrega] ?? (rentaData.entrega ?? rentaData.modalidadEntrega)}</p>
                      </div>
                    )}
                    {rentaData.fechaEntrega && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Fecha de entrega</p>
                        <p className="text-white">{fmtDate(rentaData.fechaEntrega)}{rentaData.horaEntrega ? \` · \${rentaData.horaEntrega}\` : ""}</p>
                      </div>
                    )}
                    {rentaData.fechaDevolucion && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Fecha de devolución/recolección</p>
                        <p className="text-white">{fmtDate(rentaData.fechaDevolucion)}{rentaData.horaDevolucion ? \` · \${rentaData.horaDevolucion}\` : ""}</p>
                      </div>
                    )}
                    {rentaData.direccionEntrega && (
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs mb-1">Dirección de entrega</p>
                        <p className="text-white">{rentaData.direccionEntrega}</p>
                      </div>
                    )}
                    {rentaData.tecnicoPropio !== undefined && rentaData.tecnicoPropio !== "" && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">¿Cliente tiene técnico propio?</p>
                        <p className="text-white">{rentaData.tecnicoPropio === "SI" ? "Sí" : rentaData.tecnicoPropio === "NO" ? "No" : rentaData.tecnicoPropio}</p>
                      </div>
                    )}
                    {rentaData.descripcionEquipos && (
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs mb-1">Descripción de equipos solicitados</p>
                        <p className="text-gray-300 whitespace-pre-wrap">{rentaData.descripcionEquipos}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}`;

const NEW = `          {/* ── Logística de renta (editable) ── */}
          {esRenta && (() => {
            // Leer datos: primero logisticaRenta del proyecto, si no del trato
            let rentaData: Record<string, string> = {};
            try {
              if (proyecto.logisticaRenta) {
                rentaData = JSON.parse(proyecto.logisticaRenta);
              } else if (proyecto.trato?.ideasReferencias) {
                const d = JSON.parse(proyecto.trato.ideasReferencias);
                if (d && typeof d === "object" && (d.nivelServicio || d.modalidadServicio || d.fechaEntrega)) rentaData = d;
              }
            } catch { /* vacío */ }

            // Guarda un campo específico dentro del JSON de logisticaRenta
            function saveRentaField(field: string, value: string) {
              const updated = { ...rentaData, [field]: value };
              guardarCampo("logisticaRenta", JSON.stringify(updated));
            }

            const inputCls = "w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#B3985B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors";
            const labelCls = "text-gray-500 text-xs mb-1 block";

            return (
              <div className="bg-[#111] border border-[#B3985B]/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-[#B3985B] font-semibold uppercase tracking-wider">Logística de renta</p>
                  <span className="text-[10px] text-[#B3985B]/50 bg-[#B3985B]/8 px-2 py-0.5 rounded-full">RENTA DE EQUIPO</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  {/* Nivel de servicio */}
                  <div>
                    <label className={labelCls}>Nivel de servicio</label>
                    <select
                      value={rentaData.nivelServicio ?? rentaData.modalidadServicio ?? ""}
                      onChange={e => saveRentaField("nivelServicio", e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="SOLO_RENTA">Solo renta (cliente recoge)</option>
                      <option value="RENTA_ENTREGA">Renta + entrega</option>
                      <option value="RENTA_MONTAJE">Renta + montaje</option>
                      <option value="RENTA_FULL">Renta + operación</option>
                    </select>
                  </div>

                  {/* Modalidad de entrega */}
                  <div>
                    <label className={labelCls}>Modalidad de entrega</label>
                    <select
                      value={rentaData.entrega ?? rentaData.modalidadEntrega ?? ""}
                      onChange={e => saveRentaField("entrega", e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="RECOGE_BODEGA">Recoge en bodega (Querétaro)</option>
                      <option value="ENTREGA_BODEGA">Llevamos a su bodega</option>
                      <option value="ENTREGA_VENUE">Llevamos al venue</option>
                    </select>
                  </div>

                  {/* Fecha y hora de entrega */}
                  <div>
                    <label className={labelCls}>Fecha de entrega</label>
                    <input
                      type="date"
                      value={rentaData.fechaEntrega ?? ""}
                      onChange={e => saveRentaField("fechaEntrega", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Hora de entrega</label>
                    <TimePicker
                      value={rentaData.horaEntrega ?? ""}
                      onChange={v => saveRentaField("horaEntrega", v)}
                    />
                  </div>

                  {/* Fecha y hora de devolución / recolección */}
                  <div>
                    <label className={labelCls}>Fecha de devolución / recolección</label>
                    <input
                      type="date"
                      value={rentaData.fechaDevolucion ?? ""}
                      onChange={e => saveRentaField("fechaDevolucion", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Hora de devolución / recolección</label>
                    <TimePicker
                      value={rentaData.horaDevolucion ?? ""}
                      onChange={v => saveRentaField("horaDevolucion", v)}
                    />
                  </div>

                  {/* Dirección de entrega */}
                  <div className="col-span-2">
                    <label className={labelCls}>Dirección de entrega</label>
                    <Campo
                      label=""
                      noLabel
                      value={rentaData.direccionEntrega ?? null}
                      field="logisticaRenta"
                      onSave={(_, v) => saveRentaField("direccionEntrega", v)}
                    />
                  </div>

                  {/* Contacto en punto de entrega */}
                  <div>
                    <label className={labelCls}>Contacto en punto de entrega</label>
                    <Campo
                      label=""
                      noLabel
                      value={rentaData.contactoEntrega ?? null}
                      field="logisticaRenta"
                      onSave={(_, v) => saveRentaField("contactoEntrega", v)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Tel. contacto entrega</label>
                    <Campo
                      label=""
                      noLabel
                      value={rentaData.telContactoEntrega ?? null}
                      field="logisticaRenta"
                      onSave={(_, v) => saveRentaField("telContactoEntrega", v)}
                    />
                  </div>

                  {/* ¿Cliente tiene técnico propio? */}
                  <div>
                    <label className={labelCls}>¿Cliente tiene técnico propio?</label>
                    <select
                      value={rentaData.tecnicoPropio ?? ""}
                      onChange={e => saveRentaField("tecnicoPropio", e.target.value)}
                      className={inputCls + " cursor-pointer"}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="SI">Sí</option>
                      <option value="NO">No</option>
                    </select>
                  </div>

                  {/* Notas adicionales de logística */}
                  <div className="col-span-2">
                    <label className={labelCls}>Notas adicionales de logística</label>
                    <Campo
                      label=""
                      noLabel
                      multiline
                      value={rentaData.notasLogistica ?? rentaData.descripcionEquipos ?? null}
                      field="logisticaRenta"
                      onSave={(_, v) => saveRentaField("notasLogistica", v)}
                    />
                  </div>
                </div>
              </div>
            );
          })()}`;

if (!content.includes(OLD)) {
  console.error('TARGET NOT FOUND');
  // Show nearby context
  const idx = content.indexOf('Logística de renta (solo si tipoServicio');
  console.log('Found at', idx, '— context:', content.slice(idx, idx + 100));
  process.exit(1);
}

content = content.replace(OLD, NEW);
fs.writeFileSync(file, content);
console.log('OK - logisticaRenta section replaced with editable form');
