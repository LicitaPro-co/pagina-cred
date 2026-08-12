import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import HistorialPagosCredito, {
  type PagoCreditoCliente,
} from "@/components/credito/historial-pagos-credito";
import ResumenCredito from "@/components/credito/resumen-credito";
import type { CreditoCliente } from "@/components/credito/tarjeta-credito";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DetalleCreditoPage({
  params,
}: Props) {
  const { id } = await params;

  if (!esUuidValido(id)) {
    notFound();
  }

  const supabase =
    await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect(
      "/iniciar-sesion",
    );
  }

  /*
   * El cliente solamente puede consultar
   * créditos que le pertenecen.
   */
  const {
    data: credito,
    error: errorCredito,
  } = await supabase
    .from("creditos")
    .select(`
      id,
      cliente_id,
      estado,
      monto_aprobado,
      plazo_dias,
      valor_interes,
      valor_costo_base,
      valor_iva,
      valor_total_pagar,
      saldo_capital,
      saldo_interes,
      saldo_costo,
      saldo_iva,
      saldo_total,
      total_pagado,
      fecha_desembolso,
      fecha_vencimiento,
      fecha_ultimo_pago,
      fecha_pago_total,
      dias_mora,
      creado_en
    `)
    .eq("id", id)
    .eq(
      "cliente_id",
      user.id,
    )
    .maybeSingle();

  if (errorCredito) {
    console.error(
      "Error consultando crédito:",
      errorCredito.message,
    );

    notFound();
  }

  if (!credito) {
    notFound();
  }

  /*
   * Consultamos todos los pagos registrados
   * sobre este crédito.
   */
  const {
    data: pagos,
    error: errorPagos,
  } = await supabase
    .from("pagos_credito")
    .select(`
      id,
      estado,
      valor_pago,
      abono_capital,
      abono_interes,
      abono_costo,
      abono_iva,
      metodo,
      referencia,
      fecha_pago,
      observacion
    `)
    .eq(
      "credito_id",
      id,
    )
    .eq(
      "cliente_id",
      user.id,
    )
    .order(
      "fecha_pago",
      {
        ascending: false,
      },
    );

  if (errorPagos) {
    console.error(
      "Error cargando pagos del crédito:",
      errorPagos.message,
    );
  }

  const creditoNormalizado: CreditoCliente =
    {
      id: String(
        credito.id,
      ),

      estado: String(
        credito.estado ?? "",
      ),

      monto_aprobado: Number(
        credito.monto_aprobado ??
          0,
      ),

      plazo_dias: Number(
        credito.plazo_dias ?? 0,
      ),

      valor_interes: Number(
        credito.valor_interes ??
          0,
      ),

      valor_costo_base: Number(
        credito.valor_costo_base ??
          0,
      ),

      valor_iva: Number(
        credito.valor_iva ?? 0,
      ),

      valor_total_pagar: Number(
        credito.valor_total_pagar ??
          0,
      ),

      saldo_capital: Number(
        credito.saldo_capital ??
          0,
      ),

      saldo_interes: Number(
        credito.saldo_interes ??
          0,
      ),

      saldo_costo: Number(
        credito.saldo_costo ??
          0,
      ),

      saldo_iva: Number(
        credito.saldo_iva ?? 0,
      ),

      saldo_total: Number(
        credito.saldo_total ??
          0,
      ),

      total_pagado: Number(
        credito.total_pagado ??
          0,
      ),

      fecha_desembolso:
        typeof credito.fecha_desembolso ===
        "string"
          ? credito.fecha_desembolso
          : null,

      fecha_vencimiento:
        typeof credito.fecha_vencimiento ===
        "string"
          ? credito.fecha_vencimiento
          : null,

      fecha_ultimo_pago:
        typeof credito.fecha_ultimo_pago ===
        "string"
          ? credito.fecha_ultimo_pago
          : null,

      fecha_pago_total:
        typeof credito.fecha_pago_total ===
        "string"
          ? credito.fecha_pago_total
          : null,

      dias_mora: Number(
        credito.dias_mora ?? 0,
      ),

      creado_en: String(
        credito.creado_en ?? "",
      ),
    };

  const pagosNormalizados: PagoCreditoCliente[] =
    (pagos ?? []).map(
      (pago) => ({
        id: String(
          pago.id,
        ),

        estado: String(
          pago.estado ??
            "confirmado",
        ),

        valor_pago: Number(
          pago.valor_pago ?? 0,
        ),

        abono_capital: Number(
          pago.abono_capital ??
            0,
        ),

        abono_interes: Number(
          pago.abono_interes ??
            0,
        ),

        abono_costo: Number(
          pago.abono_costo ??
            0,
        ),

        abono_iva: Number(
          pago.abono_iva ?? 0,
        ),

        metodo: String(
          pago.metodo ??
            "Otro",
        ),

        referencia:
          typeof pago.referencia ===
          "string"
            ? pago.referencia
            : null,

        fecha_pago: String(
          pago.fecha_pago ??
            "",
        ),

        observacion:
          typeof pago.observacion ===
          "string"
            ? pago.observacion
            : null,
      }),
    );

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
              Página Cred
            </p>

            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Detalle del crédito
            </h1>

            <p className="mt-3 text-slate-600">
              Consulta el saldo,
              vencimiento y movimientos
              de tu crédito.
            </p>
          </div>

          <Link
            href="/cliente/creditos"
            className="w-fit rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
          >
            ← Volver a mis créditos
          </Link>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <ResumenCredito
            credito={
              creditoNormalizado
            }
          />

          <HistorialPagosCredito
            pagos={
              pagosNormalizados
            }
          />
        </div>
      </div>
    </main>
  );
}

function esUuidValido(
  valor: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}
