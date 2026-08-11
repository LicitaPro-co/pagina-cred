import Link from "next/link";
import { redirect } from "next/navigation";

import TarjetaCredito, {
  type CreditoCliente,
} from "@/components/credito/tarjeta-credito";
import { createClient } from "@/lib/supabase/server";

export default async function ClientePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  console.log("CLIENTE / usuario:", user?.id ?? null);
  console.log(
    "CLIENTE / error autenticación:",
    errorUsuario?.message ?? null,
  );

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
      estado,
      nivel,
      puntaje,
      cupo_minimo,
      cupo_actual,
      creditos_pagados,
      perfil_completo
    `)
    .eq("id", user.id)
    .maybeSingle();

  console.log(
    "CLIENTE / perfil encontrado:",
    Boolean(perfil),
  );

  console.log(
    "CLIENTE / error perfil:",
    errorPerfil?.message ?? null,
  );

  if (errorPerfil) {
    throw new Error(
      `No fue posible consultar el perfil: ${errorPerfil.message}`,
    );
  }

  if (!perfil) {
    return (
      <main className="min-h-screen bg-[#fff8ee] px-5 py-10">
        <section className="mx-auto max-w-xl rounded-[30px] border border-[#eadfce] bg-white p-8">
          <h1 className="text-2xl font-black text-slate-900">
            Perfil no encontrado
          </h1>

          <p className="mt-3 leading-7 text-slate-600">
            La sesión inició correctamente, pero no se
            encontró un perfil asociado a tu usuario.
          </p>

          <p className="mt-3 break-all text-sm text-slate-500">
            Usuario: {user.id}
          </p>
        </section>
      </main>
    );
  }

  const {
    data: creditosData,
    error: errorCreditos,
  } = await supabase
    .from("creditos")
    .select("*")
    .eq("id_cliente", user.id);

  if (errorCreditos) {
    throw new Error(
      `No fue posible consultar los créditos: ${errorCreditos.message}`,
    );
  }

  const creditos: CreditoCliente[] = (creditosData ?? []).map(
    normalizarCredito,
  );

  const creditosActivos = creditos.filter((credito) =>
    ["pendiente_desembolso", "activo", "vencido"].includes(
      credito.estado,
    ),
  );

  const creditosFinalizados = creditos.filter((credito) =>
    ["pagado", "cancelado"].includes(credito.estado),
  );

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
              Página Cred
            </p>

            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Mis créditos
            </h1>

            <p className="mt-3 text-slate-600">
              Consulta tus créditos, saldos, vencimientos y pagos.
            </p>
          </div>

          <Link
            href="/cliente"
            className="w-fit rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700"
          >
            Volver al panel
          </Link>
        </header>

        {creditos.length === 0 ? (
          <section className="mt-10 rounded-[30px] border border-[#eadfce] bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">
              Aún no tienes créditos
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
              Cuando una solicitud sea aprobada y desembolsada,
              podrás consultar aquí toda la información.
            </p>

            <Link
              href="/cliente/solicitar"
              className="mt-7 inline-block rounded-2xl bg-emerald-700 px-6 py-4 font-bold text-white"
            >
              Solicitar un crédito
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Créditos vigentes
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    Obligaciones activas o pendientes.
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
                  {creditosActivos.length}
                </span>
              </div>

              {creditosActivos.length > 0 ? (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  {creditosActivos.map((credito) => (
                    <TarjetaCredito
                      key={credito.id}
                      credito={credito}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-2xl bg-white p-5 text-slate-600">
                  No tienes créditos vigentes.
                </p>
              )}
            </section>

            <section className="mt-12">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Historial
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    Créditos pagados o cancelados.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                  {creditosFinalizados.length}
                </span>
              </div>

              {creditosFinalizados.length > 0 ? (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  {creditosFinalizados.map((credito) => (
                    <TarjetaCredito
                      key={credito.id}
                      credito={credito}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-6 rounded-2xl bg-white p-5 text-slate-600">
                  Aún no tienes créditos finalizados.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function normalizarCredito(
  credito: Record<string, unknown>,
): CreditoCliente {
  return {
    id: String(credito.id),
    estado: String(credito.estado ?? ""),
    monto_aprobado: Number(credito.monto_aprobado ?? 0),
    plazo_dias: Number(credito.plazo_dias ?? 0),
    valor_interes: Number(credito.valor_interes ?? 0),
    valor_costo_base: Number(credito.valor_costo_base ?? 0),
    valor_iva: Number(credito.valor_iva ?? 0),
    valor_total_pagar: Number(
      credito.valor_total_pagar ?? 0,
    ),
    saldo_capital: Number(credito.saldo_capital ?? 0),
    saldo_interes: Number(credito.saldo_interes ?? 0),
    saldo_costo: Number(credito.saldo_costo ?? 0),
    saldo_iva: Number(credito.saldo_iva ?? 0),
    saldo_total: Number(credito.saldo_total ?? 0),
    total_pagado: Number(credito.total_pagado ?? 0),
    fecha_desembolso:
      typeof credito.fecha_desembolso === "string"
        ? credito.fecha_desembolso
        : null,
    fecha_vencimiento:
      typeof credito.fecha_vencimiento === "string"
        ? credito.fecha_vencimiento
        : null,
    fecha_ultimo_pago:
      typeof credito.fecha_ultimo_pago === "string"
        ? credito.fecha_ultimo_pago
        : null,
    fecha_pago_total:
      typeof credito.fecha_pago_total === "string"
        ? credito.fecha_pago_total
        : null,
    dias_mora: Number(credito.dias_mora ?? 0),
    creado_en: String(credito.creado_en ?? ""),
  };
}
