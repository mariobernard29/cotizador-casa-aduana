# PLAN — Cotizador y gestión de eventos · Casa Aduana

> Documento de planificación y decisiones de arquitectura. El encargo original dice “Casa **Duana**”; todos los recursos (logotipo, menús, sitio web) dicen **Casa Aduana** (Casa de la Aduana, Hotel Boutique, Topolobampo), y ese es el nombre usado en el sistema.

## 1. Resumen del proyecto

Aplicación web administrativa para que el personal de Casa Aduana:

- elabore cotizaciones de eventos con artículos de sus menús y partidas personalizadas;
- genere PDF con la marca, las conserve con historial y las gestione por estado;
- administre clientes, catálogo (por menú), espacios y configuración comercial;
- controle la disponibilidad en un calendario y **evite reservas dobles** (garantía en base de datos).

Prioridades: rapidez de uso diario, importes correctos y verificables, cero datos inventados.

## 2. Hallazgos de la inspección inicial

| Aspecto | Hallazgo |
|---|---|
| Repositorio | Vacío, salvo `RECURSOS/`. Sin git, sin `package.json`. Se creó la app desde cero. |
| Nombres de archivo | Usan acentos en forma Unicode NFD (`Menú`, `—`): hay que localizarlos por patrón, no por nombre literal. |
| Supabase | Proyecto `cotizador casa aduana` (ref en `.env.local`), Postgres 17, vacío al iniciar. |
| Integración MCP | Permite consultar y aplicar migraciones; la migración de funciones fue rechazada en la sesión y se aplica manualmente (ver §20). |
| IA / correo | No hay variables de proveedores de IA ni de correo. No se integran. |

## 3. Inventario de recursos

| Archivo | Tipo | Uso |
|---|---|---|
| `Menú CA Desayunos 2026 - Menu V1.pdf` | PDF, 1 pág., texto extraíble | Menú **Desayunos**: 15 platillos (Waffles con 3 variantes) + 3 extras. |
| `Casa Aduana — Menú Marino Azul VF 1.pdf` | PDF, 4 págs., texto extraíble | Menú **Marino Azul**: para compartir, entradas, platos fuertes, guarniciones, postres, mixología, coctelería, bebidas y cervezas. |
| `LOGO CASA ADUANA.avif` | AVIF 128×132 px, con transparencia, 4 KB | Logotipo oficial (arco azul/verde azulado, tridente, “CASA ADUANA · HOTEL BOUTIQUE”). Convertido a PNG en `public/brand/`. |
| `DATOS Y VARIABLES.txt` | Texto | Dirección, teléfono, correo, sitio web y variables de Supabase (URL, publishable, secret, JWKS). |
| casadelaaduana.com/eventos (referido en el txt) | Web | Espacio “Terraza”, tipos de evento, anticipación mínima de 1 semana, horario 09:00–23:30, renta de terraza por 6 h con hora extra. |

**Datos comerciales usados (reales):** Lázaro Cárdenas, C.P. 81377, Topolobampo, Sin., México · +52 668 463 9069 · casadelaaduana.com · Instagram/Facebook `casaaduanatopo`.
**Discrepancia:** el correo aparece como `casadelaadana@grupofelix.com.mx` (txt y pie del sitio) y `casadelaaduana@grupofelix.com.mx` (página de eventos). Se cargó el del txt marcado como **no verificado**; la app lo advierte en Configuración.
**No disponibles (campos pendientes):** razón social, RFC, condiciones de pago/anticipo, política de cancelación, capacidad de la terraza, precio de renta de terraza y de hora extra.

## 4. Catálogo preliminar de artículos

Fuente: `supabase/seed/catalog.json` (verificado visualmente contra los PDF). Precios en MXN tal como aparecen en el menú, **IVA incluido**. 77 artículos únicos, 80 precios por menú. Ningún precio de los menús resultó ilegible.

**Desayunos** (Menú CA Desayunos 2026 - Menu V1.pdf)

| Categoría | Artículo | Variante | Unidad | Precio |
|---|---|---|---|---:|
| Desayunos | Waffles | Compota de frutas y queso brie | platillo | $210 |
| Desayunos | Waffles | Tocino caramelizado y queso de cabra | platillo | $230 |
| Desayunos | Waffles | Frutas y crema de cacahuate | platillo | $190 |
| Desayunos | Omelette de Vegetales |  | platillo | $235 |
| Desayunos | Huevos & Hashbrowns |  | platillo | $230 |
| Desayunos | Hummus Toast |  | platillo | $265 |
| Desayunos | Pan Francés |  | platillo | $250 |
| Desayunos | Beet Pancakes |  | platillo | $220 |
| Desayunos | Chilaquiles |  | platillo | $250 |
| Desayunos | Huevos Montados |  | platillo | $265 |
| Desayunos | Especial Sinaloenses |  | platillo | $340 |
| Desayunos | Combinación Sonorense |  | platillo | $340 |
| Desayunos | Combinación Sinaloense |  | platillo | $340 |
| Desayunos | Combinación Regia |  | platillo | $340 |
| Desayunos | Omelette de Camarón |  | platillo | $285 |
| Desayunos | Hot Cakes de la Casa |  | platillo | $225 |
| Desayunos | Avocado Toast |  | platillo | $265 |
| Extras | Orden de tocino con caramelo |  | orden (3 pzas) | $65 |
| Extras | Papas campesinas | «Orden de papas campesinas» | orden | $75 |
| Extras | Orden de plato de frutas |  | orden | $75 |

**Marino Azul** (Casa Aduana — Menú Marino Azul VF 1.pdf)

| Categoría | Artículo | Variante | Unidad | Precio |
|---|---|---|---|---:|
| Para compartir | Focaccia Artesanal |  | platillo | $149 |
| Para compartir | Guacamole |  | platillo | $175 |
| Para compartir | Coliflor Asada |  | platillo | $190 |
| Entradas frescas | Ensalada de ejotes, mandarina y mango |  | platillo | $245 |
| Entradas frescas | Ensalada de betabel y duraznos |  | platillo | $285 |
| Entradas frescas | Ensalada César Casa Aduana |  | platillo | $275 |
| Entradas frescas | Ceviche de sierra |  | platillo | $275 |
| Entradas frescas | Ceviche de camarón |  | platillo | $295 |
| Entradas frescas | Chicharrón de pescado |  | platillo | $290 |
| Entradas frescas | Tostada tropical |  | orden (2 pzas) | $265 |
| Platos fuertes | Hamburguesa Prime Aduana |  | platillo | $320 |
| Platos fuertes | Tacos de Rib Eye |  | orden (2 pzas) | $260 |
| Platos fuertes | Tacos de Pork Belly |  | orden (3 pzas) | $240 |
| Platos fuertes | Sándwich de jamón ahumado |  | platillo | $275 |
| Platos fuertes | Albóndigas de camarón |  | platillo | $295 |
| Platos fuertes | Camarones empanizados |  | orden (6 pzas) | $320 |
| Platos fuertes | Rib Eye |  | platillo | $590 |
| Platos fuertes | Pulpo zarandeado |  | platillo | $425 |
| Platos fuertes | Pasta Linguini a la diabla |  | platillo | $450 |
| Platos fuertes | Paella Casa Aduana |  | platillo | $420 |
| Guarniciones | Puré de papa |  | orden | $75 |
| Guarniciones | Papas campesinas | «Papa campesina» | orden | $75 |
| Guarniciones | Mac and cheese |  | orden | $75 |
| Guarniciones | Vegetales salteados |  | orden | $75 |
| Guarniciones | Papa al horno |  | orden | $75 |
| Guarniciones | Mix de chile güero, cebolla cambray y mini pimientos |  | orden | $75 |
| Guarniciones | Zanahoria confitada |  | orden | $75 |
| Postres | Tártara de frutas |  | postre | $160 |
| Postres | El Tesoro de la Aduana |  | postre | $175 |
| Postres | Pay de limón |  | postre | $170 |
| Postres | Pera Pochada |  | postre | $195 |
| Mixología de la casa | La Aduana |  | bebida | $185 |
| Mixología de la casa | Topolobampo Sunset |  | bebida | $180 |
| Mixología de la casa | Tierra y Mango |  | bebida | $175 |
| Mixología de la casa | Pasión Mezcalera |  | bebida | $175 |
| Mixología de la casa | Agua Mala |  | bebida | $185 |
| Mixología de la casa | Cítrico del Puerto |  | bebida | $175 |
| Mixología de la casa | Marea Negra |  | bebida | $190 |
| Mixología de la casa | Gin de Los Mochis |  | bebida | $175 |
| Mixología de la casa | Carajillo de Coco |  | bebida | $185 |
| Mixología de la casa | Guanábana Spritz |  | bebida | $190 |
| Coctelería clásica | Gin Tonic |  | bebida | $175 |
| Coctelería clásica | Margarita |  | bebida | $150 |
| Coctelería clásica | Mezcalita de Jamaica |  | bebida | $165 |
| Coctelería clásica | Mezcalindo |  | bebida | $165 |
| Coctelería clásica | Mezcalita de Maracuyá |  | bebida | $175 |
| Coctelería clásica | Carajillo |  | bebida | $170 |
| Coctelería clásica | Hugo Spritz |  | bebida | $200 |
| Coctelería clásica | Mimosa |  | bebida | $100 |
| Bebidas | Limonada |  | bebida | $90 |
| Bebidas | Refresco |  | bebida | $40 |
| Cervezas | Pacífico |  | cerveza | $55 |
| Cervezas | Corona Extra |  | cerveza | $55 |
| Cervezas | Modelo Especial |  | cerveza | $60 |
| Cervezas | Negra Modelo |  | cerveza | $65 |
| Cervezas | Chelada (preparación) |  | preparación | $15 |
| Cervezas | Michelada (preparación) |  | preparación | $30 |
| Cervezas | Cubana (preparación) |  | preparación | $25 |

**Servicios para eventos** (casadelaaduana.com/eventos)

| Categoría | Artículo | Variante | Unidad | Precio |
|---|---|---|---|---:|
| Renta de espacios | Renta de terraza (6 horas) |  | evento | **Pendiente** |
| Renta de espacios | Hora extra de terraza |  | hora | **Pendiente** |


**Notas de normalización**

- *Papas campesinas* aparece en ambos menús (“Orden de papas campesinas” en Desayunos, “Papa campesina” en guarniciones de Marino Azul), ambas a $75: se comparte la identidad del artículo y cada menú conserva su precio y su texto.
- *Waffles* tiene tres versiones con precio distinto: un artículo con tres variantes (las etiquetas se derivaron de su descripción).
- *Chelada, Michelada y Cubana* son preparaciones (“+$”) que se suman al precio de la cerveza: tipo `modifier`, unidad “preparación”.
- *Carajillo* (clásico, $170) y *Carajillo de Coco* (mixología, $185) son artículos distintos.
- Se añadió el menú **Servicios para eventos** con “Renta de terraza (6 horas)” y “Hora extra de terraza” **sin precio** y marcados “Revisar”, porque el sitio menciona esos conceptos pero no su costo.

## 5. Arquitectura

```
Navegador ──► Next.js (App Router, Server Components + Server Actions) ──► Supabase
                │  UI (React, Tailwind, shadcn/ui)                         ├─ Postgres (RLS, funciones de negocio)
                │  Validación zod en cada acción                           ├─ Auth (correo + contraseña)
                │  PDF con @react-pdf/renderer (route handler, Node)       └─ Storage (bucket privado "quotes")
```

- **La base de datos es la fuente de verdad** de importes, folios, transiciones y conflictos. Las RPC (`save_quote`, `transition_quote`, `set_reservation`, `duplicate_quote`, `check_availability`, `expire_quotes`) se ejecutan en transacción con los permisos del usuario (RLS).
- El navegador calcula totales solo como vista previa (`src/lib/quote-calc.ts`); el servidor los recalcula (`public.recalc_quote`) con la misma fórmula.
- Lectura: Server Components con el cliente de sesión. Escritura: Server Actions → RPC/tabla. La clave secreta solo se usa en `src/lib/supabase/admin.ts` (`server-only`) para dar de alta usuarios.

## 6. Stack y justificación

| Pieza | Elección | Motivo |
|---|---|---|
| Framework | Next.js 15.5 (App Router) + React 19 + TypeScript estricto | SSR, Server Actions y route handlers en un solo despliegue. |
| Estilos/UI | Tailwind CSS 4 + shadcn/ui (Base UI) | Componentes accesibles y personalizables, sin estética de plantilla. |
| Datos/Auth/Archivos | Supabase (`@supabase/ssr`) | Postgres con RLS, Auth y Storage ya provistos por el cliente. |
| Validación | zod 4 | Esquemas compartidos de entrada en el servidor. |
| PDF | `@react-pdf/renderer` 4 | PDF vectorial, generado en servidor desde los datos guardados; sin navegador headless. |
| Calendario | FullCalendar 6 (daygrid, timegrid, list, interaction) | Maduro, vistas mes/semana/lista y locale `es`. |
| Fechas | date-fns 4 + `@date-fns/tz` | Zona `America/Mazatlan` explícita. |
| Pruebas | Vitest | Pruebas unitarias rápidas de cálculos, estados y fechas. |

## 7. Estructura de directorios

```
├─ PLAN.md · README.md · .env.example · .env.local (no versionado)
├─ RECURSOS/                         originales (sin modificar)
├─ public/brand/                     logo.png, logo@4x.png (derivados del AVIF)
├─ scripts/                          convert-logo.ts · build-seed.ts · create-admin.ts
├─ supabase/
│  ├─ migrations/                    0100 schema · 0200 functions · 0300 rls_storage
│  ├─ seed/catalog.json              inventario verificado
│  ├─ seed.sql                       generado e idempotente
│  └─ pendiente-sql-editor.sql       último bloque por aplicar manualmente (ver §20)
└─ src/
   ├─ app/(auth)/login · sin-acceso
   ├─ app/(app)/ dashboard · cotizaciones (lista, nueva, [id], [id]/editar) · calendario · clientes · catalogo · espacios · configuracion
   ├─ app/api/cotizaciones/[id]/pdf  route handler del PDF
   ├─ components/  ui (shadcn) · shell · quotes · clients · form · status-badge
   ├─ lib/         money · quote-calc · quote-status · dates · types · slug · supabase/
   ├─ server/      auth · queries · errors · pdf · actions/*
   └─ pdf/QuoteDocument.tsx
```

## 8. Modelo de datos

| Tabla | Propósito / campos clave |
|---|---|
| `profiles` | 1:1 con `auth.users`; `role` (admin/staff), `active` (nace en `false`). |
| `business_settings` | Fila única: datos comerciales, `tax_rate`, `tax_mode` (included/added), vigencia por defecto, condiciones, horario de eventos, anticipación mínima, prefijo de folio, zona horaria. |
| `menus` · `categories` | Menús (Desayunos, Marino Azul, Servicios) y sus categorías. |
| `items` | Identidad del artículo: nombre, descripción, unidad, tipo, activo, `needs_review`, origen (import/manual/custom). |
| `menu_item_prices` | Precio por **menú + artículo + variante** (`price_cents` nulo = pendiente). |
| `clients` | Datos de contacto; índice único por correo (minúsculas); teléfono normalizado para detectar duplicados. |
| `spaces` | Espacios reservables, capacidad, horas base, color. |
| `quotes` | Folio, copia de datos del cliente, evento (fecha, horas, `start_at`/`end_at` en UTC), vigencia, estado, estado de reserva, descuento, **tasa y modo de IVA congelados**, totales en centavos, versión. |
| `quote_lines` | Copia histórica de cada partida (descripción, unidad, cantidad, precio, importe). |
| `quote_spaces` | Espacios solicitados. |
| `quote_status_history` | Bitácora de cambios de estado de cotización y de reserva. |
| `quote_revisions` | Instantánea JSON y ruta del PDF de cada versión enviada. |
| `space_bookings` | Apartados (`hold`) y reservas (`confirmed`) por espacio con `tstzrange`. |
| `calendar_blocks` | Bloqueos por espacio o de todo el lugar. |
| `quote_folio_counters` | Consecutivo de folio por año. |

## 9. Relaciones

`clients 1─N quotes` · `quotes 1─N quote_lines` · `quotes N─M spaces` (vía `quote_spaces`) · `quotes 1─N space_bookings N─1 spaces` · `items 1─N menu_item_prices N─1 menus` · `categories N─1 menus` · `quote_lines N─1 items` (opcional, `set null`) · `quotes 1─N quote_status_history / quote_revisions` · `quotes.duplicated_from → quotes`.

## 10. Autenticación y seguridad

- Supabase Auth con correo y contraseña. El middleware valida la sesión (`getClaims`) en cada petición y redirige a `/login`.
- Todo usuario nuevo recibe un perfil **inactivo**: aunque el registro público estuviera habilitado, no obtiene acceso hasta que un administrador lo active. Recomendado además: desactivar *Allow new users to sign up* en Supabase.
- RLS en todas las tablas: solo personal activo (`is_staff()`); configuración, espacios y usuarios solo los modifica un administrador. Sin acceso anónimo. El historial no se puede editar; las cotizaciones no se borran (se cancelan).
- Funciones con `search_path` fijo; `EXECUTE` revocado a `anon`/`public`.
- `SUPABASE_SECRET_KEY` solo en el servidor (`server-only`); nunca con prefijo `NEXT_PUBLIC_`. No aparece en código, documentación ni ejemplos.
- PDFs en bucket **privado**; se sirven a través de una ruta autenticada.
- Validación con zod en todas las Server Actions y validación nuevamente en las funciones SQL.

## 11. Diseño de la interfaz

- Paleta tomada del logotipo y del menú Marino Azul: azul profundo (barra lateral, acciones primarias), verde azulado (acentos), arena (fondo), dorado discreto.
- Tipografía: Cormorant Garamond solo en títulos y cifras destacadas; Inter para el resto.
- Barra lateral fija en escritorio y hoja deslizable en móvil. Tablas densas con columnas que se ocultan en pantallas pequeñas. Estados vacíos con instrucciones; esqueletos de carga; mensajes de error en español.

## 12. Flujo de creación de cotizaciones

1. **Cliente:** buscar (nombre, correo o teléfono) o registrar en un diálogo con aviso de duplicados y opción “Usar este”.
2. **Evento:** nombre, tipo, fecha, inicio/fin, invitados, espacios, menú y vigencia. Disponibilidad **en vivo** con advertencias (anticipación, horario, capacidad).
3. **Partidas:** buscador del catálogo (Ctrl+K, filtro por menú, por nombre o categoría); al elegir un artículo se copia su descripción, unidad y precio. Cantidad y precio se editan sin tocar el catálogo. Partidas personalizadas con opción explícita “Guardar en catálogo”.
4. **Resumen fijo:** subtotal, descuento (% o monto), IVA (incluido o añadido) y total; guardar como borrador.
5. **Detalle:** vista previa del PDF, descarga, impresión, duplicado, cambios de estado y acciones de reserva.

**Estados:** borrador → enviada → aceptada / rechazada / vencida; cancelada desde borrador, enviada o aceptada; reabrir (enviada, vencida o rechazada → borrador) crea una nueva versión. Solo los borradores se editan. Aceptar **no** confirma la reserva.

## 13. Importación de menús

1. Extracción del texto y verificación visual de cada página.
2. Normalización a `supabase/seed/catalog.json` (menú → categoría → artículo/variantes, unidad derivada del menú: platillo, orden (n pzas), bebida, cerveza, postre, preparación).
3. `npm run seed:build` genera `supabase/seed.sql` y reporta duplicados entre menús.
4. El SQL usa `ON CONFLICT … DO NOTHING` sobre claves naturales (`menus.slug`, `items.slug`, `(menu, item, variante)`): se puede ejecutar varias veces sin duplicar ni sobrescribir cambios hechos desde la app.

## 14. Generación de PDF

`GET /api/cotizaciones/:id/pdf` (autenticado) genera el documento con `@react-pdf/renderer` **a partir de los datos guardados** (partidas y totales congelados), por lo que siempre coincide con el sistema. Incluye logotipo, datos comerciales, folio y versión, fechas de elaboración y vigencia, cliente, evento, horario, espacios, invitados, menú, tabla de partidas, subtotal, descuento, IVA (desglosado “incluido” o sumado), total, notas y condiciones. Los borradores llevan la marca de agua “BORRADOR”. Al marcar como **enviada**, se guarda una copia en Storage (`quotes/{folio}/v{n}.pdf`) y queda accesible desde “Versiones enviadas”. `?download=1` descarga; “Imprimir” abre el PDF y llama al diálogo de impresión.

## 15. Calendario y disponibilidad

FullCalendar con vistas de mes, semana y lista (la lista es la vista por defecto en móviles). Muestra reservas confirmadas, apartados, cotizaciones abiertas sin reserva y bloqueos con colores distintos, con filtro por espacio. Al hacer clic en un día se abre una nueva cotización con esa fecha; al hacer clic en un evento se abre su cotización. Los horarios se muestran en la zona del negocio (America/Mazatlan, UTC−7 sin horario de verano).

## 16. Estrategia contra conflictos de reservas

- Estado de reserva independiente del comercial: `sin_reserva → apartado → confirmada`, y `liberada`.
- **Restricción de exclusión** en `space_bookings`: `EXCLUDE USING gist (space_id WITH =, period WITH &&) WHERE status = 'confirmed'`. Dos reservas confirmadas que se traslapan en el mismo espacio son imposibles, incluso con peticiones simultáneas.
- `set_reservation('confirmada')` exige cotización aceptada, horario y espacios, revisa bloqueos y confirmadas, y traduce una violación de exclusión a un mensaje claro.
- Los apartados pueden coincidir (se muestran como advertencia) para no frenar ventas; solo la confirmación es exclusiva.
- Cancelar, rechazar o vencer una cotización libera automáticamente sus apartados/reservas. Duplicar nunca copia la reserva.
- Vencimiento automático diario con `pg_cron` y, además, al abrir el dashboard o el listado.

## 17. Plan de pruebas

- **Unitarias (Vitest, `npm test`):** redondeo, importes por partida, descuento %/monto, IVA incluido/añadido, transiciones válidas/ inválidas, acciones de reserva, conversión de zona horaria, traslapes, lectura de `tstzrange`.
- **Base de datos:** dos confirmaciones traslapadas → error de exclusión; volver a ejecutar el seed → conteos estables; usuario anónimo → sin acceso.
- **Extremo a extremo (manual):** login → cliente → cotización con artículos de ambos menús y una partida personalizada → enviar → PDF → aceptar → confirmar reserva → calendario → intentar confirmar otra cotización en el mismo horario (debe fallar) → duplicar → cambiar un precio del catálogo y comprobar que la cotización anterior no cambia. Revisar en móvil.
- `npm run typecheck`, `npm run lint`, `npm run build`.

## 18. Fases de implementación

1. Estructura base, marca, variables de entorno. ✅
2. Esquema, funciones, RLS, Storage, seed. ✅ (falta `supabase/pendiente-sql-editor.sql`)
3. Autenticación, layout, configuración, espacios, clientes. ✅
4. Catálogo. ✅
5. Editor de cotizaciones, cálculos, estados, duplicado. ✅
6. PDF, almacenamiento, vista previa e impresión. ✅
7. Calendario, disponibilidad, reservas, bloqueos y dashboard. ✅
8. Pruebas, build y verificación. ✅ unitarias y build · ⏳ E2E tras aplicar la base de datos.

## 19. Riesgos y decisiones pendientes

| Tema | Estado / acción |
|---|---|
| Correo de contacto con dos grafías | Confirmar en Configuración y marcar como verificado. |
| Razón social, RFC | Capturar en Configuración (aparecen en el PDF solo si existen). |
| Condiciones de pago, anticipo y cancelación | No hay datos reales; agregarlas a las condiciones comerciales. |
| Capacidad de la terraza y otros espacios | Capturar en Espacios. |
| Precio de renta de terraza / hora extra | Capturar en Catálogo → Servicios para eventos. |
| Resolución del logotipo (128×132 px) | Suficiente en pantalla; para impresión conviene un original vectorial (SVG/PDF). |
| Vigencia por defecto (15 días) | Valor inicial configurable, no proviene de los recursos. |
| Clave secreta en texto plano en `RECURSOS/` | Borrar el txt (está en `.gitignore`) y considerar rotar la clave desde el panel de Supabase. |
| Registro público de Auth | Desactivarlo en Supabase → Authentication → Sign In / Providers. |

## 20. Despliegue

1. **Base de datos:** en el proyecto actual ya están aplicados el esquema, las funciones sin borrado, la RLS, Storage, el cron y el catálogo (`npm run seed:remote`). Falta ejecutar `supabase/pendiente-sql-editor.sql` en *Supabase → SQL Editor* (`save_quote`, `duplicate_quote`, `set_reservation`, políticas de borrado y permisos): las sentencias con DELETE/REVOKE requieren confirmación y no se aplicaron por MCP. En un proyecto nuevo: aplicar `supabase/migrations/` en orden y después el seed.
2. **Primer administrador:** `npm run admin:create -- correo@dominio.com "Nombre"` (pide la contraseña en la terminal).
3. **Auth:** desactivar el registro público; en *URL Configuration* poner la URL de producción como *Site URL*.
4. **Vercel (recomendado):** importar el repositorio, definir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `NEXT_PUBLIC_APP_TIMEZONE`, y desplegar (`npm run build`). Requiere el runtime de Node (el PDF no corre en Edge).
5. Verificar con la lista del §17.
