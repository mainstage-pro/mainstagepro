const fs = require('fs');

function fixSyntax(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\(context: any\)/g, 'context: any');
  fs.writeFileSync(file, content);
}
fixSyntax('src/app/api/proyectos/[id]/responsivas/route.ts');
fixSyntax('src/app/api/public/responsiva/[token]/route.ts');
fixSyntax('src/app/api/responsivas/[id]/status/route.ts');
