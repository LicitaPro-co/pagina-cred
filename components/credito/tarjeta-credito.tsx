import Link from "next/link";

export type CreditoCliente = {
  id: string;
  estado: string;
  monto_aprobado: number;
  plazo_dias: number;
  valor_interes: number;
  valor_costo_base: number;
  valor_iva: number;
  valor_total_pagar: number;
  saldo_capital: number;
  saldo_interes: number;
  saldo_costo: number;
  saldo_iva: number;
  saldo_total: number;
  total_pagado: number;
  fecha_desembolso: string | null;
  fecha_vencimiento: string | null;
  fecha_ultimo_pago: string | null;
  fecha_pago_total: string | null;
  dias_mora: number;
  creado_en: string;
};

type Props = {
  credito: CreditoCliente;
};

export default function TarjetaCredito({
  credito,
}: Props) {
  const totalInicial = Number(
    credito.valor_total_pagar ?? 0,
  );

  const saldo = Number(
    credito.saldo_total ?? 0,
  );

  const totalPagado = Number(
    credito.total_pagado ?? 0,
  );

  const progreso =
    totalInicial > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (totalPagado / totalInicial) * 100,
          ),
        )
      : credito.estado === "pagado"
        ? 100
        : 0;

  const informacionPlazo =
    calcularInformacionPlazo(
      credito.fecha_vencimiento,
      credito.estado,
      Number(credito.dias_mora ?? 0),
    );

  return (
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Crédito
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {formatearDinero(
              credito.monto_aprobado,
            )}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Plazo de {credito.plazo_dias} días
          </p>
        </div>

        <EstadoCredito estado={credito.estado} />
      </div>

      <div className="mt-6 rounded-2xl bg-[#f7f8f5] p-5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-slate-600">
            Saldo pendiente
          </span>

          <strong className="text-xl text-slate-900">
            {formatearDinero(saldo)}
          </strong>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-700 transition-all"
            style={{
              width: `${progreso}%`,
            }}
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>
            Pagado{" "}
            {formatearDinero(totalPagado)}
          </span>

          <span>
            {progreso.toFixed(0)} %
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DatoCredito
          etiqueta="Total del crédito"
          valor={formatearDinero(totalInicial)}
        />

        <DatoCredito
          etiqueta="Vencimiento"
          valor={
            credito.fecha_vencimiento
              ? formatearFecha(
                  credito.fecha_vencimiento,
                )
              : "Pendiente"
          }
        />

        <DatoCredito
          etiqueta="Estado del plazo"
          valor={informacionPlazo.texto}
          destacado={
            informacionPlazo.tipo === "mora"
          }
        />

        <DatoCredito
          etiqueta="Último pago"
          valor={
            credito.fecha_ultimo_pago
              ? formatearFecha(
                  credito.fecha_ultimo_pago,
                )
              : "Sin pagos"
          }
        />
      </div>

      <Link
        href={`/cliente/creditos/${credito.id}`}
        className="mt-6 block w-full rounded-2xl bg-emerald-700 px-5 py-4 text-center font-bold text-white transition hover:bg-emerald-800"
      >
        Ver detalle del crédito
      </Link>
    </article>
  );
}

export function EstadoCredito({
  estado,
}: {
  estado: string;
}) {
  const estilos: Record<string, string> = {
    pendiente_desembolso:
      "bg-amber-50 text-amber-800",
    activo:
      "bg-emerald-50 text-emerald-800",
    vencido:
      "bg-rose-50 text-rose-800",
    pagado:
      "bg-slate-100 text-slate-700",
    cancelado:
      "bg-slate-100 text-slate-500",
  };

  const nombres: Record<string, string> = {
    pendiente_desembolso:
      "Pendiente de desembolso",
    activo: "Activo",
    vencido: "Vencido",
    pagado: "Pagado",
    cancelado: "Cancelado",
  };

  return (
    <span
      className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
        estilos[estado] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {nombres[estado] ?? estado}
    </span>
  );
}

function DatoCredito({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>

      <p
        className={`mt-2 font-black ${
          destacado
            ? "text-rose-700"
            : "text-slate-900"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

export function calcularInformacionPlazo(
  fechaVencimiento: string | null,
  estado: string,
  diasMora: number,
) {
  if (estado === "pagado") {
    return {
      texto: "Crédito pagado",
      tipo: "pagado",
    };
  }

  if (!fechaVencimiento) {
    return {
      texto: "Sin fecha definida",
      tipo: "pendiente",
    };
  }

  const hoy = inicioDelDia(new Date());

  const vencimiento = inicioDelDia(
    new Date(`${fechaVencimiento}T12:00:00`),
  );

  const diferencia = Math.ceil(
    (vencimiento.getTime() - hoy.getTime()) /
      86400000,
  );

  if (
    estado === "vencido" ||
    diferencia < 0 ||
    diasMora > 0
  ) {
    const mora =
      diasMora > 0
        ? diasMora
        : Math.abs(diferencia);

    return {
      texto: `${mora} ${
        mora === 1 ? "día" : "días"
      } de mora`,
      tipo: "mora",
    };
  }

  if (diferencia === 0) {
    return {
      texto: "Vence hoy",
      tipo: "hoy",
    };
  }

  return {
    texto: `${diferencia} ${
      diferencia === 1 ? "día" : "días"
    } restantes`,
    tipo: "vigente",
  };
}

export function formatearDinero(
  valor: number | string | null,
) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor ?? 0));
}

export function formatearFecha(
  fecha: string,
) {
  const fechaNormalizada =
    fecha.length === 10
      ? `${fecha}T12:00:00`
      : fecha;

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(new Date(fechaNormalizada));
}

function inicioDelDia(fecha: Date) {
  const resultado = new Date(fecha);

  resultado.setHours(0, 0, 0, 0);

  return resultado;
}
