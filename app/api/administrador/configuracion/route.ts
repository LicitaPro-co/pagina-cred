import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type Body = {
  montoMinimo?: number;
  montoMaximo?: number;
  plazoMinimo?: number;
  plazoMaximo?: number;
  maximoCreditosActivos?: number;
  permitePagoAnticipado?: boolean;
  permiteNuevaSolicitud?: boolean;
  requiereRevisionClienteNuevo?: boolean;
  permiteAprobacionAutomatica?: boolean;
  porcentajeMoraEa?: number | null;
  diasGraciaMora?: number;
  plataformaActiva?: boolean;
  modoMantenimiento?: boolean;
  motivo?: string;
};

export async function PATCH(request: Request) {
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

    const { data: administrador } = await supabase
      .from("perfiles")
      .select(`
        rol,
        estado
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (
      !administrador ||
      administrador.estado !== "activo" ||
      ![
        "administrador",
        "superadministrador",
      ].includes(String(administrador.rol))
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes autorización para modificar la configuración.",
        },
        {
          status: 403,
        },
      );
    }

    let body: Body;

    try {
      body = (await request.json()) as Body;
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

    const montoMinimo = Number(body.montoMinimo);
    const montoMaximo = Number(body.montoMaximo);
    const plazoMinimo = Number(body.plazoMinimo);
    const plazoMaximo = Number(body.plazoMaximo);
    const maximoCreditosActivos = Number(
      body.maximoCreditosActivos,
    );
    const diasGraciaMora = Number(
      body.diasGraciaMora ?? 0,
    );

    const motivo = String(body.motivo ?? "").trim();

    if (!motivo) {
      return NextResponse.json(
        {
          error:
            "Debes registrar el motivo del cambio.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(montoMinimo) ||
      montoMinimo <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "El monto mínimo no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(montoMaximo) ||
      montoMaximo < montoMinimo ||
      montoMaximo > 150000
    ) {
      return NextResponse.json(
        {
          error:
            "El monto máximo debe estar entre el monto mínimo y $150.000.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(plazoMinimo) ||
      plazoMinimo < 2
    ) {
      return NextResponse.json(
        {
          error:
            "El plazo mínimo no puede ser inferior a 2 días.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(plazoMaximo) ||
      plazoMaximo > 10 ||
      plazoMaximo < plazoMinimo
    ) {
      return NextResponse.json(
        {
          error:
            "El plazo máximo debe encontrarse entre el plazo mínimo y 10 días.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(maximoCreditosActivos) ||
      maximoCreditosActivos < 1
    ) {
      return NextResponse.json(
        {
          error:
            "La cantidad máxima de créditos activos no es válida.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(diasGraciaMora) ||
      diasGraciaMora < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Los días de gracia no son válidos.",
        },
        {
          status: 400,
        },
      );
    }

    let porcentajeMoraEa: number | null = null;

    if (
      body.porcentajeMoraEa !== null &&
      body.porcentajeMoraEa !== undefined &&
      body.porcentajeMoraEa !== ("" as unknown)
    ) {
      porcentajeMoraEa = Number(
        body.porcentajeMoraEa,
      );

      if (
        !Number.isFinite(porcentajeMoraEa) ||
        porcentajeMoraEa < 0
      ) {
        return NextResponse.json(
          {
            error:
              "El porcentaje de mora no es válido.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const { data, error } = await supabase.rpc(
      "actualizar_configuracion_credito",
      {
        p_monto_minimo: montoMinimo,
        p_monto_maximo: montoMaximo,
        p_plazo_minimo: plazoMinimo,
        p_plazo_maximo: plazoMaximo,
        p_maximo_creditos_activos:
          maximoCreditosActivos,
        p_permite_pago_anticipado:
          Boolean(body.permitePagoAnticipado),
        p_permite_nueva_solicitud:
          Boolean(body.permiteNuevaSolicitud),
        p_requiere_revision_cliente_nuevo:
          Boolean(
            body.requiereRevisionClienteNuevo,
          ),
        p_permite_aprobacion_automatica:
          Boolean(
            body.permiteAprobacionAutomatica,
          ),
        p_porcentaje_mora_ea:
          porcentajeMoraEa,
        p_dias_gracia_mora:
          diasGraciaMora,
        p_plataforma_activa:
          Boolean(body.plataformaActiva),
        p_modo_mantenimiento:
          Boolean(body.modoMantenimiento),
        p_motivo: motivo,
      },
    );

    if (error) {
      console.error(
        "Error actualizando configuración:",
        error,
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      configuracionId: data,
    });
  } catch (error) {
    console.error(
      "Error interno actualizando configuración:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No fue posible actualizar la configuración.",
      },
      {
        status: 500,
      },
    );
  }
}
