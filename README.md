# Casa Aduana · Cotizador y gestión de eventos

Aplicación administrativa para cotizar eventos, generar PDF con la marca, gestionar clientes, catálogo por menú, espacios y un calendario con control de disponibilidad. Next.js 15 + Supabase.

La planificación, el modelo de datos y las decisiones de arquitectura están en [PLAN.md](PLAN.md).

## Requisitos

- Node.js 20 o superior
- Proyecto de Supabase (ya configurado en `.env.local`)

## Puesta en marcha

```bash
npm install
```

1. **Variables de entorno.** `.env.local` ya existe (generado desde `RECURSOS/`). Para otro entorno, copia `.env.example` y completa los valores. `SUPABASE_SECRET_KEY` solo se usa en el servidor.
2. **Base de datos.** En el proyecto actual ya están aplicados las tablas, la RLS, el bucket de PDF, el vencimiento diario y el catálogo. Falta un último bloque: abre *Supabase → SQL Editor*, pega [`supabase/pendiente-sql-editor.sql`](supabase/pendiente-sql-editor.sql) y ejecútalo una vez (funciones de guardado y reserva, políticas de borrado y permisos). En un proyecto nuevo, aplica `supabase/migrations/` en orden y luego `npm run seed:remote` (o `supabase/seed.sql`); ambos son idempotentes.
3. **Primer administrador.**
   ```bash
   npm run admin:create -- tu-correo@dominio.com "Tu Nombre"
   ```
   Te pedirá la contraseña en la terminal. Después puedes dar de alta al resto del personal desde *Configuración → Usuarios*.
4. **Seguridad de Auth (recomendado).** En Supabase → *Authentication → Sign In / Providers*, desactiva *Allow new users to sign up*. Aunque esté activo, los usuarios nuevos quedan inactivos hasta que un administrador los habilite.
5. **Desarrollo:**
   ```bash
   npm run dev
   ```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Desarrollo, compilación y servidor de producción |
| `npm test` | Pruebas unitarias (cálculos, estados, fechas) |
| `npm run typecheck` · `npm run lint` | Verificación de tipos y ESLint |
| `npm run seed:build` | Regenera `supabase/seed.sql` desde `supabase/seed/catalog.json` |
| `npm run seed:remote` | Carga configuración, espacios y catálogo en Supabase vía API (idempotente) |
| `npm run brand:logo` | Regenera los PNG del logotipo a partir del AVIF de `RECURSOS/` |
| `npm run admin:create` | Crea o promueve un administrador |

## Despliegue (Vercel)

1. Importa el repositorio en Vercel.
2. Define `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `NEXT_PUBLIC_APP_TIMEZONE=America/Mazatlan`.
3. En Supabase → *Authentication → URL Configuration*, usa la URL de producción como *Site URL*.

## Pendientes de información del negocio

Se dejaron como campos configurables, sin inventar valores: razón social, RFC, correo de contacto confirmado (hay dos grafías en los recursos), condiciones de pago y cancelación, capacidad de la terraza y precios de renta de terraza y hora extra. Ver PLAN.md §19.

## Seguridad

- `RECURSOS/DATOS Y VARIABLES.txt` contiene la clave secreta en texto plano: bórralo cuando ya no lo necesites (está excluido de git) y considera rotar la clave en Supabase → *Project Settings → API Keys*.
- No subas `.env.local` al repositorio.
