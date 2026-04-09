import { use } from "react";
import { CotizadorEdit } from "./CotizadorEdit";

export default function EditarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CotizadorEdit cotizacionId={id} />;
}
