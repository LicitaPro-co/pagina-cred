import Link from "next/link";

export default function AdministradorPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
          Página Cred · Panel administrativo
        </p>

        <h1 className="mt-3 text-4xl font-black text-slate-900">
          Administración
        </h1>

        <p className="mt-3 text-slate-600">
          Accede a los módulos principales de la operación.
        </p>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Modulo
            href="/administrador/clientes"
            titulo="Clientes"
            descripcion="Perfiles, cupos, niveles y comportamiento."
          />

          <Modulo
            href="/administrador/solicitudes"
            titulo="Solicitudes"
            descripcion="Revisión, aprobación, rechazo y desembolso."
          />

          <Modulo
            href="/administrador/creditos"
            titulo="Créditos"
            descripcion="Saldos, pagos y estados."
          />

          <Modulo
            href="/administrador/usuarios"
            titulo="Usuarios"
            descripcion="Roles y accesos administrativos."
          />
        </section>
      </div>
    </main>
  );
}

function Modulo({
  href,
  titulo,
  descripcion,
}: {
  href: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[26px] border border-[#eadfce] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
    >
      <h2 className="text-xl font-black text-slate-900">
        {titulo}
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {descripcion}
      </p>

      <p className="mt-5 font-bold text-emerald-700">
        Abrir →
      </p>
    </Link>
  );
}
