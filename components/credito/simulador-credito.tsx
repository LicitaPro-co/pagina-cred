"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type NivelCredito = {
  id: string;
  numero_nivel: number;
  nombre: string;
  monto_minimo: number;
  monto_maximo: number;
  incremento_monto: number;
  plazos_dias: number[];
  modalidad_credito: string;
  porcentaje_costo: number;
  valor_costo_fijo: number;
  porcentaje_iva: number;
};

type TasaCreditoPlazo = {
  plazo_dias: number;
  tasa_interes_ea: number;
};

type ConfiguracionCredito = {
  monto_minimo_global: number;
  monto_maximo_global: number;
  plazo_minimo_dias: number;
  plazo_maximo_dias: number;
  plataforma_activa: boolean;
  modo_mantenimiento: boolean;
};

type CuentaDesembolso = {
  id: string;
  proveedor?: string | null;
  metodo_desembolso?: string | null;
  tipo_cuenta?: string | null;
  numero_cuenta?: string | null;
  tipo_llave?: string | null;
  valor_llave?: string | null;
  titular?: string | null;
};

type OperacionActiva = {
  id: string;
  estado: string;
  tipo?: "solicitud" | "credito";
} | null;

type Props = {
  nombre?: string;
  nivel: NivelCredito;
  tasasPorPlazo: TasaCreditoPlazo[];
  configuracion?: ConfiguracionCredito;
  cupoActual: number;
  cuenta: CuentaDesembolso | null;
  operacionActiva?: OperacionActiva;
};

type RespuestaApi = {
  ok?: boolean;
  solicitudId?: string;
  error?: string;
};

export default function SimuladorCredito({
  nombre,
  nivel,
  tasasPorPlazo,
  configuracion,
  cupoActual,
  cuenta,
  operacionActiva = null,
}: Props) {
  const router = useRouter();

  /*
   * Configuración segura.
   * Los límites globales siempre prevalecen.
   */
  const configuracionSegura: ConfiguracionCredito = {
    monto_minimo_global: Number(
      configuracion?.monto_minimo_global ?? 20000,
    ),

    monto_maximo_global: Number(
      configuracion?.monto_maximo_global ?? 150000,
    ),

    plazo_minimo_dias: Number(
      configuracion?.plazo_minimo_dias ?? 2,
    ),

    plazo_maximo_dias: Number(
      configuracion?.plazo_maximo_dias ?? 10,
    ),

    plataforma_activa:
      configuracion?.plataforma_activa ?? true,

    modo_mantenimiento:
      configuracion?.modo_mantenimiento ?? false,
  };

  /*
   * El mínimo debe respetar:
   * - mínimo global
   * - mínimo del nivel
   */
  const montoMinimo = Math.max(
    configuracionSegura.monto_minimo_global,
    Number(
      nivel.monto_minimo ?? 20000,
    ),
  );

  /*
   * El máximo debe respetar:
   * - máximo global
   * - máximo del nivel
   * - cupo individual del cliente
   */
  const montoMaximoCalculado = Math.min(
    configuracionSegura.monto_maximo_global,

    Number(
      nivel.monto_maximo ??
        configuracionSegura.monto_maximo_global,
    ),

    Number(
      cupoActual ?? montoMinimo,
    ),
  );

  const montoMaximo = Math.max(
    montoMinimo,
    montoMaximoCalculado,
  );

  const incrementoMonto = Math.max(
    Number(
      nivel.incremento_monto ?? 10000,
    ),
    1,
  );

  /*
   * Plazos reales disponibles.
   *
   * Deben existir:
   * - en el nivel;
   * - dentro del mínimo global;
   * - dentro del máximo global.
   */
  const plazosDisponibles =
    Array.isArray(nivel.plazos_dias)
      ? [
          ...new Set(
            nivel.plazos_dias
              .map(Number)
              .filter(
                (dias) =>
                  Number.isInteger(dias) &&
                  dias >=
                    configuracionSegura.plazo_minimo_dias &&
                  dias <=
                    configuracionSegura.plazo_maximo_dias,
              ),
          ),
        ].sort((a, b) => a - b)
      : [];

  /*
   * En caso de configuración incompleta,
   * generamos los días desde el mínimo hasta el máximo.
   */
  const plazosFinales =
    plazosDisponibles.length > 0
      ? plazosDisponibles
      : generarPlazos(
          configuracionSegura.plazo_minimo_dias,
          configuracionSegura.plazo_maximo_dias,
        );

  const plazoInicial =
    plazosFinales[0] ??
    configuracionSegura.plazo_minimo_dias;

  const [montoSeleccionado, setMontoSeleccionado] =
    useState(montoMinimo);

  const [plazoSeleccionado, setPlazoSeleccionado] =
    useState(plazoInicial);

  const [observacion, setObservacion] =
    useState("");

  const [procesando, setProcesando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [esError, setEsError] =
    useState(false);

  const tasaInteresEa =
    obtenerTasaPorPlazo(
      tasasPorPlazo,
      plazoSeleccionado,
    );

  /*
   * El navegador calcula únicamente una simulación.
   *
   * La función SQL crear_solicitud_credito vuelve a
   * calcular estos valores antes de guardar.
   */
  const resultado = useMemo(
    () =>
      calcularCredito({
        monto: montoSeleccionado,
        plazoDias: plazoSeleccionado,
        tasaInteresEa,

        porcentajeCosto: Number(
          nivel.porcentaje_costo ?? 0,
        ),

        valorCostoFijo: Number(
          nivel.valor_costo_fijo ?? 0,
        ),

        porcentajeIva: Number(
          nivel.porcentaje_iva ?? 0,
        ),
      }),
    [
      montoSeleccionado,
      plazoSeleccionado,
      tasaInteresEa,
      nivel.porcentaje_costo,
      nivel.valor_costo_fijo,
      nivel.porcentaje_iva,
    ],
  );

  function cambiarMonto(valor: number) {
    const montoLimitado = Math.min(
      Math.max(
        valor,
        montoMinimo,
      ),
      montoMaximo,
    );

    setMontoSeleccionado(
      montoLimitado,
    );
  }

  async function crearSolicitud() {
    setMensaje("");
    setEsError(false);

    if (
      !configuracionSegura.plataforma_activa ||
      configuracionSegura.modo_mantenimiento
    ) {
      setMensaje(
        configuracionSegura.modo_mantenimiento
          ? "La plataforma se encuentra temporalmente en mantenimiento."
          : "La recepción de nuevas solicitudes está suspendida.",
      );

      setEsError(true);
      return;
    }

    if (operacionActiva) {
      setMensaje(
        "Ya tienes una solicitud o crédito en proceso.",
      );

      setEsError(true);
      return;
    }

    if (!cuenta?.id) {
      setMensaje(
        "Debes registrar un medio de desembolso antes de solicitar el crédito.",
      );

      setEsError(true);
      return;
    }

    if (
      montoSeleccionado < montoMinimo ||
      montoSeleccionado > montoMaximo
    ) {
      setMensaje(
        "El monto seleccionado no se encuentra dentro de tu cupo disponible.",
      );

      setEsError(true);
      return;
    }

    if (
      !plazosFinales.includes(
        plazoSeleccionado,
      )
    ) {
      setMensaje(
        "El plazo seleccionado no está habilitado para tu nivel.",
      );

      setEsError(true);
      return;
    }

    setProcesando(true);

    try {
      const respuesta = await fetch(
        "/api/solicitudes",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            monto:
              montoSeleccionado,

            plazoDias:
              plazoSeleccionado,

            observacion:
              observacion.trim() ||
              null,
          }),
        },
      );

      let datos: RespuestaApi = {};

      try {
        datos =
          (await respuesta.json()) as RespuestaApi;
      } catch {
        datos = {};
      }

      if (!respuesta.ok) {
        setMensaje(
          datos.error ??
            "No fue posible crear la solicitud.",
        );

        setEsError(true);
        return;
      }

      setMensaje(
        "La solicitud fue creada correctamente.",
      );

      setEsError(false);

      router.push(
        "/cliente/solicitudes",
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Error enviando la solicitud:",
        error,
      );

      setMensaje(
        "No fue posible comunicarse con el servidor.",
      );

      setEsError(true);
    } finally {
      setProcesando(false);
    }
  }

  /*
   * Plataforma temporalmente suspendida.
   */
  if (
    !configuracionSegura.plataforma_activa ||
    configuracionSegura.modo_mantenimiento
  ) {
    return (
      <main className="min-h-screen bg-[#fff8ee] px-5 py-12">
        <section className="mx-auto max-w-xl rounded-[30px] border border-[#eadfce] bg-white p-8 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
            Página Cred
          </p>

          <h1 className="mt-4 text-3xl font-black text-slate-900">
            Solicitudes temporalmente no disponibles
          </h1>

          <p className="mt-4 leading-7 text-slate-600">
            {configuracionSegura.modo_mantenimiento
              ? "Estamos realizando ajustes en la plataforma. Intenta nuevamente más tarde."
              : "La recepción de nuevas solicitudes se encuentra temporalmente suspendida."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/cliente")
            }
            className="mt-7 rounded-2xl bg-emerald-700 px-6 py-4 font-bold text-white"
          >
            Volver al inicio
          </button>
        </section>
      </main>
    );
  }

  /*
   * Cupo insuficiente.
   */
  if (
    montoMaximoCalculado <
    montoMinimo
  ) {
    return (
      <main className="min-h-screen bg-[#fff8ee] px-5 py-12">
        <section className="mx-auto max-w-xl rounded-[30px] border border-amber-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
            Página Cred
          </p>

          <h1 className="mt-4 text-3xl font-black text-slate-900">
            Cupo no disponible
          </h1>

          <p className="mt-4 leading-7 text-slate-600">
            Tu cupo actual es inferior al monto mínimo permitido para solicitar un crédito.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/cliente")
            }
            className="mt-7 rounded-2xl bg-emerald-700 px-6 py-4 font-bold text-white"
          >
            Volver al inicio
          </button>
        </section>
      </main>
    );
  }

  /*
   * Operación activa.
   */
  if (operacionActiva) {
    return (
      <main className="min-h-screen bg-[#fff8ee] px-5 py-12">
        <section className="mx-auto max-w-xl rounded-[30px] border border-[#eadfce] bg-white p-8 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
            Página Cred
          </p>

          <h1 className="mt-4 text-3xl font-black text-slate-900">
            Ya tienes una operación en proceso
          </h1>

          <p className="mt-4 leading-7 text-slate-600">
            Debes esperar a que finalice la operación actual antes de crear una nueva solicitud.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                operacionActiva.tipo ===
                  "credito"
                  ? "/cliente/creditos"
                  : "/cliente/solicitudes",
              )
            }
            className="mt-7 rounded-2xl bg-emerald-700 px-6 py-4 font-bold text-white"
          >
            Ver mi operación
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
            Página Cred
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
            Solicita tu crédito
          </h1>

          <p className="mt-3 text-slate-600">
            {nombre
              ? `${nombre}, selecciona el monto y el plazo que necesitas.`
              : "Selecciona el monto y el plazo que necesitas."}
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[30px] border border-[#eadfce] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                  Nivel {nivel.numero_nivel}
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {nivel.nombre}
                </h2>
              </div>

              <div className="rounded-2xl bg-emerald-50 px-5 py-3">
                <p className="text-xs font-bold text-emerald-700">
                  Cupo disponible
                </p>

                <p className="mt-1 text-xl font-black text-emerald-800">
                  {formatearDinero(
                    montoMaximo,
                  )}
                </p>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-sm font-bold text-slate-700">
                ¿Cuánto necesitas?
              </p>

              <div className="mt-4 rounded-[26px] bg-[#f7f8f5] p-5">
                <p className="text-center text-4xl font-black text-slate-900">
                  {formatearDinero(
                    montoSeleccionado,
                  )}
                </p>

                <input
                  type="range"
                  min={montoMinimo}
                  max={montoMaximo}
                  step={incrementoMonto}
                  value={montoSeleccionado}
                  onChange={(event) =>
                    cambiarMonto(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  className="mt-7 w-full accent-emerald-700"
                />

                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>
                    {formatearDinero(
                      montoMinimo,
                    )}
                  </span>

                  <span>
                    {formatearDinero(
                      montoMaximo,
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-7">
              <div className="flex items-end justify-between gap-4">
                <p className="text-sm font-bold text-slate-700">
                  Selecciona el plazo
                </p>

                <p className="text-xs text-slate-500">
                  A mayor plazo, mayor interés.
                </p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {plazosFinales.map(
                  (dias) => {
                    const calculoPlazo =
                      calcularCredito({
                        monto:
                          montoSeleccionado,

                        plazoDias:
                          dias,

                        tasaInteresEa:
                          obtenerTasaPorPlazo(
                            tasasPorPlazo,
                            dias,
                          ),

                        porcentajeCosto:
                          Number(
                            nivel.porcentaje_costo ??
                              0,
                          ),

                        valorCostoFijo:
                          Number(
                            nivel.valor_costo_fijo ??
                              0,
                          ),

                        porcentajeIva:
                          Number(
                            nivel.porcentaje_iva ??
                              0,
                          ),
                      });

                    const seleccionado =
                      plazoSeleccionado ===
                      dias;

                    return (
                      <button
                        key={dias}
                        type="button"
                        onClick={() =>
                          setPlazoSeleccionado(
                            dias,
                          )
                        }
                        className={
                          seleccionado
                            ? "rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-3 py-4 text-emerald-800"
                            : "rounded-2xl border border-slate-200 bg-white px-3 py-4 text-slate-700 transition hover:border-emerald-300"
                        }
                      >
                        <span className="block text-lg font-black">
                          {dias} días
                        </span>

                        <span className="mt-2 block text-xs">
                          Interés{" "}
                          {formatearDinero(
                            calculoPlazo.valorInteres,
                            true,
                          )}
                        </span>

                        <span className="mt-1 block text-xs font-bold">
                          Total{" "}
                          {formatearDinero(
                            calculoPlazo.totalPagar,
                            true,
                          )}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <label className="mt-7 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Observación opcional
              </span>

              <textarea
                value={observacion}
                onChange={(event) =>
                  setObservacion(
                    event.target.value,
                  )
                }
                maxLength={500}
                rows={4}
                placeholder="Escribe una observación sobre tu solicitud."
                className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-emerald-600"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {observacion.length}/500
              </p>
            </label>
          </article>

          <aside className="space-y-6">
            <article className="rounded-[30px] border border-[#eadfce] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                Resumen del crédito
              </p>

              <div className="mt-6 rounded-3xl bg-[#f7f8f5] p-5">
                <FilaResumen
                  etiqueta="Monto solicitado"
                  valor={formatearDinero(
                    montoSeleccionado,
                  )}
                />

                <FilaResumen
                  etiqueta="Plazo"
                  valor={`${plazoSeleccionado} días`}
                />

                <FilaResumen
                  etiqueta="Interés"
                  valor={formatearDinero(
                    resultado.valorInteres,
                    true,
                  )}
                />

                {resultado.valorCostoBase >
                0 ? (
                  <FilaResumen
                    etiqueta="Costos adicionales"
                    valor={formatearDinero(
                      resultado.valorCostoBase,
                      true,
                    )}
                  />
                ) : null}

                {resultado.valorIva >
                0 ? (
                  <FilaResumen
                    etiqueta="IVA"
                    valor={formatearDinero(
                      resultado.valorIva,
                      true,
                    )}
                  />
                ) : null}

                <FilaResumen
                  etiqueta="Fecha estimada de pago"
                  valor={
                    resultado.fechaPago
                  }
                />

                <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-5">
                  <span className="font-black text-slate-900">
                    Total a pagar
                  </span>

                  <strong className="text-2xl text-emerald-700">
                    {formatearDinero(
                      resultado.totalPagar,
                      true,
                    )}
                  </strong>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                El valor definitivo será validado nuevamente por el sistema al crear la solicitud.
              </p>
            </article>

            <article className="rounded-[30px] border border-[#eadfce] bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-black text-slate-900">
                Medio de desembolso
              </h2>

              {cuenta ? (
                <div className="mt-5">
                  <FilaResumen
                    etiqueta="Proveedor"
                    valor={
                      cuenta.proveedor ??
                      cuenta.metodo_desembolso ??
                      "No registrado"
                    }
                  />

                  <FilaResumen
                    etiqueta="Destino"
                    valor={
                      cuenta.numero_cuenta ??
                      cuenta.valor_llave ??
                      "No registrado"
                    }
                  />

                  <FilaResumen
                    etiqueta="Titular"
                    valor={
                      cuenta.titular ??
                      "No registrado"
                    }
                  />
                </div>
              ) : (
                <div className="mt-5">
                  <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                    No tienes un medio de desembolso registrado.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/cliente/desembolso",
                      )
                    }
                    className="mt-4 w-full rounded-2xl border border-emerald-700 bg-white px-5 py-4 font-bold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Registrar medio de desembolso
                  </button>
                </div>
              )}

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
                onClick={crearSolicitud}
                disabled={
                  procesando ||
                  !cuenta?.id ||
                  plazosFinales.length ===
                    0
                }
                className="mt-6 w-full rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {procesando
                  ? "Creando solicitud..."
                  : "Solicitar crédito"}
              </button>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}

/*
 * IMPORTANTE:
 * Esta fórmula coincide con crear_solicitud_credito()
 * en PostgreSQL.
 */
function calcularCredito({
  monto,
  plazoDias,
  tasaInteresEa,
  porcentajeCosto,
  valorCostoFijo,
  porcentajeIva,
}: {
  monto: number;
  plazoDias: number;
  tasaInteresEa: number;
  porcentajeCosto: number;
  valorCostoFijo: number;
  porcentajeIva: number;
}) {
  const tasaPeriodoDecimal =
    Math.pow(
      1 + tasaInteresEa / 100,
      plazoDias / 365,
    ) - 1;

  const tasaPeriodoPorcentaje =
    redondear(
      tasaPeriodoDecimal * 100,
      8,
    );

  const valorInteres =
    redondearDinero(
      monto *
        (tasaPeriodoPorcentaje /
          100),
    );

  const valorCostoBase =
    redondearDinero(
      monto *
        (porcentajeCosto / 100) +
        valorCostoFijo,
    );

  const valorIva =
    redondearDinero(
      valorCostoBase *
        (porcentajeIva / 100),
    );

  const totalPagar =
    redondearDinero(
      monto +
        valorInteres +
        valorCostoBase +
        valorIva,
    );

  return {
    tasaPeriodoPorcentaje,
    valorInteres,
    valorCostoBase,
    valorIva,
    totalPagar,
    fechaPago:
      calcularFechaPago(
        plazoDias,
      ),
  };
}

function obtenerTasaPorPlazo(
  tasas: TasaCreditoPlazo[],
  plazoDias: number,
) {
  const tasa = tasas.find(
    (registro) =>
      Number(registro.plazo_dias) ===
      Number(plazoDias),
  );

  return Number(
    tasa?.tasa_interes_ea ?? 0,
  );
}

function generarPlazos(
  minimo: number,
  maximo: number,
) {
  if (
    !Number.isInteger(minimo) ||
    !Number.isInteger(maximo) ||
    minimo <= 0 ||
    maximo < minimo
  ) {
    return [];
  }

  return Array.from(
    {
      length:
        maximo - minimo + 1,
    },
    (_, indice) =>
      minimo + indice,
  );
}

function FilaResumen({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-5">
      <span className="text-sm text-slate-600">
        {etiqueta}
      </span>

      <strong className="text-right text-sm text-slate-900">
        {valor}
      </strong>
    </div>
  );
}

function redondear(
  valor: number,
  decimales: number,
) {
  const factor =
    10 ** decimales;

  return (
    Math.round(
      (valor +
        Number.EPSILON) *
        factor,
    ) / factor
  );
}

function redondearDinero(
  valor: number,
) {
  return redondear(
    valor,
    2,
  );
}

function formatearDinero(
  valor: number,
  mostrarCentavos = false,
) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",

      minimumFractionDigits:
        mostrarCentavos &&
        !Number.isInteger(valor)
          ? 2
          : 0,

      maximumFractionDigits:
        mostrarCentavos
          ? 2
          : 0,
    },
  ).format(valor);
}

function calcularFechaPago(
  plazoDias: number,
) {
  const fecha = new Date();

  fecha.setHours(
    12,
    0,
    0,
    0,
  );

  fecha.setDate(
    fecha.getDate() +
      plazoDias,
  );

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
      timeZone:
        "America/Bogota",
    },
  ).format(fecha);
}
