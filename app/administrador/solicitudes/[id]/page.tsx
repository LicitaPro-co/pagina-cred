import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GestionarSolicitud from "@/components/administrador/gestionar-solicitud";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DetalleSolicitudPage({
  params,
}: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  const { data: administrador } = await supabase
    .from("perfiles")
    .select(`
      id,
      rol,
      estado
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    !administrador ||
    administrador.estado !== "activo" ||
    ![
      "analista",
      "administrador",
      "superadministrador",
    ].includes(administrador.rol)
  ) {
    redirect("/cliente");
  }

  const { data: solicitud, error: errorSolicitud } =
    await supabase
      .from("solicitudes_credito")
      .select(`
        id,
        cliente_id,
        cuenta_desembolso_id,
        estado,
        monto_solicitado,
        plazo_dias,
        porcentaje_costo,
        valor_costo_base,
        porcentaje_iva,
        valor_iva,
        valor_total_pagar,
        fecha_solicitud,
        fecha_estimada_pago,
        observacion_cliente,
        observacion_interna,
        motivo_rechazo,
        revisada_en,
        aprobada_en
      `)
      .eq("id", id)
      .maybeSingle();

  if (errorSolicitud) {
    console.error(
      "Error consultando la solicitud:",
      errorSolicitud.message,
    );
  }

  if (!solicitud) {
    notFound();
  }

  const [
    resultadoCliente,
    resultadoCuenta,
    resultadoReferencias,
    resultadoCredito,
  ] = await Promise.all([
    supabase
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
        fecha_nacimiento,
        departamento,
        ciudad,
        direccion,
        barrio,
        ocupacion,
        empresa,
        cargo,
        ingreso_mensual,
        nivel,
        puntaje,
        creditos_pagados,
        creditos_vencidos,
        identidad_validada,
        perfil_completo
      `)
      .eq("id", solicitud.cliente_id)
      .maybeSingle(),

    supabase
      .from("cuentas_desembolso")
      .select(`
        id,
        proveedor,
        tipo_cuenta,
        numero_cuenta,
        titular,
        numero_documento_titular,
        metodo_desembolso,
        tipo_llave,
        valor_llave,
        verificada,
        llave_verificada
      `)
      .eq("id", solicitud.cuenta_desembolso_id)
      .maybeSingle(),

    supabase
      .from("referencias_cliente")
      .select(`
        id,
        tipo,
        nombre_completo,
        parentesco,
        celular
      `)
      .eq("cliente_id", solicitud.cliente_id)
      .order("tipo"),

    supabase
      .from("creditos")
      .select(`
        id,
        estado,
        monto_aprobado,
        fecha_aprobacion,
        fecha_desembolso,
        fecha_vencimiento,
        referencia_desembolso
      `)
      .eq("solicitud_id", solicitud.id)
      .maybeSingle(),
  ]);

  const cliente = resultadoCliente.data;
  const cuenta = resultadoCuenta.data;
  const referencias: {
    id: string;
    tipo: string;
    nombre_completo: string;
    parentesco?: string | null;
    celular: string;
  }[] = resultadoReferencias.data ?? [];
  const credito = resultadoCredito.data;

  if (!cliente) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-9">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/administrador/solicitudes"
          className="font-bold text-emerald-700"
        >
          ← Volver a solicitudes
        </Link>

        <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
              Página Cred · Gestión administrativa
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Solicitud de {cliente.nombres} {cliente.apellidos}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Identificador: {solicitud.id}
            </p>
          </div>

          <Estado estado={solicitud.estado} />
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Tarjeta titulo="Información del cliente">
            <Dato
              etiqueta="Documento"
              valor={`${cliente.tipo_documento ?? ""} ${
                cliente.numero_documento ?? "Pendiente"
              }`}
            />

            <Dato
              etiqueta="Correo"
              valor={cliente.correo ?? "No registrado"}
            />

            <Dato
              etiqueta="Celular"
              valor={cliente.celular ?? "No registrado"}
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
              etiqueta="Ocupación"
              valor={cliente.ocupacion ?? "No registrada"}
            />

            <Dato
              etiqueta="Empresa o actividad"
              valor={cliente.empresa ?? "No registrada"}
            />

            <Dato
              etiqueta="Ingreso mensual"
              valor={formatearDinero(
                Number(cliente.ingreso_mensual ?? 0),
              )}
            />
          </Tarjeta>

          <Tarjeta titulo="Comportamiento interno">
            <Dato
              etiqueta="Nivel"
              valor={`${cliente.nivel}`}
            />

            <Dato
              etiqueta="Puntaje"
              valor={`${cliente.puntaje}`}
            />

            <Dato
              etiqueta="Créditos pagados"
              valor={`${cliente.creditos_pagados}`}
            />

            <Dato
              etiqueta="Créditos vencidos"
              valor={`${cliente.creditos_vencidos}`}
            />

            <Dato
              etiqueta="Perfil completo"
              valor={cliente.perfil_completo ? "Sí" : "No"}
            />

            <Dato
              etiqueta="Identidad validada"
              valor={cliente.identidad_validada ? "Sí" : "No"}
            />
          </Tarjeta>

          <Tarjeta titulo="Solicitud de crédito">
            <Dato
              etiqueta="Monto solicitado"
              valor={formatearDinero(
                Number(solicitud.monto_solicitado),
              )}
            />

            <Dato
              etiqueta="Plazo"
              valor={`${solicitud.plazo_dias} días`}
            />

            <Dato
              etiqueta="Costo"
              valor={formatearDinero(
                Number(solicitud.valor_costo_base),
              )}
            />

            <Dato
              etiqueta={`IVA (${Number(
                solicitud.porcentaje_iva,
              )} %)`}
              valor={formatearDinero(
                Number(solicitud.valor_iva),
              )}
            />

            <Dato
              etiqueta="Total a pagar"
              valor={formatearDinero(
                Number(solicitud.valor_total_pagar),
              )}
              destacado
            />

            <Dato
              etiqueta="Fecha de solicitud"
              valor={formatearFechaHora(
                solicitud.fecha_solicitud,
              )}
            />

            <Dato
              etiqueta="Pago estimado"
              valor={formatearSoloFecha(
                solicitud.fecha_estimada_pago,
              )}
            />

            {solicitud.observacion_cliente ? (
              <div className="rounded-2xl bg-[#f7f8f5] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Observación del cliente
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {solicitud.observacion_cliente}
                </p>
              </div>
            ) : null}
          </Tarjeta>

          <Tarjeta titulo="Medio de desembolso">
            <Dato
              etiqueta="Proveedor"
              valor={cuenta?.proveedor ?? "No registrado"}
            />

            <Dato
              etiqueta="Método"
              valor={traducirMetodo(
                cuenta?.metodo_desembolso,
              )}
            />

            <Dato
              etiqueta="Tipo de cuenta"
              valor={cuenta?.tipo_cuenta ?? "No registrado"}
            />

            <Dato
              etiqueta="Número"
              valor={cuenta?.numero_cuenta ?? "No registrado"}
            />

            <Dato
              etiqueta="Titular"
              valor={cuenta?.titular ?? "No registrado"}
            />

            {cuenta?.metodo_desembolso === "llave_bre_b" ? (
              <>
                <Dato
                  etiqueta="Tipo de llave"
                  valor={cuenta.tipo_llave ?? "No registrado"}
                />

                <Dato
                  etiqueta="Llave Bre-B"
                  valor={cuenta.valor_llave ?? "No registrada"}
                />

                <Dato
                  etiqueta="Llave verificada"
                  valor={
                    cuenta.llave_verificada ? "Sí" : "No"
                  }
                />
              </>
            ) : null}

            <Dato
              etiqueta="Cuenta verificada"
              valor={cuenta?.verificada ? "Sí" : "No"}
            />
          </Tarjeta>

          <Tarjeta titulo="Referencias">
            {!referencias.length ? (
              <p className="text-sm text-slate-500">
                No hay referencias registradas.
              </p>
            ) : (
              referencias.map((referencia) => (
                <div
                  key={referencia.id}
                  className="rounded-2xl bg-[#f7f8f5] p-4"
                >
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    {referencia.tipo}
                  </p>

                  <p className="mt-2 font-bold text-slate-900">
                    {referencia.nombre_completo}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {referencia.parentesco ?? "Relación no indicada"}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {referencia.celular}
                  </p>
                </div>
              ))
            )}
          </Tarjeta>

          <GestionarSolicitud
            solicitudId={solicitud.id}
            estadoInicial={solicitud.estado}
            observacionInicial={
              solicitud.observacion_interna ?? ""
            }
            referenciaInicial={
              credito?.referencia_desembolso ?? ""
            }
          />
        </section>

        {credito ? (
          <section className="mt-6 rounded-[28px] border border-[#eadfce] bg-white p-7">
            <h2 className="text-xl font-black text-slate-900">
              Crédito generado
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Dato
                etiqueta="Estado"
                valor={credito.estado}
              />

              <Dato
                etiqueta="Monto aprobado"
                valor={formatearDinero(
                  Number(credito.monto_aprobado),
                )}
              />

              <Dato
                etiqueta="Fecha de desembolso"
                valor={
                  credito.fecha_desembolso
                    ? formatearFechaHora(
                        credito.fecha_desembolso,
                      )
                    : "Pendiente"
                }
              />

              <Dato
                etiqueta="Fecha de vencimiento"
                valor={
                  credito.fecha_vencimiento
                    ? formatearSoloFecha(
                        credito.fecha_vencimiento,
                      )
                    : "Pendiente"
                }
              />
            </div>
          </section>
        ) : null}
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
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-7">
      <h2 className="text-xl font-black text-slate-900">
        {titulo}
      </h2>

      <div className="mt-5 space-y-4">{children}</div>
    </article>
  );
}

function Dato({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-slate-100 pb-3">
      <span className="text-sm text-slate-500">
        {etiqueta}
      </span>

      <span
        className={
          destacado
            ? "text-right font-black text-emerald-700"
            : "text-right font-bold text-slate-900"
        }
      >
        {valor || "No registrado"}
      </span>
    </div>
  );
}

function Estado({ estado }: { estado: string }) {
  const textos: Record<string, string> = {
    pendiente: "Pendiente",
    en_revision: "En revisión",
    aprobada: "Aprobada",
    rechazada: "Rechazada",
    cancelada: "Cancelada",
    desembolsada: "Desembolsada",
  };

  const estilos: Record<string, string> = {
    pendiente: "bg-amber-50 text-amber-700",
    en_revision: "bg-blue-50 text-blue-700",
    aprobada: "bg-emerald-50 text-emerald-700",
    rechazada: "bg-rose-50 text-rose-700",
    cancelada: "bg-slate-100 text-slate-700",
    desembolsada: "bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
        estilos[estado] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {textos[estado] ?? estado}
    </span>
  );
}

function formatearDinero(valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearFechaHora(fecha: string | null) {
  if (!fecha) {
    return "Sin fecha";
  }

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "Fecha no válida";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(valor);
}

function formatearSoloFecha(fecha: string | null) {
  if (!fecha) {
    return "Sin fecha";
  }

  const [anio, mes, dia] = fecha
    .slice(0, 10)
    .split("-")
    .map(Number);

  const valor = new Date(anio, mes - 1, dia);

  if (Number.isNaN(valor.getTime())) {
    return "Fecha no válida";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(valor);
}

function traducirMetodo(
  metodo: string | null | undefined,
) {
  const metodos: Record<string, string> = {
    cuenta: "Cuenta bancaria",
    billetera: "Billetera digital",
    llave_bre_b: "Llave Bre-B",
  };

  return metodo ? metodos[metodo] ?? metodo : "No registrado";
}
