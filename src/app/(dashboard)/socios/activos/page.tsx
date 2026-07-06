import Link from "next/link";

export default function SociosActivosPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Socios de Activos</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Personas con activos físicos dentro del inventario de Mainstage
          </p>
        </div>
        <Link
          href="/socios"
          className="text-xs text-[#555] hover:text-white border border-[#222] px-3 py-1.5 rounded-lg transition-colors"
        >
          ← Socios Constitutivos
        </Link>
      </div>

      {/* Próximamente */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
          <span className="text-2xl">🏗️</span>
        </div>
        <h2 className="text-white font-semibold mb-2">Módulo en construcción</h2>
        <p className="text-[#555] text-sm max-w-md">
          Aquí podrás registrar y gestionar socios que tienen activos físicos
          (equipos, vehículos, inmuebles) dentro del inventario de Mainstage Pro.
          Su configuración y operación se definirá próximamente.
        </p>
        <Link
          href="/finanzas/hervam"
          className="mt-6 text-[#B3985B] hover:underline text-sm"
        >
          Ver inventario de activos →
        </Link>
      </div>
    </div>
  );
}
