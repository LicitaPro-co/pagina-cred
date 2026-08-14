import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
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
    data: registros,
    error: errorAuditoria,
  } = await supabase
    .from("auditoria_acciones")
    .select(`
      id,
      usuario_id,
      accion,
      entidad,
      entidad_id,
      descripcion,
      datos_anteriores,
      datos_nuevos,
      creado_en,
      perfiles:usuario_id (
        nombres,
        apellidos,
        correo
      )
    `)
    .order("creado_en", {
      ascending: false,
    })
    .limit(100);

  if (errorAuditoria) {
    console.error(
      "Error consultando auditoría:",
      errorAuditoria,
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
            Página Cred · Administración
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
            Auditoría
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Consulta las acciones administrativas realizadas
            dentro de Página Cred, incluyendo cambios de tasas,
            niveles, configuración y demás operaciones auditadas.
          </p>
        </header>

        <section className="mt-8 rounded-[28px] border border-[#eadfce] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-100 bg-[#f7f8f5]">
                <tr>
                  <Encabezado>Fecha</Encabezado>
                  <Encabezado>Usuario</Encabezado>
                  <Encabezado>Acción</Encabezado>
                  <Encabezado>Entidad</Encabezado>
                  <Encabezado>Motivo</Encabezado>
                  <Encabezado>Detalle</Encabezado>
                </tr>
              </thead>

              <tbody>
                {(registros ?? []).map((registro) => {
                  const perfil = Array.isArray(
                    registro.perfiles,
                  )
                    ? registro.perfiles[0]
                    : registro.perfiles;

                  const usuario = perfil
                    ? [
                        perfil.nombres,
                        perfil.apellidos,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                      perfil.correo ||
                      "Usuario"
                    : registro.usuario_id
                      ? "Usuario registrado"
                      : "Sistema";

                  return (
                    <tr
                      key={registro.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <Celda>
                        {formatearFechaHora(
                          registro.creado_en,
                        )}
                      </Celda>

                      <Celda>
                        <span className="font-bold text-slate-900">
                          {usuario}
                        </span>
                      </Celda>

                      <Celda>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          {formatearTexto(
                            registro.accion,
                          )}
                        </span>
                      </Celda>

                      <Celda>
                        {formatearTexto(
                          registro.entidad,
                        )}
                      </Celda>

                      <Celda>
                        {registro.descripcion ??
                          "Sin descripción"}
                      </Celda>

                      <Celda>
                        <details>
                          <summary className="cursor-pointer font-bold text-emerald-700">
                            Ver cambios
                          </summary>

                          <div className="mt-3 grid min-w-[520px] gap-3 md:grid-cols-2">
                            <BloqueJson
                              titulo="Antes"
                              valor={
                                registro.datos_anteriores
                              }
                            />

                            <BloqueJson
                              titulo="Después"
                              valor={
                                registro.datos_nuevos
                              }
                            />
                          </div>
                        </details>
                      </Celda>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(registros ?? []).length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No existen registros de auditoría.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Encabezado({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function Celda({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="px-5 py-4 align-top text-sm text-slate-600">
      {children}
    </td>
  );
}

function BloqueJson({
  titulo,
  valor,
}: {
  titulo: string;
  valor: unknown;
}) {
  return (
    <div className="rounded-2xl bg-[#f7f8f5] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {titulo}
      </p>

      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
        {JSON.stringify(
          valor ?? null,
          null,
          2,
        )}
      </pre>
    </div>
  );
}

function formatearTexto(valor: string | null) {
  if (!valor) {
    return "No registrado";
  }

  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) =>
      letra.toUpperCase(),
    );
}

function formatearFechaHora(valor: string | null) {
  if (!valor) {
    return "No registrada";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(valor));
}
