import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    tipo?: string;
    categoria?: string;
    estado?: string;
    buscar?: string;
  }>;
};

type Movimiento = {
  id: string;
  cuenta_id: string;
  tipo: string;
  categoria: string;
  valor: number | string;
  referencia: string | null;
  descripcion: string | null;
  credito_id: string | null;
  pago_id: string | null;
  cliente_id: string | null;
  registrado_por: string | null;
  fecha_movimiento: string;
  estado: string;
};

type Cuenta = {
  id: string;
  nombre: string;
  entidad: string | null;
};

type Cliente = {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  numero_documento: string | null;
};

export default async function MovimientosTesoreriaPage({
  searchParams,
}: Props) {
  const parametros = await searchParams;

  const tipo = String(
    parametros.tipo ?? "",
  ).trim();

  const categoria = String(
    parametros.categoria ?? "",
  ).trim();

  const estado = String(
    parametros.estado ?? "",
  ).trim();

  const buscar = String(
    parametros.buscar ?? "",
  ).trim();

  const supabase = await createClient();

  let consulta = supabase
    .from("movimientos_tesoreria")
    .select(`
      id,
      cuenta_id,
      tipo,
      categoria,
      valor,
      referencia,
      descripcion,
      credito_id,
      pago_id,
      cliente_id,
      registrado_por,
      fecha_movimiento,
      estado
    `)
    .order("fecha_movimiento", {
      ascending: false,
    });

  if (tipo) {
    consulta = consulta.eq(
      "tipo",
      tipo,
    );
  }

  if (categoria) {
    consulta = consulta.eq(
      "categoria",
      categoria,
    );
  }

  if (estado) {
    consulta = consulta.eq(
      "estado",
      estado,
    );
  }

  if (buscar) {
    const termino = buscar
      .replace(/[%_,()]/g, " ")
      .trim();

    consulta = consulta.or(
      [
        `referencia.ilike.%${termino}%`,
        `descripcion.ilike.%${termino}%`,
      ].join(","),
    );
  }

  const {
    data: movimientos,
    error: errorMovimientos,
  } = await consulta;

  if (errorMovimientos) {
    console.error(
      "Error consultando movimientos de tesorería:",
      errorMovimientos,
    );
  }

  const registros =
    (movimientos ?? []) as Movimiento[];

  const idsCuentas = [
    ...new Set(
      registros.map(
        (movimiento) =>
          movimiento.cuenta_id,
      ),
    ),
  ];

  const idsClientes = [
    ...new Set(
      registros
        .map(
          (movimiento) =>
            movimiento.cliente_id,
        )
        .filter(
          (
            valor,
          ): valor is string =>
            Boolean(valor),
        ),
    ),
  ];

  const [
    resultadoCuentas,
    resultadoClientes,
  ] = await Promise.all([
    idsCuentas.length
      ? supabase
          .from("cuentas_tesoreria")
          .select(`
            id,
            nombre,
            entidad
          `)
          .in("id", idsCuentas)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    idsClientes.length
      ? supabase
          .from("perfiles")
          .select(`
            id,
            nombres,
            apellidos,
            numero_documento
          `)
          .in("id", idsClientes)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  const cuentasPorId =
    new Map<string, Cuenta>(
      ((resultadoCuentas.data ??
        []) as Cuenta[]).map(
        (cuenta) => [
          cuenta.id,
          cuenta,
        ],
      ),
    );

  const clientesPorId =
    new Map<string, Cliente>(
      ((resultadoClientes.data ??
        []) as Cliente[]).map(
        (cliente) => [
          cliente.id,
          cliente,
        ],
      ),
    );

  const totalIngresos = sumar(
    registros
      .filter(
        (movimiento) =>
          movimiento.tipo === "ingreso" &&
          movimiento.estado === "confirmado",
      )
      .map(
        (movimiento) =>
          movimiento.valor,
      ),
  );

  const totalEgresos = sumar(
    registros
      .filter(
        (movimiento) =>
          movimiento.tipo === "egreso" &&
          movimiento.estado === "confirmado",
      )
      .map(
        (movimiento) =>
          movimiento.valor,
      ),
  );

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
              Página Cred · Tesorería
            </p>

            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Movimientos de tesorería
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Consulta ingresos, egresos, referencias,
              cuentas y trazabilidad de la operación.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/administrador/tesoreria"
              className="rounded-2xl border border-emerald-700 px-5 py-3 font-bold text-emerald-700"
            >
              Volver al resumen
            </Link>

            <Link
              href="/administrador/tesoreria/desembolsos"
              className="rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white"
            >
              Ver desembolsos
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Indicador
            etiqueta="Ingresos confirmados"
            valor={formatearDinero(
              totalIngresos,
            )}
          />

          <Indicador
            etiqueta="Egresos confirmados"
            valor={formatearDinero(
              totalEgresos,
            )}
          />

          <Indicador
            etiqueta="Flujo neto"
            valor={formatearDinero(
              totalIngresos -
                totalEgresos,
            )}
            alerta={
              totalIngresos -
                totalEgresos <
              0
            }
          />
        </section>

        <form className="mt-8 grid gap-4 rounded-[28px] border border-[#eadfce] bg-white p-5 md:grid-cols-2 xl:grid-cols-[1fr_170px_220px_170px_auto]">
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Buscar
            </span>

            <input
              name="buscar"
              defaultValue={buscar}
              placeholder="Referencia o descripción"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-emerald-600"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Tipo
            </span>

            <select
              name="tipo"
              defaultValue={tipo}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-600"
            >
              <option value="">
                Todos
              </option>

              <option value="ingreso">
                Ingreso
              </option>

              <option value="egreso">
                Egreso
              </option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Categoría
            </span>

            <select
              name="categoria"
              defaultValue={categoria}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-600"
            >
              <option value="">
                Todas
              </option>

              <option value="desembolso_credito">
                Desembolso de crédito
              </option>

              <option value="recaudo_credito">
                Recaudo de crédito
              </option>

              <option value="ajuste_entrada">
                Ajuste de entrada
              </option>

              <option value="ajuste_salida">
                Ajuste de salida
              </option>

              <option value="gasto_operativo">
                Gasto operativo
              </option>

              <option value="devolucion">
                Devolución
              </option>

              <option value="otro">
                Otro
              </option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Estado
            </span>

            <select
              name="estado"
              defaultValue={estado}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-600"
            >
              <option value="">
                Todos
              </option>

              <option value="confirmado">
                Confirmado
              </option>

              <option value="pendiente">
                Pendiente
              </option>

              <option value="anulado">
                Anulado
              </option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-emerald-700 px-5 py-3.5 font-bold text-white"
            >
              Filtrar
            </button>

            <Link
              href="/administrador/tesoreria/movimientos"
              className="rounded-2xl border border-slate-200 px-4 py-3.5 font-bold text-slate-600"
            >
              Limpiar
            </Link>
          </div>
        </form>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-[#eadfce] bg-white">
          {!registros.length ? (
            <div className="p-8 text-slate-600">
              No existen movimientos con los filtros
              seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[#f7f8f5] text-left text-sm text-slate-600">
                  <tr>
                    <th className="px-6 py-4">
                      Fecha
                    </th>

                    <th className="px-6 py-4">
                      Cuenta
                    </th>

                    <th className="px-6 py-4">
                      Cliente
                    </th>

                    <th className="px-6 py-4">
                      Categoría
                    </th>

                    <th className="px-6 py-4">
                      Referencia
                    </th>

                    <th className="px-6 py-4">
                      Valor
                    </th>

                    <th className="px-6 py-4">
                      Estado
                    </th>

                    <th className="px-6 py-4" />
                  </tr>
                </thead>

                <tbody>
                  {registros.map(
                    (movimiento) => {
                      const cuenta =
                        cuentasPorId.get(
                          movimiento.cuenta_id,
                        );

                      const cliente =
                        movimiento.cliente_id
                          ? clientesPorId.get(
                              movimiento.cliente_id,
                            )
                          : undefined;

                      return (
                        <tr
                          key={movimiento.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-6 py-5 text-sm text-slate-600">
                            {formatearFechaHora(
                              movimiento.fecha_movimiento,
                            )}
                          </td>

                          <td className="px-6 py-5">
                            <p className="font-bold text-slate-900">
                              {cuenta?.nombre ??
                                "Cuenta no encontrada"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {cuenta?.entidad ??
                                "Sin entidad"}
                            </p>
                          </td>

                          <td className="px-6 py-5">
                            <p className="font-bold text-slate-900">
                              {nombreCompleto(
                                cliente,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {cliente?.numero_documento ??
                                "Sin documento"}
                            </p>
                          </td>

                          <td className="px-6 py-5 text-sm font-bold text-slate-700">
                            {traducirTexto(
                              movimiento.categoria,
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {movimiento.referencia ??
                              "Sin referencia"}
                          </td>

                          <td
                            className={
                              movimiento.tipo ===
                              "ingreso"
                                ? "px-6 py-5 font-black text-emerald-700"
                                : "px-6 py-5 font-black text-rose-700"
                            }
                          >
                            {movimiento.tipo ===
                            "ingreso"
                              ? "+"
                              : "-"}
                            {formatearDinero(
                              Number(
                                movimiento.valor,
                              ),
                            )}
                          </td>

                          <td className="px-6 py-5">
                            <Estado
                              estado={
                                movimiento.estado
                              }
                            />
                          </td>

                          <td className="px-6 py-5 text-right">
                            {movimiento.credito_id ? (
                              <Link
                                href={`/administrador/creditos/${movimiento.credito_id}`}
                                className="font-black text-emerald-700"
                              >
                                Ver crédito →
                              </Link>
                            ) : (
                              <span className="text-sm text-slate-400">
                                Sin vínculo
                              </span>
                            )}
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
    confirmado:
      "bg-emerald-50 text-emerald-700",
    pendiente:
      "bg-amber-50 text-amber-700",
    anulado:
      "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${
        estilos[estado] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {estado}
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
    return "Sin cliente";
  }

  return [
    cliente.nombres,
    cliente.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Cliente";
}

function traducirTexto(
  valor: string,
) {
  return valor
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letra) =>
        letra.toUpperCase(),
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

function formatearFechaHora(
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
      timeStyle: "short",
      timeZone:
        "America/Bogota",
    },
  ).format(valor);
}