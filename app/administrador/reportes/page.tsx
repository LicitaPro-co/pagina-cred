import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type Credito = {
  estado: string;
  monto_aprobado: number | string | null;
  saldo_total: number | string | null;
  total_pagado: number | string | null;
  dias_mora: number | null;
};

type Movimiento = {
  tipo: string;
  categoria: string;
  valor: number | string | null;
  estado: string;
};

export default async function ReportesPage() {
  const supabase = await createClient();

  const [
    resultadoClientes,
    resultadoSolicitudes,
    resultadoCreditos,
    resultadoPagos,
    resultadoMovimientos,
  ] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("rol", "cliente"),

    supabase
      .from("solicitudes_credito")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("creditos")
      .select(`
        estado,
        monto_aprobado,
        saldo_total,
        total_pagado,
        dias_mora
      `),

    supabase
      .from("pagos_credito")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("movimientos_tesoreria")
      .select(`
        tipo,
        categoria,
        valor,
        estado
      `)
      .eq("estado", "confirmado"),
  ]);

  const creditos =
    (resultadoCreditos.data ?? []) as Credito[];

  const movimientos =
    (resultadoMovimientos.data ??
      []) as Movimiento[];

  const capitalColocado = sumar(
    creditos.map(
      (credito) => credito.monto_aprobado,
    ),
  );

  const carteraPendiente = sumar(
    creditos
      .filter((credito) =>
        [
          "activo",
          "vencido",
          "castigado",
        ].includes(credito.estado),
      )
      .map(
        (credito) => credito.saldo_total,
      ),
  );

  const carteraVencida = sumar(
    creditos
      .filter(
        (credito) =>
          credito.estado === "vencido",
      )
      .map(
        (credito) => credito.saldo_total,
      ),
  );

  const totalRecuperado = sumar(
    creditos.map(
      (credito) => credito.total_pagado,
    ),
  );

  const totalDesembolsos = sumar(
    movimientos
      .filter(
        (movimiento) =>
          movimiento.categoria ===
          "desembolso_credito",
      )
      .map(
        (movimiento) => movimiento.valor,
      ),
  );

  const totalRecaudos = sumar(
    movimientos
      .filter(
        (movimiento) =>
          movimiento.categoria ===
          "recaudo_credito",
      )
      .map(
        (movimiento) => movimiento.valor,
      ),
  );

  const creditosVencidos =
    creditos.filter(
      (credito) =>
        credito.estado === "vencido",
    ).length;

  const porcentajeMora =
    carteraPendiente > 0
      ? (carteraVencida /
          carteraPendiente) *
        100
      : 0;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
            Página Cred · Información gerencial
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
            Reportes
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Consulta indicadores y exporta la
            información operativa y financiera.
          </p>
        </header>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador
            etiqueta="Clientes"
            valor={`${resultadoClientes.count ?? 0}`}
            descripcion="Perfiles de clientes registrados"
          />

          <Indicador
            etiqueta="Solicitudes"
            valor={`${resultadoSolicitudes.count ?? 0}`}
            descripcion="Solicitudes recibidas"
          />

          <Indicador
            etiqueta="Créditos"
            valor={`${creditos.length}`}
            descripcion={`${creditosVencidos} vencidos`}
            alerta={creditosVencidos > 0}
          />

          <Indicador
            etiqueta="Pagos"
            valor={`${resultadoPagos.count ?? 0}`}
            descripcion="Pagos registrados"
          />
        </section>

        <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador
            etiqueta="Capital colocado"
            valor={formatearDinero(
              capitalColocado,
            )}
            descripcion="Monto aprobado acumulado"
          />

          <Indicador
            etiqueta="Total recuperado"
            valor={formatearDinero(
              totalRecuperado,
            )}
            descripcion="Pagos aplicados a créditos"
          />

          <Indicador
            etiqueta="Cartera pendiente"
            valor={formatearDinero(
              carteraPendiente,
            )}
            descripcion="Saldo activo y vencido"
          />

          <Indicador
            etiqueta="Índice de mora"
            valor={`${porcentajeMora.toFixed(2)} %`}
            descripcion={formatearDinero(
              carteraVencida,
            )}
            alerta={porcentajeMora > 0}
          />
        </section>

        <section className="mt-6 grid gap-5 sm:grid-cols-2">
          <Indicador
            etiqueta="Desembolsos contabilizados"
            valor={formatearDinero(
              totalDesembolsos,
            )}
            descripcion="Egresos por créditos"
          />

          <Indicador
            etiqueta="Recaudos contabilizados"
            valor={formatearDinero(
              totalRecaudos,
            )}
            descripcion="Ingresos por pagos"
          />
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-black text-slate-900">
            Exportaciones
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Los archivos CSV pueden abrirse directamente
            en Excel.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Reporte
              titulo="Clientes"
              descripcion="Datos personales, ubicación, nivel, cupo y comportamiento."
              tipo="clientes"
            />

            <Reporte
              titulo="Solicitudes"
              descripcion="Montos, plazos, estados, costos y fechas."
              tipo="solicitudes"
            />

            <Reporte
              titulo="Créditos"
              descripcion="Créditos de todos los estados y sus saldos."
              tipo="creditos"
            />

            <Reporte
              titulo="Cartera"
              descripcion="Créditos activos, vencidos y castigados."
              tipo="cartera"
            />

            <Reporte
              titulo="Pagos"
              descripcion="Pagos, abonos, métodos y referencias."
              tipo="pagos"
            />

            <Reporte
              titulo="Desembolsos"
              descripcion="Egresos de tesorería asociados a créditos."
              tipo="desembolsos"
            />

            <Reporte
              titulo="Recaudos"
              descripcion="Ingresos de tesorería asociados a pagos."
              tipo="recaudos"
            />
          </div>
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

function Reporte({
  titulo,
  descripcion,
  tipo,
}: {
  titulo: string;
  descripcion: string;
  tipo: string;
}) {
  return (
    <article className="rounded-[26px] border border-[#eadfce] bg-white p-6">
      <h3 className="text-xl font-black text-slate-900">
        {titulo}
      </h3>

      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">
        {descripcion}
      </p>

      <Link
        href={`/api/administrador/reportes/exportar?tipo=${tipo}`}
        className="mt-6 inline-flex w-full justify-center rounded-2xl bg-emerald-700 px-5 py-3.5 font-bold text-white transition hover:bg-emerald-800"
      >
        Exportar CSV
      </Link>
    </article>
  );
}

function sumar(
  valores: Array<number | string | null>,
): number {
  return valores.reduce<number>(
    (total, valor) => {
      const numero = Number(valor ?? 0);

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

function formatearDinero(valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}
