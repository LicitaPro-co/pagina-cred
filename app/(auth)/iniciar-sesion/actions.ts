"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type EstadoInicioSesion = {
  error: string | null;
};

const ROLES_ADMINISTRATIVOS = [
  "analista",
  "administrador",
  "superadministrador",
];

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

  const {
    data: resultadoInicio,
    error: errorInicio,
  } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });

  if (errorInicio) {
    console.error(
      "Error iniciando sesión:",
      errorInicio.message,
    );

    return {
      error: traducirError(
        errorInicio.message,
      ),
    };
  }

  const usuario =
    resultadoInicio.user;

  if (!usuario) {
    return {
      error:
        "No fue posible identificar el usuario autenticado.",
    };
  }

  const {
    data: perfil,
    error: errorPerfil,
  } = await supabase
    .from("perfiles")
    .select(`
      rol,
      estado
    `)
    .eq("id", usuario.id)
    .maybeSingle();

  if (errorPerfil) {
    console.error(
      "Error consultando el perfil:",
      errorPerfil.message,
    );

    await supabase.auth.signOut();

    return {
      error:
        "No fue posible consultar tu perfil de acceso.",
    };
  }

  if (!perfil) {
    await supabase.auth.signOut();

    return {
      error:
        "No existe un perfil asociado a este usuario.",
    };
  }

  if (perfil.estado !== "activo") {
    await supabase.auth.signOut();

    return {
      error:
        "Tu usuario no se encuentra habilitado para ingresar.",
    };
  }

  revalidatePath("/", "layout");

  if (
    ROLES_ADMINISTRATIVOS.includes(
      String(perfil.rol),
    )
  ) {
    redirect("/administrador");
  }

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
    error.includes(
      "email not confirmed",
    )
  ) {
    return "Debes confirmar tu correo electrónico antes de ingresar.";
  }

  if (
    error.includes(
      "refresh token",
    )
  ) {
    return "La sesión anterior venció. Recarga la página e intenta nuevamente.";
  }

  if (
    error.includes(
      "failed to fetch",
    )
  ) {
    return "No fue posible conectarse con el servidor.";
  }

  return mensaje;
}
