import re

missing_models = [
    "calendario_entradas",
    "plantillas_cotizacion",
    "plantillas_cotizacion_lineas",
    "presentacion_overrides",
    "proyecto_imagenes",
    "proyectos_presentacion"
]

with open("/tmp/pulled_schema.prisma", "r") as f:
    pulled_content = f.read()

models_to_append = []

for model_name in missing_models:
    # Match `model <name> { ... }` block
    pattern = r"model\s+" + model_name + r"\s+\{.*?\}"
    match = re.search(pattern, pulled_content, re.DOTALL)
    if match:
        models_to_append.append(match.group(0))

with open("prisma/schema.prisma", "a") as f:
    f.write("\n\n")
    f.write("\n\n".join(models_to_append))
    f.write("\n")

print("Appended models successfully!")
