"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Perfil = {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  celular: string | null;
  celular_alterno: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  fecha_expedicion: string | null;
  lugar_expedicion: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  estado_civil: string | null;
  departamento: string | null;
  ciudad: string | null;
  direccion: string | null;
  barrio: string | null;
  ocupacion: string | null;
  empresa: string | null;
  cargo: string | null;
  ingreso_mensual: number | null;
  antiguedad_meses: number | null;
  acepta_terminos: boolean;
  acepta_datos: boolean;
  acepta_consulta_riesgo: boolean;
  perfil_completo: boolean;
};

type Cuenta = {
  id: string;
  proveedor: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  titular: string | null;
  numero_documento_titular: string | null;
  metodo_desembolso: string | null;
  tipo_llave: string | null;
  valor_llave: string | null;
} | null;

type Referencia = {
  id: string;
  tipo: string;
  nombre_completo: string;
  parentesco: string | null;
  celular: string;
};

type Props = {
  perfil: Perfil;
  cuenta: Cuenta;
  referencias: Referencia[];
};

type TipoMensaje = "exito" | "error";

export default function FormularioPerfil({
  perfil,
  cuenta,
  referencias,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const referenciaFamiliar =
    referencias.find(
      (referencia) =>
        referencia.tipo === "Familiar",
    ) ?? null;

  const referenciaPersonal =
    referencias.find(
      (referencia) =>
        referencia.tipo === "Personal",
    ) ?? null;

  const [guardando, setGuardando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [tipoMensaje, setTipoMensaje] =
    useState<TipoMensaje>("exito");

  function mostrarError(texto: string) {
    setMensaje(texto);
    setTipoMensaje("error");
    setGuardando(false);
  }

  async function guardarReferencia({
    existente,
    tipo,
    nombreCompleto,
    parentesco,
    celular,
  }: {
    existente: Referencia | null;
    tipo: "Familiar" | "Personal";
    nombreCompleto: string;
    parentesco: string;
    celular: string;
  }): Promise<string | null> {
    const datosReferencia = {
      cliente_id: perfil.id,
      tipo,
      nombre_completo:
        nombreCompleto.trim(),
      parentesco:
        parentesco.trim() || null,
      celular: celular.trim(),
    };

    const resultado = existente
      ? await supabase
          .from("referencias_cliente")
          .update(datosReferencia)
          .eq("id", existente.id)
          .eq("cliente_id", perfil.id)
      : await supabase
          .from("referencias_cliente")
          .insert(datosReferencia);

    if (resultado.error) {
      console.error(
        `Error guardando referencia ${tipo}:`,
        resultado.error,
      );

      return resultado.error.message;
    }

    return null;
  }

  async function guardarPerfil(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (guardando) {
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const formulario = new FormData(
        event.currentTarget,
      );

      const valor = (nombre: string) =>
        String(
          formulario.get(nombre) ?? "",
        ).trim();

      const celular = valor(
        "celular",
      ).replace(/\D/g, "");

      const numeroDocumento = valor(
        "numero_documento",
      ).replace(/\D/g, "");

      const numeroCuenta = valor(
        "numero_cuenta",
      ).replace(/\D/g, "");

      const celularFamiliar = valor(
        "celular_familiar",
      ).replace(/\D/g, "");

      const celularPersonal = valor(
        "celular_personal",
      ).replace(/\D/g, "");

      const aceptaTerminos =
        formulario.get(
          "acepta_terminos",
        ) === "on";

      const aceptaDatos =
        formulario.get(
          "acepta_datos",
        ) === "on";

      const aceptaConsulta =
        formulario.get(
          "acepta_consulta_riesgo",
        ) === "on";

      if (
        celular.length !== 10 ||
        celularFamiliar.length !== 10 ||
        celularPersonal.length !== 10
      ) {
        mostrarError(
          "Los números celulares deben contener 10 dígitos.",
        );
        return;
      }

      if (!numeroDocumento) {
        mostrarError(
          "Debes escribir el número de documento.",
        );
        return;
      }

      if (!numeroCuenta) {
        mostrarError(
          "Debes escribir el número de cuenta o celular del medio de desembolso.",
        );
        return;
      }

      if (
        !aceptaTerminos ||
        !aceptaDatos ||
        !aceptaConsulta
      ) {
        mostrarError(
          "Debes aceptar las autorizaciones para continuar.",
        );
        return;
      }

      const ingresoMensual = Number(
        valor("ingreso_mensual"),
      );

      const antiguedadMeses = Number(
        valor("antiguedad_meses") || 0,
      );

      if (
        !Number.isFinite(
          ingresoMensual,
        ) ||
        ingresoMensual < 0
      ) {
        mostrarError(
          "El ingreso mensual no es válido.",
        );
        return;
      }

      if (
        !Number.isFinite(
          antiguedadMeses,
        ) ||
        antiguedadMeses < 0
      ) {
        mostrarError(
          "La antigüedad no es válida.",
        );
        return;
      }

      const proveedorCuenta =
        valor("proveedor");

      const tipoCuentaSeleccionado =
        valor("tipo_cuenta")
          .trim()
          .toLowerCase();

      if (!proveedorCuenta) {
        mostrarError(
          "Debes seleccionar el banco o billetera.",
        );
        return;
      }

      const proveedoresBilletera = [
        "nequi",
        "daviplata",
        "dale!",
      ];

      const proveedorNormalizado =
        proveedorCuenta
          .trim()
          .toLowerCase();

      const esProveedorBilletera =
        proveedoresBilletera.includes(
          proveedorNormalizado,
        );

      const seleccionoBilletera =
        tipoCuentaSeleccionado ===
        "billetera digital";

      const esBilletera =
        esProveedorBilletera ||
        seleccionoBilletera;

      if (
        seleccionoBilletera &&
        !esProveedorBilletera
      ) {
        mostrarError(
          "Para usar una billetera digital debes seleccionar Nequi, DaviPlata o dale!.",
        );
        return;
      }

      let tipoCuentaNormalizado:
        | "ahorros"
        | "corriente"
        | null = null;

      if (!esBilletera) {
        if (
          tipoCuentaSeleccionado ===
          "ahorros"
        ) {
          tipoCuentaNormalizado =
            "ahorros";
        } else if (
          tipoCuentaSeleccionado ===
          "corriente"
        ) {
          tipoCuentaNormalizado =
            "corriente";
        } else {
          mostrarError(
            "Debes seleccionar cuenta de ahorros o cuenta corriente.",
          );
          return;
        }
      }

      const titular = valor(
        "titular",
      )
        .trim()
        .toUpperCase();

      if (!titular) {
        mostrarError(
          "Debes escribir el nombre del titular.",
        );
        return;
      }

      const datosCuenta = {
        cliente_id: perfil.id,
        usuario_id: perfil.id,
        proveedor: proveedorCuenta,

        metodo_desembolso:
          esBilletera
            ? "billetera"
            : "cuenta",

        tipo_cuenta:
          esBilletera
            ? null
            : tipoCuentaNormalizado,

        numero_cuenta:
          numeroCuenta,

        tipo_llave: null,
        valor_llave: null,

        titular,

        numero_documento_titular:
          numeroDocumento,

        es_principal: true,
        activa: true,
      };

      const resultadoCuenta = cuenta
        ? await supabase
            .from(
              "cuentas_desembolso",
            )
            .update(datosCuenta)
            .eq("id", cuenta.id)
            .eq(
              "cliente_id",
              perfil.id,
            )
        : await supabase
            .from(
              "cuentas_desembolso",
            )
            .insert(datosCuenta);

      if (resultadoCuenta.error) {
        console.error(
          "Error guardando cuenta de desembolso:",
          resultadoCuenta.error,
        );

        mostrarError(
          resultadoCuenta.error
            .message,
        );
        return;
      }

      const errorReferenciaFamiliar =
        await guardarReferencia({
          existente:
            referenciaFamiliar,

          tipo: "Familiar",

          nombreCompleto: valor(
            "nombre_familiar",
          ),

          parentesco: valor(
            "parentesco_familiar",
          ),

          celular:
            celularFamiliar,
        });

      if (
        errorReferenciaFamiliar
      ) {
        mostrarError(
          errorReferenciaFamiliar,
        );
        return;
      }

      const errorReferenciaPersonal =
        await guardarReferencia({
          existente:
            referenciaPersonal,

          tipo: "Personal",

          nombreCompleto: valor(
            "nombre_personal",
          ),

          parentesco: valor(
            "relacion_personal",
          ),

          celular:
            celularPersonal,
        });

      if (
        errorReferenciaPersonal
      ) {
        mostrarError(
          errorReferenciaPersonal,
        );
        return;
      }

      const datosPerfil = {
        nombres: valor("nombres"),
        apellidos: valor(
          "apellidos",
        ),

        celular,

        celular_alterno:
          valor(
            "celular_alterno",
          ).replace(/\D/g, "") ||
          null,

        tipo_documento: valor(
          "tipo_documento",
        ),

        numero_documento:
          numeroDocumento,

        fecha_expedicion: valor(
          "fecha_expedicion",
        ),

        lugar_expedicion: valor(
          "lugar_expedicion",
        ),

        fecha_nacimiento: valor(
          "fecha_nacimiento",
        ),

        sexo: valor("sexo"),

        estado_civil: valor(
          "estado_civil",
        ),

        departamento: valor(
          "departamento",
        ),

        ciudad: valor("ciudad"),

        direccion: valor(
          "direccion",
        ),

        barrio: valor("barrio"),

        ocupacion: valor(
          "ocupacion",
        ),

        empresa:
          valor("empresa") ||
          null,

        cargo:
          valor("cargo") ||
          null,

        ingreso_mensual:
          ingresoMensual,

        antiguedad_meses:
          antiguedadMeses,

        acepta_terminos:
          aceptaTerminos,

        acepta_datos:
          aceptaDatos,

        acepta_consulta_riesgo:
          aceptaConsulta,

        fecha_aceptacion:
          new Date().toISOString(),

        perfil_completo: true,
      };

      const {
        error: errorPerfil,
      } = await supabase
        .from("perfiles")
        .update(datosPerfil)
        .eq("id", perfil.id);

      if (errorPerfil) {
        console.error(
          "Error actualizando perfil:",
          errorPerfil,
        );

        mostrarError(
          errorPerfil.message,
        );
        return;
      }

      setTipoMensaje("exito");

      setMensaje(
        "Perfil actualizado correctamente.",
      );

      router.push(
        "/cliente/solicitar",
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Error inesperado guardando perfil:",
        error,
      );

      mostrarError(
        "No fue posible guardar la información. Intenta nuevamente.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8ee] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">
              Página Cred
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Completa tu perfil
            </h1>

            <p className="mt-2 text-slate-600">
              Esta información se utilizará para gestionar tus solicitudes.
            </p>
          </div>

          <Link
            href="/cliente"
            className="w-fit rounded-2xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700"
          >
            ← Volver al panel
          </Link>
        </header>

        <form
          onSubmit={guardarPerfil}
          className="mt-8 space-y-6"
        >
          <Seccion
            numero="01"
            titulo="Información personal"
            descripcion="Datos de identificación del titular."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo
                nombre="nombres"
                etiqueta="Nombres"
                valor={perfil.nombres}
              />

              <Campo
                nombre="apellidos"
                etiqueta="Apellidos"
                valor={perfil.apellidos}
              />

              <Seleccion
                nombre="tipo_documento"
                etiqueta="Tipo de documento"
                valor={
                  perfil.tipo_documento
                }
                opciones={[
                  "Cédula de ciudadanía",
                  "Cédula de extranjería",
                  "Permiso por protección temporal",
                ]}
              />

              <Campo
                nombre="numero_documento"
                etiqueta="Número de documento"
                valor={
                  perfil.numero_documento
                }
                inputMode="numeric"
              />

              <Campo
                nombre="fecha_expedicion"
                etiqueta="Fecha de expedición"
                valor={
                  perfil.fecha_expedicion
                }
                tipo="date"
              />

              <Campo
                nombre="lugar_expedicion"
                etiqueta="Lugar de expedición"
                valor={
                  perfil.lugar_expedicion
                }
              />

              <Campo
                nombre="fecha_nacimiento"
                etiqueta="Fecha de nacimiento"
                valor={
                  perfil.fecha_nacimiento
                }
                tipo="date"
              />

              <Seleccion
                nombre="sexo"
                etiqueta="Sexo"
                valor={perfil.sexo}
                opciones={[
                  "Femenino",
                  "Masculino",
                  "Otro",
                  "Prefiero no indicar",
                ]}
              />

              <Seleccion
                nombre="estado_civil"
                etiqueta="Estado civil"
                valor={
                  perfil.estado_civil
                }
                opciones={[
                  "Soltero(a)",
                  "Casado(a)",
                  "Unión libre",
                  "Separado(a)",
                  "Divorciado(a)",
                  "Viudo(a)",
                ]}
              />

              <Campo
                nombre="celular"
                etiqueta="Celular principal"
                valor={perfil.celular}
                tipo="tel"
                inputMode="numeric"
              />

              <Campo
                nombre="celular_alterno"
                etiqueta="Celular alterno"
                valor={
                  perfil.celular_alterno
                }
                tipo="tel"
                inputMode="numeric"
                requerido={false}
              />

              <Campo
                nombre="correo"
                etiqueta="Correo electrónico"
                valor={perfil.correo}
                tipo="email"
                deshabilitado
              />
            </div>
          </Seccion>

          <Seccion
            numero="02"
            titulo="Lugar de residencia"
            descripcion="Ubicación actual del cliente."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo
                nombre="departamento"
                etiqueta="Departamento"
                valor={
                  perfil.departamento
                }
              />

              <Campo
                nombre="ciudad"
                etiqueta="Ciudad o municipio"
                valor={perfil.ciudad}
              />

              <Campo
                nombre="direccion"
                etiqueta="Dirección"
                valor={perfil.direccion}
              />

              <Campo
                nombre="barrio"
                etiqueta="Barrio"
                valor={perfil.barrio}
              />
            </div>
          </Seccion>

          <Seccion
            numero="03"
            titulo="Información económica"
            descripcion="Información básica de ocupación e ingresos."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Seleccion
                nombre="ocupacion"
                etiqueta="Ocupación"
                valor={perfil.ocupacion}
                opciones={[
                  "Empleado(a)",
                  "Independiente",
                  "Comerciante",
                  "Pensionado(a)",
                  "Estudiante",
                  "Hogar",
                  "Otro",
                ]}
              />

              <Campo
                nombre="ingreso_mensual"
                etiqueta="Ingreso mensual aproximado"
                valor={
                  perfil.ingreso_mensual
                }
                tipo="number"
                inputMode="numeric"
                minimo="0"
              />

              <Campo
                nombre="empresa"
                etiqueta="Empresa o actividad"
                valor={perfil.empresa}
                requerido={false}
              />

              <Campo
                nombre="cargo"
                etiqueta="Cargo u oficio"
                valor={perfil.cargo}
                requerido={false}
              />

              <Campo
                nombre="antiguedad_meses"
                etiqueta="Antigüedad en meses"
                valor={
                  perfil.antiguedad_meses
                }
                tipo="number"
                inputMode="numeric"
                minimo="0"
              />
            </div>
          </Seccion>

          <Seccion
            numero="04"
            titulo="Medio de desembolso"
            descripcion="La cuenta debe pertenecer al solicitante."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Seleccion
                nombre="proveedor"
                etiqueta="Banco o billetera"
                valor={cuenta?.proveedor}
                opciones={[
                  "Nequi",
                  "DaviPlata",
                  "dale!",
                  "Bancolombia",
                  "Banco de Bogotá",
                  "Davivienda",
                  "BBVA",
                  "Banco Popular",
                  "Banco Caja Social",
                  "Otro",
                ]}
              />

              <Seleccion
                nombre="tipo_cuenta"
                etiqueta="Tipo de cuenta"
                valor={
                  obtenerTipoCuentaInicial(
                    cuenta,
                  )
                }
                opciones={[
                  "Ahorros",
                  "Corriente",
                  "Billetera digital",
                ]}
              />

              <Campo
                nombre="numero_cuenta"
                etiqueta="Número de cuenta o celular"
                valor={
                  cuenta?.numero_cuenta
                }
                inputMode="numeric"
              />

              <Campo
                nombre="titular"
                etiqueta="Nombre del titular"
                valor={
                  cuenta?.titular ??
                  `${perfil.nombres} ${perfil.apellidos}`.trim()
                }
              />
            </div>
          </Seccion>

          <Seccion
            numero="05"
            titulo="Referencias"
            descripcion="Registra una referencia familiar y una personal."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <ReferenciaCard titulo="Referencia familiar">
                <Campo
                  nombre="nombre_familiar"
                  etiqueta="Nombre completo"
                  valor={
                    referenciaFamiliar
                      ?.nombre_completo
                  }
                />

                <Campo
                  nombre="parentesco_familiar"
                  etiqueta="Parentesco"
                  valor={
                    referenciaFamiliar
                      ?.parentesco
                  }
                />

                <Campo
                  nombre="celular_familiar"
                  etiqueta="Celular"
                  valor={
                    referenciaFamiliar
                      ?.celular
                  }
                  tipo="tel"
                  inputMode="numeric"
                />
              </ReferenciaCard>

              <ReferenciaCard titulo="Referencia personal">
                <Campo
                  nombre="nombre_personal"
                  etiqueta="Nombre completo"
                  valor={
                    referenciaPersonal
                      ?.nombre_completo
                  }
                />

                <Campo
                  nombre="relacion_personal"
                  etiqueta="Relación"
                  valor={
                    referenciaPersonal
                      ?.parentesco
                  }
                />

                <Campo
                  nombre="celular_personal"
                  etiqueta="Celular"
                  valor={
                    referenciaPersonal
                      ?.celular
                  }
                  tipo="tel"
                  inputMode="numeric"
                />
              </ReferenciaCard>
            </div>
          </Seccion>

          <Seccion
            numero="06"
            titulo="Autorizaciones"
            descripcion="Aceptaciones necesarias para gestionar la solicitud."
          >
            <div className="space-y-4">
              <Autorizacion
                nombre="acepta_terminos"
                texto="Acepto los términos y condiciones de uso de la plataforma."
                valorInicial={
                  perfil.acepta_terminos
                }
              />

              <Autorizacion
                nombre="acepta_datos"
                texto="Autorizo el tratamiento de mis datos personales."
                valorInicial={
                  perfil.acepta_datos
                }
              />

              <Autorizacion
                nombre="acepta_consulta_riesgo"
                texto="Autorizo la consulta y tratamiento de información relacionada con la evaluación de la solicitud, conforme a las condiciones informadas."
                valorInicial={
                  perfil.acepta_consulta_riesgo
                }
              />
            </div>
          </Seccion>

          {mensaje ? (
            <p
              className={
                tipoMensaje === "exito"
                  ? "rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-800"
                  : "rounded-2xl bg-amber-50 px-5 py-4 text-amber-800"
              }
            >
              {mensaje}
            </p>
          ) : null}

          <div className="sticky bottom-4 rounded-[24px] border border-[#eadfce] bg-white/95 p-4 shadow-xl backdrop-blur">
            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-2xl bg-emerald-700 px-6 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando
                ? "Guardando información..."
                : "Guardar y continuar"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function obtenerTipoCuentaInicial(
  cuenta: Cuenta,
) {
  if (!cuenta) {
    return null;
  }

  if (
    cuenta.metodo_desembolso ===
    "billetera"
  ) {
    return "Billetera digital";
  }

  if (
    cuenta.tipo_cuenta === "ahorros"
  ) {
    return "Ahorros";
  }

  if (
    cuenta.tipo_cuenta === "corriente"
  ) {
    return "Corriente";
  }

  return cuenta.tipo_cuenta;
}

type SeccionProps = {
  numero: string;
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
};

function Seccion({
  numero,
  titulo,
  descripcion,
  children,
}: SeccionProps) {
  return (
    <section className="rounded-[30px] border border-[#eadfce] bg-white p-6 shadow-sm sm:p-8">
      <div className="border-b border-slate-100 pb-5">
        <p className="text-sm font-black text-emerald-700">
          {numero}
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-900">
          {titulo}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {descripcion}
        </p>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

type CampoProps = {
  nombre: string;
  etiqueta: string;
  valor?: string | number | null;
  tipo?: string;

  inputMode?:
    | "text"
    | "numeric"
    | "decimal"
    | "tel"
    | "email"
    | "url"
    | "search"
    | "none";

  requerido?: boolean;
  deshabilitado?: boolean;
  minimo?: string;
};

function Campo({
  nombre,
  etiqueta,
  valor,
  tipo = "text",
  inputMode,
  requerido = true,
  deshabilitado = false,
  minimo,
}: CampoProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {etiqueta}
      </span>

      <input
        name={nombre}
        type={tipo}
        inputMode={inputMode}
        required={requerido}
        disabled={deshabilitado}
        min={minimo}
        defaultValue={valor ?? ""}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

type SeleccionProps = {
  nombre: string;
  etiqueta: string;
  valor?: string | null;
  opciones: string[];
};

function Seleccion({
  nombre,
  etiqueta,
  valor,
  opciones,
}: SeleccionProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {etiqueta}
      </span>

      <select
        name={nombre}
        required
        defaultValue={valor ?? ""}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      >
        <option
          value=""
          disabled
        >
          Selecciona una opción
        </option>

        {opciones.map(
          (opcion) => (
            <option
              key={opcion}
              value={opcion}
            >
              {opcion}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function ReferenciaCard({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-[24px] bg-[#f7f8f5] p-5">
      <h3 className="font-black text-slate-900">
        {titulo}
      </h3>

      {children}
    </div>
  );
}

function Autorizacion({
  nombre,
  texto,
  valorInicial,
}: {
  nombre: string;
  texto: string;
  valorInicial: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl bg-[#f7f8f5] p-4">
      <input
        name={nombre}
        type="checkbox"
        required
        defaultChecked={
          valorInicial
        }
        className="mt-1 h-4 w-4 accent-emerald-700"
      />

      <span className="text-sm leading-6 text-slate-600">
        {texto}
      </span>
    </label>
  );
}
