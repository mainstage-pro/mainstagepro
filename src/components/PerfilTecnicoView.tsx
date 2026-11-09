export type PerfilTecnico = {
  disciplina?: string;
  nivel?: string;
  proposito?: string;
  competencias?: string[];
  competenciasComunes?: string[];
  criteriosExclusion?: string[];
  rolesRelacionados?: string[];
};

/** Perfil técnico de un RolTecnico (Reclutamiento Fase 3, §7): mismo render en Tabulador y Directorio. */
export function PerfilTecnicoView({ perfil: perfilJson, tarifaPendiente }: { perfil: string | null | undefined; tarifaPendiente?: boolean }) {
  if (!perfilJson) return null;
  let perfil: PerfilTecnico;
  try { perfil = JSON.parse(perfilJson); } catch { return <p className="text-gray-500 text-sm">Perfil inválido.</p>; }
  return (
    <div className="space-y-4">
      {tarifaPendiente && (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          Tarifa pendiente de negociar — este rol es nuevo en el tabulador.
        </p>
      )}
      {perfil.proposito && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Propósito</p>
          <p className="text-sm text-gray-200">{perfil.proposito}</p>
        </div>
      )}
      {!!perfil.competencias?.length && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Competencias del nivel</p>
          <ul className="text-sm text-gray-300 list-disc pl-5 space-y-0.5">
            {perfil.competencias.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      {!!perfil.competenciasComunes?.length && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Competencias comunes de la disciplina</p>
          <ul className="text-sm text-gray-300 list-disc pl-5 space-y-0.5">
            {perfil.competenciasComunes.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      {!!perfil.criteriosExclusion?.length && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Criterios de exclusión</p>
          <ul className="text-sm text-red-300/80 list-disc pl-5 space-y-0.5">
            {perfil.criteriosExclusion.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      {!!perfil.rolesRelacionados?.length && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Roles relacionados</p>
          <p className="text-sm text-gray-400">{perfil.rolesRelacionados.join(" · ")}</p>
        </div>
      )}
    </div>
  );
}
