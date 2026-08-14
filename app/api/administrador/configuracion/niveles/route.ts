import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type NivelEntrada = {
  numeroNivel?: number;
  nombre?: string;
  montoMaximo?: number;
  incrementoMonto?: number;
  creditosRequeridos?: number;
  puntajeMinimo?: number;
  activo?: boolean;
};

type Body = {
  niveles?: NivelEntrada[];
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
        { error: "Debes iniciar sesión." },
        { status: 401 },
      );
    }

    const { data: administrador } = await supabase
      .from("perfiles")
      .select("rol, estado")
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
            "No tienes autorización para modificar los niveles.",
        },
        { status: 403 },
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
        { status: 400 },
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
        { status: 400 },
      );
    }

    if (
      !Array.isArray(body.niveles) ||
      body.niveles.length !== 5
    ) {
      return NextResponse.json(
        {
          error:
            "Debes enviar exactamente los cinco niveles.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc(
      "actualizar_niveles_credito",
      {
        p_niveles: body.niveles,
        p_motivo: motivo,
      },
    );

    if (error) {
      console.error(
        "Error actualizando niveles:",
        error,
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      actualizado: Boolean(data),
    });
  } catch (error) {
    console.error(
      "Error interno actualizando niveles:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No fue posible actualizar los niveles.",
      },
      { status: 500 },
    );
  }
}
