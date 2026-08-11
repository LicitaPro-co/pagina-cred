import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type CuentaBody = {
  proveedor?: string;
  metodoDesembolso?: string;
  tipoCuenta?: string | null;
  numeroCuenta?: string | null;
  tipoLlave?: string | null;
  valorLlave?: string | null;
  titular?: string;
  numeroDocumentoTitular?: string;
};

const metodosPermitidos = [
  "billetera",
  "cuenta",
  "llave_bre_b",
] as const;

const tiposCuentaPermitidos = [
  "ahorros",
  "corriente",
] as const;

const tiposLlavePermitidos = [
  "celular",
  "documento",
  "correo",
  "alfanumerica",
] as const;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario || !user) {
      return NextResponse.json(
        {
          error: "Debes iniciar sesión.",
        },
        {
          status: 401,
        },
      );
    }

    const body = (await request.json()) as CuentaBody;

    const proveedor = limpiarTexto(body.proveedor);

    const metodoDesembolso = limpiarTexto(
      body.metodoDesembolso,
    );

    const tipoCuenta = limpiarTexto(
      body.tipoCuenta,
    );

    const numeroCuenta = limpiarTexto(
      body.numeroCuenta,
    );

    const tipoLlave = limpiarTexto(
      body.tipoLlave,
    );

    const valorLlave = limpiarTexto(
      body.valorLlave,
    );

    const titular = limpiarTexto(
      body.titular,
    );

    const numeroDocumentoTitular = limpiarTexto(
      body.numeroDocumentoTitular,
    );

    if (!proveedor) {
      return respuestaError(
        "Debes seleccionar el proveedor.",
      );
    }

    if (
      !metodosPermitidos.includes(
        metodoDesembolso as
          (typeof metodosPermitidos)[number],
      )
    ) {
      return respuestaError(
        "El método de desembolso no es válido.",
      );
    }

    if (titular.length < 3) {
      return respuestaError(
        "El nombre del titular no es válido.",
      );
    }

    if (
      !/^\d{5,15}$/.test(
        numeroDocumentoTitular,
      )
    ) {
      return respuestaError(
        "El documento del titular debe contener entre 5 y 15 números.",
      );
    }

    if (
      metodoDesembolso === "cuenta" &&
      !tiposCuentaPermitidos.includes(
        tipoCuenta as
          (typeof tiposCuentaPermitidos)[number],
      )
    ) {
      return respuestaError(
        "Debes seleccionar un tipo de cuenta válido.",
      );
    }

    if (
      metodoDesembolso === "llave_bre_b" &&
      !tiposLlavePermitidos.includes(
        tipoLlave as
          (typeof tiposLlavePermitidos)[number],
      )
    ) {
      return respuestaError(
        "Debes seleccionar un tipo de llave válido.",
      );
    }

    if (
      metodoDesembolso === "billetera" &&
      !/^\d{10}$/.test(numeroCuenta)
    ) {
      return respuestaError(
        "El número de celular debe tener 10 dígitos.",
      );
    }

    if (
      metodoDesembolso === "cuenta" &&
      !/^\d{6,20}$/.test(numeroCuenta)
    ) {
      return respuestaError(
        "El número de cuenta debe contener entre 6 y 20 dígitos.",
      );
    }

    if (
      metodoDesembolso === "llave_bre_b" &&
      !valorLlave
    ) {
      return respuestaError(
        "Debes escribir el valor de la llave Bre-B.",
      );
    }

    if (
      metodoDesembolso === "llave_bre_b" &&
      tipoLlave === "celular" &&
      !/^\d{10}$/.test(valorLlave)
    ) {
      return respuestaError(
        "La llave de celular debe tener 10 dígitos.",
      );
    }

    if (
      metodoDesembolso === "llave_bre_b" &&
      tipoLlave === "documento" &&
      !/^\d{5,15}$/.test(valorLlave)
    ) {
      return respuestaError(
        "La llave de documento debe contener entre 5 y 15 números.",
      );
    }

    if (
      metodoDesembolso === "llave_bre_b" &&
      tipoLlave === "correo" &&
      !esCorreoValido(valorLlave)
    ) {
      return respuestaError(
        "La llave de correo electrónico no es válida.",
      );
    }

    if (
      metodoDesembolso === "llave_bre_b" &&
      tipoLlave === "alfanumerica" &&
      valorLlave.length < 4
    ) {
      return respuestaError(
        "La llave alfanumérica debe tener al menos 4 caracteres.",
      );
    }

    const { data, error } = await supabase.rpc(
      "guardar_cuenta_desembolso",
      {
        p_proveedor: proveedor,
        p_metodo_desembolso:
          metodoDesembolso,

        p_tipo_cuenta:
          metodoDesembolso === "cuenta"
            ? tipoCuenta
            : null,

        p_numero_cuenta:
          metodoDesembolso ===
          "llave_bre_b"
            ? null
            : numeroCuenta,

        p_tipo_llave:
          metodoDesembolso ===
          "llave_bre_b"
            ? tipoLlave
            : null,

        p_valor_llave:
          metodoDesembolso ===
          "llave_bre_b"
            ? valorLlave
            : null,

        p_titular: titular,

        p_numero_documento_titular:
          numeroDocumentoTitular,
      },
    );

    if (error) {
      console.error(
        "Error guardando medio de desembolso:",
        error,
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "No fue posible guardar el medio de desembolso.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        cuentaId: data,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Error interno guardando medio de desembolso:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No fue posible guardar el medio de desembolso.",
      },
      {
        status: 500,
      },
    );
  }
}

function limpiarTexto(
  valor: unknown,
): string {
  return String(valor ?? "").trim();
}

function respuestaError(
  mensaje: string,
) {
  return NextResponse.json(
    {
      error: mensaje,
    },
    {
      status: 400,
    },
  );
}

function esCorreoValido(
  valor: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    valor,
  );
}
