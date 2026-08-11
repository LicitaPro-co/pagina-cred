import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Solicitud = {
  id: number;
  estado: string;
  monto_solicitado: string | number;
  plazo_dias: number;
  valor_total_pagar: string | number;
  fecha_estimada_pago: string | null;
  fecha_solicitud: string | null;
  motivo_rechazo: string | null;
};

export default async function SolicitudesClientePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  const { data: solicitudes, error } = await supabase
    .from("solicitudes_credito")
    .select(`
      id,
      estado,
      monto_solicitado,
      plazo_dias,
      valor_total_pagar,
      fecha_estimada_pago,
      fecha_solicitud,
      motivo_rechazo
    `)
    .eq("cliente_id", user.id)
    .order("fecha_solicitud", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error consultando solicitudes del cliente:",
      error.message,
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-9">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
              Página Cred
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Mis solicitudes
            </h1>
          </div>

          <Link
            href="/cliente"
            className="w-fit rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Volver
          </Link>
        </header>

        <section className="mt-8 space-y-4">
          {!solicitudes?.length ? (
            <div className="rounded-[28px] border border-[#eadfce] bg-white p-8">
              <p className="text-slate-600">
                Todavía no tienes solicitudes registradas.
              </p>

              <Link
                href="/cliente/solicitar"
                className="mt-5 inline-block rounded-2xl bg-emerald-700 px-6 py-3 font-bold text-white transition hover:bg-emerald-800"
              >
                Solicitar crédito
              </Link>
            </div>
          ) : (
            solicitudes.map((solicitud: Solicitud) => (
              <article
                key={solicitud.id}
                className="rounded-[28px] border border-[#eadfce] bg-white p-6"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Estado estado={solicitud.estado} />

                    <p className="mt-3 text-2xl font-black text-slate-900">
                      {formatearDinero(
                        Number(solicitud.monto_solicitado),
                      )}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {solicitud.plazo_dias} días · Total{" "}
                      {formatearDinero(
                        Number(solicitud.valor_total_pagar),
                      )}
                    </p>
                  </div>

                  <div className="text-sm text-slate-600 sm:text-right">
                    <p>
                      Solicitado:{" "}
                      {formatearFechaHora(
                        solicitud.fecha_solicitud,
                      )}
                    </p>

                    <p className="mt-1">
                      Pago estimado:{" "}
                      {formatearSoloFecha(
                        solicitud.fecha_estimada_pago,
                      )}
                    </p>
                  </div>
                </div>

                {solicitud.motivo_rechazo ? (
                  <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
                    {solicitud.motivo_rechazo}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function Estado({ estado }: { estado: string }) {
  const textos: Record<string, string> = {
    borrador: "Borrador",
    pendiente: "Pendiente",
    en_revision: "En revisión",
    aprobada: "Aprobada",
    rechazada: "Rechazada",
    cancelada: "Cancelada",
    desembolsada: "Desembolsada",
  };

  const estilos: Record<string, string> = {
    borrador: "bg-slate-100 text-slate-700",
    pendiente: "bg-amber-50 text-amber-700",
    en_revision: "bg-blue-50 text-blue-700",
    aprobada: "bg-emerald-50 text-emerald-700",
    rechazada: "bg-rose-50 text-rose-700",
    cancelada: "bg-slate-100 text-slate-700",
    desembolsada: "bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
        estilos[estado] ?? "bg-slate-100 text-slate-700"
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

  const fechaSinHora = fecha.slice(0, 10);
  const partes = fechaSinHora.split("-");

  if (partes.length !== 3) {
    return "Fecha no válida";
  }

  const anio = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);

  if (
    !Number.isInteger(anio) ||
    !Number.isInteger(mes) ||
    !Number.isInteger(dia)
  ) {
    return "Fecha no válida";
  }

  const valor = new Date(anio, mes - 1, dia);

  if (Number.isNaN(valor.getTime())) {
    return "Fecha no válida";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(valor);
}
