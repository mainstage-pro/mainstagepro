"use client";
import { useState, useEffect } from "react";
import NuevaTareaModal from "@/app/(dashboard)/operaciones/components/NuevaTareaModal";
import { useToast } from "@/components/Toast";

interface Usuario { id: string; name: string }

/**
 * Botón global "Nueva tarea" (sidebar/topbar) → abre el modal unificado de 4 tipos.
 * Escucha el evento `open-full-task` (disparado desde el Sidebar) y el atajo Cmd/Ctrl+K.
 */
export default function GlobalNewTaskPanel() {
  const toast = useToast();
  const [open, setOpen]         = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Listeners: evento del botón + atajo de teclado
  useEffect(() => {
    function onOpen() { setOpen(true); }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); }
    }
    window.addEventListener("open-full-task", onOpen);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("open-full-task", onOpen);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Carga la lista de usuarios la primera vez que se abre
  useEffect(() => {
    if (!open || usuarios.length > 0) return;
    fetch("/api/usuarios")
      .then(r => r.json())
      .then(d => setUsuarios(d.usuarios ?? []))
      .catch(() => {});
  }, [open, usuarios.length]);

  return (
    <NuevaTareaModal
      open={open}
      onClose={() => setOpen(false)}
      usuarios={usuarios}
      onCreated={() => { toast.success("Tarea creada"); }}
    />
  );
}
