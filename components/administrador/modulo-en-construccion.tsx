import Link from "next/link";

type Props = {
  categoria: string;
  titulo: string;
  descripcion: string;
};

export default function ModuloEnConstruccion({
  categoria,
  titulo,
  descripcion,
}: Props) {
  return (
    <main className="min-h-screen px-5 py-9 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-4xl rounded-[32px] border border-[#eadfce] bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
          Página Cred · {categoria}
        </p>

        <h1 className="mt-4 text-3xl font-black text-slate-900">
          {titulo}
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          {descripcion}
        </p>

        <div className="mt-8 rounded-2xl bg-[#f7f8f5] p-5 text-sm leading-6 text-slate-600">
          La estructura del módulo ya está disponible. Sus
          consultas, filtros y acciones se incorporarán sobre
          el motor financiero que actualmente está funcionando.
        </div>

        <Link
          href="/administrador"
          className="mt-8 inline-flex rounded-2xl bg-emerald-700 px-6 py-3.5 font-bold text-white"
        >
          Volver al resumen
        </Link>
      </section>
    </main>
  );
}
