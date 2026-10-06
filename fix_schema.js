const fs = require('fs');

const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// Conflict 1: Proyecto Model
content = content.replace(
/<<<<<<< HEAD\n  sitePlanes         SitePlan\[\]\n  giraShow           GiraShow\?\n=======\n  ResponsivaTecnico  ResponsivaTecnico\[\]\n>>>>>>> b4160c23 \(Implementa módulo de Cartas Responsivas por Técnico\)/g,
`  sitePlanes         SitePlan[]
  giraShow           GiraShow?
  ResponsivaTecnico  ResponsivaTecnico[]`
);

// Conflict 2: Tecnico Model
content = content.replace(
/<<<<<<< HEAD\n  giraCrew            GiraCrew\[\]\n=======\n  ResponsivaTecnico   ResponsivaTecnico\[\]\n>>>>>>> b4160c23 \(Implementa módulo de Cartas Responsivas por Técnico\)/g,
`  giraCrew            GiraCrew[]
  ResponsivaTecnico   ResponsivaTecnico[]`
);

// Conflict 3: The whole model at the end (User model or at the end of the file?)
// Wait, the third conflict was at line 5940:
/*
<<<<<<< HEAD
// ═══════════════════════════════════════════════════════════════════════════════
// GIRAS — PRODUCTION MANAGEMENT DE ARTISTAS
...
=======
model ResponsivaTecnico {
...
>>>>>>> b4160c23
*/

