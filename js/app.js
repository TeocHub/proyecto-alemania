/* Proyecto Alemania: el colchón de hoy y el plan para un año allá.
   Los datos viven en /data/*.json; este archivo solo los muestra y calcula.
   Cada sección es una «ventana»: en el celular se ve una a la vez con la barra de abajo,
   en tablet o computador con la barra lateral. */

(() => {
  "use strict";

  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DIA = 864e5;
  const MES_DIAS = 30.44;
  const CLAVE = "proyecto-alemania-v1";

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs = {}, html) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === "class") n.className = v;
      else n.setAttribute(k, v === true ? "" : v);
    }
    if (html != null) n.innerHTML = html;
    return n;
  };

  const pesos = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("es-CL");
  const euros = (n) => "€" + Math.round(n).toLocaleString("es-CL");
  const millones = (n) => "$" + (n / 1e6).toLocaleString("es-CL", { maximumFractionDigits: 1 }) + " millones";
  const soloDigitos = (s) => Number(String(s).replace(/[^\d]/g, "")) || 0;
  const mesAnio = (d) => `${MESES[d.getMonth()]} ${d.getFullYear()}`;
  const escapar = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  function sumarMeses(fecha, meses) {
    const enteros = Math.trunc(meses);
    const d = new Date(fecha.getFullYear(), fecha.getMonth() + enteros, fecha.getDate());
    const resto = meses - enteros;
    if (resto) d.setTime(d.getTime() + resto * MES_DIAS * DIA);
    return d;
  }
  const mesesEntre = (a, b) => (b - a) / (MES_DIAS * DIA);

  /* ---------- Estado ---------- */
  const DEFAULTS = {
    viaje: null,
    colchon: "recomendado",
    ahorro: [0, 0],
    economia: {},
    reparto: "mitad",
    respuestas: {},
    contacto: { 0: [], 1: [] },
    tc: null,
    pasaje: null,
    pasajeIda: null,
    soloIda: false,
    seguro: null,
    pasaporte: true,
    ciudad: "berlin",
    ingresoEscenario: "dos-completas",
    estacion: "decidir",
    pestana: "aleman",
    duda: null,
    tema: null,
    marcas: {},
    movs: {},
    colchonMeses: 3,
    colchonPrimero: true,
    colchonSueldos: null,
    escenario: "full",
    combina: null
  };
  const LOCALES = new Set(["pestana", "estacion", "duda", "tema", "escenario", "lucasIngreso", "probarVivienda", "trabajo", "filtrosTrabajo", "vivirTope", "comunaSel"]);
  const copia = (o) => JSON.parse(JSON.stringify(o));

  function leerEstado() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { return {}; }
  }
  function guardarLocal() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin almacenamiento: seguimos en memoria */ }
  }
  function guardar() {
    guardarLocal();
    if (window.Sincro) window.Sincro.cambio();
  }

  let plan, ciudades, dudas, prep, refugio, colchonData, trabajosData, barriosData;
  const hoy = new Date();
  const estado = Object.assign(copia(DEFAULTS), leerEstado());

  /* Rellena lo que falte (por ejemplo, después de traer datos del otro dispositivo). */
  function normalizar() {
    const c = plan.costos;
    if (!Array.isArray(estado.ahorro) || estado.ahorro.length !== 2) estado.ahorro = [0, 0];
    estado.ahorro = estado.ahorro.map((x) => Number(x) || 0);
    for (const k of ["economia", "respuestas", "marcas", "movs"]) if (!estado[k] || typeof estado[k] !== "object") estado[k] = {};
    if (!estado.contacto || typeof estado.contacto !== "object") estado.contacto = { 0: [], 1: [] };
    estado.colchonSueldos = Object.assign({}, colchonData.sueldos, estado.colchonSueldos || {});
    // Los montos viejos (sueldo mínimo de enero, sin gratificación) pasan a los nuevos
    if (estado.colchonSueldos.full === 440000) estado.colchonSueldos.full = colchonData.sueldos.full;
    if (estado.colchonSueldos.part === 320000) estado.colchonSueldos.part = colchonData.sueldos.part;
    if (!colchonData.mesesOpciones.includes(estado.colchonMeses)) estado.colchonMeses = 3;
    if (typeof estado.colchonPrimero !== "boolean") estado.colchonPrimero = true;
    if (!estado.combina || typeof estado.combina !== "object") estado.combina = { 0: "hoy", 1: "hoy", m0: false, m1: false };
    estado.tc = estado.tc || plan.tipoCambio.eur;
    estado.pasaje = estado.pasaje || c.pasaje.inicial;
    estado.pasajeIda = estado.pasajeIda || c.pasajeIda.inicial;
    estado.seguro = estado.seguro || c.seguro.inicial;
    if (!plan.colchones.some((x) => x.id === estado.colchon)) estado.colchon = "recomendado";
    if (!estado.viaje || estado.viaje.m == null) {
      const d = sumarMeses(new Date(hoy.getFullYear(), hoy.getMonth(), 1), 12);
      estado.viaje = { m: d.getMonth(), y: d.getFullYear() };
    }
  }

  const fechaViaje = () => new Date(estado.viaje.y, estado.viaje.m, 1);

  /* ---------- Economía de hoy ---------- */
  function economia() {
    const e = estado.economia || {};
    const n = (k) => Number(e[k]) || 0;
    const sueldo = [n("sueldo0"), n("sueldo1")];
    const casa = n("arriendo") + n("cuentas") + n("comida") + n("transporte") + n("deudas") + n("otrosCasa");
    const personal = [n("personal0"), n("personal1")];
    const ingreso = sueldo[0] + sueldo[1];
    const parte = estado.reparto === "proporcional" && ingreso > 0
      ? sueldo.map((x) => casa * (x / ingreso))
      : [casa / 2, casa / 2];
    const queda = sueldo.map((x, i) => x - parte[i] - personal[i]);
    return { sueldo, casa, personal, ingreso, parte, queda, hayDatos: ingreso > 0, arriendo: n("arriendo"), cuentas: n("cuentas") };
  }

  /* ---------- El colchón ---------- */
  const ETAPAS = ["deficit", "emergencia", "colchon", "alemania"];
  const totalColchon = () => Object.values(estado.movs || {}).reduce((s, m) => s + (m && Number(m.m) || 0), 0);

  function colchon({ extra = 0, pieza = null, arriendo = null } = {}) {
    const eco = economia();
    const meses = estado.colchonMeses || 3;
    // pieza reemplaza arriendo y cuentas; arriendo reemplaza solo el arriendo con gasto común
    const casa = pieza != null ? eco.casa - eco.arriendo - eco.cuentas + pieza
      : arriendo != null ? eco.casa - eco.arriendo + arriendo : eco.casa;
    const gastoMes = casa + eco.personal[0] + eco.personal[1];
    const ingreso = eco.ingreso + extra;
    const disp = ingreso - gastoMes;
    const meta = gastoMes * meses;
    const emergencia = gastoMes;
    const ahorrado = totalColchon();
    const falta = Math.max(0, meta - ahorrado);
    const mesesFalta = falta === 0 ? 0 : disp > 0 ? falta / disp : Infinity;
    const listo = falta === 0 ? hoy : isFinite(mesesFalta) ? sumarMeses(hoy, mesesFalta) : null;
    const faltaEmergencia = Math.max(0, emergencia - ahorrado);
    const listoEmergencia = faltaEmergencia === 0 ? hoy : disp > 0 ? sumarMeses(hoy, faltaEmergencia / disp) : null;
    let etapa = null;
    if (eco.hayDatos && gastoMes > 0) {
      if (falta === 0) etapa = "alemania";
      else if (disp <= 0) etapa = "deficit";
      else if (ahorrado < emergencia) etapa = "emergencia";
      else etapa = "colchon";
    }
    return {
      hayDatos: eco.hayDatos && gastoMes > 0, eco, gastoMes, ingreso, disp, meta, emergencia, ahorrado,
      falta, faltaEmergencia, mesesFalta, listo, listoEmergencia, etapa, meses
    };
  }

  /* Cuándo empieza el ahorro para Alemania: hoy, o cuando el colchón esté completo. */
  function inicioAlemania(c = colchon()) {
    if (!estado.colchonPrimero || !c.hayDatos || c.falta === 0) return hoy;
    return c.listo; // null si hoy no alcanza a ahorrar
  }

  /* ---------- Cálculo del dinero para Alemania ---------- */
  function calcular(fecha, inicio) {
    const e = plan.embajada, c = plan.costos;
    const tc = estado.tc;
    const V = fecha || fechaViaje();
    const S = inicio || inicioAlemania() || hoy;
    const F = sumarMeses(V, -6);      // fondos congelados (90 días antes de la cita + margen)
    const D2 = sumarMeses(V, -1.5);   // compra de pasajes con visas aprobadas

    const visa = e.arancel * tc;
    const pasaje = estado.soloIda ? estado.pasajeIda : estado.pasaje;
    const gastoPersona = visa + estado.seguro + pasaje + c.documentos;
    const gastoTotal = gastoPersona * 2 + (estado.pasaporte ? c.pasaporte : 0);

    const pruebaEur = e.solvencia + e.extraSinAlojamiento + (estado.soloIda ? e.extraSinRegreso : 0);
    const congelado = pruebaEur * tc * (1 + e.colchonCambio);
    const colchonEur = plan.colchones.find((x) => x.id === estado.colchon).eur;
    const colchonPersona = Math.max(colchonEur * tc, congelado);
    const meta = gastoTotal + colchonPersona * 2;

    const actual = estado.ahorro[0] + estado.ahorro[1];
    const mesesF = mesesEntre(S, F);
    const mesesD2 = mesesEntre(S, D2);
    // Un monto mensual parejo por persona que cumple dos cosas:
    // tener su solvencia completa al congelar (F) y su meta completa al comprar pasajes (D2).
    const porPersona = estado.ahorro.map((a) => {
      const faltaF = Math.max(0, congelado - a);
      const faltaMeta = Math.max(0, meta / 2 - a);
      if (faltaMeta === 0) return 0;
      if ((faltaF > 0 && mesesF < 0.25) || mesesD2 < 0.25) return Infinity;
      return Math.max(faltaF > 0 ? faltaF / mesesF : 0, faltaMeta / mesesD2);
    });
    const mensual = porPersona[0] + porPersona[1];
    const fondosListos = estado.ahorro.every((a) => a >= congelado);

    return {
      V, S, F, D2, visa, pasaje, gastoPersona, gastoTotal, pruebaEur, congelado, colchonPersona, meta,
      actual, mesesF, mesesD2, porPersona, mensual, fondosListos,
      mesesViaje: mesesEntre(hoy, V), empiezaDespues: mesesEntre(hoy, S) > 0.5
    };
  }

  function fechaPosible(disponible, inicio) {
    if (disponible <= 0) return null;
    const base = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    for (let m = 3; m <= 96; m++) {
      const V = sumarMeses(base, m);
      const r = calcular(V, inicio);
      if (isFinite(r.mensual) && r.mensual <= disponible) return V;
    }
    return null;
  }

  function simular(esc) {
    const s = estado.colchonSueldos;
    const suma = (esc.suma || []).reduce((a, k) => a + (Number(s[k]) || 0), 0);
    const extra = esc.reemplaza ? suma - economia().ingreso : suma;
    const c = colchon({ extra, pieza: esc.pieza ? Number(s.pieza) || 0 : null });
    const inicio = estado.colchonPrimero ? (c.falta === 0 ? hoy : c.listo) : hoy;
    const fecha = c.hayDatos && c.disp > 0 && inicio ? fechaPosible(c.disp, inicio) : null;
    return { c, fecha, extra };
  }

  /* ---------- Una sola fuente para todos los números ----------
     ctx se recalcula cada vez que cambia algo; todo texto con {{clave}} lo usa. */
  let ctx = {};
  const t = (s) => String(s).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in ctx ? ctx[k] : m));
  const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const vivo = (raw) => `data-raw="${attr(raw)}"`;
  function refrescarVivos() {
    document.querySelectorAll("[data-raw]").forEach((n) => { n.innerHTML = t(n.dataset.raw); });
  }

  function contexto(r) {
    const e = plan.embajada, s = plan.sueldo, tc = estado.tc || plan.tipoCambio.eur;
    const ciudad = ciudades.ciudades.find((x) => x.id === estado.ciudad) || ciudades.ciudades[0];
    const gc = ciudad.gastos;
    const dosCompletas = ciudades.ingresos.find((x) => x.id === "dos-completas");
    const eurDec = (n) => "€" + n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const c = colchon();
    return {
      solvencia: euros(e.solvencia),
      extraIda: euros(e.extraSinRegreso),
      extraAloj: euros(e.extraSinAlojamiento),
      arancel: euros(e.arancel),
      arancelClp: pesos(e.arancel * tc),
      seguroMin: euros(e.seguroCoberturaMinima),
      pasaporte: pesos(plan.costos.pasaporte),
      margen: Math.round(e.colchonCambio * 100) + "%",
      pruebaEur: euros(r.pruebaEur),
      congelado: pesos(r.congelado),
      congeladoDos: pesos(r.congelado * 2),
      meta: millones(r.meta),
      gasto: millones(r.gastoTotal),
      llevan: millones(r.colchonPersona * 2),
      llevanEur: euros((r.colchonPersona * 2) / tc),
      mensual: isFinite(r.mensual) ? pesos(r.mensual) : "más de lo posible con esta fecha",
      fechaViaje: mesAnio(r.V),
      fechaFondos: mesAnio(r.F),
      fechaPasajes: mesAnio(r.D2),
      colchon: plan.colchones.find((x) => x.id === estado.colchon).nombre,
      hora2026: eurDec(s.hora2026),
      hora2027: eurDec(s.hora2027),
      brutoCompleta: euros(s.brutoCompleta2027),
      netoCompleta: euros(s.netoCompleta2027),
      ingresoDos: euros(dosCompletas ? dosCompletas.eur : 0),
      ciudad: ciudad.nombre,
      gastoCiudad: euros(gc.vivienda + gc.comida + gc.transporte + gc.otros),
      faltaMes: pesos(Math.max(0, -c.disp)),
      emergencia: pesos(c.emergencia),
      metaColchon: pesos(c.meta),
      mesesColchon: String(c.meses),
      ahorradoColchon: pesos(c.ahorrado)
    };
  }

  /* Para volver a poner en pantalla lo guardado cuando llegan datos del otro dispositivo. */
  const sincronizadores = [];

  /* ---------- Inicio ---------- */
  function pintarNumeros(r) {
    const imposible = !isFinite(r.mensual);
    const desde = r.empiezaDespues ? `Ahorro al mes desde ${mesAnio(r.S)}` : "Ahorro al mes entre los dos";
    $("#numeros").innerHTML = `
      <div class="numero n-meta"><span class="n-valor">${ctx.meta}</span><span class="n-nombre">Meta entre los dos</span></div>
      <div class="numero n-gasto"><span class="n-valor">${ctx.gasto}</span><span class="n-nombre">Se gasta antes de viajar</span></div>
      <div class="numero n-llevan"><span class="n-valor">${ctx.llevan}</span><span class="n-nombre">Llevan para vivir allá</span></div>
      <div class="numero n-mensual"><span class="n-valor">${imposible ? "—" : ctx.mensual}</span><span class="n-nombre">${desde}</span></div>
      <p class="numeros-pie">Meta = lo que se gasta + lo que llevan. De lo que llevan, ${ctx.congeladoDos} queda congelado en sus cuentas desde ${ctx.fechaFondos}. <a href="#dinero">Ver el detalle</a></p>`;
  }

  function montarFecha() {
    const mes = $("#mes"), anio = $("#anio");
    MESES.forEach((m, i) => mes.append(el("option", { value: i }, m)));
    for (let y = hoy.getFullYear(); y <= hoy.getFullYear() + 7; y++) anio.append(el("option", { value: y }, y));
    const mostrar = () => { mes.value = estado.viaje.m; anio.value = estado.viaje.y; };
    mostrar();
    sincronizadores.push(mostrar);
    const cambio = () => {
      estado.viaje = { m: Number(mes.value), y: Number(anio.value) };
      guardar(); todo();
    };
    mes.addEventListener("change", cambio);
    anio.addEventListener("change", cambio);
    $("#hoy-fecha").textContent = hoy.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  }

  function pintarFrase(r) {
    const nodo = $("#frase-resultado");
    const meses = Math.round(r.mesesViaje);
    if (r.mesesViaje < 1) {
      nodo.innerHTML = "Esa fecha ya pasó o es muy pronto. Elijan un mes con al menos 7 meses de margen.";
      return;
    }
    let texto = `Faltan <strong>${meses} ${meses === 1 ? "mes" : "meses"}</strong>. `;
    const c = colchon();
    if (c.hayDatos && estado.colchonPrimero && c.falta > 0) {
      texto += c.listo
        ? `Primero el colchón: con lo que les queda hoy estaría listo en <strong>${mesAnio(c.listo)}</strong>. `
        : "Primero hay que frenar el déficit: hoy sale más plata de la que entra. ";
    }
    if (!isFinite(r.mensual)) {
      texto += "Con esta fecha no alcanzan los plazos de los fondos congelados. Prueben con un mes más adelante.";
    } else if (r.mensual === 0) {
      texto += "Con lo que ya tienen ahorrado para el viaje, la plata está lista. Solo falta recorrer la ruta.";
    } else if (c.hayDatos) {
      const disp = Math.max(0, c.disp);
      if (disp >= r.mensual) texto += `Después, con ${pesos(disp)} al mes, <strong>alcanza</strong> para esta fecha.`;
      else {
        const f = fechaPosible(disp);
        texto += f ? `Con lo que les queda hoy, la fecha más cercana que pueden sostener es <strong>${mesAnio(f)}</strong>.` : "Con lo que les queda hoy todavía no hay una fecha que se pueda sostener.";
      }
    } else if (!r.fondosListos) {
      texto += `El hito más importante: en <strong>${mesAnio(r.F)}</strong> cada uno debe tener ${pesos(r.congelado)} congelados en su cuenta.`;
    }
    nodo.innerHTML = texto;
  }

  /* La línea completa: el colchón en Santiago y después la ruta a Alemania. */
  function pintarViaje() {
    const c = colchon();
    const idx = c.etapa ? ETAPAS.indexOf(c.etapa) : -1;
    const rutaActual = plan.ruta.find((e) => !estacionLista(e));
    const colchonListo = idx === 3;
    const paradaHtml = (p) => `<a class="v-parada${p.lista ? " lista" : ""}${p.actual ? " actual" : ""}" href="${p.href}" ${p.est ? `data-estacion="${p.est}"` : ""} title="${escapar(p.nombre)}" aria-label="${escapar(p.nombre)}${p.lista ? ", lista" : ""}${p.actual ? ", aquí están" : ""}"></a>`;
    const pc = colchonData.etapas.slice(0, 3).map((e, i) => ({ nombre: e.nombre, lista: idx > i, actual: idx === i, href: "#colchon" }));
    const pr = plan.ruta.map((est) => ({
      nombre: est.nombre, lista: estacionLista(est), actual: colchonListo && rutaActual && rutaActual.id === est.id, href: "#ruta", est: est.id
    }));
    const llenoC = idx < 0 ? 0 : Math.min(1, c.meta > 0 ? c.ahorrado / c.meta : 0);
    const hechasR = pr.filter((p) => p.lista).length / pr.length;
    let aqui;
    if (idx < 0) aqui = "Anoten su economía para ubicarse en la línea";
    else if (!colchonListo) aqui = `Están en: <strong>${colchonData.etapas[idx].nombre}</strong>`;
    else aqui = rutaActual ? `Están en: <strong>${rutaActual.nombre}</strong>` : "<strong>Terminaron la ruta</strong>";
    $("#viaje-tramos").innerHTML = `
      <div class="v-tramo v-colchon">
        <p class="v-nombre">El colchón<span>Santiago</span></p>
        <div class="v-linea" style="--lleno:${llenoC}">${pc.map(paradaHtml).join("")}</div>
      </div>
      <div class="v-tramo v-alemania">
        <p class="v-nombre">El viaje<span>${mesAnio(fechaViaje())}</span></p>
        <div class="v-linea" style="--lleno:${hechasR}">${pr.map(paradaHtml).join("")}</div>
      </div>
      <p class="v-aqui">${aqui}</p>`;
    document.querySelectorAll("#viaje-tramos [data-estacion]").forEach((a) => a.addEventListener("click", () => {
      estado.estacion = a.dataset.estacion; guardarLocal(); pintarLinea(); pintarEstacion();
    }));
  }

  function htmlVisorColchon(c, enVentana) {
    const etiqueta = `<p class="visor-etiqueta">Etapa 0 · El colchón</p>`;
    if (!c.hayDatos) {
      return `${etiqueta}
        <p class="visor-titulo">Primero, sus números</p>
        <p>Anoten lo que gana cada uno y lo que se va en la casa. Con eso se calcula la meta del colchón y cuánto pueden guardar al mes.</p>
        <a class="boton" href="#economia">Anotar nuestra economía</a>`;
    }
    const pct = c.meta > 0 ? Math.min(100, (c.ahorrado / c.meta) * 100) : 0;
    const pctEm = c.meta > 0 ? Math.min(100, (c.emergencia / c.meta) * 100) : 0;
    const etapa = colchonData.etapas.find((e) => e.id === c.etapa);
    let cuando;
    if (c.etapa === "alemania") cuando = "Completo. Lo que sobre va al viaje.";
    else if (c.etapa === "deficit") cuando = `Faltan ${pesos(-c.disp)} al mes para cubrir los gastos.`;
    else if (c.etapa === "emergencia") cuando = `Un mes de gastos en ${c.listoEmergencia ? mesAnio(c.listoEmergencia) : "—"} · completo en ${c.listo ? mesAnio(c.listo) : "—"}.`;
    else cuando = `Completo en ${c.listo ? mesAnio(c.listo) : "—"}, guardando ${pesos(c.disp)} al mes.`;
    return `${etiqueta}
      <p class="visor-monto"><b>${pesos(c.ahorrado)}</b><span>de ${pesos(c.meta)}</span></p>
      <div class="tanque" role="img" aria-label="Llevan ${pesos(c.ahorrado)} de ${pesos(c.meta)}. La marca es un mes de gastos, ${pesos(c.emergencia)}.">
        <span class="tanque-lleno" style="width:${pct}%"></span>
        ${c.meses > 1 ? `<span class="tanque-marca" style="left:${pctEm}%"><span>1 mes</span></span>` : ""}
      </div>
      <p class="visor-estado"><strong>${etapa ? etapa.nombre : ""}</strong><br>${cuando}</p>
      ${enVentana ? `<dl class="visor-datos">
        <div><dt>Gastos de un mes</dt><dd>${pesos(c.gastoMes)}</dd></div>
        <div><dt>${c.disp >= 0 ? "Les queda al mes" : "Les falta al mes"}</dt><dd class="${c.disp >= 0 ? "pos" : "neg"}">${pesos(Math.abs(c.disp))}</dd></div>
        <div><dt>Meta: ${c.meses} ${c.meses === 1 ? "mes" : "meses"} de gastos</dt><dd>${pesos(c.meta)}</dd></div>
      </dl>` : ""}
      <div class="visor-acciones">
        <button type="button" class="boton" data-anotar>Anotar ahorro</button>
        ${enVentana ? "" : `<a class="boton-texto" href="#colchon">Abrir el colchón</a>`}
      </div>`;
  }

  function pintarVisores() {
    const c = colchon();
    $("#visor-colchon").innerHTML = htmlVisorColchon(c, false);

    const mes = $("#visor-mes");
    if (!c.hayDatos) {
      mes.innerHTML = `<p class="visor-etiqueta">Cada mes</p><p class="visor-titulo">¿Entra más de lo que sale?</p><p>Aparece aquí cuando anoten su economía en la ventana del colchón.</p>`;
    } else {
      const max = Math.max(c.ingreso, c.gastoMes, 1);
      const vivienda = c.eco.arriendo + c.eco.cuentas;
      mes.innerHTML = `
        <p class="visor-etiqueta">Cada mes</p>
        <div class="mes-filas">
          <div class="mes-fila"><span>Entra</span><span class="mes-barra"><i class="entra" style="width:${(c.ingreso / max) * 100}%"></i></span><b>${pesos(c.ingreso)}</b></div>
          <div class="mes-fila"><span>Sale</span><span class="mes-barra"><i class="sale" style="width:${(c.gastoMes / max) * 100}%"></i></span><b>${pesos(c.gastoMes)}</b></div>
        </div>
        <p class="veredicto ${c.disp >= 0 ? "bien" : "mal"}">${c.disp >= 0 ? `Quedan ${pesos(c.disp)} para el colchón.` : `Faltan ${pesos(-c.disp)} cada mes.`}</p>
        ${vivienda > 0 ? `<p class="nota">La vivienda (arriendo, gasto común y cuentas) se lleva el ${Math.round((vivienda / c.ingreso) * 100)}% de lo que ganan.</p>` : ""}`;
    }

    const animo = $("#visor-animo");
    if (!animo.dataset.montado) {
      animo.dataset.montado = "1";
      animo.innerHTML = `<p class="visor-etiqueta">¿Cómo se sienten hoy?</p><div class="animo-botones"></div>`;
      const cont = animo.querySelector(".animo-botones");
      refugio.estados.forEach((e) => {
        const b = el("button", { type: "button", class: "estado" }, e.nombre);
        b.addEventListener("click", () => { estadoAbierto = e.id; location.hash = "#refugio"; pintarEstadoAbierto(); });
        cont.append(b);
      });
    }
  }

  /* ---------- Ventana: el colchón ---------- */
  function montarColchon() {
    $("#colchon-intro").textContent = colchonData.intro;
    $("#sueldos-nota").textContent = colchonData.sueldosNota;

    document.querySelectorAll("[data-sueldo]").forEach((inp) => {
      const k = inp.dataset.sueldo;
      const mostrar = () => { const v = estado.colchonSueldos[k]; inp.value = v ? Number(v).toLocaleString("es-CL") : ""; };
      mostrar();
      sincronizadores.push(mostrar);
      inp.addEventListener("input", () => { estado.colchonSueldos[k] = soloDigitos(inp.value); guardar(); todo(); });
      inp.addEventListener("blur", mostrar);
    });

    const seg = $("#meses-colchon");
    colchonData.mesesOpciones.forEach((m) => {
      const b = el("button", { type: "button", "data-meses": m }, `${m} ${m === 1 ? "mes" : "meses"}`);
      b.addEventListener("click", () => { estado.colchonMeses = m; guardar(); marcarMeses(); todo(); });
      seg.append(b);
    });
    const marcarMeses = () => seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.meses) === estado.colchonMeses)));
    marcarMeses();
    sincronizadores.push(marcarMeses);

    const primero = $("#colchon-primero");
    const mostrarPrimero = () => { primero.checked = estado.colchonPrimero; };
    mostrarPrimero();
    sincronizadores.push(mostrarPrimero);
    primero.addEventListener("change", () => { estado.colchonPrimero = primero.checked; guardar(); todo(); });

    const esc = $("#escenarios-botones");
    colchonData.escenarios.forEach((e) => {
      const b = el("button", { type: "button", class: "escenario", "data-esc": e.id });
      b.addEventListener("click", () => { estado.escenario = e.id; guardarLocal(); pintarEscenarios(); });
      esc.append(b);
    });

    const grid = $("#acciones-grid");
    colchonData.acciones.forEach((a) => {
      const k = claveMarca("col", a.id, "j");
      const card = el("div", { class: "accion", "data-tipo": a.tipo });
      card.innerHTML = `<p class="accion-tipo">${a.tipo}</p><h4>${a.titulo}</h4><p>${a.texto}</p>`;
      const b = el("button", { type: "button", class: "marca-persona", "data-marca": k, "aria-label": `${a.titulo}: hecho` }, "Hecho");
      b.addEventListener("click", () => { alternar(k); pintarAcciones(); });
      card.append(b);
      grid.append(card);
    });
  }

  function pintarAcciones() {
    document.querySelectorAll("#acciones-grid .accion").forEach((card) => {
      const b = card.querySelector("[data-marca]");
      const on = marcado(b.dataset.marca);
      b.setAttribute("aria-pressed", String(on));
      card.classList.toggle("hecha", on);
    });
  }

  function pintarEscenarios() {
    const escs = colchonData.escenarios;
    const sims = escs.map((e) => ({ e, s: simular(e) }));
    const hayDatos = sims[0].s.c.hayDatos;
    const maxMeses = Math.max(1, ...sims.map(({ s }) => (isFinite(s.c.mesesFalta) ? s.c.mesesFalta : 0)));
    document.querySelectorAll("#escenarios-botones .escenario").forEach((b) => {
      const { e, s } = sims.find((x) => x.e.id === b.dataset.esc);
      const m = s.c.mesesFalta;
      let corto;
      if (!hayDatos) corto = e.detalle;
      else if (s.c.falta === 0) corto = "Colchón completo";
      else if (!isFinite(m)) corto = "No alcanza a ahorrar";
      else corto = `Colchón en ${Math.max(1, Math.ceil(m))} ${Math.ceil(m) <= 1 ? "mes" : "meses"}`;
      const ancho = hayDatos && isFinite(m) ? Math.max(4, (m / maxMeses) * 100) : 0;
      b.innerHTML = `<span class="esc-nombre">${e.nombre}</span><span class="esc-corto">${corto}</span><span class="esc-barra" aria-hidden="true"><i style="width:${ancho}%"></i></span>`;
      b.setAttribute("aria-pressed", String(e.id === estado.escenario));
      b.classList.toggle("no-alcanza", hayDatos && !isFinite(m));
    });

    const caja = $("#escenario-resultado");
    const sel = sims.find((x) => x.e.id === estado.escenario) || sims[0];
    if (!hayDatos) {
      caja.innerHTML = `<p class="nota">Cuando anoten su economía, aquí aparece cuánto les queda al mes, cuándo estaría listo el colchón y desde cuándo podrían viajar en cada caso.</p>`;
      return;
    }
    const { c, fecha, extra } = sel.s;
    const base = sims[0].s;
    let compara = "";
    if (sel.e.id !== "hoy" && base.fecha && fecha) {
      const dif = Math.round(mesesEntre(fecha, base.fecha));
      if (dif > 0) compara = `${dif} ${dif === 1 ? "mes" : "meses"} antes que como están hoy.`;
    } else if (sel.e.id !== "hoy" && !base.fecha && fecha) compara = "Como están hoy no hay fecha posible: este camino la abre.";
    caja.innerHTML = `
      <div class="esc-cifras">
        <div class="esc-cifra"><span>${c.disp >= 0 ? "Les queda al mes" : "Les falta al mes"}</span><b class="${c.disp >= 0 ? "pos" : "neg"}">${pesos(Math.abs(c.disp))}</b></div>
        <div class="esc-cifra"><span>Colchón completo</span><b>${c.falta === 0 ? "Ya está" : c.listo ? mesAnio(c.listo) : "No llega"}</b></div>
        <div class="esc-cifra"><span>Alemania, lo antes posible</span><b>${fecha ? mesAnio(fecha) : "—"}</b></div>
      </div>
      <p class="esc-explica">${sel.e.id === "hoy" ? "Con lo que ganan y gastan hoy." : `${sel.e.reemplaza ? `Entrarían ${pesos(c.ingreso)} al mes entre los dos` : `Suma ${pesos(extra)} líquidos al mes`}${sel.e.pieza ? ` y cambia arriendo, gasto común y cuentas por una pieza de ${pesos(estado.colchonSueldos.pieza)}` : ""}.`} ${compara}
      ${fecha ? `<button type="button" class="boton-texto" id="usar-escenario">Usar ${mesAnio(fecha)} como fecha de viaje</button>` : ""}</p>`;
    const usar = $("#usar-escenario");
    if (usar) usar.addEventListener("click", () => {
      estado.viaje = { m: fecha.getMonth(), y: fecha.getFullYear() };
      guardar(); refrescarTodo();
      location.hash = "#inicio";
    });
  }

  const nombreMes = (d) => MESES[d.getMonth()].slice(0, 3);

  function pintarRegistro(c) {
    const movs = Object.entries(estado.movs || {})
      .filter(([, m]) => m && m.m)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => String(b.f).localeCompare(String(a.f)) || b.id.localeCompare(a.id));

    // Barras: los últimos seis meses
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const suma = movs.filter((m) => String(m.f).startsWith(clave)).reduce((s, m) => s + Number(m.m), 0);
      meses.push({ d, suma });
    }
    const objetivo = c.hayDatos && c.disp > 0 && c.etapa !== "alemania" ? c.disp : 0;
    const max = Math.max(objetivo, ...meses.map((m) => Math.abs(m.suma)), 1);
    $("#meses-barras").innerHTML = `
      <div class="barras" role="img" aria-label="Lo guardado en los últimos seis meses">
        ${objetivo ? `<span class="barras-meta" style="bottom:${(objetivo / max) * 100}%"><span>${pesos(objetivo)} al mes</span></span>` : ""}
        ${meses.map((m) => `
          <div class="barra-mes${m.d.getMonth() === hoy.getMonth() && m.d.getFullYear() === hoy.getFullYear() ? " este" : ""}">
            <span class="barra-valor">${m.suma ? pesos(m.suma) : ""}</span>
            <span class="barra-col"><i class="${m.suma < 0 ? "neg" : ""}" style="height:${(Math.abs(m.suma) / max) * 100}%"></i></span>
            <span class="barra-mes-nombre">${nombreMes(m.d)}</span>
          </div>`).join("")}
      </div>`;

    const cont = $("#movimientos");
    if (!movs.length) {
      cont.innerHTML = `<p class="nota">Todavía no hay nada anotado. Cada peso que guarden cuenta: anoten el primero.</p>`;
      return;
    }
    const verTodos = cont.dataset.todos === "1";
    const visibles = verTodos ? movs : movs.slice(0, 8);
    cont.innerHTML = "";
    const tira = el("div", { class: "tickets" });
    visibles.forEach((m) => {
      const [y, mm, dd] = String(m.f).split("-").map(Number);
      const fecha = y ? `${dd} ${MESES[mm - 1].slice(0, 3)}${y !== hoy.getFullYear() ? " " + y : ""}` : "";
      const tk = el("div", { class: "ticket" + (m.m < 0 ? " saca" : "") });
      tk.innerHTML = `<b>${m.m > 0 ? "+" : ""}${pesos(m.m)}</b><span>${escapar(m.q || "")}${fecha ? " · " + fecha : ""}</span>${m.n ? `<span class="ticket-nota">${escapar(m.n)}</span>` : ""}`;
      const borrar = el("button", { type: "button", class: "ticket-borrar", "aria-label": `Borrar ${pesos(m.m)} del ${fecha}` }, "×");
      borrar.addEventListener("click", () => {
        if (!borrar.classList.contains("seguro")) {
          borrar.classList.add("seguro"); borrar.textContent = "¿Borrar?";
          setTimeout(() => { if (borrar.isConnected) { borrar.classList.remove("seguro"); borrar.textContent = "×"; } }, 3500);
          return;
        }
        delete estado.movs[m.id]; guardar(); todo();
      });
      tk.append(borrar);
      tira.append(tk);
    });
    cont.append(tira);
    if (movs.length > 8) {
      const b = el("button", { type: "button", class: "boton-texto" }, verTodos ? "Ver menos" : `Ver los ${movs.length}`);
      b.addEventListener("click", () => { cont.dataset.todos = verTodos ? "" : "1"; pintarRegistro(colchon()); });
      cont.append(b);
    }
  }

  function pintarColchon() {
    const c = colchon();
    $("#colchon-visor").innerHTML = htmlVisorColchon(c, true);
    const idx = c.etapa ? ETAPAS.indexOf(c.etapa) : -1;
    $("#etapas-linea").innerHTML = colchonData.etapas.map((e, i) => `
      <li class="etapa${idx > i ? " lista" : ""}${idx === i ? " actual" : ""}">
        <span class="punto">${CHECK}</span>
        <span class="etapa-nombre">${e.nombre}</span>
        <span class="etapa-corto">${t(e.corto)}</span>
      </li>`).join("");
    const actual = colchonData.etapas[idx];
    $("#etapa-texto").innerHTML = actual ? t(actual.texto) : "Anoten su economía para saber en qué etapa están.";
    pintarEscenarios();
    pintarRegistro(c);
    pintarAcciones();
  }

  /* ---------- Anotar en el colchón ---------- */
  let movTipo = "mas";
  let movQuien = 2;
  function montarDialogo() {
    const d = $("#dialogo-mov");
    const quien = $("#dm-quien");
    const nombres = [...plan.personas, "Los dos"];
    nombres.forEach((n, i) => {
      const b = el("button", { type: "button", "data-quien": i }, n);
      b.addEventListener("click", () => { movQuien = i; marcarQuien(); });
      quien.append(b);
    });
    const marcarQuien = () => quien.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.quien) === movQuien)));
    const marcarTipo = () => d.querySelectorAll("[data-tipo]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tipo === movTipo)));
    d.querySelectorAll("[data-tipo]").forEach((b) => b.addEventListener("click", () => { movTipo = b.dataset.tipo; marcarTipo(); }));
    const monto = $("#dm-monto");
    monto.addEventListener("input", () => { const v = soloDigitos(monto.value); monto.value = v ? v.toLocaleString("es-CL") : ""; });

    document.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-anotar]");
      if (!b) return;
      movTipo = "mas"; marcarTipo(); marcarQuien();
      monto.value = ""; $("#dm-nota").value = ""; $("#dm-error").textContent = "";
      $("#dm-fecha").value = isoLocal(new Date());
      if (d.showModal) d.showModal(); else d.setAttribute("open", "");
      setTimeout(() => monto.focus(), 50);
    });
    $("#dm-cancelar").addEventListener("click", () => d.close());
    d.addEventListener("click", (ev) => { if (ev.target === d) d.close(); });
    $("#form-mov").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const v = soloDigitos(monto.value);
      if (!v) { $("#dm-error").textContent = "Escriban un monto."; monto.focus(); return; }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      estado.movs[id] = {
        f: $("#dm-fecha").value || isoLocal(new Date()),
        m: movTipo === "mas" ? v : -v,
        q: nombres[movQuien],
        n: $("#dm-nota").value.trim()
      };
      guardar(); todo();
      d.close();
      avisoBreve(movTipo === "mas" ? `Anotado: +${pesos(v)} al colchón` : `Anotado: ${pesos(-v)} del colchón`);
    });
  }

  let relojAviso;
  function avisoBreve(texto) {
    let n = $("#aviso-breve");
    if (!n) { n = el("p", { id: "aviso-breve", class: "aviso-breve", role: "status" }); document.body.append(n); }
    n.textContent = texto;
    n.classList.add("visible");
    clearTimeout(relojAviso);
    relojAviso = setTimeout(() => n.classList.remove("visible"), 2600);
  }

  /* ---------- Ruta ---------- */
  const claveMarca = (...p) => p.join(".");
  const marcado = (k) => Boolean(estado.marcas[k]);
  function alternar(k) { estado.marcas[k] = !estado.marcas[k]; if (!estado.marcas[k]) delete estado.marcas[k]; guardar(); }

  function tareaHecha(est, t) {
    if (t.juntos) return marcado(claveMarca(est.id, t.id, "j"));
    return plan.personas.every((_, i) => marcado(claveMarca(est.id, t.id, i)));
  }
  const estacionLista = (est) => est.tareas.every((t) => tareaHecha(est, t));

  function fechaEstacion(est) {
    if (est.offset == null) return { texto: "Ahora", pasada: false };
    const d = sumarMeses(fechaViaje(), est.offset);
    const etiqueta = est.offset === 0 ? `Llegada: ${mesAnio(d)}` : mesAnio(d);
    return { texto: etiqueta, pasada: d < hoy && !estacionLista(est), fecha: d };
  }

  const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="#182638" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';

  function pintarLinea() {
    const ol = $("#linea");
    ol.innerHTML = "";
    plan.ruta.forEach((est) => {
      const f = fechaEstacion(est);
      const li = el("li", {
        class: ["parada", est.id === estado.estacion && "actual", estacionLista(est) && "lista", f.pasada && "pasada"].filter(Boolean).join(" ")
      });
      const b = el("button", { type: "button", "aria-current": est.id === estado.estacion ? "step" : false },
        `<span class="punto">${CHECK}</span><span><span class="parada-nombre">${est.nombre}</span><span class="parada-fecha">${f.texto}</span></span>`);
      b.addEventListener("click", () => { estado.estacion = est.id; guardarLocal(); pintarLinea(); pintarEstacion(); });
      li.append(b);
      ol.append(li);
    });
  }

  function pintarEstacion() {
    const panel = $("#estacion-panel");
    const i = plan.ruta.findIndex((e) => e.id === estado.estacion);
    const est = plan.ruta[i] || plan.ruta[0];
    const f = fechaEstacion(est);
    panel.innerHTML = "";
    panel.append(
      el("h3", {}, est.nombre),
      el("span", { class: "estacion-cuando" + (f.pasada ? " pasada" : "") }, f.pasada ? `Atrasado: era en ${f.texto}` : f.texto),
      el("p", { class: "estacion-detalle" }, t(est.detalle))
    );
    const tareas = el("div", { class: "tareas" });
    est.tareas.forEach((tarea) => {
      const fila = el("div", { class: "tarea" + (tareaHecha(est, tarea) ? " hecha" : "") });
      fila.append(el("span", { class: "tarea-texto" }, t(tarea.texto)));
      const marcas = el("div", { class: "marcas" });
      const quienes = tarea.juntos ? [["j", "Listo"]] : plan.personas.map((p, idx) => [idx, p]);
      quienes.forEach(([idx, nombre]) => {
        const k = claveMarca(est.id, tarea.id, idx);
        const b = el("button", { type: "button", class: "marca-persona", "aria-pressed": String(marcado(k)) }, nombre);
        b.setAttribute("aria-label", `${t(tarea.texto)}: ${tarea.juntos ? "listo" : nombre}`);
        b.addEventListener("click", () => { alternar(k); pintarLinea(); pintarEstacion(); pintarViaje(); pintarProximo(); });
        marcas.append(b);
      });
      fila.append(marcas);
      tareas.append(fila);
    });
    panel.append(tareas);

    const nav = el("div", { class: "estacion-nav" });
    const ant = el("button", { type: "button", class: "boton-texto", disabled: i <= 0 }, "Etapa anterior");
    const sig = el("button", { type: "button", class: "boton-texto", disabled: i >= plan.ruta.length - 1 }, "Siguiente etapa");
    ant.addEventListener("click", () => { estado.estacion = plan.ruta[i - 1].id; guardarLocal(); pintarLinea(); pintarEstacion(); });
    sig.addEventListener("click", () => { estado.estacion = plan.ruta[i + 1].id; guardarLocal(); pintarLinea(); pintarEstacion(); });
    nav.append(ant, sig);
    panel.append(nav);
  }

  /* ---------- Dinero ---------- */
  function montarControles() {
    const c = plan.costos;

    document.querySelectorAll("[data-persona]").forEach((n) => { n.textContent = plan.personas[Number(n.dataset.persona)]; });

    const seg = $("#colchones");
    plan.colchones.forEach((x) => {
      const b = el("button", { type: "button", "data-id": x.id }, `${x.nombre}<small>${euros(x.eur)}</small>`);
      b.addEventListener("click", () => { estado.colchon = x.id; guardar(); marcarColchon(); todo(); });
      seg.append(b);
    });
    const marcarColchon = () => seg.querySelectorAll("button").forEach((o) => o.setAttribute("aria-pressed", String(o.dataset.id === estado.colchon)));
    marcarColchon();
    sincronizadores.push(marcarColchon);

    const campoPesos = (id, get, set) => {
      const inp = $(id);
      const mostrar = () => { const v = get(); inp.value = v ? v.toLocaleString("es-CL") : ""; };
      mostrar();
      sincronizadores.push(mostrar);
      inp.addEventListener("input", () => { set(soloDigitos(inp.value)); guardar(); todo(); });
      inp.addEventListener("blur", mostrar);
    };
    campoPesos("#ahorro0", () => estado.ahorro[0], (v) => { estado.ahorro[0] = v; });
    campoPesos("#ahorro1", () => estado.ahorro[1], (v) => { estado.ahorro[1] = v; });
    campoPesos("#tc", () => estado.tc, (v) => { estado.tc = v || plan.tipoCambio.eur; });

    const rango = (id, conf, clave) => {
      const r = $(id), out = $(id + "-out");
      r.min = conf.min; r.max = conf.max; r.value = estado[clave];
      out.textContent = pesos(estado[clave]);
      r.oninput = () => { estado[clave] = Number(r.value); out.textContent = pesos(estado[clave]); guardar(); todo(); };
    };
    const ponerPasaje = () => {
      rango("#pasaje", estado.soloIda ? c.pasajeIda : c.pasaje, estado.soloIda ? "pasajeIda" : "pasaje");
      $("#pasaje-tipo").textContent = estado.soloIda ? "Pasaje solo de ida" : "Pasaje ida y vuelta";
      $("#pasaje-ayuda").textContent = estado.soloIda
        ? `Más barato ahora, pero la embajada pide €${plan.embajada.extraSinRegreso.toLocaleString("es-CL")} extra en la cuenta. Esa plata sigue siendo suya y sirve para comprar la vuelta cuando decidan.`
        : "La embajada recomienda comprarlo después de tener la cita. Busquen uno con cambio de fecha.";
      document.querySelectorAll("#tipo-pasaje button").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.ida === "1") === estado.soloIda)));
    };
    document.querySelectorAll("#tipo-pasaje button").forEach((b) => b.addEventListener("click", () => {
      estado.soloIda = b.dataset.ida === "1"; guardar(); ponerPasaje(); todo();
    }));
    ponerPasaje();
    const ponerSeguro = () => rango("#seguro", c.seguro, "seguro");
    ponerSeguro();
    sincronizadores.push(ponerPasaje, ponerSeguro);

    const pp = $("#pasaporte-check");
    const mostrarPp = () => { pp.checked = estado.pasaporte; };
    mostrarPp();
    sincronizadores.push(mostrarPp);
    pp.addEventListener("change", () => { estado.pasaporte = pp.checked; guardar(); todo(); });
  }

  function pintarDinero(r) {
    $("#colchon-texto").textContent = t(plan.colchones.find((x) => x.id === estado.colchon).texto);
    const caja = $("#resultado");
    const p = plan.personas;
    const imposible = !isFinite(r.mensual);

    let titular;
    if (imposible) titular = "Con esta fecha no alcanzan los plazos. Muevan el viaje unos meses más adelante.";
    else if (r.mensual === 0) titular = "Ya tienen lo necesario. Ahora a cuidar que no baje.";
    else titular = `Meta para viajar en ${mesAnio(r.V)}: ${millones(r.meta)} entre los dos.`;

    const gastoBarra = r.gastoTotal;
    const congBarra = r.congelado * 2;
    const colchonBarra = Math.max(0, r.colchonPersona * 2 - congBarra);

    const persona = (i) => r.porPersona[i] === 0 ? `${p[i]} ya tiene su parte` : `${p[i]}: ${pesos(r.porPersona[i])}`;
    const desde = r.empiezaDespues ? `desde ${mesAnio(r.S)}, cuando el colchón esté completo,` : "desde ahora";

    let porcentaje = "";
    const c = colchon();
    if (c.hayDatos && !imposible && r.mensual > 0) {
      const alcanza = c.disp >= r.mensual;
      porcentaje = `<div class="aviso">Ese ahorro es el <strong>${Math.round((r.mensual / c.ingreso) * 100)}%</strong> de lo que ganan juntos. ${alcanza
        ? "Con lo que les queda después de los gastos, alcanza."
        : `Hoy les quedan ${pesos(Math.max(0, c.disp))} al mes después de los gastos: en la ventana <a href="#economia">El colchón</a> está la fecha más cercana que pueden sostener.`}</div>`;
    }

    caja.innerHTML = `
      <h3>${titular}</h3>
      ${imposible ? "" : `
      <div class="fases">
        <div class="fase">
          <span class="fase-monto">${pesos(r.mensual)}</span>
          <p>al mes entre los dos, ${desde} hasta ${mesAnio(r.D2)}. ${persona(0)}. ${persona(1)}.</p>
        </div>
        <div class="fase" style="border-color: var(--suyo)">
          <span class="fase-monto">${pesos(r.congelado)}</span>
          <p>en la cuenta de cada uno en ${mesAnio(r.F)}, sin tocarlos hasta la cita. ${r.fondosListos ? "Ya los tienen." : "Es el hito más importante del plan."}</p>
        </div>
      </div>`}
      ${porcentaje}
      <div class="barra-dinero" role="img" aria-label="Se gasta ${pesos(gastoBarra)}, queda congelado ${pesos(congBarra)} y colchón extra ${pesos(colchonBarra)}">
        <span class="b-gasto" style="flex-grow:${gastoBarra}"></span>
        <span class="b-congelado" style="flex-grow:${congBarra}"></span>
        <span class="b-colchon" style="flex-grow:${colchonBarra}"></span>
      </div>
      <div class="leyenda">
        <span><i style="background:var(--gasto)"></i>Se gasta antes de viajar: ${pesos(gastoBarra)}</span>
        <span class="leyenda-grupo">Llevan para vivir allá: ${pesos(congBarra + colchonBarra)}, de eso:</span>
        <span><i style="background:var(--suyo)"></i>congelado desde ${mesAnio(r.F)}: ${pesos(congBarra)}</span>
        ${colchonBarra > 0 ? `<span><i style="background:var(--suyo-claro)"></i>resto del colchón: ${pesos(colchonBarra)}</span>` : ""}
      </div>
      <table class="desglose">
        <thead><tr><th>Concepto</th><th>Por persona</th><th>Los dos</th></tr></thead>
        <tbody>
          <tr class="grupo"><td colspan="3">Se gasta antes de viajar</td></tr>
          <tr><td>Arancel de visa (€${plan.embajada.arancel})</td><td>${pesos(r.visa)}</td><td>${pesos(r.visa * 2)}</td></tr>
          <tr><td>Seguro 12 meses</td><td>${pesos(estado.seguro)}</td><td>${pesos(estado.seguro * 2)}</td></tr>
          <tr><td>${estado.soloIda ? "Pasaje solo de ida" : "Pasaje ida y vuelta"}</td><td>${pesos(r.pasaje)}</td><td>${pesos(r.pasaje * 2)}</td></tr>
          <tr><td>Fotos, copias y traducciones</td><td>${pesos(plan.costos.documentos)}</td><td>${pesos(plan.costos.documentos * 2)}</td></tr>
          ${estado.pasaporte ? `<tr><td>Pasaporte (solo uno)</td><td>—</td><td>${pesos(plan.costos.pasaporte)}</td></tr>` : ""}
          <tr class="grupo"><td colspan="3">Llevan para vivir allá</td></tr>
          <tr><td>Solvencia sin reserva de alojamiento${estado.soloIda ? " y sin pasaje de vuelta" : ""} (€${r.pruebaEur.toLocaleString("es-CL")} + 10% por el euro)</td><td>${pesos(r.congelado)}</td><td>${pesos(r.congelado * 2)}</td></tr>
          ${r.colchonPersona > r.congelado ? `<tr><td>Resto del colchón</td><td>${pesos(r.colchonPersona - r.congelado)}</td><td>${pesos((r.colchonPersona - r.congelado) * 2)}</td></tr>` : ""}
          <tr class="total"><td>Meta (se gasta + llevan)</td><td>${pesos(r.meta / 2)}</td><td>${pesos(r.meta)}</td></tr>
          ${r.actual > 0 ? `<tr><td>Ya ahorrado</td><td></td><td>${pesos(r.actual)}</td></tr><tr class="total"><td>Falta</td><td></td><td>${pesos(Math.max(0, r.meta - r.actual))}</td></tr>` : ""}
        </tbody>
      </table>
      <p class="nota">El colchón de Santiago no entra en esta cuenta: se queda como respaldo aquí.</p>`;
  }

  /* ---------- Carpeta ---------- */
  function pintarCarpeta() {
    const grid = $("#carpeta-grid");
    grid.innerHTML = "";
    plan.carpeta.forEach((d) => {
      const completo = plan.personas.every((_, i) => marcado(claveMarca("doc", d.id, i)));
      const card = el("div", { class: "doc" + (completo ? " completo" : "") });
      const det = el("details", {});
      det.innerHTML = `<summary><span class="doc-nombre">${d.nombre}</span><span class="doc-corto" ${vivo(d.corto)}>${t(d.corto)}</span></summary><p class="doc-detalle" ${vivo(d.detalle)}>${t(d.detalle)}</p>`;
      card.append(det);
      const marcas = el("div", { class: "marcas" });
      plan.personas.forEach((nombre, i) => {
        const k = claveMarca("doc", d.id, i);
        const b = el("button", { type: "button", class: "marca-persona", "aria-pressed": String(marcado(k)), "aria-label": `${d.nombre}: ${nombre}` }, nombre);
        b.addEventListener("click", () => {
          alternar(k);
          b.setAttribute("aria-pressed", String(marcado(k)));
          card.classList.toggle("completo", plan.personas.every((_, j) => marcado(claveMarca("doc", d.id, j))));
        });
        marcas.append(b);
      });
      card.append(marcas);
      grid.append(card);
    });
  }

  /* ---------- Ciudades ---------- */
  function montarCiudades() {
    const sel = $("#ciudad-selector");
    ciudades.ciudades.forEach((c) => {
      const b = el("button", { type: "button", role: "tab", id: "tab-" + c.id }, c.nombre);
      b.addEventListener("click", () => { estado.ciudad = c.id; guardar(); marcar(); todo(); });
      sel.append(b);
    });
    const marcar = () => sel.querySelectorAll("button").forEach((o) => o.setAttribute("aria-selected", String(o.id === "tab-" + estado.ciudad)));
    marcar();
    const ing = $("#ingreso-escenario");
    ciudades.ingresos.forEach((x) => ing.append(el("option", { value: x.id }, `${x.nombre} (≈ ${euros(x.eur)} líquidos)`)));
    const mostrarIng = () => { ing.value = estado.ingresoEscenario; };
    mostrarIng();
    sincronizadores.push(marcar, mostrarIng);
    ing.addEventListener("change", () => { estado.ingresoEscenario = ing.value; guardar(); todo(); });
    $("#ciudades-nota").textContent = ciudades.nota + " Ingresos con el sueldo mínimo de 2027 (€14,60 la hora).";
  }

  function medidor(nombre, valor) {
    const barras = Array.from({ length: 5 }, (_, i) => `<i class="${i < valor ? "on" : ""}"></i>`).join("");
    return `<div class="medidor"><span>${nombre}</span><span class="medidor-barras" role="img" aria-label="${valor} de 5">${barras}</span></div>`;
  }

  const TRAMOS = [
    ["vivienda", "Arriendo"],
    ["comida", "Comida"],
    ["transporte", "Transporte"],
    ["otros", "Otros"]
  ];

  function pintarCiudad() {
    const c = ciudades.ciudades.find((x) => x.id === estado.ciudad) || ciudades.ciudades[0];
    const ing = ciudades.ingresos.find((x) => x.id === estado.ingresoEscenario) || ciudades.ingresos[0];
    const g = c.gastos;
    const gasto = g.vivienda + g.comida + g.transporte + g.otros;
    const diff = ing.eur - gasto;
    const total = Math.max(gasto, ing.eur);
    const pct = (v) => (v / total) * 100;
    const tc = estado.tc || plan.tipoCambio.eur;

    const segmentos = TRAMOS.map(([k, nombre]) => {
      const v = g[k];
      return `<span class="tramo t-${k}" style="width:${pct(v)}%" title="${nombre}: ${euros(v)}">${pct(v) >= 13 ? `<b>${nombre}</b>` : ""}</span>`;
    }).join("");
    const resto = diff >= 0
      ? `<span class="tramo t-sobra" style="width:${pct(diff)}%" title="Les sobra: ${euros(diff)}">${pct(diff) >= 13 ? "<b>Les sobra</b>" : ""}</span>`
      : "";
    const marcaSueldo = diff < 0 ? `<span class="marca-sueldo" style="left:${pct(ing.eur)}%"><span>Hasta aquí alcanza el sueldo</span></span>` : "";

    const filas = TRAMOS.map(([k, nombre]) =>
      `<tr><td><i class="punto-color t-${k}"></i>${nombre}</td><td>${euros(g[k])}</td><td>${Math.round((g[k] / ing.eur) * 100)}%</td></tr>`).join("");

    $("#ciudad-panel").setAttribute("aria-labelledby", "tab-" + c.id);
    $("#ciudad-panel").innerHTML = `
      <div>
        <h3>${c.nombre}</h3>
        <p class="ciudad-rubros">${c.rubros}</p>
        <p>${c.texto}</p>
        <div class="medidores">
          ${medidor("Fácil sin alemán", c.sinAleman)}
          ${medidor("Trabajo para su perfil", c.trabajo)}
          <p class="nota">Más rayitas llenas = mejor para ustedes.</p>
        </div>
        <p class="colchon-ciudad">Lo que llevan para vivir allá (${ctx.llevan} ≈ ${ctx.llevanEur}) les alcanza para unos <strong>${(((calcular().colchonPersona * 2) / tc) / gasto).toLocaleString("es-CL", { maximumFractionDigits: 1 })} meses</strong> en ${c.nombre} sin trabajar.</p>
        ${c.pieza ? `<p class="nota">Una pieza en piso compartido cuesta en promedio ${euros(c.pieza)} al mes por persona.</p>` : `<p class="nota">El alojamiento de personal suele descontarse del sueldo a un precio mucho menor que un arriendo.</p>`}
      </div>
      <div class="balance">
        <h4>¿Les alcanza el sueldo?</h4>
        <p class="balance-explica">${diff >= 0
          ? `La barra completa es todo lo que ganan los dos en un mes (${euros(ing.eur)}). Los tramos rojizos son lo que se va en vivir; el verde es lo que les queda.`
          : `La barra son los gastos del mes. La línea punteada marca lo que ganan (${euros(ing.eur)}): todo lo que queda a la derecha de la línea es plata que falta.`}</p>
        <div class="sueldo-barra${diff < 0 ? " pasado" : ""}" role="img" aria-label="Ganan ${euros(ing.eur)}, gastan ${euros(gasto)}, ${diff >= 0 ? "les sobra " + euros(diff) : "les falta " + euros(-diff)}">
          ${segmentos}${resto}${marcaSueldo}
        </div>
        <table class="recibo">
          <thead><tr><th>En qué se va</th><th>Al mes</th><th>Del sueldo</th></tr></thead>
          <tbody>
            ${filas}
            <tr class="total"><td>Total gastos</td><td>${euros(gasto)}</td><td>${Math.round((gasto / ing.eur) * 100)}%</td></tr>
          </tbody>
        </table>
        <p class="veredicto ${diff >= 0 ? "bien" : "mal"}">${diff >= 0
          ? `Les sobran cerca de ${euros(diff)} al mes (≈ ${pesos(diff * tc)}) para ahorrar o viajar.`
          : `Les faltan cerca de ${euros(-diff)} al mes (≈ ${pesos(-diff * tc)}). Así se gastaría el colchón: busquen más horas o una ciudad más barata.`}</p>
      </div>`;
  }

  /* ---------- Lo próximo ---------- */
  function pendientes(est) {
    const out = [];
    est.tareas.forEach((tarea) => {
      if (tareaHecha(est, tarea)) return;
      const faltan = tarea.juntos ? [] : plan.personas.filter((_, i) => !marcado(claveMarca(est.id, tarea.id, i)));
      out.push({ tarea, faltan });
    });
    return out;
  }

  function pintarProximo() {
    const caja = $("#proximo");
    const est = plan.ruta.find((e) => !estacionLista(e));
    if (!est) {
      caja.innerHTML = `<p class="visor-etiqueta">Lo próximo en los trámites</p><p class="proximo-titulo">Terminaron la ruta.</p><p>Todo está marcado. Ahora queda disfrutar.</p>`;
      return;
    }
    const f = fechaEstacion(est);
    const pend = pendientes(est).slice(0, 3);
    caja.innerHTML = `
      <p class="visor-etiqueta">Lo próximo en los trámites</p>
      <p class="proximo-titulo">${est.nombre}</p>
      <p class="proximo-cuando${f.pasada ? " pasada" : ""}">${f.pasada ? `Atrasado: era en ${f.texto}` : f.texto}</p>
      <div class="proximo-tareas">${pend.map(({ tarea, faltan }) => `<p>${t(tarea.texto)}${faltan.length && faltan.length < plan.personas.length ? `<span> Falta: ${faltan.join(" y ")}</span>` : ""}</p>`).join("")}</div>
      <a class="boton" href="#ruta" id="ir-proximo">Abrir esta etapa</a>`;
    $("#ir-proximo").addEventListener("click", () => { estado.estacion = est.id; guardarLocal(); pintarLinea(); pintarEstacion(); });
  }

  /* ---------- Economía de cada uno ---------- */
  function montarEconomia() {
    document.querySelectorAll("[data-eco]").forEach((inp) => {
      const k = inp.dataset.eco;
      const mostrar = () => { const v = (estado.economia || {})[k]; inp.value = v ? Number(v).toLocaleString("es-CL") : ""; };
      mostrar();
      sincronizadores.push(mostrar);
      inp.addEventListener("input", () => { estado.economia = estado.economia || {}; estado.economia[k] = soloDigitos(inp.value); guardar(); todo(); });
      inp.addEventListener("blur", mostrar);
    });
    const botones = document.querySelectorAll("#reparto button");
    const marcar = () => botones.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.reparto === estado.reparto)));
    botones.forEach((b) => b.addEventListener("click", () => { estado.reparto = b.dataset.reparto; guardar(); marcar(); todo(); }));
    marcar();
    sincronizadores.push(marcar);
  }

  function pintarEconomia(r) {
    const caja = $("#economia-resultado");
    const eco = economia();
    const p = plan.personas;
    if (!eco.hayDatos) {
      caja.innerHTML = `<p class="eco-vacio">Anoten al menos lo que gana cada uno para ver el desglose.</p>`;
      return;
    }
    const c = colchon();
    // Mientras se arma el colchón, lo que le queda a cada uno va al colchón; después, al viaje.
    const armando = estado.colchonPrimero && c.falta > 0;
    const necesita = armando
      ? eco.queda.map((q) => Math.max(0, q))
      : r.porPersona.map((x) => (isFinite(x) ? x : 0));
    const persona = (i) => {
      const s = eco.sueldo[i] || 0;
      const libre = eco.queda[i] - necesita[i];
      const total = Math.max(s, eco.parte[i] + eco.personal[i] + necesita[i], 1);
      const w = (v) => `${Math.max(0, (v / total) * 100)}%`;
      return `
        <div class="eco-persona">
          <div class="eco-fila"><h4>${p[i]}</h4><b>${pesos(s)}</b></div>
          <div class="eco-barra${libre < 0 ? " pasado" : ""}" role="img" aria-label="${p[i]}: aporta ${pesos(eco.parte[i])} a la casa, ${pesos(eco.personal[i])} en gastos personales">
            <span class="e-casa" style="width:${w(eco.parte[i])}"></span>
            <span class="e-personal" style="width:${w(eco.personal[i])}"></span>
            <span class="e-ahorro" style="width:${w(necesita[i])}"></span>
            ${s < total ? `<span class="marca-sueldo" style="left:${(s / total) * 100}%"></span>` : ""}
          </div>
          <table class="recibo">
            <tbody>
              <tr><td><i class="punto-color e-casa"></i>Su parte de la casa</td><td>${pesos(eco.parte[i])}</td></tr>
              <tr><td><i class="punto-color e-personal"></i>Gastos personales</td><td>${pesos(eco.personal[i])}</td></tr>
              <tr class="total"><td>Le queda al mes</td><td class="${eco.queda[i] >= 0 ? "pos" : "neg"}">${pesos(eco.queda[i])}</td></tr>
              ${armando ? "" : `<tr><td><i class="punto-color e-ahorro"></i>Necesita ahorrar para el viaje</td><td>${pesos(necesita[i])}</td></tr>
              <tr class="total"><td>${libre >= 0 ? "Le sobra" : "Le falta"}</td><td class="${libre >= 0 ? "pos" : "neg"}">${pesos(Math.abs(libre))}</td></tr>`}
            </tbody>
          </table>
        </div>`;
    };

    const disponible = Math.max(0, c.disp);
    const alcanza = isFinite(r.mensual) && r.mensual <= disponible;
    const posible = alcanza ? null : fechaPosible(disponible);
    const pctCasa = Math.round(((eco.casa + eco.personal[0] + eco.personal[1]) / eco.ingreso) * 100);

    let veredicto;
    if (c.disp <= 0) {
      veredicto = `<p class="veredicto mal">Hoy sale más plata de la que entra: faltan ${pesos(-c.disp)} al mes. Antes del colchón y del viaje, el primer paso es cerrar esa diferencia: sumar un ingreso o bajar un gasto grande. Prueben los caminos de «¿Y si…?» más abajo.</p>`;
    } else if (alcanza) {
      veredicto = `<p class="veredicto bien">Con ${pesos(disponible)} al mes entre los dos ${armando ? `arman el colchón para ${c.listo ? mesAnio(c.listo) : "—"} y después ` : ""}alcanza para viajar en ${mesAnio(r.V)}.</p>`;
    } else if (posible) {
      veredicto = `<p class="veredicto mal">Les quedan ${pesos(disponible)} al mes. ${armando ? `Primero va el colchón (listo en ${c.listo ? mesAnio(c.listo) : "—"}); con eso, ` : "Con lo que ganan hoy, "}la fecha más cercana que pueden sostener para Alemania es <strong>${mesAnio(posible)}</strong>.</p>
        <button type="button" class="boton" id="usar-fecha">Usar ${mesAnio(posible)} como fecha de viaje</button>
        <p class="nota">Cada cambio que anoten arriba se refleja acá al tiro.${posible.getFullYear() - hoy.getFullYear() >= 4 ? " Ojo: la visa exige tener 30 años o menos al momento de postular; revisen que esa fecha les calce a los dos." : ""}</p>`;
    } else {
      veredicto = `<p class="veredicto mal">Con ${pesos(disponible)} al mes todavía no hay una fecha que se pueda sostener. Sumar un ingreso es lo que más mueve los plazos.</p>`;
    }

    caja.innerHTML = `
      <p class="nota eco-leyenda">Cada barra es lo que le toca cubrir a cada uno al mes: su parte de la casa, sus gastos y lo que puede guardar${armando ? " para el colchón" : " para el viaje"}. La línea punteada marca su sueldo.</p>
      <div class="eco-personas">${persona(0)}${persona(1)}</div>
      <p class="nota">Entre los dos ganan ${pesos(eco.ingreso)} al mes y el ${pctCasa}% se va en la casa y gastos personales${eco.arriendo ? `; solo el arriendo y el gasto común son el ${Math.round((eco.arriendo / eco.ingreso) * 100)}%` : ""}.</p>
      ${veredicto}`;
    const usar = $("#usar-fecha");
    if (usar) usar.addEventListener("click", () => {
      estado.viaje = { m: posible.getMonth(), y: posible.getFullYear() };
      guardar(); refrescarTodo();
      location.hash = "#inicio";
    });
  }

  /* ---------- Cuando dudemos ---------- */
  function progreso() {
    let total = 0, hechas = 0;
    plan.ruta.forEach((est) => est.tareas.forEach((t) => { total++; if (tareaHecha(est, t)) hechas++; }));
    const preguntas = refugio.grupos.flatMap((g) => g.temas.flatMap((t) => t.preguntas));
    const respondidas = preguntas.filter((q) => plan.personas.every((_, i) => ((estado.respuestas[q.id] || {})[i] || "").trim())).length;
    return { total, hechas, preguntas: preguntas.length, respondidas };
  }

  function montarRefugio() {
    $("#refugio-intro").textContent = refugio.intro;
    const cont = $("#estados");
    refugio.estados.forEach((e) => {
      const b = el("button", { type: "button", class: "estado", "aria-pressed": "false", "data-estado": e.id }, e.nombre);
      b.addEventListener("click", () => {
        estadoAbierto = estadoAbierto === e.id ? null : e.id;
        pintarEstadoAbierto();
      });
      cont.append(b);
    });
    pintarPreguntasDeciden();
    pintarMalMes();
    pintarFamilia();
    const c = refugio.consecuencias;
    $("#consecuencias").innerHTML = `
      <h3>Lo que puede pasar</h3>
      <div class="consecuencias-grid">
        <div class="cons bien"><h4>Si sale bien</h4>${c.bien.map((x) => `<p>${x}</p>`).join("")}</div>
        <div class="cons mal"><h4>Si vamos sin plan</h4>${c.mal.map((x) => `<p>${x}</p>`).join("")}</div>
      </div>
      <p class="cons-cierre">${c.cierre}</p>`;
    $("#apoyo").textContent = refugio.apoyo;
    $("#copiar-respuestas").addEventListener("click", copiarRespuestas);
  }

  let estadoAbierto = null;
  function pintarEstadoAbierto() {
    const caja = $("#estado-respuesta");
    document.querySelectorAll("#estados .estado").forEach((o) => o.setAttribute("aria-pressed", String(o.dataset.estado === estadoAbierto)));
    const e = refugio.estados.find((x) => x.id === estadoAbierto);
    if (!e) { caja.hidden = true; return; }
    let texto = t(e.texto);
    if (e.dinamico) {
      const pr = progreso();
      const r = calcular();
      const est = plan.ruta.find((x) => !estacionLista(x));
      const c = colchon();
      const enColchon = c.hayDatos && c.etapa && c.etapa !== "alemania" ? ` En el colchón llevan ${pesos(c.ahorrado)} de ${pesos(c.meta)}.` : "";
      texto = `Llevan <strong>${pr.hechas} de ${pr.total}</strong> tareas de la ruta y respondieron juntos <strong>${pr.respondidas} de ${pr.preguntas}</strong> preguntas que deciden.${enColchon} ${est ? `En los trámites están en «${est.nombre}».` : "Terminaron la ruta."} ${r.fondosListos ? "Los fondos de solvencia ya están." : `Para ${ctx.fechaFondos} cada uno necesita ${ctx.congelado} en su cuenta.`} Ir lento también es avanzar.`;
    }
    if (e.id === "plata") {
      const c = colchon();
      if (c.hayDatos) texto += ` Hoy ${c.disp >= 0 ? `les quedan ${pesos(c.disp)} al mes` : `faltan ${pesos(-c.disp)} al mes`}, y el primer paso es el colchón.`;
    }
    caja.innerHTML = `<h3>${e.nombre}</h3><p>${texto}</p><div class="estado-ir">${e.ir.map(([href, txt]) => `<a href="${href}">${txt}</a>`).join("")}</div>`;
    caja.hidden = false;
  }

  function areaRespuesta(id, i, etiqueta) {
    const valor = ((estado.respuestas[id] || {})[i]) || "";
    const area = el("textarea", { rows: "2", "aria-label": etiqueta, placeholder: `${plan.personas[i]} escribe aquí…` });
    area.value = valor;
    let reloj;
    area.addEventListener("input", () => {
      estado.respuestas[id] = estado.respuestas[id] || {};
      estado.respuestas[id][i] = area.value;
      clearTimeout(reloj);
      reloj = setTimeout(() => { guardar(); contarRespuestas(); }, 400);
    });
    return area;
  }

  function contarRespuestas() {
    const pr = progreso();
    $("#contador-respuestas").textContent = `Respondidas por los dos: ${pr.respondidas} de ${pr.preguntas}.`;
    document.querySelectorAll(".pregunta-decide").forEach((n) => {
      const r = estado.respuestas[n.dataset.id] || {};
      n.classList.toggle("respondida", plan.personas.every((_, i) => (r[i] || "").trim()));
    });
  }

  function pintarPreguntasDeciden() {
    const cont = $("#grupos-preguntas");
    const abiertas = new Set([...cont.querySelectorAll("details[open]")].map((d) => d.dataset.id));
    cont.innerHTML = "";
    refugio.grupos.forEach((g) => {
      const grupo = el("div", { class: "grupo-deciden " + g.id });
      grupo.append(el("h4", { class: "grupo-nombre" }, g.nombre), el("p", { class: "grupo-texto" }, g.texto));
      g.temas.forEach((tema) => {
        const bloque = el("div", { class: "tema-deciden" });
        bloque.append(el("h5", {}, tema.nombre));
        tema.preguntas.forEach((q) => {
          const d = el("details", { class: "pregunta-decide", "data-id": q.id, open: abiertas.has(q.id) });
          d.append(el("summary", {}, `<span class="pd-marca" aria-hidden="true"></span><span>${q.texto}</span>`));
          const cuerpo = el("div", { class: "pd-cuerpo" });
          cuerpo.append(el("p", { class: "pd-ayuda" }, q.ayuda));
          const dos = el("div", { class: "pd-areas" });
          plan.personas.forEach((nombre, i) => {
            const l = el("label", {}, `<span>${nombre}</span>`);
            l.append(areaRespuesta(q.id, i, `${q.texto}: respuesta de ${nombre}`));
            dos.append(l);
          });
          cuerpo.append(dos);
          d.append(cuerpo);
          bloque.append(d);
        });
        grupo.append(bloque);
      });
      cont.append(grupo);
    });
    contarRespuestas();
  }

  const MAL_DATO = "Con el plan actual llevan para vivir allá <strong>{{llevan}}</strong> entre los dos (≈ {{llevanEur}}), más los sueldos que vayan ganando. Es la misma cifra de «Llevan para vivir allá» en la ventana La plata.";
  function pintarMalMes() {
    const m = refugio.malMes;
    const caja = $("#mal-mes");
    caja.innerHTML = `<h3>${m.titulo}</h3><p>${m.texto}</p>
      <p class="mal-dato" ${vivo(MAL_DATO)}>${t(MAL_DATO)}</p>`;
    const grid = el("div", { class: "mal-campos" });
    m.campos.forEach((c) => {
      const l = el("label", { class: "mal-campo" }, `<span>${c.texto}</span>`);
      const area = el("textarea", { rows: "2", placeholder: "Respuesta de los dos…" });
      area.value = ((estado.respuestas[c.id] || {}).j) || "";
      let reloj;
      area.addEventListener("input", () => {
        estado.respuestas[c.id] = { j: area.value };
        clearTimeout(reloj); reloj = setTimeout(guardar, 400);
      });
      l.append(area);
      grid.append(l);
    });
    caja.append(grid);
  }

  function pintarFamilia() {
    const f = refugio.familia;
    const caja = $("#familia");
    caja.innerHTML = `<h3>Familia y distancia</h3><p>${f.texto}</p><div class="familia-grid" id="familia-grid"></div>
      <div class="familia-consejos">${f.consejos.map((x) => `<p>${x}</p>`).join("")}</div>`;
    const grid = $("#familia-grid");
    plan.personas.forEach((nombre, i) => {
      const col = el("div", { class: "familia-col" });
      col.append(el("h4", {}, `El contacto de ${nombre}`));
      const filas = el("div", { class: "contactos" });
      const lista = () => (estado.contacto[i] = estado.contacto[i] || []);
      const redibujar = () => {
        filas.innerHTML = "";
        if (!lista().length) filas.append(el("p", { class: "nota" }, "Todavía no hay nadie. Agreguen a quien quieran, o a nadie."));
        lista().forEach((c, k) => {
          const fila = el("div", { class: "contacto" });
          const quien = el("input", { type: "text", placeholder: "¿Con quién?", "aria-label": "Con quién" });
          quien.value = c.quien || "";
          quien.addEventListener("input", () => { c.quien = quien.value; guardar(); });
          const sel = (opciones, clave, etiqueta) => {
            const s = el("select", { "aria-label": etiqueta });
            opciones.forEach((o) => s.append(el("option", { value: o }, o)));
            s.value = c[clave] || opciones[0];
            c[clave] = s.value;
            s.addEventListener("change", () => { c[clave] = s.value; guardar(); });
            return s;
          };
          const quitar = el("button", { type: "button", class: "quitar", "aria-label": "Quitar" }, "×");
          quitar.addEventListener("click", () => { lista().splice(k, 1); guardar(); redibujar(); });
          fila.append(quien, sel(f.frecuencias, "cada", "Cada cuánto"), sel(f.medios, "como", "Cómo"), quitar);
          filas.append(fila);
        });
      };
      const agregar = el("button", { type: "button", class: "boton-texto" }, "Agregar a alguien");
      agregar.addEventListener("click", () => { lista().push({}); guardar(); redibujar(); });
      redibujar();
      col.append(filas, agregar);
      grid.append(col);
    });
  }

  async function copiarRespuestas() {
    const lineas = [];
    refugio.grupos.forEach((g) => g.temas.forEach((t) => t.preguntas.forEach((q) => {
      const r = estado.respuestas[q.id] || {};
      if (!plan.personas.some((_, i) => (r[i] || "").trim())) return;
      lineas.push(`• ${q.texto}`);
      plan.personas.forEach((n, i) => { if ((r[i] || "").trim()) lineas.push(`  ${n}: ${r[i].trim()}`); });
      lineas.push("");
    })));
    refugio.malMes.campos.forEach((c) => {
      const v = ((estado.respuestas[c.id] || {}).j || "").trim();
      if (v) lineas.push(`• ${c.texto}`, `  ${v}`, "");
    });
    const texto = lineas.length ? `Nuestras respuestas (Proyecto Alemania)\n\n${lineas.join("\n")}` : "";
    const aviso = $("#copiado-respuestas");
    if (!texto) { aviso.textContent = "Todavía no hay respuestas escritas."; return; }
    try { await navigator.clipboard.writeText(texto); aviso.textContent = "Copiadas. Pueden pegarlas en WhatsApp o en una nota."; }
    catch { aviso.textContent = "No se pudo copiar automáticamente en este navegador."; }
  }

  /* ---------- Prepararse ---------- */
  const vozAlemana = () => {
    if (!("speechSynthesis" in window)) return null;
    return speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith("de")) || null;
  };
  function decir(texto) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto.replace("…", ""));
    u.lang = "de-DE";
    u.rate = 0.85;
    const v = vozAlemana();
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  function montarPreparacion() {
    const tabs = document.querySelectorAll(".pestanas [role=tab]");
    const elegir = (id) => {
      estado.pestana = id; guardarLocal();
      tabs.forEach((tb) => {
        const on = tb.id === "tab-" + id;
        tb.setAttribute("aria-selected", String(on));
        tb.tabIndex = on ? 0 : -1;
        $("#" + tb.getAttribute("aria-controls")).hidden = !on;
      });
    };
    tabs.forEach((tb, i) => {
      tb.addEventListener("click", () => elegir(tb.id.replace("tab-", "")));
      tb.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const sig = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        sig.focus(); sig.click();
      });
    });
    pintarAleman();
    pintarHospedaje();
    pintarExperiencias();
    elegir(estado.pestana || "aleman");
  }

  function pintarAleman() {
    const a = prep.aleman;
    const hayVoz = "speechSynthesis" in window;
    const plan12 = a.plan.map((f) => `
      <div class="fase-aleman">
        <span class="fase-semanas">${f.semanas}</span>
        <h4>${f.nombre}</h4>
        <p>${f.texto}</p>
        <p class="fase-meta"><strong>Al terminar:</strong> ${f.meta}</p>
      </div>`).join("");
    const recursos = a.recursos.map((r) => `
      <a class="recurso" href="${r.url}" target="_blank" rel="noopener">
        <span class="recurso-precio">${r.precio}</span>
        <span class="recurso-nombre">${r.nombre}</span>
        <span class="recurso-nivel">${r.nivel}</span>
        <span class="recurso-texto">${r.texto}</span>
      </a>`).join("");
    const panel = $("#panel-aleman");
    panel.innerHTML = `
      <p class="prep-intro">${a.intro}</p>
      <div class="plan-aleman">${plan12}</div>
      <div class="aleman-cuerpo">
        <div>
          <h3 class="prep-titulo">Frases para el primer día</h3>
          <p class="nota">Toquen una tarjeta para ver qué significa y cómo se dice.${hayVoz ? " El botón de sonido la lee en alemán." : ""}</p>
          <div class="frases" id="frases"></div>
          <p class="nota">${a.nota}</p>
        </div>
        <div>
          <h3 class="prep-titulo">Dónde estudiar</h3>
          <div class="recursos">${recursos}</div>
        </div>
      </div>`;
    const cont = $("#frases");
    a.frases.forEach((f) => {
      const card = el("div", { class: "frase" });
      const voltear = el("button", { type: "button", class: "frase-cara", "aria-expanded": "false" },
        `<span class="frase-de" lang="de">${f.de}</span><span class="frase-es">${f.es}</span><span class="frase-pron">${f.pron}</span>`);
      voltear.addEventListener("click", () => {
        const abierta = card.classList.toggle("abierta");
        voltear.setAttribute("aria-expanded", String(abierta));
      });
      card.append(voltear);
      if (hayVoz) {
        const oir = el("button", { type: "button", class: "frase-oir", "aria-label": `Escuchar: ${f.de}` },
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>');
        oir.addEventListener("click", () => decir(f.de));
        card.append(oir);
      }
      cont.append(card);
    });
  }

  function pintarHospedaje() {
    const h = prep.hospedaje;
    const tramo = (pasos, titulo, clase) => `
      <div class="tramo-hospedaje ${clase}">
        <h3 class="prep-titulo">${titulo}</h3>
        <ol class="pasos">${pasos.map((p) => `<li><span class="paso-punto" aria-hidden="true"></span><div><h4>${p.nombre}</h4><p>${p.texto}</p></div></li>`).join("")}</ol>
      </div>`;
    const panel = $("#panel-hospedaje");
    panel.innerHTML = `
      <p class="prep-intro">${h.intro}</p>
      <div class="hospedaje-ruta">
        ${tramo(h.desdeChile, "Desde Chile", "desde-chile")}
        ${tramo(h.alLlegar, "Al llegar", "al-llegar")}
      </div>
      <div class="plantilla">
        <div class="plantilla-cabeza">
          <h3 class="prep-titulo">Mensaje para pedir una pieza</h3>
          <div class="segmentos-claros" role="group" aria-label="Idioma del mensaje">
            <button type="button" data-idioma="de" aria-pressed="true">En alemán</button>
            <button type="button" data-idioma="es" aria-pressed="false">Qué dice</button>
          </div>
        </div>
        <pre class="plantilla-texto" id="plantilla-texto"></pre>
        <div class="plantilla-pie">
          <button type="button" class="boton" id="copiar">Copiar mensaje en alemán</button>
          <span class="nota" id="copiado" aria-live="polite"></span>
        </div>
        <p class="nota">Cambien [Stadt] por la ciudad y [Datum] por la fecha (por ejemplo, 1. April).</p>
      </div>
      <div class="alertas">
        <h3 class="prep-titulo">Señales de estafa</h3>
        <p class="nota">Si un anuncio tiene cualquiera de estas, no paguen nada.</p>
        <div class="alertas-grid">${h.alertas.map((x) => `<p class="alerta">${x}</p>`).join("")}</div>
      </div>`;
    const texto = $("#plantilla-texto");
    let idioma = "de";
    const mostrar = () => {
      texto.textContent = h.plantilla[idioma];
      texto.lang = idioma;
      panel.querySelectorAll("[data-idioma]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.idioma === idioma)));
    };
    panel.querySelectorAll("[data-idioma]").forEach((b) => b.addEventListener("click", () => { idioma = b.dataset.idioma; mostrar(); }));
    mostrar();
    $("#copiar").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(h.plantilla.de);
        $("#copiado").textContent = "Mensaje copiado.";
      } catch {
        $("#copiado").textContent = "No se pudo copiar automáticamente: seleccionen el texto y cópienlo a mano.";
      }
    });
  }

  function pintarExperiencias() {
    $("#panel-experiencias").innerHTML = `
      <p class="prep-intro">Historias de personas que ya hicieron la Working Holiday en Alemania, resumidas. Toquen el enlace para leerlas completas.</p>
      <div class="experiencias">${prep.experiencias.map((x) => `
        <article class="experiencia">
          <p class="exp-quien">${x.quien}<span>${x.donde}</span></p>
          <h4>${x.titulo}</h4>
          <dl>
            <dt>Lo que le funcionó</dt><dd>${x.sirvio}</dd>
            <dt>Lo que le costó</dt><dd>${x.costo}</dd>
            <dt>Lo que se llevan ustedes</dt><dd>${x.leccion}</dd>
          </dl>
          <a href="${x.url}" target="_blank" rel="noopener">Leer en ${x.fuente}</a>
        </article>`).join("")}
      </div>`;
  }

  /* ---------- Dudas ---------- */
  const normal = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function montarDudas() {
    const temas = $("#temas");
    const todos = el("button", { type: "button", "aria-pressed": String(!estado.tema) }, "Todas");
    todos.addEventListener("click", () => elegirTema(null));
    temas.append(todos);
    dudas.temas.forEach((tm) => {
      const b = el("button", { type: "button", "data-tema": tm.id, "aria-pressed": String(estado.tema === tm.id) }, tm.nombre);
      b.addEventListener("click", () => elegirTema(tm.id));
      temas.append(b);
    });
    $("#buscar").addEventListener("input", pintarPreguntas);
    if (!estado.duda) estado.duda = dudas.dudas[0].id;
  }

  function elegirTema(id) {
    estado.tema = id; guardarLocal();
    document.querySelectorAll("#temas button").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.tema || null) === id)));
    pintarPreguntas();
  }

  function pintarPreguntas() {
    const q = normal($("#buscar").value.trim());
    const cont = $("#preguntas");
    cont.innerHTML = "";
    const visibles = dudas.dudas.filter((d) =>
      (!estado.tema || d.tema === estado.tema) &&
      (!q || normal(d.pregunta + " " + t(d.respuesta).replace(/<[^>]+>/g, " ")).includes(q)));
    if (!visibles.length) {
      cont.append(el("p", { class: "vacio" }, "No hay una respuesta con esa palabra todavía. Prueben con otra, o agréguenla en data/dudas.json."));
    }
    visibles.forEach((d) => {
      const b = el("button", { type: "button", class: "pregunta", "aria-pressed": String(d.id === estado.duda) }, d.pregunta);
      b.addEventListener("click", () => {
        estado.duda = d.id; guardarLocal();
        cont.querySelectorAll(".pregunta").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
        pintarRespuesta();
        ubicarRespuesta();
        if (angosta.matches) b.scrollIntoView({ block: "start" });
      });
      cont.append(b);
    });
    pintarRespuesta();
    ubicarRespuesta();
  }

  /* En pantallas angostas la respuesta aparece justo debajo de la pregunta elegida */
  const angosta = window.matchMedia("(max-width: 860px)");
  function ubicarRespuesta() {
    const r = $("#respuesta");
    const elegida = $("#preguntas .pregunta[aria-pressed='true']");
    if (angosta.matches && elegida) elegida.after(r);
    else $(".dudas-cuerpo").append(r);
  }
  angosta.addEventListener("change", ubicarRespuesta);

  function pintarRespuesta() {
    const d = dudas.dudas.find((x) => x.id === estado.duda) || dudas.dudas[0];
    const tema = dudas.temas.find((tm) => tm.id === d.tema);
    $("#respuesta").innerHTML = `<p class="respuesta-tema">${tema ? tema.nombre : ""}</p><h3>${d.pregunta}</h3><div class="respuesta-cuerpo">${t(d.respuesta)}</div>`;
  }

  /* ---------- Ventana: las lucas (la cascada de prioridades) ---------- */
  const DIA_PAGO = [
    ["Lo que no se negocia, primero", "Apenas llega el sueldo, paguen arriendo y cuentas. Así nunca se gasta por accidente la plata del techo."],
    ["El colchón se separa el mismo día", "Transfieran lo del colchón a una cuenta aparte antes de gastar en otra cosa. Lo que no se ve, no se gasta."],
    ["La comida, por semana", "Dividan lo del supermercado en cuatro montos. Si una semana sobra, pasa a la siguiente."],
    ["Lo que sobre a fin de mes, al colchón", "El último día del mes, todo lo que quedó en la cuenta del día a día se va a la del colchón."],
    ["Si un mes no alcanza, se recorta desde abajo", "El orden de los baldes dice qué se sacrifica primero: nunca el techo ni la comida."]
  ];

  function montarLucas() {
    const r = $("#lucas-ingreso"), out = $("#lucas-ingreso-out");
    const poner = (v) => { estado.lucasIngreso = v; r.value = v; out.textContent = pesos(v); };
    r.addEventListener("input", () => { poner(Number(r.value)); pintarLucas(); });
    const atajos = $("#lucas-atajos");
    const opciones = () => {
      const eco = economia(), s = estado.colchonSueldos;
      return [
        ["hoy", "Lo que ganan hoy", eco.ingreso],
        ["full", "+ un full time", eco.ingreso + (Number(s.full) || 0)],
        ["ambos", "+ full y part time", eco.ingreso + (Number(s.full) || 0) + (Number(s.part) || 0)],
        ["meta", "La meta: $3 millones", 3000000]
      ];
    };
    atajos.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const o = opciones().find((x) => x[0] === b.dataset.atajo);
      if (o) { poner(o[2]); pintarLucas(); }
    });
    montarLucas.atajos = (actual) => {
      atajos.innerHTML = opciones().map(([id, nombre, v]) => `<button type="button" data-atajo="${id}" aria-pressed="${v === actual}">${nombre}<small>${pesos(v)}</small></button>`).join("");
    };
    montarLucas.poner = poner;
    $("#dia-pago").innerHTML = DIA_PAGO.map(([titulo, texto], i) => `<div class="pago"><span class="pago-num">${i + 1}</span><h4>${titulo}</h4><p>${texto}</p></div>`).join("");
  }

  function baldes(ingreso) {
    const eco = economia();
    const e = estado.economia || {};
    const n = (k) => Number(e[k]) || 0;
    const probar = estado.probarVivienda;
    const techo = probar ? probar.monto + (probar.conCuentas ? 0 : n("cuentas")) : n("arriendo") + n("cuentas");
    const lista = [
      { id: "techo", nombre: "Techo", detalle: probar ? `${probar.nombre}${probar.conCuentas ? "" : " + luz, agua, gas e internet"}` : "Arriendo, gasto común, luz, agua, gas e internet", necesita: techo },
      { id: "comer", nombre: "Comer y moverse", detalle: "Supermercado, transporte y lo demás de la casa", necesita: n("comida") + n("transporte") + n("otrosCasa") },
      { id: "cada", nombre: "Lo de cada uno", detalle: "Celular, salud, estudios y gustos de cada uno", necesita: eco.personal[0] + eco.personal[1] },
      { id: "deudas", nombre: "Cuotas de deudas", detalle: "Para que no crezcan ni lleguen a DICOM", necesita: n("deudas") }
    ].filter((b) => b.id !== "deudas" || b.necesita > 0);
    const c = colchon({ extra: ingreso - eco.ingreso, pieza: probar && probar.conCuentas ? probar.monto : null, arriendo: probar && !probar.conCuentas ? probar.monto : null });
    const r = calcular();
    let resto = ingreso;
    lista.forEach((b) => { b.recibe = Math.min(resto, b.necesita); resto -= b.recibe; });
    const fijo = lista.reduce((s, b) => s + b.necesita, 0);
    const colchonB = { id: "colchon", nombre: "El colchón", necesita: c.falta, recibe: Math.min(resto, c.falta), flexible: true };
    resto -= colchonB.recibe;
    colchonB.detalle = c.falta === 0 ? "Completo: se queda quieto como respaldo" : `Faltan ${pesos(c.falta)} para ${c.meses} ${c.meses === 1 ? "mes" : "meses"} de gastos`;
    const alemaniaNecesita = isFinite(r.mensual) ? r.mensual : 0;
    const alemaniaB = { id: "alemania", nombre: "Alemania", necesita: alemaniaNecesita, recibe: Math.min(resto, alemaniaNecesita), flexible: true };
    alemaniaB.detalle = alemaniaNecesita ? `El plan pide ${pesos(alemaniaNecesita)} al mes para viajar en ${mesAnio(r.V)}` : "Ya tienen lo necesario para el viaje";
    resto -= alemaniaB.recibe;
    return { lista: [...lista, colchonB, alemaniaB], sobra: resto, fijo, c, r };
  }

  function pintarLucas() {
    if (!montarLucas.poner) return;
    const eco = economia();
    const ingreso = estado.lucasIngreso != null ? estado.lucasIngreso : eco.ingreso || 0;
    $("#lucas-ingreso").value = ingreso; $("#lucas-ingreso-out").textContent = pesos(ingreso);
    montarLucas.atajos(ingreso);
    const probando = $("#lucas-probando");
    if (estado.probarVivienda) {
      probando.hidden = false;
      probando.innerHTML = `Probando vivir en <strong>${escapar(estado.probarVivienda.nombre)}</strong> (${pesos(estado.probarVivienda.monto)}). <button type="button" class="boton-texto" id="dejar-probar">Volver a la vivienda de hoy</button>`;
      $("#dejar-probar").addEventListener("click", () => { estado.probarVivienda = null; pintarLucas(); pintarVivir(); });
    } else probando.hidden = true;

    if (!eco.hayDatos) {
      $("#cascada").innerHTML = "";
      $("#lucas-resumen").innerHTML = `<p class="visor-etiqueta">Primero, sus números</p><p>Anoten lo que ganan y gastan en la ventana del colchón y aquí aparece cómo se reparte cada mes.</p><a class="boton" href="#economia">Anotar nuestra economía</a>`;
      return;
    }
    const { lista, sobra, fijo, c } = baldes(ingreso);
    let seco = false;
    $("#cascada").innerHTML = lista.map((b) => {
      const pct = b.necesita > 0 ? Math.min(100, (b.recibe / b.necesita) * 100) : 100;
      const lleno = b.necesita === 0 || b.recibe >= b.necesita;
      const marca = !seco && !lleno && !b.flexible;
      const aqui = !seco && b.recibe < b.necesita ? ' <span class="balde-aqui">Aquí se acaba la plata</span>' : "";
      const clase = ["balde", "bd-" + b.id, lleno ? "lleno" : "", seco ? "seco" : "", marca ? "falta" : ""].filter(Boolean).join(" ");
      if (b.recibe < b.necesita) seco = true;
      const cifra = b.flexible
        ? (b.id === "colchon" && b.necesita === 0 ? "Completo" : `${pesos(b.recibe)} este mes`)
        : `${pesos(b.recibe)} de ${pesos(b.necesita)}`;
      return `<li class="${clase}">
        <span class="balde-punto" aria-hidden="true"></span>
        <div class="balde-texto">
          <div class="balde-fila"><h4>${b.nombre}</h4><b>${cifra}</b></div>
          <p>${b.detalle}${aqui}</p>
          <span class="balde-barra" aria-hidden="true"><i style="width:${b.flexible && b.id === "colchon" && b.necesita > 0 ? Math.min(100, (b.recibe / Math.max(b.necesita, 1)) * 100) : pct}%"></i></span>
        </div>
      </li>`;
    }).join("");

    const paraAhorrar = Math.max(0, ingreso - fijo);
    const meses = c.falta > 0 && paraAhorrar > 0 ? Math.ceil(c.falta / paraAhorrar) : null; // c ya considera la vivienda que se prueba
    const extra = ingreso - eco.ingreso;
    const pv = estado.probarVivienda;
    const sim = colchon({ extra, pieza: pv && pv.conCuentas ? pv.monto : null, arriendo: pv && !pv.conCuentas ? pv.monto : null });
    const inicio = estado.colchonPrimero ? (sim.falta === 0 ? hoy : sim.listo) : hoy;
    const fecha = sim.disp > 0 && inicio ? fechaPosible(sim.disp, inicio) : null;
    const cubreBasico = ingreso >= fijo;
    $("#lucas-resumen").innerHTML = `
      <p class="visor-etiqueta">Con ${pesos(ingreso)} al mes</p>
      <p class="visor-titulo">${cubreBasico ? "Lo básico está cubierto" : "No alcanza para lo básico"}</p>
      <p>${cubreBasico ? `Después de lo que no se negocia quedan <strong>${pesos(paraAhorrar)}</strong> para ahorrar.` : `Faltan <strong>${pesos(fijo - ingreso)}</strong> para cubrir techo, comida y lo de cada uno.`}</p>
      <dl class="visor-datos">
        <div><dt>Gastos que no se negocian</dt><dd>${pesos(fijo)}</dd></div>
        <div><dt>Colchón completo</dt><dd>${c.falta === 0 ? "Ya está" : meses ? `en ${meses} ${meses === 1 ? "mes" : "meses"}` : "—"}</dd></div>
        <div><dt>Alemania, lo antes posible</dt><dd>${fecha ? mesAnio(fecha) : "—"}</dd></div>
        ${sobra > 0 ? `<div><dt>Sobra después de todo</dt><dd class="pos">${pesos(sobra)}</dd></div>` : ""}
      </dl>
      <p class="nota">Es una simulación: no cambia sus datos.</p>`;
  }

  /* ---------- Ventana: trabajos ---------- */
  const ESCALA_MAX = 2200000;
  function montarTrabajos() {
    $("#trabajos-intro").textContent = trabajosData.intro;
    $("#trabajos-conclusion").textContent = trabajosData.conclusion;
    estado.filtrosTrabajo = estado.filtrosTrabajo || [];
    const f = $("#trabajos-filtros");
    f.innerHTML = trabajosData.filtros.map((x) => `<button type="button" data-filtro="${x.id}">${x.nombre}</button>`).join("");
    f.addEventListener("click", (e) => {
      const b = e.target.closest("[data-filtro]");
      if (!b) return;
      const id = b.dataset.filtro;
      const s = new Set(estado.filtrosTrabajo);
      if (s.has(id)) s.delete(id); else s.add(id);
      estado.filtrosTrabajo = [...s];
      pintarTrabajos();
    });
    $("#escala").addEventListener("click", (e) => {
      const b = e.target.closest("[data-trabajo]");
      if (!b) return;
      estado.trabajo = b.dataset.trabajo;
      pintarTrabajos();
      if (angosta.matches) $("#trabajo-detalle").scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    const todas = new Map();
    trabajosData.trabajos.forEach((t) => t.fuentes.forEach((x) => todas.set(x.url, x)));
    todas.set(trabajosData.medianaFuente.url, trabajosData.medianaFuente);
    $("#trabajos-fuentes").innerHTML = `<p class="visor-etiqueta">Fuentes (revisadas el ${fechaTexto(trabajosData.revisado)})</p>` +
      [...todas.values()].map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${x.nombre}</a>`).join("");

    const cont = $("#combina-personas");
    plan.personas.forEach((nombre, i) => {
      const fila = el("div", { class: "combina-persona" });
      fila.innerHTML = `<label><span>${nombre}</span><select data-combina="${i}">
        <option value="hoy">Sigue como hoy</option>
        <optgroup label="Con el sueldo mínimo">
          <option value="full-min">Full time con sueldo mínimo (con gratificación)</option>
          <option value="part-min">Part time de 30 horas (con gratificación)</option>
        </optgroup>
        <optgroup label="Trabajos del estudio">
          ${trabajosData.trabajos.map((t) => `<option value="${t.id}">${t.nombre}</option>`).join("")}
        </optgroup>
      </select></label>
      <label class="check-chico"><input type="checkbox" data-mantiene="${i}"> y mantiene su trabajo de hoy</label>`;
      cont.append(fila);
    });
    const vive = el("div", { class: "combina-persona combina-vive" });
    vive.innerHTML = `<label><span>Dónde viven</span><select data-vive>
      <option value="hoy">Donde viven hoy</option>
      <option value="pieza">Pieza para dos, cuentas incluidas</option>
      <optgroup label="Departamento 1D (arriendo promedio + gasto común)">
        ${barriosData.comunas.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join("")}
      </optgroup>
    </select></label>`;
    cont.append(vive);
    cont.addEventListener("change", (e) => {
      const v = e.target.closest("[data-vive]");
      if (v) estado.combina.vive = v.value;
      const s = e.target.closest("[data-combina]"), m = e.target.closest("[data-mantiene]");
      if (s) estado.combina[s.dataset.combina] = s.value;
      if (m) estado.combina["m" + m.dataset.mantiene] = m.checked;
      guardar(); pintarCombina();
    });
    const mostrar = () => {
      plan.personas.forEach((_, i) => {
        cont.querySelector(`[data-combina="${i}"]`).value = estado.combina[i] || "hoy";
        cont.querySelector(`[data-mantiene="${i}"]`).checked = Boolean(estado.combina["m" + i]);
      });
      cont.querySelector("[data-vive]").value = estado.combina.vive || "hoy";
    };
    mostrar();
    sincronizadores.push(mostrar);
  }

  const fechaTexto = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; };

  function pintarTrabajos() {
    const filtros = new Set(estado.filtrosTrabajo || []);
    document.querySelectorAll("#trabajos-filtros button").forEach((b) => b.setAttribute("aria-pressed", String(filtros.has(b.dataset.filtro))));
    const visibles = trabajosData.trabajos.filter((t) => [...filtros].every((f) => t.tags.includes(f)));
    if (!visibles.some((t) => t.id === estado.trabajo)) estado.trabajo = visibles[0] ? visibles[0].id : null;
    const x = (v) => `${Math.min(100, (v / ESCALA_MAX) * 100)}%`;
    const meta = trabajosData.metaPersona, med = trabajosData.mediana;
    $("#escala").innerHTML = `
      <div class="escala-ejes" aria-hidden="true">
        <span class="eje-med" style="left:${x(med)}"><span>Mitad de Chile ${pesos(med)}</span></span>
        <span class="eje-meta" style="left:${x(meta)}"><span>Meta ${pesos(meta)}</span></span>
      </div>
      ${visibles.length ? visibles.map((t) => `
        <button type="button" class="escala-fila" data-trabajo="${t.id}" aria-pressed="${t.id === estado.trabajo}">
          <span class="escala-nombre">${t.nombre}</span>
          <span class="escala-pista"><i style="left:${x(t.min)};width:calc(${x(t.max)} - ${x(t.min)})"></i></span>
          <span class="escala-monto">${pesos(t.min)} – ${pesos(t.max)}</span>
        </button>`).join("") : `<p class="nota">Ningún trabajo cumple todos esos filtros a la vez.</p>`}
      <div class="escala-pie" aria-hidden="true"><span>$0</span><span>${pesos(ESCALA_MAX / 2)}</span><span>${pesos(ESCALA_MAX)}</span></div>`;
    const t = trabajosData.trabajos.find((j) => j.id === estado.trabajo);
    $("#trabajo-detalle").innerHTML = t ? `
      <p class="visor-etiqueta">Líquido al mes, según avisos de 2026</p>
      <h3>${t.nombre}</h3>
      <p class="detalle-rango">${pesos(t.min)} a ${pesos(t.max)}</p>
      <p>${t.detalle}</p>
      <p class="detalle-req"><strong>Piden:</strong> ${t.requisitos}</p>
      <div class="detalle-tags">${t.tags.map((g) => `<span>${(trabajosData.filtros.find((f) => f.id === g) || {}).nombre || g}</span>`).join("")}</div>
      <div class="detalle-fuentes">${t.fuentes.map((f) => `<a href="${f.url}" target="_blank" rel="noopener">${f.nombre}</a>`).join("")}</div>` : "";
    pintarCombina();
  }

  function pintarCombina() {
    const caja = $("#combina-resultado");
    if (!caja) return;
    const eco = economia();
    const sm = estado.colchonSueldos;
    const medio = (id) => {
      if (id === "full-min") return Number(sm.full) || 0;
      if (id === "part-min") return Number(sm.part) || 0;
      const t = trabajosData.trabajos.find((j) => j.id === id);
      return t ? (t.min + t.max) / 2 : 0;
    };
    const ingresos = plan.personas.map((_, i) => {
      const sel = estado.combina[i] || "hoy";
      const hoyI = eco.sueldo[i] || 0;
      if (sel === "hoy") return hoyI;
      return medio(sel) + (estado.combina["m" + i] ? hoyI : 0);
    });
    const total = ingresos[0] + ingresos[1];
    if (!eco.hayDatos) {
      caja.innerHTML = `<p class="nota">Anoten lo que gana cada uno en la ventana del colchón para comparar con lo de hoy.</p>`;
      return;
    }
    const extra = total - eco.ingreso;
    const vive = estado.combina.vive || "hoy";
    const comuna = barriosData.comunas.find((x) => x.id === vive);
    const pieza = vive === "pieza" ? barriosData.pieza.max : null;
    const arriendo = comuna ? comuna.arriendo + barriosData.gastosComunes : null;
    const c = colchon({ extra, pieza, arriendo });
    const inicio = estado.colchonPrimero ? (c.falta === 0 ? hoy : c.listo) : hoy;
    const fecha = c.disp > 0 && inicio ? fechaPosible(c.disp, inicio) : null;
    const metaDos = trabajosData.metaPersona * 2;
    const vivienda = pieza != null ? pieza : (arriendo != null ? arriendo : eco.arriendo) + eco.cuentas;
    const viviendaTexto = pieza != null ? "la pieza (todo incluido)" : comuna ? `${comuna.nombre} con gasto común y cuentas` : "la vivienda de hoy con cuentas";
    caja.innerHTML = `
      <div class="combina-barra" role="img" aria-label="Entrarían ${pesos(total)} de una meta de ${pesos(metaDos)}">
        <i style="width:${Math.min(100, (total / metaDos) * 100)}%"></i>
        <span>${Math.round((total / metaDos) * 100)}% de la meta de ${millones(metaDos)}</span>
      </div>
      <div class="esc-cifras">
        <div class="esc-cifra"><span>Entrarían al mes</span><b>${pesos(total)}</b></div>
        <div class="esc-cifra"><span>Colchón completo</span><b>${c.falta === 0 ? "Ya está" : c.listo ? mesAnio(c.listo) : "No llega"}</b></div>
        <div class="esc-cifra"><span>Alemania, lo antes posible</span><b>${fecha ? mesAnio(fecha) : "—"}</b></div>
      </div>
      <p class="esc-explica">Vivienda: ${viviendaTexto}, ${pesos(vivienda)} al mes (${Math.round((vivienda / Math.max(total, 1)) * 100)}% de lo que entraría). ${c.disp > 0 ? `Después de todos los gastos les quedarían ${pesos(c.disp)} al mes.` : `Seguiría faltando ${pesos(-c.disp)} al mes.`}</p>
      <div class="combina-botones">
        <button type="button" class="boton" id="combina-lucas">Ver este mes en Las lucas</button>
        ${fecha ? `<button type="button" class="boton-texto" id="usar-combina">Usar ${mesAnio(fecha)} como fecha de viaje</button>` : ""}
      </div>`;
    $("#combina-lucas").addEventListener("click", () => {
      estado.lucasIngreso = total;
      estado.probarVivienda = pieza != null ? { nombre: "una pieza para dos", monto: pieza, conCuentas: true }
        : comuna ? { nombre: comuna.nombre, monto: arriendo, conCuentas: false } : null;
      location.hash = "#lucas";
      pintarLucas();
    });
    const usar = $("#usar-combina");
    if (usar) usar.addEventListener("click", () => {
      estado.viaje = { m: fecha.getMonth(), y: fecha.getFullYear() };
      guardar(); refrescarTodo(); location.hash = "#inicio";
    });
  }

  /* ---------- Ventana: dónde vivir ---------- */
  const COLOR_LINEA = { L1: "#e2231a", L2: "#f6a800", L3: "#8c5a2b", L4: "#1b5fa8", L4A: "#3aa9e0", L5: "#2e9a4a", L6: "#8a3c97" };
  function montarVivir() {
    $("#vivir-intro").textContent = barriosData.intro;
    $("#vivir-region").textContent = `${barriosData.regionVictimizacion} ${barriosData.linea7}`;
    const r = $("#vivir-tope"), out = $("#vivir-tope-out");
    if (!estado.vivirTope) estado.vivirTope = 350000;
    r.value = estado.vivirTope; out.textContent = pesos(estado.vivirTope);
    r.addEventListener("input", () => { estado.vivirTope = Number(r.value); out.textContent = pesos(estado.vivirTope); pintarVivir(); });
    $("#carriles").addEventListener("click", (e) => {
      const b = e.target.closest("[data-comuna]");
      if (!b) return;
      estado.comunaSel = b.dataset.comuna;
      pintarVivir();
      if (angosta.matches) $("#comuna-detalle").scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    $("#vivir-fuentes").innerHTML = `<p class="visor-etiqueta">Fuentes (revisadas el ${fechaTexto(barriosData.revisado)})</p>` +
      barriosData.fuentes.map((x) => `<a href="${x.url}" target="_blank" rel="noopener">${x.nombre}</a>`).join("");
  }

  const chipsLineas = (ls) => ls.map((l) => `<span class="linea-chip" style="--c:${COLOR_LINEA[l] || "#182638"}">${l}</span>`).join("");

  function pintarVivir() {
    if (!barriosData) return;
    const tope = estado.vivirTope || 350000;
    const gc = barriosData.gastosComunes;
    const p = barriosData.pieza;
    const items = [
      { id: "pieza", nombre: "Pieza para dos", arriendo: p.min, max: p.max, lineas: [], seguridad: "sin-dato", pieza: true },
      ...barriosData.comunas
    ];
    if (!items.some((c) => c.id === estado.comunaSel)) estado.comunaSel = "san-miguel";
    $("#carriles").innerHTML = barriosData.niveles.map((n) => {
      const enCarril = items.filter((c) => c.seguridad === n.id && !c.pieza).sort((a, b) => a.arriendo - b.arriendo);
      if (n.id === "sin-dato") enCarril.unshift(items[0]);
      if (!enCarril.length) return "";
      return `<div class="carril carril-${n.id}">
        <p class="carril-nombre">${n.id === "sin-dato" ? "Otras opciones" : n.nombre}</p>
        <div class="carril-chips">${enCarril.map((c) => {
          const sobre = c.arriendo > tope;
          return `<button type="button" class="comuna-chip${sobre ? " sobre" : ""}" data-comuna="${c.id}" aria-pressed="${c.id === estado.comunaSel}">
            <span class="chip-nombre">${c.nombre}</span>
            <span class="chip-precio">${c.pieza ? `${pesos(c.arriendo)}–${pesos(c.max).replace("$", "")}` : pesos(c.arriendo)}</span>
            ${c.lineas.length ? `<span class="chip-lineas">${chipsLineas(c.lineas)}</span>` : ""}
          </button>`;
        }).join("")}</div>
      </div>`;
    }).join("");

    const c = items.find((x) => x.id === estado.comunaSel);
    const eco = economia();
    const total = c.pieza ? c.max : c.arriendo + gc;
    const nivel = barriosData.niveles.find((n) => n.id === c.seguridad);
    const pct = eco.ingreso ? Math.round((total / eco.ingreso) * 100) : null;
    $("#comuna-detalle").innerHTML = `
      <p class="visor-etiqueta">${c.pieza ? "Pieza, cuentas incluidas" : `Seguridad: ${nivel.nombre.toLowerCase()}`}</p>
      <h3>${c.nombre}</h3>
      ${c.lineas.length ? `<p class="detalle-lineas">${chipsLineas(c.lineas)} <span>Metro</span></p>` : ""}
      <div class="esc-cifras">
        <div class="esc-cifra"><span>${c.pieza ? "Arriendo" : "Arriendo 1D (2025)"}</span><b>${c.pieza ? `${pesos(c.arriendo)}–${pesos(c.max).replace("$", "")}` : pesos(c.arriendo)}</b></div>
        <div class="esc-cifra"><span>${c.pieza ? "Total al mes" : `Con gasto común (~${pesos(gc)})`}</span><b>${pesos(total)}</b></div>
        <div class="esc-cifra"><span>De lo que ganan hoy</span><b class="${pct != null && pct > 40 ? "neg" : "pos"}">${pct != null ? pct + "%" : "—"}</b></div>
      </div>
      ${c.pieza ? `<p>${barriosData.pieza.nota}</p>` : `${c.senales.map((s) => `<p class="senal">${s}</p>`).join("")}<p class="nota">${c.nota}</p>`}
      <button type="button" class="boton" id="probar-vivienda">Probar en Las lucas</button>`;
    $("#probar-vivienda").addEventListener("click", () => {
      estado.probarVivienda = c.pieza
        ? { nombre: "una pieza para dos", monto: c.max, conCuentas: true }
        : { nombre: c.nombre, monto: c.arriendo + gc, conCuentas: false };
      location.hash = "#lucas";
      pintarLucas();
    });
  }

  /* ---------- Ventanas ---------- */
  const VISTAS = ["inicio", "colchon", "lucas", "trabajos", "vivir", "refugio", "dinero", "ciudades", "ruta", "prepararse", "dudas", "conectar"];
  const DENTRO = {
    economia: "colchon", escenarios: "colchon", registro: "colchon", acciones: "colchon", "ajustes-colchon": "colchon",
    carpeta: "ruta", combinador: "trabajos", "preguntas-que-deciden": "refugio", familia: "refugio", "mal-mes": "refugio", contenido: null
  };
  const CON_ANOTAR = new Set(["inicio", "colchon", "lucas"]);
  let vistaActual = null;

  function leerHash() {
    const crudo = location.hash.slice(1);
    const [id, query = ""] = crudo.split("?");
    return { id: decodeURIComponent(id || ""), params: new URLSearchParams(query) };
  }

  function rutear() {
    const { id, params } = leerHash();
    if (id === "contenido") { $("#contenido").focus(); return; }
    const vista = VISTAS.includes(id) ? id : (DENTRO[id] || "inicio");
    const cambio = vista !== vistaActual;
    if (cambio) {
      document.querySelectorAll(".vista").forEach((s) => { s.hidden = s.id !== vista; });
      document.querySelectorAll("[data-vista]").forEach((a) => {
        if (a.dataset.vista === vista) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      const sec = document.getElementById(vista);
      const titulo = vista === "inicio" ? "Proyecto Alemania" : sec.dataset.titulo;
      $("#titulo-movil").textContent = titulo;
      document.title = vista === "inicio" ? "Proyecto Alemania de Teoc y Francis" : `${titulo} · Proyecto Alemania`;
      document.querySelector(".fab").hidden = !CON_ANOTAR.has(vista);
      document.querySelector("#abrir-mas").classList.toggle("activo", ["vivir", "refugio", "dinero", "ciudades", "ruta", "prepararse", "dudas", "conectar"].includes(vista));
      vistaActual = vista;
      if (vista === "dudas") ubicarRespuesta();
    }
    cerrarMas();
    const destino = id && id !== vista ? document.getElementById(id) : null;
    if (destino) requestAnimationFrame(() => destino.scrollIntoView({ block: "start" }));
    else if (cambio) window.scrollTo({ top: 0, behavior: "instant" });
    if (vista === "conectar") pintarConectar(params);
  }

  function montarVentanas() {
    window.addEventListener("hashchange", rutear);
    const mas = $("#mas"), abrir = $("#abrir-mas");
    abrir.addEventListener("click", () => {
      const abierto = !mas.hidden;
      if (abierto) cerrarMas();
      else { mas.hidden = false; abrir.setAttribute("aria-expanded", "true"); requestAnimationFrame(() => mas.classList.add("abierto")); mas.querySelector("a").focus(); }
    });
    mas.addEventListener("click", (e) => { if (e.target.closest("[data-cerrar-mas]")) cerrarMas(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !mas.hidden) { cerrarMas(); abrir.focus(); } });
    document.querySelectorAll("[data-sincro]").forEach((b) => b.addEventListener("click", () => { location.hash = "#conectar"; }));

    // «Sigue»: el orden natural de las ventanas
    const ORDEN = [["colchon", "0. El colchón"], ["lucas", "Las lucas"], ["trabajos", "Trabajos"], ["vivir", "Dónde vivir"], ["refugio", "1. Cuando dudemos"], ["dinero", "2. La plata"], ["ciudades", "3. ¿Dónde llegamos?"], ["ruta", "4. Los trámites"], ["prepararse", "5. Prepararse para llegar"], ["dudas", "Todas las dudas"]];
    ORDEN.forEach(([id], i) => {
      const sec = document.getElementById(id);
      const sig = ORDEN[i + 1];
      if (!sec || !sig) return;
      const destino = sec.querySelector(".colchon-principal") || sec.querySelector(".refugio-dentro") || sec;
      destino.append(el("a", { class: "siguiente", href: "#" + sig[0] }, `<span>Sigue</span>${sig[1]}`));
    });
  }

  function cerrarMas() {
    const mas = $("#mas");
    if (mas.hidden) return;
    mas.classList.remove("abierto");
    $("#abrir-mas").setAttribute("aria-expanded", "false");
    setTimeout(() => { if (!mas.classList.contains("abierto")) mas.hidden = true; }, 200);
  }

  /* ---------- Guardar entre los dos ---------- */
  const TEXTOS_SINCRO = {
    local: ["Solo en este dispositivo", "Solo aquí"],
    sincronizando: ["Sincronizando…", "Sincronizando"],
    pendiente: ["Guardando…", "Guardando"],
    ok: ["Al día entre los dos", "Al día"],
    sinred: ["Sin internet: se envía después", "Sin red"],
    error: ["No se pudo sincronizar", "Revisar"]
  };

  function hace(ms) {
    if (!ms) return "nunca";
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 60) return "recién";
    const m = Math.round(s / 60);
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `hace ${h} h`;
    return new Date(ms).toLocaleDateString("es-CL", { day: "numeric", month: "long" });
  }

  function pintarSincro(s) {
    const [largo, corto] = TEXTOS_SINCRO[s.tipo] || TEXTOS_SINCRO.local;
    document.querySelectorAll("[data-sincro]").forEach((b) => {
      b.dataset.estado = s.tipo;
      b.querySelector(".sincro-texto").textContent = b.classList.contains("sincro-mini") ? corto : largo;
      b.title = s.detalle || largo;
    });
    if (vistaActual === "conectar") pintarConectar();
  }

  let conectarParams = null;
  function pintarConectar(params) {
    if (params && (params.get("u") || params.get("c"))) conectarParams = params;
    const panel = $("#conectar-panel");
    if (panel.contains(document.activeElement) && document.activeElement.tagName === "INPUT") return;
    const con = window.Sincro ? window.Sincro.conexion() : null;
    const s = window.Sincro ? window.Sincro.estado() : { tipo: "local" };
    if (!con) {
      const u = conectarParams ? conectarParams.get("u") || "" : "";
      const c = conectarParams ? conectarParams.get("c") || "" : "";
      panel.innerHTML = `
        <div class="conectar-tarjeta">
          <p class="visor-etiqueta">Este dispositivo</p>
          <p class="visor-titulo">${u ? "Les llegó un enlace para conectar" : "Todavía guarda solo aquí"}</p>
          <p>${u ? "La dirección y la clave ya están puestas. Toquen Conectar." : "Cuando tengan la dirección de la planilla, péguenla aquí con su clave."}</p>
          <form class="conectar-form" id="conectar-form" novalidate>
            <label><span>Dirección de la aplicación web</span><input type="url" id="con-url" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false" value="${escapar(u)}"></label>
            <label><span>Clave</span><input type="password" id="con-clave" autocomplete="off" value="${escapar(c)}"></label>
            <p class="dm-error" id="con-error" aria-live="polite"></p>
            <button type="submit" class="boton" id="con-boton">Conectar</button>
          </form>
        </div>`;
      $("#conectar-form").addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const boton = $("#con-boton");
        boton.disabled = true; boton.textContent = "Conectando…";
        $("#con-error").textContent = "";
        try {
          await window.Sincro.conectar($("#con-url").value, $("#con-clave").value);
          conectarParams = null;
          history.replaceState(null, "", "#conectar");
          document.activeElement.blur();
          pintarConectar();
          avisoBreve("Conectados: ahora los dos ven lo mismo");
        } catch (err) {
          $("#con-error").textContent = err.message;
          boton.disabled = false; boton.textContent = "Conectar";
        }
      });
      return;
    }
    const [largo] = TEXTOS_SINCRO[s.tipo] || TEXTOS_SINCRO.local;
    panel.innerHTML = `
      <div class="conectar-tarjeta conectada" data-estado="${s.tipo}">
        <p class="visor-etiqueta">Este dispositivo</p>
        <p class="visor-titulo"><span class="sincro-punto" aria-hidden="true"></span>${largo}</p>
        <p>${s.detalle ? escapar(s.detalle) : `Última sincronización: ${hace(s.ultima)}. Revisa cambios cada 45 segundos mientras la página está abierta.`}</p>
        <div class="conectar-botones">
          <button type="button" class="boton" id="con-ahora">Sincronizar ahora</button>
          <button type="button" class="boton boton-claro" id="con-compartir">Mandar el enlace al otro</button>
          ${s.planilla ? `<a class="boton boton-claro" href="${escapar(s.planilla)}" target="_blank" rel="noopener">Abrir la planilla</a>` : ""}
        </div>
        <p class="nota" id="con-nota" aria-live="polite">El enlace lleva la clave: mándenlo solo entre ustedes.</p>
        <button type="button" class="boton-texto" id="con-salir">Desconectar este dispositivo</button>
      </div>`;
    $("#con-ahora").addEventListener("click", () => window.Sincro.ahora());
    $("#con-compartir").addEventListener("click", async () => {
      const enlace = `${location.origin}${location.pathname}#conectar?u=${encodeURIComponent(con.url)}&c=${encodeURIComponent(con.clave)}`;
      try {
        if (navigator.share) { await navigator.share({ title: "Proyecto Alemania", text: "Toca este enlace para conectar tu teléfono con el nuestro:", url: enlace }); return; }
        await navigator.clipboard.writeText(enlace);
        $("#con-nota").textContent = "Enlace copiado. Pásenlo por WhatsApp y que el otro lo abra en su teléfono.";
      } catch { /* cancelado */ }
    });
    $("#con-salir").addEventListener("click", () => {
      const b = $("#con-salir");
      if (!b.classList.contains("seguro")) { b.classList.add("seguro"); b.textContent = "Tocar otra vez para desconectar"; return; }
      window.Sincro.desconectar();
      pintarConectar();
    });
  }

  function montarCodigo() {
    $("#copiar-codigo").addEventListener("click", async () => {
      const aviso = $("#codigo-copiado");
      try {
        const texto = await fetch("apps-script/Codigo.gs", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(); return r.text(); });
        await navigator.clipboard.writeText(texto);
        aviso.textContent = "Código copiado.";
      } catch {
        aviso.innerHTML = 'No se pudo copiar. Ábranlo <a href="apps-script/Codigo.gs" target="_blank" rel="noopener">aquí</a> y cópienlo a mano.';
      }
    });
  }

  /* ---------- Pie ---------- */
  function pintarPie() {
    const [y, m, d] = plan.actualizado.split("-").map(Number);
    $("#pie-fecha").textContent = `Datos revisados el ${d} de ${MESES[m - 1]} de ${y}. Euro a ${pesos(plan.tipoCambio.eur)} según ${plan.tipoCambio.fuente}.`;
    const f = $("#fuentes");
    plan.fuentes.forEach((x) => f.append(el("a", { href: x.url, target: "_blank", rel: "noopener" }, x.nombre)));
  }

  /* ---------- Todo junto ---------- */
  function todo() {
    const r = calcular();
    ctx = contexto(r);
    pintarNumeros(r);
    pintarFrase(r);
    pintarViaje();
    pintarProximo();
    pintarLinea();
    pintarEstacion();
    pintarDinero(r);
    pintarEconomia(r);
    pintarCiudad();
    pintarColchon();
    pintarVisores();
    pintarLucas();
    pintarTrabajos();
    pintarVivir();
    pintarEstadoAbierto();
    if (dudas && $("#respuesta").innerHTML) pintarRespuesta();
    refrescarVivos();
  }

  /* Cuando llegan datos del otro dispositivo: todo vuelve a leerse del estado. */
  function refrescarTodo() {
    sincronizadores.forEach((f) => f());
    pintarCarpeta();
    pintarPreguntasDeciden();
    pintarMalMes();
    pintarFamilia();
    todo();
  }

  async function iniciar() {
    try {
      const cargar = (u) => fetch(u, { cache: "no-cache" }).then((x) => { if (!x.ok) throw new Error(u); return x.json(); });
      [plan, ciudades, dudas, prep, refugio, colchonData, trabajosData, barriosData] = await Promise.all([
        cargar("data/plan.json"), cargar("data/ciudades.json"), cargar("data/dudas.json"),
        cargar("data/preparacion.json"), cargar("data/refugio.json"), cargar("data/colchon.json"),
        cargar("data/trabajos.json"), cargar("data/barrios.json")
      ]);
    } catch (err) {
      $("#frase-resultado").textContent = "No se pudieron cargar los datos. Si abriste el archivo directo desde la carpeta, usa la página publicada o un servidor local (ver README).";
      return;
    }
    normalizar();
    montarVentanas();
    montarFecha();
    montarControles();
    ctx = contexto(calcular());
    montarEconomia();
    montarColchon();
    montarDialogo();
    montarLucas();
    montarTrabajos();
    montarVivir();
    montarRefugio();
    montarCiudades();
    montarDudas();
    pintarCarpeta();
    montarPreparacion();
    pintarPreguntas();
    pintarPie();
    montarCodigo();
    todo();
    rutear();

    if (window.Sincro) {
      window.Sincro.iniciar({
        obtener: () => estado,
        aplicar: (nuevo) => {
          for (const k of Object.keys(estado)) if (!LOCALES.has(k)) delete estado[k];
          const base = copia(DEFAULTS);
          for (const k of LOCALES) delete base[k];
          Object.assign(estado, base, nuevo);
          normalizar();
          guardarLocal();
          refrescarTodo();
        },
        alCambiar: pintarSincro
      });
    }

    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(() => { /* sin modo sin conexión */ });
    }
  }

  iniciar();
})();
