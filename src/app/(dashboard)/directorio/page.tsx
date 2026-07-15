"use client";

import ModuleTabs from "@/components/ModuleTabs";
import ProveedoresPage from "../catalogo/proveedores/page";
import TecnicosPage from "../catalogo/tecnicos/page";
import VenuesPage from "../catalogo/venues/page";
import EmpresasPage from "../catalogo/empresas/page";

export default function DirectorioPage() {
  return (
    <ModuleTabs
      tabs={[
        { key: "proveedores", label: "Proveedores", accessKey: "bd-proveedores", content: <ProveedoresPage /> },
        { key: "tecnicos", label: "Técnicos freelance", accessKey: "bd-tecnicos", content: <TecnicosPage /> },
        { key: "venues", label: "Venues", accessKey: "catalogo", content: <VenuesPage /> },
        { key: "empresas", label: "Empresas", accessKey: "catalogo", content: <EmpresasPage /> },
      ]}
    />
  );
}
