// ============================================
// Mis Gastos - App.js v2
// Todo se guarda en tu dispositivo (localStorage)
// La IA es offline, no manda datos a ningún lado
// ============================================

let gastos = JSON.parse(localStorage.getItem('misGastos_v2')) || [];

// Si es la primera vez, cargar los ejemplos de datos.json
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

// ---------- CALENDARIO REAL DE CUOTAS ----------

function calcularCalendario() {
  const mapa = {}; // "2026-12" -> monto a pagar ese mes

  gastos.forEach(g => {
    const [y, m] = g.fechaInicio.split('-').map(Number);
    const valorCuota = g.montoTotal / g.cuotas;

    for (let i = 0; i < g.cuotas; i++) {
      let mes = m + i;
      let anio = y + Math.floor((mes - 1) / 12);
      mes = ((mes - 1) % 12) + 1;
      const clave = `${anio}-${String(mes).padStart(2, '0')}`;
      mapa[clave] = (mapa[clave] || 0) + valorCuota;
    }
  });

  return mapa;
}

// ---------- MOSTRAR EN PANTALLA ----------

function mostrar() {
  const lista = document.getElementById('lista');
  if (!lista) return;

  lista.innerHTML = '';

  if (gastos.length === 0) {
    lista.innerHTML = '<p style="text-align:center;color:#666">Todavía no hay gastos. Agregá el primero arriba 👆</p>';
  }

  gastos.forEach(g => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div>
        <b>${g.descripcion}</b><br>
        <small style="color:#666">${g.tarjeta} • ${g.categoria} • ${g.cuotas} cuota/s de ${formato(g.montoTotal / g.cuotas)} • desde ${g.fechaInicio}</small>
      </div>
      <div style="text-align:right; min-width:90px;">
        <b>${formato(g.montoTotal)}</b><br>
        <span style="color:red; cursor:pointer; font-size:14px;" onclick="eliminar(${g.id})">Eliminar</span>
      </div>
    `;
    lista.appendChild(div);
  });

  // Mostrar calendario
  const cal = calcularCalendario();
  const calDiv = document.getElementById('calendario');
  if (calDiv) {
    calDiv.innerHTML = '';
    const nombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    if (Object.keys(cal).length === 0) {
      calDiv.innerHTML = '<p style="color:#666">Sin cuotas todavía.</p>';
    }

    Object.keys(cal).sort().forEach(k => {
      const [anio, mes] = k.split('-');
      calDiv.innerHTML += `<div class="mes"><span>${nombres[parseInt(mes) - 1]} ${anio}</span><b>${formato(cal[k])}</b></div>`;
    });
  }
}

// ---------- IA ORGANIZADORA OFFLINE ----------
// Solo reglas locales, NO manda tus datos a internet

function organizadorIA() {
  const box = document.getElementById('iaBox');
  if (!box) return;

  if (!gastos.length) {
    box.innerHTML = 'Todavía no hay gastos para analizar.';
    return;
  }

  let sugerencias = [];

  // 1. Gastos repetidos
  const descripciones = gastos.map(g => g.descripcion.toLowerCase().trim());
  const repetidos = descripciones.filter((v, i) => descripciones.indexOf(v) !== i);
  if (repetidos.length) {
    sugerencias.push(`🔁 Tenés gastos repetidos: <b>${[...new Set(repetidos)].join(', ')}</b>. ¿Querés agruparlos como gasto fijo?`);
  }

  // 2. Categoría que más gasta
  const porCat = {};
  gastos.forEach(g => porCat[g.categoria] = (porCat[g.categoria] || 0) + g.montoTotal);
  const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];
  sugerencias.push(`📊 Tu mayor gasto es <b>${topCat[0]}</b>: ${formato(topCat[1])}.`);

  // 3. Cuotas largas
  const largas = gastos.filter(g => g.cuotas >= 12);
  if (largas.length) {
    sugerencias.push(`⚠️ Tenés <b>${largas.length}</b> compra/s en 12+ cuotas. Eso te ata por muchos meses.`);
  }

  // 4. Mes más pesado
  const cal = calcularCalendario();
  const mesPesado = Object.entries(cal).sort((a, b) => b[1] - a[1])[0];
  if (mesPesado) {
    sugerencias.push(`📅 Tu mes más pesado será <b>${mesPesado[0]}</b> con <b>${formato(mesPesado[1])}</b> en cuotas.`);
  }

  // 5. Total
  const total = gastos.reduce((acc, g) => acc + g.montoTotal, 0);
  sugerencias.push(`💰 Total en gastos cargados: <b>${formato(total)}</b>.`);

  // 6. Tip
  sugerencias.push(`💡 Tip: Pagá primero la tarjeta con la cuota más alta para liberar cupo.`);

  box.innerHTML = sugerencias.map(s => `<div class="sugerencia">${s}</div>`).join('');
}

// ---------- EXPORTAR A EXCEL (CSV) ----------

function exportarExcel() {
  if (!gastos.length) return alert('No hay gastos para exportar');

  const cal = calcularCalendario();
  let csv = "Descripcion;Monto Total;Tarjeta;Categoria;Cuotas;Valor Cuota;Fecha Inicio\n";

  gastos.forEach(g => {
    csv += `${g.descripcion};${g.montoTotal};${g.tarjeta};${g.categoria};${g.cuotas};${(g.montoTotal / g.cuotas).toFixed(0)};${g.fechaInicio}\n`;
  });

  csv += "\nCALENDARIO DE CUOTAS\nMes;Monto a pagar\n";
  Object.keys(cal).sort().forEach(k => {
    csv += `${k};${cal[k].toFixed(0)}\n`;
  });

  const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mis-gastos.csv';
  a.click();
}

// ---------- BACKUP JSON ----------

function exportarBackup() {
  const blob = new Blob([JSON.stringify({ version: 2, gastos }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup-gastos.json';
  a.click();
}
