"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Props = {
  nombreAdministrador: string;
  rolAdministrador: string;
};

const OPCIONES = [
  {
    href: "/administrador",
    etiqueta: "Resumen",
    icono: "▦",
    exacta: true,
  },
  {
    href: "/administrador/clientes",
    etiqueta: "Clientes",
    icono: "♙",
  },
  {
    href: "/administrador/solicitudes",
    etiqueta: "Solicitudes",
    icono: "▤",
  },
  {
    href: "/administrador/creditos",
    etiqueta: "Créditos",
    icono: "₿",
  },
  {
    href: "/administrador/cartera",
    etiqueta: "Cartera",
    icono: "◫",
  },
  {
    href: "/administrador/tesoreria",
    etiqueta: "Tesorería",
    icono: "↔",
  },
  {
    href: "/administrador/reportes",
    etiqueta: "Reportes",
    icono: "▥",
  },
  {
    href: "/administrador/configuracion",
    etiqueta: "Configuración",
    icono: "⚙",
  },
];

export default function NavegacionAdministrativa({
  nombreAdministrador,
  rolAdministrador,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  function estaActiva(opcion: (typeof OPCIONES)[number]) {
    if (opcion.exacta) {
      return pathname === opcion.href;
    }

    return pathname === opcion.href ||
      pathname.startsWith(`${opcion.href}/`);
  }

  async function cerrarSesion() {
    setCerrandoSesion(true);

    await supabase.auth.signOut();

    router.replace("/iniciar-sesion");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#eadfce] bg-[#fff8ee]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              Página Cred
            </p>

            <p className="mt-1 font-black text-slate-900">
              Administración
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMenuAbierto((actual) => !actual)}
            className="rounded-xl border border-[#eadfce] bg-white px-4 py-2 font-bold text-slate-700"
            aria-expanded={menuAbierto}
          >
            {menuAbierto ? "Cerrar" : "Menú"}
          </button>
        </div>

        {menuAbierto ? (
          <nav className="mt-4 space-y-2 rounded-2xl border border-[#eadfce] bg-white p-3 shadow-lg">
            {OPCIONES.map((opcion) => {
              const activa = estaActiva(opcion);

              return (
                <Link
                  key={opcion.href}
                  href={opcion.href}
                  onClick={() => setMenuAbierto(false)}
                  className={
                    activa
                      ? "flex items-center gap-3 rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white"
                      : "flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-slate-600 hover:bg-[#f7f8f5]"
                  }
                >
                  <span aria-hidden>{opcion.icono}</span>
                  {opcion.etiqueta}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-[#eadfce] bg-white lg:flex lg:flex-col">
        <div className="border-b border-[#eadfce] px-7 py-7">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-700">
            Página Cred
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-900">
            Administración
          </h2>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-5">
          {OPCIONES.map((opcion) => {
            const activa = estaActiva(opcion);

            return (
              <Link
                key={opcion.href}
                href={opcion.href}
                className={
                  activa
                    ? "flex items-center gap-4 rounded-2xl bg-emerald-700 px-4 py-3.5 font-bold text-white shadow-sm"
                    : "flex items-center gap-4 rounded-2xl px-4 py-3.5 font-semibold text-slate-600 transition hover:bg-[#f7f8f5] hover:text-slate-900"
                }
              >
                <span
                  className={
                    activa
                      ? "flex h-8 w-8 items-center justify-center rounded-xl bg-white/15"
                      : "flex h-8 w-8 items-center justify-center rounded-xl bg-[#f7f8f5]"
                  }
                  aria-hidden
                >
                  {opcion.icono}
                </span>

                {opcion.etiqueta}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#eadfce] p-5">
          <div className="rounded-2xl bg-[#f7f8f5] p-4">
            <p className="font-black text-slate-900">
              {nombreAdministrador}
            </p>

            <p className="mt-1 text-xs font-semibold capitalize text-slate-500">
              {traducirRol(rolAdministrador)}
            </p>

            <button
              type="button"
              disabled={cerrandoSesion}
              onClick={cerrarSesion}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:opacity-60"
            >
              {cerrandoSesion ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function traducirRol(rol: string) {
  const roles: Record<string, string> = {
    analista: "Analista",
    administrador: "Administrador",
    superadministrador: "Superadministrador",
  };

  return roles[rol] ?? rol;
}
