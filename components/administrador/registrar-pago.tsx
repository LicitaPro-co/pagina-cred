"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  creditoId: string;
  saldoActual: number;
  estado: string;
};

type RespuestaApi = {
  ok?: boolean;
  pagoId?: string;
  error?: string;
};

const METODOS = [
  "Nequi",
  "DaviPlata",
  "dale!",
  "Bre-B",
  "PSE",
  "Transferencia bancaria",
  "Efectivo",
  "Otro",
] as const;

const TOLERANCIA_CIERRE = 0.5;

export default function RegistrarPago({
  creditoId,
  saldoActual,
  estado,
}: Props) {
  const router = useRouter();

  const saldoNormalizado = useMemo(
    () => redondearDinero(Number(saldoActual ?? 0)),
    [saldoActual],
  );

  const saldoOperativo =
    saldoNormalizado < TOLERANCIA_CIERRE
      ? 0
      : saldoNormalizado;

  const estadoNormalizado = String(
    estado ?? "",
  ).toLowerCase();

  const puedeRegistrar =
    ["activo", "vencido"].includes(
      estadoNormalizado,
    ) && saldoOperativo > 0;

  const [valor, setValor] = useState(
    String(saldoOperativo),
  );

  const [metodo, setMetodo] =
    useState<(typeof METODOS)[number]>(
      "Nequi",
    );

  const [referencia, setReferencia] =
    useState("");

  const [observacion, setObservacion] =
    useState("");

  const [fechaPago, setFechaPago] =
    useState(obtenerFechaBogota());

  const [procesando, setProcesando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [esError, setEsError] =
    useState(false);

  const [pagoRegistrado, setPagoRegistrado] =
    useState(false);

  useEffect(() => {
    setValor(String(saldoOperativo));

    if (
      saldoOperativo <= 0 ||
      !["activo", "vencido"].includes(
        estadoNormalizado,
      )
    ) {
      setPagoRegistrado(true);
    }
  }, [
    saldoOperativo,
    estadoNormalizado,
  ]);

  async function registrar() {
    setMensaje("");
    setEsError(false);

    if (!puedeRegistrar || pagoRegistrado) {
      mostrarError(
        "Este crédito no admite nuevos pagos.",
      );
      return;
    }

    const valorNumerico =
      redondearDinero(Number(valor));

    if (
      !Number.isFinite(valorNumerico) ||
      valorNumerico <= 0
    ) {
      mostrarError(
        "Ingresa un valor de pago válido.",
      );
      return;
    }

    if (
      valorNumerico >
      saldoOperativo + TOLERANCIA_CIERRE
    ) {
      mostrarError(
        `El pago no puede superar el saldo de ${formatearDinero(
          saldoOperativo,
        )}.`,
      );
      return;
    }

    const valorEnviar =
      Math.abs(
        valorNumerico - saldoOperativo,
      ) < TOLERANCIA_CIERRE
        ? saldoOperativo
        : valorNumerico;

    if (!metodo.trim()) {
      mostrarError(
        "Selecciona un método de pago.",
      );
      return;
    }

    if (!fechaPago) {
      mostrarError(
        "Selecciona la fecha del pago.",
      );
      return;
    }

    if (
      referencia.trim().length > 150
    ) {
      mostrarError(
        "La referencia no puede superar los 150 caracteres.",
      );
      return;
    }

    if (
      observacion.trim().length > 500
    ) {
      mostrarError(
        "La observación no puede superar los 500 caracteres.",
      );
      return;
    }

    if (
      !window.confirm(
        `¿Confirmas el registro de un pago por ${formatearDinero(
          valorEnviar,
        )}?`,
      )
    ) {
      return;
    }

    setProcesando(true);

    try {
      const respuesta = await fetch(
        `/api/administrador/creditos/${creditoId}/pagos`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            valor: valorEnviar,
            metodo,
            referencia:
              referencia.trim() || null,
            observacion:
              observacion.trim() || null,
            fechaPago:
              `${fechaPago}T12:00:00-05:00`,
          }),
        },
      );

      let resultado: RespuestaApi = {};

      try {
        resultado =
          (await respuesta.json()) as RespuestaApi;
      } catch {
        resultado = {};
      }

      if (!respuesta.ok) {
        mostrarError(
          resultado.error ??
            "No fue posible registrar el pago.",
        );
        return;
      }

      setMensaje(
        "El pago fue registrado correctamente.",
      );

      setEsError(false);
      setReferencia("");
      setObservacion("");

      if (
        Math.abs(
          valorEnviar - saldoOperativo,
        ) < TOLERANCIA_CIERRE
      ) {
        setPagoRegistrado(true);
        setValor("0");
      }

      router.refresh();
    } catch (error) {
      console.error(
        "Error registrando pago:",
        error,
      );

      mostrarError(
        "Ocurrió un error de comunicación con el servidor.",
      );
    } finally {
      setProcesando(false);
    }
  }

  function mostrarError(texto: string) {
    setMensaje(texto);
    setEsError(true);
    setProcesando(false);
  }

  if (
    !puedeRegistrar ||
    pagoRegistrado
  ) {
    return (
      <article className="rounded-[28px] border border-[#eadfce] bg-white p-7">
        <h2 className="text-xl font-black text-slate-900">
          Registrar pago
        </h2>

        <div className="mt-5 rounded-2xl bg-slate-100 p-4">
          <p className="text-sm font-bold text-slate-700">
            Este crédito no admite nuevos pagos.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {saldoOperativo <= 0
              ? "El crédito no tiene saldo pendiente."
              : `Estado actual: ${formatearEstado(
                  estadoNormalizado,
                )}.`}
          </p>
        </div>

        {mensaje ? (
          <p
            className={
              esError
                ? "mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800"
                : "mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
            }
          >
            {mensaje}
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-7">
      <h2 className="text-xl font-black text-slate-900">
        Registrar pago
      </h2>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Valor del pago
        </span>

        <input
          type="number"
          min="0.01"
          max={saldoOperativo}
          step="0.01"
          value={valor}
          disabled={procesando}
          onChange={(event) =>
            setValor(event.target.value)
          }
          className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-emerald-600 disabled:bg-slate-100"
        />

        <p className="mt-2 text-xs text-slate-500">
          Saldo pendiente:{" "}
          {formatearDinero(
            saldoOperativo,
          )}
        </p>
      </label>

      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Método de pago
        </span>

        <select
          value={metodo}
          disabled={procesando}
          onChange={(event) =>
            setMetodo(
              event.target
                .value as (typeof METODOS)[number],
            )
          }
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-600 disabled:bg-slate-100"
        >
          {METODOS.map((opcion) => (
            <option
              key={opcion}
              value={opcion}
            >
              {opcion}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Fecha del pago
        </span>

        <input
          type="date"
          value={fechaPago}
          disabled={procesando}
          onChange={(event) =>
            setFechaPago(
              event.target.value,
            )
          }
          className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-emerald-600 disabled:bg-slate-100"
        />
      </label>

      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Referencia
        </span>

        <input
          value={referencia}
          disabled={procesando}
          maxLength={150}
          onChange={(event) =>
            setReferencia(
              event.target.value,
            )
          }
          placeholder="Número de transacción o comprobante"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-emerald-600 disabled:bg-slate-100"
        />

        <p className="mt-1 text-right text-xs text-slate-400">
          {referencia.length}/150
        </p>
      </label>

      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Observación
        </span>

        <textarea
          value={observacion}
          disabled={procesando}
          onChange={(event) =>
            setObservacion(
              event.target.value,
            )
          }
          rows={4}
          maxLength={500}
          placeholder="Información adicional del pago."
          className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-emerald-600 disabled:bg-slate-100"
        />

        <p className="mt-1 text-right text-xs text-slate-400">
          {observacion.length}/500
        </p>
      </label>

      {mensaje ? (
        <p
          className={
            esError
              ? "mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800"
              : "mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
          }
        >
          {mensaje}
        </p>
      ) : null}

      <button
        type="button"
        disabled={procesando}
        onClick={registrar}
        className="mt-6 w-full rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {procesando
          ? "Registrando pago..."
          : "Registrar pago"}
      </button>
    </article>
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

function redondearDinero(
  valor: number,
) {
  return (
    Math.round(
      (valor + Number.EPSILON) *
        100,
    ) / 100
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
      minimumFractionDigits:
        Number.isInteger(valor)
          ? 0
          : 2,
      maximumFractionDigits: 2,
    },
  ).format(valor);
}

function formatearEstado(
  estado: string,
) {
  return estado
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letra) =>
        letra.toUpperCase(),
    );
}
