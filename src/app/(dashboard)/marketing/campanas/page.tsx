"use client";

export default function CampanasPage() {
  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Campañas publicitarias</h1>
        <p className="text-[#6b7280] text-sm">Gestión de publicidad pagada · Facebook Ads, Instagram Ads, Google Ads</p>
      </div>

      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl py-24 text-center space-y-3">
        <div className="text-4xl opacity-20">📣</div>
        <p className="text-gray-500 text-sm font-medium">Módulo de publicidad en construcción</p>
        <p className="text-gray-700 text-xs max-w-xs mx-auto leading-relaxed">
          Aquí podrás registrar y dar seguimiento a tus campañas de publicidad pagada: presupuesto, fechas, resultados y ROAS.
        </p>
      </div>
    </div>
  );
}
