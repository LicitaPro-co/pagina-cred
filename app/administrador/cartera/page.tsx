import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

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

export default async function CarteraPage() {
  const supabase = await createClient();

  const {
    data: creditos,
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
    .order("fecha_vencimiento", {
      ascending: true,
    });

  if (errorCreditos) {
    console.error(
      "Error consultando cartera:",
      errorCreditos,
    );
  }

  const registros =
    (creditos ?? []) as Credito[];

  const idsClientes = [
    ...new Set(
      registros.map(
        (credito) =>
          credito.cliente_id,
      ),
    ),
  ];

  const {
    data: clientes,
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
      "Error consultando clientes de cartera:",
      errorClientes,
    );
  }

  const clientesPorId =
    new Map<string, Cliente>(
      ((clientes ?? []) as Cliente[]).map(
        (cliente) => [
          cliente.id,
          cliente,
        ],
      ),
    );

  const activos = registros.filter(
    (credito) =>
      credito.estado === "activo",
  );

  const vencidos = registros.filter(
    (credito) =>
      credito.estado === "vencido",
  );

  const pagados = registros.filter(
    (credito) =>
      credito.estado === "pagado",
  );

  const castigados = registros.filter(
    (credito) =>
      credito.estado === "castigado",
  );

  const capitalColocado = sumar(
    registros
      .filter((credito) =>
        [
          "activo",
          "vencido",
          "pagado",
          "castigado",
        ].includes(
          credito.estado,
        ),
      )
      .map(
        (credito) =>
          credito.monto_aprobado,
      ),
  );

  const capitalRecuperado = sumar(
    registros.map(
      (credito) =>
        credito.total_pagado,
    ),
  );

  const carteraVigente = sumar(
    activos.map(
      (credito) =>
        credito.saldo_total,
    ),
  );

  const carteraVencida = sumar(
    vencidos.map(
      (credito) =>
        credito.saldo_total,
    ),
  );

  const hoy = obtenerFechaBogota();

  const proximosVencimientos =
    activos.filter((credito) => {
      if (
        !credito.fecha_vencimiento
      ) {
        return false;
      }

      const dias = diferenciaDias(
        hoy,
        credito.fecha_vencimiento,
      );

      return dias >= 0 && dias <= 3;
    });

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
              Página Cred · Cartera
            </p>

            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Resumen de cartera
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Consulta capital colocado,
              recuperación, saldos, vencimientos
              y créditos en mora.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/administrador/cartera/vencimientos"
              className="rounded-2xl border border-emerald-700 px-5 py-3 font-bold text-emerald-700"
            >
              Próximos vencimientos
            </Link>

            <Link
              href="/administrador/cartera/cobranza"
              className="rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white"
            >
              Gestión de cobranza
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador
            etiqueta="Capital colocado"
            valor={formatearDinero(
              capitalColocado,
            )}
            descripcion="Monto total desembolsado"
          />

          <Indicador
            etiqueta="Capital recuperado"
            valor={formatearDinero(
              capitalRecuperado,
            )}
            descripcion="Total pagado por clientes"
          />

          <Indicador
            etiqueta="Cartera vigente"
            valor={formatearDinero(
              carteraVigente,
            )}
            descripcion={`${activos.length} créditos activos`}
          />

          <Indicador
            etiqueta="Cartera vencida"
            valor={formatearDinero(
              carteraVencida,
            )}
            descripcion={`${vencidos.length} créditos vencidos`}
            alerta={
              vencidos.length > 0
            }
          />
        </section>

        <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador
            etiqueta="Créditos pagados"
            valor={`${pagados.length}`}
            descripcion="Obligaciones canceladas"
          />

          <Indicador
            etiqueta="Próximos a vencer"
            valor={`${proximosVencimientos.length}`}
            descripcion="Vencen en máximo 3 días"
            alerta={
              proximosVencimientos.length >
              0
            }
          />

          <Indicador
            etiqueta="Créditos castigados"
            valor={`${castigados.length}`}
            descripcion="Cartera clasificada como castigada"
            alerta={
              castigados.length > 0
            }
          />

          <Indicador
            etiqueta="Total créditos"
            valor={`${registros.length}`}
            descripcion="Todos los estados"
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-[#eadfce] bg-white">
          {!registros.length ? (
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
                      Monto
                    </th>

                    <th className="px-6 py-4">
                      Pagado
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

                    <th className="px-6 py-4">
                      Estado
                    </th>

                    <th className="px-6 py-4" />
                  </tr>
                </thead>

                <tbody>
                  {registros.map(
                    (credito) => {
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

                            <p className="mt-1 text-xs text-slate-500">
                              {cliente?.celular ??
                                "Sin celular"}
                            </p>
                          </td>

                          <td className="px-6 py-5 font-black text-slate-900">
                            {formatearDinero(
                              Number(
                                credito.monto_aprobado ??
                                  0,
                              ),
                            )}
                          </td>

                          <td className="px-6 py-5 font-bold text-emerald-700">
                            {formatearDinero(
                              Number(
                                credito.total_pagado ??
                                  0,
                              ),
                            )}
                          </td>

                          <td className="px-6 py-5 font-black text-slate-900">
                            {formatearDinero(
                              Number(
                                credito.saldo_total ??
                                  0,
                              ),
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {credito.fecha_vencimiento
                              ? formatearSoloFecha(
                                  credito.fecha_vencimiento,
                                )
                              : "Sin fecha"}
                          </td>

                          <td className="px-6 py-5">
                            <span
                              className={
                                Number(
                                  credito.dias_mora ??
                                    0,
                                ) > 0
                                  ? "font-black text-rose-700"
                                  : "text-slate-500"
                              }
                            >
                              {credito.dias_mora ??
                                0}{" "}
                              días
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <Estado
                              estado={
                                credito.estado
                              }
                            />
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
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Indicador({
  etiqueta,
  valor,
  descripcion,
  alerta = false,
}: {
  etiqueta: string;
  valor: string;
  descripcion: string;
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

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {descripcion}
      </p>
    </article>
  );
}

function Estado({
  estado,
}: {
  estado: string;
}) {
  const estilos: Record<
    string,
    string
  > = {
    activo:
      "bg-emerald-50 text-emerald-700",
    pagado:
      "bg-blue-50 text-blue-700",
    vencido:
      "bg-rose-50 text-rose-700",
    pendiente_desembolso:
      "bg-violet-50 text-violet-700",
    cancelado:
      "bg-slate-100 text-slate-700",
    castigado:
      "bg-slate-900 text-white",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
        estilos[estado] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {estado.replaceAll("_", " ")}
    </span>
  );
}

function sumar(
  valores: Array<
    number | string | null
  >,
): number {
  return valores.reduce<number>(
    (total, valor) => {
      const numero = Number(
        valor ?? 0,
      );

      return (
        total +
        (Number.isFinite(numero)
          ? numero
          : 0)
      );
    },
    0,
  );
}

function nombreCompleto(
  cliente: Cliente | undefined,
) {
  if (!cliente) {
    return "Cliente";
  }

  return [
    cliente.nombres,
    cliente.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Cliente";
}

function obtenerFechaBogota() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function diferenciaDias(
  fechaInicial: string,
  fechaFinal: string,
) {
  const inicio = new Date(
    `${fechaInicial.slice(
      0,
      10,
    )}T00:00:00Z`,
  );

  const fin = new Date(
    `${fechaFinal.slice(
      0,
      10,
    )}T00:00:00Z`,
  );

  return Math.round(
    (fin.getTime() -
      inicio.getTime()) /
      86_400_000,
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

function formatearSoloFecha(
  fecha: string,
) {
  const [anio, mes, dia] =
    fecha
      .slice(0, 10)
      .split("-")
      .map(Number);

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
    },
  ).format(
    new Date(
      anio,
      mes - 1,
      dia,
    ),
  );
}
