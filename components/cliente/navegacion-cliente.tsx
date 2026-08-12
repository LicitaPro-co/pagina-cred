"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import BotonCerrarSesion from "@/components/auth/boton-cerrar-sesion";

const OPCIONES = [
  {
    href: "/cliente",
    etiqueta: "Resumen",
    exacta: true,
  },
  {
    href: "/cliente/creditos",
    etiqueta: "Mis créditos",
  },
  {
    href: "/cliente/solicitudes",
    etiqueta: "Mis solicitudes",
  },
  {
    href: "/cliente/solicitar",
    etiqueta: "Solicitar crédito",
  },
  {
    href: "/cliente/perfil",
    etiqueta: "Mi perfil",
  },
];

export default function NavegacionCliente() {
  const pathname = usePathname();

  function activa(
    opcion: (typeof OPCIONES)[number],
  ) {
    if (opcion.exacta) {
      return pathname === opcion.href;
    }

    return (
      pathname === opcion.href ||
      pathname.startsWith(
        `${opcion.href}/`,
      )
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#eadfce] bg-white lg:flex lg:flex-col">
      <div className="border-b border-[#eadfce] px-6 py-7">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
          Página Cred
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-900">
          Mi cuenta
        </h2>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {OPCIONES.map((opcion) => {
          const seleccionada =
            activa(opcion);

          return (
            <Link
              key={opcion.href}
              href={opcion.href}
              className={
                seleccionada
                  ? "block rounded-2xl bg-emerald-700 px-4 py-3 font-bold text-white"
                  : "block rounded-2xl px-4 py-3 font-semibold text-slate-600 transition hover:bg-[#f7f8f5] hover:text-slate-900"
              }
            >
              {opcion.etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#eadfce] p-4">
        <BotonCerrarSesion />
      </div>
    </aside>
  );
}
