import { redirect } from "next/navigation";

import SimuladorCredito from "@/components/credito/simulador-credito";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ConfiguracionPublica = {
  monto_minimo_global: number | string;
  monto_maximo_global: number | string;
  plazo_minimo_dias: number;
  plazo_maximo_dias: number;
  maximo_creditos_activos: number;
  plataforma_activa: boolean;
  modo_mantenimiento: boolean;
  tasa_validada_juridicamente: boolean;
};

export default async function SolicitarCreditoPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: errorUsuario,
  } = await supabase.auth.getUser();

  if (errorUsuario || !user) {
    redirect("/iniciar-sesion");
  }

  const {
    data: perfil,
    error: errorPerfil,
  } = await supabase
    .from("perfiles")
    .select(`
      id,
      nombres,
      apellidos,
      rol,
      estado,
      nivel,
      cupo_actual,
      perfil_completo
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (errorPerfil || !perfil) {
    console.error(
      "Error cargando el perfil:",
      errorPerfil,
    );

    return (
      <MensajePagina
        titulo="Perfil no encontrado"
        descripcion="No fue posible cargar la información de tu perfil."
      />
    );
  }

  if (
    perfil.rol !== "cliente" ||
    perfil.estado !== "activo"
  ) {
    redirect("/");
  }

  if (!perfil.perfil_completo) {
    redirect("/cliente/perfil");
  }

  const numeroNivel = Number(
    perfil.nivel ?? 1,
  );

  /*
   * Cargamos:
   * - nivel;
   * - configuración global;
   * - tasas vigentes por plazo.
   */
  const [
    resultadoNivel,
    resultadoConfiguracion,
    resultadoTasas,
  ] = await Promise.all([
    supabase
      .from("niveles_credito")
      .select(`
        id,
        numero_nivel,
        nombre,
        monto_minimo,
        monto_maximo,
        incremento_monto,
        plazos_dias,
        modalidad_credito,
        porcentaje_costo,
        valor_costo_fijo,
        porcentaje_iva,
        activo
      `)
      .eq(
        "numero_nivel",
        numeroNivel,
      )
      .eq("activo", true)
      .maybeSingle(),

    supabase.rpc(
      "obtener_configuracion_publica_credito",
    ),

    supabase
      .from("tasas_credito_plazo")
      .select(`
        plazo_dias,
        tasa_interes_ea,
        fecha_inicio_vigencia
      `)
      .eq("activo", true)
      .lte(
        "fecha_inicio_vigencia",
        new Date()
          .toISOString()
          .slice(0, 10),
      )
      .order("plazo_dias", {
        ascending: true,
      }),
  ]);

  const nivel =
    resultadoNivel.data;

  if (
    resultadoNivel.error ||
    !nivel
  ) {
    console.error(
      "Error cargando el nivel:",
      resultadoNivel.error,
    );

    return (
      <MensajePagina
        titulo="Nivel de crédito no disponible"
        descripcion="No fue posible cargar la configuración de tu nivel de crédito."
      />
    );
  }

  if (
    resultadoConfiguracion.error ||
    !resultadoConfiguracion.data
  ) {
    console.error(
      "Error cargando la configuración global:",
      resultadoConfiguracion.error,
    );

    return (
      <MensajePagina
        titulo="Configuración no disponible"
        descripcion="No fue posible cargar las condiciones generales del crédito."
      />
    );
  }

  if (resultadoTasas.error) {
    console.error(
      "Error cargando tasas por plazo:",
      resultadoTasas.error,
    );

    return (
      <MensajePagina
        titulo="Tasas no disponibles"
        descripcion="No fue posible cargar las condiciones de los plazos disponibles."
      />
    );
  }

  const configuracionPublica =
    resultadoConfiguracion.data as ConfiguracionPublica;

  /*
   * Normalizamos las tasas vigentes.
   */
  const tasasPorPlazo = (
    resultadoTasas.data ?? []
  )
    .map((tasa) => ({
      plazo_dias: Number(
        tasa.plazo_dias,
      ),
      tasa_interes_ea: Number(
        tasa.tasa_interes_ea,
      ),
    }))
    .filter(
      (tasa) =>
        Number.isInteger(
          tasa.plazo_dias,
        ) &&
        tasa.plazo_dias > 0 &&
        Number.isFinite(
          tasa.tasa_interes_ea,
        ) &&
        tasa.tasa_interes_ea >= 0,
    );

  /*
   * Los plazos visibles deben existir:
   * - en el nivel;
   * - en configuración global;
   * - en tasas_credito_plazo.
   */
  const plazosConTasa = new Set(
    tasasPorPlazo.map(
      (tasa) => tasa.plazo_dias,
    ),
  );

  const plazosNivel =
    Array.isArray(
      nivel.plazos_dias,
    ) &&
    nivel.plazos_dias.length > 0
      ? nivel.plazos_dias
          .map(Number)
          .filter(
            (dias) =>
              Number.isInteger(
                dias,
              ) &&
              dias >=
                Number(
                  configuracionPublica.plazo_minimo_dias,
                ) &&
              dias <=
                Number(
                  configuracionPublica.plazo_maximo_dias,
                ) &&
              plazosConTasa.has(
                dias,
              ),
          )
          .sort(
            (a, b) => a - b,
          )
      : [];

  if (
    plazosNivel.length === 0
  ) {
    return (
      <MensajePagina
        titulo="Plazos no disponibles"
        descripcion="Actualmente no existen plazos con una tasa vigente para tu nivel."
      />
    );
  }

  /*
   * Solo enviamos al navegador las tasas
   * correspondientes a plazos realmente
   * habilitados.
   */
  const tasasDisponibles =
    tasasPorPlazo.filter(
      (tasa) =>
        plazosNivel.includes(
          tasa.plazo_dias,
        ),
    );

  const {
    data: cuenta,
    error: errorCuenta,
  } = await supabase
    .from("cuentas_desembolso")
    .select(`
      id,
      proveedor,
      metodo_desembolso,
      tipo_cuenta,
      numero_cuenta,
      tipo_llave,
      valor_llave,
      titular
    `)
    .eq(
      "cliente_id",
      user.id,
    )
    .eq("activa", true)
    .eq(
      "es_principal",
      true,
    )
    .order("creado_en", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (errorCuenta) {
    console.error(
      "Error cargando el medio de desembolso:",
      errorCuenta,
    );
  }

  const [
    resultadoSolicitudActiva,
    resultadoCreditoActivo,
  ] = await Promise.all([
    supabase
      .from(
        "solicitudes_credito",
      )
      .select(`
        id,
        estado
      `)
      .eq(
        "cliente_id",
        user.id,
      )
      .in("estado", [
        "pendiente",
        "en_revision",
        "aprobada",
      ])
      .order(
        "fecha_solicitud",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle(),

    supabase
      .from("creditos")
      .select(`
        id,
        estado
      `)
      .eq(
        "cliente_id",
        user.id,
      )
      .in("estado", [
        "pendiente_desembolso",
        "activo",
        "vencido",
      ])
      .order("creado_en", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),
  ]);

  if (
    resultadoSolicitudActiva.error
  ) {
    console.error(
      "Error consultando la solicitud activa:",
      resultadoSolicitudActiva.error,
    );
  }

  if (
    resultadoCreditoActivo.error
  ) {
    console.error(
      "Error consultando el crédito activo:",
      resultadoCreditoActivo.error,
    );
  }

  const solicitudActiva =
    resultadoSolicitudActiva.data;

  const creditoActivo =
    resultadoCreditoActivo.data;

  const operacionActiva =
    solicitudActiva
      ? {
          id: String(
            solicitudActiva.id,
          ),
          estado: String(
            solicitudActiva.estado,
          ),
          tipo:
            "solicitud" as const,
        }
      : creditoActivo
        ? {
            id: String(
              creditoActivo.id,
            ),
            estado: String(
              creditoActivo.estado,
            ),
            tipo:
              "credito" as const,
          }
        : null;

  const nombreCompleto = [
    perfil.nombres,
    perfil.apellidos,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SimuladorCredito
      nombre={nombreCompleto}
      nivel={{
        id: String(
          nivel.id,
        ),
        numero_nivel: Number(
          nivel.numero_nivel,
        ),
        nombre: String(
          nivel.nombre ??
            `Nivel ${numeroNivel}`,
        ),
        monto_minimo: Number(
          nivel.monto_minimo ??
            20000,
        ),
        monto_maximo: Number(
          nivel.monto_maximo ??
            20000,
        ),
        incremento_monto: Number(
          nivel.incremento_monto ??
            10000,
        ),
        plazos_dias:
          plazosNivel,
        modalidad_credito:
          String(
            nivel.modalidad_credito ??
              "consumo",
          ),
        porcentaje_costo:
          Number(
            nivel.porcentaje_costo ??
              0,
          ),
        valor_costo_fijo:
          Number(
            nivel.valor_costo_fijo ??
              0,
          ),
        porcentaje_iva:
          Number(
            nivel.porcentaje_iva ??
              0,
          ),
      }}
      tasasPorPlazo={
        tasasDisponibles
      }
      configuracion={{
        monto_minimo_global:
          Number(
            configuracionPublica.monto_minimo_global ??
              20000,
          ),
        monto_maximo_global:
          Number(
            configuracionPublica.monto_maximo_global ??
              150000,
          ),
        plazo_minimo_dias:
          Number(
            configuracionPublica.plazo_minimo_dias ??
              2,
          ),
        plazo_maximo_dias:
          Number(
            configuracionPublica.plazo_maximo_dias ??
              10,
          ),
        plataforma_activa:
          Boolean(
            configuracionPublica.plataforma_activa,
          ),
        modo_mantenimiento:
          Boolean(
            configuracionPublica.modo_mantenimiento,
          ),
      }}
      cupoActual={Number(
        perfil.cupo_actual ??
          nivel.monto_minimo ??
          configuracionPublica.monto_minimo_global ??
          20000,
      )}
      cuenta={
        cuenta
          ? {
              id: String(
                cuenta.id,
              ),
              proveedor:
                cuenta.proveedor,
              metodo_desembolso:
                cuenta.metodo_desembolso,
              tipo_cuenta:
                cuenta.tipo_cuenta,
              numero_cuenta:
                cuenta.numero_cuenta,
              tipo_llave:
                cuenta.tipo_llave,
              valor_llave:
                cuenta.valor_llave,
              titular:
                cuenta.titular,
            }
          : null
      }
      operacionActiva={
        operacionActiva
      }
    />
  );
}

function MensajePagina({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <main className="min-h-screen bg-[#fff8ee] px-5 py-12">
      <section className="mx-auto max-w-xl rounded-[30px] border border-[#eadfce] bg-white p-8 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
          Página Cred
        </p>

        <h1 className="mt-4 text-3xl font-black text-slate-900">
          {titulo}
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          {descripcion}
        </p>
      </section>
    </main>
  );
}
