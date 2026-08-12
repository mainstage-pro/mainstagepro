# Auditoría del trato — contrato de datos (Fase 0)

> Documento base de la refactorización que unifica `/crm/tratos/[id]/wizard` dentro de
> `/crm/tratos/[id]`. Sin cambios funcionales. Mapea cada campo del trato a su **dueño
> canónico** y a las **superficies duplicadas** que hoy lo editan.
>
> Fuentes verificadas: `prisma/schema.prisma` (modelo `Trato`, líneas 201-323),
> `src/app/(dashboard)/crm/tratos/[id]/page.tsx`,
> `src/app/(dashboard)/crm/tratos/[id]/wizard/page.tsx`,
> `src/app/(dashboard)/crm/tratos/nuevo/page.tsx`,
> `src/components/crm/DiscoveryForm.tsx`,
> `src/app/api/tratos/[id]/route.ts`.

---

## 1. Superficies de edición existentes

| # | Superficie | Archivo | Rol |
|---|---|---|---|
| A | Crear trato | `crm/tratos/nuevo/page.tsx` | Alta; al terminar redirige a `/wizard` |
| B | Modal **"Editar trato"** | `crm/tratos/[id]/page.tsx` (~2158-2577) | Identidad + comercial + algo de brief |
| C | Modal **"Editar datos iniciales"** | `crm/tratos/[id]/wizard/page.tsx` (~587-758) | Identidad + comercial (subconjunto) |
| D | **Brief técnico** (4 tabs) | `components/crm/DiscoveryForm.tsx` | Todo el descubrimiento; **compartido** por `[id]` y `/wizard` |
| E | Header etapa/sub-etapa | `crm/tratos/[id]/page.tsx` (`EtapaInternaBar`/`EtapaInternaSelect`) | `etapa` / `etapaInterna` |
| F | Modal cliente | `crm/tratos/[id]/page.tsx` (~2068-2120) | Datos del `Cliente` (fuera del `Trato`) |
| G | Modal razón de pérdida | `crm/tratos/[id]/page.tsx` (~2121-2156) | `motivoPerdida` |

**Componente compartido confirmado:** `DiscoveryForm` es el **mismo** componente importado
en ambas páginas (no hay copia divergente). El resto del wizard es carcasa propia.

**Modales B y C se solapan** en: `clienteId`, `etapa`, `momentoContratacion`, `origenLead`,
`tipoLead`, `origenVenta`, `vendedorId`. Ese solape es el objetivo de fusión de la Fase 5.

---

## 2. Tabla campo → dueño canónico → superficies duplicadas

Clasificación: **identidad** · **comercial** · **brief** · **derivado** · **navegación** · **cliente**.

| Campo (Prisma) | Clase | Dueño canónico (destino) | Superficies que lo editan hoy | Nota |
|---|---|---|---|---|
| `clienteId` | identidad | Modal *Editar datos del trato* | A, B, C | duplicado B/C |
| `tipoLead` | identidad | Modal *Editar datos del trato* | A, B, C | duplicado B/C |
| `origenLead` | identidad | Modal *Editar datos del trato* | A, B, C | duplicado B/C |
| `origenVenta` | identidad | Modal *Editar datos del trato* | A, B, C | duplicado B/C |
| `vendedorId` (comisión) | identidad | Modal *Editar datos del trato* | A, B, C | duplicado B/C |
| `vendedorOrigenId` | identidad | Modal *Editar datos del trato* | A, B | quién capturó el lead |
| `responsableId` | comercial | Header del trato | B | mover a header (Fase 5) |
| `etapa` | comercial | Header del trato | B, C, E | 3 superficies; consolidar en E |
| `etapaInterna` (sub-etapa) | comercial | Header del trato (E) | E, +auto en API | canónico ya en header |
| `momentoContratacion` | comercial | Header del trato | B, C, D | mover a header |
| `clasificacion` | comercial | Modal *Editar datos del trato* | B | PROSPECTO/BASIC/REGULAR/PRIORITY |
| `motivoPerdida` | comercial | Modal razón de pérdida (G) | G, API | ok |
| `tipoServicio` | brief | Brief tab Info Básica | B, D | duplicado B/D |
| `tipoEvento` | brief | Brief tab Info Básica | A, B, D | duplicado |
| `subtipoEvento` | brief | Brief tab Info Básica | D | |
| `nombreEvento` | brief | Brief tab Info Básica | B, D | duplicado |
| `fechaEventoEstimada` | brief | Brief tab Info Básica | B, D | **bug fecha, ver §4** |
| `fechasEvento` (multidía) | brief | Brief tab Info Básica | D | |
| `lugarEstimado` | brief | Brief tab Producción | B, D | duplicado |
| `asistentesEstimados` | brief | Brief tab Info Básica | D | |
| `presupuestoEstimado` | brief | Brief tab Info Básica | B, D | **ambigüedad monto, §4** |
| `serviciosInteres` | brief | Brief tab Info Básica | D | JSON |
| `equiposInteres` | brief | Brief tab Info extra | D | JSON |
| `ideasReferencias` | brief | Brief tab Info extra | D | |
| `horaInicioEvento` | brief | Brief tab Producción | D | |
| `horaFinEvento` | brief | Brief tab Producción | D | |
| `duracionMontajeHrs` | brief | Brief tab Producción | D | |
| `ventanaMontajeInicio` | brief | Brief tab Producción | D | |
| `ventanaMontajeFin` | brief | Brief tab Producción | D | |
| `horaTerminoMontaje` | brief | Brief tab Producción | D | |
| `contactoVenueNombre` | brief | Brief tab Producción | D | |
| `contactoVenueTelefono` | brief | Brief tab Producción | D | |
| `diasServicio` | brief | Brief tab Producción | D | |
| `duracionEvento` | brief | Brief tab Producción | D | |
| `continuarPor` | brief | Brief tab Comercial | D | |
| `modoDescubrimiento` | brief | Brief tab Comercial | D | |
| `canalAtencion` | brief | Brief tab Comercial | D | |
| `contactoDecisorNombre` | brief | Brief tab Comercial | D | |
| `contactoDecisorCargo` | brief | Brief tab Comercial | D | |
| `nichoSlug` | brief | Brief (descubrimiento por nicho) | D | catálogo |
| `respuestasDescubrimiento` | brief | Brief (descubrimiento por nicho) | D | JSON |
| `adicionalesSeleccionados` | brief | Brief (descubrimiento por nicho) | D | JSON |
| `notas` | brief | Brief / lateral | B, D | |
| `perfilProspecto` | brief | Panel proceso (Prospección) | `PerfilSelect` | |
| `descubrimientoCompleto` | derivado | (setter DiscoveryForm) | D | no editar a mano |
| `descubrimientoNivel` | derivado | `lib/proceso/motor.ts` | — | calculado, nunca capturado |
| `etapaCambiadaEn` | derivado | API (auto en cambio de etapa) | API | |
| `fechaCierre` | derivado | API (auto al cerrar) | API | |
| `montoFinal` | derivado | API cierre-venta | cerrar-venta | valor real de cierre |
| `confirmadaEn` | comercial | Header/lateral (único) | proceso/confirmar | **bug confirmación, §4** |
| `metodoConfirmacion` | comercial | junto a `confirmadaEn` | confirmar | |
| `notaConfirmacion` | comercial | junto a `confirmadaEn` | confirmar | |
| `tradeCalificado` / `tradeNivel` / `familyAndFriends` / `realizarRender` | comercial | lateral (Trade) | — | |
| `formToken` / `formEstado` / `formRespuestas` / `formRecibidoEn` | derivado | formulario público | form-token | |
| `briefToken` / `briefRecibidoEn` | derivado | brief público | brief | |
| `camposCliente` | derivado | (marca qué llenó el cliente) | D | JSON |
| `scoutingData` | brief | scouting | — | JSON |
| `estatusContacto` | comercial | panel proceso | API | PENDIENTE/CONTACTADO |
| `proximaAccion` / `fechaProximaAccion` | comercial | lateral / seguimientos | API | |
| `requiereRevision` / `posibleDuplicado` | derivado | cotejo automático | API | |

### Campos deprecados (no editar; borrado físico diferido a Fase 8)

| Campo | Reemplazo | Estado |
|---|---|---|
| `tipoProspecto` | `etapaInterna === 'NURTURING'` | migrar antes de borrar |
| `nurturingData` | seguimientos PROCESO | contiene datos reales; migrar |
| `preferenciaContacto` | `continuarPor` | migrar |
| `etapaContratacion` | `momentoContratacion` | duplicado directo |

### Campos de navegación que **faltan** (a crear en Fase 1)

No existen en el modelo `Trato`. Deben añadirse (migración aditiva, camelCase citado por
el gotcha de Prisma sin `@map`):

- `ultimoPanel` `String?`
- `ultimoTab` `String?`
- `ultimaVisita` `DateTime?`

---

## 3. Referencias a `/wizard` a reapuntar (Fase 6)

| Archivo:línea | Uso |
|---|---|
| `crm/tratos/[id]/page.tsx:~1987` | botón "Abrir Wizard (Modo Edición)" (`href`) |
| `crm/tratos/nuevo/page.tsx:~263` | `router.push(.../wizard)` tras crear |
| `crm/tratos/nuevo/page.tsx:~486` | copy "…se abrirá directamente el wizard…" |
| `components/crm/PresentacionDescubrimiento.tsx:~48` | `const volver = .../wizard` |
| `crm/tratos/[id]/page.tsx:~185` | comentario "Pasos del wizard…" |
| `components/crm/DiscoveryForm.tsx:~558` | comentario "Paso activo del wizard…" |

> Los números de línea son aproximados (los archivos se editan en paralelo). Re-verificar
> con `grep -rn "/wizard" src/` antes de tocar.

---

## 4. Bugs confirmados en auditoría (Fase 7)

1. **Fecha desfasada (`fechaEventoEstimada`).** `DateTime?` en Prisma; render con conversión
   de zona produce off-by-one (mismo patrón UTC/local del dashboard financiero). Guardar como
   fecha sin componente horario y renderizar sin conversión.
2. **Confirmación contradictoria.** Campo canónico = `confirmadaEn` (timestamp, independiente
   del cierre comercial). La barra de proceso y el badge del lateral deben leer ambos de
   `confirmadaEn != null`; hoy divergen.
3. **Freeze ~40 s al cerrar modal de datos iniciales.** Revisar cleanup de efectos/listeners al
   desmontar (`wizard/page.tsx`).
4. **Ambigüedad de montos.** `presupuestoEstimado` (estimado del cliente) vs valor cotizado
   (`Cotizacion`) vs `montoFinal` (cierre). Etiquetar explícitamente cada uno en la UI.
5. **Descubrimiento vacío.** 0 tratos en DESCUBRIMIENTO vs 35 Prospección / 28 Oportunidad.
   Sospecha: "Convertir a oportunidad →" salta la etapa y el brief se llena desde Oportunidad.
   Reportar hallazgo antes de cambiar comportamiento.

---

## 5. Confirmación de invariantes

- **Ningún campo queda sin dueño canónico** (tabla §2 completa).
- **Solape real B↔C**: 7 campos de identidad/comercial → se fusionan en un modal (Fase 5).
- **Brief = un solo componente** (`DiscoveryForm`), reutilizable tal cual dentro de `[id]`.
- **Config del proceso** (pasos, guiones, cadencia) vive en `src/lib/proceso/*` + tablas
  `ProcesoSubetapa`/`ProcesoPaso`/`Seguimiento`; el panel de Fase 3 debe leer de ahí, no
  hardcodear textos.
