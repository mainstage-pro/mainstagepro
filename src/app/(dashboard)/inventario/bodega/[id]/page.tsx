"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BodegaIdRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/inventario/checklist/${id}`); }, [id, router]);
  return null;
}
