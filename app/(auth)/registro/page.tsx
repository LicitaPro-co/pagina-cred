"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegistroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"error" | "exito">("error");

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCargando(true);
    setMensaje("");

    const formulario = new FormData(event.currentTarget);

    const nombres = String(formulario.get("nombres") ?? "").trim();
    const apellidos = String(formulario.get("apellidos") ?? "").trim();
    const celular = String(formulario.get("celular") ?? "")
      .replace(/\D/g, "")
      .trim();
    const correo = String(formulario.get("correo") ?? "")
      .trim()
      .toLowerCase();
    const contrasena = String(formulario.get("contrasena") ?? "");
    const confirmarContrasena = String(
      formulario.get("confirmarContrasena") ?? "",
    );

    if (!nombres || !apellidos || !celular || !correo || !contrasena) {
      setTipoMensaje("error");
      setMensaje("Completa todos los campos.");
      setCargando(false);
      return;
    }

    if (celular.length !== 10) {
      setTipoMensaje("error");
      setMensaje("El celular debe contener 10 números.");
      setCargando(false);
      return;
    }

    if (contrasena.length < 8) {
      setTipoMensaje("error");
      setMensaje("La contraseña debe tener al menos 8 caracteres.");
      setCargando(false);
      return;
    }

    if (contrasena !== confirmarContrasena) {
      setTipoMensaje("error");
      setMensaje("Las contraseñas no coinciden.");
      setCargando(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: {
        data: {
          nombres,
          apellidos,
          celular,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setTipoMensaje("error");

      if (error.message.toLowerCase().includes("already registered")) {
        setMensaje("Este correo ya se encuentra registrado.");
      } else {
        setMensaje(error.message);
      }

      setCargando(false);
      return;
    }

    if (data.session) {
      router.push("/cliente");
      router.refresh();
      return;
    }

    setTipoMensaje("exito");
    setMensaje(
      "Cuenta creada. Revisa tu correo y confirma el registro para ingresar.",
    );
    setCargando(false);
  }

  return (
    <main className="min-h-screen bg-[#fff8ee] px-4 py-10">
      <section className="mx-auto max-w-lg rounded-[30px] border border-[#eadfce] bg-white p-8 shadow-xl shadow-slate-900/5">
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          ← Volver al inicio
        </Link>

        <div className="mt-7">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
            Página Cred
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-900">
            Crear cuenta
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Registra tus datos para consultar el cupo disponible de tu primer
            crédito.
          </p>
        </div>

        <form onSubmit={registrar} className="mt-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              nombre="nombres"
              etiqueta="Nombres"
              placeholder="Tus nombres"
              autoComplete="given-name"
            />

            <Campo
              nombre="apellidos"
              etiqueta="Apellidos"
              placeholder="Tus apellidos"
              autoComplete="family-name"
            />
          </div>

          <Campo
            nombre="celular"
            etiqueta="Número celular"
            placeholder="3001234567"
            tipo="tel"
            inputMode="numeric"
            autoComplete="tel"
          />

          <Campo
            nombre="correo"
            etiqueta="Correo electrónico"
            placeholder="correo@ejemplo.com"
            tipo="email"
            autoComplete="email"
          />

          <Campo
            nombre="contrasena"
            etiqueta="Contraseña"
            placeholder="Mínimo 8 caracteres"
            tipo="password"
            autoComplete="new-password"
          />

          <Campo
            nombre="confirmarContrasena"
            etiqueta="Confirmar contraseña"
            placeholder="Repite la contraseña"
            tipo="password"
            autoComplete="new-password"
          />

          <label className="flex items-start gap-3 rounded-2xl bg-[#f7f8f5] p-4">
            <input
              type="checkbox"
              required
              className="mt-1 h-4 w-4 accent-emerald-700"
            />

            <span className="text-sm leading-6 text-slate-600">
              Acepto los términos y condiciones y autorizo el tratamiento de
              mis datos personales.
            </span>
          </label>

          {mensaje ? (
            <p
              className={
                tipoMensaje === "exito"
                  ? "rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                  : "rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
              }
            >
              {mensaje}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/iniciar-sesion"
            className="font-bold text-emerald-700 hover:text-emerald-800"
          >
            Iniciar sesión
          </Link>
        </p>
      </section>
    </main>
  );
}

type CampoProps = {
  nombre: string;
  etiqueta: string;
  placeholder: string;
  tipo?: string;
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  autoComplete?: string;
};

function Campo({
  nombre,
  etiqueta,
  placeholder,
  tipo = "text",
  inputMode,
  autoComplete,
}: CampoProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {etiqueta}
      </span>

      <input
        name={nombre}
        type={tipo}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}
