// ============================================
// Mis Gastos - App.js v4 COMPLETO
// Gastos + Cuotas restantes + Servicios mensuales
// IA offline - No manda datos a ningún lado
// ============================================

let gastos = JSON.parse(localStorage.getItem('misGastos_v2')) || [];
let servicios = JSON.parse(localStorage.getItem('misServicios_v1')) || [];

if (gastos.length === 0 && servicios.length === 0) {
  fetch('datos.json')
    .then(r => r.json())
    .then(data => {
      gastos = data.gastos || [];
      servicios = data.servicios || [];
      guardar();
      guardarServicios();
      organizadorIA();
    })
    .catch(() => { mostrar(); mostrarServicios(); organizadorIA(); });
} else {
  mostrar();
  mostrarServicios();
  organizadorIA();
}

// ---------- UTILIDADES ----------
function formato(n) { return "$" + Number(n).toLocaleString('es-AR'); }
function guardar() { localStorage.setItem('misGastos_v2', JSON.stringify(gastos)); mostrar(); }
function guardarServicios() { localStorage.setItem('misServicios_v1', JSON.stringify(servicios)); mostrarServicios(); organizadorIA(); mostrar(); }

// ---------- GASTOS ----------
function agregarGasto() {
  const descripcion = document.getElementById('descripcion').value.trim();
  const monto = parseFloat(document.getElementById('monto').value);
  const tarjeta = document.getElementById('tarjeta').value;
  const categoria = document.getElementById('categoria').value;
  const cuotas = parseInt(document.getElementById('cuotas').value) || 1;
  const fecha = document.getElementById('fecha').value || new Date().toISOString().slice(0, 10);
  if (!descripcion || !monto) return alert('Completá descripción y monto');
  gastos.push({ id: Date.now(), descripcion, montoTotal: monto, tarjeta, categoria, cuotas, fechaInicio: fecha });
  document.getElementById('descripcion').value = '';
  document.getElementById('monto').value = '';
  document.getElementById('cuotas').value = '1';
  guardar(); organizadorIA(); alert('✅ Gasto agregado');
}
function eliminar(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  gastos = gastos.filter(g => g.id !== id);
  guardar(); organizadorIA();
}

// ---------- CUOTAS RESTANTES MES A MES ----------
function detalleCuotas(g) {
  const hoy = new Date();
  const mesActual = hoy.getFullYear() * 12 + hoy.getMonth();
  const [y, m] = g.fechaInicio.split('-').map(Number);
  const valorCuota = g.montoTotal / g.cuotas;
  const lista = [];
  let pagadas = 0, restantes = 0, faltaPagar = 0;
  const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  for (let i = 0; i < g.cuotas; i++) {
    let mesNum = (m - 1) + i;
    let anio = y + Math.floor(mesNum / 12);
    let mes = (mesNum % 12) + 1;
    let claveMes = anio * 12 + (mes - 1);
    let estado = 'pendiente';
    if (claveMes < mesActual) { estado = 'pagada'; pagadas++; }
    else if (claveMes === mesActual) { estado = 'este-mes'; restantes++; faltaPagar += valorCuota; }
    else { estado = 'pendiente'; restantes++; faltaPagar += valorCuota; }
    lista.push({ numero: i + 1, etiqueta: `${nombres[mes - 1]} ${anio}`, monto: valorCuota, estado });
  }
  return { lista, pagadas, restantes, faltaPagar, cuotaActual: pagadas + 1 };
}

function calcularCalendario() {
  const mapa = {};
  gastos.forEach(g => {
    const det = detalleCuotas(g);
    det.lista.forEach(c => { mapa[c.etiqueta] = (mapa[c.etiqueta] || 0) + c.monto; });
  });
  const hoy = new Date();
  const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const totalServ = servicios.filter(s => s.activo).reduce((a, s) => a + s.monto, 0);
  if (totalServ > 0) {
    for (let i = 0; i < 12; i++) {
      let mes = hoy.getMonth() + i;
      let anio = hoy.getFullYear() + Math.floor(mes / 12);
      mes = (mes % 12);
      const clave = `${nombres[mes]} ${anio}`;
      mapa[clave] = (mapa[clave] || 0) + totalServ;
    }
  }
  return mapa;
}

// ---------- MOSTRAR GASTOS ----------
function mostrar() {
  const lista = document.getElementById('lista');
  if (!lista) return;
  lista.innerHTML = '';
  if (gastos.length === 0) lista.innerHTML = '<p style="text-align:center;color:#666">Todavía no hay gastos. Agregá el primero 👆</p>';
  gastos.forEach(g => {
    const det = detalleCuotas(g);
    const valorCuota = g.montoTotal / g.cuotas;
    const progreso = Math.round((det.pagadas / g.cuotas) * 100);
    const div = document.createElement('div');
    div.className = 'item';
    let htmlCuotas = '';
    if (g.tarjeta === 'Efectivo / Débito' || g.cuotas === 1) {
      htmlCuotas = `<div style="font-size:13px;color:#666;margin-top:6px;">Pago único • ${formato(g.montoTotal)}</div>`;
    } else {
      htmlCuotas = `
        <div style="margin:10px 0;">
          <div style="display:flex;justify-content:space-between;font-size:14px;gap:8px;"><span><b>Cuota ${Math.min(det.cuotaActual, g.cuotas)} de ${g.cuotas}</b> • Te quedan <b>${det.restantes}</b></span><span><b>Falta: ${formato(det.faltaPagar)}</b></span></div>
          <div style="background:#e5e7eb;height:8px;border-radius:99px;margin:8px 0;overflow:hidden;"><div style="background:#4f46e5;height:100%;width:${progreso}%"></div></div>
          <div style="font-size:13px;color:#666">${det.pagadas} pagadas • ${progreso}% completado</div>
        </div>
        <details style="margin-top:8px;"><summary style="font-size:14px;color:#4f46e5;font-weight:600;">Ver cuotas mes a mes 👇</summary><div style="margin-top:8px;">
          ${det.lista.map(c => {
            let color = '#666'; let etiqueta = '⏳ Pendiente';
            if (c.estado === 'pagada') { color = '#16a34a'; etiqueta = '✅ Pagada'; }
            if (c.estado === 'este-mes') { color = '#d97706'; etiqueta = '👉 Este mes'; }
            return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px;"><span>Cuota ${c.numero} • ${c.etiqueta}</span><span style="color:${color}"><b>${formato(c.monto)}</b> ${etiqueta}</span></div>`;
          }).join('')}
        </div></details>`;
    }
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;">
        <div><b>${g.descripcion}</b><br><small style="color:#666">${g.tarjeta} • ${g.categoria} • ${g.cuotas} x ${formato(valorCuota)} • desde ${g.fechaInicio}</small></div>
        <div style="text-align:right;min-width:90px;"><b>${formato(g.montoTotal)}</b><br><span style="color:red;cursor:pointer;font-size:14px;" onclick="eliminar(${g.id})">Eliminar</span></div>
      </div>${htmlCuotas}`;
    lista.appendChild(div);
  });
  const cal = calcularCalendario();
  const calDiv = document.getElementById('calendario');
  if (calDiv) {
    calDiv.innerHTML = '';
    if (Object.keys(cal).length === 0) calDiv.innerHTML = '<p style="color:#666">Sin cuotas todavía.</p>';
    Object.keys(cal).forEach(k => { calDiv.innerHTML += `<div class="mes"><span>${k}</span><b>${formato(cal[k])}</b></div>`; });
  }
}

// ---------- SERVICIOS ----------
function agregarServicio() {
  const nombre = document.getElementById('serv-nombre').value.trim();
  const monto = parseFloat(document.getElementById('serv-monto').value);
  const dia = parseInt(document.getElementById('serv-dia').value) || 10;
  const categoria = document.getElementById('serv-categoria').value;
  if (!nombre) return alert('Completá el nombre del servicio');
  servicios.push({ id: Date.now(), nombre, monto: monto || 0, dia, categoria, activo: true });
  document.getElementById('serv-nombre').value = '';
  document.getElementById('serv-monto').value = '';
  guardarServicios(); alert('✅ Servicio agregado');
}
function eliminarServicio(id) {
  if (!confirm('¿Eliminar este servicio?')) return;
  servicios = servicios.filter(s => s.id !== id);
  guardarServicios();
}
function toggleServicio(id) {
  const s = servicios.find(x => x.id === id);
  if (s) s.activo = !s.activo;
  guardarServicios();
}
function editarMontoServicio(id) {
  const s = servicios.find(x => x.id === id);
  if (!s) return;
  const nuevo = prompt(`Nuevo monto para ${s.nombre}:`, s.monto || '');
  if (nuevo === null) return;
  const valor = parseFloat(nuevo);
  if (isNaN(valor)) return alert('Poné un número');
  s.monto = valor;
  guardarServicios();
}
function editarDiaServicio(id) {
  const s = servicios.find(x => x.id === id);
  if (!s) return;
  const nuevo = prompt(`Nuevo día de vencimiento para ${s.nombre} (1-31):`, s.dia);
  if (nuevo === null) return;
  const valor = parseInt(nuevo);
  if (isNaN(valor) || valor < 1 || valor > 31) return alert('Poné un día del 1 al 31');
  s.dia = valor;
  guardarServicios();
}
function mostrarServicios() {
  const lista = document.getElementById('listaServicios');
  const totalDiv = document.getElementById('totalServicios');
  if (!lista) return;
  lista.innerHTML = '';
  if (servicios.length === 0) {
    lista.innerHTML = '<p style="color:#666;text-align:center;">Todavía no hay servicios.</p>';
    if (totalDiv) totalDiv.innerHTML = '';
    return;
  }
  const hoy = new Date();
  const diaHoy = hoy.getDate();
  servicios.forEach(s => {
    const div = document.createElement('div');
    div.className = 'item';
    div.style.opacity = s.activo ? '1' : '0.5';
    let estado = ''; let color = '#666';
    if (!s.activo) { estado = '⏸️ Pausado'; }
    else if (s.dia < diaHoy) { estado = '✅ Ya pasó este mes'; color = '#16a34a'; }
    else if (s.dia === diaHoy) { estado = '👉 Vence hoy'; color = '#d97706'; }
    else { estado = `⏳ Vence en ${s.dia - diaHoy} días`; color = '#4f46e5'; }
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;">
        <div><b>${s.nombre}</b> ${s.activo ? '' : '(pausado)'}<br><small style="color:#666">${s.categoria} • Vence día <span style="cursor:pointer;text-decoration:underline;" onclick="editarDiaServicio(${s.id})">${s.dia} ✏️</span> de cada mes</small><br><small style="color:${color};font-weight:600;">${estado}</small></div>
        <div style="text-align:right;min-width:110px;"><b style="cursor:pointer;text-decoration:underline;" onclick="editarMontoServicio(${s.id})" title="Tocar para editar">${formato(s.monto)} ✏️</b><br><span style="font-size:13px;color:#4f46e5;cursor:pointer;" onclick="toggleServicio(${s.id})">${s.activo ? 'Pausar' : 'Activar'}</span> • <span style="font-size:13px;color:red;cursor:pointer;" onclick="eliminarServicio(${s.id})">Eliminar</span></div>
      </div>`;
    lista.appendChild(div);
  });
  const total = servicios.filter(s => s.activo).reduce((a, s) => a + s.monto, 0);
  if (totalDiv) totalDiv.innerHTML = `<div style="background:#eef2ff;padding:12px;border-radius:10px;display:flex;justify-content:space-between;"><span><b>Total servicios por mes:</b></span><b>${formato(total)}</b></div><p style="font-size:13px;color:#666;">Al año son ${formato(total*12)}. Tocá el monto o el día para editar.</p>`;
}

// ---------- IA ----------
function organizadorIA() {
  const box = document.getElementById('iaBox');
  if (!box) return;
  if (!gastos.length && !servicios.length) { box.innerHTML = 'Todavía no hay gastos para analizar.'; return; }
  let sugerencias = [];
  if (gastos.length) {
    const porCat = {};
    gastos.forEach(g => porCat[g.categoria] = (porCat[g.categoria] || 0) + g.montoTotal);
    const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];
    sugerencias.push(`📊 Tu mayor gasto es <b>${topCat[0]}</b>: ${formato(topCat[1])}.`);
    let faltaTotal = 0, restantesTotal = 0;
    gastos.forEach(g => { const d = detalleCuotas(g); faltaTotal += d.faltaPagar; restantesTotal += d.restantes; });
    sugerencias.push(`💳 Te quedan <b>${restantesTotal} cuotas</b> por pagar por un total de <b>${formato(faltaTotal)}</b>.`);
  }
  if (servicios.length) {
    const total = servicios.filter(s => s.activo).reduce((a, s) => a + s.monto, 0);
    sugerencias.push(`🧾 Tenés <b>${servicios.filter(s=>s.activo).length} servicios activos</b> por <b>${formato(total)} / mes</b>. Al año son <b>${formato(total*12)}</b>.`);
    const masCaro = [...servicios].filter(s=>s.activo).sort((a,b)=>b.monto-a.monto)[0];
    if (masCaro) sugerencias.push(`🏠 Tu servicio más caro es <b>${masCaro.nombre}</b>: ${formato(masCaro.monto)}.`);
  }
  const cal = calcularCalendario();
  const mesPesado = Object.entries(cal).sort((a, b) => b[1] - a[1])[0];
  if (mesPesado) sugerencias.push(`📅 Tu mes más pesado será <b>${mesPesado[0]}</b> con ${formato(mesPesado[1])}.`);
  sugerencias.push(`💡 Tip: Pagá primero la tarjeta con la cuota más alta para liberar cupo.`);
  box.innerHTML = sugerencias.map(s => `<div class="sugerencia">${s}</div>`).join('');
}

// ---------- EXPORTAR ----------
function exportarExcel() {
  if (!gastos.length && !servicios.length) return alert('No hay datos para exportar');
  let csv = "GASTOS\nDescripcion;Monto Total;Tarjeta;Categoria;Cuotas;Valor Cuota;Fecha Inicio;Cuotas Pagadas;Cuotas Restantes;Falta Pagar\n";
  gastos.forEach(g => {
    const d = detalleCuotas(g);
    csv += `${g.descripcion};${g.montoTotal};${g.tarjeta};${g.categoria};${g.cuotas};${(g.montoTotal/g.cuotas).toFixed(0)};${g.fechaInicio};${d.pagadas};${d.restantes};${d.faltaPagar.toFixed(0)}\n`;
  });
  csv += "\nSERVICIOS\nNombre;Monto;Dia Vencimiento;Categoria;Activo\n";
  servicios.forEach(s => { csv += `${s.nombre};${s.monto};${s.dia};${s.categoria};${s.activo ? 'Si' : 'No'}\n`; });
  csv += "\nCALENDARIO\nMes;Monto a pagar\n";
  const cal = calcularCalendario();
  Object.keys(cal).forEach(k => { csv += `${k};${cal[k].toFixed(0)}\n`; });
  csv += "\nDETALLE CUOTA POR CUOTA\nDescripcion;Nro Cuota;Mes;Monto;Estado\n";
  gastos.forEach(g => {
    const d = detalleCuotas(g);
    d.lista.forEach(c => { csv += `${g.descripcion};${c.numero};${c.etiqueta};${c.monto.toFixed(0)};${c.estado}\n`; });
  });
  const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mis-gastos.csv'; a.click();
}
function exportarBackup() {
  const blob = new Blob([JSON.stringify({ version: 4, gastos, servicios }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup-gastos.json'; a.click();
}
