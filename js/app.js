/* Proyecto Alemania: plan, presupuesto y dudas.
   Los datos viven en /data/*.json; este archivo solo los muestra y calcula. */

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

  const pesos = (n) => "$" + Math.round(n).toLocaleString("es-CL");
  const euros = (n) => "€" + Math.round(n).toLocaleString("es-CL");
  const millones = (n) => "$" + (n / 1e6).toLocaleString("es-CL", { maximumFractionDigits: 1 }) + " millones";
  const soloDigitos = (s) => Number(String(s).replace(/[^\d]/g, "")) || 0;
  const mesAnio = (d) => `${MESES[d.getMonth()]} ${d.getFullYear()}`;

  function sumarMeses(fecha, meses) {
    const enteros = Math.trunc(meses);
    const d = new Date(fecha.getFullYear(), fecha.getMonth() + enteros, fecha.getDate());
    const resto = meses - enteros;
    if (resto) d.setTime(d.getTime() + resto * MES_DIAS * DIA);
    return d;
  }
  const mesesEntre = (a, b) => (b - a) / (MES_DIAS * DIA);

  /* ---------- Estado guardado en este dispositivo ---------- */
  function leerEstado() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { return {}; }
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin almacenamiento: seguimos en memoria */ }
  }

  let plan, ciudades, dudas, prep;
  const hoy = new Date();
  const estado = Object.assign({
    viaje: null,
    colchon: "recomendado",
    ahorro: [0, 0],
    ingreso: 0,
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
    marcas: {}
  }, leerEstado());

  const fechaViaje = () => new Date(estado.viaje.y, estado.viaje.m, 1);

  /* ---------- Cálculo del dinero ---------- */
  function calcular() {
    const e = plan.embajada, c = plan.costos;
    const tc = estado.tc;
    const V = fechaViaje();
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
    const mesesF = mesesEntre(hoy, F);
    const mesesD2 = mesesEntre(hoy, D2);
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
      V, F, D2, visa, pasaje, gastoPersona, gastoTotal, pruebaEur, congelado, colchonPersona, meta,
      actual, mesesF, mesesD2, porPersona, mensual, fondosListos,
      mesesViaje: mesesEntre(hoy, V)
    };
  }

  /* ---------- Inicio: la frase con la fecha ---------- */
  function montarFecha() {
    const mes = $("#mes"), anio = $("#anio");
    MESES.forEach((m, i) => mes.append(el("option", { value: i }, m)));
    for (let y = hoy.getFullYear(); y <= hoy.getFullYear() + 5; y++) anio.append(el("option", { value: y }, y));
    if (!estado.viaje) {
      const d = sumarMeses(new Date(hoy.getFullYear(), hoy.getMonth(), 1), 12);
      estado.viaje = { m: d.getMonth(), y: d.getFullYear() };
    }
    mes.value = estado.viaje.m; anio.value = estado.viaje.y;
    const cambio = () => {
      estado.viaje = { m: Number(mes.value), y: Number(anio.value) };
      guardar(); todo();
    };
    mes.addEventListener("change", cambio);
    anio.addEventListener("change", cambio);
  }

  function pintarFrase(r) {
    const nodo = $("#frase-resultado");
    const meses = Math.round(r.mesesViaje);
    if (r.mesesViaje < 1) {
      nodo.innerHTML = "Esa fecha ya pasó o es muy pronto. Elijan un mes con al menos 7 meses de margen.";
      return;
    }
    let texto = `Faltan <strong>${meses} ${meses === 1 ? "mes" : "meses"}</strong>. `;
    if (!isFinite(r.mensual)) {
      texto += "Con esta fecha no alcanzan los 90 días de fondos congelados antes de la cita. Prueben con un mes más adelante.";
    } else if (r.mensual === 0) {
      texto += "Con lo que ya tienen ahorrado, la plata está lista. Solo falta recorrer la ruta.";
    } else {
      texto += `Ahorrando <strong>${pesos(r.mensual)} al mes entre los dos</strong> llegan con todo pagado y el colchón completo.`;
      if (!r.fondosListos) texto += ` En ${mesAnio(r.F)} cada uno debe tener sus fondos de solvencia en la cuenta.`;
    }
    nodo.innerHTML = texto;
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
    pintarMini();
    const ol = $("#linea");
    ol.innerHTML = "";
    plan.ruta.forEach((est) => {
      const f = fechaEstacion(est);
      const li = el("li", {
        class: ["parada", est.id === estado.estacion && "actual", estacionLista(est) && "lista", f.pasada && "pasada"].filter(Boolean).join(" ")
      });
      const b = el("button", { type: "button", "aria-current": est.id === estado.estacion ? "step" : false },
        `<span class="punto">${CHECK}</span><span><span class="parada-nombre">${est.nombre}</span><span class="parada-fecha">${f.texto}</span></span>`);
      b.addEventListener("click", () => { estado.estacion = est.id; guardar(); pintarLinea(); pintarEstacion(); });
      li.append(b);
      ol.append(li);
    });
  }

  function pintarMini() {
    const cont = $("#mini-paradas");
    cont.innerHTML = "";
    plan.ruta.forEach((est) => {
      const lista = estacionLista(est);
      const b = el("button", {
        type: "button", class: "mini-parada" + (lista ? " lista" : ""),
        title: est.nombre, "aria-label": `${est.nombre}${lista ? " (lista)" : ""}`
      });
      b.addEventListener("click", () => {
        estado.estacion = est.id; guardar(); pintarLinea(); pintarEstacion();
        $("#ruta").scrollIntoView();
      });
      cont.append(b);
    });
    $("#mini-fin").textContent = `Alemania, ${mesAnio(fechaViaje())}`;
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
      el("p", { class: "estacion-detalle" }, est.detalle)
    );
    const tareas = el("div", { class: "tareas" });
    est.tareas.forEach((t) => {
      const fila = el("div", { class: "tarea" + (tareaHecha(est, t) ? " hecha" : "") });
      fila.append(el("span", { class: "tarea-texto" }, t.texto));
      const marcas = el("div", { class: "marcas" });
      const quienes = t.juntos ? [["j", "Listo"]] : plan.personas.map((p, idx) => [idx, p]);
      quienes.forEach(([idx, nombre]) => {
        const k = claveMarca(est.id, t.id, idx);
        const b = el("button", { type: "button", class: "marca-persona", "aria-pressed": String(marcado(k)) }, nombre);
        b.setAttribute("aria-label", `${t.texto}: ${t.juntos ? "listo" : nombre}`);
        b.addEventListener("click", () => { alternar(k); pintarLinea(); pintarEstacion(); });
        marcas.append(b);
      });
      fila.append(marcas);
      tareas.append(fila);
    });
    panel.append(tareas);

    const nav = el("div", { class: "estacion-nav" });
    const ant = el("button", { type: "button", class: "boton-texto", disabled: i <= 0 }, "Etapa anterior");
    const sig = el("button", { type: "button", class: "boton-texto", disabled: i >= plan.ruta.length - 1 }, "Siguiente etapa");
    ant.addEventListener("click", () => { estado.estacion = plan.ruta[i - 1].id; guardar(); pintarLinea(); pintarEstacion(); });
    sig.addEventListener("click", () => { estado.estacion = plan.ruta[i + 1].id; guardar(); pintarLinea(); pintarEstacion(); });
    nav.append(ant, sig);
    panel.append(nav);
  }

  /* ---------- Dinero ---------- */
  function montarControles() {
    const c = plan.costos;
    estado.tc = estado.tc || plan.tipoCambio.eur;
    estado.pasaje = estado.pasaje || c.pasaje.inicial;
    estado.pasajeIda = estado.pasajeIda || c.pasajeIda.inicial;
    estado.seguro = estado.seguro || c.seguro.inicial;

    document.querySelectorAll("[data-persona]").forEach((n) => { n.textContent = plan.personas[Number(n.dataset.persona)]; });

    const seg = $("#colchones");
    plan.colchones.forEach((x) => {
      const b = el("button", { type: "button", "aria-pressed": String(x.id === estado.colchon) }, `${x.nombre}<small>${euros(x.eur)}</small>`);
      b.addEventListener("click", () => {
        estado.colchon = x.id; guardar();
        seg.querySelectorAll("button").forEach((o) => o.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        todo();
      });
      seg.append(b);
    });

    const campoPesos = (id, get, set) => {
      const inp = $(id);
      const mostrar = () => { const v = get(); inp.value = v ? v.toLocaleString("es-CL") : ""; };
      mostrar();
      inp.addEventListener("input", () => { set(soloDigitos(inp.value)); guardar(); todo(); });
      inp.addEventListener("blur", mostrar);
    };
    campoPesos("#ahorro0", () => estado.ahorro[0], (v) => { estado.ahorro[0] = v; });
    campoPesos("#ahorro1", () => estado.ahorro[1], (v) => { estado.ahorro[1] = v; });
    campoPesos("#ingreso", () => estado.ingreso, (v) => { estado.ingreso = v; });
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
    rango("#seguro", c.seguro, "seguro");

    const pp = $("#pasaporte-check");
    pp.checked = estado.pasaporte;
    pp.addEventListener("change", () => { estado.pasaporte = pp.checked; guardar(); todo(); });
  }

  function pintarDinero(r) {
    $("#colchon-texto").textContent = plan.colchones.find((x) => x.id === estado.colchon).texto;
    const caja = $("#resultado");
    const p = plan.personas;
    const imposible = !isFinite(r.mensual);

    let titular;
    if (imposible) titular = "Con esta fecha no alcanzan los plazos. Muevan el viaje unos meses más adelante.";
    else if (r.mensual === 0) titular = "Ya tienen lo necesario. Ahora a cuidar que no baje.";
    else titular = `Para viajar en ${mesAnio(r.V)} necesitan juntar ${millones(r.meta)} entre los dos.`;

    const gastoBarra = r.gastoTotal;
    const congBarra = r.congelado * 2;
    const colchonBarra = Math.max(0, r.colchonPersona * 2 - congBarra);

    const persona = (i) => r.porPersona[i] === 0 ? `${p[i]} ya tiene su parte` : `${p[i]}: ${pesos(r.porPersona[i])}`;

    let porcentaje = "";
    if (estado.ingreso > 0 && !imposible) {
      const pct = Math.round((r.mensual / estado.ingreso) * 100);
      porcentaje = `<div class="aviso">Ese ahorro es el <strong>${pct}%</strong> de lo que ganan juntos.${pct > 20 ? " Hoy les queda cerca del 20% después del arriendo y los básicos: para llegar, hay que bajar gastos, sumar ingresos o mover la fecha." : " Calza con lo que les queda después del arriendo y los básicos."}</div>`;
    }

    caja.innerHTML = `
      <h3>${titular}</h3>
      ${imposible ? "" : `
      <div class="fases">
        <div class="fase">
          <span class="fase-monto">${pesos(r.mensual)}</span>
          <p>al mes entre los dos, desde ahora hasta ${mesAnio(r.D2)}. ${persona(0)}. ${persona(1)}.</p>
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
        <span><i style="background:var(--suyo)"></i>Fondos congelados, siguen siendo suyos: ${pesos(congBarra)}</span>
        ${colchonBarra > 0 ? `<span><i style="background:var(--suyo-claro)"></i>Colchón extra, suyo: ${pesos(colchonBarra)}</span>` : ""}
      </div>
      <table class="desglose">
        <thead><tr><th>Concepto</th><th>Por persona</th><th>Los dos</th></tr></thead>
        <tbody>
          <tr class="grupo"><td colspan="3">Se gasta</td></tr>
          <tr><td>Arancel de visa (€${plan.embajada.arancel})</td><td>${pesos(r.visa)}</td><td>${pesos(r.visa * 2)}</td></tr>
          <tr><td>Seguro 12 meses</td><td>${pesos(estado.seguro)}</td><td>${pesos(estado.seguro * 2)}</td></tr>
          <tr><td>${estado.soloIda ? "Pasaje solo de ida" : "Pasaje ida y vuelta"}</td><td>${pesos(r.pasaje)}</td><td>${pesos(r.pasaje * 2)}</td></tr>
          <tr><td>Fotos, copias y traducciones</td><td>${pesos(plan.costos.documentos)}</td><td>${pesos(plan.costos.documentos * 2)}</td></tr>
          ${estado.pasaporte ? `<tr><td>Pasaporte (solo uno)</td><td>—</td><td>${pesos(plan.costos.pasaporte)}</td></tr>` : ""}
          <tr class="grupo"><td colspan="3">Sigue siendo suyo</td></tr>
          <tr><td>Solvencia sin reserva de alojamiento${estado.soloIda ? " y sin pasaje de vuelta" : ""} (€${r.pruebaEur.toLocaleString("es-CL")} + 10% por el euro)</td><td>${pesos(r.congelado)}</td><td>${pesos(r.congelado * 2)}</td></tr>
          ${r.colchonPersona > r.congelado ? `<tr><td>Resto del colchón</td><td>${pesos(r.colchonPersona - r.congelado)}</td><td>${pesos((r.colchonPersona - r.congelado) * 2)}</td></tr>` : ""}
          <tr class="total"><td>Meta total</td><td>${pesos(r.meta / 2)}</td><td>${pesos(r.meta)}</td></tr>
          ${r.actual > 0 ? `<tr><td>Ya ahorrado</td><td></td><td>${pesos(r.actual)}</td></tr><tr class="total"><td>Falta</td><td></td><td>${pesos(Math.max(0, r.meta - r.actual))}</td></tr>` : ""}
        </tbody>
      </table>`;
  }

  /* ---------- Carpeta ---------- */
  function pintarCarpeta() {
    const grid = $("#carpeta-grid");
    grid.innerHTML = "";
    plan.carpeta.forEach((d) => {
      const completo = plan.personas.every((_, i) => marcado(claveMarca("doc", d.id, i)));
      const card = el("div", { class: "doc" + (completo ? " completo" : "") });
      const det = el("details", {});
      det.innerHTML = `<summary><span class="doc-nombre">${d.nombre}</span><span class="doc-corto">${d.corto}</span></summary><p class="doc-detalle">${d.detalle}</p>`;
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
      const b = el("button", { type: "button", role: "tab", id: "tab-" + c.id, "aria-selected": String(c.id === estado.ciudad) }, c.nombre);
      b.addEventListener("click", () => {
        estado.ciudad = c.id; guardar();
        sel.querySelectorAll("button").forEach((o) => o.setAttribute("aria-selected", String(o === b)));
        pintarCiudad();
      });
      sel.append(b);
    });
    const ing = $("#ingreso-escenario");
    ciudades.ingresos.forEach((x) => ing.append(el("option", { value: x.id }, `${x.nombre} (≈ ${euros(x.eur)} líquidos)`)));
    ing.value = estado.ingresoEscenario;
    ing.addEventListener("change", () => { estado.ingresoEscenario = ing.value; guardar(); pintarCiudad(); });
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

    // Tramos de gasto, cortando en la marca del sueldo si se pasan
    let acumulado = 0;
    const segmentos = TRAMOS.map(([k, nombre]) => {
      const v = g[k];
      acumulado += v;
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

  /* ---------- Prepararse ---------- */
  const escapar = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
      estado.pestana = id; guardar();
      tabs.forEach((t) => {
        const on = t.id === "tab-" + id;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        $("#" + t.getAttribute("aria-controls")).hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => elegir(t.id.replace("tab-", "")));
      t.addEventListener("keydown", (e) => {
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
    dudas.temas.forEach((t) => {
      const b = el("button", { type: "button", "data-tema": t.id, "aria-pressed": String(estado.tema === t.id) }, t.nombre);
      b.addEventListener("click", () => elegirTema(t.id));
      temas.append(b);
    });
    $("#buscar").addEventListener("input", pintarPreguntas);
    if (!estado.duda) estado.duda = dudas.dudas[0].id;
  }

  function elegirTema(id) {
    estado.tema = id; guardar();
    document.querySelectorAll("#temas button").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.tema || null) === id)));
    pintarPreguntas();
  }

  function pintarPreguntas() {
    const q = normal($("#buscar").value.trim());
    const cont = $("#preguntas");
    cont.innerHTML = "";
    const visibles = dudas.dudas.filter((d) =>
      (!estado.tema || d.tema === estado.tema) &&
      (!q || normal(d.pregunta + " " + d.respuesta.replace(/<[^>]+>/g, " ")).includes(q)));
    if (!visibles.length) {
      cont.append(el("p", { class: "vacio" }, "No hay una respuesta con esa palabra todavía. Prueben con otra, o agréguenla en data/dudas.json."));
    }
    visibles.forEach((d) => {
      const b = el("button", { type: "button", class: "pregunta", "aria-pressed": String(d.id === estado.duda) }, d.pregunta);
      b.addEventListener("click", () => {
        estado.duda = d.id; guardar();
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
    const tema = dudas.temas.find((t) => t.id === d.tema);
    $("#respuesta").innerHTML = `<p class="respuesta-tema">${tema ? tema.nombre : ""}</p><h3>${d.pregunta}</h3><div class="respuesta-cuerpo">${d.respuesta}</div>`;
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
    pintarFrase(r);
    pintarLinea();
    pintarEstacion();
    pintarDinero(r);
    if (ciudades) pintarCiudad();
  }

  async function iniciar() {
    try {
      const cargar = (u) => fetch(u, { cache: "no-cache" }).then((x) => { if (!x.ok) throw new Error(u); return x.json(); });
      [plan, ciudades, dudas, prep] = await Promise.all([cargar("data/plan.json"), cargar("data/ciudades.json"), cargar("data/dudas.json"), cargar("data/preparacion.json")]);
    } catch (err) {
      $("#frase-resultado").textContent = "No se pudieron cargar los datos. Si abriste el archivo directo desde la carpeta, usa la página publicada o un servidor local (ver README).";
      return;
    }
    montarFecha();
    montarControles();
    montarCiudades();
    montarDudas();
    pintarCarpeta();
    montarPreparacion();
    pintarPreguntas();
    pintarPie();
    todo();
  }

  iniciar();
})();
