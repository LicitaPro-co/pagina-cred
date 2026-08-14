import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type TasaEntrada = {
  plazoDias?: number;
  tasaInteresEa?: number;
};

type Body = {
  tasas?: TasaEntrada[];
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
            "No tienes autorización para modificar las tasas.",
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

    const motivo = String(
      body.motivo ?? "",
    ).trim();

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
      !Array.isArray(body.tasas) ||
      body.tasas.length !== 5
    ) {
      return NextResponse.json(
        {
          error:
            "Debes enviar exactamente cinco tasas.",
        },
        {
          status: 400,
        },
      );
    }

    const tasas = body.tasas.map(
      (registro) => ({
        plazoDias: Number(
          registro.plazoDias,
        ),
        tasaInteresEa: Number(
          registro.tasaInteresEa,
        ),
      }),
    );

    const { data, error } = await supabase.rpc(
      "actualizar_tasas_credito_plazo",
      {
        p_tasas: tasas,
        p_motivo: motivo,
      },
    );

    if (error) {
      console.error(
        "Error actualizando tasas:",
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
      actualizado: Boolean(data),
    });
  } catch (error) {
    console.error(
      "Error interno actualizando tasas:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No fue posible actualizar las tasas.",
      },
      {
        status: 500,
      },
    );
  }
}
