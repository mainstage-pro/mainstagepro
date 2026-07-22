import { Suspense } from "react";
import OperacionesPage from "../../operaciones/page";

export default function TareasTab() {
  return (
    <Suspense fallback={null}>
      <OperacionesPage />
    </Suspense>
  );
}
