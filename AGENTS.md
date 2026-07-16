<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployments
- El deploy a producción se hace con **push directo a `main`** (Vercel tiene integración Git y auto-despliega). No hace falta abrir Pull Request.
- **Regla obligatoria antes de cualquier push a `main`:** correr `npm run build` y confirmar que compila en verde. Especialmente si el cambio toca `prisma/schema.prisma` o migraciones lazy — ese patrón ya causó dos caídas totales de producción.
- Para una URL de preview sin afectar producción, usa `npx vercel` sin el flag `--prod`.
