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
  celular: string | null;
  numero_documento: string | null;
};

export default async function VencimientosPage() {
  const supabase = await createClient();

  const hoy = obtenerFechaBogota();

  const fechaLimite = sumarDias(
    hoy,
    7,
  );

  const {
    data: creditos,
    error,
  } = await supabase
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
    .lte(
      "fecha_vencimiento",
      fechaLimite,
    )
    .order("fecha_vencimiento", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Error consultando vencimientos:",
      error,
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

  const { data: clientes } =
    idsClientes.length
      ? await supabase
          .from("perfiles")
          .select(`
            id,
            nombres,
            apellidos,
            celular,
            numero_documento
          `)
          .in("id", idsClientes)
      : {
          data: [],
        };

  const clientesPorId =
    new Map<string, Cliente>(
      ((clientes ?? []) as Cliente[]).map(
        (cliente) => [
          cliente.id,
          cliente,
        ],
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
              Próximos vencimientos
            </h1>

            <p className="mt-3 text-slate-600">
              Créditos vencidos o con vencimiento durante
              los próximos siete días.
            </p>
          </div>

          <Link
            href="/administrador/cartera/cobranza"
            className="rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white"
          >
            Ir a cobranza
          </Link>
        </header>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-[#eadfce] bg-white">
          {!registros.length ? (
            <div className="p-8 text-slate-600">
              No existen vencimientos durante el periodo.
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
                      Fecha
                    </th>

                    <th className="px-6 py-4">
                      Situación
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

                      const diferencia =
                        credito.fecha_vencimiento
                          ? diferenciaDias(
                              hoy,
                              credito.fecha_vencimiento,
                            )
                          : 0;

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
                            <Situacion
                              diferencia={
                                diferencia
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
      </div>
    </main>
  );
}

function Situacion({
  diferencia,
}: {
  diferencia: number;
}) {
  if (diferencia < 0) {
    return (
      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase text-rose-700">
        Vencido hace{" "}
        {Math.abs(diferencia)} días
      </span>
    );
  }

  if (diferencia === 0) {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-700">
        Vence hoy
      </span>
    );
  }

  return (
    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
      Vence en {diferencia} días
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

function sumarDias(
  fecha: string,
  dias: number,
) {
  const [anio, mes, dia] = fecha
    .split("-")
    .map(Number);

  const valor = new Date(
    Date.UTC(
      anio,
      mes - 1,
      dia + dias,
    ),
  );

  return valor
    .toISOString()
    .slice(0, 10);
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