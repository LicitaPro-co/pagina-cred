import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Contexto = {
  params: Promise<{
    id: string;
  }>;
};

type Accion =
  | "revisar"
  | "aprobar"
  | "rechazar"
  | "desembolsar";

type Body = {
  accion?: Accion;
  observacion?: string;
  referenciaDesembolso?: string;
};

export async function PATCH(
  request: Request,
  contexto: Contexto,
) {
  try {
    const { id } = await contexto.params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Debes iniciar sesión.",
        },
        {
          status: 401,
        },
      );
    }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select(`
        rol,
        estado
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (
      !perfil ||
      perfil.estado !== "activo" ||
      ![
        "analista",
        "administrador",
        "superadministrador",
      ].includes(perfil.rol)
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes autorización para gestionar solicitudes.",
        },
        {
          status: 403,
        },
      );
    }

    const body = (await request.json()) as Body;

    const accionesValidas: Accion[] = [
      "revisar",
      "aprobar",
      "rechazar",
      "desembolsar",
    ];

    if (
      !body.accion ||
      !accionesValidas.includes(body.accion)
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

    const { data, error } = await supabase.rpc(
      "gestionar_solicitud_credito",
      {
        p_solicitud_id: id,
        p_accion: body.accion,
        p_observacion:
          body.observacion?.trim() || null,
        p_referencia_desembolso:
          body.referenciaDesembolso?.trim() || null,
      },
    );

    if (error) {
      console.error(
        "Error gestionando solicitud:",
        error.message,
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
      registroId: data,
    });
  } catch (error) {
    console.error(
      "Error interno gestionando la solicitud:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No fue posible gestionar la solicitud.",
      },
      {
        status: 500,
      },
    );
  }
}
