"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";

// Este componente simplemente carga los datos y pasa el ID al cotizador nuevo
// via query param para que trabaje en modo edición
export function CotizadorEdit({ cotizacionId }: { cotizacionId: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/cotizaciones/nuevo?editId=${cotizacionId}`);
  }, [cotizacionId, router]);

  return (
    <div className="p-6">
      <div className="mb-2"><BackButton /></div>
      <div className="text-gray-400 text-sm">Cargando editor...</div>
    </div>
  );
}
