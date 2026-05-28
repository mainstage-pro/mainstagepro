const fs = require('fs');
const file = '/Users/mauriciohernandez/mainstage-pro/src/components/HojaEntregaRentaPDF.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the entire equipment logic + two sections (Equipment + Rider Accesorios)
// from the comment "Build equipment list" down to (not including) "Observaciones de cotización"
const OLD = `  // ─── Build equipment list: prefer cotizacion lineas, fall back to inventory ─
  const TIPO_LABELS: Record<string, string> = {
    EQUIPO_PROPIO:   "Equipo propio",
    EQUIPO_EXTERNO:  "Equipo externo / proveedor",
    PAQUETE:         "Paquetes",
    OTRO:            "Otros conceptos",
  };

  const useCot = (proyecto.cotizacion?.lineas?.length ?? 0) > 0;

  // Group cotizacion lineas by tipo
  const groupedCot: Record<string, CotizacionLinea[]> = {};
  if (useCot) {
    for (const l of proyecto.cotizacion!.lineas) {
      const key = TIPO_LABELS[l.tipo] ?? "Otros";
      if (!groupedCot[key]) groupedCot[key] = [];
      groupedCot[key].push(l);
    }
  }

  // Fallback: group inventory equipos by category
  const grouped: Record<string, ProyectoEquipo[]> = {};
  if (!useCot) {
    for (const eq of proyecto.equipos) {
      const cat = eq.equipo?.categoria?.nombre ?? "Otros";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(eq);
    }
  }
  const categories = useCot ? Object.keys(groupedCot) : Object.keys(grouped);

  const clienteNombre = proyecto.cliente?.empresa`;

const NEW = `  // ─── Build equipment list ─────────────────────────────────────────────────
  // Primary: proyecto.equipos grouped by category (with inline accessories).
  // Supplement: cotización OTRO/EXTERNO lines not covered by inventory.
  const groupedInv: Record<string, ProyectoEquipo[]> = {};
  for (const eq of proyecto.equipos) {
    const cat = eq.equipo?.categoria?.nombre ?? "Otros";
    if (!groupedInv[cat]) groupedInv[cat] = [];
    groupedInv[cat].push(eq);
  }

  // Cotización lines shown as supplementary items (OTRO, EXTERNO, and PROPIO when no inventory)
  const tiposExtra = proyecto.equipos.length === 0
    ? ["EQUIPO_PROPIO", "EQUIPO_EXTERNO", "OTRO"]
    : ["EQUIPO_EXTERNO", "OTRO"];
  const cotExtras = (proyecto.cotizacion?.lineas ?? []).filter(
    l => tiposExtra.includes(l.tipo) && !!l.descripcion
  );

  const hasInventory = proyecto.equipos.length > 0;
  const hasCotExtras = cotExtras.length > 0;

  const clienteNombre = proyecto.cliente?.empresa`;

if (!content.includes(OLD)) { console.error('OLD header not found'); process.exit(1); }
content = content.replace(OLD, NEW);

// Now replace the "Equipment section" JSX (lines 610-744) with new inline-accessories version
// Find from sectionHeader "RELACIÓN DE EQUIPOS" through end of "RIDER DE ACCESORIOS" section
const OLD_TABLE = `          {/* ── Equipment section ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeaderText}>RELACIÓN DE EQUIPOS ENTREGADOS</Text>
          </View>

          {categories.length > 0 ? (
            categories.map((cat) => (
              <View key={cat}>
                <View style={s.subSectionHeader}>
                  <Text style={s.subSectionHeaderText}>{cat.toUpperCase()}</Text>
                </View>
                <View style={s.tableWrapper}>
                  {/* Table header */}
                  <View style={s.tableHeader}>
                    <View style={s.colModelo}><Text style={s.colHeaderText}>MARCA / MODELO / DESCRIPCIÓN</Text></View>
                    <View style={s.colQty}><Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text></View>
                    <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.colHeaderText}>NÚMERO DE SERIE / ID INVENTARIO</Text></View>
                  </View>
                  {/* Equipment rows from cotización */}
                  {useCot ? groupedCot[cat].map((l, i) => {
                    const nombre = \`\${l.marca ? l.marca + " " : ""}\${l.descripcion}\`;
                    return (
                      <View key={l.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                        <View style={s.colModelo}>
                          <Text style={s.cellText}>{nombre}</Text>
                          {l.notas ? <Text style={{ fontSize: 6, color: LIGHT, fontStyle: "italic", marginTop: 1 }}>{l.notas}</Text> : null}
                        </View>
                        <View style={s.colQty}><Text style={[s.cellText, { textAlign: "center" }]}>{l.cantidad}</Text></View>
                        <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.cellText}> </Text></View>
                      </View>
                    );
                  }) : grouped[cat].map((eq, i) => {
                    const nombre = eq.equipo
                      ? \`\${eq.equipo.marca ? eq.equipo.marca + " " : ""}\${eq.equipo.descripcion}\`
                      : (eq.descripcionManual ?? "");
                    return (
                      <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                        <View style={s.colModelo}><Text style={s.cellText}>{nombre}</Text></View>
                        <View style={s.colQty}><Text style={[s.cellText, { textAlign: "center" }]}>{eq.cantidad}</Text></View>
                        <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.cellText}> </Text></View>
                      </View>
                    );
                  })}
                  {/* Extra blank rows */}
                  <EmptyRows count={Math.max(1, 4 - (useCot ? groupedCot[cat].length : grouped[cat].length))} />
                </View>
              </View>
            ))
          ) : (
            <View>
              <View style={s.subSectionHeader}>
                <Text style={s.subSectionHeaderText}>EQUIPO</Text>
              </View>
              <View style={s.tableWrapper}>
                <View style={s.tableHeader}>
                  <View style={s.colModelo}><Text style={s.colHeaderText}>MARCA / MODELO / DESCRIPCIÓN</Text></View>
                  <View style={s.colQty}><Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text></View>
                  <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.colHeaderText}>NÚMERO DE SERIE / ID INVENTARIO</Text></View>
                </View>
                <EmptyRows count={12} />
              </View>
            </View>
          )}

          {/* ── Observaciones de cotización ── */}
          {proyecto.cotizacion?.observaciones ? (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionHeaderText}>NOTAS Y OBSERVACIONES</Text>
              </View>
              <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: BORDER, marginBottom: 10, padding: 9 }}>
                <Text style={{ fontSize: 7, color: GRAY, lineHeight: 1.6 }}>{proyecto.cotizacion.observaciones}</Text>
              </View>
            </>
          ) : null}


          {/* ── Rider de accesorios (si hay accesorios registrados) ── */}
          {proyecto.equipos.some(e => (e.riderAccesorios?.length ?? 0) > 0) && (() => {
            const equiposConAcc = proyecto.equipos.filter(e => (e.riderAccesorios?.length ?? 0) > 0);
            return (
              <>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionHeaderText}>RIDER DE ACCESORIOS Y HERRAMIENTAS</Text>
                </View>
                <View style={[s.tableWrapper, { marginBottom: 12 }]}>
                  {/* Header */}
                  <View style={[s.tableHeader, { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                    <View style={{ flex: 4, paddingVertical: 4, paddingHorizontal: 7, borderRightWidth: 1, borderRightColor: BORDER }}>
                      <Text style={s.colHeaderText}>EQUIPO / ACCESORIO</Text>
                    </View>
                    <View style={{ width: 32, paddingVertical: 4, paddingHorizontal: 5, borderRightWidth: 1, borderRightColor: BORDER, textAlign: "center" }}>
                      <Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text>
                    </View>
                    <View style={{ width: 34, alignItems: "center", justifyContent: "center", paddingVertical: 4 }}>
                      <Text style={s.checkHeaderLabel}>CHECK</Text>
                    </View>
                  </View>
                  {/* Rows per equipment */}
                  {equiposConAcc.map((eq, ei) => {
                    const nombre = eq.equipo
                      ? \`\${eq.equipo.marca ? eq.equipo.marca + " " : ""}\${eq.equipo.descripcion}\`
                      : (eq.descripcionManual ?? "");
                    return (
                      <View key={ei}>
                        {/* Equipment header row */}
                        <View style={{ flexDirection: "row", backgroundColor: "#F0EDE6", borderBottomWidth: 1, borderBottomColor: BORDER, minHeight: 18 }}>
                          <View style={{ flex: 4, paddingVertical: 4, paddingHorizontal: 7, borderRightWidth: 1, borderRightColor: BORDER }}>
                            <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK }}>{nombre}</Text>
                          </View>
                          <View style={{ width: 32, paddingVertical: 4, paddingHorizontal: 5, borderRightWidth: 1, borderRightColor: BORDER, textAlign: "center" }}>
                            <Text style={{ fontSize: 7.5, textAlign: "center", color: BLACK }}>{eq.cantidad}</Text>
                          </View>
                          <View style={{ width: 34 }} />
                        </View>
                        {/* Accessory rows */}
                        {(eq.riderAccesorios ?? []).map((acc, ai) => (
                          <View key={ai} style={[s.checklistRow, { borderBottomColor: "#E8E8E8" }]}>
                            <View style={{ flex: 4, paddingVertical: 3, paddingHorizontal: 7, paddingLeft: 18, borderRightWidth: 1, borderRightColor: BORDER, flexDirection: "row", gap: 4 }}>
                              <Text style={{ fontSize: 6.5, color: LIGHT }}>↳</Text>
                              <Text style={{ fontSize: 7, color: GRAY, flex: 1 }}>{acc.nombre}{acc.categoria ? \` (\${acc.categoria})\` : ""}</Text>
                            </View>
                            <View style={{ width: 32, paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 1, borderRightColor: BORDER, textAlign: "center" }}>
                              <Text style={{ fontSize: 7, textAlign: "center", color: BLACK }}>x{acc.cantidad}</Text>
                            </View>
                            <View style={s.checkBox}><View style={s.checkBoxInner} /></View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              </>
            );
          })()}`;

const NEW_TABLE = `          {/* ── Equipment section with inline accessories ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeaderText}>RELACIÓN DE EQUIPOS ENTREGADOS</Text>
          </View>

          {hasInventory ? (
            /* ── Inventory equipos grouped by category, accessories as sub-rows ── */
            Object.entries(groupedInv).map(([cat, items]) => (
              <View key={cat}>
                <View style={s.subSectionHeader}>
                  <Text style={s.subSectionHeaderText}>{cat.toUpperCase()}</Text>
                </View>
                <View style={s.tableWrapper}>
                  {/* Table header */}
                  <View style={s.tableHeader}>
                    <View style={s.colModelo}><Text style={s.colHeaderText}>MARCA / MODELO / DESCRIPCIÓN</Text></View>
                    <View style={s.colQty}><Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text></View>
                    <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.colHeaderText}>NÚMERO DE SERIE / ID  ·  ✓</Text></View>
                  </View>
                  {items.map((eq, i) => {
                    const nombre = eq.equipo
                      ? \`\${eq.equipo.marca ? eq.equipo.marca + " " : ""}\${eq.equipo.descripcion}\`
                      : (eq.descripcionManual ?? "");
                    const hasAcc = (eq.riderAccesorios?.length ?? 0) > 0;
                    return (
                      <View key={i}>
                        {/* Main equipment row */}
                        <View style={[
                          i % 2 === 0 ? s.tableRow : s.tableRowAlt,
                          hasAcc ? { borderBottomWidth: 0 } : {}
                        ]}>
                          <View style={s.colModelo}>
                            <Text style={[s.cellText, { fontFamily: "Helvetica-Bold" }]}>{nombre}</Text>
                          </View>
                          <View style={s.colQty}>
                            <Text style={[s.cellText, { textAlign: "center", fontFamily: "Helvetica-Bold" }]}>{eq.cantidad}</Text>
                          </View>
                          <View style={[s.colSerie, { borderRightWidth: 0 }]}>
                            <Text style={s.cellText}> </Text>
                          </View>
                        </View>
                        {/* Accessory sub-rows inline */}
                        {(eq.riderAccesorios ?? []).map((acc, ai) => (
                          <View key={ai} style={{
                            flexDirection: "row",
                            borderBottomWidth: 1,
                            borderBottomColor: "#EBEBEB",
                            minHeight: 16,
                            backgroundColor: i % 2 === 0 ? "#FAFAF8" : "#F5F3EE",
                          }}>
                            <View style={[s.colModelo, { flexDirection: "row", gap: 5, paddingLeft: 16, alignItems: "center" }]}>
                              <Text style={{ fontSize: 6, color: GOLD }}>↳</Text>
                              <Text style={{ fontSize: 7, color: GRAY, flex: 1 }}>
                                {acc.nombre}{acc.categoria ? \` · \${acc.categoria}\` : ""}
                              </Text>
                            </View>
                            <View style={[s.colQty, { alignItems: "center", justifyContent: "center" }]}>
                              <Text style={{ fontSize: 6.5, color: GRAY, textAlign: "center" }}>×{acc.cantidad}</Text>
                            </View>
                            <View style={[s.colSerie, { borderRightWidth: 0, alignItems: "center", justifyContent: "center" }]}>
                              <View style={{ width: 10, height: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 1 }} />
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                  <EmptyRows count={Math.max(1, 3 - items.length)} />
                </View>
              </View>
            ))
          ) : hasCotExtras ? (
            /* ── Cotización items only (no inventory linked) ── */
            <View>
              <View style={s.subSectionHeader}>
                <Text style={s.subSectionHeaderText}>EQUIPO</Text>
              </View>
              <View style={s.tableWrapper}>
                <View style={s.tableHeader}>
                  <View style={s.colModelo}><Text style={s.colHeaderText}>MARCA / MODELO / DESCRIPCIÓN</Text></View>
                  <View style={s.colQty}><Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text></View>
                  <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.colHeaderText}>NÚMERO DE SERIE / ID INVENTARIO</Text></View>
                </View>
                {cotExtras.map((l, i) => {
                  const nombre = \`\${l.marca ? l.marca + " " : ""}\${l.descripcion}\`;
                  return (
                    <View key={l.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                      <View style={s.colModelo}>
                        <Text style={s.cellText}>{nombre}</Text>
                        {l.notas ? <Text style={{ fontSize: 6, color: LIGHT, fontStyle: "italic", marginTop: 1 }}>{l.notas}</Text> : null}
                      </View>
                      <View style={s.colQty}><Text style={[s.cellText, { textAlign: "center" }]}>{l.cantidad}</Text></View>
                      <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.cellText}> </Text></View>
                    </View>
                  );
                })}
                <EmptyRows count={Math.max(1, 4 - cotExtras.length)} />
              </View>
            </View>
          ) : (
            /* ── Empty state ── */
            <View>
              <View style={s.subSectionHeader}>
                <Text style={s.subSectionHeaderText}>EQUIPO</Text>
              </View>
              <View style={s.tableWrapper}>
                <View style={s.tableHeader}>
                  <View style={s.colModelo}><Text style={s.colHeaderText}>MARCA / MODELO / DESCRIPCIÓN</Text></View>
                  <View style={s.colQty}><Text style={[s.colHeaderText, { textAlign: "center" }]}>QTY</Text></View>
                  <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.colHeaderText}>NÚMERO DE SERIE / ID INVENTARIO</Text></View>
                </View>
                <EmptyRows count={12} />
              </View>
            </View>
          )}

          {/* ── Equipos adicionales de cotización (cuando SÍ hay inventario vinculado) ── */}
          {hasInventory && hasCotExtras && (
            <>
              <View style={[s.subSectionHeader, { marginTop: 4 }]}>
                <Text style={s.subSectionHeaderText}>EQUIPOS ADICIONALES / TERCEROS (COTIZACIÓN)</Text>
              </View>
              <View style={[s.tableWrapper, { marginBottom: 8 }]}>
                {cotExtras.map((l, i) => {
                  const nombre = \`\${l.marca ? l.marca + " " : ""}\${l.descripcion}\`;
                  return (
                    <View key={l.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                      <View style={s.colModelo}>
                        <Text style={s.cellText}>{nombre}</Text>
                        {l.notas ? <Text style={{ fontSize: 6, color: LIGHT, fontStyle: "italic", marginTop: 1 }}>{l.notas}</Text> : null}
                      </View>
                      <View style={s.colQty}><Text style={[s.cellText, { textAlign: "center" }]}>{l.cantidad}</Text></View>
                      <View style={[s.colSerie, { borderRightWidth: 0 }]}><Text style={s.cellText}> </Text></View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Observaciones de cotización ── */}
          {proyecto.cotizacion?.observaciones ? (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionHeaderText}>NOTAS Y OBSERVACIONES</Text>
              </View>
              <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: BORDER, marginBottom: 10, padding: 9 }}>
                <Text style={{ fontSize: 7, color: GRAY, lineHeight: 1.6 }}>{proyecto.cotizacion.observaciones}</Text>
              </View>
            </>
          ) : null}`;

if (!content.includes(OLD_TABLE)) {
  console.error('OLD_TABLE not found');
  // Find closest section
  const idx = content.indexOf('RELACIÓN DE EQUIPOS ENTREGADOS');
  console.log('RELACIÓN found at char', idx);
  process.exit(1);
}
content = content.replace(OLD_TABLE, NEW_TABLE);

fs.writeFileSync(file, content);
console.log('OK - HojaEntregaRentaPDF now shows accessories as inline sub-rows');
