# Contrato de interfaz: Medición de visitas

**Feature**: [spec.md](../spec.md) | **Fecha**: 2026-11-12

Define lo que la app expone hacia el servicio de estadísticas y el texto nuevo del aviso. No hay pantallas ni rutas nuevas.

## 1. El script de medición

Solo en las páginas de `src/app/(cliente)/` (FR-001). Nunca en `src/app/admin/`, incluido `/admin/entrar` (FR-002).

```html
<script async
  src="https://estadisticas.cristobalia.com/script.js"
  data-website-id="49b620b8-b094-49c2-9ff2-edf6ba9d0c38"
  data-domains="app.cristobalia.com"
  data-before-send="antesDeEnviarUmami"></script>
```

Lo inserta `next/script` con `strategy="afterInteractive"` ([research 3](../research.md#3-dónde-se-carga-el-script-y-con-qué-estrategia)).

| Atributo | Valor | Requisito |
|---|---|---|
| `data-website-id` | `49b620b8-b094-49c2-9ff2-edf6ba9d0c38` | Sitio registrado por el propietario |
| `data-domains` | `app.cristobalia.com` | FR-003: nada se envía desde otro dominio |
| `data-before-send` | `antesDeEnviarUmami` | FR-002: segunda protección del panel |

No se usan `data-exclude-search`, `data-do-not-track`, `data-auto-track="false"` ni `data-tag` ([research 6](../research.md#6-privacidad-de-lo-que-se-envía)).

### `antesDeEnviarUmami(tipo, carga)`

Función global que el script llama antes de cada envío.

- Si `carga.url` es `/admin` o empieza con `/admin/` (con o sin dominio), devuelve `false` y no se envía nada.
- En cualquier otro caso devuelve `carga` sin cambios.
- Si `carga` no tiene `url`, también la devuelve sin cambios.

## 2. El evento de interés

Lo envía `EnlaceTelefono` al tocar cualquier teléfono de contacto de la sección de cliente (FR-006, [research 5](../research.md#5-el-evento-de-interés-el-toque-al-teléfono)).

```js
window.umami?.track("interes-telefono", { pagina: "/producto/12", producto: "Carro de control remoto" })
```

| Campo | Valor | Cuándo |
|---|---|---|
| nombre del evento | `interes-telefono` | Siempre |
| `pagina` | `location.pathname`, sin consulta ni `#` | Siempre |
| `producto` | Nombre visible del producto o del artículo por encargo | Solo en la página de producto y en cada artículo de «Encargos» |

Reglas:

- El enlace conserva `href="tel:+52XXXXXXXXXX"`, sus clases, su icono y su texto. `onClick` **no** llama a `preventDefault`.
- Si `window.umami` no existe o `track` lanza un error, no pasa nada visible y la llamada se abre igual (FR-005 y FR-006).
- El evento no lleva nombres ni teléfonos de clientes (FR-004).

## 3. Aviso de privacidad

Archivo: `src/lib/aviso-privacidad.ts`. Se **agregan** estos párrafos al final de cada sección indicada. Los demás párrafos, los títulos y el orden de las 8 secciones no cambian (FR-008).

**«Datos que recabamos»** (`datos`), después de «No recabamos datos sensibles.»:

> Cuando visitas esta página, medimos de forma anónima qué páginas ves, la ciudad o el país aproximados desde donde entras, el tipo de dispositivo, el tamaño de la pantalla, el navegador y su idioma, el sitio desde el que llegaste y cuántas veces se toca el teléfono de contacto. No usamos cookies, no guardamos tu dirección IP y estos datos no sirven para identificarte.

**«Para qué los usamos»** (`finalidades`):

> Usamos los datos de visitas solo para saber qué productos interesan más y mejorar la página.

**«Con quién los compartimos»** (`terceros`):

> Los datos de visitas se guardan en el mismo servidor donde funciona esta página y no los compartimos con nadie.

**Fecha**: `actualizado` cambia a la fecha en que se publica esta spec, en formato `AAAA-MM-DD` (FR-010). La página ya la muestra como «12 de noviembre de 2026», por ejemplo.

Cubre FR-009:

| Elemento de FR-009 | Dónde |
|---|---|
| Qué se mide, de forma anónima | `datos` |
| Sin cookies, sin IP, no identifica | `datos` |
| Para qué se usa | `finalidades` |
| Mismo servidor, sin terceros | `terceros` |

El propietario aprueba esta redacción antes de publicar, igual que en la spec 003.
