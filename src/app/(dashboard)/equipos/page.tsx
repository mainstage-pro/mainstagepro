"use client";

import ModuleTabs from "@/components/ModuleTabs";
import InventarioMaestroPage from "../inventario/maestro/page";
import TableroProduccionPage from "../produccion/tablero/page";
import DisponibilidadPage from "../inventario/disponibilidad/page";
import RecoleccionesPage from "../inventario/recolecciones/page";
import MantenimientoPage from "../inventario/mantenimiento/page";
import ChecklistPage from "../inventario/checklist/page";
import VehiculosPage from "../inventario/vehiculos/page";

export default function EquiposPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "maestro", label: "Inventario de equipos", accessKey: "inv-maestro", content: <InventarioMaestroPage /> },
        { key: "tablero", label: "Estado de equipos", accessKey: "produccion-tablero", content: <TableroProduccionPage /> },
        { key: "disponibilidad", label: "Disponibilidad", accessKey: "inventario", content: <DisponibilidadPage /> },
        { key: "recolecciones", label: "Recolecciones", accessKey: "inventario", content: <RecoleccionesPage /> },
        { key: "mantenimiento", label: "Mantenimiento", accessKey: "inventario", content: <MantenimientoPage /> },
        { key: "checklist", label: "Checklist semanal", accessKey: "inventario", content: <ChecklistPage /> },
        { key: "vehiculos", label: "Vehículos", accessKey: "inventario", content: <VehiculosPage /> },
      ]}
    />
  );
}
