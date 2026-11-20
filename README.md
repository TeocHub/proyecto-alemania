# Proyecto Alemania

Página para planificar la Working Holiday en Alemania de Teoc y Francis, empezando por la etapa de ahora: armar el colchón en Santiago. Tiene el colchón, la calculadora de ahorro para el viaje (con pasaje de ida y vuelta o solo de ida), la carpeta de documentos, las ciudades, la preparación (alemán, hospedaje, experiencias) y las dudas.

## Cómo verla

- Publicada con GitHub Pages: `https://teochub.github.io/proyecto-alemania/`
- En el celular se puede agregar a la pantalla de inicio (Compartir → Agregar a pantalla de inicio): abre como app y funciona sin señal con lo último que cargó.
- En el computador: desde esta carpeta, ejecutar `python3 -m http.server` y abrir `http://localhost:8000`. Abrir `index.html` con doble clic no funciona, porque el navegador bloquea la lectura de los archivos de datos.

## Las ventanas

Cada sección es una ventana. En el celular se ve una a la vez, con la barra de abajo (Inicio, Colchón, La plata, Trámites y Más). En tablet horizontal o computador, todas quedan en la barra lateral.

| Ventana | Qué tiene |
|---|---|
| Inicio | La línea completa (colchón → viaje) y los visores: el colchón, cada mes, lo próximo, Alemania en números y cómo se sienten |
| 0. El colchón | Nuestra economía hoy, las etapas (frenar el déficit, fondo de emergencia, colchón completo, ahorro para Alemania), «¿Y si…?» con trabajos nuevos, lo que llevamos guardado y lo que mueve los plazos |
| 1. Cuando dudemos | Cómo se sienten, las preguntas que deciden, el mes malo, familia y consecuencias |
| 2. La plata | La meta para Alemania y el desglose |
| 3. ¿Dónde llegamos? | Ciudades y sueldos |
| 4. Los trámites | La ruta y la carpeta |
| 5. Prepararse | Alemán, hospedaje y experiencias |
| Todas las dudas | Buscador de dudas |
| Guardar entre los dos | Conectar la planilla de Google |

Con «Primero el colchón, después Alemania» activado (viene así), el ahorro para el viaje empieza cuando el colchón esté completo, y la fecha posible de viaje se calcula desde ahí.

## Guardar entre los dos

Sin conectar, todo se guarda solo en el navegador de cada dispositivo. Para que Teoc y Francis vean lo mismo, se conecta una planilla de Google propia (gratis y no se apaga por falta de uso):

1. Crear una planilla en `sheets.new` con la cuenta de uno de los dos.
2. Extensiones → Apps Script, pegar el contenido de `apps-script/Codigo.gs` y cambiar `cambien-esta-clave` por una clave propia.
3. Implementar → Nueva implementación → Aplicación web. Ejecutar como: Yo. Quién tiene acceso: Cualquier persona.
4. En la página, ventana «Guardar entre los dos»: pegar la dirección que termina en `/exec` y la clave. Después, «Mandar el enlace al otro» conecta el segundo teléfono con un toque.

Cada dato se guarda con la hora en que se cambió y gana el cambio más reciente, así los dos pueden anotar al mismo tiempo. La hoja «Ahorros» de la planilla muestra lo guardado en el colchón; la hoja oculta «datos» es la que usa la página y no se edita a mano. La dirección y la clave quedan solo en cada dispositivo, nunca en este repositorio.

Si cambian el código de la planilla, usen Implementar → Administrar implementaciones → Editar → Nueva versión, para que la dirección no cambie.

## Dónde están los datos

Todo el contenido está en `data/`, en archivos JSON que se pueden editar sin tocar el código. Los montos personales (sueldos, arriendo, ahorros) **no** van en estos archivos: el repositorio es público. Se anotan en la página.

| Archivo | Qué contiene |
|---|---|
| `data/colchon.json` | Textos del colchón, etapas, escenarios de «¿Y si…?», sueldos estimados de cada escenario y acciones para llegar antes |
| `data/plan.json` | Nombres, tipo de cambio, requisitos de la embajada, costos, colchones para vivir allá, etapas de la ruta con sus tareas, documentos de la carpeta y fuentes |
| `data/ciudades.json` | Ciudades, gastos mensuales estimados para la pareja y escenarios de ingreso |
| `data/preparacion.json` | Plan de alemán de 12 semanas, frases con pronunciación, cursos, pasos para buscar hospedaje, mensaje para arrendadores, señales de estafa y experiencias de otras personas |
| `data/refugio.json` | Ventana «Cuando dudemos» |
| `data/dudas.json` | Temas y preguntas con sus respuestas (las respuestas aceptan HTML simple: `<p>`, `<strong>`) |

En la ruta, `offset` son los meses respecto al viaje (por ejemplo, `-6` es seis meses antes; `null` significa "ahora").

## Números conectados

Todos los montos que aparecen en los textos salen de un solo cálculo. En los JSON se escriben como marcadores entre llaves dobles, por ejemplo `{{meta}}`, `{{llevan}}`, `{{congelado}}`, `{{fechaFondos}}`, `{{metaColchon}}` o `{{faltaMes}}`. La lista completa está en la función `contexto()` de `js/app.js`.

## Fuentes

Datos revisados el 20 de noviembre de 2026. Los requisitos salen de la página oficial de la Embajada de Alemania en Santiago; confírmenlos ahí antes de pagar o postular. Los sueldos de los escenarios usan el sueldo mínimo de 2026 ($539.000 bruto) como referencia.

## Estructura

```
index.html             página y ventanas
css/styles.css         estilos
js/app.js              lógica, cálculos y ventanas
js/sync.js             guardado compartido con la planilla
apps-script/Codigo.gs  código para pegar en la planilla de Google
data/*.json            contenido editable
sw.js                  modo sin conexión
manifest.webmanifest   para instalar en el celular
```
