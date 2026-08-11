import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function InicioPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect("/iniciar-sesion");
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
    .eq("id", user.id)
    .maybeSingle();

  if (errorPerfil || !perfil) {
    redirect("/iniciar-sesion");
  }

  const rolesAdministrativos = [
    "analista",
    "administrador",
    "superadministrador",
  ];

  const esAdministrador =
    perfil.estado === "activo" &&
    rolesAdministrativos.includes(
      String(perfil.rol),
    );

  if (esAdministrador) {
    redirect("/administrador");
  }

  redirect("/cliente");
}
