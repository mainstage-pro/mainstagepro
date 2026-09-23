const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/rrhh/nomina/page.tsx', 'utf8');

code = code.replace(/function proximoPago\(tipoPeriodo: string, desdeISO: string\): Date {[\s\S]*?return base;\n}/, 
`function proximoPago(tipoPeriodo: string, desdeISO: string): Date | null {
  if (tipoPeriodo === "EVENTO" || tipoPeriodo === "UNICO") return null;
  const [y, m, d] = desdeISO.substring(0, 10).split("-").map(Number);
  const base = new Date(y, m - 1, d);
  if (tipoPeriodo === "SEMANAL") base.setDate(base.getDate() + 7);
  else if (tipoPeriodo === "QUINCENAL") base.setDate(base.getDate() + 15);
  else base.setMonth(base.getMonth() + 1); // MENSUAL
  return base;
}`);

code = code.replace(/const prox = proximoPago\(pago.tipoPeriodo, data.fecha\);\n\s*setPagados\(prev => \({ \.\.\.prev, \[pago.id\]: fmtFechaCorta\(prox\) }\)\);/, 
`const prox = proximoPago(pago.tipoPeriodo, data.fecha);
    setPagados(prev => ({ ...prev, [pago.id]: prox ? fmtFechaCorta(prox) : "LIQUIDADO" }));`);

code = code.replace(/\{proxPago \? \`✓ Pagado · próximo \$\{proxPago\}\` : isConfirmando \? "Procesando\.\.\." : "✓ Confirmar pago"\}/, 
`{proxPago ? (proxPago === "LIQUIDADO" ? "✓ Pagado" : \`✓ Pagado · próximo \${proxPago}\`) : isConfirmando ? "Procesando..." : "✓ Confirmar pago"}`);

fs.writeFileSync('src/app/(dashboard)/rrhh/nomina/page.tsx', code);
