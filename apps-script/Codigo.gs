const CLAVE = 'cambien-esta-clave';

/*
  Proyecto Alemania: guardado compartido entre los dos.

  1. Cambien la clave de arriba por una frase que solo ustedes sepan (déjenla entre comillas).
  2. Guarden y vayan a Implementar → Nueva implementación → Aplicación web.
     Ejecutar como: Yo. Quién tiene acceso: Cualquier persona.
  3. Copien la dirección que termina en /exec y péguenla en la página, en «Guardar entre los dos».

  La hoja «Ahorros» se actualiza sola con lo que anoten en el colchón.
  La hoja «datos» es la que usa la página: no la editen a mano.
*/

const TROZO = 40000;

function doGet(e) {
  return responder_(function () {
    verificar_(e && e.parameter ? e.parameter.clave : '');
    return leer_();
  });
}

function doPost(e) {
  return responder_(function () {
    const cuerpo = JSON.parse(e.postData.contents);
    verificar_(cuerpo.clave);
    const candado = LockService.getScriptLock();
    candado.waitLock(20000);
    try {
      const datos = leer_();
      const cambios = cuerpo.cambios || {};
      let cambio = false;
      Object.keys(cambios).forEach(function (ruta) {
        const nuevo = cambios[ruta];
        const actual = datos.mapa[ruta];
        if (!Array.isArray(nuevo) || nuevo.length !== 2) return;
        // Gana el cambio más reciente de cada dato.
        if (!actual || Number(nuevo[1]) > Number(actual[1])) {
          datos.mapa[ruta] = [nuevo[0], Number(nuevo[1]) || 0];
          cambio = true;
        }
      });
      if (cambio) {
        datos.rev += 1;
        escribir_(datos);
        hojaAhorros_(datos.mapa);
      }
      return datos;
    } finally {
      candado.releaseLock();
    }
  });
}

function responder_(fn) {
  let salida;
  try {
    const datos = fn();
    salida = { rev: datos.rev, mapa: datos.mapa, planilla: SpreadsheetApp.getActive().getUrl() };
  } catch (err) {
    salida = { error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(salida)).setMimeType(ContentService.MimeType.JSON);
}

function verificar_(clave) {
  if (CLAVE === 'cambien-esta-clave') throw new Error('falta-clave');
  if (String(clave || '') !== CLAVE) throw new Error('clave');
}

function hoja_(nombre) {
  const libro = SpreadsheetApp.getActive();
  let hoja = libro.getSheetByName(nombre);
  if (!hoja) {
    hoja = libro.insertSheet(nombre);
    if (nombre === 'datos') hoja.hideSheet();
  }
  return hoja;
}

function leer_() {
  const hoja = hoja_('datos');
  const filas = hoja.getLastRow();
  if (filas < 1) return { rev: 0, mapa: {} };
  const valores = hoja.getRange(1, 1, filas, 1).getValues();
  const rev = Number(valores[0][0]) || 0;
  const texto = valores.slice(1).map(function (f) { return String(f[0]); }).join('');
  return { rev: rev, mapa: texto ? JSON.parse(texto) : {} };
}

function escribir_(datos) {
  const hoja = hoja_('datos');
  const texto = JSON.stringify(datos.mapa);
  const filas = [[String(datos.rev)]];
  for (let i = 0; i < texto.length; i += TROZO) filas.push([texto.slice(i, i + TROZO)]);
  hoja.clear();
  const rango = hoja.getRange(1, 1, filas.length, 1);
  rango.setNumberFormat('@');
  rango.setValues(filas);
}

function hojaAhorros_(mapa) {
  const movimientos = Object.keys(mapa)
    .filter(function (ruta) { return ruta.indexOf('movs/') === 0 && mapa[ruta][0]; })
    .map(function (ruta) { return mapa[ruta][0]; })
    .sort(function (a, b) { return String(b.f).localeCompare(String(a.f)); });

  const hoja = hoja_('Ahorros');
  hoja.clear();
  const total = movimientos.reduce(function (s, m) { return s + (Number(m.m) || 0); }, 0);
  const filas = [['Total en el colchón', '', total, ''], ['', '', '', ''], ['Fecha', 'Quién', 'Monto', 'Nota']];
  movimientos.forEach(function (m) { filas.push([m.f || '', m.q || '', Number(m.m) || 0, m.n || '']); });
  hoja.getRange(1, 1, filas.length, 4).setValues(filas);
  hoja.getRange(1, 1, 1, 4).setFontWeight('bold');
  hoja.getRange(3, 1, 1, 4).setFontWeight('bold').setBackground('#f0b323');
  hoja.getRange(1, 3, filas.length, 1).setNumberFormat('$#,##0;-$#,##0');
  hoja.setFrozenRows(3);
  hoja.autoResizeColumns(1, 4);
}
