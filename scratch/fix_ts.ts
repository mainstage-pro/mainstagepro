import fs from 'fs';

let p1 = 'src/app/api/admin/reportes/estado-resultados/pdf/route.ts';
let c1 = fs.readFileSync(p1, 'utf-8');
c1 = c1.replace(
  /\{ text: n\.personal\.nombre, style: 'tableCell' \},/g,
  "{ text: n.personal?.nombre || n.tecnico?.nombre || 'Desconocido', style: 'tableCell' },"
);
c1 = c1.replace(
  /\{ text: n\.personal\.puesto, style: 'tableCell' \},/g,
  "{ text: n.personal?.puesto || 'Técnico / Externo', style: 'tableCell' },"
);
c1 = c1.replace(
  /\{ text: n\.personal\.departamento, style: 'tableCell' \},/g,
  "{ text: n.personal?.departamento || 'Sin área', style: 'tableCell' },"
);
fs.writeFileSync(p1, c1);

let p2 = 'src/app/api/admin/reportes/estado-resultados/route.ts';
let c2 = fs.readFileSync(p2, 'utf-8');
c2 = c2.replace(
  /const area = n\.personal\.departamento \?\? "Sin área";/g,
  'const area = n.personal?.departamento ?? "Sin área";'
);
c2 = c2.replace(
  /nombre: n\.personal\.nombre,/g,
  'nombre: n.personal?.nombre || n.tecnico?.nombre || "Desconocido",'
);
c2 = c2.replace(
  /puesto: n\.personal\.puesto,/g,
  'puesto: n.personal?.puesto || "Técnico",'
);
c2 = c2.replace(
  /area: n\.personal\.departamento,/g,
  'area: n.personal?.departamento || "Sin área",'
);
fs.writeFileSync(p2, c2);

let p3 = 'src/app/api/rrhh/personal/[id]/pagos/[pagoId]/route.ts';
let c3 = fs.readFileSync(p3, 'utf-8');
c3 = c3.replace(
  /concepto: pago\.concepto \?\? \`Nómina \$\{pago\.periodo\} — \$\{pago\.personal\.nombre\}\`,/g,
  'concepto: pago.concepto ?? `Nómina ${pago.periodo} — ${pago.personal?.nombre || "Desconocido"}`, '
);
fs.writeFileSync(p3, c3);
