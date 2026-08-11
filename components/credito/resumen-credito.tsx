import {
  EstadoCredito,
  calcularInformacionPlazo,
  formatearDinero,
  formatearFecha,
  type CreditoCliente,
} from "@/components/credito/tarjeta-credito";

type Props = {
  credito: CreditoCliente;
};

export default function ResumenCredito({
  credito,
}: Props) {
  const totalInicial = Number(
    credito.valor_total_pagar ?? 0,
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
      credito.dias_mora,
    );

  return (
    <section className="rounded-[30px] border border-[#eadfce] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            Detalle del crédito
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-900">
            {formatearDinero(
              credito.monto_aprobado,
            )}
          </h1>

          <p className="mt-2 text-slate-500">
            Plazo de {credito.plazo_dias} días
          </p>
        </div>

        <EstadoCredito
          estado={credito.estado}
        />
      </div>

      <div className="mt-7 rounded-3xl bg-[#f7f8f5] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-600">
              Saldo total pendiente
            </p>

            <p className="mt-2 text-4xl font-black text-slate-900">
              {formatearDinero(
                credito.saldo_total,
              )}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-sm text-slate-500">
              Has pagado
            </p>

            <p className="mt-1 text-xl font-black text-emerald-700">
              {formatearDinero(totalPagado)}
            </p>
          </div>
        </div>

        <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-700 transition-all"
            style={{
              width: `${progreso}%`,
            }}
          />
        </div>

        <p className="mt-2 text-right text-xs font-bold text-slate-500">
          {progreso.toFixed(0)} % pagado
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DatoResumen
          etiqueta="Capital inicial"
          valor={formatearDinero(
            credito.monto_aprobado,
          )}
        />

        <DatoResumen
          etiqueta="Interés inicial"
          valor={formatearDinero(
            credito.valor_interes,
          )}
        />

        <DatoResumen
          etiqueta="Total inicial"
          valor={formatearDinero(
            credito.valor_total_pagar,
          )}
        />

        <DatoResumen
          etiqueta="Capital pendiente"
          valor={formatearDinero(
            credito.saldo_capital,
          )}
        />

        <DatoResumen
          etiqueta="Interés pendiente"
          valor={formatearDinero(
            credito.saldo_interes,
          )}
        />

        <DatoResumen
          etiqueta="Costos e IVA pendientes"
          valor={formatearDinero(
            Number(credito.saldo_costo) +
              Number(credito.saldo_iva),
          )}
        />

        <DatoResumen
          etiqueta="Fecha de desembolso"
          valor={
            credito.fecha_desembolso
              ? formatearFecha(
                  credito.fecha_desembolso,
                )
              : "Pendiente"
          }
        />

        <DatoResumen
          etiqueta="Fecha de vencimiento"
          valor={
            credito.fecha_vencimiento
              ? formatearFecha(
                  credito.fecha_vencimiento,
                )
              : "Pendiente"
          }
        />

        <DatoResumen
          etiqueta="Estado del plazo"
          valor={informacionPlazo.texto}
          alerta={
            informacionPlazo.tipo === "mora"
          }
        />

        <DatoResumen
          etiqueta="Último pago"
          valor={
            credito.fecha_ultimo_pago
              ? formatearFecha(
                  credito.fecha_ultimo_pago,
                )
              : "Sin pagos"
          }
        />

        <DatoResumen
          etiqueta="Fecha de pago total"
          valor={
            credito.fecha_pago_total
              ? formatearFecha(
                  credito.fecha_pago_total,
                )
              : "No aplica"
          }
        />

        <DatoResumen
          etiqueta="Días de mora"
          valor={`${Number(
            credito.dias_mora ?? 0,
          )}`}
          alerta={
            Number(credito.dias_mora ?? 0) > 0
          }
        />
      </div>
    </section>
  );
}

function DatoResumen({
  etiqueta,
  valor,
  alerta = false,
}: {
  etiqueta: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-5">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>

      <p
        className={`mt-3 text-lg font-black ${
          alerta
            ? "text-rose-700"
            : "text-slate-900"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
