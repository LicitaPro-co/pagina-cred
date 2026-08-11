"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Accion =
  | "revisar"
  | "aprobar"
  | "rechazar"
  | "desembolsar";

type Props = {
  solicitudId: string;
  estadoInicial: string;
  observacionInicial?: string;
  referenciaInicial?: string;
};

export default function GestionarSolicitud({
  solicitudId,
  estadoInicial,
  observacionInicial = "",
  referenciaInicial = "",
}: Props) {
  const router = useRouter();

  const [estado, setEstado] = useState(estadoInicial);
  const [observacion, setObservacion] = useState(
    observacionInicial,
  );
  const [referencia, setReferencia] = useState(
    referenciaInicial,
  );
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<
    "exito" | "error"
  >("exito");

  async function ejecutar(accion: Accion) {
    if (
      accion === "rechazar" &&
      !observacion.trim()
    ) {
      mostrarError(
        "Escribe el motivo por el cual se rechaza la solicitud.",
      );
      return;
    }

    if (
      accion === "desembolsar" &&
      !referencia.trim()
    ) {
      mostrarError(
        "Escribe la referencia o número de transacción del desembolso.",
      );
      return;
    }

    const confirmaciones: Record<Accion, string> = {
      revisar:
        "¿Deseas pasar la solicitud al estado En revisión?",
      aprobar:
        "¿Confirmas la aprobación de esta solicitud?",
      rechazar:
        "¿Confirmas el rechazo de esta solicitud?",
      desembolsar:
        "¿Confirmas que el dinero ya fue transferido al cliente?",
    };

    if (!window.confirm(confirmaciones[accion])) {
      return;
    }

    setProcesando(true);
    setMensaje("");

    try {
      const respuesta = await fetch(
        `/api/administrador/solicitudes/${solicitudId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accion,
            observacion,
            referenciaDesembolso: referencia,
          }),
        },
      );

      const resultado = (await respuesta.json()) as {
        error?: string;
        registroId?: string;
      };

      if (!respuesta.ok) {
        mostrarError(
          resultado.error ??
            "No fue posible actualizar la solicitud.",
        );
        return;
      }

      const nuevosEstados: Record<Accion, string> = {
        revisar: "en_revision",
        aprobar: "aprobada",
        rechazar: "rechazada",
        desembolsar: "desembolsada",
      };

      setEstado(nuevosEstados[accion]);
      setTipoMensaje("exito");
      setMensaje("La operación se realizó correctamente.");
      setProcesando(false);

      router.refresh();
    } catch {
      mostrarError(
        "Ocurrió un error de comunicación con el servidor.",
      );
    }
  }

  function mostrarError(texto: string) {
    setTipoMensaje("error");
    setMensaje(texto);
    setProcesando(false);
  }

  const solicitudFinalizada = [
    "rechazada",
    "cancelada",
    "desembolsada",
  ].includes(estado);

  return (
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-7">
      <h2 className="text-xl font-black text-slate-900">
        Gestión de la solicitud
      </h2>

      <p className="mt-3 text-sm text-slate-600">
        Estado actual:{" "}
        <strong>{traducirEstado(estado)}</strong>
      </p>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Observación del analista
        </span>

        <textarea
          value={observacion}
          onChange={(event) =>
            setObservacion(event.target.value)
          }
          disabled={solicitudFinalizada}
          maxLength={1000}
          rows={5}
          placeholder="Registra observaciones, validaciones o el motivo del rechazo."
          className="w-full rounded-2xl border border-slate-200 p-4 text-slate-900 outline-none transition focus:border-emerald-600 disabled:bg-slate-100"
        />

        <p className="mt-1 text-right text-xs text-slate-400">
          {observacion.length}/1000
        </p>
      </label>

      {estado === "aprobada" ? (
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Referencia del desembolso
          </span>

          <input
            value={referencia}
            onChange={(event) =>
              setReferencia(event.target.value)
            }
            placeholder="Ejemplo: NEQUI-20260729-001"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-slate-900 outline-none transition focus:border-emerald-600"
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Registra el número de comprobante, transferencia o
            transacción antes de confirmar el desembolso.
          </p>
        </label>
      ) : null}

      {mensaje ? (
        <p
          className={
            tipoMensaje === "exito"
              ? "mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
              : "mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800"
          }
        >
          {mensaje}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {estado === "pendiente" ? (
          <button
            type="button"
            disabled={procesando}
            onClick={() => ejecutar("revisar")}
            className="rounded-2xl border border-blue-600 px-5 py-3 font-bold text-blue-700 disabled:opacity-60"
          >
            Pasar a revisión
          </button>
        ) : null}

        {["pendiente", "en_revision"].includes(estado) ? (
          <>
            <button
              type="button"
              disabled={procesando}
              onClick={() => ejecutar("aprobar")}
              className="rounded-2xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {procesando ? "Procesando..." : "Aprobar"}
            </button>

            <button
              type="button"
              disabled={procesando}
              onClick={() => ejecutar("rechazar")}
              className="rounded-2xl bg-rose-700 px-5 py-3 font-bold text-white transition hover:bg-rose-800 disabled:opacity-60"
            >
              Rechazar
            </button>
          </>
        ) : null}

        {estado === "aprobada" ? (
          <button
            type="button"
            disabled={procesando}
            onClick={() => ejecutar("desembolsar")}
            className="sm:col-span-2 rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {procesando
              ? "Registrando desembolso..."
              : "Confirmar desembolso"}
          </button>
        ) : null}
      </div>

      {solicitudFinalizada ? (
        <p className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
          Esta solicitud ya se encuentra finalizada y no
          admite nuevas acciones.
        </p>
      ) : null}
    </article>
  );
}

function traducirEstado(estado: string) {
  const estados: Record<string, string> = {
    pendiente: "Pendiente",
    en_revision: "En revisión",
    aprobada: "Aprobada",
    rechazada: "Rechazada",
    cancelada: "Cancelada",
    desembolsada: "Desembolsada",
  };

  return estados[estado] ?? estado;
}
