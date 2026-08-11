import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ConfiguracionPublica = {
  monto_minimo_global: number | string;
  monto_maximo_global: number | string;
  plazo_minimo_dias: number;
  plazo_maximo_dias: number;
  plataforma_activa: boolean;
  modo_mantenimiento: boolean;
};

type Credito = {
  id: string;
  estado: string;
  monto_aprobado: number | string | null;
  valor_total_pagar: number | string | null;
  total_pagado: number | string | null;
  saldo_total: number | string | null;
  fecha_desembolso: string | null;
  fecha_vencimiento: string | null;
  fecha_pago_total: string | null;
};

export default async function ClientePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect("/iniciar-sesion");
  }

  const {
    data: perfil,
    error: errorPerfil,
  } = await supabase
    .from("perfiles")
    .select(`
      id,
      nombres,
      apellidos,
      estado,
      rol,
      nivel,
      puntaje,
      cupo_minimo,
      cupo_actual,
      creditos_pagados,
      creditos_vencidos,
      perfil_completo
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (errorPerfil || !perfil) {
    console.error(
      "Error cargando el perfil:",
      errorPerfil,
    );

    redirect("/iniciar-sesion");
  }

  const numeroNivel = Number(
    perfil.nivel ?? 1,
  );

  const [
    resultadoNivel,
    resultadoConfiguracion,
    resultadoSolicitud,
    resultadoCreditos,
  ] = await Promise.all([
    supabase
      .from("niveles_credito")
      .select(`
        numero_nivel,
        nombre,
        monto_minimo,
        monto_maximo,
        plazos_dias,
        tasa_interes_ea,
        activo
      `)
      .eq("numero_nivel", numeroNivel)
      .eq("activo", true)
      .maybeSingle(),

    supabase.rpc(
      "obtener_configuracion_publica_credito",
    ),

    supabase
      .from("solicitudes_credito")
      .select(`
        id,
        estado,
        monto_solicitado,
        plazo_dias,
        fecha_solicitud
      `)
      .eq("cliente_id", user.id)
      .in("estado", [
        "pendiente",
        "en_revision",
        "aprobada",
      ])
      .order("fecha_solicitud", {
        ascending: false,
      })
      .limit(1),

    supabase
      .from("creditos")
      .select(`
        id,
        estado,
        monto_aprobado,
        valor_total_pagar,
        total_pagado,
        saldo_total,
        fecha_desembolso,
        fecha_vencimiento,
        fecha_pago_total
      `)
      .eq("cliente_id", user.id)
      .order("creado_en", {
        ascending: false,
      }),
  ]);

  if (resultadoNivel.error) {
    console.error(
      "Error cargando nivel:",
      resultadoNivel.error,
    );
  }

  if (resultadoConfiguracion.error) {
    console.error(
      "Error cargando configuración:",
      resultadoConfiguracion.error,
    );
  }

  if (resultadoSolicitud.error) {
    console.error(
      "Error cargando solicitud activa:",
      resultadoSolicitud.error,
    );
  }

  if (resultadoCreditos.error) {
    console.error(
      "Error cargando créditos:",
      resultadoCreditos.error,
    );
  }

  const nivel =
    resultadoNivel.data;

  const configuracion =
    resultadoConfiguracion.data
      ? (resultadoConfiguracion.data as ConfiguracionPublica)
      : null;

  const solicitudActiva =
    resultadoSolicitud.data?.[0] ??
    null;

  const creditos =
    (resultadoCreditos.data ??
      []) as Credito[];

  const creditoActivo =
    creditos.find((credito) =>
      [
        "pendiente_desembolso",
        "activo",
        "vencido",
      ].includes(
        String(credito.estado),
      ),
    ) ?? null;

  const creditosPagados =
    creditos.filter(
      (credito) =>
        credito.estado === "pagado",
    );

  const ultimoCreditoPagado =
    creditosPagados[0] ?? null;

  const montoMinimoGlobal =
    Number(
      configuracion?.monto_minimo_global ??
        20000,
    );

  const montoMaximoGlobal =
    Number(
      configuracion?.monto_maximo_global ??
        150000,
    );

  const montoMinimoNivel =
    Number(
      nivel?.monto_minimo ??
        perfil.cupo_minimo ??
        montoMinimoGlobal,
    );

  const montoMaximoNivel =
    Number(
      nivel?.monto_maximo ??
        montoMaximoGlobal,
    );

  const cupoPerfil =
    Number(
      perfil.cupo_actual ??
        montoMinimoNivel,
    );

  const montoMinimoPermitido =
    Math.max(
      montoMinimoGlobal,
      montoMinimoNivel,
    );

  const cupoDisponible =
    Math.max(
      0,
      Math.min(
        cupoPerfil,
        montoMaximoNivel,
        montoMaximoGlobal,
      ),
    );

  const plazoMinimoGlobal =
    Number(
      configuracion?.plazo_minimo_dias ??
        2,
    );

  const plazoMaximoGlobal =
    Number(
      configuracion?.plazo_maximo_dias ??
        10,
    );

  const plazosNivel =
    normalizarPlazos(
      nivel?.plazos_dias,
    );

  const plazosPermitidos =
    plazosNivel.filter(
      (dias) =>
        dias >= plazoMinimoGlobal &&
        dias <= plazoMaximoGlobal,
    );

  const plataformaDisponible =
    Boolean(
      configuracion?.plataforma_activa ??
        true,
    ) &&
    !Boolean(
      configuracion?.modo_mantenimiento ??
        false,
    );

  const tieneOperacionActiva =
    Boolean(solicitudActiva) ||
    Boolean(creditoActivo);

  const puedeSolicitar =
    Boolean(perfil.perfil_completo) &&
    plataformaDisponible &&
    !tieneOperacionActiva &&
    cupoDisponible >=
      montoMinimoPermitido &&
    plazosPermitidos.length > 0;

  const totalCapitalRecibido =
    sumar(
      creditos.map(
        (credito) =>
          credito.monto_aprobado,
      ),
    );

  const totalPagado =
    sumar(
      creditos.map(
        (credito) =>
          credito.total_pagado,
      ),
    );

  const nombre =
    String(
      perfil.nombres ??
        "Cliente",
    );

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
              Página Cred
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
              Hola, {nombre}
            </h1>

            <p className="mt-2 text-slate-600">
              Consulta tu cupo, nivel y estado de tus operaciones.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/cliente/creditos"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              Mis créditos
            </Link>

            <Link
              href="/cliente/solicitudes"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              Mis solicitudes
            </Link>
          </div>
        </header>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Tarjeta
            etiqueta="Cupo disponible"
            valor={formatearDinero(
              cupoDisponible,
            )}
            descripcion={`Máximo permitido para tu nivel ${numeroNivel}`}
          />

          <Tarjeta
            etiqueta="Nivel"
            valor={`${numeroNivel}`}
            descripcion={
              nivel?.nombre ??
              `Nivel ${numeroNivel}`
            }
          />

          <Tarjeta
            etiqueta="Puntaje"
            valor={`${Number(
              perfil.puntaje ?? 0,
            )}`}
            descripcion="Mejora con tus pagos oportunos"
          />

          <Tarjeta
            etiqueta="Créditos pagados"
            valor={`${creditosPagados.length}`}
            descripcion={`${Number(
              perfil.creditos_vencidos ??
                0,
            )} vencidos`}
          />
        </section>

        {solicitudActiva ? (
          <section className="mt-8 rounded-[30px] border border-amber-200 bg-white p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
              Solicitud en proceso
            </p>

            <h2 className="mt-3 text-3xl font-black text-slate-900">
              Estamos gestionando tu solicitud
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              Estado actual:{" "}
              <strong>
                {formatearEstado(
                  String(
                    solicitudActiva.estado,
                  ),
                )}
              </strong>
              .
            </p>

            <Link
              href="/cliente/solicitudes"
              className="mt-7 inline-block rounded-2xl bg-amber-600 px-7 py-4 font-bold text-white"
            >
              Ver solicitud
            </Link>
          </section>
        ) : creditoActivo ? (
          <section className="mt-8 rounded-[30px] border border-emerald-200 bg-white p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Crédito vigente
            </p>

            <h2 className="mt-3 text-3xl font-black text-slate-900">
              Tienes un crédito en curso
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Resumen
                etiqueta="Monto"
                valor={formatearDinero(
                  Number(
                    creditoActivo.monto_aprobado ??
                      0,
                  ),
                )}
              />

              <Resumen
                etiqueta="Saldo pendiente"
                valor={formatearDinero(
                  Number(
                    creditoActivo.saldo_total ??
                      0,
                  ),
                )}
              />

              <Resumen
                etiqueta="Vencimiento"
                valor={
                  creditoActivo.fecha_vencimiento
                    ? formatearFecha(
                        creditoActivo.fecha_vencimiento,
                      )
                    : "Pendiente"
                }
              />
            </div>

            <Link
              href={`/cliente/creditos/${creditoActivo.id}`}
              className="mt-7 inline-block rounded-2xl bg-emerald-700 px-7 py-4 font-bold text-white"
            >
              Ver crédito
            </Link>
          </section>
        ) : (
          <section className="mt-8 rounded-[30px] border border-[#eadfce] bg-white p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              {creditosPagados.length > 0
                ? "Nuevo crédito disponible"
                : "Primer crédito"}
            </p>

            <h2 className="mt-3 text-3xl font-black text-slate-900">
              {creditosPagados.length > 0
                ? "Puedes solicitar un nuevo crédito"
                : "Tu cupo inicial está disponible"}
            </h2>

            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Puedes solicitar entre{" "}
              <strong>
                {formatearDinero(
                  montoMinimoPermitido,
                )}
              </strong>{" "}
              y{" "}
              <strong>
                {formatearDinero(
                  cupoDisponible,
                )}
              </strong>
              {plazosPermitidos.length
                ? ` con plazos de ${plazosPermitidos[0]} a ${
                    plazosPermitidos[
                      plazosPermitidos.length -
                        1
                    ]
                  } días.`
                : "."}
            </p>

            {!plataformaDisponible ? (
              <Aviso>
                Las nuevas solicitudes están temporalmente suspendidas.
              </Aviso>
            ) : !perfil.perfil_completo ? (
              <Aviso>
                Debes completar tu perfil antes de solicitar.
              </Aviso>
            ) : cupoDisponible <
              montoMinimoPermitido ? (
              <Aviso>
                Tu cupo actual es inferior al mínimo permitido.
              </Aviso>
            ) : !plazosPermitidos.length ? (
              <Aviso>
                Tu nivel no tiene plazos habilitados actualmente.
              </Aviso>
            ) : null}

            <Link
              href={
                perfil.perfil_completo
                  ? "/cliente/solicitar"
                  : "/cliente/perfil"
              }
              aria-disabled={
                !puedeSolicitar
              }
              className={
                puedeSolicitar
                  ? "mt-7 inline-block rounded-2xl bg-emerald-700 px-7 py-4 font-bold text-white transition hover:bg-emerald-800"
                  : "pointer-events-none mt-7 inline-block rounded-2xl bg-slate-300 px-7 py-4 font-bold text-slate-600"
              }
            >
              {perfil.perfil_completo
                ? "Solicitar crédito"
                : "Completar perfil"}
            </Link>
          </section>
        )}

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <Tarjeta
            etiqueta="Capital recibido"
            valor={formatearDinero(
              totalCapitalRecibido,
            )}
            descripcion="Suma de los créditos desembolsados"
          />

          <Tarjeta
            etiqueta="Total pagado"
            valor={formatearDinero(
              totalPagado,
            )}
            descripcion="Pagos acumulados realizados"
          />

          <Tarjeta
            etiqueta="Último crédito pagado"
            valor={
              ultimoCreditoPagado
                ?.fecha_pago_total
                ? formatearFecha(
                    ultimoCreditoPagado.fecha_pago_total,
                  )
                : "Sin pagos"
            }
            descripcion={
              ultimoCreditoPagado
                ? formatearDinero(
                    Number(
                      ultimoCreditoPagado.total_pagado ??
                        0,
                    ),
                  )
                : "No hay créditos pagados"
            }
          />
        </section>
      </div>
    </main>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  descripcion,
}: {
  etiqueta: string;
  valor: string;
  descripcion: string;
}) {
  return (
    <article className="rounded-[26px] border border-[#eadfce] bg-white p-6">
      <p className="text-sm font-semibold text-slate-500">
        {etiqueta}
      </p>

      <p className="mt-3 text-3xl font-black text-slate-900">
        {valor}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {descripcion}
      </p>
    </article>
  );
}

function Resumen({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f7f8f5] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {etiqueta}
      </p>

      <p className="mt-2 text-lg font-black text-slate-900">
        {valor}
      </p>
    </div>
  );
}

function Aviso({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
      {children}
    </p>
  );
}

function normalizarPlazos(
  valor: unknown,
): number[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return [
    ...new Set(
      valor
        .map(Number)
        .filter(
          (dias) =>
            Number.isInteger(dias) &&
            dias > 0,
        ),
    ),
  ].sort((a, b) => a - b);
}

function sumar(
  valores: Array<
    number | string | null
  >,
) {
  return valores.reduce<number>(
    (total, valor) => {
      const numero =
        Number(valor ?? 0);

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

function formatearFecha(
  fecha: string,
) {
  const valor =
    new Date(fecha);

  if (
    Number.isNaN(
      valor.getTime(),
    )
  ) {
    return "Fecha no válida";
  }

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
      timeZone: "America/Bogota",
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
