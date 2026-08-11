"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Accion =
  | "activar"
  | "bloquear"
  | "desactivar"
  | "cambiar_rol";

type Props = {
  usuarioId: string;
  usuarioActualId: string;
  estadoInicial: string;
  rolInicial: string;
};

export default function GestionarUsuario({
  usuarioId,
  usuarioActualId,
  estadoInicial,
  rolInicial,
}: Props) {
  const router = useRouter();

  const [estado, setEstado] = useState(
    estadoInicial.toLowerCase(),
  );

  const [rol, setRol] = useState(rolInicial);
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [esError, setEsError] = useState(false);

  const esUsuarioActual =
    usuarioId === usuarioActualId;

  async function ejecutar(accion: Accion) {
    const motivoLimpio = motivo.trim();

    if (!motivoLimpio) {
      mostrarError(
        "Debes registrar el motivo de la acción.",
      );
      return;
    }

    const confirmaciones: Record<Accion, string> = {
      activar:
        "¿Confirmas la activación del usuario?",
      bloquear:
        "¿Confirmas el bloqueo del usuario?",
      desactivar:
        "¿Confirmas la desactivación del usuario?",
      cambiar_rol:
        "¿Confirmas el cambio de rol administrativo?",
    };

    if (!window.confirm(confirmaciones[accion])) {
      return;
    }

    setProcesando(true);
    setMensaje("");
    setEsError(false);

    try {
      const respuesta = await fetch(
        `/api/administrador/usuarios/${usuarioId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accion,
            motivo: motivoLimpio,
            nuevoRol:
              accion === "cambiar_rol"
                ? rol
                : undefined,
          }),
        },
      );

      const resultado =
        (await respuesta.json()) as {
          error?: string;
        };

      if (!respuesta.ok) {
        mostrarError(
          resultado.error ??
            "No fue posible realizar la acción.",
        );
        return;
      }

      if (accion === "activar") {
        setEstado("activo");
      }

      if (accion === "bloquear") {
        setEstado("bloqueado");
      }

      if (accion === "desactivar") {
        setEstado("inactivo");
      }

      setMensaje(
        "La acción se realizó correctamente.",
      );
      setMotivo("");
      setProcesando(false);

      router.refresh();
    } catch {
      mostrarError(
        "No fue posible comunicarse con el servidor.",
      );
    }
  }

  function mostrarError(texto: string) {
    setMensaje(texto);
    setEsError(true);
    setProcesando(false);
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">
          Rol administrativo
        </span>

        <select
          value={rol}
          disabled={procesando}
          onChange={(event) =>
            setRol(event.target.value)
          }
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-600"
        >
          <option value="analista">
            Analista
          </option>

          <option value="administrador">
            Administrador
          </option>

          <option value="superadministrador">
            Superadministrador
          </option>
        </select>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">
          Motivo
        </span>

        <textarea
          value={motivo}
          disabled={procesando}
          onChange={(event) =>
            setMotivo(event.target.value)
          }
          rows={3}
          maxLength={500}
          placeholder="Registra la justificación."
          className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-emerald-600"
        />
      </label>

      <button
        type="button"
        disabled={procesando}
        onClick={() => ejecutar("cambiar_rol")}
        className="w-full rounded-xl border border-emerald-700 px-4 py-3 font-bold text-emerald-700 disabled:opacity-50"
      >
        Actualizar rol
      </button>

      {!esUsuarioActual ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {estado !== "activo" ? (
            <button
              type="button"
              disabled={procesando}
              onClick={() => ejecutar("activar")}
              className="rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              Activar
            </button>
          ) : (
            <button
              type="button"
              disabled={procesando}
              onClick={() => ejecutar("bloquear")}
              className="rounded-xl bg-rose-700 px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              Bloquear
            </button>
          )}

          <button
            type="button"
            disabled={procesando}
            onClick={() => ejecutar("desactivar")}
            className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 disabled:opacity-50"
          >
            Desactivar
          </button>
        </div>
      ) : (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          Este es tu usuario actual. No puedes bloquearlo ni
          desactivarlo desde esta pantalla.
        </p>
      )}

      {mensaje ? (
        <p
          className={
            esError
              ? "rounded-2xl bg-rose-50 p-4 text-sm text-rose-800"
              : "rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
          }
        >
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
