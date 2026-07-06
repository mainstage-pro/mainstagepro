<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:deployment-rules -->
# Deployment

After EVERY set of changes that passes `npm run build` with 0 errors, automatically run:

```
npx vercel --prod
```

Do NOT wait for the user to ask. Deploy immediately after a successful build as part of the normal workflow.
<!-- END:deployment-rules -->
