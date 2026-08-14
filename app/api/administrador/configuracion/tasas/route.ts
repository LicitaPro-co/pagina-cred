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

const PLAZOS_PERMITIDOS = [2, 4, 6, 8, 10];

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
      body.tasas.length !== PLAZOS_PERMITIDOS.length
    ) {
      return NextResponse.json(
        {
          error:
            "Debes enviar la configuración completa de tasas.",
        },
        {
          status: 400,
        },
      );
    }

    const tasasNormalizadas = body.tasas.map(
      (registro) => ({
        plazoDias: Number(
          registro.plazoDias,
        ),
        tasaInteresEa: Number(
          registro.tasaInteresEa,
        ),
      }),
    );

    for (const registro of tasasNormalizadas) {
      if (
        !PLAZOS_PERMITIDOS.includes(
          registro.plazoDias,
        )
      ) {
        return NextResponse.json(
          {
            error: `El plazo ${registro.plazoDias} días no está permitido.`,
          },
          {
            status: 400,
          },
        );
      }

      if (
        !Number.isFinite(
          registro.tasaInteresEa,
        ) ||
        registro.tasaInteresEa < 0 ||
        registro.tasaInteresEa > 100
      ) {
        return NextResponse.json(
          {
            error: `La tasa para ${registro.plazoDias} días no es válida.`,
          },
          {
            status: 400,
          },
        );
      }
    }

    const plazosRecibidos = tasasNormalizadas
      .map(
        (registro) =>
          registro.plazoDias,
      )
      .sort((a, b) => a - b);

    const plazosEsperados = [
      ...PLAZOS_PERMITIDOS,
    ].sort((a, b) => a - b);

    if (
      JSON.stringify(plazosRecibidos) !==
      JSON.stringify(plazosEsperados)
    ) {
      return NextResponse.json(
        {
          error:
            "La configuración debe incluir exactamente los plazos 2, 4, 6, 8 y 10 días.",
        },
        {
          status: 400,
        },
      );
    }

    const ordenadas = [
      ...tasasNormalizadas,
    ].sort(
      (a, b) =>
        a.plazoDias - b.plazoDias,
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
        return NextResponse.json(
          {
            error:
              "Las tasas deben ser iguales o progresivas a medida que aumenta el plazo.",
          },
          {
            status: 400,
          },
        );
      }
    }

    for (const registro of tasasNormalizadas) {
      const { error } = await supabase
        .from("tasas_credito_plazo")
        .update({
          tasa_interes_ea:
            registro.tasaInteresEa,
          actualizado_en:
            new Date().toISOString(),
        })
        .eq(
          "plazo_dias",
          registro.plazoDias,
        )
        .eq("activo", true);

      if (error) {
        console.error(
          "Error actualizando tasa:",
          registro,
          error,
        );

        return NextResponse.json(
          {
            error:
              "No fue posible actualizar las tasas.",
          },
          {
            status: 400,
          },
        );
      }
    }

    return NextResponse.json({
      ok: true,
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
