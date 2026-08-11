import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Contexto = {
  params: Promise<{
    id: string;
  }>;
};

type Body = {
  valor?: number;
  metodo?: string;
  referencia?: string;
  observacion?: string;
  fechaPago?: string;
};

export async function POST(
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
        { error: "Debes iniciar sesión." },
        { status: 401 },
      );
    }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select("rol, estado")
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
        { error: "No tienes autorización." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Body;

    const valor = Number(body.valor);

    if (!Number.isFinite(valor) || valor <= 0) {
      return NextResponse.json(
        { error: "El valor del pago no es válido." },
        { status: 400 },
      );
    }

    if (!body.metodo?.trim()) {
      return NextResponse.json(
        { error: "Selecciona un método de pago." },
        { status: 400 },
      );
    }

    const fechaPago = body.fechaPago
      ? new Date(body.fechaPago).toISOString()
      : new Date().toISOString();

    const { data, error } = await supabase.rpc(
      "registrar_pago_credito",
      {
        p_credito_id: id,
        p_valor: valor,
        p_metodo: body.metodo.trim(),
        p_referencia:
          body.referencia?.trim() || null,
        p_observacion:
          body.observacion?.trim() || null,
        p_fecha_pago: fechaPago,
      },
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        pagoId: data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error registrando pago:", error);

    return NextResponse.json(
      { error: "No fue posible registrar el pago." },
      { status: 500 },
    );
  }
}
