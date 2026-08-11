"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Accion =
  | "activar"
  | "bloquear"
  | "desbloquear"
  | "cambiar_cupo"
  | "cambiar_nivel";

type Props = {
  clienteId: string;
  estadoInicial: string;
  cupoInicial: number;
  nivelInicial: number;
};

export default function GestionarCliente({
  clienteId,
  estadoInicial,
  cupoInicial,
  nivelInicial,
}: Props) {
  const router = useRouter();

  const [estado, setEstado] = useState(
    estadoInicial.toLowerCase(),
  );

  const [cupo, setCupo] = useState(
    String(Math.round(cupoInicial)),
  );

  const [nivel, setNivel] = useState(
    String(nivelInicial),
  );

  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [esError, setEsError] = useState(false);

  async function ejecutar(accion: Accion) {
    const motivoLimpio = motivo.trim();

    if (!motivoLimpio) {
      mostrarError(
        "Debes registrar el motivo de la acción.",
      );
      return;
    }

    if (accion === "cambiar_cupo") {
      const nuevoCupo = Number(cupo);

      if (
        !Number.isFinite(nuevoCupo) ||
        nuevoCupo < 0
      ) {
        mostrarError(
          "Ingresa un cupo válido.",
        );
        return;
      }
    }

    if (accion === "cambiar_nivel") {
      const nuevoNivel = Number(nivel);

      if (
        !Number.isInteger(nuevoNivel) ||
        nuevoNivel < 1
      ) {
        mostrarError(
          "Selecciona un nivel válido.",
        );
        return;
      }
    }

    const confirmaciones: Record<
      Accion,
      string
    > = {
      activar:
        "¿Confirmas la activación de este cliente?",
      bloquear:
        "¿Confirmas el bloqueo del cliente?",
      desbloquear:
        "¿Confirmas que deseas habilitar nuevamente al cliente?",
      cambiar_cupo:
        "¿Confirmas el cambio manual de cupo?",
      cambiar_nivel:
        "¿Confirmas el cambio manual de nivel?",
    };

    if (!window.confirm(confirmaciones[accion])) {
      return;
    }

    setProcesando(true);
    setMensaje("");
    setEsError(false);

    try {
      const respuesta = await fetch(
        `/api/administrador/clientes/${clienteId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accion,
            motivo: motivoLimpio,
            nuevoCupo:
              accion === "cambiar_cupo"
                ? Number(cupo)
                : undefined,
            nuevoNivel:
              accion === "cambiar_nivel"
                ? Number(nivel)
                : undefined,
          }),
        },
      );

      const resultado =
        (await respuesta.json()) as {
          error?: string;
          ajusteId?: string;
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

      if (accion === "desbloquear") {
        setEstado("activo");
      }

      setMensaje(
        obtenerMensajeExito(accion),
      );
      setEsError(false);
      setMotivo("");
      setProcesando(false);

      router.refresh();
    } catch (error) {
      console.error(
        "Error gestionando cliente:",
        error,
      );

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
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-7">
      <h2 className="text-xl font-black text-slate-900">
        Gestión administrativa
      </h2>

      <p className="mt-3 text-sm text-slate-600">
        Estado actual:{" "}
        <strong className="capitalize">
          {traducirEstado(estado)}
        </strong>
      </p>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-bold text-slate-700">
          Motivo de la acción
        </span>

        <textarea
          value={motivo}
          onChange={(event) =>
            setMotivo(event.target.value)
          }
          rows={4}
          maxLength={500}
          disabled={procesando}
          placeholder="Registra una justificación clara."
          className="w-full rounded-2xl border border-slate-200 p-4 outline-none transition focus:border-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <p className="mt-1 text-right text-xs text-slate-400">
          {motivo.length}/500
        </p>
      </label>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Cupo
            </span>

            <input
              type="number"
              min="0"
              step="1000"
              value={cupo}
              disabled={procesando}
              onChange={(event) =>
                setCupo(event.target.value)
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>

          <button
            type="button"
            disabled={procesando}
            onClick={() =>
              ejecutar("cambiar_cupo")
            }
            className="mt-3 w-full rounded-xl border border-emerald-700 px-4 py-3 font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando
              ? "Procesando..."
              : "Actualizar cupo"}
          </button>
        </div>

        <div>
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Nivel
            </span>

            <select
              value={nivel}
              disabled={procesando}
              onChange={(event) =>
                setNivel(event.target.value)
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none transition focus:border-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {[1, 2, 3, 4, 5].map(
                (numero) => (
                  <option
                    key={numero}
                    value={numero}
                  >
                    Nivel {numero}
                  </option>
                ),
              )}
            </select>
          </label>

          <button
            type="button"
            disabled={procesando}
            onClick={() =>
              ejecutar("cambiar_nivel")
            }
            className="mt-3 w-full rounded-xl border border-emerald-700 px-4 py-3 font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando
              ? "Procesando..."
              : "Actualizar nivel"}
          </button>
        </div>
      </div>

      <div className="mt-5">
        {["pendiente", "inactivo"].includes(
          estado,
        ) ? (
          <button
            type="button"
            disabled={procesando}
            onClick={() => ejecutar("activar")}
            className="w-full rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando
              ? "Procesando..."
              : "Activar cliente"}
          </button>
        ) : estado === "bloqueado" ? (
          <button
            type="button"
            disabled={procesando}
            onClick={() =>
              ejecutar("desbloquear")
            }
            className="w-full rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando
              ? "Procesando..."
              : "Desbloquear cliente"}
          </button>
        ) : (
          <button
            type="button"
            disabled={procesando}
            onClick={() => ejecutar("bloquear")}
            className="w-full rounded-2xl bg-rose-700 px-5 py-4 font-bold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando
              ? "Procesando..."
              : "Bloquear cliente"}
          </button>
        )}
      </div>

      {mensaje ? (
        <p
          className={
            esError
              ? "mt-5 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-800"
              : "mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
          }
        >
          {mensaje}
        </p>
      ) : null}
    </article>
  );
}

function obtenerMensajeExito(
  accion: Accion,
) {
  const mensajes: Record<Accion, string> = {
    activar:
      "El cliente fue activado correctamente.",
    bloquear:
      "El cliente fue bloqueado correctamente.",
    desbloquear:
      "El cliente fue desbloqueado correctamente.",
    cambiar_cupo:
      "El cupo fue actualizado correctamente.",
    cambiar_nivel:
      "El nivel fue actualizado correctamente.",
  };

  return mensajes[accion];
}

function traducirEstado(
  estado: string,
) {
  const estados: Record<string, string> = {
    pendiente: "Pendiente",
    activo: "Activo",
    bloqueado: "Bloqueado",
    inactivo: "Inactivo",
  };

  return estados[estado] ?? estado;
}
