import Link from "next/link";

interface ClientPageProps {
  perfil: {
    perfil_completo: boolean;
  };
}

export default function ClientPage({ perfil }: ClientPageProps) {
  return (
    <Link
      href={perfil.perfil_completo ? "/cliente/solicitar" : "/cliente/perfil"}
      className="mt-7 inline-block rounded-2xl bg-emerald-700 px-7 py-4 font-bold text-white transition hover:bg-emerald-800"
    >
      {perfil.perfil_completo
        ? "Solicitar crédito"
        : "Completar perfil para solicitar"}
    </Link>
  );
}

