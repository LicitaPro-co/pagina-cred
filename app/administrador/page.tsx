import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdministradorPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
            Página Cred · Panel administrativo
          </p>

          <h1 className="mt-3 text-4xl font-black text-slate-900">
            Administración
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Gestiona clientes, solicitudes, créditos,
            cartera, tesorería y reportes desde un solo lugar.
          </p>
        </header>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Modulo
            href="/administrador/clientes"
            titulo="Clientes"
            descripcion="Consulta perfiles, cupos, niveles, estados y comportamiento de los clientes."
          />

          <Modulo
            href="/administrador/solicitudes"
            titulo="Solicitudes"
            descripcion="Revisa, aprueba, rechaza y gestiona el desembolso de nuevas solicitudes."
          />

          <Modulo
            href="/administrador/creditos"
            titulo="Créditos"
            descripcion="Consulta créditos, saldos, vencimientos, pagos y estado de las obligaciones."
          />

          <Modulo
            href="/administrador/cartera"
            titulo="Cartera"
            descripcion="Realiza seguimiento a obligaciones activas, vencimientos y gestión de cobranza."
          />

          <Modulo
            href="/administrador/tesoreria"
            titulo="Tesorería"
            descripcion="Consulta desembolsos, recaudos y movimientos relacionados con la operación."
          />

          <Modulo
            href="/administrador/reportes"
            titulo="Reportes"
            descripcion="Consulta indicadores y genera información consolidada de la operación."
          />

          <Modulo
            href="/administrador/configuracion"
            titulo="Configuración"
            descripcion="Administra parámetros generales y condiciones operativas de Página Cred."
          />
        </section>

        <section className="mt-8 rounded-[28px] border border-[#eadfce] bg-white p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Seguridad
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-900">
            Administración protegida
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Utiliza el botón <strong>Cerrar sesión</strong> de la
            barra administrativa cuando termines de trabajar.
            El acceso al panel requiere una sesión administrativa
            válida.
          </p>
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
      className="group rounded-[26px] border border-[#eadfce] bg-white p-6 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            {titulo}
          </h2>

          <p className="mt-3 leading-7 text-slate-600">
            {descripcion}
          </p>
        </div>

        <span className="text-xl font-black text-emerald-700 transition group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}
