# Implementation Plan: VendeProductos v0: catálogo, ventas, apartados y encargos

**Branch**: `001-catalogo-ventas-apartados` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-catalogo-ventas-apartados/spec.md`

## Summary

Aplicación web para Productos Eli's con una sección pública (catálogo, artículos por encargo y consulta de saldos) y una sección de administrador (productos, categorías, ventas, apartados, encargos, pagos y búsquedas). Se construye como un solo proyecto Next.js con interfaz Tailwind y shadcn/ui, PostgreSQL y reglas de negocio aisladas y probadas. Los importes se guardan como centavos enteros, y la disponibilidad se calcula dentro de transacciones con bloqueo. El detalle de las decisiones está en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 7.0 sobre Node.js 24 (última 5.x si `next` o `drizzle-kit` aún no admiten la 7)

**Primary Dependencies**: Next.js 16.4, React 19.3, Tailwind CSS 4.3, shadcn/ui, lucide-react, sonner, Geist, Drizzle ORM 0.45, `pg` 8, `@vercel/blob` 2, Zod 4, jose 6

**Storage**: PostgreSQL en Neon para datos; Vercel Blob para fotos

**Testing**: Vitest 5 con PGlite para reglas de negocio; Playwright 1.64 con axe para flujos y accesibilidad

**Target Platform**: Navegadores móviles y de portátil actuales; despliegue en Vercel Pro

**Project Type**: Aplicación web de un solo proyecto

**Performance Goals**: Catálogo de la primera vista en menos de 2.5 segundos en una conexión móvil 4G; acciones del vendedor en menos de 1 segundo, para cumplir los tiempos de SC-001 a SC-007

**Constraints**: Importes exactos al centavo; todo en español de México; precio de compra nunca en respuestas públicas; sin borrado físico; operable por una persona no técnica

**Scale/Scope**: Hasta unos 1,000 productos, 5,000 operaciones al año, decenas de visitas simultáneas y 1 a 3 vendedores

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Inicial | Post-diseño |
|---|---|---|---|
| I. Spec First | Spec registrada en `specs/MAPA.md` con un propietario; sigue en Borrador y su aprobación formal debe constar antes de implementar | PASS | PASS |
| II. Números | Centavos enteros, sin flotantes; formateadores de precio, fecha y hora (research 7 y 8) | PASS | PASS |
| III. Idioma y mercado | Mensajes centralizados en es-MX; solo MXN | PASS | PASS |
| IV. Cero alcance fantasma | Tema claro únicamente; sin reportes ni reactivaciones; aviso de privacidad señalado, no agregado | PASS | PASS |
| V. Tests con la spec | Pruebas nombradas por FR, SC o escenario; `npm run verificar` como puerta | PASS | PASS |
| VI. Verificable sin técnica | [quickstart.md](quickstart.md) comprueba los criterios usando la app | PASS | PASS |
| VII. Interfaz accesible | Primitivas accesibles, axe en pruebas, móvil y portátil | PASS | PASS |

**Nota**: el límite de intentos (research 12) agrega un mensaje de espera no descrito en la spec. Se considera protección de FR-001 y FR-035, no una función nueva.

## Project Structure

### Documentation (this feature)

```text
specs/001-catalogo-ventas-apartados/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── rutas.md
│   └── acciones.md
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (cliente)/              # Catálogo, producto, encargos, mis-apartados
│   ├── admin/                  # Sección protegida
│   ├── api/fotos/              # Token de subida directa
│   └── globals.css             # Tokens de diseño en OKLCH
├── proxy.ts                    # Protección de /admin
├── components/
│   ├── ui/                     # Componentes de shadcn/ui
│   ├── cliente/
│   └── admin/
├── dominio/                    # Reglas puras: dinero, fechas, estados, normalización
├── servicios/                  # Casos de uso con transacciones
├── consultas/
│   ├── publicas.ts             # Sin precio de compra
│   └── admin.ts
├── acciones/                   # Acciones de servidor
├── db/                         # Esquema, migraciones, semilla
└── lib/                        # Sesión, fotos, límite de intentos, mensajes

tests/
├── unit/                       # Reglas puras
├── integration/                # Servicios contra PGlite
├── concurrency/                # Última unidad contra rama de prueba de Neon
└── e2e/                        # Flujos y accesibilidad con Playwright
```

**Structure Decision**: proyecto único con Next.js en la raíz del repositorio. Las reglas de negocio viven en `dominio/` y `servicios/`, sin depender de la interfaz, para probarlas directamente. Las consultas públicas están separadas para que el precio de compra no pueda filtrarse por accidente.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
