import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type Credito = {
  id: string;
  cliente_id: string;
  estado: string;
  saldo_total: number | string | null;
  fecha_vencimiento: string | null;
  dias_mora: number | null;
};

type Cliente = {
  id: string;
  nombres: string | null;
  apellidos: string | null;
  numero_documento: string | null;
  celular: string | null;
  celular_alterno: string | null;
  ciudad: string | null;
  estado: string | null;
};

type Gestion = {
  id: string;
  credito_id: string;
  tipo_contacto: string;
  resultado: string;
  observacion: string;
  proxima_gestion_en: string | null;
  creado_en: string;
};

type Compromiso = {
  id: string;
  credito_id: string;
  valor_comprometido: number | string;
  fecha_compromiso: string;
  estado: string;
  observacion: string | null;
  creado_en: string;
};

export default async function CobranzaPage() {
  const supabase = await createClient();

  const hoy = obtenerFechaBogota();

  const [
    resultadoCreditos,
    resultadoGestiones,
    resultadoCompromisos,
  ] = await Promise.all([
    supabase
      .from("creditos")
      .select(`
        id,
        cliente_id,
        estado,
        saldo_total,
        fecha_vencimiento,
        dias_mora
      `)
      .in("estado", [
        "activo",
        "vencido",
      ])
      .gt("saldo_total", 0)
      .order("dias_mora", {
        ascending: false,
      }),

    supabase
      .from("gestiones_cobranza")
      .select(`
        id,
        credito_id,
        tipo_contacto,
        resultado,
        observacion,
        proxima_gestion_en,
        creado_en
      `)
      .order("creado_en", {
        ascending: false,
      }),

    supabase
      .from("compromisos_pago")
      .select(`
        id,
        credito_id,
        valor_comprometido,
        fecha_compromiso,
        estado,
        observacion,
        creado_en
      `)
      .in("estado", [
        "pendiente",
        "incumplido",
      ])
      .order("fecha_compromiso", {
        ascending: true,
      }),
  ]);

  if (resultadoCreditos.error) {
    console.error(
      "Error consultando créditos para cobranza:",
      resultadoCreditos.error,
    );
  }

  if (resultadoGestiones.error) {
    console.error(
      "Error consultando gestiones de cobranza:",
      resultadoGestiones.error,
    );
  }

  if (resultadoCompromisos.error) {
    console.error(
      "Error consultando compromisos:",
      resultadoCompromisos.error,
    );
  }

  const creditos =
    (resultadoCreditos.data ?? []) as Credito[];

  const gestiones =
    (resultadoGestiones.data ?? []) as Gestion[];

  const compromisos =
    (resultadoCompromisos.data ?? []) as Compromiso[];

  const idsClientes = [
    ...new Set(
      creditos.map(
        (credito) => credito.cliente_id,
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
          celular,
          celular_alterno,
          ciudad,
          estado
        `)
        .in("id", idsClientes)
    : {
        data: [],
        error: null,
      };

  if (errorClientes) {
    console.error(
      "Error consultando clientes de cobranza:",
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

  const ultimaGestionPorCredito =
    new Map<string, Gestion>();

  for (const gestion of gestiones) {
    if (
      !ultimaGestionPorCredito.has(
        gestion.credito_id,
      )
    ) {
      ultimaGestionPorCredito.set(
        gestion.credito_id,
        gestion,
      );
    }
  }

  const compromisoPorCredito =
    new Map<string, Compromiso>();

  for (const compromiso of compromisos) {
    if (
      !compromisoPorCredito.has(
        compromiso.credito_id,
      )
    ) {
      compromisoPorCredito.set(
        compromiso.credito_id,
        compromiso,
      );
    }
  }

  const vencidos = creditos.filter(
    (credito) =>
      credito.estado === "vencido",
  );

  const activosVencidosPorFecha =
    creditos.filter((credito) => {
      if (
        credito.estado !== "activo" ||
        !credito.fecha_vencimiento
      ) {
        return false;
      }

      return (
        credito.fecha_vencimiento.slice(
          0,
          10,
        ) < hoy
      );
    });

  const compromisosPendientes =
    compromisos.filter(
      (compromiso) =>
        compromiso.estado === "pendiente",
    );

  const compromisosIncumplidos =
    compromisos.filter(
      (compromiso) =>
        compromiso.estado === "incumplido",
    );

  const gestionesProgramadas =
    gestiones.filter((gestion) => {
      if (!gestion.proxima_gestion_en) {
        return false;
      }

      return (
        gestion.proxima_gestion_en >=
        `${hoy}T00:00:00-05:00`
      );
    });

  const saldoVencido = sumar(
    vencidos.map(
      (credito) => credito.saldo_total,
    ),
  );

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
              Página Cred · Cartera
            </p>

            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Gestión de cobranza
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Prioriza clientes vencidos, compromisos de
              pago, próximas gestiones y seguimiento de
              recuperación.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/administrador/cartera"
              className="rounded-2xl border border-emerald-700 px-5 py-3 font-bold text-emerald-700"
            >
              Ver cartera
            </Link>

            <Link
              href="/administrador/cartera/vencimientos"
              className="rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white"
            >
              Próximos vencimientos
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador
            etiqueta="Créditos vencidos"
            valor={`${vencidos.length}`}
            descripcion="Obligaciones con saldo en mora"
            alerta={vencidos.length > 0}
          />

          <Indicador
            etiqueta="Saldo vencido"
            valor={formatearDinero(
              saldoVencido,
            )}
            descripcion="Cartera pendiente vencida"
            alerta={saldoVencido > 0}
          />

          <Indicador
            etiqueta="Compromisos pendientes"
            valor={`${compromisosPendientes.length}`}
            descripcion="Acuerdos aún vigentes"
          />

          <Indicador
            etiqueta="Compromisos incumplidos"
            valor={`${compromisosIncumplidos.length}`}
            descripcion="Requieren seguimiento inmediato"
            alerta={
              compromisosIncumplidos.length > 0
            }
          />
        </section>

        {activosVencidosPorFecha.length ? (
          <section className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <p className="font-black">
              Atención
            </p>

            <p className="mt-2 text-sm leading-6">
              Hay{" "}
              {activosVencidosPorFecha.length} crédito(s)
              con fecha de vencimiento superada que todavía
              figuran como activos. Ejecuta la función
              administrativa de actualización de cartera.
            </p>
          </section>
        ) : null}

        <section className="mt-8 overflow-hidden rounded-[28px] border border-[#eadfce] bg-white">
          {!creditos.length ? (
            <div className="p-8 text-slate-600">
              No existen créditos pendientes de gestión.
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
                      Saldo
                    </th>

                    <th className="px-6 py-4">
                      Mora
                    </th>

                    <th className="px-6 py-4">
                      Vencimiento
                    </th>

                    <th className="px-6 py-4">
                      Última gestión
                    </th>

                    <th className="px-6 py-4">
                      Compromiso
                    </th>

                    <th className="px-6 py-4">
                      Estado
                    </th>

                    <th className="px-6 py-4" />
                  </tr>
                </thead>

                <tbody>
                  {creditos.map(
                    (credito) => {
                      const cliente =
                        clientesPorId.get(
                          credito.cliente_id,
                        );

                      const ultimaGestion =
                        ultimaGestionPorCredito.get(
                          credito.id,
                        );

                      const compromiso =
                        compromisoPorCredito.get(
                          credito.id,
                        );

                      return (
                        <tr
                          key={credito.id}
                          className="border-t border-slate-100 align-top"
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
                                cliente?.celular_alterno ??
                                "Sin celular"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {cliente?.ciudad ??
                                "Sin ciudad"}
                            </p>
                          </td>

                          <td className="px-6 py-5 font-black text-slate-900">
                            {formatearDinero(
                              Number(
                                credito.saldo_total ??
                                  0,
                              ),
                            )}
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

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {credito.fecha_vencimiento
                              ? formatearSoloFecha(
                                  credito.fecha_vencimiento,
                                )
                              : "Sin fecha"}
                          </td>

                          <td className="px-6 py-5 text-sm text-slate-600">
                            {ultimaGestion ? (
                              <>
                                <p className="font-bold capitalize text-slate-900">
                                  {traducirTexto(
                                    ultimaGestion.tipo_contacto,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {traducirTexto(
                                    ultimaGestion.resultado,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {formatearFechaHora(
                                    ultimaGestion.creado_en,
                                  )}
                                </p>
                              </>
                            ) : (
                              <span className="text-amber-700">
                                Sin gestión
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-5 text-sm">
                            {compromiso ? (
                              <>
                                <p className="font-black text-slate-900">
                                  {formatearDinero(
                                    Number(
                                      compromiso.valor_comprometido,
                                    ),
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {formatearSoloFecha(
                                    compromiso.fecha_compromiso,
                                  )}
                                </p>

                                <Estado
                                  estado={
                                    compromiso.estado
                                  }
                                />
                              </>
                            ) : (
                              <span className="text-slate-500">
                                Sin compromiso
                              </span>
                            )}
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
                              Gestionar →
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

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <Tarjeta titulo="Próximas gestiones">
            {!gestionesProgramadas.length ? (
              <MensajeVacio texto="No existen gestiones programadas." />
            ) : (
              <div className="space-y-3">
                {gestionesProgramadas
                  .slice(0, 10)
                  .map((gestion) => (
                    <Link
                      key={gestion.id}
                      href={`/administrador/creditos/${gestion.credito_id}`}
                      className="block rounded-2xl bg-[#f7f8f5] p-5 transition hover:bg-emerald-50"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-slate-900">
                            {traducirTexto(
                              gestion.tipo_contacto,
                            )}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {traducirTexto(
                              gestion.resultado,
                            )}
                          </p>
                        </div>

                        <p className="text-sm font-bold text-emerald-700">
                          {gestion.proxima_gestion_en
                            ? formatearFechaHora(
                                gestion.proxima_gestion_en,
                              )
                            : "Sin fecha"}
                        </p>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </Tarjeta>

          <Tarjeta titulo="Compromisos incumplidos">
            {!compromisosIncumplidos.length ? (
              <MensajeVacio texto="No existen compromisos incumplidos." />
            ) : (
              <div className="space-y-3">
                {compromisosIncumplidos
                  .slice(0, 10)
                  .map((compromiso) => (
                    <Link
                      key={compromiso.id}
                      href={`/administrador/creditos/${compromiso.credito_id}`}
                      className="block rounded-2xl bg-rose-50 p-5 transition hover:bg-rose-100"
                    >
                      <p className="font-black text-rose-800">
                        {formatearDinero(
                          Number(
                            compromiso.valor_comprometido,
                          ),
                        )}
                      </p>

                      <p className="mt-2 text-sm text-rose-700">
                        Fecha comprometida:{" "}
                        {formatearSoloFecha(
                          compromiso.fecha_compromiso,
                        )}
                      </p>
                    </Link>
                  ))}
              </div>
            )}
          </Tarjeta>
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

function Tarjeta({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-7">
      <h2 className="text-xl font-black text-slate-900">
        {titulo}
      </h2>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function MensajeVacio({
  texto,
}: {
  texto: string;
}) {
  return (
    <p className="rounded-2xl bg-[#f7f8f5] p-5 text-sm text-slate-500">
      {texto}
    </p>
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
    pendiente:
      "bg-amber-50 text-amber-700",
    vencido:
      "bg-rose-50 text-rose-700",
    incumplido:
      "bg-rose-50 text-rose-700",
    cumplido:
      "bg-emerald-50 text-emerald-700",
    cancelado:
      "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
        estilos[estado] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {traducirTexto(estado)}
    </span>
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

function traducirTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letra) => letra.toUpperCase(),
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

function obtenerFechaBogota() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function formatearDinero(valor: number) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    },
  ).format(valor);
}

function formatearSoloFecha(fecha: string) {
  const [anio, mes, dia] = fecha
    .slice(0, 10)
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
    },
  ).format(
    new Date(anio, mes - 1, dia),
  );
}

function formatearFechaHora(fecha: string) {
  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "Fecha no válida";
  }

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Bogota",
    },
  ).format(valor);
}
