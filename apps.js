// ============================================
// Mis Gastos - App.js v3 COMPLETO
// Guardado local + Cuotas restantes mes a mes
// IA offline - No manda datos a ningún lado
// ============================================

let gastos = JSON.parse(localStorage.getItem('misGastos_v2')) || [];

// Si es la primera vez, cargar ejemplos de datos.json
if (gastos.length === 0) {
  fetch('datos.json')
    .then(r => r.json())
    .then(data => {
      gastos = data.gastos || [];
      guardar();
      organizadorIA();
    })
    .catch(() => {
      mostrar();
      organizadorIA();
    });
} else {
  mostrar();
  organizadorIA();
}

// ---------- UTILIDADES ----------

function formato(n) {
  return "$" + Number(n).toLocaleString('es-AR');
}

function guardar() {
  localStorage.setItem('misGastos_v2', JSON.stringify(gastos));
  mostrar();
}

// ---------- AGREGAR / ELIMINAR ----------

function agregarGasto() {
  const descripcion = document.getElementById('descripcion').value.trim();
  const monto = parseFloat(document.getElementById('monto').value);
  const tarjeta = document.getElementById('tarjeta').value;
  const categoria = document.getElementById('categoria').value;
  const cuotas = parseInt(document.getElementById('cuotas').value) || 1;
  const fecha = document.getElementById('fecha').value || new Date().toISOString().slice(0, 10);

  if (!descripcion || !monto) {
    alert('Completá descripción y monto');
    return;
  }

  gastos.push({
    id: Date.now(),
    descripcion,
    montoTotal: monto,
    tarjeta,
    categoria,
    cuotas,
    fechaInicio: fecha
  });

  // Limpiar formulario
  document.getElementById('descripcion').value = '';
  document.getElementById('monto').value = '';
  document.getElementById('cuotas').value = '1';

  guardar();
  organizadorIA();
  alert('✅ Gasto agregado');
}

function eliminar(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  gastos = gastos.filter(g => g.id !== id);
  guardar();
  organizadorIA();
}

// ---------- CUOTAS RESTANTES MES A MES ----------

function detalleCuotas(g) {
  const hoy = new Date();
  const mesActual = hoy.getFullYear() * 12 + hoy.getMonth();
  const [y, m] = g.fechaInicio.split('-').map(Number);
  const valorCuota = g.montoTotal / g.cuotas;
  const lista = [];
  let pagadas = 0;
  let restantes = 0;
  let faltaPagar = 0;

  for (let i = 0; i < g.cuotas; i++) {
    let mesNum = (m - 1) + i;
    let anio = y + Math.floor(mesNum / 12);
    let mes = (mesNum % 12) + 1;
    let claveMes = anio * 12 + (mes - 1);
    let estado = 'pendiente';

    if (claveMes < mesActual) {
      estado = 'pagada';
      pagadas++;
    } else if (claveMes === mesActual) {
      estado = 'este-mes';
      restantes++;
      faltaPagar += valorCuota;
    } else {
      estado = 'pendiente';
      restantes++;
      faltaPagar += valorCuota;
    }

    const nombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    lista.push({
      numero: i + 1,
      etiqueta: `${nombres[mes - 1]} ${anio}`,
      monto: valorCuota,
      estado
    });
  }

  return { lista, pagadas, restantes, faltaPagar, cuotaActual: pagadas + 1 };
}

function calcularCalendario() {
  const mapa = {};
  gastos.forEach(g => {
    const det = detalleCuotas(g);
    det.lista.forEach(c => {
      mapa[c.etiqueta] = (mapa[c.etiqueta] || 0) + c.monto;
    });
  });
  return mapa;
}

// ---------- MOSTRAR EN PANTALLA ----------

function mostrar() {
  const lista = document.getElementById('lista');
  if (!lista) return;

  lista.innerHTML = '';

  if (gastos.length === 0) {
    lista.innerHTML = '<p style="text-align:center;color:#666">Todavía no hay gastos. Agregá el primero 👆</p>';
  }

  gastos.forEach(g => {
    const det = detalleCuotas(g);
    const valorCuota = g.montoTotal / g.cuotas;
    const progreso = Math.round((det.pagadas / g.cuotas) * 100);

    const div = document.createElement('div');
    div.className = 'item';
    div.style.display = 'block';
    div.style.padding = '14px 0';

    let htmlCuotas = '';
    if (g.tarjeta === 'Efectivo / Débito' || g.cuotas === 1) {
      htmlCuotas = `<div style="font-size:13px;color:#666;margin-top:6px;">Pago único • ${formato(g.montoTotal)}</div>`;
    } else {
      htmlCuotas = `
        <div style="margin:10px 0;">
          <div style="display:flex;justify-content:space-between;font-size:14px;gap:8px;">
            <span><b>Cuota ${Math.min(det.cuotaActual, g.cuotas)} de ${g.cuotas}</b> • Te quedan <b>${det.restantes}</b></span>
            <span><b>Falta: ${formato(det.faltaPagar)}</b></span>
          </div>
          <div style="background:#e5e7eb;height:8px;border-radius:99px;margin:8px 0;overflow:hidden;">
            <div style="background:#4f46e5;height:100%;width:${progreso}%"></div>
          </div>
          <div style="font-size:13px;color:#666">${det.pagadas} pagadas • ${progreso}% completado</div>
        </div>
        <details style="margin-top:8px;">
          <summary style="cursor:pointer;font-size:14px;color:#4f46e5;font-weight:600;">Ver cuotas mes a mes 👇</summary>
          <div style="margin-top:8px;">
            ${det.lista.map(c => {
              let color = '#666'; let etiqueta = '⏳ Pendiente';
              if (c.estado === 'pagada') { color = '#16a34a'; etiqueta = '✅ Pagada'; }
              if (c.estado === 'este-mes') { color = '#d97706'; etiqueta = '👉 Este mes'; }
              return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px;"><span>Cuota ${c.numero} • ${c.etiqueta}</span><span style="color:${color}"><b>${formato(c.monto)}</b> ${etiqueta}</span></div>`;
            }).join('')}
          </div>
        </details>
      `;
    }

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;">
        <div><b>${g.descripcion}</b><br><small style="color:#666">${g.tarjeta} • ${g.categoria} • ${g.cuotas} x ${formato(valorCuota)} • desde ${g.fechaInicio}</small></div>
        <div style="text-align:right;min-width:90px;"><b>${formato(g.montoTotal)}</b><br><span style="color:red;cursor:pointer;font-size:14px;" onclick="eliminar(${g.id})">Eliminar</span></div>
      </div>
      ${htmlCuotas}
    `;
    lista.appendChild(div);
  });

  // Calendario general
  const cal = calcularCalendario();
  const calDiv = document.getElementById('calendario');
  if (calDiv) {
    calDiv.innerHTML = '';
    if (Object.keys(cal).length === 0) {
      calDiv.innerHTML = '<p style="color:#666">Sin cuotas todavía.</p>';
    }
    Object.keys(cal).forEach(k => {
      calDiv.innerHTML += `<div class="mes"><span>${k}</span><b>${formato(cal[k])}</b></div>`;
    });
  }
}

// ---------- IA ORGANIZADORA OFFLINE ----------

function organizadorIA() {
  const box = document.getElementById('iaBox');
  if (!box) return;

  if (!gastos.length) {
    box.innerHTML = 'Todavía no hay gastos para analizar.';
    return;
  }

  let sugerencias = [];

  // Gastos repetidos
  const descripciones = gastos.map(g => g.descripcion.toLowerCase().trim());
  const repetidos = descripciones.filter((v, i) => descripciones.indexOf(v) !== i);
  if (repetidos.length) {
    sugerencias.push(`🔁 Tenés gastos repetidos: <b>${[...new Set(repetidos)].join(', ')}</b>.`);
  }

  // Categoría que más gasta
  const porCat = {};
  gastos.forEach(g => porCat[g.categoria] = (porCat[g.categoria] || 0) + g.montoTotal);
  const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];
  sugerencias.push(`📊 Tu mayor gasto es <b>${topCat[0]}</b>: ${formato(topCat[1])}.`);

  // Total que falta pagar
  let faltaTotal = 0;
  let restantesTotal = 0;
  gastos.forEach(g => {
    const d = detalleCuotas(g);
    faltaTotal += d.faltaPagar;
    restantesTotal += d.restantes;
  });
  sugerencias.push(`💳 Te quedan <b>${restantesTotal} cuotas</b> por pagar por un total de <b>${formato(faltaTotal)}</b>.`);

  // Mes más pesado
  const cal = calcularCalendario();
  const mesPesado = Object.entries(cal).sort((a, b) => b[1] - a[1])[0];
  if (mesPesado) {
    sugerencias.push(`📅 Tu mes más pesado será <b>${mesPesado[0]}</b> con ${formato(mesPesado[1])}.`);
  }

  // Cuotas largas
  const largas = gastos.filter(g => g.cuotas >= 12);
  if (largas.length) {
    sugerencias.push(`⚠️ Tenés <b>${largas.length}</b> compra/s en 12+ cuotas.`);
  }

  sugerencias.push(`💡 Tip: Pagá primero la tarjeta con la cuota más alta para liberar cupo.`);

  box.innerHTML = sugerencias.map(s => `<div class="sugerencia">${s}</div>`).join('');
}

// ---------- EXPORTAR A EXCEL (CSV) ----------

function exportarExcel() {
  if (!gastos.length) return alert('No hay gastos para exportar');

  let csv = "Descripcion;Monto Total;Tarjeta;Categoria;Cuotas;Valor Cuota;Fecha Inicio;Cuotas Pagadas;Cuotas Restantes;Falta Pagar\n";

  gastos.forEach(g => {
    const d = detalleCuotas(g);
    csv += `${g.descripcion};${g.montoTotal};${g.tarjeta};${g.categoria};${g.cuotas};${(g.montoTotal / g.cuotas).toFixed(0)};${g.fechaInicio};${d.pagadas};${d.restantes};${d.faltaPagar.toFixed(0)}\n`;
  });

  csv += "\nDETALLE CUOTA POR CUOTA\nDescripcion;Nro Cuota;Mes;Monto;Estado\n";
  gastos.forEach(g => {
    const d = detalleCuotas(g);
    d.lista.forEach(c => {
      csv += `${g.descripcion};${c.numero};${c.etiqueta};${c.monto.toFixed(0)};${c.estado}\n`;
    });
  });

  const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mis-gastos.csv';
  a.click();
}

// ---------- BACKUP JSON ----------

function exportarBackup() {
  const blob = new Blob([JSON.stringify({ version: 3, gastos }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup-gastos.json';
  a.click();
}
