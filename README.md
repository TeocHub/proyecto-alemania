# Proyecto Alemania

Página para planificar la Working Holiday en Alemania desde Chile, para una o dos personas (pareja o amigos). Cualquier grupo la puede usar con sus nombres: al entrar por primera vez, la bienvenida explica qué es, pide quiénes viajan, repasa los requisitos de la visa («¿Pueden ir?») y pregunta si pagan arriendo o viven con su familia. Con esa respuesta cambia la etapa 0: quien arrienda arma primero un colchón en Santiago; quien vive con su familia ahorra directo para el viaje. Tiene el colchón o el ahorro, la calculadora de ahorro para el viaje (con pasaje de ida y vuelta o solo de ida), la carpeta de documentos, las ciudades, la preparación (alemán, hospedaje, experiencias) y las dudas.

## Cómo verla

- Publicada con GitHub Pages: `https://teochub.github.io/proyecto-alemania/`
- En el celular se puede agregar a la pantalla de inicio (Compartir → Agregar a pantalla de inicio): abre como app y funciona sin señal con lo último que cargó.
- En el computador: desde esta carpeta, ejecutar `python3 -m http.server` y abrir `http://localhost:8000`. Abrir `index.html` con doble clic no funciona, porque el navegador bloquea la lectura de los archivos de datos.

## Las ventanas

Cada sección es una ventana. En el celular se ve una a la vez, con la barra de abajo (Inicio, Colchón —o Ahorro, si viven con su familia—, Las lucas, Trabajos y Más). En tablet horizontal o computador, todas quedan en la barra lateral.

| Ventana | Qué tiene |
|---|---|
| Inicio | El mes de viaje (si nunca lo eligieron, Inicio lo pide antes de mostrar fechas), la línea completa (colchón o ahorro → viaje) con «Estás aquí» (lo marcado en Los trámites y lo que toca, con link a la estación) y los visores: el colchón o el ahorro, el ritmo y cada mes (estos dos aparecen con datos anotados), la plata del viaje y cómo se sienten. Si viven con su familia, la ruta de trámites corre desde hoy |
| 1. Los trámites | La ruta y la carpeta |
| 2. La plata | La meta para Alemania y el desglose |
| 3. ¿Dónde llegamos? | Ciudades y sueldos |
| 4. Prepararse | Alemán, hospedaje y experiencias |
| Las lucas | La cascada de prioridades: el ingreso del mes llena en orden techo, comida y transporte, lo de cada uno, deudas, colchón y Alemania. Se puede mover el monto para simular |
| Trabajos | Estudio de sueldos 2026 sin título, con filtros y un combinador para probar un trabajo por persona |
| Dónde vivir | Arriendo promedio 1D por comuna, líneas de metro y señales de seguridad; «Probar en Las lucas» simula vivir ahí. Opcional si viven con su familia |
| 0. El colchón | Si arriendan: nuestra economía hoy, las etapas (frenar el déficit, fondo de emergencia, colchón completo, ahorro para Alemania), «¿Y si…?» con trabajos nuevos, lo que llevamos guardado y lo que mueve los plazos |
| 0. Ahorrar para el viaje | Si viven con su familia: la misma ventana, con las etapas cubrir el mes, los fondos que pide la embajada, la meta completa y listo. Al final, «Armar también un colchón» lo agrega como opción |
| Cuando dudemos | Cómo se sienten, las preguntas que deciden, el mes malo, familia y consecuencias |
| Todas las dudas | Primero los temas (con cuántas preguntas tiene cada uno); al tocar uno aparecen sus preguntas y la respuesta se abre bajo la pregunta. El buscador revisa todas las preguntas y respuestas, sin importar el tema |
| Guardar entre los dos | Conectar la planilla de Google |

Con «Primero el colchón, después Alemania» activado (viene así), el ahorro para el viaje empieza cuando el colchón esté completo, y la fecha posible de viaje se calcula desde ahí. Si viven con su familia y no marcan «Armar también un colchón» (`estado.colchonOpcional`), la meta del colchón es cero y todo lo anotado cuenta para el viaje.

## En el celular: lo corto primero

La meta es que ninguna vista pase de 3 pantallas (390 × 844 px) sin tocar nada. Lo que se usa más queda a la vista y el resto va en pliegues: un `<details class="pliegue">` con el título, una línea de qué hay dentro (`.pliegue-resumen`) y «Abrir»/«Cerrar» a la derecha. Abierto, el bloque queda marcado con la línea amarilla a la izquierda; no hay animaciones. En JS, `pliegue({ titulo, resumen })` arma uno y `pintarFuentesVista()` deja las fuentes de cada vista plegadas. Un enlace `#id` a algo que está dentro de un pliegue lo abre solo (`abrirHasta()`).

En una sola columna, la ficha de un trabajo (Trabajos y Buscar allá) o de una comuna (Dónde vivir) se abre bajo lo que se tocó y se cierra al tocarlo de nuevo (`ubicarFicha()`). En «Trabajos», el resumen «En corto» sale de `trabajos.json > conclusionCorta`.

## Guardar entre los dos

Sin conectar, todo se guarda solo en el navegador de cada dispositivo. Cada grupo usa la misma dirección de la página pero su propia planilla de Google (gratis y no se apaga por falta de uso). Se configura una sola vez en un dispositivo; los demás abren el enlace que se les manda y reciben el grupo y sus datos:

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
| `data/trabajos.json` | Trabajos, rangos de sueldo, requisitos y fuentes (revisado el 20-nov-2026) |
| `data/barrios.json` | Comunas, arriendo, metro, señales de seguridad y fuentes |
| `data/colchon.json` | Textos del colchón, etapas, etapas de «Ahorrar para el viaje» (`etapasAhorro`), escenarios de «¿Y si…?», sueldos estimados de cada escenario y acciones para llegar antes |
| `data/plan.json` | Tipo de cambio, requisitos de la embajada (incluida la edad para postular), la historia de la plata de Inicio (`plataInicio`), «¿Pueden ir?» (`puedesIr`: cada requisito con su regla, pregunta y qué significa no cumplirlo, y el enlace oficial), costos, colchones para vivir allá, etapas de la ruta con sus tareas, documentos de la carpeta y fuentes |
| `data/ciudades.json` | Ciudades, gastos mensuales estimados para dos personas (`gastos`) y para una (`gastosUno`), y escenarios de ingreso de cada grupo |
| `data/preparacion.json` | Plan de alemán de 12 semanas, frases con pronunciación, cursos, pasos para buscar hospedaje, mensaje para arrendadores, señales de estafa y experiencias de otras personas |
| `data/refugio.json` | Ventana «Cuando dudemos» |
| `data/buscar-alemania.json` | Ventana «Buscar allá»: trabajos en Alemania con sueldo por hora, portales de empleo y de arriendo por ciudad, y la carpeta para arrendar |
| `data/dudas.json` | Temas y preguntas con sus respuestas (las respuestas aceptan HTML simple: `<p>`, `<strong>`) |
| `data/glosario.json` | Términos en alemán (Anmeldung, Steuer-ID, Krankenkasse, Sperrkonto, Minijob, Kaution…) con su traducción corta, definición y fuente |

Las dudas llevan sus fuentes como enlaces dentro de la respuesta. Los temas «La maleta», «Seguridad y emergencias» y «Mientras, en Chile» toman sus datos que cambian de `plan.json > llegar` (invierno, estadística policial, plazo para reclamar por discriminación, costo del pasaporte en el consulado, días del salvoconducto); el `_nota` de ese bloque dice qué revisar cada año.

## Glosario

Cada término de `data/glosario.json` se marca solo, con subrayado punteado, la primera vez que aparece en cada párrafo de cualquier vista: no hay que escribir nada especial en los textos. Al tocarlo se abre una tarjeta con la palabra en alemán, la traducción corta (`dice`), la `definicion` (acepta `{{tokens}}` y `definicionUno`) y sus `fuentes`. `formas` son las maneras exactas en que aparece en los textos (distingue mayúsculas: «WG» no marca «wg»). No se marcan palabras dentro de enlaces, botones ni campos. Lo hace `montarGlosario()` en `js/app.js`, con un observador que también marca lo que se pinta después; si el archivo no carga, la página sigue igual.

En la ruta, `offset` son los meses respecto al viaje (por ejemplo, `-6` es seis meses antes; `null` significa "ahora").

## Números conectados

En Inicio, «La plata del viaje» cuenta la meta como una sola historia: el total, lo que se paga antes de viajar, lo que llevan y, de eso, lo que la embajada pide congelado. Cada cifra se toca para ver su detalle; para dos, «Entre los dos / Cada uno» cambia los montos. Los textos están en `plan.json > plataInicio`: `{llave}` (una llave) la llena `pintarNumeros()` con las cifras de `calcular()`, y `{{llave}}` son los tokens de siempre. `estado.viajeElegido` dice si el mes de viaje se eligió; mientras no, Inicio no muestra fechas calculadas. Elegirlo marca la tarea «Elegir mes y año de viaje». Los perfiles anteriores quedan como elegidos solo si ya tenían marcada esa tarea.

Todos los montos que aparecen en los textos salen de un solo cálculo. En los JSON se escriben como marcadores entre llaves dobles, por ejemplo `{{meta}}`, `{{llevan}}`, `{{congelado}}`, `{{fechaFondos}}`, `{{metaColchon}}` o `{{faltaMes}}`. La lista completa está en la función `contexto()` de `js/app.js`.

## Fuentes

Datos revisados el 20 de noviembre de 2026. Los requisitos salen de la página oficial de la Embajada de Alemania en Santiago; confírmenlos ahí antes de pagar o postular. Los sueldos de los escenarios usan el sueldo mínimo vigente desde mayo de 2026 ($553.553 bruto): unos $560.000 líquidos con gratificación mensual en jornada completa.

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

## Grupo (perfil)

`estado.perfil = { nombres: [1 o 2], tipo: "pareja" | "amigos" | "solo", edades: [], vivienda: "arriendo" | "familia", requisitos: { edad: "si" | "no", … } }` se sincroniza con la planilla. Los perfiles guardados antes de la pregunta por la vivienda quedan como `"arriendo"` (todo sigue igual) y con `requisitos: {}`; lo hace `normalizar()`. Sin perfil, la página muestra la vista `#bienvenida`. Los cálculos usan `N()` (personas que viajan); los textos que cambian con una persona usan `ld(dos, uno)` en JS o `data-uno` en el HTML. El mensaje para arriendos sale de `preparacion.json > hospedaje.plantillas[tipo]` con `{nombres}`. Ningún JSON lleva nombres ni edades: salen del perfil (por ejemplo, la duda «edad» usa `{{plazoEdad}}`, que calcula cuántos años le quedan a cada persona con `plan.json > embajada.edadMinima` y `edadMaxima`). Un dispositivo con datos pero sin perfil abre la bienvenida y conserva lo anotado.

Los textos de los JSON se escriben para dos. Cuando cambian para una persona, el mismo objeto trae la versión en singular con el sufijo `Uno` (`texto` y `textoUno`, `pregunta` y `preguntaUno`, `suma` y `sumaUno`…). Lo que solo sirve a dos lleva `"soloDos": true` y lo que solo sirve a una, `"soloUno": true`. `porGrupo()` en `js/app.js` aplica esto al cargar los datos.

Lo mismo para la vivienda: el sufijo `Familia` reemplaza el texto si viven con su familia (`texto` y `textoFamilia`; `textoFamiliaUno` para una persona), `"soloArriendo": true` desaparece para quien vive con su familia y `"soloFamilia": true`, para quien arrienda. Lo aplica `porVivienda()`, antes que `porGrupo()`. En el HTML, `data-familia` y `data-familia-uno` cambian el texto, y `data-solo-familia` y `data-solo-arriendo` muestran u ocultan.

Los requisitos de «¿Pueden ir?» se verificaron el 22 de noviembre de 2026 en la página de la embajada. Un «no» no bloquea: la ficha explica qué significa y deja seguir.

## Su año allá (`data/el-ano.json`)

Calendario de 12 meses que parte en el mes de viaje del plan. Cada mes muestra primero una línea de resumen (estación, hora en que oscurece y cómo está el trabajo); las fechas, «Lo que contaron» y «Lo que conviene saber» se abren al tocarlos. Cada mes trae estación, hora aproximada en que oscurece en Berlín, cómo está el trabajo y fechas fijas (`calendario`), y dos bloques separados: `relatos` (personas con nombre que cuentan en su texto o entrevista que vivieron en Alemania; resumen propio, país, ciudad, idioma original y enlace) e `items` (información general con fuentes). Los relatos se ubican por `mes` (0 = antes de volar, 1–12) o por `mesCalendario` si dependen de la estación, , tienen `contexto` (quién es y qué buscaba), `texto` (lo que cuenta, sin agregar nada) y opcionalmente `notaPagina` (advertencias de esta página, mostradas aparte), y llevan `nivel`: «persona» (con nombre) o «foro» (foros, wikis, blogs poco identificables). La guía se ubica por `momento`. La vista «Todas las personas» agrupa los relatos por autor. Los textos aceptan tokens `{{clave}}`; las cifras que cambian viven en `plan.json > extranjero`.

## Menú

Inicio · El plan de Alemania (Los trámites, La plata, ¿Dónde llegamos?, Prepararse, Buscar allá, Su año allá) · Ahora, en Santiago (El colchón o Ahorrar para el viaje, Las lucas, Trabajos, Dónde vivir) · Cuando aparecen dudas (Todas las dudas, Cuando dudemos) · Su grupo (Quiénes viajan, Conectar dispositivos). La numeración sigue el camino: 0 es lo de ahora en Santiago y 1 a 4, el plan de Alemania. «Sigue», al pie de cada ventana, usa el mismo orden del menú.

## Avisar lo nuevo

Cuando se publique algo que valga la pena contar, agreguen un bloque al inicio de `novedades` en `data/novedades.json`, con la fecha como `id` (AAAA-MM-DD) y de dos a cuatro puntos cortos. Cada punto puede llevar `ir` (por ejemplo `#dudas`) para llevar a esa parte al tocarlo. Cada dispositivo lo ve una sola vez. Quien entra por primera vez no ve las novedades pasadas.

Si cambia `apps-script/Codigo.gs`, suban `VERSION` en ese archivo y `scriptMinimo` en `data/novedades.json` al mismo número. A quien tenga la planilla con un código anterior le aparece una vez un aviso con los pasos y un botón que copia el código nuevo con su clave ya puesta. Mientras no lo actualice, el aviso sigue visible en Conectar dispositivos. Las planillas que no informan versión cuentan como versión 1.
