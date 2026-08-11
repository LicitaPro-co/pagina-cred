import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SolicitudesAdministradorPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  const { data: administrador } = await supabase
    .from("perfiles")
    .select("rol, estado")
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

  const { data: solicitudes, error } = await supabase
    .from("solicitudes_credito")
    .select(`
      id,
      cliente_id,
      estado,
      monto_solicitado,
      plazo_dias,
      valor_total_pagar,
      fecha_solicitud,
      fecha_estimada_pago
    `)
    .order("fecha_solicitud", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error consultando solicitudes administrativas:",
      error.message,
    );
  }

  const idsClientes = [
    ...new Set(
      (solicitudes ?? []).map(
        (solicitud) => solicitud.cliente_id,
      ),
    ),
  ];

  const { data: clientes } = idsClientes.length
    ? await supabase
        .from("perfiles")
        .select(`
          id,
          nombres,
          apellidos,
          numero_documento,
          celular,
          nivel
        `)
        .in("id", idsClientes)
    : { data: [] };

  const clientesPorId = new Map(
    (clientes ?? []).map((cliente) => [
      cliente.id,
      cliente,
    ]),
  );

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-9">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
              Página Cred · Administración
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Solicitudes de crédito
            </h1>

            <p className="mt-2 text-slate-600">
              Revisa, aprueba, rechaza y registra desembolsos.
            </p>
          </div>

          <Link
            href="/administrador"
            className="w-fit rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700"
          >
            Volver al panel
          </Link>
        </header>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-[#eadfce] bg-white">
          {!solicitudes?.length ? (
            <div className="p-8 text-slate-600">
              No existen solicitudes registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[#f7f8f5] text-left text-sm text-slate-600">
                  <tr>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Monto</th>
                    <th className="px-6 py-4">Plazo</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Solicitud</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>

                <tbody>
                  {solicitudes.map((solicitud) => {
                    const cliente = clientesPorId.get(
                      solicitud.cliente_id,
                    );

                    return (
                      <tr
                        key={solicitud.id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900">
                            {cliente
                              ? `${cliente.nombres} ${cliente.apellidos}`
                              : "Cliente no encontrado"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {cliente?.numero_documento ??
                              "Documento pendiente"}
                          </p>
                        </td>

                        <td className="px-6 py-5 font-black">
                          {formatearDinero(
                            Number(
                              solicitud.monto_solicitado,
                            ),
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {solicitud.plazo_dias} días
                        </td>

                        <td className="px-6 py-5">
                          <Estado
                            estado={solicitud.estado}
                          />
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-500">
                          {formatearFechaHora(
                            solicitud.fecha_solicitud,
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <Link
                            href={`/administrador/solicitudes/${solicitud.id}`}
                            className="font-bold text-emerald-700"
                          >
                            Gestionar
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
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
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
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
