/* Guardado compartido con una planilla de Google (Apps Script).
   Cada dato se guarda como una ruta ("economia/arriendo", "movs/abc123") con la hora
   en que se cambió. Al juntar lo de los dos, gana el cambio más reciente de cada ruta,
   así dos personas pueden anotar cosas distintas al mismo tiempo sin pisarse. */

(() => {
  "use strict";

  const CONF = "proyecto-alemania-conexion";
  const META = "proyecto-alemania-v1-tiempos";
  const CADA = 45000;

  // Lo que es de cada pantalla (qué pestaña está abierta) no se comparte.
  const LOCALES = new Set(["pestana", "estacion", "duda", "tema", "escenario"]);
  // Hasta qué profundidad se separa cada dato. Más profundo = menos choques.
  const PROF = { economia: 2, respuestas: 3, marcas: 2, movs: 2, contacto: 2, colchonSueldos: 2 };

  const esObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio */ } };

  function aplanar(estado) {
    const out = {};
    for (const [k, v] of Object.entries(estado)) {
      if (LOCALES.has(k) || v === undefined) continue;
      const prof = PROF[k] || 1;
      const rec = (val, ruta, d) => {
        if (d < prof && esObj(val)) {
          for (const [k2, v2] of Object.entries(val)) rec(v2, ruta + "/" + k2, d + 1);
          return;
        }
        out[ruta] = val === undefined ? null : val;
      };
      rec(v, k, 1);
    }
    return out;
  }

  function desaplanar(plano) {
    const out = {};
    for (const [ruta, v] of Object.entries(plano)) {
      if (v === null || v === undefined) continue;
      const partes = ruta.split("/");
      let nodo = out;
      partes.forEach((p, i) => {
        if (i === partes.length - 1) nodo[p] = v;
        else nodo = (esObj(nodo[p]) ? nodo[p] : (nodo[p] = {}));
      });
    }
    return out;
  }

  const serializar = (plano) => {
    const s = {};
    for (const p in plano) s[p] = JSON.stringify(plano[p]);
    return s;
  };

  let api = null;
  let conf = leer(CONF);
  const meta = leer(META) || { tiempos: {}, pendientes: [], rev: 0, ultima: 0, planilla: null };
  const pendientes = new Set(meta.pendientes || []);
  let ultimo = null;
  let ocupado = false;
  let otraVez = false;
  let reloj = null;
  let intervalo = null;
  let estadoActual = { tipo: "local" };

  function guardarMeta() {
    meta.pendientes = [...pendientes];
    escribir(META, meta);
  }

  function avisar(tipo, detalle) {
    estadoActual = { tipo, detalle, ultima: meta.ultima, planilla: meta.planilla, conectado: Boolean(conf) };
    if (api && api.alCambiar) api.alCambiar(estadoActual);
  }

  /* Compara el estado con la última foto y anota la hora de lo que cambió. */
  function registrar() {
    if (!api) return;
    const ser = serializar(aplanar(api.obtener()));
    if (ultimo) {
      const ahora = Date.now();
      for (const p in ser) if (ser[p] !== ultimo[p]) { meta.tiempos[p] = ahora; pendientes.add(p); }
      for (const p in ultimo) if (!(p in ser)) { meta.tiempos[p] = ahora; pendientes.add(p); }
    }
    ultimo = ser;
    guardarMeta();
  }

  async function llamar(cuerpo) {
    const opciones = cuerpo
      ? { method: "POST", body: JSON.stringify(Object.assign({ clave: conf.clave }, cuerpo)), redirect: "follow" }
      : { method: "GET", redirect: "follow" };
    const url = cuerpo ? conf.url : `${conf.url}${conf.url.includes("?") ? "&" : "?"}clave=${encodeURIComponent(conf.clave)}&t=${Date.now()}`;
    const r = await fetch(url, opciones);
    if (!r.ok) throw new Error("red");
    let datos;
    try { datos = await r.json(); } catch { throw new Error("respuesta"); }
    if (datos.error) throw new Error(datos.error);
    return datos;
  }

  const escribiendo = () => {
    const a = document.activeElement;
    return a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && a.type !== "checkbox" && a.type !== "range"));
  };

  async function sincronizar() {
    if (!conf || !api) return;
    if (ocupado) { otraVez = true; return; }
    ocupado = true;
    avisar("sincronizando");
    try {
      registrar();
      const plano = aplanar(api.obtener());
      const cambios = {};
      const enviados = {};
      for (const p of pendientes) {
        cambios[p] = [p in plano ? plano[p] : null, meta.tiempos[p] || 0];
        enviados[p] = meta.tiempos[p] || 0;
      }
      const datos = await llamar(Object.keys(cambios).length ? { cambios } : null);

      // Lo enviado ya está guardado allá, salvo que lo hayan vuelto a cambiar mientras tanto.
      for (const p in enviados) if ((meta.tiempos[p] || 0) === enviados[p]) pendientes.delete(p);

      registrar();
      const local = aplanar(api.obtener());
      const nuevo = {};
      for (const [p, [v]] of Object.entries(datos.mapa || {})) nuevo[p] = v;
      for (const p of pendientes) nuevo[p] = p in local ? local[p] : null;

      const a = serializar(local), b = serializar(nuevo);
      const distinto = Object.keys(a).some((p) => a[p] !== (b[p] ?? "null")) ||
        Object.keys(b).some((p) => b[p] !== "null" && a[p] !== b[p]);

      if (distinto && escribiendo()) {
        otraVez = true; // se aplica cuando termine de escribir
      } else {
        if (distinto) api.aplicar(desaplanar(nuevo));
        for (const [p, [, t]] of Object.entries(datos.mapa || {})) if (!pendientes.has(p)) meta.tiempos[p] = t;
        ultimo = serializar(aplanar(api.obtener()));
      }
      meta.rev = datos.rev;
      meta.ultima = Date.now();
      if (datos.planilla) meta.planilla = datos.planilla;
      guardarMeta();
      avisar("ok");
    } catch (err) {
      const m = String(err.message || err);
      if (m === "clave") avisar("error", "La clave no coincide con la del código de la planilla.");
      else if (m === "falta-clave") avisar("error", "En el código de la planilla falta cambiar «cambien-esta-clave» por su clave.");
      else if (!navigator.onLine) avisar("sinred", "Sin internet. Lo que anoten se guarda aquí y se envía al volver la señal.");
      else avisar("error", "No se pudo conectar con la planilla. Revisen la dirección y que el acceso sea «Cualquier persona».");
    } finally {
      ocupado = false;
      if (otraVez) { otraVez = false; programar(1500); }
    }
  }

  function programar(ms) {
    clearTimeout(reloj);
    reloj = setTimeout(sincronizar, ms);
  }

  function arrancarIntervalo() {
    clearInterval(intervalo);
    if (!conf) return;
    intervalo = setInterval(() => { if (document.visibilityState === "visible") sincronizar(); }, CADA);
  }

  window.Sincro = {
    iniciar(opciones) {
      api = opciones;
      ultimo = serializar(aplanar(api.obtener()));
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && conf) sincronizar(); });
      window.addEventListener("online", () => { if (conf) sincronizar(); });
      document.addEventListener("focusout", () => { if (conf && otraVez) programar(800); });
      if (conf) { avisar("sincronizando"); sincronizar(); arrancarIntervalo(); }
      else avisar("local");
    },
    cambio() {
      registrar();
      if (conf) { avisar("pendiente"); programar(1200); }
    },
    async conectar(url, clave) {
      url = String(url || "").trim();
      clave = String(clave || "").trim();
      if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) throw new Error("La dirección debe ser la de la aplicación web de Google (empieza con https://script.google.com/).");
      if (!clave) throw new Error("Falta la clave.");
      const previa = conf;
      conf = { url, clave };
      try {
        await llamar(null); // prueba la conexión antes de guardar
      } catch (err) {
        conf = previa;
        const m = String(err.message || err);
        if (m === "clave") throw new Error("La clave no coincide con la que pusieron en el código.");
        if (m === "falta-clave") throw new Error("En el código falta cambiar «cambien-esta-clave» por su clave, guardar e implementar una nueva versión.");
        throw new Error("No respondió. Revisen que copiaron la dirección completa (termina en /exec) y que el acceso sea «Cualquier persona».");
      }
      escribir(CONF, conf);
      // Primera vez en este dispositivo: se ofrece todo lo que hay aquí.
      // Lo que nunca se tocó lleva hora 0, así no le gana a lo que ya está en la planilla.
      const plano = aplanar(api.obtener());
      for (const p in plano) { pendientes.add(p); if (!meta.tiempos[p]) meta.tiempos[p] = 0; }
      guardarMeta();
      await sincronizar();
      arrancarIntervalo();
    },
    desconectar() {
      conf = null;
      clearInterval(intervalo);
      try { localStorage.removeItem(CONF); } catch { /* nada */ }
      avisar("local");
    },
    ahora: () => sincronizar(),
    estado: () => estadoActual,
    conexion: () => (conf ? { url: conf.url, clave: conf.clave } : null)
  };
})();
