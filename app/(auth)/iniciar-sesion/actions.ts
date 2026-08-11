"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type EstadoInicioSesion = {
  error: string | null;
};

export async function iniciarSesion(
  _estadoAnterior: EstadoInicioSesion,
  formData: FormData,
): Promise<EstadoInicioSesion> {
  const correo = String(
    formData.get("correo") ?? "",
  )
    .trim()
    .toLowerCase();

  const contrasena = String(
    formData.get("contrasena") ?? "",
  );

  if (!correo) {
    return {
      error: "Debes escribir tu correo electrónico.",
    };
  }

  if (!contrasena) {
    return {
      error: "Debes escribir tu contraseña.",
    };
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

  if (error) {
    console.error(
      "Error iniciando sesión:",
      error.message,
    );

    return {
      error: traducirError(
        error.message,
      ),
    };
  }

  revalidatePath("/", "layout");
  redirect("/cliente");
}

function traducirError(
  mensaje: string,
): string {
  const error = mensaje
    .trim()
    .toLowerCase();

  if (
    error.includes(
      "invalid login credentials",
    )
  ) {
    return "El correo o la contraseña no son correctos.";
  }

  if (
    error.includes("email not confirmed")
  ) {
    return "Debes confirmar tu correo electrónico antes de ingresar.";
  }

  if (error.includes("refresh token")) {
    return "La sesión anterior venció. Recarga la página e intenta nuevamente.";
  }

  if (error.includes("failed to fetch")) {
    return "No fue posible conectarse con el servidor.";
  }

  return mensaje;
}
