// Mis Gastos v6 - Tarjetas administrables + Cuotas por tarjeta + Servicios
let gastos = JSON.parse(localStorage.getItem('misGastos_v2')) || [];
let servicios = JSON.parse(localStorage.getItem('misServicios_v1')) || [];
let misTarjetas = JSON.parse(localStorage.getItem('misTarjetas_v1')) || [];
let filtroTarjeta = 'Todas';

const TARJETAS_DEFAULT = [
  { id: 1, nombre: 'Visa', banco: '', tipo: 'Visa', digitos: '', limite: 0, cierre: 0, vencimiento: 5, activa: true },
  { id: 2, nombre: 'American Express', banco: '', tipo: 'American Express', digitos: '', limite: 0, cierre: 0, vencimiento: 5, activa: true },
  { id: 3, nombre: 'Mastercard', banco: '', tipo: 'Mastercard', digitos: '', limite: 0, cierre: 0, vencimiento: 5, activa: true },
  { id: 4, nombre: 'Efectivo / Débito', banco: '', tipo: 'Efectivo / Débito', digitos: '', limite: 0, cierre: 0, vencimiento: 0, activa: true },
];

if (gastos.length === 0 && servicios.length === 0 && misTarjetas.length === 0) {
  fetch('datos.json').then(r=>r.json()).then(data=>{
    gastos = data.gastos || [];
    servicios = data.servicios || [];
    misTarjetas = data.tarjetas && data.tarjetas.length ? data.tarjetas : TARJETAS_DEFAULT;
    guardar(); guardarServicios(); guardarTarjetas(); organizadorIA();
  }).catch(()=>{ if(!misTarjetas.length) misTarjetas=TARJETAS_DEFAULT; mostrar(); mostrarServicios(); mostrarTarjetas(); actualizarSelectTarjetas(); organizadorIA(); });
} else {
  if(!misTarjetas.length) misTarjetas=TARJETAS_DEFAULT;
  mostrar(); mostrarServicios(); mostrarTarjetas(); actualizarSelectTarjetas(); organizadorIA();
}

function formato(n){ return "$"+Number(n).toLocaleString('es-AR'); }
function guardar(){ localStorage.setItem('misGastos_v2', JSON.stringify(gastos)); mostrar(); mostrarTarjetas(); }
function guardarServicios(){ localStorage.setItem('misServicios_v1', JSON.stringify(servicios)); mostrarServicios(); organizadorIA(); mostrar(); mostrarTarjetas(); }
function guardarTarjetas(){ localStorage.setItem('misTarjetas_v1', JSON.stringify(misTarjetas)); actualizarSelectTarjetas(); mostrarTarjetas(); mostrarTarjetasSimple(); }

// ===== TARJETAS - AGREGAR / ELIMINAR =====
function actualizarSelectTarjetas(){
  const sel=document.getElementById('tarjeta'); if(!sel) return;
  sel.innerHTML='';
  misTarjetas.filter(t=>t.activa).forEach(t=>{
    const opt=document.createElement('option');
    opt.value=t.nombre; opt.textContent = t.banco ? `${t.nombre} - ${t.banco}` : t.nombre;
    sel.appendChild(opt);
  });
}
function agregarTarjeta(){
  const nombre=document.getElementById('nueva-nombre').value.trim();
  const banco=document.getElementById('nueva-banco').value.trim();
  const tipo=document.getElementById('nueva-tipo').value;
  const digitos=document.getElementById('nueva-digitos').value.trim();
  const limite=parseFloat(document.getElementById('nueva-limite').value)||0;
  const cierre=parseInt(document.getElementById('nueva-cierre').value)||0;
  const vencimiento=parseInt(document.getElementById('nueva-vencimiento').value)||0;
  if(!nombre) return alert('Poné el nombre de la tarjeta. Ej: Visa Galicia');
  if(misTarjetas.some(t=>t.nombre.toLowerCase()===nombre.toLowerCase())) return alert('Ya tenés una tarjeta con ese nombre. Cambiale el nombre, ej: Visa Galicia 2');
  misTarjetas.push({id:Date.now(), nombre, banco, tipo, digitos, limite, cierre, vencimiento, activa:true});
  ['nueva-nombre','nueva-banco','nueva-digitos','nueva-limite','nueva-cierre','nueva-vencimiento'].forEach(id=>document.getElementById(id).value='');
  guardarTarjetas();
  alert('✅ Tarjeta agregada: '+nombre);
  irA('tarjetas');
}
function eliminarTarjeta(id){
  const t=misTarjetas.find(x=>x.id===id);
  if(!t) return;
  const cant=gastos.filter(g=>g.tarjeta===t.nombre).length;
  if(cant>0 && !confirm(`Esta tarjeta tiene ${cant} gastos. Si la eliminás, esos gastos quedan pero sin tarjeta. ¿Seguir?`)) return;
  if(!confirm(`¿Eliminar ${t.nombre}?`)) return;
  misTarjetas=misTarjetas.filter(x=>x.id!==id);
  guardarTarjetas();
}
function mostrarTarjetasSimple(){
  const div=document.getElementById('listaTarjetasSimple'); if(!div) return;
  if(!misTarjetas.length){ div.innerHTML='<p style="color:#666">Sin tarjetas.</p>'; return; }
  div.innerHTML=misTarjetas.map(t=>`
    <div class="item"><div style="display:flex;justify-content:space-between;gap:10px;"><div><b>${t.nombre}</b> ${t.digitos?`• ••• ${t.digitos}`:''}<br><small style="color:#666">${t.banco||'Sin banco'} • ${t.tipo} ${t.vencimiento?`• Vence día ${t.vencimiento}`:''} ${t.limite?`• Límite ${formato(t.limite)}`:''}</small></div><span style="color:red;cursor:pointer;font-size:14px;" onclick="eliminarTarjeta(${t.id})">Eliminar</span></div></div>
  `).join('');
}

// ===== GASTOS =====
function agregarGasto(){
  const descripcion=document.getElementById('descripcion').value.trim();
  const monto=parseFloat(document.getElementById('monto').value);
  const tarjeta=document.getElementById('tarjeta').value;
  const categoria=document.getElementById('categoria').value;
  const cuotas=parseInt(document.getElementById('cuotas').value)||1;
  const fecha=document.getElementById('fecha').value || new Date().toISOString().slice(0,10);
  if(!descripcion||!monto) return alert('Completá descripción y monto');
  if(!tarjeta) return alert('Agregá una tarjeta primero');
  gastos.push({id:Date.now(), descripcion, montoTotal:monto, tarjeta, categoria, cuotas, fechaInicio:fecha});
  document.getElementById('descripcion').value=''; document.getElementById('monto').value=''; document.getElementById('cuotas').value='1';
  guardar(); organizadorIA(); alert('✅ Gasto agregado en '+tarjeta);
}
function eliminar(id){ if(!confirm('¿Eliminar este gasto?')) return; gastos=gastos.filter(g=>g.id!==id); guardar(); organizadorIA(); }

// ===== CUOTAS =====
function detalleCuotas(g){
  const hoy=new Date(); const mesActual=hoy.getFullYear()*12+hoy.getMonth();
  const [y,m]=g.fechaInicio.split('-').map(Number);
  const valorCuota=g.montoTotal/g.cuotas; const lista=[]; let pagadas=0, restantes=0, faltaPagar=0;
  const nombres=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  for(let i=0;i<g.cuotas;i++){
    let mesNum=(m-1)+i; let anio=y+Math.floor(mesNum/12); let mes=(mesNum%12)+1; let claveMes=anio*12+(mes-1); let estado='pendiente';
    if(claveMes<mesActual){estado='pagada'; pagadas++;}
    else if(claveMes===mesActual){estado='este-mes'; restantes++; faltaPagar+=valorCuota;}
    else{estado='pendiente'; restantes++; faltaPagar+=valorCuota;}
    lista.push({numero:i+1, etiqueta:`${nombres[mes-1]} ${anio}`, monto:valorCuota, estado});
  }
  return {lista, pagadas, restantes, faltaPagar, cuotaActual:pagadas+1};
}
function calcularCalendario(){
  const mapa={};
  gastos.forEach(g=>{ const det=detalleCuotas(g); det.lista.forEach(c=>{ mapa[c.etiqueta]=(mapa[c.etiqueta]||0)+c.monto; }); });
  const hoy=new Date(); const nombres=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const totalServ=servicios.filter(s=>s.activo).reduce((a,s)=>a+s.monto,0);
  if(totalServ>0){ for(let i=0;i<12;i++){ let mes=hoy.getMonth()+i; let anio=hoy.getFullYear()+Math.floor(mes/12); mes=(mes%12); const clave=`${nombres[mes]} ${anio}`; mapa[clave]=(mapa[clave]||0)+totalServ; } }
  return mapa;
}

// ===== RESUMEN POR TARJETA =====
function resumenPorTarjeta(){
  const tarjetas={};
  // Crear entrada para todas las tarjetas guardadas, aunque no tengan gastos
  misTarjetas.forEach(t=>{ tarjetas[t.nombre]={ info:t, gastos:[], totalGastado:0, faltaPagar:0, cuotasRestantes:0, cuotasPagadas:0, esteMes:0 }; });
  gastos.forEach(g=>{
    if(!tarjetas[g.tarjeta]) tarjetas[g.tarjeta]={ info:null, gastos:[], totalGastado:0, faltaPagar:0, cuotasRestantes:0, cuotasPagadas:0, esteMes:0 };
    const det=detalleCuotas(g);
    tarjetas[g.tarjeta].gastos.push(g);
    tarjetas[g.tarjeta].totalGastado+=g.montoTotal;
    tarjetas[g.tarjeta].faltaPagar+=det.faltaPagar;
    tarjetas[g.tarjeta].cuotasRestantes+=det.restantes;
    tarjetas[g.tarjeta].cuotasPagadas+=det.pagadas;
    const cuotaEsteMes=det.lista.find(c=>c.estado==='este-mes');
    if(cuotaEsteMes) tarjetas[g.tarjeta].esteMes+=cuotaEsteMes.monto;
  });
  return tarjetas;
}
function claseTarjeta(tipo){
  if(tipo==='Visa') return 'tarjeta-visa';
  if(tipo==='American Express') return 'tarjeta-amex';
  if(tipo==='Mastercard') return 'tarjeta-master';
  if(tipo==='Efectivo / Débito') return 'tarjeta-efectivo';
  return 'tarjeta-otra';
}
function filtrarTarjeta(t){
  filtroTarjeta=t;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('activo'));
  document.getElementById('chip-'+t)?.classList.add('activo');
  mostrarTarjetas();
}
function mostrarTarjetas(){
  const cont=document.getElementById('listaTarjetas');
  const resumenInicio=document.getElementById('resumenTarjetasInicio');
  const chips=document.getElementById('chipsTarjetas');
  if(!cont) return;
  const porTarjeta=resumenPorTarjeta();
  const nombres=Object.keys(porTarjeta);

  if(chips){
    chips.innerHTML = `<span class="chip ${filtroTarjeta==='Todas'?'activo':''}" onclick="filtrarTarjeta('Todas')">Todas</span>` + nombres.map(n=>`<span class="chip ${filtroTarjeta===n?'activo':''}" id="chip-${n}" onclick="filtrarTarjeta('${n}')">${n}</span>`).join('');
  }
  if(resumenInicio){
    if(!gastos.length) resumenInicio.innerHTML='<p style="color:#666">Sin gastos todavía.</p>';
    else resumenInicio.innerHTML=nombres.filter(n=>porTarjeta[n].gastos.length>0).map(n=>{
      const r=porTarjeta[n];
      return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:15px;"><span><b>${n}</b></span><span>Gastado <b>${formato(r.totalGastado)}</b> • Falta <b style="color:#d97706">${formato(r.faltaPagar)}</b></span></div>`;
    }).join('') || '<p style="color:#666">Sin gastos todavía.</p>';
  }

  cont.innerHTML='';
  const aMostrar = filtroTarjeta==='Todas' ? nombres : nombres.filter(n=>n===filtroTarjeta);
  if(aMostrar.length===0){ cont.innerHTML='<p style="text-align:center;color:#666">Sin tarjetas.</p>'; return; }

  aMostrar.forEach(nombre=>{
    const r=porTarjeta[nombre];
    const info=r.info;
    const div=document.createElement('div');
    div.className='tarjeta-card '+claseTarjeta(info?info.tipo:nombre);
    const esEfectivo = info && info.tipo==='Efectivo / Débito';
    const txt = esEfectivo ? 'color:#111' : 'color:white';
    const sub = esEfectivo ? 'color:#555' : 'color:rgba(255,255,255,0.85)';

    let htmlGastos = '';
    if(r.gastos.length===0){
      htmlGastos=`<p style="font-size:14px;opacity:0.9;margin-top:12px;">Sin gastos todavía en esta tarjeta. Agregá uno desde Inicio 👆</p>`;
    } else {
      htmlGastos = r.gastos.map(g=>{
        const det=detalleCuotas(g);
        const valorCuota=g.montoTotal/g.cuotas;
        const progreso = g.cuotas>1 ? Math.round((det.pagadas/g.cuotas)*100) : 100;
        let detalle='';
        if(g.cuotas>1){
          detalle=`<div style="margin-top:8px;font-size:13px;"><div style="display:flex;justify-content:space-between;"><span>Cuota ${Math.min(det.cuotaActual,g.cuotas)} de ${g.cuotas} • Te quedan <b>${det.restantes}</b></span><span>Falta <b>${formato(det.faltaPagar)}</b></span></div>
          <div style="background:rgba(0,0,0,0.15);height:7px;border-radius:99px;margin:6px 0;overflow:hidden;"><div style="background:white;height:100%;width:${progreso}%"></div></div>
          <details><summary style="font-size:13px;font-weight:600;cursor:pointer;">Ver cuotas mes a mes 👇</summary><div style="margin-top:6px;">${det.lista.map(c=>{
            let et='⏳ Pendiente'; if(c.estado==='pagada') et='✅ Pagada'; if(c.estado==='este-mes') et='👉 Este mes';
            return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.2);font-size:13px;"><span>Cuota ${c.numero} • ${c.etiqueta}</span><span><b>${formato(c.monto)}</b> ${et}</span></div>`;
          }).join('')}</div></details></div>`;
        } else {
          detalle=`<div style="font-size:13px;margin-top:4px;opacity:0.9;">Pago único • ${formato(g.montoTotal)}</div>`;
        }
        return `<div style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.25);"><div style="display:flex;justify-content:space-between;gap:8px;"><div><b>${g.descripcion}</b><br><small style="${sub}">${g.categoria} • ${g.cuotas} x ${formato(valorCuota)} • ${g.fechaInicio}</small></div><div style="text-align:right;"><b>${formato(g.montoTotal)}</b><br><span style="color:#ffcccc;cursor:pointer;font-size:13px;" onclick="eliminar(${g.id})">Eliminar</span></div></div>${detalle}</div>`;
      }).join('');
    }

    div.innerHTML=`
      <div style="${txt}">
        <div style="display:flex;justify-content:space-between;align-items:center;"><h3 style="margin:0;font-size:20px;">💳 ${nombre}</h3><span style="font-size:13px;background:rgba(255,255,255,0.25);padding:6px 10px;border-radius:99px;">${r.gastos.length} compras</span></div>
        ${info ? `<div style="font-size:13px;opacity:0.9;margin-top:6px;">${info.banco||''} ${info.digitos?`• ••• ${info.digitos}`:''} ${info.vencimiento?`• Vence día ${info.vencimiento}`:''} ${info.limite?`• Límite ${formato(info.limite)}`:''} ${info.cierre?`• Cierre día ${info.cierre}`:''}</div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:14px;text-align:center;">
          <div style="background:rgba(255,255,255,0.2);padding:10px;border-radius:12px;"><div style="font-size:12px;opacity:0.9;">LLEVÁS GASTADO</div><b style="font-size:16px;">${formato(r.totalGastado)}</b></div>
          <div style="background:rgba(255,255,255,0.2);padding:10px;border-radius:12px;"><div style="font-size:12px;opacity:0.9;">TE FALTA PAGAR</div><b style="font-size:16px;">${formato(r.faltaPagar)}</b></div>
          <div style="background:rgba(255,255,255,0.2);padding:10px;border-radius:12px;"><div style="font-size:12px;opacity:0.9;">CUOTAS QUE QUEDAN</div><b style="font-size:16px;">${r.cuotasRestantes}</b></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:14px;"><span>Este mes: <b>${formato(r.esteMes)}</b></span><span>${r.cuotasPagadas} cuotas ya pagadas</span></div>
        ${info && info.limite ? `<div style="font-size:13px;margin-top:6px;">Disponible aprox: <b>${formato(Math.max(0, info.limite - r.faltaPagar))}</b> de ${formato(info.limite)}</div>` : ''}
        ${htmlGastos}
      </div>`;
    cont.appendChild(div);
  });
}

// ===== MOSTRAR TODOS =====
function mostrar(){
  const lista=document.getElementById('lista'); if(!lista) return;
  lista.innerHTML='';
  if(gastos.length===0) lista.innerHTML='<p style="text-align:center;color:#666">Todavía no hay gastos.</p>';
  gastos.forEach(g=>{
    const det=detalleCuotas(g); const valorCuota=g.montoTotal/g.cuotas; const progreso=Math.round((det.pagadas/g.cuotas)*100);
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;"><div><b>${g.descripcion}</b><br><small style="color:#666">${g.tarjeta} • ${g.categoria} • ${g.cuotas} x ${formato(valorCuota)} • ${g.fechaInicio}</small></div><div style="text-align:right;"><b>${formato(g.montoTotal)}</b><br><span style="color:red;cursor:pointer;font-size:14px;" onclick="eliminar(${g.id})">Eliminar</span></div></div>
    ${g.cuotas>1 ? `<div style="margin-top:8px;font-size:14px;">Cuota ${Math.min(det.cuotaActual,g.cuotas)} de ${g.cuotas} • Te quedan ${det.restantes} • Falta ${formato(det.faltaPagar)} • ${progreso}%</div>` : `<div style="font-size:13px;color:#666;">Pago único</div>`}`;
    lista.appendChild(div);
  });
  const cal=calcularCalendario(); const calDiv=document.getElementById('calendario');
  if(calDiv){ calDiv.innerHTML=''; Object.keys(cal).forEach(k=>{ calDiv.innerHTML+=`<div class="mes"><span>${k}</span><b>${formato(cal[k])}</b></div>`; }); }
}

// ===== SERVICIOS =====
function agregarServicio(){
  const nombre=document.getElementById('serv-nombre').value.trim();
  const monto=parseFloat(document.getElementById('serv-monto').value);
  const dia=parseInt(document.getElementById('serv-dia').value)||10;
  const categoria=document.getElementById('serv-categoria').value;
  if(!nombre) return alert('Completá el nombre');
  servicios.push({id:Date.now(), nombre, monto:monto||0, dia, categoria, activo:true});
  document.getElementById('serv-nombre').value=''; document.getElementById('serv-monto').value='';
  guardarServicios(); alert('✅ Servicio agregado');
}
function eliminarServicio(id){ if(!confirm('¿Eliminar este servicio?')) return; servicios=servicios.filter(s=>s.id!==id); guardarServicios(); }
function toggleServicio(id){ const s=servicios.find(x=>x.id===id); if(s) s.activo=!s.activo; guardarServicios(); }
function editarMontoServicio(id){ const s=servicios.find(x=>x.id===id); if(!s) return; const nuevo=prompt(`Nuevo monto para ${s.nombre}:`, s.monto||''); if(nuevo===null) return; const v=parseFloat(nuevo); if(isNaN(v)) return alert('Poné un número'); s.monto=v; guardarServicios(); }
function editarDiaServicio(id){ const s=servicios.find(x=>x.id===id); if(!s) return; const nuevo=prompt(`Nuevo día para ${s.nombre} (1-31):`, s.dia); if(nuevo===null) return; const v=parseInt(nuevo); if(isNaN(v)||v<1||v>31) return alert('Poné 1 al 31'); s.dia=v; guardarServicios(); }
function mostrarServicios(){
  const lista=document.getElementById('listaServicios'); const totalDiv=document.getElementById('totalServicios'); if(!lista) return;
  lista.innerHTML='';
  if(servicios.length===0){ lista.innerHTML='<p style="color:#666;text-align:center;">Sin servicios.</p>'; if(totalDiv) totalDiv.innerHTML=''; return; }
  const diaHoy=new Date().getDate();
  servicios.forEach(s=>{
    const div=document.createElement('div'); div.className='item'; div.style.opacity=s.activo?'1':'0.5';
    let estado=''; let color='#666';
    if(!s.activo) estado='⏸️ Pausado'; else if(s.dia<diaHoy){estado='✅ Ya pasó este mes'; color='#16a34a';} else if(s.dia===diaHoy){estado='👉 Vence hoy'; color='#d97706';} else{estado=`⏳ Vence en ${s.dia-diaHoy} días`; color='#4f46e5';}
    div.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;"><div><b>${s.nombre}</b><br><small style="color:#666">${s.categoria} • Vence día <span style="cursor:pointer;text-decoration:underline;" onclick="editarDiaServicio(${s.id})">${s.dia} ✏️</span></small><br><small style="color:${color};font-weight:600;">${estado}</small></div><div style="text-align:right;min-width:110px;"><b style="cursor:pointer;text-decoration:underline;" onclick="editarMontoServicio(${s.id})">${formato(s.monto)} ✏️</b><br><span style="font-size:13px;color:#4f46e5;cursor:pointer;" onclick="toggleServicio(${s.id})">${s.activo?'Pausar':'Activar'}</span> • <span style="font-size:13px;color:red;cursor:pointer;" onclick="eliminarServicio(${s.id})">Eliminar</span></div></div>`;
    lista.appendChild(div);
  });
  const total=servicios.filter(s=>s.activo).reduce((a,s)=>a+s.monto,0);
  if(totalDiv) totalDiv.innerHTML=`<div style="background:#eef2ff;padding:12px;border-radius:10px;display:flex;justify-content:space-between;"><span><b>Total servicios / mes:</b></span><b>${formato(total)}</b></div><p style="font-size:13px;color:#666;">Al año ${formato(total*12)}.</p>`;
}

// ===== IA =====
function organizadorIA(){
  const box=document.getElementById('iaBox'); if(!box) return;
  if(!gastos.length && !servicios.length){ box.innerHTML='Todavía no hay gastos.'; return; }
  let sug=[];
  const porTarjeta=resumenPorTarjeta();
  Object.keys(porTarjeta).forEach(n=>{
    const r=porTarjeta[n];
    if(r.gastos.length>0) sug.push(`💳 <b>${n}</b>: llevás gastado <b>${formato(r.totalGastado)}</b>, te faltan <b>${r.cuotasRestantes} cuotas</b> por <b>${formato(r.faltaPagar)}</b>. Este mes pagás <b>${formato(r.esteMes)}</b>.`);
  });
  if(servicios.length){
    const total=servicios.filter(s=>s.activo).reduce((a,s)=>a+s.monto,0);
    sug.push(`🧾 Servicios: <b>${formato(total)} / mes</b> • Al año ${formato(total*12)}.`);
  }
  const cal=calcularCalendario(); const mesPesado=Object.entries(cal).sort((a,b)=>b[1]-a[1])[0];
  if(mesPesado) sug.push(`📅 Mes más pesado: <b>${mesPesado[0]}</b> con ${formato(mesPesado[1])}.`);
  box.innerHTML=sug.map(s=>`<div class="sugerencia">${s}</div>`).join('');
}

// ===== EXPORTAR =====
function exportarExcel(){
  if(!gastos.length && !servicios.length) return alert('No hay datos');
  let csv="TARJETAS\nNombre;Banco;Tipo;Digitos;Limite;Vencimiento;Cierre\n";
  misTarjetas.forEach(t=>{ csv+=`${t.nombre};${t.banco};${t.tipo};${t.digitos};${t.limite};${t.vencimiento};${t.cierre}\n`; });
  csv+="\nPOR TARJETA\nTarjeta;Total Gastado;Falta Pagar;Cuotas Restantes;Cuotas Pagadas;Este Mes\n";
  const porTarjeta=resumenPorTarjeta();
  Object.keys(porTarjeta).forEach(n=>{ const r=porTarjeta[n]; csv+=`${n};${r.totalGastado};${r.faltaPagar};${r.cuotasRestantes};${r.cuotasPagadas};${r.esteMes}\n`; });
  csv+="\nGASTOS\nDescripcion;Monto Total;Tarjeta;Categoria;Cuotas;Valor Cuota;Fecha;Pagadas;Restantes;Falta Pagar\n";
  gastos.forEach(g=>{ const d=detalleCuotas(g); csv+=`${g.descripcion};${g.montoTotal};${g.tarjeta};${g.categoria};${g.cuotas};${(g.montoTotal/g.cuotas).toFixed(0)};${g.fechaInicio};${d.pagadas};${d.restantes};${d.faltaPagar.toFixed(0)}\n`; });
  csv+="\nSERVICIOS\nNombre;Monto;Dia;Categoria;Activo\n";
  servicios.forEach(s=>{ csv+=`${s.nombre};${s.monto};${s.dia};${s.categoria};${s.activo?'Si':'No'}\n`; });
  csv+="\nCALENDARIO\nMes;Monto\n"; const cal=calcularCalendario(); Object.keys(cal).forEach(k=>{ csv+=`${k};${cal[k].toFixed(0)}\n`; });
  const blob=new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='mis-gastos-por-tarjeta.csv'; a.click();
}
function exportarBackup(){
  const blob=new Blob([JSON.stringify({version:6, gastos, servicios, tarjetas:misTarjetas},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup-gastos.json'; a.click();
}
