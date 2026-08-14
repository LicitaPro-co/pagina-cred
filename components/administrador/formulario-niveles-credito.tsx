"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type NivelInicial = {
  numeroNivel: number;
  nombre: string;
  montoMaximo: number;
  incrementoMonto: number;
  creditosRequeridos: number;
  puntajeMinimo: number;
  activo: boolean;
};

type Props = {
  niveles: NivelInicial[];
};

export default function FormularioNivelesCredito({
  niveles,
}: Props) {
  const router = useRouter();

  const [valores, setValores] =
    useState<NivelInicial[]>(niveles);

  const [motivo, setMotivo] =
    useState("");

  const [procesando, setProcesando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [esError, setEsError] =
    useState(false);

  function actualizar(
    numeroNivel: number,
    campo: keyof NivelInicial,
    valor: string | boolean,
  ) {
    setValores((actuales) =>
      actuales.map((nivel) => {
        if (
          nivel.numeroNivel !==
          numeroNivel
        ) {
          return nivel;
        }

        if (
          campo === "nombre" ||
          campo === "activo"
        ) {
          return {
            ...nivel,
            [campo]: valor,
          };
        }

        return {
          ...nivel,
          [campo]: Number(valor),
        };
      }),
    );
  }

  async function guardar() {
    setMensaje("");
    setEsError(false);

    if (!motivo.trim()) {
      mostrarError(
        "Debes explicar el motivo del cambio de niveles.",
      );
      return;
    }

    const ordenados = [
      ...valores,
    ].sort(
      (a, b) =>
        a.numeroNivel -
        b.numeroNivel,
    );

    for (const nivel of ordenados) {
      if (!nivel.nombre.trim()) {
        mostrarError(
          `Escribe el nombre del Nivel ${nivel.numeroNivel}.`,
        );
        return;
      }

      if (
        !Number.isFinite(
          nivel.montoMaximo,
        ) ||
        nivel.montoMaximo <
          20000 ||
        nivel.montoMaximo >
          150000
      ) {
        mostrarError(
          `Revisa el cupo del Nivel ${nivel.numeroNivel}.`,
        );
        return;
      }

      if (
        !Number.isFinite(
          nivel.incrementoMonto,
        ) ||
        nivel.incrementoMonto <
          1000
      ) {
        mostrarError(
          `Revisa el incremento del Nivel ${nivel.numeroNivel}.`,
        );
        return;
      }

      if (
        !Number.isInteger(
          nivel.creditosRequeridos,
        ) ||
        nivel.creditosRequeridos <
          0
      ) {
        mostrarError(
          `Revisa los créditos requeridos del Nivel ${nivel.numeroNivel}.`,
        );
        return;
      }

      if (
        !Number.isInteger(
          nivel.puntajeMinimo,
        ) ||
        nivel.puntajeMinimo < 0
      ) {
        mostrarError(
          `Revisa el puntaje del Nivel ${nivel.numeroNivel}.`,
        );
        return;
      }
    }

    for (
      let i = 1;
      i < ordenados.length;
      i += 1
    ) {
      const anterior =
        ordenados[i - 1];

      const actual =
        ordenados[i];

      if (
        actual.montoMaximo <=
        anterior.montoMaximo
      ) {
        mostrarError(
          `El cupo del Nivel ${actual.numeroNivel} debe ser superior al Nivel ${anterior.numeroNivel}.`,
        );
        return;
      }

      if (
        actual.creditosRequeridos <
        anterior.creditosRequeridos
      ) {
        mostrarError(
          "Los créditos requeridos no pueden disminuir al subir de nivel.",
        );
        return;
      }

      if (
        actual.puntajeMinimo <
        anterior.puntajeMinimo
      ) {
        mostrarError(
          "El puntaje mínimo no puede disminuir al subir de nivel.",
        );
        return;
      }
    }

    if (
      !window.confirm(
        "¿Confirmas la actualización de la matriz de niveles?",
      )
    ) {
      return;
    }

    setProcesando(true);

    try {
      const respuesta = await fetch(
        "/api/administrador/configuracion/niveles",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            niveles: valores,
            motivo:
              motivo.trim(),
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
            "No fue posible actualizar los niveles.",
        );
        return;
      }

      setMensaje(
        "Los niveles fueron actualizados correctamente.",
      );

      setEsError(false);
      setMotivo("");
      setProcesando(false);

      router.refresh();
    } catch (error) {
      console.error(
        "Error actualizando niveles:",
        error,
      );

      mostrarError(
        "No fue posible comunicarse con el servidor.",
      );
    }
  }

  function mostrarError(
    texto: string,
  ) {
    setMensaje(texto);
    setEsError(true);
    setProcesando(false);
  }

  return (
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-7">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          Escalera de crecimiento
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-900">
          Niveles de crédito
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Define el cupo y los requisitos
          necesarios para avanzar entre los
          niveles de Página Cred.
        </p>
      </div>

      <div className="mt-7 space-y-4">
        {valores.map((nivel) => (
          <section
            key={nivel.numeroNivel}
            className="rounded-2xl border border-slate-100 bg-[#f7f8f5] p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-40">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Nivel{" "}
                  {nivel.numeroNivel}
                </p>

                <input
                  value={nivel.nombre}
                  disabled={procesando}
                  onChange={(event) =>
                    actualizar(
                      nivel.numeroNivel,
                      "nombre",
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900"
                />
              </div>

              <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Campo
                  etiqueta="Cupo máximo"
                  valor={
                    nivel.montoMaximo
                  }
                  paso={10000}
                  cambiar={(valor) =>
                    actualizar(
                      nivel.numeroNivel,
                      "montoMaximo",
                      valor,
                    )
                  }
                />

                <Campo
                  etiqueta="Incremento"
                  valor={
                    nivel.incrementoMonto
                  }
                  paso={1000}
                  cambiar={(valor) =>
                    actualizar(
                      nivel.numeroNivel,
                      "incrementoMonto",
                      valor,
                    )
                  }
                />

                <Campo
                  etiqueta="Créditos requeridos"
                  valor={
                    nivel.creditosRequeridos
                  }
                  paso={1}
                  cambiar={(valor) =>
                    actualizar(
                      nivel.numeroNivel,
                      "creditosRequeridos",
                      valor,
                    )
                  }
                />

                <Campo
                  etiqueta="Puntaje mínimo"
                  valor={
                    nivel.puntajeMinimo
                  }
                  paso={10}
                  cambiar={(valor) =>
                    actualizar(
                      nivel.numeroNivel,
                      "puntajeMinimo",
                      valor,
                    )
                  }
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={nivel.activo}
                  disabled={
                    procesando ||
                    nivel.numeroNivel === 1
                  }
                  onChange={(event) =>
                    actualizar(
                      nivel.numeroNivel,
                      "activo",
                      event.target.checked,
                    )
                  }
                  className="h-5 w-5 accent-emerald-700"
                />

                <span className="text-sm font-bold text-slate-700">
                  Activo
                </span>
              </label>
            </div>
          </section>
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
            setMotivo(
              event.target.value,
            )
          }
          maxLength={500}
          rows={3}
          placeholder="Ejemplo: ajuste de política de cupos y progresión."
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
        className="mt-6 rounded-2xl bg-emerald-700 px-6 py-4 font-bold text-white disabled:opacity-50"
      >
        {procesando
          ? "Guardando niveles..."
          : "Guardar niveles"}
      </button>
    </article>
  );
}

function Campo({
  etiqueta,
  valor,
  paso,
  cambiar,
}: {
  etiqueta: string;
  valor: number;
  paso: number;
  cambiar: (valor: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-bold text-slate-500">
        {etiqueta}
      </span>

      <input
        type="number"
        min={0}
        step={paso}
        value={valor}
        onChange={(event) =>
          cambiar(
            event.target.value,
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-900"
      />
    </label>
  );
}
