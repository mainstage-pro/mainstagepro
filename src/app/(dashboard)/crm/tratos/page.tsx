import { Suspense } from "react";
import ModuleTabs from "@/components/ModuleTabs";
import TratosPage from "./lista/page";
import CotizacionesPage from "../../cotizaciones/page";
import PlantillasPage from "../../cotizaciones/plantillas/page";
import BaseDeDatosPage from "../base-de-datos/page";
import SeguimientosPage from "../../ventas/seguimientos/page";

export default function VentasModulePage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "ventas", label: "Ventas", accessKey: "crm-tratos", content: <TratosPage /> },
        { key: "cotizaciones", label: "Cotizaciones", accessKey: "crm-tratos", content: <CotizacionesPage /> },
        { key: "plantillas", label: "Plantillas", accessKey: "crm-tratos", content: <PlantillasPage /> },
        { key: "clientes", label: "Clientes", accessKey: "crm-base-de-datos", content: <Suspense fallback={null}><BaseDeDatosPage /></Suspense> },
        { key: "seguimientos", label: "Seguimientos", accessKey: "ventas-seguimientos", content: <SeguimientosPage /> },
      ]}
    />
  );
}
