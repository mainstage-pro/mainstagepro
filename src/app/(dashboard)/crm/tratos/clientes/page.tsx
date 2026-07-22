import { Suspense } from "react";
import BaseDeDatosPage from "../../base-de-datos/page";

export default function ClientesTab() {
  return (
    <Suspense fallback={null}>
      <BaseDeDatosPage />
    </Suspense>
  );
}
