"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TipoContacto =
  | "llamada"
  | "whatsapp"
  | "correo"
  | "sms"
  | "visita"
  | "otro";

type ResultadoGestion =
  | "sin_respuesta"
  | "contactado"
  | "compromiso_pago"
  | "pago_reportado"
  | "negativa_pago"
  | "datos_incorrectos"
  | "otro";

type Props = {
  creditoId: string;
  saldoActual: number;
  estado: string;
};

const TIPOS_CONTACTO: Array<{
  valor: TipoContacto;
  etiqueta: string;
}> = [
  {
    valor: "llamada",
    etiqueta: "Llamada",
  },
  {
    valor: "whatsapp",
    etiqueta: "WhatsApp",
  },
  {
    valor: "correo",
    etiqueta: "Correo electrónico",
  },
  {
    valor: "sms",
    etiqueta: "SMS",
  },
  {
    valor: "visita",
    etiqueta: "Visita",
  },
  {
    valor: "otro",
    etiqueta: "Otro",
  },
];

const RESULTADOS: Array<{
  valor: ResultadoGestion;
  etiqueta: string;
}> = [
  {
    valor: "sin_respuesta",
    etiqueta: "Sin respuesta",
  },
  {
    valor: "contactado",
    etiqueta: "Cliente contactado",
  },
  {
    valor: "compromiso_pago",
    etiqueta: "Compromiso de pago",
  },
  {
    valor: "pago_reportado",
    etiqueta: "Pago reportado",
  },
  {
    valor: "negativa_pago",
    etiqueta: "Negativa de pago",
  },
  {
    valor: "datos_incorrectos",
    etiqueta: "Datos incorrectos",
  },
  {
    valor: "otro",
    etiqueta: "Otro resultado",
  },
];

export default function RegistrarGestionCobranza({
  creditoId,
  saldoActual,
  estado,
}: Props) {
  const router = useRouter();

  const [tipoContacto, setTipoContacto] =
    useState<TipoContacto>("llamada");

  const [resultado, setResultado] =
    useState<ResultadoGestion>(
      "sin_respuesta",
    );

  const [observacion, setObservacion] =
    useState("");

  const [
    proximaGestion,
    setProximaGestion,
  ] = useState("");

  const [
    valorCompromiso,
    setValorCompromiso,
  ] = useState(
    String(
      Math.round(saldoActual),
    ),
  );

  const [
    fechaCompromiso,
    setFechaCompromiso,
  ] = useState(
    obtenerFechaManana(),
  );

  const [procesando, setProcesando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [esError, setEsError] =
    useState(false);

  const puedeGestionar = [
    "activo",
    "vencido",
  ].includes(estado);

  const esCompromiso =
    resultado === "compromiso_pago";

  async function registrar() {
    if (!puedeGestionar) {
      mostrarError(
        "Este crédito no admite gestiones de cobranza.",
      );
      return;
    }

    const observacionLimpia =
      observacion.trim();

    if (!observacionLimpia) {
      mostrarError(
        "Debes registrar una observación.",
      );
      return;
    }

    if (esCompromiso) {
      const valor = Number(
        valorCompromiso,
      );

      if (
        !Number.isFinite(valor) ||
        valor <= 0
      ) {
        mostrarError(
          "Ingresa un valor de compromiso válido.",
        );
        return;
      }

      if (valor > saldoActual) {
        mostrarError(
          `El compromiso no puede superar el saldo de ${formatearDinero(
            saldoActual,
          )}.`,
        );
        return;
      }

      if (!fechaCompromiso) {
        mostrarError(
          "Selecciona la fecha del compromiso.",
        );
        return;
      }
    }

    if (
      !window.confirm(
        "¿Confirmas el registro de esta gestión de cobranza?",
      )
    ) {
      return;
    }

    setProcesando(true);
    setMensaje("");
    setEsError(false);

    try {
      const respuesta = await fetch(
        `/api/administrador/creditos/${creditoId}/cobranza`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            tipoContacto,
            resultado,
            observacion:
              observacionLimpia,
            proximaGestion:
              proximaGestion
                ? `${proximaGestion}:00-05:00`
                : null,
            valorCompromiso:
              esCompromiso
                ? Number(
                    valorCompromiso,
                  )
                : null,
            fechaCompromiso:
              esCompromiso
                ? fechaCompromiso
                : null,
          }),
        },
      );

      const respuestaJson =
        (await respuesta.json()) as {
          error?: string;
          gestionId?: string;
        };

      if (!respuesta.ok) {
        mostrarError(
          respuestaJson.error ??
            "No fue posible registrar la gestión.",
        );
        return;
      }

      setMensaje(
        esCompromiso
          ? "La gestión y el compromiso de pago fueron registrados correctamente."
          : "La gestión de cobranza fue registrada correctamente.",
      );

      setEsError(false);
      setObservacion("");
      setProximaGestion("");
      setProcesando(false);

      router.refresh();
    } catch (error) {
      console.error(
        "Error registrando gestión:",
        error,
      );

      mostrarError(
        "No fue posible comunicarse con el servidor.",
      );
    }
  }

  function mostrarError(
    texto: string,
  ) {
    setMensaje(texto);
    setEsError(true);
    setProcesando(false);
  }

  return (
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-7">
      <h2 className="text-xl font-black text-slate-900">
        Registrar gestión de cobranza
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Registra llamadas, mensajes, compromisos y
        resultados del seguimiento al cliente.
      </p>

      {!puedeGestionar ? (
        <p className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
          Este crédito ya no admite gestiones de
          cobranza.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Tipo de contacto
              </span>

              <select
                value={tipoContacto}
                disabled={procesando}
                onChange={(event) =>
                  setTipoContacto(
                    event.target
                      .value as TipoContacto,
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-600 disabled:bg-slate-100"
              >
                {TIPOS_CONTACTO.map(
                  (opcion) => (
                    <option
                      key={
                        opcion.valor
                      }
                      value={
                        opcion.valor
                      }
                    >
                      {
                        opcion.etiqueta
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Resultado
              </span>

              <select
                value={resultado}
                disabled={procesando}
                onChange={(event) =>
                  setResultado(
                    event.target
                      .value as ResultadoGestion,
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-600 disabled:bg-slate-100"
              >
                {RESULTADOS.map(
                  (opcion) => (
                    <option
                      key={
                        opcion.valor
                      }
                      value={
                        opcion.valor
                      }
                    >
                      {
                        opcion.etiqueta
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
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
              rows={5}
              maxLength={1000}
              placeholder="Describe la comunicación, respuesta del cliente y próximos pasos."
              className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-emerald-600 disabled:bg-slate-100"
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {observacion.length}/1000
            </p>
          </label>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Próxima gestión
            </span>

            <input
              type="datetime-local"
              value={proximaGestion}
              disabled={procesando}
              onChange={(event) =>
                setProximaGestion(
                  event.target.value,
                )
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-emerald-600 disabled:bg-slate-100"
            />

            <p className="mt-2 text-xs text-slate-500">
              Este campo es opcional.
            </p>
          </label>

          {esCompromiso ? (
            <div className="mt-5 grid gap-4 rounded-2xl bg-amber-50 p-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold text-amber-900">
                  Valor comprometido
                </span>

                <input
                  type="number"
                  min="1"
                  max={saldoActual}
                  step="1"
                  value={
                    valorCompromiso
                  }
                  disabled={procesando}
                  onChange={(event) =>
                    setValorCompromiso(
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3.5 outline-none focus:border-amber-600"
                />

                <p className="mt-2 text-xs text-amber-800">
                  Saldo pendiente:{" "}
                  {formatearDinero(
                    saldoActual,
                  )}
                </p>
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-amber-900">
                  Fecha del compromiso
                </span>

                <input
                  type="date"
                  value={
                    fechaCompromiso
                  }
                  disabled={procesando}
                  onChange={(event) =>
                    setFechaCompromiso(
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3.5 outline-none focus:border-amber-600"
                />
              </label>
            </div>
          ) : null}

          {mensaje ? (
            <p
              className={
                esError
                  ? "mt-5 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-800"
                  : "mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
              }
            >
              {mensaje}
            </p>
          ) : null}

          <button
            type="button"
            disabled={procesando}
            onClick={registrar}
            className="mt-6 w-full rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando
              ? "Registrando gestión..."
              : "Registrar gestión"}
          </button>
        </>
      )}
    </article>
  );
}

function obtenerFechaManana() {
  const fecha = new Date();

  fecha.setDate(
    fecha.getDate() + 1,
  );

  return fecha
    .toISOString()
    .slice(0, 10);
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
