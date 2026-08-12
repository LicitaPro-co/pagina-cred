import Link from "next/link";
import { redirect } from "next/navigation";
import BotonCerrarSesion from "@/components/auth/boton-cerrar-sesion";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NivelCredito = {
  numero_nivel: number;
  nombre: string;
  monto_minimo: number;
  monto_maximo: number;
  incremento_monto: number;
  plazos_dias: number[];
  tasa_interes_ea: number;
  creditos_pagados_requeridos: number;
  puntaje_minimo: number;
};

export default async function ClientePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select(`
      nombres,
      apellidos,
      estado,
      nivel,
      puntaje,
      cupo_minimo,
      cupo_actual,
      creditos_pagados,
      creditos_vencidos,
      perfil_completo
    `)
    .eq("id", user.id)
    .single();

  if (!perfil) {
    redirect("/iniciar-sesion");
  }

  /*
   * Consultamos la configuración real del nivel
   * que tiene actualmente el cliente.
   */
  const { data: nivelActual } = await supabase
    .from("niveles_credito")
    .select(`
      numero_nivel,
      nombre,
      monto_minimo,
      monto_maximo,
      incremento_monto,
      plazos_dias,
      tasa_interes_ea,
      creditos_pagados_requeridos,
      puntaje_minimo
    `)
    .eq("numero_nivel", perfil.nivel)
    .eq("activo", true)
    .maybeSingle();

  /*
   * Consultamos el siguiente nivel para mostrar
   * el progreso del cliente.
   */
  const { data: siguienteNivel } = await supabase
    .from("niveles_credito")
    .select(`
      numero_nivel,
      nombre,
      monto_minimo,
      monto_maximo,
      incremento_monto,
      plazos_dias,
      tasa_interes_ea,
      creditos_pagados_requeridos,
      puntaje_minimo
    `)
    .gt("numero_nivel", perfil.nivel)
    .eq("activo", true)
    .order("numero_nivel", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  /*
   * Revisamos si existe una solicitud pendiente.
   */
  const { data: solicitudActiva } = await supabase
    .from("solicitudes_credito")
    .select(`
      id,
      estado,
      monto_solicitado,
      plazo_dias,
      valor_total_pagar,
      created_at
    `)
    .eq("cliente_id", user.id)
    .in("estado", [
      "pendiente",
      "en_revision",
      "aprobada",
    ])
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  /*
   * Revisamos si existe un crédito vigente.
   */
  const { data: creditoActivo } = await supabase
    .from("creditos")
    .select(`
      id,
      estado,
      monto_aprobado,
      valor_total_pagar,
      saldo_total,
      fecha_desembolso,
      fecha_vencimiento
    `)
    .eq("cliente_id", user.id)
    .in("estado", ["pendiente_desembolso", "activo", "vencido"])
    .order("fecha_desembolso", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  const nombre = perfil.nombres || "Cliente";

  const nivel =
    nivelActual as NivelCredito | null;

  const siguiente =
    siguienteNivel as NivelCredito | null;

  const plazos = Array.isArray(nivel?.plazos_dias)
    ? nivel.plazos_dias
    : [];

  const plazoMinimo =
    plazos.length > 0
      ? Math.min(...plazos)
      : 2;

  const plazoMaximo =
    plazos.length > 0
      ? Math.max(...plazos)
      : 10;

  const montoMinimo = Number(
    nivel?.monto_minimo ??
      perfil.cupo_minimo ??
      20000,
  );

  /*
   * El cupo utilizable nunca debe superar
   * el máximo definido para el nivel.
   */
  const cupoDisponible = Math.min(
    Number(perfil.cupo_actual ?? 0),
    Number(
      nivel?.monto_maximo ??
        perfil.cupo_actual ??
        0,
    ),
  );

  const creditosPagados = Number(
    perfil.creditos_pagados ?? 0,
  );

  const puntaje = Number(perfil.puntaje ?? 0);

  const faltanCreditos = siguiente
    ? Math.max(
        0,
        Number(
          siguiente.creditos_pagados_requeridos,
        ) - creditosPagados,
      )
    : 0;

  const faltanPuntos = siguiente
    ? Math.max(
        0,
        Number(siguiente.puntaje_minimo) -
          puntaje,
      )
    : 0;

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
              Página Cred
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Hola, {nombre}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/cliente/creditos"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver historial
            </Link>

            <BotonCerrarSesion />
          </div>
        </header>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <Tarjeta
            etiqueta="Cupo disponible"
            valor={formatearDinero(
              cupoDisponible,
            )}
            descripcion="Monto máximo habilitado actualmente"
          />

          <Tarjeta
            etiqueta="Nivel"
            valor={`${perfil.nivel}`}
            descripcion={
              nivel?.nombre ??
              `${creditosPagados} créditos pagados`
            }
          />

          <Tarjeta
            etiqueta="Puntaje"
            valor={`${puntaje}`}
            descripcion={`${creditosPagados} créditos pagados`}
          />
        </section>

        {creditoActivo ? (
          <section className="mt-8 rounded-[30px] border border-[#eadfce] bg-white p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
              Crédito vigente
            </p>

            <h2 className="mt-3 text-3xl font-black text-slate-900">
              Tienes un crédito en curso
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <MiniDato
                etiqueta="Monto"
                valor={formatearDinero(
                  Number(
                    creditoActivo.monto_aprobado,
                  ),
                )}
              />

              <MiniDato
                etiqueta="Saldo pendiente"
                valor={formatearDinero(
                  Number(
                    creditoActivo.saldo_total,
                  ),
                )}
              />

              <MiniDato
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
              className="mt-7 inline-block rounded-2xl bg-emerald-700 px-7 py-4 font-bold text-white transition hover:bg-emerald-800"
            >
              Ver mi crédito
            </Link>
          </section>
        ) : solicitudActiva ? (
          <section className="mt-8 rounded-[30px] border border-[#eadfce] bg-white p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
              Solicitud en proceso
            </p>

            <h2 className="mt-3 text-3xl font-black text-slate-900">
              Ya tienes una solicitud activa
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Tu solicitud por{" "}
              <strong>
                {formatearDinero(
                  Number(
                    solicitudActiva.monto_solicitado,
                  ),
                )}
              </strong>{" "}
              a{" "}
              <strong>
                {solicitudActiva.plazo_dias} días
              </strong>{" "}
              se encuentra actualmente en estado{" "}
              <strong>
                {formatearEstado(
                  solicitudActiva.estado,
                )}
              </strong>
              .
            </p>

            <Link
              href="/cliente/solicitudes"
              className="mt-7 inline-block rounded-2xl bg-emerald-700 px-7 py-4 font-bold text-white transition hover:bg-emerald-800"
            >
              Ver solicitud
            </Link>
          </section>
        ) : (
          <section className="mt-8 rounded-[30px] border border-[#eadfce] bg-white p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
              Nuevo crédito disponible
            </p>

            <h2 className="mt-3 text-3xl font-black text-slate-900">
              Tienes cupo disponible
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Actualmente puedes solicitar entre{" "}
              <strong>
                {formatearDinero(montoMinimo)}
              </strong>{" "}
              y{" "}
              <strong>
                {formatearDinero(
                  cupoDisponible,
                )}
              </strong>
              .
            </p>

            <p className="mt-2 max-w-2xl leading-7 text-slate-600">
              Puedes elegir un plazo entre{" "}
              <strong>{plazoMinimo}</strong> y{" "}
              <strong>{plazoMaximo} días</strong>.
              El valor total del crédito se calculará
              según el monto y el plazo seleccionado.
            </p>

            <div className="mt-6 rounded-2xl bg-[#f7f8f5] p-5">
              <p className="text-sm font-semibold text-slate-500">
                Tu nivel actual
              </p>

              <p className="mt-1 text-lg font-black text-slate-900">
                Nivel {perfil.nivel}
                {nivel?.nombre
                  ? ` · ${nivel.nombre}`
                  : ""}
              </p>
            </div>

            <Link
              href={
                perfil.perfil_completo
                  ? "/cliente/solicitar"
                  : "/cliente/perfil"
              }
              className="mt-7 inline-block rounded-2xl bg-emerald-700 px-7 py-4 font-bold text-white transition hover:bg-emerald-800"
            >
              {perfil.perfil_completo
                ? "Solicitar crédito"
                : "Completar perfil para solicitar"}
            </Link>
          </section>
        )}

        {siguiente &&
        !creditoActivo &&
        !solicitudActiva ? (
          <section className="mt-6 rounded-[26px] border border-[#eadfce] bg-white p-6">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500">
              Próximo nivel
            </p>

            <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Nivel {siguiente.numero_nivel} ·{" "}
                  {siguiente.nombre}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Cupo máximo de{" "}
                  <strong>
                    {formatearDinero(
                      Number(
                        siguiente.monto_maximo,
                      ),
                    )}
                  </strong>
                  .
                </p>
              </div>

              <div className="rounded-2xl bg-[#f7f8f5] px-5 py-4">
                {faltanCreditos > 0 ? (
                  <p className="text-sm text-slate-600">
                    Te faltan{" "}
                    <strong>
                      {faltanCreditos} crédito
                      {faltanCreditos === 1
                        ? ""
                        : "s"}{" "}
                      pagado
                      {faltanCreditos === 1
                        ? ""
                        : "s"}
                    </strong>
                    .
                  </p>
                ) : null}

                {faltanPuntos > 0 ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Te faltan{" "}
                    <strong>
                      {faltanPuntos} puntos
                    </strong>
                    .
                  </p>
                ) : null}

                {faltanCreditos === 0 &&
                faltanPuntos === 0 ? (
                  <p className="text-sm font-bold text-emerald-700">
                    Ya cumples los requisitos para
                    avanzar.
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

type TarjetaProps = {
  etiqueta: string;
  valor: string;
  descripcion: string;
};

function Tarjeta({
  etiqueta,
  valor,
  descripcion,
}: TarjetaProps) {
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

function MiniDato({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f7f8f5] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {etiqueta}
      </p>

      <p className="mt-2 font-black text-slate-900">
        {valor}
      </p>
    </div>
  );
}

function formatearDinero(valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha
    .slice(0, 10)
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(
    new Date(anio, mes - 1, dia),
  );
}

function formatearEstado(estado: string) {
  return estado
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) =>
      letra.toUpperCase(),
    );
}
