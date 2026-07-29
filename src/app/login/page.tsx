"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OWNER_EMAIL } from "@/lib/nav";
import { AREA_DASHBOARD } from "@/lib/areas";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Error al iniciar sesión");
      setLoading(false);
      return;
    }

    const area = data.user?.area;
    const isAdmin = data.user?.role === "ADMIN";
    const target = data.user?.email === OWNER_EMAIL
      ? "/inicio"
      : (!isAdmin && area && area !== "GENERAL" && AREA_DASHBOARD[area])
        ? AREA_DASHBOARD[area]
        : "/dashboard";
    router.push(target);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Mainstage Pro" className="h-12 w-auto object-contain" />
          </div>
          <p className="text-[#6b7280] text-sm">Sistema operativo</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#111] border border-[#262626] rounded-md px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B] transition-colors placeholder:text-[#444]"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#111] border border-[#262626] rounded-md px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#B3985B] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#B3985B] hover:bg-[#c9a96a] disabled:opacity-50 text-black font-semibold rounded-md py-2.5 text-sm transition-colors"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
