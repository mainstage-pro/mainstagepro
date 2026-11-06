import Image from "next/image";
import { seleccionarUnidad } from "./actions";

export const dynamic = "force-static";

const UNIDADES = [
  {
    unidad: "PRO" as const,
    nombre: "Mainstage Pro",
    desc: "Renta de equipo y producción técnica de eventos.",
    logo: "/logo-icon.png",
  },
  {
    unidad: "LIVE" as const,
    nombre: "Mainstage Live",
    desc: "Production management, tour management y show call de giras.",
    logo: "/logo-live.png",
  },
  {
    unidad: "CREATIVE" as const,
    nombre: "Mainstage Creative",
    desc: "Diseño conceptual, iluminación, escenario, renders y documentación técnica.",
    logo: "/logo-creative.png",
  },
];

export default function GrupoPage() {
  return (
    <div className="ms-page space-y-5">
      <div>
        <h1 className="ms-h1">Grupo Mainstage</h1>
        <p className="ms-subtitle mt-1">Elige con cuál unidad quieres trabajar.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {UNIDADES.map((u) => (
          <form key={u.unidad} action={seleccionarUnidad.bind(null, u.unidad)}>
            <button type="submit" className="ms-card p-5 text-left w-full hover:border-[#B3985B] transition-colors">
              <Image src={u.logo} alt={u.nombre} width={40} height={40} className="rounded-full mb-3" />
              <p className="text-white text-base font-medium">{u.nombre}</p>
              <p className="ms-meta mt-1.5">{u.desc}</p>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
