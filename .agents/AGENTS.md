<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:deployment-rules -->
# Deployment

After EVERY set of changes that passes `npm run build` with 0 errors, automatically run in this exact order:

```
git add -A
git commit -m "<description of changes>"
git push origin main
```

Do NOT wait for the user to ask. Commit and push to GitHub immediately after a successful build as part of the normal workflow. (Vercel will automatically trigger a production deployment from the push to main).
<!-- END:deployment-rules -->

<!-- BEGIN:collaboration-rules -->
# Collaboration & Branch Safety

This project has multiple developers working with Antigravity. To prevent deployments from overwriting each other:

- **This workspace (Mauricio / owner):** Works directly on `main` branch. Has admin rights. Can push to `main` and deploy `--prod`.
- **Other team members:** Must work on the `dev/equipo` branch (or their own named branch). They must NEVER run `npx vercel --prod`. They deploy previews only with `npx vercel` (no --prod flag).

If you detect you are NOT on the `main` branch, do NOT run `npx vercel --prod`. Run `npx vercel` instead to get a preview URL.

When a team member's work is ready to go to production, they create a Pull Request on GitHub from their branch to `main`. Mauricio reviews and merges it. The merge to `main` triggers the production deployment.

Never run `git push origin main` directly if the current branch is not `main`.
<!-- END:collaboration-rules -->
