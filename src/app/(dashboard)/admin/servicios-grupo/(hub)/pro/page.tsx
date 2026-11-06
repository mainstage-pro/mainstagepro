import { SERVICIOS, SERVICIO_LABELS, SERVICIO_DESCRIPCIONES } from "@/lib/servicios-trato";

export const dynamic = "force-static";

export default function ServiciosProPage() {
  return (
    <div className="ms-page space-y-5">
      <div>
        <h1 className="ms-h1">Qué vende Mainstage Pro</h1>
        <p className="ms-subtitle mt-1">
          Los dos servicios son estructurales: están cosidos al modelo de Trato, a los proyectos y a
          decenas de rutas y documentos. Para cambiarlos hay que tocar código en{" "}
          <code className="text-[#B3985B]">src/lib/servicios-trato.ts</code>, no se editan desde aquí.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SERVICIOS.map((s) => (
          <div key={s} className="ms-card p-4">
            <p className="text-white text-sm font-medium">{SERVICIO_LABELS[s]}</p>
            <p className="ms-meta mt-1.5">{SERVICIO_DESCRIPCIONES[s]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
