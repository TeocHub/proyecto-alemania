# Proyecto Alemania

Página para planificar la Working Holiday en Alemania de Teoc y Francis: la ruta de trámites, la calculadora de ahorro (con pasaje de ida y vuelta o solo de ida), la carpeta de documentos, las ciudades, la preparación (alemán, hospedaje, experiencias) y las dudas.

## Cómo verla

- Publicada con GitHub Pages: `https://teochub.github.io/proyecto-alemania/`
- En el computador: desde esta carpeta, ejecutar `python3 -m http.server` y abrir `http://localhost:8000`. Abrir `index.html` con doble clic no funciona, porque el navegador bloquea la lectura de los archivos de datos.

## Dónde están los datos

Todo el contenido está en `data/`, en archivos JSON que se pueden editar sin tocar el código:

| Archivo | Qué contiene |
|---|---|
| `data/plan.json` | Nombres, tipo de cambio, requisitos de la embajada, costos, colchones, etapas de la ruta con sus tareas, documentos de la carpeta y fuentes |
| `data/ciudades.json` | Ciudades, gastos mensuales estimados para la pareja y escenarios de ingreso |
| `data/preparacion.json` | Plan de alemán de 12 semanas, frases con pronunciación, cursos, pasos para buscar hospedaje, mensaje para arrendadores, señales de estafa y experiencias de otras personas |
| `data/refugio.json` | Sección «Cuando dudemos»: cómo se sienten hoy, las preguntas que deciden, el ejercicio de los tres meses, familia y distancia, y consecuencias |
| `data/dudas.json` | Temas y preguntas con sus respuestas (las respuestas aceptan HTML simple: `<p>`, `<strong>`) |

Para actualizar el tipo de cambio, cambien `tipoCambio.eur` en `data/plan.json` (también se puede ajustar en la página). Para agregar una duda, copien un bloque de `data/dudas.json` y cambien `id`, `tema`, `pregunta` y `respuesta`.

En la ruta, `offset` son los meses respecto al viaje (por ejemplo, `-6` es seis meses antes; `null` significa "ahora").

## Qué se guarda

Las fechas, montos, sueldos, respuestas, planes de contacto y tareas marcadas se guardan solo en el navegador de cada dispositivo (localStorage). No hay servidor ni cuentas: lo que escribe uno en su celular no aparece en el del otro. Para compartir las respuestas, usen «Copiar nuestras respuestas».

## Fuentes

Datos revisados el 20 de noviembre de 2026. Los requisitos salen de la página oficial de la Embajada de Alemania en Santiago; confírmenlos ahí antes de pagar o postular.

## Estructura

```
index.html       página
css/styles.css   estilos
js/app.js        lógica y cálculos
data/*.json      contenido editable
```
