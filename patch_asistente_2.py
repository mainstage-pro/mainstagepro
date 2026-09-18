import sys

with open("src/components/cotizaciones/AsistenteCotizacion.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_onchange = "onChange={(c) => setBorrador((prev) => (prev ? { ...prev, cliente: c } : prev))}"
new_onchange = "onChange={(c) => setBorrador((prev) => (prev ? { ...prev, cliente: c, extraido: { ...prev.extraido, clienteNombre: c.nombre } } : prev))}"

if old_onchange in content:
    content = content.replace(old_onchange, new_onchange)
else:
    print("Could not find old_onchange to replace")

with open("src/components/cotizaciones/AsistenteCotizacion.tsx", "w", encoding="utf-8") as f:
    f.write(content)
