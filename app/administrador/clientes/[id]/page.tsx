import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import GestionarCliente from "@/components/administrador/gestionar-cliente";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DetalleClientePage({
  params,
}: Props) {
  const { id } = await params;

  if (!esUuidValido(id)) {
    notFound();
  }

  const supabase =
    await createClient();

  const {
    data: cliente,
    error: errorCliente,
  } = await supabase
    .from("perfiles")
    .select(`
      id,
      nombres,
      apellidos,
      correo,
      celular,
      celular_alterno,
      tipo_documento,
      numero_documento,
      fecha_expedicion,
      lugar_expedicion,
      fecha_nacimiento,
      sexo,
      estado_civil,
      departamento,
      ciudad,
      direccion,
      barrio,
      ocupacion,
      empresa,
      cargo,
      ingreso_mensual,
      antiguedad_meses,
      nivel,
      puntaje,
      cupo_minimo,
      cupo_actual,
      creditos_pagados,
      creditos_vencidos,
      estado,
      motivo_bloqueo,
      bloqueado_hasta,
      perfil_completo,
      identidad_validada,
      celular_validado,
      cuenta_validada,
      creado_en
    `)
    .eq("id", id)
    .eq("rol", "cliente")
    .maybeSingle();

  if (
    errorCliente ||
    !cliente
  ) {
    notFound();
  }

  const [
    resultadoSolicitudes,
    resultadoCreditos,
    resultadoReferencias,
    resultadoAjustes,
  ] = await Promise.all([
    supabase
      .from(
        "solicitudes_credito",
      )
      .select(`
        id,
        estado,
        monto_solicitado,
        plazo_dias,
        valor_total_pagar,
        fecha_solicitud
      `)
      .eq("cliente_id", id)
      .order(
        "fecha_solicitud",
        {
          ascending: false,
        },
      )
      .limit(10),

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
        fecha_vencimiento
      `)
      .eq("cliente_id", id)
      .order("creado_en", {
        ascending: false,
      })
      .limit(10),

    supabase
      .from(
        "referencias_cliente",
      )
      .select(`
        id,
        tipo,
        nombre_completo,
        parentesco,
        celular
      `)
      .eq("cliente_id", id)
      .order("tipo"),

    supabase
      .from(
        "ajustes_cliente",
      )
      .select(`
        id,
        tipo,
        valor_anterior,
        valor_nuevo,
        nivel_anterior,
        nivel_nuevo,
        motivo,
        creado_en
      `)
      .eq("cliente_id", id)
      .order("creado_en", {
        ascending: false,
      })
      .limit(10),
  ]);

  const solicitudes =
    resultadoSolicitudes.data ??
    [];

  const creditos =
    resultadoCreditos.data ?? [];

  const referencias =
    resultadoReferencias.data ??
    [];

  const ajustes =
    resultadoAjustes.data ?? [];

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/administrador/clientes"
          className="font-bold text-emerald-700"
        >
          ← Volver a clientes
        </Link>

        <header className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
              Página Cred · Cliente
            </p>

            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              {[
                cliente.nombres,
                cliente.apellidos,
              ]
                .filter(Boolean)
                .join(" ")}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {cliente.tipo_documento ??
                "Documento"}{" "}
              ·{" "}
              {cliente.numero_documento ??
                "No registrado"}
            </p>
          </div>

          <Estado
            estado={
              cliente.estado ??
              "pendiente"
            }
          />
        </header>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Tarjeta titulo="Información personal">
              <GridDatos>
                <Dato
                  etiqueta="Correo"
                  valor={
                    cliente.correo
                  }
                />

                <Dato
                  etiqueta="Celular"
                  valor={
                    cliente.celular
                  }
                />

                <Dato
                  etiqueta="Celular alterno"
                  valor={
                    cliente.celular_alterno
                  }
                />

                <Dato
                  etiqueta="Fecha de nacimiento"
                  valor={
                    cliente.fecha_nacimiento
                      ? formatearSoloFecha(
                          cliente.fecha_nacimiento,
                        )
                      : null
                  }
                />

                <Dato
                  etiqueta="Sexo"
                  valor={cliente.sexo}
                />

                <Dato
                  etiqueta="Estado civil"
                  valor={
                    cliente.estado_civil
                  }
                />

                <Dato
                  etiqueta="Ubicación"
                  valor={[
                    cliente.direccion,
                    cliente.barrio,
                    cliente.ciudad,
                    cliente.departamento,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />

                <Dato
                  etiqueta="Expedición"
                  valor={[
                    cliente.fecha_expedicion
                      ? formatearSoloFecha(
                          cliente.fecha_expedicion,
                        )
                      : null,
                    cliente.lugar_expedicion,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </GridDatos>
            </Tarjeta>

            <Tarjeta titulo="Información económica">
              <GridDatos>
                <Dato
                  etiqueta="Ocupación"
                  valor={
                    cliente.ocupacion
                  }
                />

                <Dato
                  etiqueta="Empresa"
                  valor={
                    cliente.empresa
                  }
                />

                <Dato
                  etiqueta="Cargo"
                  valor={
                    cliente.cargo
                  }
                />

                <Dato
                  etiqueta="Ingreso mensual"
                  valor={formatearDinero(
                    Number(
                      cliente.ingreso_mensual ??
                        0,
                    ),
                  )}
                />

                <Dato
                  etiqueta="Antigüedad"
                  valor={`${cliente.antiguedad_meses ?? 0} meses`}
                />
              </GridDatos>
            </Tarjeta>

            <Tarjeta titulo="Comportamiento financiero">
              <GridDatos>
                <Dato
                  etiqueta="Nivel"
                  valor={`Nivel ${cliente.nivel ?? 1}`}
                />

                <Dato
                  etiqueta="Puntaje"
                  valor={`${cliente.puntaje ?? 0}`}
                />

                <Dato
                  etiqueta="Cupo mínimo"
                  valor={formatearDinero(
                    Number(
                      cliente.cupo_minimo ??
                        0,
                    ),
                  )}
                />

                <Dato
                  etiqueta="Cupo actual"
                  valor={formatearDinero(
                    Number(
                      cliente.cupo_actual ??
                        0,
                    ),
                  )}
                  destacado
                />

                <Dato
                  etiqueta="Créditos pagados"
                  valor={`${cliente.creditos_pagados ?? 0}`}
                />

                <Dato
                  etiqueta="Créditos vencidos"
                  valor={`${cliente.creditos_vencidos ?? 0}`}
                />
              </GridDatos>
            </Tarjeta>

            <Tarjeta titulo="Referencias">
              {!referencias.length ? (
                <MensajeVacio texto="No existen referencias registradas." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {referencias.map(
                    (referencia) => (
                      <div
                        key={
                          referencia.id
                        }
                        className="rounded-2xl bg-[#f7f8f5] p-5"
                      >
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                          {
                            referencia.tipo
                          }
                        </p>

                        <p className="mt-2 font-black text-slate-900">
                          {
                            referencia.nombre_completo
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {referencia.parentesco ??
                            "Sin relación registrada"}
                        </p>

                        <p className="mt-2 text-sm font-bold text-slate-700">
                          {
                            referencia.celular
                          }
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
            </Tarjeta>

            <Tarjeta titulo="Solicitudes">
              {!solicitudes.length ? (
                <MensajeVacio texto="No existen solicitudes registradas." />
              ) : (
                <div className="space-y-3">
                  {solicitudes.map(
                    (solicitud) => (
                      <Link
                        key={
                          solicitud.id
                        }
                        href={`/administrador/solicitudes/${solicitud.id}`}
                        className="flex flex-col gap-3 rounded-2xl bg-[#f7f8f5] p-5 transition hover:bg-emerald-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-black text-slate-900">
                            {formatearDinero(
                              Number(
                                solicitud.monto_solicitado,
                              ),
                            )}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {
                              solicitud.plazo_dias
                            }{" "}
                            días ·{" "}
                            {formatearFechaHora(
                              solicitud.fecha_solicitud,
                            )}
                          </p>
                        </div>

                        <Estado
                          estado={
                            solicitud.estado
                          }
                        />
                      </Link>
                    ),
                  )}
                </div>
              )}
            </Tarjeta>

            <Tarjeta titulo="Créditos">
              {!creditos.length ? (
                <MensajeVacio texto="No existen créditos registrados." />
              ) : (
                <div className="space-y-3">
                  {creditos.map(
                    (credito) => (
                      <Link
                        key={credito.id}
                        href={`/administrador/creditos/${credito.id}`}
                        className="flex flex-col gap-3 rounded-2xl bg-[#f7f8f5] p-5 transition hover:bg-emerald-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-black text-slate-900">
                            {formatearDinero(
                              Number(
                                credito.monto_aprobado,
                              ),
                            )}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Saldo:{" "}
                            {formatearDinero(
                              Number(
                                credito.saldo_total ??
                                  0,
                              ),
                            )}
                          </p>
                        </div>

                        <Estado
                          estado={
                            credito.estado
                          }
                        />
                      </Link>
                    ),
                  )}
                </div>
              )}
            </Tarjeta>

            <Tarjeta titulo="Historial de ajustes">
              {!ajustes.length ? (
                <MensajeVacio texto="No existen ajustes administrativos." />
              ) : (
                <div className="space-y-3">
                  {ajustes.map(
                    (ajuste) => (
                      <div
                        key={ajuste.id}
                        className="rounded-2xl bg-[#f7f8f5] p-5"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-black capitalize text-slate-900">
                            {ajuste.tipo.replace(
                              "_",
                              " ",
                            )}
                          </p>

                          <p className="text-xs text-slate-500">
                            {formatearFechaHora(
                              ajuste.creado_en,
                            )}
                          </p>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {ajuste.motivo}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
            </Tarjeta>
          </div>

          <aside className="space-y-6">
            <GestionarCliente
              clienteId={cliente.id}
              estadoInicial={
                cliente.estado ??
                "pendiente"
              }
              cupoInicial={Number(
                cliente.cupo_actual ??
                  0,
              )}
              nivelInicial={Number(
                cliente.nivel ?? 1,
              )}
            />

            <Tarjeta titulo="Validaciones">
              <Dato
                etiqueta="Perfil completo"
                valor={
                  cliente.perfil_completo
                    ? "Sí"
                    : "No"
                }
              />

              <Dato
                etiqueta="Identidad validada"
                valor={
                  cliente.identidad_validada
                    ? "Sí"
                    : "No"
                }
              />

              <Dato
                etiqueta="Celular validado"
                valor={
                  cliente.celular_validado
                    ? "Sí"
                    : "No"
                }
              />

              <Dato
                etiqueta="Cuenta validada"
                valor={
                  cliente.cuenta_validada
                    ? "Sí"
                    : "No"
                }
              />

              {cliente.motivo_bloqueo ? (
                <div className="rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-800">
                  <strong>
                    Motivo del bloqueo:
                  </strong>{" "}
                  {
                    cliente.motivo_bloqueo
                  }
                </div>
              ) : null}
            </Tarjeta>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Tarjeta({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-7">
      <h2 className="text-xl font-black text-slate-900">
        {titulo}
      </h2>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function GridDatos({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {children}
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor?: string | null;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#f7f8f5] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>

      <p
        className={
          destacado
            ? "mt-2 font-black text-emerald-700"
            : "mt-2 font-black text-slate-900"
        }
      >
        {valor || "No registrado"}
      </p>
    </div>
  );
}

function Estado({
  estado,
}: {
  estado: string;
}) {
  const estilos: Record<
    string,
    string
  > = {
    activo:
      "bg-emerald-50 text-emerald-700",
    pagado:
      "bg-emerald-50 text-emerald-700",
    aprobada:
      "bg-emerald-50 text-emerald-700",
    pendiente:
      "bg-amber-50 text-amber-700",
    en_revision:
      "bg-blue-50 text-blue-700",
    pendiente_desembolso:
      "bg-violet-50 text-violet-700",
    desembolsada:
      "bg-violet-50 text-violet-700",
    vencido:
      "bg-rose-50 text-rose-700",
    rechazada:
      "bg-rose-50 text-rose-700",
    bloqueado:
      "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex h-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
        estilos[estado] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {estado.replace(
        "_",
        " ",
      )}
    </span>
  );
}

function MensajeVacio({
  texto,
}: {
  texto: string;
}) {
  return (
    <p className="rounded-2xl bg-[#f7f8f5] p-5 text-sm text-slate-500">
      {texto}
    </p>
  );
}

function esUuidValido(
  valor: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
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
  const [anio, mes, dia] =
    fecha
      .slice(0, 10)
      .split("-")
      .map(Number);

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
    },
  ).format(
    new Date(
      anio,
      mes - 1,
      dia,
    ),
  );
}

function formatearFechaHora(
  fecha: string | null,
) {
  if (!fecha) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat(
    "es-CO",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "America/Bogota",
    },
  ).format(new Date(fecha));
}
