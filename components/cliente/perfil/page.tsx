import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FormularioPerfil from "@/components/cliente/formulario-perfil";

export default async function PerfilClientePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  const { data: perfil, error } = await supabase
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
    .single();

  if (error || !perfil) {
    redirect("/cliente");
  }

  const { data: cuenta } = await supabase
    .from("cuentas_desembolso")
    .select(`
      id,
      proveedor,
      tipo_cuenta,
      numero_cuenta,
      titular,
      numero_documento_titular,
      metodo_desembolso,
      tipo_llave,
      valor_llave
    `)
    .eq("cliente_id", user.id)
    .eq("es_principal", true)
    .eq("activa", true)
    .maybeSingle();

  const { data: referencias } = await supabase
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

  return (
    <FormularioPerfil
      perfil={perfil}
      cuenta={cuenta}
      referencias={referencias ?? []}
    />
  );
}


