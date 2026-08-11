import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type SolicitudBody = {
  monto?: number;
  plazoDias?: number;
  observacion?: string;
};

type ConfiguracionPublica = {
  monto_minimo_global: number | string;
  monto_maximo_global: number | string;
  plazo_minimo_dias: number;
  plazo_maximo_dias: number;
  maximo_creditos_activos: number;
  plataforma_activa: boolean;
  modo_mantenimiento: boolean;
  tasa_validada_juridicamente: boolean;
};

type PerfilCliente = {
  nivel: number | string | null;
  cupo_actual: number | string | null;
  estado: string;
  rol: string;
  perfil_completo: boolean | null;
};

type NivelCredito = {
  numero_nivel: number;
  monto_minimo: number | string | null;
  monto_maximo: number | string | null;
  plazos_dias: unknown;
  activo: boolean;
};

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

    let body: SolicitudBody;

    try {
      body = (await request.json()) as SolicitudBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "La información enviada no tiene un formato válido.",
        },
        {
          status: 400,
        },
      );
    }

    const monto = Number(body.monto);
    const plazoDias = Number(body.plazoDias);

    const observacion = String(
      body.observacion ?? "",
    ).trim();

    if (
      !Number.isFinite(monto) ||
      monto <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "El monto seleccionado no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(plazoDias) ||
      plazoDias <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "El plazo seleccionado no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (observacion.length > 500) {
      return NextResponse.json(
        {
          error:
            "La observación no puede superar los 500 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    const [
      resultadoConfiguracion,
      resultadoPerfil,
    ] = await Promise.all([
      supabase.rpc(
        "obtener_configuracion_publica_credito",
      ),

      supabase
        .from("perfiles")
        .select(`
          nivel,
          cupo_actual,
          estado,
          rol,
          perfil_completo
        `)
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (
      resultadoConfiguracion.error ||
      !resultadoConfiguracion.data
    ) {
      console.error(
        "Error consultando configuración:",
        resultadoConfiguracion.error,
      );

      return NextResponse.json(
        {
          error:
            "No fue posible cargar la configuración del crédito.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      resultadoPerfil.error ||
      !resultadoPerfil.data
    ) {
      return NextResponse.json(
        {
          error:
            "No fue posible cargar tu perfil.",
        },
        {
          status: 400,
        },
      );
    }

    const configuracion =
      resultadoConfiguracion.data as ConfiguracionPublica;

    const perfil =
      resultadoPerfil.data as PerfilCliente;

    if (!configuracion.plataforma_activa) {
      return NextResponse.json(
        {
          error:
            "La plataforma no se encuentra habilitada para nuevas solicitudes.",
        },
        {
          status: 503,
        },
      );
    }

    if (configuracion.modo_mantenimiento) {
      return NextResponse.json(
        {
          error:
            "La plataforma se encuentra temporalmente en mantenimiento.",
        },
        {
          status: 503,
        },
      );
    }

    if (
      perfil.rol !== "cliente" ||
      perfil.estado !== "activo"
    ) {
      return NextResponse.json(
        {
          error:
            "Tu perfil no se encuentra habilitado para solicitar créditos.",
        },
        {
          status: 403,
        },
      );
    }

    if (!perfil.perfil_completo) {
      return NextResponse.json(
        {
          error:
            "Debes completar tu perfil antes de solicitar un crédito.",
        },
        {
          status: 400,
        },
      );
    }

    const numeroNivel = Number(
      perfil.nivel ?? 1,
    );

    const {
      data: nivel,
      error: errorNivel,
    } = await supabase
      .from("niveles_credito")
      .select(`
        numero_nivel,
        monto_minimo,
        monto_maximo,
        plazos_dias,
        activo
      `)
      .eq("numero_nivel", numeroNivel)
      .eq("activo", true)
      .maybeSingle();

    if (errorNivel || !nivel) {
      return NextResponse.json(
        {
          error:
            "La configuración de tu nivel de crédito no está disponible.",
        },
        {
          status: 400,
        },
      );
    }

    const nivelSeguro =
      nivel as NivelCredito;

    const montoMinimoGlobal = Number(
      configuracion.monto_minimo_global,
    );

    const montoMaximoGlobal = Number(
      configuracion.monto_maximo_global,
    );

    const montoMinimoNivel = Number(
      nivelSeguro.monto_minimo ??
        montoMinimoGlobal,
    );

    const montoMaximoNivel = Number(
      nivelSeguro.monto_maximo ??
        montoMaximoGlobal,
    );

    const cupoActual = Number(
      perfil.cupo_actual ??
        montoMinimoNivel,
    );

    const montoMinimoPermitido = Math.max(
      montoMinimoGlobal,
      montoMinimoNivel,
    );

    const montoMaximoPermitido = Math.min(
      montoMaximoGlobal,
      montoMaximoNivel,
      cupoActual,
    );

    if (
      monto < montoMinimoPermitido ||
      monto > montoMaximoPermitido
    ) {
      return NextResponse.json(
        {
          error:
            `El monto permitido para tu nivel está entre ${formatearDinero(
              montoMinimoPermitido,
            )} y ${formatearDinero(
              montoMaximoPermitido,
            )}.`,
        },
        {
          status: 400,
        },
      );
    }

    const plazosNivel =
      normalizarPlazos(
        nivelSeguro.plazos_dias,
      );

    const plazosPermitidos =
      plazosNivel.filter(
        (dias) =>
          dias >=
            Number(
              configuracion.plazo_minimo_dias,
            ) &&
          dias <=
            Number(
              configuracion.plazo_maximo_dias,
            ),
      );

    if (
      !plazosPermitidos.includes(
        plazoDias,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El plazo seleccionado no está habilitado para tu nivel.",
        },
        {
          status: 400,
        },
      );
    }

    const [
      resultadoSolicitudesActivas,
      resultadoCreditosActivos,
    ] = await Promise.all([
      supabase
        .from("solicitudes_credito")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("cliente_id", user.id)
        .in("estado", [
          "pendiente",
          "en_revision",
          "aprobada",
        ]),

      supabase
        .from("creditos")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("cliente_id", user.id)
        .in("estado", [
          "pendiente_desembolso",
          "activo",
          "vencido",
        ]),
    ]);

    if (resultadoSolicitudesActivas.error) {
      console.error(
        "Error consultando solicitudes activas:",
        resultadoSolicitudesActivas.error,
      );
    }

    if (resultadoCreditosActivos.error) {
      console.error(
        "Error consultando créditos activos:",
        resultadoCreditosActivos.error,
      );
    }

    const operacionesActivas =
      Number(
        resultadoSolicitudesActivas.count ??
          0,
      ) +
      Number(
        resultadoCreditosActivos.count ??
          0,
      );

    if (
      operacionesActivas >=
      Number(
        configuracion.maximo_creditos_activos,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Ya tienes el máximo de operaciones activas permitido.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * La API no recibe intereses, costos, IVA ni total
     * desde el navegador. La función SQL debe calcularlos
     * nuevamente utilizando la configuración del nivel.
     */
    const { data, error } = await supabase.rpc(
      "crear_solicitud_credito",
      {
        p_monto: monto,
        p_plazo_dias: plazoDias,
        p_observacion:
          observacion || null,
      },
    );

    if (error) {
      console.error(
        "Error creando solicitud:",
        error,
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "No fue posible crear la solicitud.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        solicitudId: data,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Error interno registrando solicitud:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No fue posible registrar la solicitud.",
      },
      {
        status: 500,
      },
    );
  }
}

function normalizarPlazos(
  valor: unknown,
): number[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return [
    ...new Set(
      valor
        .map(Number)
        .filter(
          (dias) =>
            Number.isInteger(dias) &&
            dias > 0,
        ),
    ),
  ].sort((a, b) => a - b);
}

function formatearDinero(
  valor: number,
) {
  return new Intl.NumberFormat(
    "es-CO",
    {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    },
  ).format(valor);
}
