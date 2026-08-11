"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CuentaActual = {
  id: string;
  proveedor?: string | null;
  metodo_desembolso?: string | null;
  tipo_cuenta?: string | null;
  numero_cuenta?: string | null;
  tipo_llave?: string | null;
  valor_llave?: string | null;
  titular?: string | null;
  numero_documento_titular?: string | null;
};

type Props = {
  cuentaActual: CuentaActual | null;
};

type RespuestaApi = {
  ok?: boolean;
  error?: string;
};

const proveedoresBilletera = [
  "Nequi",
  "DaviPlata",
  "dale!",
  "Otro",
];

const bancos = [
  "Bancolombia",
  "Banco de Bogotá",
  "Davivienda",
  "BBVA",
  "Banco Popular",
  "Banco Caja Social",
  "Otro",
];

export default function FormularioDesembolso({
  cuentaActual,
}: Props) {
  const router = useRouter();

  const [metodo, setMetodo] = useState(
    cuentaActual?.metodo_desembolso ??
      "billetera",
  );

  const [proveedor, setProveedor] = useState(
    cuentaActual?.proveedor ?? "Nequi",
  );

  const [tipoCuenta, setTipoCuenta] = useState(
    cuentaActual?.tipo_cuenta ?? "ahorros",
  );

  const [numeroCuenta, setNumeroCuenta] =
    useState(
      cuentaActual?.numero_cuenta ?? "",
    );

  const [tipoLlave, setTipoLlave] = useState(
    cuentaActual?.tipo_llave ?? "celular",
  );

  const [valorLlave, setValorLlave] =
    useState(
      cuentaActual?.valor_llave ?? "",
    );

  const [titular, setTitular] = useState(
    cuentaActual?.titular ?? "",
  );

  const [
    numeroDocumentoTitular,
    setNumeroDocumentoTitular,
  ] = useState(
    cuentaActual?.numero_documento_titular ?? "",
  );

  const [procesando, setProcesando] =
    useState(false);

  const [mensaje, setMensaje] = useState("");
  const [esError, setEsError] = useState(false);

  function cambiarMetodo(nuevoMetodo: string) {
    setMetodo(nuevoMetodo);
    setMensaje("");
    setEsError(false);

    if (nuevoMetodo === "billetera") {
      setProveedor("Nequi");
      setTipoCuenta("");
      setNumeroCuenta("");
      setTipoLlave("");
      setValorLlave("");
    }

    if (nuevoMetodo === "cuenta") {
      setProveedor("Bancolombia");
      setTipoCuenta("ahorros");
      setNumeroCuenta("");
      setTipoLlave("");
      setValorLlave("");
    }

    if (nuevoMetodo === "llave_bre_b") {
      setProveedor("Otro");
      setTipoCuenta("");
      setNumeroCuenta("");
      setTipoLlave("celular");
      setValorLlave("");
    }
  }

  async function guardarCuenta(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMensaje("");
    setEsError(false);

    if (!titular.trim()) {
      mostrarError(
        "Debes escribir el nombre del titular.",
      );
      return;
    }

    if (
      !/^\d{5,15}$/.test(
        numeroDocumentoTitular.trim(),
      )
    ) {
      mostrarError(
        "El documento del titular debe contener entre 5 y 15 números.",
      );
      return;
    }

    if (
      metodo !== "llave_bre_b" &&
      !numeroCuenta.trim()
    ) {
      mostrarError(
        metodo === "billetera"
          ? "Debes escribir el número de celular."
          : "Debes escribir el número de cuenta.",
      );
      return;
    }

    if (
      metodo === "billetera" &&
      !/^\d{10}$/.test(numeroCuenta.trim())
    ) {
      mostrarError(
        "El número de celular debe tener exactamente 10 dígitos.",
      );
      return;
    }

    if (
      metodo === "cuenta" &&
      !/^\d{6,20}$/.test(numeroCuenta.trim())
    ) {
      mostrarError(
        "El número de cuenta debe contener entre 6 y 20 dígitos.",
      );
      return;
    }

    if (
      metodo === "llave_bre_b" &&
      !valorLlave.trim()
    ) {
      mostrarError(
        "Debes escribir el valor de la llave Bre-B.",
      );
      return;
    }

    if (
      metodo === "llave_bre_b" &&
      tipoLlave === "celular" &&
      !/^\d{10}$/.test(valorLlave.trim())
    ) {
      mostrarError(
        "La llave celular debe contener exactamente 10 números.",
      );
      return;
    }

    if (
      metodo === "llave_bre_b" &&
      tipoLlave === "documento" &&
      !/^\d{5,15}$/.test(valorLlave.trim())
    ) {
      mostrarError(
        "La llave de documento debe contener entre 5 y 15 números.",
      );
      return;
    }

    if (
      metodo === "llave_bre_b" &&
      tipoLlave === "correo" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        valorLlave.trim(),
      )
    ) {
      mostrarError(
        "Debes escribir un correo electrónico válido.",
      );
      return;
    }

    if (
      metodo === "llave_bre_b" &&
      tipoLlave === "alfanumerica" &&
      valorLlave.trim().length < 4
    ) {
      mostrarError(
        "La llave alfanumérica debe tener al menos 4 caracteres.",
      );
      return;
    }

    setProcesando(true);

    try {
      const respuesta = await fetch(
        "/api/cuentas-desembolso",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            proveedor,
            metodoDesembolso: metodo,

            tipoCuenta:
              metodo === "cuenta"
                ? tipoCuenta
                : null,

            numeroCuenta:
              metodo === "llave_bre_b"
                ? null
                : numeroCuenta.trim(),

            tipoLlave:
              metodo === "llave_bre_b"
                ? tipoLlave
                : null,

            valorLlave:
              metodo === "llave_bre_b"
                ? valorLlave.trim()
                : null,

            titular: titular.trim(),

            numeroDocumentoTitular:
              numeroDocumentoTitular.trim(),
          }),
        },
      );

      const datos =
        (await respuesta.json()) as RespuestaApi;

      if (!respuesta.ok) {
        mostrarError(
          datos.error ??
            "No fue posible guardar el medio de desembolso.",
        );
        return;
      }

      setMensaje(
        "El medio de desembolso fue guardado correctamente.",
      );
      setEsError(false);

      router.push("/cliente/solicitar");
      router.refresh();
    } catch (error) {
      console.error(
        "Error guardando medio de desembolso:",
        error,
      );

      mostrarError(
        "No fue posible comunicarse con el servidor.",
      );
    } finally {
      setProcesando(false);
    }
  }

  function mostrarError(texto: string) {
    setMensaje(texto);
    setEsError(true);
    setProcesando(false);
  }

  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
            Página Cred
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
            Medio de desembolso
          </h1>

          <p className="mt-3 leading-7 text-slate-600">
            Registra la cuenta o billetera donde
            deseas recibir el dinero de tu crédito.
          </p>
        </header>

        <form
          onSubmit={guardarCuenta}
          className="rounded-[30px] border border-[#eadfce] bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <p className="text-sm font-bold text-slate-700">
              Selecciona el tipo de medio
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <BotonMetodo
                titulo="Billetera digital"
                descripcion="Nequi, DaviPlata y otras"
                seleccionado={
                  metodo === "billetera"
                }
                onClick={() =>
                  cambiarMetodo("billetera")
                }
              />

              <BotonMetodo
                titulo="Cuenta bancaria"
                descripcion="Ahorros o corriente"
                seleccionado={metodo === "cuenta"}
                onClick={() =>
                  cambiarMetodo("cuenta")
                }
              />

              <BotonMetodo
                titulo="Llave Bre-B"
                descripcion="Celular, cédula o correo"
                seleccionado={
                  metodo === "llave_bre_b"
                }
                onClick={() =>
                  cambiarMetodo("llave_bre_b")
                }
              />
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {metodo === "billetera" ? (
              <>
                <CampoSelect
                  etiqueta="Billetera digital"
                  value={proveedor}
                  onChange={setProveedor}
                  opciones={proveedoresBilletera}
                />

                <CampoTexto
                  etiqueta="Número de celular"
                  value={numeroCuenta}
                  onChange={setNumeroCuenta}
                  placeholder="Ejemplo: 3001234567"
                  inputMode="numeric"
                />
              </>
            ) : null}

            {metodo === "cuenta" ? (
              <>
                <CampoSelect
                  etiqueta="Banco"
                  value={proveedor}
                  onChange={setProveedor}
                  opciones={bancos}
                />

                <CampoSelect
                  etiqueta="Tipo de cuenta"
                  value={tipoCuenta}
                  onChange={setTipoCuenta}
                  opciones={[
                    {
                      value: "ahorros",
                      label: "Cuenta de ahorros",
                    },
                    {
                      value: "corriente",
                      label: "Cuenta corriente",
                    },
                  ]}
                />

                <CampoTexto
                  etiqueta="Número de cuenta"
                  value={numeroCuenta}
                  onChange={setNumeroCuenta}
                  placeholder="Escribe el número de cuenta"
                  inputMode="numeric"
                />
              </>
            ) : null}

            {metodo === "llave_bre_b" ? (
              <>
                <CampoSelect
                  etiqueta="Tipo de llave"
                  value={tipoLlave}
                  onChange={setTipoLlave}
                  opciones={[
                    {
                      value: "celular",
                      label: "Número de celular",
                    },
                    {
                      value: "documento",
                      label: "Documento de identidad",
                    },
                    {
                      value: "correo",
                      label: "Correo electrónico",
                    },
                    {
                      value: "alfanumerica",
                      label: "Llave alfanumérica",
                    },
                  ]}
                />

                <CampoTexto
                  etiqueta="Valor de la llave"
                  value={valorLlave}
                  onChange={setValorLlave}
                  placeholder="Escribe la llave registrada"
                  inputMode={
                    tipoLlave === "correo"
                      ? "email"
                      : tipoLlave === "alfanumerica"
                        ? "text"
                        : "numeric"
                  }
                />
              </>
            ) : null}

            <CampoTexto
              etiqueta="Nombre del titular"
              value={titular}
              onChange={setTitular}
              placeholder="Nombre completo del titular"
            />

            <CampoTexto
              etiqueta="Número de documento del titular"
              value={numeroDocumentoTitular}
              onChange={setNumeroDocumentoTitular}
              placeholder="Escribe el número de documento"
              inputMode="numeric"
            />
          </div>

          <div className="mt-7 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Verifica que la cuenta pertenezca al
            titular registrado. Una cuenta incorrecta
            puede impedir el desembolso.
          </div>

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

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                router.push("/cliente/solicitar")
              }
              className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-bold text-slate-700"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={procesando}
              className="rounded-2xl bg-emerald-700 px-6 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {procesando
                ? "Guardando..."
                : cuentaActual
                  ? "Actualizar medio"
                  : "Guardar medio"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function BotonMetodo({
  titulo,
  descripcion,
  seleccionado,
  onClick,
}: {
  titulo: string;
  descripcion: string;
  seleccionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        seleccionado
          ? "rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-4 text-left text-emerald-800"
          : "rounded-2xl border border-slate-200 bg-white p-4 text-left text-slate-700 transition hover:border-emerald-300"
      }
    >
      <span className="block font-black">
        {titulo}
      </span>

      <span className="mt-1 block text-xs">
        {descripcion}
      </span>
    </button>
  );
}

function CampoTexto({
  etiqueta,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
  inputMode?:
    | "text"
    | "numeric"
    | "email"
    | "tel";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {etiqueta}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-slate-900 outline-none transition focus:border-emerald-600"
      />
    </label>
  );
}

function CampoSelect({
  etiqueta,
  value,
  onChange,
  opciones,
}: {
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  opciones:
    | string[]
    | Array<{
        value: string;
        label: string;
      }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {etiqueta}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 outline-none transition focus:border-emerald-600"
      >
        {opciones.map((opcion) => {
          const value =
            typeof opcion === "string"
              ? opcion
              : opcion.value;

          const label =
            typeof opcion === "string"
              ? opcion
              : opcion.label;

          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
