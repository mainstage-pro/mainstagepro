"use client";

export type EscenarioOpcion = { id: string; nombre: string };

/**
 * Selector compacto de escenario para un renglón del rider, crew, logística o
 * proveedores. No se renderiza con menos de dos escenarios: un proyecto de un solo
 * escenario se ve exactamente igual que antes.
 */
export default function SelectorEscenario({
  escenarios,
  value,
  onChange,
  className = "",
}: {
  escenarios: EscenarioOpcion[];
  value: string | null;
  onChange: (escenarioId: string | null) => void;
  className?: string;
}) {
  if (escenarios.length < 2) return null;

  return (
    <select
      value={value ?? ""}
      onChange={e => onChange(e.target.value || null)}
      title="Escenario"
      className={`bg-[#0e0e0e] border border-[#1f1f1f] rounded px-1.5 py-0.5 text-[10px] ${
        value ? "text-[#B3985B] border-[#B3985B]/40" : "text-gray-500"
      } focus:outline-none focus:border-[#B3985B] ${className}`}
    >
      <option value="">Sin escenario</option>
      {escenarios.map(e => (
        <option key={e.id} value={e.id}>{e.nombre}</option>
      ))}
    </select>
  );
}
