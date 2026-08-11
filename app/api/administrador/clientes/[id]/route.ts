import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type Contexto = {
  params: Promise<{
    id: string;
  }>;
};

type Accion =
  | "activar"
  | "bloquear"
  | "desbloquear"
  | "cambiar_cupo"
  | "cambiar_nivel";

type Body = {
  accion?: Accion;
  motivo?: string;
  nuevoCupo?: number;
  nuevoNivel?: number;
};

export async function PATCH(
  request: Request,
  contexto: Contexto,
) {
  try {
    const { id } = await contexto.params;

    if (!esUuidValido(id)) {
      return NextResponse.json(
        {
          error:
            "El identificador del cliente no es válido.",
        },
        {
          status: 400,
        },
      );
    }

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

    let body: Body;

    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json(
        {
          error:
            "La información enviada no es válida.",
        },
        {
          status: 400,
        },
      );
    }

    const accionesValidas: Accion[] = [
      "activar",
      "bloquear",
      "desbloquear",
      "cambiar_cupo",
      "cambiar_nivel",
    ];

    if (
      !body.accion ||
      !accionesValidas.includes(body.accion)
    ) {
      return NextResponse.json(
        {
          error:
            "La acción indicada no es válida.",
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
            "Debes registrar el motivo de la acción.",
        },
        {
          status: 400,
        },
      );
    }

    let nuevoCupo: number | null = null;
    let nuevoNivel: number | null = null;

    if (body.accion === "cambiar_cupo") {
      nuevoCupo = Number(body.nuevoCupo);

      if (
        !Number.isFinite(nuevoCupo) ||
        nuevoCupo < 0
      ) {
        return NextResponse.json(
          {
            error:
              "El nuevo cupo no es válido.",
          },
          {
            status: 400,
          },
        );
      }
    }

    if (body.accion === "cambiar_nivel") {
      nuevoNivel = Number(body.nuevoNivel);

      if (
        !Number.isInteger(nuevoNivel) ||
        nuevoNivel < 1
      ) {
        return NextResponse.json(
          {
            error:
              "El nuevo nivel no es válido.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const { data, error } = await supabase.rpc(
      "gestionar_cliente_administrativo",
      {
        p_cliente_id: id,
        p_accion: body.accion,
        p_motivo: motivo,
        p_nuevo_cupo: nuevoCupo,
        p_nuevo_nivel: nuevoNivel,
      },
    );

    if (error) {
      console.error(
        "Error gestionando cliente:",
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
      ajusteId: data,
    });
  } catch (error) {
    console.error(
      "Error interno gestionando cliente:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No fue posible gestionar el cliente.",
      },
      {
        status: 500,
      },
    );
  }
}

function esUuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}
