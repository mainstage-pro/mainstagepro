const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/socios/page.tsx', 'utf8');

code = code.replace(/const \[repartos, setRepartos\] = useState<RepartoHistorial\[\]>\(\[\]\);\n/, '');
code = code.replace(/const \[cxpTodos, setCxpTodos\] = useState<CxPItem\[\]>\(\[\]\);\n/, '');

code = code.replace(/const \[sr, rr, cr\] = await Promise\.all\(\[\n\s*fetch\("\/api\/socios", { cache: "no-store" }\),\n\s*fetch\("\/api\/finanzas\/repartos", { cache: "no-store" }\),\n\s*fetch\("\/api\/cuentas-pagar", { cache: "no-store" }\),\n\s*\]\);\n\s*const sd = await sr\.json\(\)\.catch\(\(\) => \({ socios: \[\] }\)\);\n\s*const rd = await rr\.json\(\)\.catch\(\(\) => \({ repartos: \[\] }\)\);\n\s*const cd = await cr\.json\(\)\.catch\(\(\) => \[\]\);\n\s*setSocios\(sd\.socios \|\| \[\]\);\n\s*setRepartos\(rd\.repartos \|\| \[\]\);\n\s*setCxpTodos\(Array\.isArray\(cd\) \? cd : \[\]\);/g, 
`const sr = await fetch("/api/socios", { cache: "no-store" });
    const sd = await sr.json().catch(() => ({ socios: [] }));
    setSocios(sd.socios || []);`);

// remove useMemos
code = code.replace(/\/\/ Repartos activos por socio[\s\S]*?\]\);\n\n/g, '');

// check if cxpPorSocio still there
code = code.replace(/\/\/ CxP agrupadas por socioId[\s\S]*?\]\);\n\n/g, '');

fs.writeFileSync('src/app/(dashboard)/socios/page.tsx', code);
