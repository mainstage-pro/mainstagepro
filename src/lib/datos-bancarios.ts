// Los datos para hacer el depósito viven en tres catálogos distintos (Proveedor,
// Tecnico, PersonalInterno) con nombres de columna heredados que no coinciden.
// Aquí se normalizan a una sola forma para que las pantallas de pago no tengan
// que saber de qué catálogo salió el acreedor.

export interface DatosBancarios {
  banco: string | null;
  titular: string | null;
  cuenta: string | null;
  clabe: string | null;
  tarjeta: string | null;
  rfc: string | null;
}

export const SELECT_BANCARIOS_PROVEEDOR = {
  banco: true,
  titularCuenta: true,
  cuentaBancaria: true,
  clabe: true,
  noTarjeta: true,
  rfc: true,
} as const;

export const SELECT_BANCARIOS_TECNICO = {
  banco: true,
  titularCuenta: true,
  cuentaBancaria: true,
  clabe: true,
  noTarjeta: true,
  datosFiscales: true,
} as const;

export const SELECT_BANCARIOS_PERSONAL = {
  banco: true,
  titularCuenta: true,
  numeroCuenta: true,
  cuentaBancaria: true,
  clabe: true,
  numeroTarjeta: true,
  rfc: true,
} as const;

type CamposBancarios = Partial<{
  banco: string | null;
  titularCuenta: string | null;
  cuentaBancaria: string | null;
  numeroCuenta: string | null;
  clabe: string | null;
  noTarjeta: string | null;
  numeroTarjeta: string | null;
  rfc: string | null;
  datosFiscales: string | null;
}>;

const limpio = (v: string | null | undefined) => {
  const s = v?.trim();
  return s ? s : null;
};

export function datosBancarios(origen: CamposBancarios | null | undefined): DatosBancarios | null {
  if (!origen) return null;
  const datos: DatosBancarios = {
    banco: limpio(origen.banco),
    titular: limpio(origen.titularCuenta),
    // `cuentaBancaria` es el campo viejo de texto libre; solo se usa si no hay
    // número de cuenta capturado aparte.
    cuenta: limpio(origen.numeroCuenta) ?? limpio(origen.cuentaBancaria),
    clabe: limpio(origen.clabe),
    tarjeta: limpio(origen.numeroTarjeta) ?? limpio(origen.noTarjeta),
    rfc: limpio(origen.rfc) ?? limpio(origen.datosFiscales),
  };
  return Object.values(datos).some(Boolean) ? datos : null;
}

/** A dónde se va a capturar o corregir lo que falta. */
export function fichaAcreedorHref(tipoAcreedor: string, acreedorId: string | null): string | null {
  if (!acreedorId) return null;
  if (tipoAcreedor === "PROVEEDOR") return `/catalogo/proveedores/${acreedorId}`;
  if (tipoAcreedor === "TECNICO") return "/catalogo/tecnicos";
  if (tipoAcreedor === "PERSONAL_INTERNO") return `/rrhh/personal/${acreedorId}`;
  return null;
}

export function textoParaCompartir(datos: DatosBancarios, nombre?: string | null): string {
  const lineas = [
    nombre ? `${nombre}` : null,
    datos.titular ? `Titular: ${datos.titular}` : null,
    datos.banco ? `Banco: ${datos.banco}` : null,
    datos.clabe ? `CLABE: ${datos.clabe}` : null,
    datos.cuenta ? `Cuenta: ${datos.cuenta}` : null,
    datos.tarjeta ? `Tarjeta: ${datos.tarjeta}` : null,
    datos.rfc ? `RFC: ${datos.rfc}` : null,
  ].filter(Boolean);
  return lineas.join("\n");
}
