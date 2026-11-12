# Contrato de interfaz: Sello promocional

**Feature**: [spec.md](spec.md) | **Fecha**: 2026-11-11

## Franja en la sección de cliente

Se dibuja en todas las páginas de `src/app/(cliente)/`, justo debajo del encabezado, solo si `activo = true` (FR-009).

```html
<aside aria-label="Promoción" data-sello-promocional data-color="rojo" style="background:#B42318;color:#FFFFFF">
  <p>Buen Fin · Pregunta por tu descuento</p>
</aside>
```

- Es un `<aside>` con nombre y no un `<div>`, porque queda entre `<header>` y `<main>` y axe exige que todo el contenido esté dentro de un landmark (regla `region`). En la vista previa del panel, que ya está dentro de `<main>`, se dibuja como `<div>` (research 9).

- Ocupa todo el ancho y **no queda fija**: se desplaza con la página.
- No es un enlace ni un botón, no se puede cerrar y no se puede enfocar.
- El texto va centrado, mide al menos 14 px en negritas medias y se parte en dos líneas si no cabe. Nunca provoca desplazamiento horizontal.
- Con `activo = false` no se dibuja nada; el HTML de la página queda igual que antes de esta spec.

## Página `/admin/promocion`

Protegida como el resto de `admin/(panel)` (FR-001). Título: «Promoción».

| Control | Etiqueta | Detalle |
|---|---|---|
| Campo de texto, una línea | «Texto del sello» | Debajo: «Te quedan N caracteres» («Te queda 1 carácter» en singular), en `aria-live="polite"`. Si pasa de 40: «Te pasaste por N caracteres» («por 1 carácter» en singular), en el color de error, y el botón «Guardar» se deshabilita |
| Grupo de radios | «Color» | Opciones «Rojo», «Verde», «Dorado» y «Azul», en ese orden, cada una con su muestra. Por omisión, la guardada |
| Casilla | «Mostrar el sello en la página» | Marcada si el sello está activo |
| Vista previa | «Así se verá» | El mismo componente de la franja, con el texto y el color escritos, aunque la casilla esté desmarcada. Sin texto muestra «Escribe el texto del sello» en el color de texto de ejemplo de cada color ([research 3](../research.md#3-los-colores)) |
| Botón | «Guardar» | Envía el formulario |

Mensajes al guardar (en `aria-live="polite"`):

- Correcto y activo: «Listo. El sello se muestra en la página.»
- Correcto y desactivado: «Listo. El sello está desactivado.»
- Activar con texto vacío o con solo espacios, junto al campo: «Escribe el texto del sello para mostrarlo.»
- Texto de más de 40 caracteres, o de más de 400 bytes, junto al campo: «El texto puede tener hasta 40 caracteres.»
- Color que no está en la lista, junto al grupo «Color»: «Elige uno de los colores de la lista.» Con los radios no se puede elegir otro color; solo ocurre si se manipula el formulario.
- Sin sesión: el mensaje común `NO_AUTORIZADO`.

## Navegación del panel

- **Portátil**: sexto enlace «Promoción», con el icono `Megaphone`, en la navegación superior. Queda marcado como página actual en `/admin/promocion`.
- **Celular**: botón «Promoción» con icono y texto en el encabezado, junto a «Salir». La barra inferior no cambia. El subtítulo «Administración» solo se muestra de 640 px de ancho en adelante.

## Acción de servidor `guardarPromocion`

En `src/acciones/promocion.ts`, con `useActionState`.

Entrada (`FormData`):

| Campo | Valor |
|---|---|
| `texto` | Texto tal como se escribió |
| `color` | `rojo`, `verde`, `dorado` o `azul` |
| `activo` | `"on"` si la casilla está marcada; ausente si no |

Pasos:

1. `exigirSesion()`.
2. Normaliza el texto (NFC y sin espacios al principio ni al final) y lo valida con las reglas de `src/dominio/promocion.ts`.
3. Hace el *upsert* de la fila `id = 1`.
4. `revalidatePath("/", "layout")`.

Salida: `Resultado<{ activo: boolean; texto: string; color: ClaveColor }>`, con lo que quedó guardado, ya normalizado, para que el formulario muestre siempre lo guardado. Los errores usan `DATOS_INVALIDOS`, con `campos.texto` o `campos.color` y el mensaje correspondiente de la tabla de arriba.
