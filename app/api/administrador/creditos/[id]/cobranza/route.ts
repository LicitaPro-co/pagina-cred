import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type Contexto = {
  params: Promise<{
    id: string;
  }>;
};

type TipoContacto =
  | "llamada"
  | "whatsapp"
  | "correo"
  | "sms"
  | "visita"
  | "otro";

type ResultadoGestion =
  | "sin_respuesta"
  | "contactado"
  | "compromiso_pago"
  | "pago_reportado"
  | "negativa_pago"
  | "datos_incorrectos"
  | "otro";

type Body = {
  tipoContacto?: TipoContacto;
  resultado?: ResultadoGestion;
  observacion?: string;
  proximaGestion?: string | null;
  valorCompromiso?: number | null;
  fechaCompromiso?: string | null;
};

const TIPOS_CONTACTO_VALIDOS: TipoContacto[] = [
  "llamada",
  "whatsapp",
  "correo",
  "sms",
  "visita",
  "otro",
];

const RESULTADOS_VALIDOS: ResultadoGestion[] = [
  "sin_respuesta",
  "contactado",
  "compromiso_pago",
  "pago_reportado",
  "negativa_pago",
  "datos_incorrectos",
  "otro",
];

export async function POST(
  request: Request,
  contexto: Contexto,
) {
  try {
    const { id } = await contexto.params;

    if (!esUuidValido(id)) {
      return NextResponse.json(
        {
          error:
            "El identificador del crédito no es válido.",
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
      !body.tipoContacto ||
      !TIPOS_CONTACTO_VALIDOS.includes(
        body.tipoContacto,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El tipo de contacto no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !body.resultado ||
      !RESULTADOS_VALIDOS.includes(
        body.resultado,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El resultado de la gestión no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    const observacion = String(
      body.observacion ?? "",
    ).trim();

    if (!observacion) {
      return NextResponse.json(
        {
          error:
            "Debes registrar una observación.",
        },
        {
          status: 400,
        },
      );
    }

    let proximaGestion: string | null = null;

    if (body.proximaGestion) {
      const fecha = new Date(
        body.proximaGestion,
      );

      if (Number.isNaN(fecha.getTime())) {
        return NextResponse.json(
          {
            error:
              "La fecha de próxima gestión no es válida.",
          },
          {
            status: 400,
          },
        );
      }

      proximaGestion =
        fecha.toISOString();
    }

    let valorCompromiso: number | null = null;
    let fechaCompromiso: string | null = null;

    if (
      body.resultado ===
      "compromiso_pago"
    ) {
      valorCompromiso = Number(
        body.valorCompromiso,
      );

      if (
        !Number.isFinite(
          valorCompromiso,
        ) ||
        valorCompromiso <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "El valor del compromiso no es válido.",
          },
          {
            status: 400,
          },
        );
      }

      fechaCompromiso = String(
        body.fechaCompromiso ?? "",
      ).trim();

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          fechaCompromiso,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "La fecha del compromiso no es válida.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "registrar_gestion_cobranza",
      {
        p_credito_id: id,
        p_tipo_contacto:
          body.tipoContacto,
        p_resultado: body.resultado,
        p_observacion: observacion,
        p_proxima_gestion_en:
          proximaGestion,
        p_valor_compromiso:
          valorCompromiso,
        p_fecha_compromiso:
          fechaCompromiso,
      },
    );

    if (error) {
      console.error(
        "Error registrando gestión de cobranza:",
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

    return NextResponse.json(
      {
        ok: true,
        gestionId: data,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Error interno registrando cobranza:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No fue posible registrar la gestión de cobranza.",
      },
      {
        status: 500,
      },
    );
  }
}

function esUuidValido(
  valor: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}
