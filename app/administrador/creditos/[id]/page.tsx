import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import RegistrarPago from "@/components/administrador/registrar-pago";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type Pago = {
  id: string;
  estado: string;
  valor_pago: number | string | null;
  abono_capital: number | string | null;
  abono_costo: number | string | null;
  abono_iva: number | string | null;
  metodo: string;
  referencia: string | null;
  fecha_pago: string;
  observacion: string | null;
};

export default async function DetalleCreditoPage({
  params,
}: Props) {
  const { id } = await params;

  if (!esUuidValido(id)) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect("/iniciar-sesion");
  }

  const {
    data: administrador,
    error: errorAdministrador,
  } = await supabase
    .from("perfiles")
    .select(`
      rol,
      estado
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (errorAdministrador) {
    console.error(
      "Error consultando el perfil administrativo:",
      errorAdministrador,
    );
  }

  if (
    !administrador ||
    administrador.estado !== "activo" ||
    ![
      "analista",
      "administrador",
      "superadministrador",
    ].includes(String(administrador.rol))
  ) {
    redirect("/cliente");
  }

  const {
    data: credito,
    error: errorCredito,
  } = await supabase
    .from("creditos")
    .select(`
      id,
      cliente_id,
      solicitud_id,
      estado,
      monto_aprobado,
      valor_costo_base,
      valor_iva,
      valor_total_pagar,
      saldo_capital,
      saldo_costo,
      saldo_iva,
      saldo_total,
      total_pagado,
      fecha_desembolso,
      fecha_vencimiento,
      fecha_ultimo_pago,
      fecha_pago_total,
      dias_mora,
      referencia_desembolso
    `)
    .eq("id", id)
    .maybeSingle();

  if (errorCredito) {
    console.error(
      "Error consultando el crédito:",
      errorCredito,
    );
  }

  if (!credito) {
    notFound();
  }

  const [
    resultadoCliente,
    resultadoPagos,
  ] = await Promise.all([
    supabase
      .from("perfiles")
      .select(`
        nombres,
        apellidos,
        numero_documento,
        celular,
        nivel,
        puntaje,
        cupo_actual,
        creditos_pagados,
        creditos_vencidos
      `)
      .eq("id", credito.cliente_id)
      .maybeSingle(),

    supabase
      .from("pagos_credito")
      .select(`
        id,
        estado,
        valor_pago,
        abono_capital,
        abono_costo,
        abono_iva,
        metodo,
        referencia,
        fecha_pago,
        observacion
      `)
      .eq("credito_id", credito.id)
      .order("fecha_pago", {
        ascending: false,
      }),
  ]);

  if (resultadoCliente.error) {
    console.error(
      "Error consultando el cliente:",
      resultadoCliente.error,
    );
  }

  if (resultadoPagos.error) {
    console.error(
      "Error consultando los pagos:",
      resultadoPagos.error,
    );
  }

  const cliente = resultadoCliente.data;

  const pagos =
    (resultadoPagos.data ?? []) as Pago[];

  const saldoActual = Number(
    credito.saldo_total ?? 0,
  );

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-9">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/administrador/creditos"
          className="font-bold text-emerald-700"
        >
          ← Volver a créditos
        </Link>

        <header className="mt-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
            Página Cred · Cartera
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-900">
            Crédito de{" "}
            {nombreCompleto(
              cliente?.nombres,
              cliente?.apellidos,
            )}
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Identificador del crédito: {credito.id}
          </p>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Tarjeta titulo="Resumen del crédito">
            <Dato
              etiqueta="Estado"
              valor={traducirEstado(
                String(credito.estado),
              )}
            />

            <Dato
              etiqueta="Monto aprobado"
              valor={formatearDinero(
                Number(
                  credito.monto_aprobado ?? 0,
                ),
              )}
            />

            <Dato
              etiqueta="Costo base"
              valor={formatearDinero(
                Number(
                  credito.valor_costo_base ?? 0,
                ),
              )}
            />

            <Dato
              etiqueta="IVA"
              valor={formatearDinero(
                Number(
                  credito.valor_iva ?? 0,
                ),
              )}
            />

            <Dato
              etiqueta="Total a pagar"
              valor={formatearDinero(
                Number(
                  credito.valor_total_pagar ?? 0,
                ),
              )}
            />

            <Dato
              etiqueta="Total pagado"
              valor={formatearDinero(
                Number(
                  credito.total_pagado ?? 0,
                ),
              )}
            />

            <Dato
              etiqueta="Saldo pendiente"
              valor={formatearDinero(
                saldoActual,
              )}
              destacado
            />

            <Dato
              etiqueta="Fecha de desembolso"
              valor={
                credito.fecha_desembolso
                  ? formatearFechaHora(
                      credito.fecha_desembolso,
                    )
                  : "Pendiente"
              }
            />

            <Dato
              etiqueta="Fecha de vencimiento"
              valor={
                credito.fecha_vencimiento
                  ? formatearSoloFecha(
                      credito.fecha_vencimiento,
                    )
                  : "Pendiente"
              }
            />

            <Dato
              etiqueta="Días de mora"
              valor={`${credito.dias_mora ?? 0}`}
            />

            <Dato
              etiqueta="Referencia de desembolso"
              valor={
                credito.referencia_desembolso ??
                ""
              }
            />
          </Tarjeta>

          <RegistrarPago
            creditoId={String(credito.id)}
            saldoActual={saldoActual}
            estado={String(credito.estado)}
          />

          <Tarjeta titulo="Cliente">
            <Dato
              etiqueta="Documento"
              valor={
                cliente?.numero_documento ??
                ""
              }
            />

            <Dato
              etiqueta="Celular"
              valor={cliente?.celular ?? ""}
            />

            <Dato
              etiqueta="Nivel"
              valor={`${cliente?.nivel ?? 1}`}
            />

            <Dato
              etiqueta="Puntaje"
              valor={`${cliente?.puntaje ?? 0}`}
            />

            <Dato
              etiqueta="Cupo actual"
              valor={formatearDinero(
                Number(
                  cliente?.cupo_actual ?? 0,
                ),
              )}
            />

            <Dato
              etiqueta="Créditos pagados"
              valor={`${
                cliente?.creditos_pagados ?? 0
              }`}
            />

            <Dato
              etiqueta="Créditos vencidos"
              valor={`${
                cliente?.creditos_vencidos ?? 0
              }`}
            />
          </Tarjeta>

          <Tarjeta titulo="Historial de pagos">
            {!pagos.length ? (
              <p className="text-sm text-slate-500">
                Todavía no existen pagos registrados.
              </p>
            ) : (
              pagos.map((pago) => (
                <article
                  key={pago.id}
                  className="rounded-2xl bg-[#f7f8f5] p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-900">
                        {formatearDinero(
                          Number(
                            pago.valor_pago ?? 0,
                          ),
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {pago.metodo}
                      </p>

                      <p className="mt-1 text-xs font-bold uppercase text-slate-400">
                        {pago.estado}
                      </p>
                    </div>

                    <p className="text-right text-sm text-slate-500">
                      {formatearFechaHora(
                        pago.fecha_pago,
                      )}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                    <span>
                      Capital:{" "}
                      {formatearDinero(
                        Number(
                          pago.abono_capital ?? 0,
                        ),
                      )}
                    </span>

                    <span>
                      Costo:{" "}
                      {formatearDinero(
                        Number(
                          pago.abono_costo ?? 0,
                        ),
                      )}
                    </span>

                    <span>
                      IVA:{" "}
                      {formatearDinero(
                        Number(
                          pago.abono_iva ?? 0,
                        ),
                      )}
                    </span>
                  </div>

                  {pago.referencia ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Referencia: {pago.referencia}
                    </p>
                  ) : null}

                  {pago.observacion ? (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Observación: {pago.observacion}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </Tarjeta>
        </section>
      </div>
    </main>
  );
}

function Tarjeta({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-7">
      <h2 className="text-xl font-black text-slate-900">
        {titulo}
      </h2>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </article>
  );
}

function Dato({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex justify-between gap-5 border-b border-slate-100 pb-3">
      <span className="text-sm text-slate-500">
        {etiqueta}
      </span>

      <span
        className={
          destacado
            ? "text-right font-black text-emerald-700"
            : "text-right font-bold text-slate-900"
        }
      >
        {valor || "No registrado"}
      </span>
    </div>
  );
}

function esUuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function nombreCompleto(
  nombres: string | null | undefined,
  apellidos: string | null | undefined,
) {
  return [nombres, apellidos]
    .filter(Boolean)
    .join(" ")
    .trim() || "Cliente";
}

function traducirEstado(estado: string) {
  return estado
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letra) => letra.toUpperCase(),
    );
}

function formatearDinero(valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearSoloFecha(fecha: string) {
  const [anio, mes, dia] = fecha
    .slice(0, 10)
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(
    new Date(anio, mes - 1, dia),
  );
}

function formatearFechaHora(fecha: string) {
  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "Fecha no válida";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(valor);
}
