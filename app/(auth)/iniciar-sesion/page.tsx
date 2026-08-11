"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  iniciarSesion,
  type EstadoInicioSesion,
} from "./actions";

const estadoInicialInicioSesion: EstadoInicioSesion = {
  error: null,
};

export default function IniciarSesionPage() {
  const [estado, accionFormulario] =
    useActionState(
      iniciarSesion,
      estadoInicialInicioSesion,
    );

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="w-full max-w-xl rounded-[34px] border border-[#eadfce] bg-white p-7 shadow-sm sm:p-10">
          <Link
            href="/"
            className="inline-flex items-center font-bold text-emerald-700 transition hover:text-emerald-800"
          >
            ← Volver al inicio
          </Link>

          <div className="mt-10">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-700">
              Página Cred
            </p>

            <h1 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Iniciar sesión
            </h1>

            <p className="mt-3 leading-7 text-slate-600">
              Consulta tu cupo, créditos activos y fechas de pago.
            </p>
          </div>

          <form
            action={accionFormulario}
            className="mt-10"
          >
            <label className="block">
              <span className="mb-3 block font-bold text-slate-700">
                Correo electrónico
              </span>

              <input
                type="email"
                name="correo"
                autoComplete="email"
                inputMode="email"
                placeholder="correo@ejemplo.com"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-5 text-lg text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50"
              />
            </label>

            <label className="mt-6 block">
              <span className="mb-3 block font-bold text-slate-700">
                Contraseña
              </span>

              <input
                type="password"
                name="contrasena"
                autoComplete="current-password"
                placeholder="Escribe tu contraseña"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-5 text-lg text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50"
              />
            </label>

            {estado.error ? (
              <div
                role="alert"
                className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-800"
              >
                {estado.error}
              </div>
            ) : null}

            <BotonIngresar />
          </form>

          <p className="mt-8 text-center text-slate-600">
            ¿Aún no tienes cuenta?{" "}
            <Link
              href="/registro"
              className="font-black text-emerald-700 transition hover:text-emerald-800"
            >
              Crear cuenta
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

function BotonIngresar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full rounded-2xl bg-emerald-700 px-6 py-5 text-lg font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-700/55"
    >
      {pending ? "Ingresando..." : "Ingresar"}
    </button>
  );
}
