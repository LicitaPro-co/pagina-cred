import {
  formatearDinero,
  formatearFecha,
} from "@/components/credito/tarjeta-credito";

export type PagoCreditoCliente = {
  id: string;
  estado: string;
  valor_pago: number;
  abono_capital: number;
  abono_costo: number;
  abono_iva: number;
  metodo: string;
  referencia: string | null;
  fecha_pago: string;
  observacion: string | null;
};

type Props = {
  pagos: PagoCreditoCliente[];
};

export default function HistorialPagosCredito({
  pagos,
}: Props) {
  return (
    <section className="rounded-[30px] border border-[#eadfce] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
          Movimientos
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-900">
          Historial de pagos
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Consulta los pagos registrados y su aplicación
          dentro del crédito.
        </p>
      </div>

      {pagos.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-[#f7f8f5] p-5">
          <p className="font-bold text-slate-900">
            Sin pagos registrados
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Este crédito todavía no tiene pagos
            registrados.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {pagos.map((pago) => (
            <article
              key={pago.id}
              className="rounded-2xl border border-slate-100 p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xl font-black text-slate-900">
                    {formatearDinero(
                      pago.valor_pago,
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {nombreMetodo(
                      pago.metodo,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {pago.fecha_pago
                      ? formatearFecha(
                          pago.fecha_pago,
                        )
                      : "Fecha no registrada"}
                  </p>
                </div>

                <EstadoPago
                  estado={pago.estado}
                />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <DatoPago
                  etiqueta="Referencia"
                  valor={
                    pago.referencia ||
                    "Sin referencia"
                  }
                />

                <DatoPago
                  etiqueta="Abono a capital"
                  valor={formatearDinero(
                    pago.abono_capital,
                  )}
                />

                <DatoPago
                  etiqueta="Abono a costos"
                  valor={formatearDinero(
                    pago.abono_costo,
                  )}
                />

                <DatoPago
                  etiqueta="Abono a IVA"
                  valor={formatearDinero(
                    pago.abono_iva,
                  )}
                />
              </div>

              {pago.observacion ? (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Observación
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {pago.observacion}
                  </p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EstadoPago({
  estado,
}: {
  estado: string;
}) {
  const estilos: Record<
    string,
    string
  > = {
    pendiente:
      "bg-amber-50 text-amber-800",
    confirmado:
      "bg-emerald-50 text-emerald-800",
    aprobado:
      "bg-emerald-50 text-emerald-800",
    rechazado:
      "bg-rose-50 text-rose-800",
    anulado:
      "bg-slate-100 text-slate-600",
  };

  const nombres: Record<
    string,
    string
  > = {
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    anulado: "Anulado",
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

function DatoPago({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl bg-[#f7f8f5] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>

      <p className="mt-2 font-black text-slate-900">
        {valor}
      </p>
    </div>
  );
}

function nombreMetodo(
  metodo: string,
) {
  const nombres: Record<
    string,
    string
  > = {
    nequi: "Nequi",
    daviplata: "DaviPlata",
    "dale!": "dale!",
    "bre-b": "Bre-B",
    bre_b: "Bre-B",
    pse: "PSE",
    transferencia:
      "Transferencia bancaria",
    "transferencia bancaria":
      "Transferencia bancaria",
    consignacion: "Consignación",
    efectivo: "Efectivo",
    otro: "Otro",
  };

  return (
    nombres[
      metodo.toLowerCase()
    ] ?? metodo
  );
}
