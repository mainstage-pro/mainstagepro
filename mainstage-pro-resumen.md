# INVENTARIO FUNCIONAL EXHAUSTIVO — Mainstage Pro

## CONTEXTO GENERAL

**Mainstage Pro** es un ERP/CRM especializado para una empresa de producción técnica de eventos. Stack: Next.js App Router, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, tema oscuro con acento dorado `#B3985B`.

- **88 modelos Prisma**
- **156 endpoints API REST**
- **~80 páginas** en el dashboard
- **Flujo central**: Trato → Cotización → Proyecto → Cobro

---

## 1. RUTAS Y PÁGINAS

### DIRECCIÓN (Acceso general)
| Ruta | Propósito |
|------|-----------|
| `/dashboard` | Mi Dashboard personal |
| `/operaciones` | Gestión operativa (tareas del día) |
| `/reportes` | Reportes semanales |
| `/presentaciones` | Presentaciones |
| `/calendario` | Calendario de eventos (mensual) |
| `/admin/usuarios` | Usuarios y accesos (admin) |
| `/admin/actividad` | Log de actividad (admin) |
| `/admin/configuracion` | Configuración global (admin) |
| `/admin/grupos-equipo` | Grupos de equipo (admin) |

### ADMINISTRACIÓN — Finanzas
| Ruta | Propósito |
|------|-----------|
| `/finanzas/cobros-pagos` | CxC y CxP (vista principal) |
| `/finanzas/pagos-personal` | Pagos a personal interno |
| `/finanzas/movimientos` | Movimientos financieros |
| `/finanzas/caja-chica` | Caja chica |
| `/finanzas/gastos-operativos` | Gastos por proyecto |
| `/finanzas/reporte` | Reporte y rentabilidad |
| `/finanzas/flujo` | Flujo proyectado |
| `/finanzas/cuentas` | Cuentas bancarias |
| `/finanzas/cxc` | Cuentas por cobrar (lista) |
| `/finanzas/cxp` | Cuentas por pagar (lista) |
| `/finanzas/categorias` | Categorías financieras |
| `/finanzas/hervam` | Estructura de Capital (HERVAM) |
| `/finanzas/rentabilidad` | Rentabilidad |

### ADMINISTRACIÓN — RRHH
| Ruta | Propósito |
|------|-----------|
| `/rrhh/personal` | Personal interno |
| `/rrhh/personal/[id]` | Detalle persona |
| `/rrhh/nomina` | Nómina |
| `/rrhh/asistencia` | Asistencia |
| `/rrhh/incidencias` | Incidencias (descuentos/reconocimientos) |
| `/rrhh/evaluaciones` | Evaluaciones de desempeño |
| `/rrhh/onboarding` | Onboarding (modelo presente, UI incompleta) |
| `/rrhh/candidatos` | Candidatos ATS |
| `/rrhh/puestos` | Puestos ideales |

### ADMINISTRACIÓN — Inversiones
| Ruta | Propósito |
|------|-----------|
| `/socios` | Socios de activos |
| `/socios/[id]` | Detalle socio |
| `/socios/[id]/contrato` | Contrato de socio |
| `/catalogo/roles` | Tabulador de freelancers |

### MARKETING
| Ruta | Propósito |
|------|-----------|
| `/marketing/calendario` | Calendario de publicaciones |
| `/marketing/kanban` | Pipeline contenido |
| `/marketing/levantamientos` | Levantamientos de contenido por trato |
| `/marketing/metricas` | Métricas orgánicas |
| `/marketing/contenidos` | Tipos de contenido (estrategia) |
| `/marketing/reporte` | Reporte marketing |
| `/marketing/campanas` | Tipos de campaña publicitaria |
| `/marketing/campanas/calendario` | Calendario de campañas |
| `/marketing/meta-ads` | Meta Ads |

### VENTAS — CRM
| Ruta | Propósito |
|------|-----------|
| `/crm/clientes` | Clientes |
| `/crm/clientes/[id]` | Detalle cliente |
| `/prospectos` | Prospectos en frío |
| `/crm/tratos` | Tratos (pipeline) |
| `/crm/tratos/[id]` | Detalle trato + wizard discovery |
| `/crm/pipeline` | Vista Kanban del pipeline |
| `/cotizaciones` | Cotizaciones |
| `/cotizaciones/[id]` | Detalle cotización |
| `/cotizaciones/plantillas` | Plantillas de cotización |
| `/ventas` | Pipeline comisiones |
| `/ventas/metas` | Metas outbound |
| `/ventas/vendedores` | Vendedores |
| `/ventas/reporte` | Reporte comisiones |
| `/ventas/config` | Configuración de comisiones |

### PRODUCCIÓN
| Ruta | Propósito |
|------|-----------|
| `/proyectos` | Lista de proyectos |
| `/proyectos/[id]` | Detalle proyecto (hub central) |
| `/operaciones/ordenes-compra` | Órdenes de compra |
| `/inventario/equipos` | Catálogo de equipos |
| `/inventario/equipos/[id]` | Detalle equipo |
| `/inventario/maestro` | Inventario maestro |
| `/inventario/disponibilidad` | Disponibilidad de equipos por fecha |
| `/inventario/recolecciones` | Recolecciones pendientes |
| `/inventario/mantenimiento` | Mantenimiento |
| `/inventario/checklist` | Checklist semanal de bodega |
| `/inventario/vehiculos` | Vehículos |
| `/inventario/analisis` | Análisis de uso de equipos |
| `/catalogo/empresas` | Empresas |
| `/catalogo/proveedores` | Proveedores |
| `/catalogo/tecnicos` | Técnicos freelance |
| `/catalogo/venues` | Venues |

### DASHBOARDS POR ÁREA (role-based)
`/dashboard/direccion`, `/dashboard/administracion`, `/dashboard/marketing`, `/dashboard/ventas`, `/dashboard/produccion`, `/dashboard/rrhh`

---

## 2. SCHEMA DE BASE DE DATOS — 88 Modelos

### 2.1 Usuarios y Acceso
```
User: id, name, email, password, role (ADMIN|USER|READONLY), area, active
  ├─ Áreas: DIRECCION | ADMINISTRACION | MARKETING | VENTAS | PRODUCCION | GENERAL
  └─ Relaciones: tratos, proyectos, cotizaciones, bitacoras, comisionesPagos, moduloAccesos, tareas

ActividadUsuario: userId, accion (CREAR|EDITAR|ELIMINAR|APROBAR|ENVIAR|VER), entidad, entidadId, datos (JSON)

VersionHistorial: entidad, entidadId, userId, snapshot (JSON), nota
  └─ Auditoría de cambios en proyectos y cotizaciones

ModuloAcceso: moduloKey, userId
  └─ Control granular de permisos por módulo

AppConfig: key (unique), value, section, label, type (text|number|boolean|select)
Notificacion: userId, tipo, contenido, enlace, leida
```

### 2.2 CRM — Clientes y Tratos
```
Cliente: id, nombre, empresa, tipoCliente (B2B|B2C|POR_DESCUBRIR), clasificacion (NUEVO|BASIC|REGULAR|PRIORITY)
  ├─ Contacto: telefono, correo
  ├─ servicioUsual (RENTA|PRODUCCION_TECNICA|DIRECCION_TECNICA)
  └─ Relaciones: tratos, cotizaciones, proyectos, cuentasCobrar, movimientos, preciosEquipos

Trato: id, clienteId, tipoEvento (MUSICAL|SOCIAL|EMPRESARIAL|OTRO), tipoLead (INBOUND|OUTBOUND)
  ├─ Etapas: DESCUBRIMIENTO → OPORTUNIDAD → VENTA_CERRADA | VENTA_PERDIDA
  ├─ Origen lead: META_ADS|GOOGLE_ADS|ORGANICO|RECOMPRA|REFERIDO|PROSPECCION
  ├─ Descubrimiento: nombreEvento, asistentesEstimados, serviciosInteres (JSON), ideasReferencias
  ├─ Logística estimada: lugarEstimado, fechaEventoEstimada, presupuestoEstimado, ventanaMontaje
  ├─ Prospección: canalAtencion, continuarPor, rutaEntrada (DESCUBRIR|RIDER_DIRECTO), proximaAccion
  ├─ Form discovery: formToken, formEstado (NO_ENVIADO|ENVIADO|COMPLETADO), formRespuestas (JSON)
  ├─ Trade: tradeCalificado, tradeNivel (1|2|3), familyAndFriends, realizarRender
  ├─ Nurturing: tipoProspecto (ACTIVO|NURTURING), nurturingData (JSON)
  ├─ Vendedores: vendedorOrigen, vendedor, responsable
  └─ Relaciones: cotizaciones[], proyecto (1-to-1), archivos[], levantamientoContenido (1-to-1)

TratoArchivo: tratoId, nombre, url, tipo (IMAGEN|DOCUMENTO|REFERENCIA|OTRO), subidoPor
```

### 2.3 Cotizaciones
```
Cotizacion: id, numeroCotizacion (unique), version, opcionLetra (A/B/C...), grupoId
  ├─ Estado: BORRADOR|ENVIADA|EN_REVISION|AJUSTE_SOLICITADO|REENVIADA|APROBADA|RECHAZADA|VENCIDA
  ├─ Evento: nombreEvento, tipoEvento, tipoServicio (RENTA|PRODUCCION_TECNICA|DIRECCION_TECNICA)
  │          fechaEvento, lugarEvento
  ├─ Jornada: tipoJornada (CORTA|MEDIA|LARGA), horasOperacion
  ├─ Duración: diasEquipo, diasOperacion, diasTransporte, diasHospedaje, diasComidas
  ├─ Precios:
  │  ├─ Equipos: subtotalEquiposBruto → descuentos → subtotalEquiposNeto
  │  ├─ Servicios: paquetes, terceros, operacion, transporte, comidas, hospedaje
  │  ├─ Descuentos: volumen%, B2B%, multidia%, patrocinio%, especial%, familyFriends%, fijo$
  │  ├─ Totales: total, aplicaIva, montoIva, granTotal
  │  └─ Estimaciones: costosTotalesEstimados, utilidadEstimada, porcentajeUtilidad
  ├─ Trade: mainstageTradeData (JSON: activo, pct, entregables[], checklist[], nivelSeleccionado)
  ├─ Plan de pagos: planPagos (JSON: [{pct, concepto, fecha}...])
  ├─ Jornadas plan: jornadasPlan (JSON: JornadaPlan[])
  ├─ Zona: LOCAL|BAJIO|NACIONAL
  ├─ Aprobación: aprobacionToken, aprobacionFecha, aprobacionNombre, vigenciaDias
  └─ Líneas: CotizacionLinea[]

CotizacionLinea: id, cotizacionId, tipo
  ├─ Tipos: EQUIPO_PROPIO|EQUIPO_EXTERNO|PAQUETE|OPERACION_TECNICA|TRANSPORTE|HOSPEDAJE|
  │         COMIDA|DJ|DESCUENTO_BENEFICIO|OTRO
  ├─ Referencia: equipoId, rolTecnicoId, proveedorId
  ├─ Detalle: descripcion, marca, modelo, nivel (AAA|AA|A), jornada
  └─ Precios: cantidad, dias, precioUnitario, costoUnitario, costoExterno, subtotal, esExterno

PlantillaCotizacion: nombre, tipoServicio, tipoEvento, capacidadMin, capacidadMax
  └─ PlantillaCotizacionLinea[]
```

### 2.4 Proyectos
```
Proyecto: id, numeroProyecto (unique), tratoId, cotizacionId, clienteId, encargadoId
  ├─ Estado: PLANEACION|CONFIRMADO|EN_CURSO|COMPLETADO|CANCELADO
  ├─ Evento: nombre, tipoEvento, tipoServicio, fechaEvento, horaInicio, horaFin
  ├─ Montaje: fechaMontaje, horaInicioMontaje, duracionMontajeHrs, horaTerminoMontaje
  ├─ Logística: lugarEvento, transportes, proveedorCatering, contactosEmergencia
  ├─ Contactos: encargadoLugar, encargadoLugarContacto, encargadoCliente, encargadoClienteContacto
  ├─ Documentación: descripcionGeneral, detallesEspecificos, cronograma, contactosDireccion
  ├─ Renta: logisticaRenta (JSON)
  │  ├─ Recolección: recoleccionStatus (NO_APLICA|PENDIENTE|EN_CAMINO|COMPLETADA)
  │  └─ Protocolos: protocoloEntrada (JSON), protocoloSalida (JSON)
  ├─ Personal: choferNombre, choferExterno, choferCosto
  ├─ Marketing: marketingData (JSON)
  ├─ Responsables: responsables (JSON: {produccion, logistica, finanzas, marketing})
  ├─ Subarrendos: proveedoresRenta (JSON), equiposRiderExtra (JSON)
  ├─ Zona: LOCAL|BAJIO|NACIONAL
  ├─ Portal cliente: portalToken, notasPortal
  └─ Catering: reporteCatering (JSON: {contactoNombre, contactoTelefono, personasCrew, comidas[], notas})

ProyectoPersonal: proyectoId, tecnicoId, rolTecnicoId
  ├─ participacion, fechaJornada, nivel (AAA|AA|A), jornada (CORTA|MEDIA|LARGA)
  ├─ confirmado, confirmToken (link WhatsApp para confirmar)
  └─ tarifaAcordada, estadoPago (PENDIENTE|PAGADO)

ProyectoEquipo: proyectoId, equipoId, tipo (PROPIO|EXTERNO)
  ├─ cantidad, dias, costoExterno
  ├─ proveedorId, confirmDisponible, confirmToken
  └─ riderAccesorios[]

RiderAccesorio: proyectoEquipoId, nombre, cantidad, categoria, completado, esSugerencia

ProyectoChecklist: proyectoId, tipo (OPERACION|RIDER), item, completado, completadoPor

ProyectoArchivo: proyectoId, tipo (RENDER|PLOT_PATCH|INPUT_LIST|RIDER|ITINERARIO|DOCUMENTO|OTRO)

ProyectoBitacora: proyectoId, usuarioId, tipo (NOTA|CAMBIO|ALERTA|ACCION), contenido

CierreFinanciero: proyectoId (1-to-1) — resumen costos reales vs estimados
```

### 2.5 Catálogos — Equipos
```
Equipo: id, categoriaId, subcategoria, marca, modelo, descripcion
  ├─ cantidadTotal, tipo (PROPIO|EXTERNO), estado (ACTIVO|EN_MANTENIMIENTO|DADO_DE_BAJA)
  ├─ precioRenta, costoProveedor, costoInternoEstimado
  ├─ amperajeRequerido, voltajeRequerido
  ├─ imagenUrl, imagenesUrls (JSON), proveedorDefaultId
  └─ Relaciones: unidades[], mantenimientos[], accesorios[], preciosClientes[]

CategoriaEquipo: nombre, orden

EquipoAccesorio: equipoId, nombre, categoria (cable|herramienta|consumible|soporte|otro)

EquipoUnidad: equipoId, codigo, estado — tracking por número de serie

MantenimientoEquipo: equipoId, unidadId, fecha, tipo (PREVENTIVO|CORRECTIVO|ESTETICO|FUNCIONAL)
  └─ accionRealizada, estadoEquipo, proximoMantenimiento, fotoEvidencia

PrecioClienteEquipo: clienteId, equipoId — precios especiales por cliente

PlantillaEquipo: nombre, tipoServicio, tipoEvento, capacidadMin, capacidadMax
  └─ PlantillaEquipoItem: equipoId, cantidad, esOpcional
```

### 2.6 Catálogos — Personal Técnico
```
Tecnico: id, nombre, celular, rolId, nivel (AAA|AA|A)
  ├─ disp (JSON: {YYYY-MM-DD: false}) — bloqueo de fechas
  ├─ tarifa (base), ubicacion, zonaHabitual (LOCAL|BAJIO|NACIONAL)
  ├─ evaluacionPromedio, cuentaBancaria, datosFiscales
  └─ habilidades (JSON array de tags)

RolTecnico: id, nombre, tipoPago (POR_JORNADA|POR_PROYECTO|POR_HORA|TARIFA_PLANA)
  └─ Tarifas por nivel (AAA|AA|A) y jornada (CORTA|MEDIA|LARGA)
```

### 2.7 Catálogos — Proveedores y Otros
```
Proveedor: id, nombre, empresa, giro, telefono, correo, rfc, cuentaBancaria
  ├─ portalToken (acceso externo para cargar equipos)
  └─ Relaciones: equipos[], cotizacionLineas[], proyectoEquipos[], cuentasPagar[]

EquipoProveedor: proveedorId, categoria, descripcion, marca, modelo, cantidad
  ├─ condicion (NUEVO|BUENO|REGULAR|NECESITA_REVISION)
  ├─ disponibilidad (DISPONIBLE|EN_USO|EN_MANTENIMIENTO|NO_DISPONIBLE)
  ├─ precioDia, precioEventoFull, precioMinimoEvent
  └─ aprobado, importadoEquipoId

Empresa: nombre, giro, tipo (CLIENTE|PROVEEDOR|AMBOS), rfc, datosFiscales, cuentaBancaria
Venue: nombre, ciudad, estado, capacidadMin, capacidadMax, contactoNombre, contactoTelefono
Vehiculo: nombre, marca, modelo, placas, kilometraje, proximoServicioKm
  └─ MantenimientoVehiculo[]
OrdenCompra: proveedorId, proyectoId, descripcion, lineas (JSON), monto, estado
```

### 2.8 Finanzas
```
CuentaBancaria: nombre, banco, numeroCuenta, clabe, titular, rfc, activa

MovimientoFinanciero: fecha, cuentaOrigen/DestinoId, tipo, clienteId, proveedorId, proyectoId
  ├─ categoriaId, concepto, monto, metodoPago (TRANSFERENCIA|EFECTIVO|TARJETA|CHEQUE)
  └─ estatusConciliacion (PENDIENTE|CONCILIADO), comprobanteUrl

CategoriaFinanciera: nombre, tipo (INGRESO|GASTO|TRANSFERENCIA|INVERSION|RETIRO)

CuentaCobrar: clienteId, empresaId, proyectoId, cotizacionId
  ├─ concepto, tipoPago (TOTAL|ANTICIPO|LIQUIDACION|OTRO)
  ├─ monto, montoCobrado, montoOriginal
  ├─ estado (PENDIENTE|PARCIAL|LIQUIDADO|VENCIDO)
  ├─ fechaCompromiso, fechaCobroReal, cuentaDestinoId
  └─ abonos[], ajustesLog (JSON)

Abono: cuentaCobrarId, monto, fecha, metodoPago, cuentaDestinoId, movimientoId

CuentaPagar: tipoAcreedor (PROVEEDOR|TECNICO|PERSONAL_INTERNO|OTRO|EMPRESA|SOCIO)
  ├─ tecnicoId|proveedorId|empresaId|socioId
  ├─ concepto, monto, estado, fechaCompromiso
  └─ movimientoId (1-to-1), proyectoId (opcional)

GastoOperativo: proyectoId, tipo (COMIDA|TRANSPORTE|HOSPEDAJE|OTRO), monto, entregado
```

### 2.9 HERVAM — Estructura de Capital
```
HervamConfig: tasaInteresAnual, capitalMinimoRequerido, porcentajeDistribucion

HervamActivo: nombre, tipoActivo, montoInicial, montoActual, depreciacionMensual, estado

HervamPago: activoId, periodo (YYYY-MM), monto, distribucion (JSON), estado

Socio: nombre, tipo (PERSONA|EMPRESA), montoAportado, porcentajeParticipacion, estado (ACTIVO|INACTIVO)
  └─ requisitos[], activos[], mantenimientos[], rentas[], reportes[]

SocioRenta: socioId, periodo, monto, estado (PENDIENTE|PAGADO)
SocioReporte: socioId, periodo, rentabilidad (%), notas
```

### 2.10 RRHH
```
PersonalInterno: nombre, puesto, departamento (BODEGA|COORDINACION|PRODUCCION|ADMINISTRACION|VENTAS|GENERAL)
  ├─ tipo (EMPLEADO|FREELANCE_RECURRENTE), salario, periodoPago (MENSUAL|QUINCENAL|SEMANAL|POR_EVENTO)
  ├─ banco, clabe, numeroCuenta, datosFiscales, ineUrl
  └─ emergenciaNombre, emergenciaTel, padecimientos

PagoNomina: personalId, periodo (YYYY-MM), tipoPeriodo, monto, estado (PENDIENTE|PAGADO)
  └─ movimientoId (cuando se paga)

Asistencia: personalId, fecha, estado (PRESENTE|FALTA|RETARDO|PERMISO|VACACIONES|INCAPACIDAD)

TipoIncidencia: nombre, categoria (ASISTENCIA|CONDUCTA|DESEMPEÑO|RECONOCIMIENTO)
  └─ calculoTipo (FIJO|PORCENTAJE_DIA|PORCENTAJE_HORA|SIN_DESCUENTO), esDescuento

Incidencia: personalId, tipoId, fecha, montoCalculado, periodoNomina

EvaluacionEmpleado: personalId, periodo, criterios (0-10): puntualidad, actitud, comunicacion...
  └─ puntajeTotal, estado (BORRADOR|COMPLETADA)

Candidato: nombre, estado (PRESELECCION|ENTREVISTA|PROPUESTA|CONTRATACION|RECHAZADO)
  └─ puestoIdealId, cv, experiencia (JSON), postulaciones[]

PuestoIdeal: titulo, departamento, rangoSalarialMin, rangoSalarialMax, competenciasRequeridas (JSON)

OnboardingPlan: candidatoId, fechaInicio, estado
  └─ modulos[] → tareas[]
```

### 2.11 Marketing
```
TipoContenido: nombre, formato (POST|REEL|STORIE|TIK_TOK), objetivo
  ├─ Programación: diaSemana, semanaDelMes, recurrencia, cantMes
  └─ Plataformas: enFacebook, enInstagram, enTiktok, enYoutube, enFeedIG

Publicacion: fecha, tipoId, formato, copy, descripcion
  ├─ Plataformas: enFacebook, enInstagram, enTiktok, enYoutube
  ├─ estado (PENDIENTE|EN_PROCESO|LISTO|PUBLICADO|CANCELADO)
  └─ Métricas: alcance, impresiones, interacciones, seguidoresGanados

LevantamientoContenido: tratoId (1-to-1), descripcion, estado (PENDIENTE|EN_PROGRESO|COMPLETADO)

TipoCampana: nombre, tipo (DIGITAL|TRADICIONAL|HIBRIDA), presupuetoEstimado
  └─ ejecuciones[], metas[], resultados[]

MetricaOrganica: mes (YYYY-MM), plataforma (INSTAGRAM|TIKTOK|FACEBOOK|YOUTUBE)
  └─ alcance, impresiones, interacciones, seguidoresNuevos, tasaEngagement

ReporteSemanal: semana (YYYY-Www), crm (JSON), finanzas (JSON), produccion (JSON), marketing (JSON)
```

### 2.12 Operaciones — Tareas
```
Tarea: titulo, descripcion, prioridad (URGENTE|ALTA|MEDIA|BAJA), area, estado
  ├─ asignadoA, creadoPor
  ├─ Jerarquía: parentId (subtarea), carpetaId, proyectoTareaId, seccionId
  ├─ proyectoEventoId (si es tarea de proyecto específico)
  └─ fecha, fechaVencimiento, recurrencia (JSON), etiquetas (JSON)

TareaCarpeta: nombre, color, icono → proyectos[], tareas[]
TareaProyecto: nombre, color, icono → secciones[], tareas[]
TareaSeccion: nombre, orden, colapsada, proyectoId

IniciativaExterna: nombre, descripcion, area, estado (ACTIVA|COMPLETADA|ARCHIVADA)
  └─ tareas[]
```

---

## 3. PORTALES EXTERNOS (sin autenticación, vía token)

| Portal | Token en | Propósito |
|--------|----------|-----------|
| Cliente proyecto | `Proyecto.portalToken` | Cliente ve avance de su evento |
| Aprobación cotización | `Cotizacion.aprobacionToken` | Cliente aprueba en 1 click |
| Discovery prospecto | `Trato.formToken` | Prospecto llena formulario de descubrimiento |
| Confirmación técnico | `ProyectoPersonal.confirmToken` | Técnico confirma disponibilidad vía link |
| Confirmación proveedor | `ProyectoEquipo.confirmToken` | Proveedor confirma disponibilidad de equipo |
| Portal proveedor | `Proveedor.portalToken` | Proveedor gestiona su catálogo de equipos |
| Propuesta laboral | `Candidato.propuestaToken` | Candidato ve propuesta de empleo |
| Encuesta cliente | `EvaluacionCliente.tokenAcceso` | Cliente responde encuesta post-evento |

---

## 4. FLUJOS CONECTADOS ENTRE MÓDULOS

### Flujo principal: Trato → Cotización → Proyecto → Cobro

```
1. TRATO (DESCUBRIMIENTO)
   ├─ Vendedor registra trato desde prospecto o cliente existente
   ├─ Wizard discovery: nombre evento, asistentes, servicios, presupuesto
   ├─ Opcional: enviar formToken para que prospecto complete el form online
   ├─ Ruta: DESCUBRIR (wizard) o RIDER_DIRECTO (saltar a cotización)
   └─ Etapa avanza a OPORTUNIDAD cuando hay información suficiente

2. COTIZACIÓN (BORRADOR → APROBADA)
   ├─ Se crea desde el trato
   ├─ Líneas: equipos propios/externos, roles técnicos, paquetes, transporte, hospedaje
   ├─ Cálculos automáticos: subtotales, descuentos combinados, IVA opcional, utilidad estimada
   ├─ Plan de pagos: JSON con porcentajes/fechas (anticipo, saldo, liquidación)
   ├─ Trade: integración Mainstage Trade con nivel, entregables y bonificación
   ├─ Múltiples opciones: A/B/C (grupoId)
   ├─ Link de aprobación: cliente aprueba en portal externo (aprobacionToken)
   └─ Al aprobar: trato → VENTA_CERRADA, se genera Proyecto automáticamente

3. PROYECTO (PLANEACION → COMPLETADO)
   ├─ Heredado del trato y cotización aprobada
   ├─ Personal: asignar técnicos con rol, nivel, jornada y tarifa acordada
   │   └─ confirmToken → link WhatsApp para confirmar disponibilidad
   ├─ Equipos: propios del inventario + externos de proveedores
   │   ├─ confirmToken → proveedor confirma disponibilidad
   │   └─ riderAccesorios: lista de accesorios necesarios por equipo
   ├─ Checklist: ítems de operación y rider (marcar completados)
   ├─ Archivos: renders, plots, riders, itinerarios, documentos técnicos
   ├─ Bitácora: log de cambios y notas
   ├─ Portal cliente: seguimiento en tiempo real
   ├─ Gastos operativos: efectivo para coordinación (comida, transporte)
   ├─ Catering: reporte de comidas para el crew
   └─ Post-evento: evaluación interna (10 criterios) + evaluación cliente (tokenAcceso)

4. CUENTAS POR COBRAR (CxC)
   ├─ Se generan automáticamente del planPagos de la cotización
   ├─ Tipos: ANTICIPO, SALDO, LIQUIDACION
   ├─ Estados: PENDIENTE → PARCIAL → LIQUIDADO → VENCIDO
   ├─ Abonos: registro de pagos parciales
   └─ Conciliación: vincula Abono ↔ MovimientoFinanciero

5. CUENTAS POR PAGAR (CxP)
   ├─ Se crean manualmente por proyecto
   ├─ Acreedores: TECNICO | PROVEEDOR | PERSONAL_INTERNO | EMPRESA | SOCIO
   └─ Al pagar: CxP → LIQUIDADO + MovimientoFinanciero
```

### Flujo de Equipos y Disponibilidad
```
Catálogo Equipo
  ├─ En cotización: línea EQUIPO_PROPIO (precio de lista o especial por cliente)
  ├─ En cotización: línea EQUIPO_EXTERNO (costo proveedor + margen)
  └─ En proyecto: ProyectoEquipo
      ├─ PROPIO: verifica disponibilidad en inventario
      ├─ EXTERNO: confirmToken para que proveedor confirme
      └─ riderAccesorios: lista de cables, herramientas, soportes necesarios
```

### Flujo de Personal Técnico
```
RolTecnico (tarifa base por nivel y jornada)
  → Técnico (perfil + disponibilidad + datos bancarios)
      → CotizacionLinea OPERACION_TECNICA (costo estimado)
          → ProyectoPersonal (tarifa acordada, jornada, confirmación)
              → CuentaPagar como TECNICO (cuando liquidar)
```

### Flujo de Finanzas
```
MovimientoFinanciero ← Abono (de CxC)
MovimientoFinanciero ← CuentaPagar (pagada)
MovimientoFinanciero ← PagoNomina (cuando pagado)

CierreFinanciero por proyecto:
  ├─ Ingresos: suma CxC liquidadas
  ├─ Egresos: suma CxP + GastosOperativos
  └─ Margen real vs estimado en cotización
```

### Flujo RRHH
```
PersonalInterno
  ├─ Asistencia diaria → días trabajados en periodo
  ├─ Incidencias → descuentos/bonos en periodo
  ├─ PagoNomina (cálculo manual) → estado PAGADO → MovimientoFinanciero
  └─ EvaluacionEmpleado por periodo

Candidato (PRESELECCION → ENTREVISTA → PROPUESTA → CONTRATACION)
  ├─ propuestaToken: candidato ve propuesta laboral en portal
  └─ /contratar → se crea PersonalInterno + OnboardingPlan automáticamente
```

### Flujo Marketing ↔ Trato
```
Trato → LevantamientoContenido (1-to-1) → captura datos cliente para contenido

TipoContenido (estrategia mensual)
  └─ Publicacion (generación automática via /api/marketing/publicaciones/generar)
      └─ Estados: PENDIENTE → EN_PROCESO → LISTO → PUBLICADO
```

---

## 5. APIs — 156 Endpoints (resumen por módulo)

| Módulo | Endpoints principales |
|--------|----------------------|
| Auth | `/api/auth`, `/api/auth/me` |
| CRM | `/api/tratos`, `/api/clientes`, `/api/tratos/[id]/form-token` |
| Cotizaciones | `/api/cotizaciones`, `/api/cotizaciones/[id]/aprobar`, `/api/cotizaciones/[id]/link-aprobacion`, `/api/cotizaciones/[id]/pdf` |
| Proyectos | `/api/proyectos`, `/api/proyectos/[id]/personal`, `/api/proyectos/[id]/equipos`, `/api/proyectos/[id]/hoja-entrega`, `/api/proyectos/[id]/esquema-cobro` |
| Inventario | `/api/equipos`, `/api/equipos/disponibilidad`, `/api/tecnicos`, `/api/proveedores` |
| Finanzas | `/api/cuentas-cobrar`, `/api/cuentas-pagar`, `/api/movimientos`, `/api/finanzas/aging`, `/api/finanzas/flujo-proyectado` |
| RRHH | `/api/rrhh/personal`, `/api/rrhh/nomina`, `/api/rrhh/candidatos`, `/api/rrhh/candidatos/[id]/contratar` |
| Marketing | `/api/marketing/publicaciones`, `/api/marketing/publicaciones/generar`, `/api/marketing/metricas` |
| Tareas | `/api/tareas`, `/api/operaciones/carpetas`, `/api/operaciones/proyectos` |
| Admin | `/api/admin/usuarios`, `/api/admin/modulos`, `/api/admin/config`, `/api/actividad` |
| Portales | `/api/portal/[token]`, `/api/portal/proveedor/[token]` |
| Global | `/api/busqueda`, `/api/calendario`, `/api/reportes/generar` |

---

## 6. ESTADO DE FUNCIONALIDADES

### Completas ✅
- Pipeline CRM Kanban con wizard discovery y form token para prospecto
- Cotizador completo: cálculos, descuentos combinados, múltiples opciones (A/B/C), plan de pagos, IVA opcional, utilidad estimada
- Proyectos end-to-end: personal, equipos, checklist, archivos, bitácora, portal cliente, evaluaciones internas y de cliente
- Generación de documentos: rider, hoja de entrega, carta responsiva, reporte post-evento (PDF/HTML)
- Catálogo de equipos: unidades por serie, mantenimiento, accesorios, precios especiales por cliente
- CxC y CxP con abonos parciales, aging y conciliación con movimientos financieros
- Sistema de tareas: carpetas, proyectos, secciones, subtareas, comentarios, archivos, recurrencia
- RRHH base: personal, nómina manual, asistencia, incidencias, evaluaciones de desempeño
- Portales externos vía token (0 login): cliente, proveedor, técnico, aprobación cotización, encuesta post-evento
- Auditoría: log de actividad, historial de versiones por entidad
- Control de acceso granular por módulo (ModuloAcceso) y por área
- Calendario de publicaciones marketing con 5 vistas (calendario, parrilla, próximas, por tipo, feed IG)
- Generación automática de publicaciones del mes por estrategia de contenido

### Parciales ⚠️
- **Disponibilidad técnicos/equipos**: API existe, no hay alertas de conflicto al asignar
- **Nómina automática**: pagos se crean manualmente; asistencia e incidencias no se aplican automáticamente al calcular
- **Jornadas plan en cotización**: se almacena en JSON pero sin UI para edición visual
- **Gastos operativos**: se registran por proyecto pero sin flujo de request/entrega claro
- **Recolección de equipos**: estados y protocolos presentes pero sin UI de confirmación de recepción
- **Evaluaciones**: funcionales pero con criterios fijos no configurables
- **Reportes semanales**: estructura presente pero generación es semi-manual
- **HERVAM distribución**: estructura de socios y activos funcional pero cálculo de distribución de ganancias no es automático

### Incompletas o ausentes 🔴
- **Onboarding de personal**: modelos completos pero UI ausente; sin integración con flujo de contratación
- **Meta Ads**: modelos presentes pero sin integración real con Meta API; métricas son entrada manual
- **Integración con calendarios externos**: no hay sync con Google Calendar ni Outlook
- **Webhooks**: no hay webhooks salientes para ningún evento
- **Sincronización Trade**: datos se almacenan en JSON pero sin webhooks de sync con Mainstage Trade
- **Contabilidad**: no hay integración con sistemas externos (SAP, QuickBooks, CONTPAQi)
- **Comunicación desde la app**: no hay envío de emails, WhatsApp ni SMS directo; solo se generan links
- **App móvil / PWA**: es responsive pero sin capacidades offline para uso en campo
- **Análisis predictivo**: sin modelos de forecasting ni ML

---

## 7. BUGS Y LIMITACIONES CONOCIDAS

1. **Timezone en filtros de fecha**: Fechas almacenadas como UTC midnight. En vistas mensuales los filtros son `gte: primer día del mes (UTC)`. Si el servidor no corre en UTC, fechas límite podrían caer en el mes incorrecto.

2. **`divide-y` en links de Next.js**: Tailwind's `divide-y` solo funciona en hijos block-level. Componentes con `<Link>` necesitan `className="block"` explícito o los separadores no se muestran visualmente.

3. **Tipo en API marketing**: La relación `publicacion.tipo` históricamente solo incluía `{id, nombre, formato, enFeedIG}` (sin campos de plataformas `enFacebook/enInstagram/enTiktok/enYoutube`). Corregido recientemente.

4. **Discovery RENTA con 2 pasos**: El wizard discovery para servicio RENTA solo tenía 2 pasos pero el CTA "Hacer propuesta" vivía en el paso 3, haciéndolo inaccesible. Corregido.

5. **`descubrimientoCompleto` solo en estado local**: El botón "Editar descubrimiento" solo actualizaba React state sin persistir a la DB. Corregido.

6. **Default de fecha en modal "Nueva publicación"**: La fecha defaulteaba a `mes + "-01"` (primer día del mes visto) en lugar de hoy, haciendo que publicaciones se crearan en fechas incorrectas. Corregido.

7. **`VersionHistorial`**: El modelo existe y la API lo usa, pero la UI para ver historial de versiones de entidades específicas no es accesible en todos los módulos.

8. **`OrdenCompra` sin flujo de recepción**: El modelo tiene estado `RECIBIDA` pero no hay endpoint ni UI para confirmar recepción con fotos o firma.

9. **Búsqueda global limitada**: `/api/busqueda` existe pero sin UI de búsqueda universal visible en el dashboard.

10. **Disponibilidad no bloquea**: Al asignar un técnico o equipo a un proyecto, la app no alerta si ya están comprometidos en otra fecha.

---

## 8. RESUMEN EJECUTIVO

**Mainstage Pro** es un ERP vertical altamente especializado para producción técnica de eventos en México/LATAM.

**El flujo central** (Trato → Cotización → Proyecto → Cobro) está completamente implementado y es el núcleo de valor de la plataforma. La mayor parte de los módulos satélite (RRHH, marketing, inventario, finanzas) tienen su estructura de datos completa pero con distintos grados de madurez en la UI.

**Fortalezas clave:**
- Cotizador sofisticado con descuentos combinables, cálculo de utilidad, múltiples opciones y plan de pagos automático
- Gestión de proyectos end-to-end con personal técnico, inventario, checklist y documentación
- Sistema de portales externos vía token (clientes, técnicos y proveedores sin necesidad de login)
- Modelo de datos relacional muy completo (88 modelos, 156 endpoints)
- Control de acceso granular por módulo y por área organizacional

**Brechas principales (oportunidades de mejora):**
1. Automatización de nómina (asistencia → incidencias → cálculo automático del período)
2. Notificaciones y comunicación directa desde la plataforma (email / WhatsApp)
3. Integración real con Meta Ads API
4. UI completa para onboarding de personal
5. Dashboards analíticos más visuales por área (KPIs en tiempo real)
6. Alertas de disponibilidad en tiempo real al asignar técnicos/equipos
7. Flujo de recolección/devolución de equipos más robusto (confirmación con foto)
8. Distribución automática de ganancias HERVAM cuando se cierra un proyecto
9. Sincronización bidireccional con Mainstage Trade via webhooks
10. PWA / capacidades offline para coordinadores en campo
