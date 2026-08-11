import { redirect } from "next/navigation";

import FormularioPerfil from "@/components/cliente/formulario-perfil";
import { createClient } from "@/lib/supabase/server";

export default async function PerfilClientePage() {
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
      id,
      nombres,
      apellidos,
      correo,
      celular,
      celular_alterno,
      tipo_documento,
      numero_documento,
      fecha_expedicion,
      lugar_expedicion,
      fecha_nacimiento,
      sexo,
      estado_civil,
      departamento,
      ciudad,
      direccion,
      barrio,
      ocupacion,
      empresa,
      cargo,
      ingreso_mensual,
      antiguedad_meses,
      acepta_terminos,
      acepta_datos,
      acepta_consulta_riesgo,
      perfil_completo
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (errorPerfil || !perfil) {
    redirect("/cliente");
  }

  const {
    data: cuenta,
    error: errorCuenta,
  } = await supabase
    .from("cuentas_desembolso")
    .select(`
      id,
      proveedor,
      metodo_desembolso,
      tipo_cuenta,
      numero_cuenta,
      tipo_llave,
      valor_llave,
      titular,
      numero_documento_titular,
      es_principal,
      activa
    `)
    .eq("cliente_id", user.id)
    .eq("es_principal", true)
    .eq("activa", true)
    .order("creado_en", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (errorCuenta) {
    console.error(
      "Error consultando la cuenta de desembolso:",
      errorCuenta.message,
    );
  }

  const {
    data: referencias,
    error: errorReferencias,
  } = await supabase
    .from("referencias_cliente")
    .select(`
      id,
      tipo,
      nombre_completo,
      parentesco,
      celular
    `)
    .eq("cliente_id", user.id)
    .order("tipo");

  if (errorReferencias) {
    console.error(
      "Error consultando referencias:",
      errorReferencias.message,
    );
  }

  return (
    <FormularioPerfil
      perfil={perfil}
      cuenta={cuenta ?? null}
      referencias={referencias ?? []}
    />
  );
}
