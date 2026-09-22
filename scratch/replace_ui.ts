import fs from 'fs';

const path = 'src/app/(dashboard)/rrhh/nomina/page.tsx';
let code = fs.readFileSync(path, 'utf-8');

code = code.replace(
  /<p className="text-white text-sm font-medium">\{pago\.personal\.nombre\}<\/p>/g,
  '<p className="text-white text-sm font-medium">{pago.personal?.nombre || pago.tecnico?.nombre}</p>'
);

code = code.replace(
  /<span className=\{\`text-\[10px\] px-1.5 py-0.5 rounded font-medium \$\{DEPTO_COLORS\[pago\.personal\.departamento\] \?\? DEPTO_COLORS\.GENERAL\}\`\}>\n\s*\{pago\.personal\.departamento\}\n\s*<\/span>/,
  `{pago.personal && (
                              <span className={\`text-[10px] px-1.5 py-0.5 rounded font-medium \${DEPTO_COLORS[pago.personal.departamento] ?? DEPTO_COLORS.GENERAL}\`}>
                                {pago.personal.departamento}
                              </span>
                            )}
                            {pago.tecnico && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-800 text-gray-400">
                                FREELANCE
                              </span>
                            )}`
);

code = code.replace(
  /<p className="text-gray-500 text-xs">\{pago\.personal\.puesto\}<\/p>/,
  '<p className="text-gray-500 text-xs">{pago.personal?.puesto || "Técnico (Directorio)"}</p>'
);

code = code.replace(
  /\{pago\.personal\.cuentaBancaria && \(\n\s*<p className="text-gray-700 text-xs mt-0.5">Cuenta: \{pago\.personal\.cuentaBancaria\}<\/p>\n\s*\)\}/,
  `{pago.personal?.cuentaBancaria && (
                            <p className="text-gray-700 text-xs mt-0.5">Cuenta: {pago.personal.cuentaBancaria}</p>
                          )}`
);

// also in the table (historial)
code = code.replace(
  /<td className="ms-td text-sm font-medium text-white max-w-\[200px\] truncate">\{p\.personal\.nombre\}<\/td>/,
  '<td className="ms-td text-sm font-medium text-white max-w-[200px] truncate">{p.personal?.nombre || p.tecnico?.nombre}</td>'
);

fs.writeFileSync(path, code);
