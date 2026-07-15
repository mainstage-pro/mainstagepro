<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployments
- Para desplegar en Vercel, usa siempre el comando `npx vercel` sin el flag `--prod`. De esta forma los cambios se subirán a una URL de preview y no afectarán a producción.
- Cuando necesites subir algo a producción, debes crear un Pull Request en GitHub. Yo lo revisaré y aprobaré, y al hacer merge se desplegará automáticamente.
