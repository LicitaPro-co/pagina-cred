"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  variante?: "claro" | "administrador";
};

export default function BotonCerrarSesion({
  variante = "claro",
}: Props) {
  const router = useRouter();

  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState("");

  async function cerrarSesion() {
    if (cerrando) {
      return;
    }

    setCerrando(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: errorSalida } =
        await supabase.auth.signOut();

      if (errorSalida) {
        setError(
          "No fue posible cerrar la sesión. Intenta nuevamente.",
        );
        setCerrando(false);
        return;
      }

      /*
       * Reemplazamos la ruta para que el usuario
       * no vuelva al panel simplemente pulsando
       * el botón Atrás del navegador.
       */
      router.replace("/iniciar-sesion");
      router.refresh();
    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error,
      );

      setError(
        "No fue posible cerrar la sesión. Intenta nuevamente.",
      );

      setCerrando(false);
    }
  }

  const clases =
    variante === "administrador"
      ? "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      : "rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div>
      <button
        type="button"
        onClick={cerrarSesion}
        disabled={cerrando}
        className={clases}
      >
        {cerrando
          ? "Cerrando sesión..."
          : "Cerrar sesión"}
      </button>

      {error ? (
        <p className="mt-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
