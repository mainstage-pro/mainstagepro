with open("src/app/(dashboard)/finanzas/repartos/page.tsx", "r") as f:
    content = f.read()

parts = content.split('"use client";')
if len(parts) == 2:
    new_content = '"use client";' + parts[1] + "\n\n" + parts[0]
    with open("src/app/(dashboard)/finanzas/repartos/page.tsx", "w") as f:
        f.write(new_content)
