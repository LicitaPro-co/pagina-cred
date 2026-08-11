import { redirect } from "next/navigation";

import FormularioDesembolso from "@/components/credito/formulario-desembolso";
import { createClient } from "@/lib/supabase/server";

export default async function MedioDesembolsoPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect("/iniciar-sesion");
  }

  const { data: cuenta, error: errorCuenta } = await supabase
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
      activa
    `)
    .eq("usuario_id", user.id)
    .eq("activa", true)
    .order("creado_en", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (errorCuenta) {
    console.error(
      "Error cargando el medio de desembolso:",
      errorCuenta,
    );
  }

  return (
    <FormularioDesembolso
      cuentaActual={
        cuenta
          ? {
              id: String(cuenta.id),
              proveedor: cuenta.proveedor,
              metodo_desembolso:
                cuenta.metodo_desembolso,
              tipo_cuenta:
                cuenta.tipo_cuenta,
              numero_cuenta:
                cuenta.numero_cuenta,
              tipo_llave:
                cuenta.tipo_llave,
              valor_llave:
                cuenta.valor_llave,
              titular:
                cuenta.titular,
              numero_documento_titular:
                cuenta.numero_documento_titular,
            }
          : null
      }
    />
  );
}
