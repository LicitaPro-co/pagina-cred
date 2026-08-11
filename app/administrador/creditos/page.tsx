import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Credito = {
  id: string;
  cliente_id: string;
  estado: string;
  monto_aprobado: number | string | null;
  valor_total_pagar: number | string | null;
  total_pagado: number | string | null;
  saldo_total: number | string | null;
  fecha_desembolso: string | null;
  fecha_vencimiento: string | null;
  dias_mora: number | null;
};

type Cliente = {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  numero_documento: string | null;
  celular: string | null;
};

export default async function CreditosAdministradorPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect("/iniciar-sesion");
  }

  const { data: administrador } = await supabase
    .from("perfiles")
    .select("rol, estado")
    .eq("id", user.id)
    .maybeSingle();

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
    data: creditosData,
    error: errorCreditos,
  } = await supabase
    .from("creditos")
    .select(`
      id,
      cliente_id,
      estado,
      monto_aprobado,
      valor_total_pagar,
      total_pagado,
      saldo_total,
      fecha_desembolso,
      fecha_vencimiento,
      dias_mora
    `)
    .order("fecha_desembolso", {
      ascending: false,
      nullsFirst: false,
    });

  if (errorCreditos) {
    console.error(
      "Error consultando créditos:",
      errorCreditos,
    );
  }

  const creditos =
    (creditosData ?? []) as Credito[];

  const idsClientes = [
    ...new Set(
      creditos.map(
        (credito) => credito.cliente_id,
      ),
    ),
  ];

  const {
    data: clientesData,
    error: errorClientes,
  } = idsClientes.length
    ? await supabase
        .from("perfiles")
        .select(`
          id,
          nombres,
          apellidos,
          numero_documento,
          celular
        `)
        .in("id", idsClientes)
    : {
        data: [],
        error: null,
      };

  if (errorClientes) {
    console.error(
      "Error consultando clientes:",
      errorClientes,
    );
  }

  const clientesPorId =
    new Map<string, Cliente>(
      ((clientesData ?? []) as Cliente[]).map(
        (cliente) => [
          cliente.id,
          cliente,
        ],
      ),
    );

  const activos = creditos.filter(
    (credito) =>
      credito.estado === "activo",
  );

  const vencidos = creditos.filter(
    (credito) =>
      credito.estado === "vencido",
  );

  const pagados = creditos.filter(
    (credito) =>
      credito.estado === "pagado",
  );

  const saldoPendiente = sumar(
    creditos
      .filter((credito) =>
        ["activo", "vencido"].includes(
          credito.estado,
        ),
      )
      .map(
        (credito) =>
          credito.saldo_total,
      ),
  );

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
            Página Cred · Cartera
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
            Créditos
          </h1>

          <p className="mt-3 text-slate-600">
            Consulta saldos, vencimientos y registra pagos.
          </p>
        </header>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador
            etiqueta="Total créditos"
            valor={`${creditos.length}`}
          />

          <Indicador
            etiqueta="Activos"
            valor={`${activos.length}`}
          />

          <Indicador
            etiqueta="Vencidos"
            valor={`${vencidos.length}`}
            alerta={vencidos.length > 0}
          />

          <Indicador
            etiqueta="Saldo pendiente"
            valor={formatearDinero(
              saldoPendiente,
            )}
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-[#eadfce] bg-white">
          {!creditos.length ? (
            <div className="p-8 text-slate-600">
              No existen créditos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[#f7f8f5] text-left text-sm text-slate-600">
                  <tr>
                    <th className="px-6 py-4">
                      Cliente
                    </th>

                    <th className="px-6 py-4">
                      Estado
                    </th>

                    <th className="px-6 py-4">
                      Monto
                    </th>

                    <th className="px-6 py-4">
                      Total pagado
                    </th>

                    <th className="px-6 py-4">
                      Saldo
                    </th>

                    <th className="px-6 py-4">
                      Vencimiento
                    </th>

                    <th className="px-6 py-4">
                      Mora
                    </th>

                    <th className="px-6 py-4" />
                  </tr>
                </thead>

                <tbody>
                  {creditos.map((credito) => {
                    const cliente =
                      clientesPorId.get(
                        credito.cliente_id,
                      );

                    return (
                      <tr
                        key={credito.id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-6 py-5">
                          <p className="font-black text-slate-900">
                            {nombreCompleto(
                              cliente,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {cliente?.numero_documento ??
                              "Sin documento"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <Estado
                            estado={
                              credito.estado
                            }
                          />
                        </td>

                        <td className="px-6 py-5 font-bold text-slate-900">
                          {formatearDinero(
                            Number(
                              credito.monto_aprobado ??
                                0,
                            ),
                          )}
                        </td>

                        <td className="px-6 py-5 text-slate-700">
                          {formatearDinero(
                            Number(
                              credito.total_pagado ??
                                0,
                            ),
                          )}
                        </td>

                        <td className="px-6 py-5 font-black text-emerald-700">
                          {formatearDinero(
                            Number(
                              credito.saldo_total ??
                                0,
                            ),
                          )}
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600">
                          {credito.fecha_vencimiento
                            ? formatearFecha(
                                credito.fecha_vencimiento,
                              )
                            : "Sin fecha"}
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-700">
                          {credito.dias_mora ?? 0} días
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`/administrador/creditos/${credito.id}`}
                            className="font-black text-emerald-700"
                          >
                            Ver detalle →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-sm text-slate-500">
          Créditos pagados: {pagados.length}
        </p>
      </div>
    </main>
  );
}

function Indicador({
  etiqueta,
  valor,
  alerta = false,
}: {
  etiqueta: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <article className="rounded-[26px] border border-[#eadfce] bg-white p-6">
      <p
        className={
          alerta
            ? "text-sm font-bold text-rose-700"
            : "text-sm font-bold text-slate-500"
        }
      >
        {etiqueta}
      </p>

      <p
        className={
          alerta
            ? "mt-3 text-3xl font-black text-rose-700"
            : "mt-3 text-3xl font-black text-slate-900"
        }
      >
        {valor}
      </p>
    </article>
  );
}

function Estado({
  estado,
}: {
  estado: string;
}) {
  const estilos: Record<string, string> = {
    activo:
      "bg-emerald-50 text-emerald-700",
    vencido:
      "bg-rose-50 text-rose-700",
    pagado:
      "bg-slate-100 text-slate-700",
    pendiente_desembolso:
      "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${
        estilos[estado] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {estado.replaceAll("_", " ")}
    </span>
  );
}

function nombreCompleto(
  cliente: Cliente | undefined,
) {
  if (!cliente) {
    return "Cliente no encontrado";
  }

  return [
    cliente.nombres,
    cliente.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Cliente";
}

function sumar(
  valores: Array<
    number | string | null
  >,
) {
  return valores.reduce<number>(
    (total, valor) => {
      const numero = Number(
        valor ?? 0,
      );

      return total +
        (Number.isFinite(numero)
          ? numero
          : 0);
    },
    0,
  );
}

function formatearDinero(
  valor: number,
) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    },
  ).format(valor);
}

function formatearFecha(
  fecha: string,
) {
  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "Fecha no válida";
  }

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
      timeZone: "America/Bogota",
    },
  ).format(valor);
}
