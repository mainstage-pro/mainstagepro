const fs = require('fs');

function patchRoute(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\{ params \}: \{ params: \{ ([^}]+) \} \}/g, '(context: any)');
  content = content.replace(/params\.([a-zA-Z0-9_]+)/g, '(await context.params).$1');
  fs.writeFileSync(file, content);
}

patchRoute('src/app/api/proyectos/[id]/responsivas/route.ts');
patchRoute('src/app/api/public/responsiva/[token]/route.ts');
patchRoute('src/app/api/responsivas/[id]/status/route.ts');

function patchPage(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\{ params \}: \{ params: \{ ([^}]+) \} \}/g, 'props: { params: Promise<{ $1 }> }');
  // Then we need to unwrap inside
  content = content.replace(/export default function ([A-Za-z0-9_]+)\(props: \{ params: Promise<\{ ([^}]+) \}> \}\) \{/g,
    `import { use } from "react";\nexport default function $1(props: { params: Promise<{ $2 }> }) {\n  const params = use(props.params);`
  );
  fs.writeFileSync(file, content);
}

patchPage('src/app/(dashboard)/proyectos/[id]/responsivas/page.tsx');
patchPage('src/app/responsiva/[token]/page.tsx');

