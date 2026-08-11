import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const REPORTES_VALIDOS = [
  "clientes",
  "solicitudes",
  "creditos",
  "pagos",
  "cartera",
  "desembolsos",
  "recaudos",
] as const;

type TipoReporte =
  (typeof REPORTES_VALIDOS)[number];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const tipo = String(
      url.searchParams.get("tipo") ?? "",
    ) as TipoReporte;

    if (!REPORTES_VALIDOS.includes(tipo)) {
      return NextResponse.json(
        {
          error:
            "El tipo de reporte solicitado no es válido.",
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

    const { data: administrador } = await supabase
      .from("perfiles")
      .select("rol, estado")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !administrador ||
      administrador.estado !== "activo" ||
      ![
        "analista",
        "administrador",
        "superadministrador",
      ].includes(String(administrador.rol))
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes autorización para exportar reportes.",
        },
        {
          status: 403,
        },
      );
    }

    const resultado = await obtenerReporte(
      supabase,
      tipo,
    );

    if (resultado.error) {
      console.error(
        `Error generando reporte ${tipo}:`,
        resultado.error,
      );

      return NextResponse.json(
        {
          error:
            "No fue posible consultar la información del reporte.",
        },
        {
          status: 500,
        },
      );
    }

    const filas = resultado.filas;

    if (!filas.length) {
      return NextResponse.json(
        {
          error:
            "No existen registros para exportar.",
        },
        {
          status: 404,
        },
      );
    }

    const csv = convertirCsv(filas);

    const fecha = new Date()
      .toISOString()
      .slice(0, 10);

    return new NextResponse(
      `\uFEFF${csv}`,
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="pagina-cred-${tipo}-${fecha}.csv"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Error interno exportando reporte:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No fue posible generar el reporte.",
      },
      {
        status: 500,
      },
    );
  }
}

async function obtenerReporte(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  tipo: TipoReporte,
): Promise<{
  filas: Record<
    string,
    string | number | boolean | null
  >[];
  error: unknown;
}> {
  if (tipo === "clientes") {
    const { data, error } = await supabase
      .from("perfiles")
      .select(`
        id,
        nombres,
        apellidos,
        correo,
        celular,
        tipo_documento,
        numero_documento,
        departamento,
        ciudad,
        ocupacion,
        ingreso_mensual,
        nivel,
        puntaje,
        cupo_actual,
        creditos_pagados,
        creditos_vencidos,
        estado,
        perfil_completo,
        creado_en
      `)
      .eq("rol", "cliente")
      .order("creado_en", {
        ascending: false,
      });

    return {
      filas: (data ?? []).map((registro) => ({
        id: registro.id,
        nombres: registro.nombres,
        apellidos: registro.apellidos,
        correo: registro.correo,
        celular: registro.celular,
        tipo_documento:
          registro.tipo_documento,
        numero_documento:
          registro.numero_documento,
        departamento: registro.departamento,
        ciudad: registro.ciudad,
        ocupacion: registro.ocupacion,
        ingreso_mensual:
          registro.ingreso_mensual,
        nivel: registro.nivel,
        puntaje: registro.puntaje,
        cupo_actual: registro.cupo_actual,
        creditos_pagados:
          registro.creditos_pagados,
        creditos_vencidos:
          registro.creditos_vencidos,
        estado: registro.estado,
        perfil_completo:
          registro.perfil_completo,
        creado_en: registro.creado_en,
      })),
      error,
    };
  }

  if (tipo === "solicitudes") {
    const { data, error } = await supabase
      .from("solicitudes_credito")
      .select(`
        id,
        cliente_id,
        estado,
        monto_solicitado,
        plazo_dias,
        porcentaje_costo,
        valor_costo_base,
        porcentaje_iva,
        valor_iva,
        valor_total_pagar,
        fecha_solicitud,
        fecha_estimada_pago,
        revisada_en,
        aprobada_en,
        motivo_rechazo
      `)
      .order("fecha_solicitud", {
        ascending: false,
      });

    return {
      filas: (data ?? []).map((registro) => ({
        id: registro.id,
        cliente_id: registro.cliente_id,
        estado: registro.estado,
        monto_solicitado:
          registro.monto_solicitado,
        plazo_dias: registro.plazo_dias,
        porcentaje_costo:
          registro.porcentaje_costo,
        valor_costo_base:
          registro.valor_costo_base,
        porcentaje_iva:
          registro.porcentaje_iva,
        valor_iva: registro.valor_iva,
        valor_total_pagar:
          registro.valor_total_pagar,
        fecha_solicitud:
          registro.fecha_solicitud,
        fecha_estimada_pago:
          registro.fecha_estimada_pago,
        revisada_en: registro.revisada_en,
        aprobada_en: registro.aprobada_en,
        motivo_rechazo:
          registro.motivo_rechazo,
      })),
      error,
    };
  }

  if (
    tipo === "creditos" ||
    tipo === "cartera"
  ) {
    let consulta = supabase
      .from("creditos")
      .select(`
        id,
        solicitud_id,
        cliente_id,
        estado,
        monto_aprobado,
        valor_costo_base,
        valor_iva,
        valor_total_pagar,
        total_pagado,
        saldo_capital,
        saldo_costo,
        saldo_iva,
        saldo_total,
        fecha_aprobacion,
        fecha_desembolso,
        fecha_vencimiento,
        fecha_ultimo_pago,
        fecha_pago_total,
        dias_mora,
        referencia_desembolso
      `)
      .order("fecha_vencimiento", {
        ascending: false,
      });

    if (tipo === "cartera") {
      consulta = consulta.in("estado", [
        "activo",
        "vencido",
        "castigado",
      ]);
    }

    const { data, error } = await consulta;

    return {
      filas: (data ?? []).map((registro) => ({
        id: registro.id,
        solicitud_id: registro.solicitud_id,
        cliente_id: registro.cliente_id,
        estado: registro.estado,
        monto_aprobado:
          registro.monto_aprobado,
        valor_costo_base:
          registro.valor_costo_base,
        valor_iva: registro.valor_iva,
        valor_total_pagar:
          registro.valor_total_pagar,
        total_pagado:
          registro.total_pagado,
        saldo_capital:
          registro.saldo_capital,
        saldo_costo: registro.saldo_costo,
        saldo_iva: registro.saldo_iva,
        saldo_total: registro.saldo_total,
        fecha_aprobacion:
          registro.fecha_aprobacion,
        fecha_desembolso:
          registro.fecha_desembolso,
        fecha_vencimiento:
          registro.fecha_vencimiento,
        fecha_ultimo_pago:
          registro.fecha_ultimo_pago,
        fecha_pago_total:
          registro.fecha_pago_total,
        dias_mora: registro.dias_mora,
        referencia_desembolso:
          registro.referencia_desembolso,
      })),
      error,
    };
  }

  if (tipo === "pagos") {
    const { data, error } = await supabase
      .from("pagos_credito")
      .select(`
        id,
        credito_id,
        cliente_id,
        estado,
        valor_pago,
        abono_capital,
        abono_costo,
        abono_iva,
        metodo,
        referencia,
        fecha_pago,
        observacion,
        registrado_por
      `)
      .order("fecha_pago", {
        ascending: false,
      });

    return {
      filas: (data ?? []).map((registro) => ({
        id: registro.id,
        credito_id: registro.credito_id,
        cliente_id: registro.cliente_id,
        estado: registro.estado,
        valor_pago: registro.valor_pago,
        abono_capital:
          registro.abono_capital,
        abono_costo: registro.abono_costo,
        abono_iva: registro.abono_iva,
        metodo: registro.metodo,
        referencia: registro.referencia,
        fecha_pago: registro.fecha_pago,
        observacion: registro.observacion,
        registrado_por:
          registro.registrado_por,
      })),
      error,
    };
  }

  const categoria =
    tipo === "desembolsos"
      ? "desembolso_credito"
      : "recaudo_credito";

  const { data, error } = await supabase
    .from("movimientos_tesoreria")
    .select(`
      id,
      cuenta_id,
      tipo,
      categoria,
      valor,
      referencia,
      descripcion,
      credito_id,
      pago_id,
      cliente_id,
      registrado_por,
      fecha_movimiento,
      estado
    `)
    .eq("categoria", categoria)
    .order("fecha_movimiento", {
      ascending: false,
    });

  return {
    filas: (data ?? []).map((registro) => ({
      id: registro.id,
      cuenta_id: registro.cuenta_id,
      tipo: registro.tipo,
      categoria: registro.categoria,
      valor: registro.valor,
      referencia: registro.referencia,
      descripcion: registro.descripcion,
      credito_id: registro.credito_id,
      pago_id: registro.pago_id,
      cliente_id: registro.cliente_id,
      registrado_por:
        registro.registrado_por,
      fecha_movimiento:
        registro.fecha_movimiento,
      estado: registro.estado,
    })),
    error,
  };
}

function convertirCsv(
  filas: Record<
    string,
    string | number | boolean | null
  >[],
) {
  const columnas = Object.keys(filas[0]);

  const encabezado = columnas
    .map(escaparCsv)
    .join(",");

  const contenido = filas.map((fila) =>
    columnas
      .map((columna) =>
        escaparCsv(fila[columna]),
      )
      .join(","),
  );

  return [
    encabezado,
    ...contenido,
  ].join("\n");
}

function escaparCsv(
  valor:
    | string
    | number
    | boolean
    | null
    | undefined,
) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  const texto = String(valor).replaceAll(
    '"',
    '""',
  );

  return `"${texto}"`;
}
