"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LayoutEscenario, { type EquipoDelRider } from "@/components/proyectos/LayoutEscenario";

type Escenario = {
  id: string;
  nombre: string;
  anchoM: number | null;
  largoM: number | null;
  layout: string | null;
  equipos: EquipoDelRider[];
};

export default function LayoutEscenarioPage({
  params,
}: {
  params: Promise<{ id: string; escenarioId: string }>;
}) {
  const { id, escenarioId } = use(params);
  const [escenario, setEscenario] = useState<Escenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/proyectos/${id}/escenarios/${escenarioId}`)
      .then(async r => {
        if (!r.ok) throw new Error("No se encontró el escenario");
        const d = await r.json();
        setEscenario(d.escenario);
      })
      .catch(e => setError(e.message));
  }, [id, escenarioId]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <Link href={`/proyectos/${id}`} className="text-[11px] text-gray-500 hover:text-white transition-colors flex items-center gap-1 w-fit">
          <ArrowLeft size={12} /> Volver al proyecto
        </Link>
        <h1 className="ms-h1 mt-1">{escenario ? `Layout · ${escenario.nombre}` : "Layout"}</h1>
        <p className="ms-subtitle">Planta cenital del escenario. Lo que coloques aquí se guarda solo.</p>
      </div>

      {error && <p className="ms-card p-4 text-xs text-red-400">{error}</p>}

      {escenario && (
        <LayoutEscenario
          api={{
            guardar: `/api/proyectos/${id}/escenarios/${escenario.id}`,
            link: `/api/proyectos/${id}/escenarios/${escenario.id}/layout-link`,
            pdf: `/api/proyectos/${id}/escenarios/${escenario.id}/layout-pdf`,
            posiciones: proyectoEquipoId => `/api/proyectos/${id}/equipos/${proyectoEquipoId}/posiciones`,
          }}
          nombre={escenario.nombre}
          anchoM={escenario.anchoM}
          largoM={escenario.largoM}
          layoutInicial={escenario.layout}
          rider={escenario.equipos}
        />
      )}
    </div>
  );
}
