"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ConfiguracionInicial = {
  montoMinimo: number;
  montoMaximo: number;
  plazoMinimo: number;
  plazoMaximo: number;
  maximoCreditosActivos: number;
  permitePagoAnticipado: boolean;
  permiteNuevaSolicitud: boolean;
  requiereRevisionClienteNuevo: boolean;
  permiteAprobacionAutomatica: boolean;
  porcentajeMoraEa: number | null;
  diasGraciaMora: number;
  plataformaActiva: boolean;
  modoMantenimiento: boolean;
  tasaValidadaJuridicamente: boolean;
};

type Props = {
  configuracion: ConfiguracionInicial;
};

export default function FormularioConfiguracion({
  configuracion,
}: Props) {
  const router = useRouter();

  const [montoMinimo, setMontoMinimo] = useState(
    String(Math.round(configuracion.montoMinimo)),
  );

  const [montoMaximo, setMontoMaximo] = useState(
    String(Math.round(configuracion.montoMaximo)),
  );

  const [plazoMinimo, setPlazoMinimo] = useState(
    String(configuracion.plazoMinimo),
  );

  const [plazoMaximo, setPlazoMaximo] = useState(
    String(configuracion.plazoMaximo),
  );

  const [
    maximoCreditosActivos,
    setMaximoCreditosActivos,
  ] = useState(
    String(configuracion.maximoCreditosActivos),
  );

  const [
    permitePagoAnticipado,
    setPermitePagoAnticipado,
  ] = useState(
    configuracion.permitePagoAnticipado,
  );

  const [
    permiteNuevaSolicitud,
    setPermiteNuevaSolicitud,
  ] = useState(
    configuracion.permiteNuevaSolicitud,
  );

  const [
    requiereRevisionClienteNuevo,
    setRequiereRevisionClienteNuevo,
  ] = useState(
    configuracion.requiereRevisionClienteNuevo,
  );

  const [
    permiteAprobacionAutomatica,
    setPermiteAprobacionAutomatica,
  ] = useState(
    configuracion.permiteAprobacionAutomatica,
  );

  const [
    porcentajeMoraEa,
    setPorcentajeMoraEa,
  ] = useState(
    configuracion.porcentajeMoraEa === null
      ? ""
      : String(configuracion.porcentajeMoraEa),
  );

  const [diasGraciaMora, setDiasGraciaMora] =
    useState(
      String(configuracion.diasGraciaMora),
    );

  const [
    plataformaActiva,
    setPlataformaActiva,
  ] = useState(
    configuracion.plataformaActiva,
  );

  const [
    modoMantenimiento,
    setModoMantenimiento,
  ] = useState(
    configuracion.modoMantenimiento,
  );

  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [esError, setEsError] = useState(false);

  async function guardar() {
    const minimo = Number(montoMinimo);
    const maximo = Number(montoMaximo);
    const plazoDesde = Number(plazoMinimo);
    const plazoHasta = Number(plazoMaximo);
    const maximosActivos = Number(
      maximoCreditosActivos,
    );
    const gracia = Number(diasGraciaMora);

    if (
      !Number.isFinite(minimo) ||
      minimo <= 0
    ) {
      mostrarError(
        "Ingresa un monto mínimo válido.",
      );
      return;
    }

    if (
      !Number.isFinite(maximo) ||
      maximo < minimo ||
      maximo > 150000
    ) {
      mostrarError(
        "El monto máximo debe estar entre el monto mínimo y $150.000.",
      );
      return;
    }

    if (
      !Number.isInteger(plazoDesde) ||
      plazoDesde < 2
    ) {
      mostrarError(
        "El plazo mínimo no puede ser inferior a 2 días.",
      );
      return;
    }

    if (
      !Number.isInteger(plazoHasta) ||
      plazoHasta > 10 ||
      plazoHasta < plazoDesde
    ) {
      mostrarError(
        "El plazo máximo debe estar entre el plazo mínimo y 10 días.",
      );
      return;
    }

    if (
      !Number.isInteger(maximosActivos) ||
      maximosActivos < 1
    ) {
      mostrarError(
        "La cantidad de créditos activos no es válida.",
      );
      return;
    }

    if (
      !Number.isInteger(gracia) ||
      gracia < 0
    ) {
      mostrarError(
        "Los días de gracia no son válidos.",
      );
      return;
    }

    if (!motivo.trim()) {
      mostrarError(
        "Debes explicar el motivo del cambio.",
      );
      return;
    }

    if (
      permiteAprobacionAutomatica &&
      !configuracion.tasaValidadaJuridicamente
    ) {
      mostrarError(
        "No puede activarse la aprobación automática hasta completar la validación jurídica de la tasa.",
      );
      return;
    }

    if (
      !window.confirm(
        "¿Confirmas la actualización de la política de crédito?",
      )
    ) {
      return;
    }

    setProcesando(true);
    setMensaje("");
    setEsError(false);

    try {
      const respuesta = await fetch(
        "/api/administrador/configuracion",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            montoMinimo: minimo,
            montoMaximo: maximo,
            plazoMinimo: plazoDesde,
            plazoMaximo: plazoHasta,
            maximoCreditosActivos:
              maximosActivos,
            permitePagoAnticipado,
            permiteNuevaSolicitud,
            requiereRevisionClienteNuevo,
            permiteAprobacionAutomatica,
            porcentajeMoraEa:
              porcentajeMoraEa.trim()
                ? Number(porcentajeMoraEa)
                : null,
            diasGraciaMora: gracia,
            plataformaActiva,
            modoMantenimiento,
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
            "No fue posible guardar la configuración.",
        );
        return;
      }

      setMensaje(
        "La configuración fue actualizada correctamente.",
      );
      setEsError(false);
      setMotivo("");
      setProcesando(false);

      router.refresh();
    } catch (error) {
      console.error(
        "Error guardando configuración:",
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
        <h2 className="text-2xl font-black text-slate-900">
          Política global de crédito
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Estos valores limitan las solicitudes y la
          operación general de Página Cred.
        </p>
      </div>

      <section className="mt-7 grid gap-5 md:grid-cols-2">
        <CampoNumerico
          etiqueta="Monto mínimo"
          valor={montoMinimo}
          minimo={1}
          paso={1000}
          deshabilitado={procesando}
          cambiar={setMontoMinimo}
        />

        <CampoNumerico
          etiqueta="Monto máximo"
          valor={montoMaximo}
          minimo={1}
          maximo={150000}
          paso={1000}
          deshabilitado={procesando}
          cambiar={setMontoMaximo}
          ayuda="El límite inicial es $150.000."
        />

        <CampoNumerico
          etiqueta="Plazo mínimo"
          valor={plazoMinimo}
          minimo={2}
          maximo={10}
          paso={1}
          deshabilitado={procesando}
          cambiar={setPlazoMinimo}
          sufijo="días"
        />

        <CampoNumerico
          etiqueta="Plazo máximo"
          valor={plazoMaximo}
          minimo={2}
          maximo={10}
          paso={1}
          deshabilitado={procesando}
          cambiar={setPlazoMaximo}
          sufijo="días"
        />

        <CampoNumerico
          etiqueta="Máximo de créditos activos"
          valor={maximoCreditosActivos}
          minimo={1}
          paso={1}
          deshabilitado={procesando}
          cambiar={setMaximoCreditosActivos}
        />

        <CampoNumerico
          etiqueta="Días de gracia para mora"
          valor={diasGraciaMora}
          minimo={0}
          paso={1}
          deshabilitado={procesando}
          cambiar={setDiasGraciaMora}
          sufijo="días"
        />

        <CampoNumerico
          etiqueta="Mora E.A."
          valor={porcentajeMoraEa}
          minimo={0}
          paso={0.01}
          deshabilitado={procesando}
          cambiar={setPorcentajeMoraEa}
          sufijo="%"
          ayuda="Debe revisarse jurídicamente antes de su aplicación."
        />
      </section>

      <section className="mt-7">
        <h3 className="text-lg font-black text-slate-900">
          Reglas operativas
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Opcion
            titulo="Permitir pago anticipado"
            descripcion="El cliente podrá pagar antes de la fecha de vencimiento."
            marcado={permitePagoAnticipado}
            deshabilitado={procesando}
            cambiar={setPermitePagoAnticipado}
          />

          <Opcion
            titulo="Nueva solicitud inmediata"
            descripcion="Después del pago total podrá solicitar otro crédito."
            marcado={permiteNuevaSolicitud}
            deshabilitado={procesando}
            cambiar={setPermiteNuevaSolicitud}
          />

          <Opcion
            titulo="Revisión de clientes nuevos"
            descripcion="Las primeras solicitudes deberán pasar por revisión administrativa."
            marcado={requiereRevisionClienteNuevo}
            deshabilitado={procesando}
            cambiar={setRequiereRevisionClienteNuevo}
          />

          <Opcion
            titulo="Aprobación automática"
            descripcion="Permite decisiones automáticas cuando se implemente el motor de riesgo."
            marcado={permiteAprobacionAutomatica}
            deshabilitado={
              procesando ||
              !configuracion.tasaValidadaJuridicamente
            }
            cambiar={setPermiteAprobacionAutomatica}
          />

          <Opcion
            titulo="Plataforma activa"
            descripcion="Permite el funcionamiento normal de las solicitudes."
            marcado={plataformaActiva}
            deshabilitado={procesando}
            cambiar={setPlataformaActiva}
          />

          <Opcion
            titulo="Modo mantenimiento"
            descripcion="Impide temporalmente nuevas solicitudes."
            marcado={modoMantenimiento}
            deshabilitado={procesando}
            cambiar={setModoMantenimiento}
          />
        </div>
      </section>

      <label className="mt-7 block">
        <span className="mb-2 block text-sm font-bold text-slate-700">
          Motivo del cambio
        </span>

        <textarea
          value={motivo}
          onChange={(event) =>
            setMotivo(event.target.value)
          }
          disabled={procesando}
          rows={4}
          maxLength={1000}
          placeholder="Explica por qué se modifica la política de crédito."
          className="w-full rounded-2xl border border-slate-200 p-4 outline-none transition focus:border-emerald-600 disabled:bg-slate-100"
        />

        <p className="mt-1 text-right text-xs text-slate-400">
          {motivo.length}/1000
        </p>
      </label>

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

      <button
        type="button"
        onClick={guardar}
        disabled={procesando}
        className="mt-6 w-full rounded-2xl bg-emerald-700 px-5 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {procesando
          ? "Guardando configuración..."
          : "Guardar configuración"}
      </button>
    </article>
  );
}

function CampoNumerico({
  etiqueta,
  valor,
  cambiar,
  minimo,
  maximo,
  paso,
  sufijo,
  ayuda,
  deshabilitado,
}: {
  etiqueta: string;
  valor: string;
  cambiar: (valor: string) => void;
  minimo?: number;
  maximo?: number;
  paso?: number;
  sufijo?: string;
  ayuda?: string;
  deshabilitado: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {etiqueta}
      </span>

      <div className="relative">
        <input
          type="number"
          value={valor}
          min={minimo}
          max={maximo}
          step={paso}
          disabled={deshabilitado}
          onChange={(event) =>
            cambiar(event.target.value)
          }
          className={
            sufijo
              ? "w-full rounded-2xl border border-slate-200 px-4 py-3.5 pr-16 outline-none focus:border-emerald-600 disabled:bg-slate-100"
              : "w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-emerald-600 disabled:bg-slate-100"
          }
        />

        {sufijo ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
            {sufijo}
          </span>
        ) : null}
      </div>

      {ayuda ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {ayuda}
        </p>
      ) : null}
    </label>
  );
}

function Opcion({
  titulo,
  descripcion,
  marcado,
  cambiar,
  deshabilitado,
}: {
  titulo: string;
  descripcion: string;
  marcado: boolean;
  cambiar: (marcado: boolean) => void;
  deshabilitado: boolean;
}) {
  return (
    <label className="flex cursor-pointer gap-4 rounded-2xl bg-[#f7f8f5] p-5">
      <input
        type="checkbox"
        checked={marcado}
        disabled={deshabilitado}
        onChange={(event) =>
          cambiar(event.target.checked)
        }
        className="mt-1 h-5 w-5 accent-emerald-700"
      />

      <span>
        <span className="block font-black text-slate-900">
          {titulo}
        </span>

        <span className="mt-1 block text-sm leading-6 text-slate-500">
          {descripcion}
        </span>
      </span>
    </label>
  );
}
