"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function RestablecerContrasenaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [contrasena, setContrasena] =
    useState("");

  const [confirmacion, setConfirmacion] =
    useState("");

  const [procesando, setProcesando] =
    useState(false);

  const [sesionValida, setSesionValida] =
    useState(false);

  const [verificando, setVerificando] =
    useState(true);

  const [mensaje, setMensaje] =
    useState("");

  const [esError, setEsError] =
    useState(false);

  useEffect(() => {
    let activo = true;

    async function verificarSesion() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!activo) {
        return;
      }

      setSesionValida(Boolean(session));
      setVerificando(false);
    }

    void verificarSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (evento, session) => {
        if (!activo) {
          return;
        }

        if (
          evento === "PASSWORD_RECOVERY" ||
          evento === "SIGNED_IN"
        ) {
          setSesionValida(Boolean(session));
          setVerificando(false);
        }
      },
    );

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function actualizarContrasena(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMensaje("");
    setEsError(false);

    if (contrasena.length < 8) {
      mostrarError(
        "La contraseña debe contener al menos 8 caracteres.",
      );
      return;
    }

    if (contrasena !== confirmacion) {
      mostrarError(
        "Las contraseñas no coinciden.",
      );
      return;
    }

    setProcesando(true);

    const { error } =
      await supabase.auth.updateUser({
        password: contrasena,
      });

    if (error) {
      console.error(
        "Error actualizando contraseña:",
        error,
      );

      mostrarError(
        traducirError(error.message),
      );
      return;
    }

    setMensaje(
      "La contraseña fue actualizada correctamente.",
    );
    setEsError(false);
    setProcesando(false);

    await supabase.auth.signOut();

    window.setTimeout(() => {
      router.replace("/iniciar-sesion");
      router.refresh();
    }, 1200);
  }

  function mostrarError(texto: string) {
    setMensaje(texto);
    setEsError(true);
    setProcesando(false);
  }

  if (verificando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8ee] px-5">
        <p className="font-semibold text-slate-600">
          Verificando enlace...
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff8ee] px-5 py-10">
      <section className="w-full max-w-lg rounded-[34px] border border-[#eadfce] bg-white p-7 shadow-sm sm:p-10">
        <Link
          href="/iniciar-sesion"
          className="font-bold text-emerald-700"
        >
          ← Volver a iniciar sesión
        </Link>

        <p className="mt-10 text-sm font-black uppercase tracking-[0.24em] text-emerald-700">
          Página Cred
        </p>

        <h1 className="mt-4 text-3xl font-black text-slate-900">
          Crear nueva contraseña
        </h1>

        <p className="mt-3 leading-7 text-slate-600">
          Escribe y confirma la nueva contraseña
          de tu cuenta.
        </p>

        {!sesionValida ? (
          <div className="mt-8 rounded-2xl bg-rose-50 p-5 text-sm leading-6 text-rose-800">
            El enlace no es válido, ya fue utilizado
            o venció. Solicita un nuevo enlace de
            recuperación.
          </div>
        ) : (
          <form
            onSubmit={actualizarContrasena}
            className="mt-8 space-y-5"
          >
            <label className="block">
              <span className="mb-2 block font-semibold text-slate-700">
                Nueva contraseña
              </span>

              <input
                type="password"
                value={contrasena}
                onChange={(event) =>
                  setContrasena(
                    event.target.value,
                  )
                }
                minLength={8}
                autoComplete="new-password"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-semibold text-slate-700">
                Confirmar contraseña
              </span>

              <input
                type="password"
                value={confirmacion}
                onChange={(event) =>
                  setConfirmacion(
                    event.target.value,
                  )
                }
                minLength={8}
                autoComplete="new-password"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            {mensaje ? (
              <p
                className={
                  esError
                    ? "rounded-2xl bg-rose-50 p-4 text-sm text-rose-800"
                    : "rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
                }
              >
                {mensaje}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={procesando}
              className="w-full rounded-2xl bg-emerald-700 px-6 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {procesando
                ? "Actualizando..."
                : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function traducirError(mensaje: string) {
  const texto = mensaje.toLowerCase();

  if (texto.includes("same password")) {
    return "La nueva contraseña debe ser diferente de la anterior.";
  }

  if (
    texto.includes("session") ||
    texto.includes("token")
  ) {
    return "El enlace venció o ya fue utilizado. Solicita uno nuevo.";
  }

  return mensaje;
}
