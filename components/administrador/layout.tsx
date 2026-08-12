import { redirect } from "next/navigation";

import BotonCerrarSesion from "@/components/auth/boton-cerrar-sesion";
import NavegacionAdministrativa from "@/components/administrador/navegacion-administrativa";
import { createClient } from "@/lib/supabase/server";

type Props = {
  children: React.ReactNode;
};

const ROLES_ADMINISTRATIVOS = [
  "analista",
  "administrador",
  "superadministrador",
];

export default async function AdministradorLayout({
  children,
}: Props) {
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
      nombres,
      apellidos,
      rol,
      estado
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    errorPerfil ||
    !perfil ||
    perfil.estado !== "activo" ||
    !ROLES_ADMINISTRATIVOS.includes(
      String(perfil.rol),
    )
  ) {
    redirect("/cliente");
  }

  const nombreAdministrador =
    [
      perfil.nombres,
      perfil.apellidos,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Administrador";

  return (
    <div className="min-h-screen bg-[#fff8ee]">
      <NavegacionAdministrativa
        nombreAdministrador={
          nombreAdministrador
        }
        rolAdministrador={String(
          perfil.rol,
        )}
      />

      <div className="lg:pl-72">
        <div className="sticky top-0 z-30 flex justify-end border-b border-[#eadfce] bg-[#fff8ee]/95 px-5 py-3 backdrop-blur lg:px-8">
          <BotonCerrarSesion />
        </div>

        <div className="min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}