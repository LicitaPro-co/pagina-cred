import Link from "next/link";
import { redirect } from "next/navigation";

import FormularioConfiguracion from "@/components/administrador/formulario-configuracion";
import FormularioTasasPlazo from "@/components/administrador/formulario-tasas-plazo";
import FormularioNivelesCredito from "@/components/administrador/formulario-niveles-credito";
import { createClient } from "@/lib/supabase/server";

export default async function ConfiguracionPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect("/iniciar-sesion");
  }

  const { data: administrador } = await supabase
    .from("perfiles")
    .select(`
      rol,
      estado
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    !administrador ||
    administrador.estado !== "activo" ||
    ![
      "administrador",
      "superadministrador",
    ].includes(String(administrador.rol))
  ) {
    redirect("/administrador");
  }

  const {
    data: configuracion,
    error: errorConfiguracion,
  } = await supabase
    .from("configuracion_credito")
    .select(`
      id,
      nombre,
      monto_minimo_global,
      monto_maximo_global,
      plazo_minimo_dias,
      plazo_maximo_dias,
      maximo_creditos_activos,
      permite_pago_anticipado,
      permite_nueva_solicitud_inmediata,
      requiere_revision_cliente_nuevo,
      permite_aprobacion_automatica,
      tasa_validada_juridicamente,
      fecha_validacion_juridica,
      observacion_validacion_juridica,
      porcentaje_mora_ea,
      dias_gracia_mora,
      plataforma_activa,
      modo_mantenimiento,
      actualizado_en
    `)
    .limit(1)
    .maybeSingle();

  if (errorConfiguracion) {
    console.error(
      "Error consultando configuración:",
      errorConfiguracion,
    );
  }

  if (!configuracion) {
    return (
      <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/administrador"
            className="font-bold text-emerald-700"
          >
            ← Volver al panel
          </Link>

          <section className="mt-8 rounded-[28px] border border-rose-200 bg-white p-8">
            <h1 className="text-2xl font-black text-slate-900">
              Configuración no encontrada
            </h1>

            <p className="mt-3 leading-7 text-slate-600">
              No existe una política principal de crédito.
              Ejecuta primero el bloque SQL de configuración.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const {
    data: tasasPlazo,
    error: errorTasas,
  } = await supabase
    .from("tasas_credito_plazo")
    .select(`
      plazo_dias,
      tasa_interes_ea,
      activo,
      fecha_inicio_vigencia
    `)
    .eq("activo", true)
    .lte(
      "fecha_inicio_vigencia",
      new Date()
        .toISOString()
        .slice(0, 10),
    )
    .order("plazo_dias", {
      ascending: true,
    });

  if (errorTasas) {
    console.error(
      "Error consultando tasas:",
      errorTasas,
    );
  }

  const {
    data: nivelesCredito,
    error: errorNiveles,
  } = await supabase
    .from("niveles_credito")
    .select(`
      numero_nivel,
      nombre,
      monto_maximo,
      incremento_monto,
      creditos_pagados_requeridos,
      puntaje_minimo,
      activo
    `)
    .order("numero_nivel", {
      ascending: true,
    });

  if (errorNiveles) {
    console.error(
      "Error consultando niveles:",
      errorNiveles,
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/administrador"
          className="font-bold text-emerald-700"
        >
          ← Volver al panel
        </Link>

        <header className="mt-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
            Página Cred · Administración
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
            Configuración
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Administra los límites y reglas globales de
            la operación crediticia.
          </p>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <EstadoConfiguracion
            etiqueta="Límite máximo"
            valor={formatearDinero(
              Number(
                configuracion.monto_maximo_global,
              ),
            )}
            descripcion="Máximo inicial por cliente"
          />

          <EstadoConfiguracion
            etiqueta="Plazos"
            valor={`${configuracion.plazo_minimo_dias} a ${configuracion.plazo_maximo_dias} días`}
            descripcion="Rango global permitido"
          />

          <EstadoConfiguracion
            etiqueta="Validación jurídica"
            valor={
              configuracion.tasa_validada_juridicamente
                ? "Completada"
                : "Pendiente"
            }
            descripcion={
              configuracion.tasa_validada_juridicamente
                ? formatearFechaOpcional(
                    configuracion.fecha_validacion_juridica,
                  )
                : "Debe completarse antes de publicar"
            }
            alerta={
              !configuracion.tasa_validada_juridicamente
            }
          />
        </section>

        {!configuracion.tasa_validada_juridicamente ? (
          <section className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <p className="font-black">
              Publicación financiera condicionada
            </p>

            <p className="mt-2 text-sm leading-6">
              La tasa y los cargos todavía deben validarse
              jurídicamente. Mantén desactivada la aprobación
              automática y no publiques una oferta definitiva
              hasta completar esa revisión.
            </p>
          </section>
        ) : null}

        <section className="mt-6">
          <FormularioConfiguracion
            configuracion={{
              montoMinimo: Number(
                configuracion.monto_minimo_global,
              ),
              montoMaximo: Number(
                configuracion.monto_maximo_global,
              ),
              plazoMinimo: Number(
                configuracion.plazo_minimo_dias,
              ),
              plazoMaximo: Number(
                configuracion.plazo_maximo_dias,
              ),
              maximoCreditosActivos: Number(
                configuracion.maximo_creditos_activos,
              ),
              permitePagoAnticipado: Boolean(
                configuracion.permite_pago_anticipado,
              ),
              permiteNuevaSolicitud: Boolean(
                configuracion.permite_nueva_solicitud_inmediata,
              ),
              requiereRevisionClienteNuevo: Boolean(
                configuracion.requiere_revision_cliente_nuevo,
              ),
              permiteAprobacionAutomatica: Boolean(
                configuracion.permite_aprobacion_automatica,
              ),
              porcentajeMoraEa:
                configuracion.porcentaje_mora_ea ===
                null
                  ? null
                  : Number(
                      configuracion.porcentaje_mora_ea,
                    ),
              diasGraciaMora: Number(
                configuracion.dias_gracia_mora,
              ),
              plataformaActiva: Boolean(
                configuracion.plataforma_activa,
              ),
              modoMantenimiento: Boolean(
                configuracion.modo_mantenimiento,
              ),
              tasaValidadaJuridicamente: Boolean(
                configuracion.tasa_validada_juridicamente,
              ),
            }}
          />
        </section>

        <section className="mt-6">
          <FormularioTasasPlazo
            tasas={(tasasPlazo ?? []).map(
              (tasa) => ({
                plazoDias: Number(
                  tasa.plazo_dias,
                ),
                tasaInteresEa: Number(
                  tasa.tasa_interes_ea,
                ),
              }),
            )}
          />
        </section>

        <section className="mt-6">
          <FormularioNivelesCredito
            niveles={(nivelesCredito ?? []).map(
              (nivel) => ({
                numeroNivel: Number(
                  nivel.numero_nivel,
                ),
                nombre: String(
                  nivel.nombre ?? "",
                ),
                montoMaximo: Number(
                  nivel.monto_maximo ?? 0,
                ),
                incrementoMonto: Number(
                  nivel.incremento_monto ?? 10000,
                ),
                creditosRequeridos: Number(
                  nivel.creditos_pagados_requeridos ?? 0,
                ),
                puntajeMinimo: Number(
                  nivel.puntaje_minimo ?? 0,
                ),
                activo: Boolean(
                  nivel.activo,
                ),
              }),
            )}
          />
        </section>

        <p className="mt-5 text-right text-xs text-slate-400">
          Última actualización:{" "}
          {formatearFechaOpcional(
            configuracion.actualizado_en,
          )}
        </p>
      </div>
    </main>
  );
}

function EstadoConfiguracion({
  etiqueta,
  valor,
  descripcion,
  alerta = false,
}: {
  etiqueta: string;
  valor: string;
  descripcion: string;
  alerta?: boolean;
}) {
  return (
    <article className="rounded-[26px] border border-[#eadfce] bg-white p-6">
      <p
        className={
          alerta
            ? "text-sm font-bold text-amber-700"
            : "text-sm font-bold text-slate-500"
        }
      >
        {etiqueta}
      </p>

      <p
        className={
          alerta
            ? "mt-3 text-2xl font-black text-amber-800"
            : "mt-3 text-2xl font-black text-slate-900"
        }
      >
        {valor}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {descripcion}
      </p>
    </article>
  );
}

function formatearDinero(valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearFechaOpcional(
  fecha: string | null,
) {
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
