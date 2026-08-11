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
  | "desactivar"
  | "cambiar_rol";

type RolAdministrativo =
  | "analista"
  | "administrador"
  | "superadministrador";

type Body = {
  accion?: Accion;
  motivo?: string;
  nuevoRol?: RolAdministrativo;
};

const ACCIONES_VALIDAS: Accion[] = [
  "activar",
  "bloquear",
  "desactivar",
  "cambiar_rol",
];

const ROLES_VALIDOS: RolAdministrativo[] = [
  "analista",
  "administrador",
  "superadministrador",
];

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
            "El identificador del usuario no es válido.",
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

    if (
      !body.accion ||
      !ACCIONES_VALIDAS.includes(body.accion)
    ) {
      return NextResponse.json(
        {
          error: "La acción indicada no es válida.",
        },
        {
          status: 400,
        },
      );
    }

    const motivo = String(body.motivo ?? "").trim();

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

    let nuevoRol: RolAdministrativo | null = null;

    if (body.accion === "cambiar_rol") {
      if (
        !body.nuevoRol ||
        !ROLES_VALIDOS.includes(body.nuevoRol)
      ) {
        return NextResponse.json(
          {
            error:
              "El nuevo rol administrativo no es válido.",
          },
          {
            status: 400,
          },
        );
      }

      nuevoRol = body.nuevoRol;
    }

    const { data, error } = await supabase.rpc(
      "gestionar_usuario_administrativo",
      {
        p_usuario_id: id,
        p_accion: body.accion,
        p_motivo: motivo,
        p_nuevo_rol: nuevoRol,
      },
    );

    if (error) {
      console.error(
        "Error gestionando usuario administrativo:",
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
      auditoriaId: data,
    });
  } catch (error) {
    console.error(
      "Error interno gestionando usuario:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No fue posible gestionar el usuario administrativo.",
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
