export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
      <div className="bg-[#111] border border-[#222] rounded-2xl p-10 max-w-sm w-full text-center">
        <p className="text-5xl mb-5">📡</p>
        <h1 className="text-[#B3985B] text-2xl font-bold mb-3">Sin conexión</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          No hay conexión a internet. Cuando te reconectes, todos los cambios pendientes se sincronizarán automáticamente.
        </p>
        <a href="/dashboard"
          className="inline-block bg-[#B3985B] text-black font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-[#c9a96a] transition-colors">
          Reintentar
        </a>
      </div>
    </div>
  );
}
