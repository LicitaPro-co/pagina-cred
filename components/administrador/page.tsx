import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdministradorPage() {
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
      nombres,
      apellidos,
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

  const [
    pendientesResultado,
    revisionResultado,
    aprobadasResultado,
    activosResultado,
  ] = await Promise.all([
    supabase
      .from("solicitudes_credito")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("estado", "pendiente"),

    supabase
      .from("solicitudes_credito")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("estado", "en_revision"),

    supabase
      .from("solicitudes_credito")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("estado", "aprobada"),

    supabase
      .from("creditos")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("estado", "activo"),
  ]);

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-9">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
              Página Cred · Administración
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Hola, {administrador.nombres || "Administrador"}
            </h1>

            <p className="mt-2 text-slate-600">
              Revisa solicitudes, aprueba créditos y registra desembolsos.
            </p>
          </div>

          <Link
            href="/administrador/solicitudes"
            className="w-fit rounded-2xl bg-emerald-700 px-6 py-3 font-bold text-white transition hover:bg-emerald-800"
          >
            Gestionar solicitudes
          </Link>
        </header>

        <section className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador
            titulo="Solicitudes pendientes"
            valor={pendientesResultado.count ?? 0}
          />

          <Indicador
            titulo="En revisión"
            valor={revisionResultado.count ?? 0}
          />

          <Indicador
            titulo="Aprobadas por desembolsar"
            valor={aprobadasResultado.count ?? 0}
          />

          <Indicador
            titulo="Créditos activos"
            valor={activosResultado.count ?? 0}
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <Opcion
            titulo="Solicitudes"
            descripcion="Consulta las solicitudes nuevas y revisa la información del cliente."
            enlace="/administrador/solicitudes"
            textoEnlace="Abrir solicitudes"
          />

          <Opcion
            titulo="Créditos"
            descripcion="Consulta créditos aprobados, desembolsados y activos."
            enlace="/administrador/creditos"
            textoEnlace="Próximo módulo"
            deshabilitado
          />

          <Opcion
            titulo="Clientes"
            descripcion="Consulta perfiles, cupos, niveles e historial de comportamiento."
            enlace="/administrador/clientes"
            textoEnlace="Próximo módulo"
            deshabilitado
          />
        </section>
      </div>
    </main>
  );
}

function Indicador({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <article className="rounded-[26px] border border-[#eadfce] bg-white p-6">
      <p className="text-sm font-semibold text-slate-500">
        {titulo}
      </p>

      <p className="mt-3 text-4xl font-black text-slate-900">
        {valor}
      </p>
    </article>
  );
}

function Opcion({
  titulo,
  descripcion,
  enlace,
  textoEnlace,
  deshabilitado = false,
}: {
  titulo: string;
  descripcion: string;
  enlace: string;
  textoEnlace: string;
  deshabilitado?: boolean;
}) {
  return (
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-7">
      <h2 className="text-xl font-black text-slate-900">
        {titulo}
      </h2>

      <p className="mt-3 min-h-20 leading-7 text-slate-600">
        {descripcion}
      </p>

      {deshabilitado ? (
        <span className="mt-6 inline-block rounded-2xl bg-slate-100 px-5 py-3 font-bold text-slate-400">
          {textoEnlace}
        </span>
      ) : (
        <Link
          href={enlace}
          className="mt-6 inline-block rounded-2xl border border-emerald-700 px-5 py-3 font-bold text-emerald-700"
        >
          {textoEnlace}
        </Link>
      )}
    </article>
  );
}
