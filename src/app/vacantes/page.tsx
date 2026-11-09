"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Briefcase } from "lucide-react";
import { ADN_MAINSTAGE, CRITERIO_EXCLUSION_GENERAL } from "@/lib/puesto";

interface AptitudPerfil { nombre: string; nivel: string }
interface ConocimientoPerfil { nombre: string; nivel: string; indispensable: boolean }
interface Vacante {
  id: string;
  nombre: string;
  area: string;
  misionPuesto: string | null;
  tipoContrato: string | null;
  modalidad: string | null;
  aptitudes: AptitudPerfil[];
  conocimientos: ConocimientoPerfil[];
  criteriosExclusion: string[];
  formularioSlug: string | null;
}

const NIVEL_LABEL: Record<string, string> = { basico: "Básico", intermedio: "Intermedio", avanzado: "Avanzado" };

export default function VacantesPage() {
  const [vacantes, setVacantes] = useState<Vacante[] | null>(null);

  useEffect(() => {
    fetch("/api/vacantes")
      .then((r) => r.json())
      .then((d) => setVacantes(d.puestos ?? []))
      .catch(() => setVacantes([]));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <div className="mb-10 text-center">
          <p className="text-[#B3985B] text-xs tracking-widest uppercase">Mainstage Pro</p>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-1">Vacantes abiertas</h1>
          <p className="text-neutral-400 text-sm mt-2 max-w-xl mx-auto">
            Producción de eventos en vivo — audio, iluminación, video, escenario y rigging, electricidad.
          </p>
        </div>

        {vacantes === null ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#B3985B]" />
          </div>
        ) : vacantes.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-400">No hay vacantes abiertas por el momento.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {vacantes.map((v) => <VacanteCard key={v.id} v={v} />)}
          </div>
        )}

        <div className="mt-14 border-t border-neutral-800 pt-8">
          <p className="text-[#B3985B] text-xs tracking-widest uppercase">{ADN_MAINSTAGE.titulo}</p>
          <p className="text-neutral-400 text-sm mt-2 whitespace-pre-wrap">{ADN_MAINSTAGE.texto}</p>
        </div>

        <p className="text-[11px] text-neutral-700 mt-10 text-center">
          Criterio de exclusión general: {CRITERIO_EXCLUSION_GENERAL}.
        </p>
      </div>
    </div>
  );
}

function VacanteCard({ v }: { v: Vacante }) {
  return (
    <div className="border border-neutral-800 rounded-xl p-6 bg-neutral-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{v.nombre}</h2>
          <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-neutral-500">
            {v.tipoContrato && <span>{v.tipoContrato}</span>}
            {v.modalidad && <span>· {v.modalidad}</span>}
          </div>
        </div>
      </div>

      {v.misionPuesto && (
        <p className="text-neutral-300 text-sm mt-4 whitespace-pre-wrap">{v.misionPuesto}</p>
      )}

      {!!v.conocimientos.length && (
        <div className="mt-4">
          <p className="text-xs text-neutral-500 mb-1.5">Conocimientos</p>
          <div className="flex flex-wrap gap-1.5">
            {v.conocimientos.map((c, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-300">
                {c.nombre}{c.indispensable ? " ·" : ""} {NIVEL_LABEL[c.nivel] ?? c.nivel}
              </span>
            ))}
          </div>
        </div>
      )}

      {!!v.aptitudes.length && (
        <div className="mt-3">
          <p className="text-xs text-neutral-500 mb-1.5">Aptitudes</p>
          <div className="flex flex-wrap gap-1.5">
            {v.aptitudes.map((a, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-300">
                {a.nombre} · {NIVEL_LABEL[a.nivel] ?? a.nivel}
              </span>
            ))}
          </div>
        </div>
      )}

      {!!v.criteriosExclusion.length && (
        <div className="mt-3">
          <p className="text-xs text-neutral-500 mb-1.5">Criterios de exclusión</p>
          <ul className="text-[12px] text-red-300/70 list-disc pl-4 space-y-0.5">
            {v.criteriosExclusion.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {v.formularioSlug ? (
        <Link
          href={`/postular/${v.formularioSlug}`}
          className="inline-flex items-center gap-1 mt-5 text-sm px-5 py-2 bg-[#B3985B] hover:bg-[#c9a96a] text-black font-semibold rounded-lg"
        >
          Postularme
        </Link>
      ) : null}
    </div>
  );
}
