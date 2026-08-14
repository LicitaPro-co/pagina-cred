"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TasaInicial = {
  plazoDias: number;
  tasaInteresEa: number;
};

type Props = {
  tasas: TasaInicial[];
};

export default function FormularioTasasPlazo({
  tasas,
}: Props) {
  const router = useRouter();

  const [valores, setValores] =
    useState<Record<number, string>>(
      Object.fromEntries(
        tasas.map((tasa) => [
          tasa.plazoDias,
          String(tasa.tasaInteresEa),
        ]),
      ),
    );

  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [esError, setEsError] = useState(false);

  async function guardar() {
    setMensaje("");
    setEsError(false);

    if (!motivo.trim()) {
      mostrarError(
        "Debes explicar el motivo del cambio de tasas.",
      );
      return;
    }

    const tasasEnviar = tasas.map(
      (tasa) => ({
        plazoDias: tasa.plazoDias,
        tasaInteresEa: Number(
          valores[tasa.plazoDias],
        ),
      }),
    );

    for (const tasa of tasasEnviar) {
      if (
        !Number.isFinite(tasa.tasaInteresEa) ||
        tasa.tasaInteresEa < 0 ||
        tasa.tasaInteresEa > 100
      ) {
        mostrarError(
          `Revisa la tasa de ${tasa.plazoDias} días.`,
        );
        return;
      }
    }

    const ordenadas = [...tasasEnviar].sort(
      (a, b) => a.plazoDias - b.plazoDias,
    );

    for (
      let indice = 1;
      indice < ordenadas.length;
      indice += 1
    ) {
      if (
        ordenadas[indice].tasaInteresEa <
        ordenadas[indice - 1].tasaInteresEa
      ) {
        mostrarError(
          "La tasa no debe disminuir cuando aumenta el plazo.",
        );
        return;
      }
    }

    if (
      !window.confirm(
        "¿Confirmas el cambio de las tasas para nuevas solicitudes?",
      )
    ) {
      return;
    }

    setProcesando(true);

    try {
      const respuesta = await fetch(
        "/api/administrador/configuracion/tasas",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tasas: tasasEnviar,
            motivo: motivo.trim(),
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
            "No fue posible actualizar las tasas.",
        );
        return;
      }

      setMensaje(
        "Las tasas fueron actualizadas correctamente.",
      );
      setEsError(false);
      setMotivo("");
      setProcesando(false);

      router.refresh();
    } catch (error) {
      console.error(
        "Error guardando tasas:",
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
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          Tasas para nuevas operaciones
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-900">
          Tasas por plazo
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Define la tasa E.A. utilizada internamente
          para calcular nuevas solicitudes. Los
          créditos ya creados conservan sus
          condiciones originales.
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tasas.map((tasa) => (
          <label
            key={tasa.plazoDias}
            className="rounded-2xl bg-[#f7f8f5] p-4"
          >
            <span className="block text-sm font-black text-slate-900">
              {tasa.plazoDias} días
            </span>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={
                  valores[tasa.plazoDias] ?? ""
                }
                disabled={procesando}
                onChange={(event) =>
                  setValores(
                    (actual) => ({
                      ...actual,
                      [tasa.plazoDias]:
                        event.target.value,
                    }),
                  )
                }
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 font-bold text-slate-900 outline-none focus:border-emerald-600"
              />

              <span className="font-bold text-slate-500">
                %
              </span>
            </div>
          </label>
        ))}
      </div>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-bold text-slate-700">
          Motivo del cambio
        </span>

        <textarea
          value={motivo}
          disabled={procesando}
          onChange={(event) =>
            setMotivo(event.target.value)
          }
          rows={3}
          maxLength={500}
          placeholder="Ejemplo: actualización de política comercial y financiera."
          className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-emerald-600"
        />

        <p className="mt-1 text-right text-xs text-slate-400">
          {motivo.length}/500
        </p>
      </label>

      {mensaje ? (
        <p
          className={
            esError
              ? "mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800"
              : "mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
          }
        >
          {mensaje}
        </p>
      ) : null}

      <button
        type="button"
        disabled={procesando}
        onClick={guardar}
        className="mt-6 rounded-2xl bg-emerald-700 px-6 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
      >
        {procesando
          ? "Guardando tasas..."
          : "Guardar tasas"}
      </button>
    </article>
  );
}
