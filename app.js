// Mis Gastos v8 - Ingresos + Tarjetas con Cuotas Pendientes Mes a Mes + Servicios
let gastos = JSON.parse(localStorage.getItem('misGastos_v2')) || [];
let servicios = JSON.parse(localStorage.getItem('misServicios_v1')) || [];
let misTarjetas = JSON.parse(localStorage.getItem('misTarjetas_v1')) || [];
let ingresos = JSON.parse(localStorage.getItem('misIngresos_v1')) || [];
let filtroTarjeta = 'Todas';

const TARJETAS_DEFAULT = [
  { id: 1, nombre: 'Visa', banco: '', tipo: 'Visa', digitos: '', limite: 0, cierre: 0, vencimiento: 5, activa: true },
  { id: 2, nombre: 'American Express', banco: '', tipo: 'American Express', digitos: '', limite: 0, cierre: 0, vencimiento: 5, activa: true },
  { id: 3, nombre: 'Mastercard', banco: '', tipo: 'Mastercard', digitos: '', limite: 0, cierre: 0, vencimiento: 5, activa: true },
  { id: 4, nombre: 'Efectivo / Débito', banco: '', tipo: 'Efectivo / Débito', digitos: '', limite: 0, cierre: 0, vencimiento: 0, activa: true },
];

if (gastos.length===0 && servicios.length===0 && misTarjetas.length===0 && ingresos.length===0) {
  fetch('datos.json').then(r=>r.json()).then(data=>{
    gastos=data.gastos||[]; servicios=data.servicios||[]; ingresos=data.ingresos||[];
    misTarjetas=data.tarjetas && data.tarjetas.length ? data.tarjetas : TARJETAS_DEFAULT;
    guardar(); guardarServicios(); guardarTarjetas(); guardarIngresos(); organizadorIA();
  }).catch(()=>{ if(!misTarjetas.length) misTarjetas=TARJETAS_DEFAULT; mostrar(); mostrarServicios(); mostrarTarjetas(); mostrarIngresos(); actualizarSelectTarjetas(); organizadorIA(); });
} else {
  if(!misTarjetas.length) misTarjetas=TARJETAS_DEFAULT;
  mostrar(); mostrarServicios(); mostrarTarjetas(); mostrarIngresos(); actualizarSelectTarjetas(); organizadorIA();
}

function formato(n){ return "$"+Number(n).toLocaleString('es-AR'); }
function guardar(){ localStorage.setItem('misGastos_v2', JSON.stringify(gastos)); mostrar(); mostrarTarjetas(); mostrarBalance(); }
function guardarServicios(){ localStorage.setItem('misServicios_v1', JSON.stringify(servicios)); mostrarServicios(); organizadorIA(); mostrar(); mostrarTarjetas(); mostrarBalance(); }
function guardarTarjetas(){ localStorage.setItem('misTarjetas_v1', JSON.stringify(misTarjetas)); actualizarSelectTarjetas(); mostrarTarjetas(); mostrarTarjetasSimple(); }
function guardarIngresos(){ localStorage.setItem('misIngresos_v1', JSON.stringify(ingresos)); mostrarIngresos(); mostrarBalance(); organizadorIA(); }

// ===== INGRESOS =====
function agregarIngreso(){
  const descripcion=document.getElementById('ing-descripcion').value.trim();
  const monto=parseFloat(document.getElementById('ing-monto').value);
  const tipo=document.getElementById('ing-tipo').value;
  const fecha=document.getElementById('ing-fecha').value || new Date().toISOString().slice(0,10);
  const fijo=document.getElementById('ing-fijo').checked;
  if(!descripcion||!monto) return alert('Completá qué es y el monto');
  ingresos.push({id:Date.now(), descripcion, monto, tipo, fecha, fijo});
  document.getElementById('ing-descripcion').value=''; document.getElementById('ing-monto').value=''; document.getElementById('ing-fijo').checked=false;
  guardarIngresos(); alert('✅ Ingreso agregado');
}
function eliminarIngreso(id){ if(!confirm('¿Eliminar este ingreso?')) return; ingresos=ingresos.filter(i=>i.id!==id); guardarIngresos(); }
function totalIngresosMes(){
  const hoy=new Date(); const mes=hoy.getMonth(); const anio=hoy.getFullYear();
  return ingresos.reduce((acc,i)=>{
    if(i.fijo) return acc+i.monto;
    const [y,m]=i.fecha.split('-').map(Number);
    if(y===anio && (m-1)===mes) return acc+i.monto;
    return acc;
  },0);
}
function mostrarIngresos(){
  const lista=document.getElementById('listaIngresos'); const totalDiv=document.getElementById('totalIngresos');
  if(!lista) return;
  lista.innerHTML='';
  if(ingresos.length===0){ lista.innerHTML='<p style="color:#666;text-align:center;">Sin ingresos todavía. Agregá tu sueldo 👆</p>'; if(totalDiv) totalDiv.innerHTML=''; return; }
  [...ingresos].sort((a,b)=> (b.fijo-a.fijo) || b.fecha.localeCompare(a.fecha)).forEach(i=>{
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;"><div><b>💰 ${i.descripcion}</b> ${i.fijo?'<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:99px;font-size:12px;">FIJO / MES</span>':''}<br><small style="color:#666">${i.tipo} • ${i.fecha}</small></div><div style="text-align:right;"><b style="color:#047857;">+${formato(i.monto)}</b><br><span style="color:red;cursor:pointer;font-size:14px;" onclick="eliminarIngreso(${i.id})">Eliminar</span></div></div>`;
    lista.appendChild(div);
  });
  const total=totalIngresosMes();
  if(totalDiv) totalDiv.innerHTML=`<div style="background:#ecfdf5;padding:12px;border-radius:10px;display:flex;justify-content:space-between;"><span><b>Total ingresos este mes:</b></span><b style="color:#047857;">+${formato(total)}</b></div><p style="font-size:13px;color:#666;">Los fijos se suman todos los meses automáticamente.</p>`;
}
function mostrarBalance(){
  const div=document.getElementById('balanceInicio'); if(!div) return;
  const ing=totalIngresosMes();
  const totalServ=servicios.filter(s=>s.activo).reduce((a,s)=>a+s.monto,0);
  let cuotasEsteMes=0;
  gastos.forEach(g=>{ const det=detalleCuotas(g); const c=det.lista.find(x=>x.estado==='este-mes'); if(c) cuotasEsteMes+=c.monto; });
  const hoy=new Date(); let contadoEsteMes=0;
  gastos.forEach(g=>{ if(g.cuotas===1){ const [y,m]=g.fechaInicio.split('-').map(Number); if(y===hoy.getFullYear() && (m-1)===hoy.getMonth()) contadoEsteMes+=g.montoTotal; } });
  const totalGastosMes = cuotasEsteMes + contadoEsteMes + totalServ;
  const queda = ing - totalGastosMes;
  const colorQueda = queda>=0 ? '#047857' : '#dc2626';
  const bgQueda = queda>=0 ? '#ecfdf5' : '#fef2f2';
  div.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center;">
      <div style="background:#ecfdf5;padding:12px;border-radius:12px;"><div style="font-size:12px;color:#666;">INGRESOS</div><b style="color:#047857;font-size:18px;">+${formato(ing)}</b></div>
      <div style="background:#fef2f2;padding:12px;border-radius:12px;"><div style="font-size:12px;color:#666;">GASTOS MES</div><b style="color:#dc2626;font-size:18px;">-${formato(totalGastosMes)}</b></div>
      <div style="background:${bgQueda};padding:12px;border-radius:12px;"><div style="font-size:12px;color:#666;">TE QUEDA</div><b style="color:${colorQueda};font-size:18px;">${formato(queda)}</b></div>
    </div>
    <div style="font-size:13px;color:#666;margin-top:10px;line-height:1.5;">Cuotas este mes: ${formato(cuotasEsteMes)} • Contado este mes: ${formato(contadoEsteMes)} • Servicios: ${formato(totalServ)} ${queda<0?`<br><b style="color:#dc2626;">⚠️ Este mes gastás más de lo que ingresa.</b>`:`<br>✅ Vas bien, te sobran ${formato(queda)} este mes.`}</div>`;
}

// ===== TARJETAS =====
function actualizarSelectTarjetas(){
  const sel=document.getElementById('tarjeta'); if(!sel) return;
  sel.innerHTML='';
  misTarjetas.filter(t=>t.activa).forEach(t=>{ const o=document.createElement('option'); o.value=t.nombre; o.textContent=t.banco?`${t.nombre} - ${t.banco}`:t.nombre; sel.appendChild(o); });
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
  guardarTarjetas(); alert('✅ Tarjeta agregada: '+nombre); irA('tarjetas');
}
function eliminarTarjeta(id){
  const t=misTarjetas.find(x=>x.id===id); if(!t) return;
  const cant=gastos.filter(g=>g.tarjeta===t.nombre).length;
  if(cant>0 && !confirm(`Esta tarjeta tiene ${cant} gastos. Si la eliminás, esos gastos quedan pero sin tarjeta. ¿Seguir?`)) return;
  if(!confirm(`¿Eliminar ${t.nombre}?`)) return;
  misTarjetas=misTarjetas.filter(x=>x.id!==id); guardarTarjetas();
}
function mostrarTarjetasSimple(){
  const div=document.getElementById('listaTarjetasSimple'); if(!div) return;
  if(!misTarjetas.length){ div.innerHTML='<p style="color:#666">Sin tarjetas.</p>'; return; }
  div.innerHTML=misTarjetas.map(t=>`<div class="item"><div style="display:flex;justify-content:space-between;gap:10px;"><div><b>${t.nombre}</b> ${t.digitos?`• ••• ${t.digitos}`:''}<br><small style="color:#666">${t.banco||'Sin banco'} • ${t.tipo} ${t.vencimiento?`• Vence día ${t.vencimiento}`:''} ${t.limite?`• Límite ${formato(t.limite)}`:''}</small></div><span style="color:red;cursor:pointer;font-size:14px;" onclick="eliminarTarjeta(${t.id})">Eliminar</span></div></div>`).join('');
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
    lista.push({numero:i+1, etiqueta:`${nombres[mes-1]} ${anio}`, monto:valorCuota, estado, clave:claveMes});
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

// ===== CUOTAS PENDIENTES MES A MES POR TARJETA =====
function cuotasPendientesPorTarjeta(nombreTarjeta){
  const mapa = {};
  gastos.filter(g=>g.tarjeta===nombreTarjeta).forEach(g=>{
    const det=detalleCuotas(g);
    det.lista.forEach(c=>{
      if(c.estado==='pagada') return;
      if(!mapa[c.etiqueta]) mapa[c.etiqueta]={etiqueta:c.etiqueta, monto:0, estado:c.estado, clave:c.clave, cant:0, detalle:[]};
      mapa[c.etiqueta].monto+=c.monto;
      mapa[c.etiqueta].cant++;
      mapa[c.etiqueta].detalle.push(`${g.descripcion} - Cuota ${c.numero}/${g.cuotas} (${formato(c.monto)})`);
      if(c.estado==='este-mes') mapa[c.etiqueta].estado='este-mes';
    });
  });
  return Object.values(mapa).sort((a,b)=>a.clave-b.clave);
}

// ===== RESUMEN POR TARJETA =====
function resumenPorTarjeta(){
  const tarjetas={};
  misTarjetas.forEach(t=>{ tarjetas[t.nombre]={info:t, gastos:[], totalGastado:0, faltaPagar:0, cuotasRestantes:0, cuotasPagadas:0, esteMes:0}; });
  gastos.forEach(g=>{
    if(!tarjetas[g.tarjeta]) tarjetas[g.tarjeta]={info:null, gastos:[], totalGastado:0, faltaPagar:0, cuotasRestantes:0, cuotasPagadas:0, esteMes:0};
    const det=detalleCuotas(g);
    tarjetas[g.tarjeta].gastos.push(g); tarjetas[g.tarjeta].totalGastado+=g.montoTotal; tarjetas[g.tarjeta].faltaPagar+=det.faltaPagar; tarjetas[g.tarjeta].cuotasRestantes+=det.restantes; tarjetas[g.tarjeta].cuotasPagadas+=det.pagadas;
    const c=det.lista.find(x=>x.estado==='este-mes'); if(c) tarjetas[g.tarjeta].esteMes+=c.monto;
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
function filtrarTarjeta(t){ filtroTarjeta=t; document.querySelectorAll('.chip').forEach(c=>c.classList.remove('activo')); document.getElementById('chip-'+t)?.classList.add('activo'); mostrarTarjetas(); }

function mostrarTarjetas(){
  const cont=document.getElementById('listaTarjetas'); const resumenInicio=document.getElementById('resumenTarjetasInicio'); const chips=document.getElementById('chipsTarjetas');
  if(!cont) return;
  const porTarjeta=resumenPorTarjeta(); const nombres=Object.keys(porTarjeta);
  if(chips) chips.innerHTML=`<span class="chip ${filtroTarjeta==='Todas'?'activo':''}" onclick="filtrarTarjeta('Todas')">Todas</span>`+nombres.map(n=>`<span class="chip ${filtroTarjeta===n?'activo':''}" id="chip-${n}" onclick="filtrarTarjeta('${n}')">${n}</span>`).join('');
  if(resumenInicio){
    if(!gastos.length) resumenInicio.innerHTML='<p style="color:#666">Sin gastos todavía.</p>';
    else resumenInicio.innerHTML=nombres.filter(n=>porTarjeta[n].gastos.length>0).map(n=>{ const r=porTarjeta[n]; return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:15px;"><span><b>${n}</b></span><span>Gastado <b>${formato(r.totalGastado)}</b> • Falta <b style="color:#d97706">${formato(r.faltaPagar)}</b></span></div>`; }).join('') || '<p style="color:#666">Sin gastos.</p>';
  }
  cont.innerHTML='';
  const aMostrar=filtroTarjeta==='Todas'?nombres:nombres.filter(n=>n===filtroTarjeta);
  aMostrar.forEach(nombre=>{
    const r=porTarjeta[nombre]; const info=r.info; const div=document.createElement('div'); div.className='tarjeta-card '+claseTarjeta(info?info.tipo:nombre);
    const esEfectivo=info && info.tipo==='Efectivo / Débito'; const txt=esEfectivo?'color:#111':'color:white'; const sub=esEfectivo?'color:#555':'color:rgba(255,255,255,0.85)';
    const pendientes = cuotasPendientesPorTarjeta(nombre);
    let htmlPendientes = '';
    if(pendientes.length===0){
      htmlPendientes = `<div style="background:rgba(255,255,255,0.15);padding:12px;border-radius:12px;margin-top:14px;font-size:14px;">✅ Sin cuotas pendientes en esta tarjeta.</div>`;
    } else {
      htmlPendientes = `
      <div style="background:rgba(255,255,255,0.15);padding:12px;border-radius:12px;margin-top:14px;">
        <div style="font-weight:700;font-size:15px;margin-bottom:8px;">📅 Cuotas pendientes mes a mes</div>
        ${pendientes.map(p=>{
          const etiqueta = p.estado==='este-mes' ? '👉 Este mes' : '⏳ Pendiente';
          return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.2);">
            <div style="display:flex;justify-content:space-between;font-size:15px;"><span><b>${p.etiqueta}</b> • ${p.cant} cuota${p.cant>1?'s':''}</span><span><b>${formato(p.monto)}</b></span></div>
            <div style="font-size:12px;opacity:0.9;">${etiqueta} • ${p.detalle.join(' • ')}</div>
          </div>`;
        }).join('')}
        <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:14px;"><span>Total pendiente:</span><b>${formato(r.faltaPagar)}</b></div>
      </div>`;
    }
    let htmlGastos='';
    if(r.gastos.length===0) htmlGastos=`<p style="font-size:14px;opacity:0.9;margin-top:12px;">Sin gastos todavía en esta tarjeta.</p>`;
    else htmlGastos=`<details style="margin-top:14px;"><summary style="font-size:14px;font-weight:700;cursor:pointer;">Ver todas las compras de esta tarjeta 👇</summary><div style="margin-top:8px;">` + r.gastos.map(g=>{
      const det=detalleCuotas(g); const valorCuota=g.montoTotal/g.cuotas; const progreso=g.cuotas>1?Math.round((det.pagadas/g.cuotas)*100):100;
      let detalle='';
      if(g.cuotas>1){
        detalle=`<div style="margin-top:8px;font-size:13px;"><div style="display:flex;justify-content:space-between;"><span>Cuota ${Math.min(det.cuotaActual,g.cuotas)} de ${g.cuotas} • Te quedan <b>${det.restantes}</b></span><span>Falta <b>${formato(det.faltaPagar)}</b></span></div><div style="background:rgba(0,0,0,0.15);height:7px;border-radius:99px;margin:6px 0;overflow:hidden;"><div style="background:white;height:100%;width:${progreso}%"></div></div><details><summary style="font-size:13px;font-weight:600;cursor:pointer;">Ver cuotas de esta compra 👇</summary><div style="margin-top:6px;">${det.lista.map(c=>{ let et='⏳ Pendiente'; if(c.estado==='pagada') et='✅ Pagada'; if(c.estado==='este-mes') et='👉 Este mes'; return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.2);font-size:13px;"><span>Cuota ${c.numero} • ${c.etiqueta}</span><span><b>${formato(c.monto)}</b> ${et}</span></div>`; }).join('')}</div></details></div>`;
      } else detalle=`<div style="font-size:13px;margin-top:4px;opacity:0.9;">Pago único • ${formato(g.montoTotal)}</div>`;
      return `<div style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.25);"><div style="display:flex;justify-content:space-between;gap:8px;"><div><b>${g.descripcion}</b><br><small style="${sub}">${g.categoria} • ${g.cuotas} x ${formato(valorCuota)} • ${g.fechaInicio}</small></div><div style="text-align:right;"><b>${formato(g.montoTotal)}</b><br><span style="color:#ffcccc;cursor:pointer;font-size:13px;" onclick="eliminar(${g.id})">Eliminar</span></div></div>${detalle}</div>`;
    }).join('') + `</div></details>`;
    div.innerHTML=`<div style="${txt}"><div style="display:flex;justify-content:space-between;"><h3 style="margin:0;font-size:20px;">💳 ${nombre}</h3><span style="font-size:13px;background:rgba(255,255,255,0.25);padding:6px 10px;border-radius:99px;">${r.gastos.length} compras</span></div>${info?`<div style="font-size:13px;opacity:0.9;margin-top:6px;">${info.banco||''} ${info.digitos?`• ••• ${info.digitos}`:''} ${info.vencimiento?`• Vence día ${info.vencimiento}`:''} ${info.limite?`• Límite ${formato(info.limite)}`:''} ${info.cierre?`• Cierre día ${info.cierre}`:''}</div>`:''}<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:14px;text-align:center;"><div style="background:rgba(255,255,255,0.2);padding:10px;border-radius:12px;"><div style="font-size:12px;">LLEVÁS GASTADO</div><b>${formato(r.totalGastado)}</b></div><div style="background:rgba(255,255,255,0.2);padding:10px;border-radius:12px;"><div style="font-size:12px;">TE FALTA PAGAR</div><b>${formato(r.faltaPagar)}</b></div><div style="background:rgba(255,255,255,0.2);padding:10px;border-radius:12px;"><div style="font-size:12px;">CUOTAS QUE QUEDAN</div><b>${r.cuotasRestantes}</b></div></div><div style="display:flex;justify-content:space-between;margin-top:10px;font-size:14px;"><span>Este mes: <b>${formato(r.esteMes)}</b></span><span>${r.cuotasPagadas} cuotas ya pagadas</span></div>${info && info.limite ? `<div style="font-size:13px;margin-top:6px;">Disponible aprox: <b>${formato(Math.max(0, info.limite - r.faltaPagar))}</b> de ${formato(info.limite)}</div>` : ''}${htmlPendientes}${htmlGastos}</div>`;
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
    div.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;"><div><b>${g.descripcion}</b><br><small style="color:#666">${g.tarjeta} • ${g.categoria} • ${g.cuotas} x ${formato(valorCuota)} • ${g.fechaInicio}</small></div><div style="text-align:right;"><b>${formato(g.montoTotal)}</b><br><span style="color:red;cursor:pointer;font-size:14px;" onclick="eliminar(${g.id})">Eliminar</span></div></div>${g.cuotas>1?`<div style="margin-top:8px;font-size:14px;">Cuota ${Math.min(det.cuotaActual,g.cuotas)} de ${g.cuotas} • Te quedan ${det.restantes} • Falta ${formato(det.faltaPagar)} • ${progreso}%</div>`:`<div style="font-size:13px;color:#666;">Pago único</div>`}`;
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
  if(!gastos.length && !servicios.length && !ingresos.length){ box.innerHTML='Todavía no hay datos.'; return; }
  let sug=[];
  const ing=totalIngresosMes();
  sug.push(`💰 Este mes ingresás <b>${formato(ing)}</b>.`);
  const porTarjeta=resumenPorTarjeta();
  Object.keys(porTarjeta).forEach(n=>{
    const r=porTarjeta[n];
    if(r.gastos.length>0){
      sug.push(`💳 <b>${n}</b>: llevás gastado <b>${formato(r.totalGastado)}</b>, te faltan <b>${r.cuotasRestantes} cuotas</b> por <b>${formato(r.faltaPagar)}</b>. Este mes pagás <b>${formato(r.esteMes)}</b>.`);
      const pendientes=cuotasPendientesPorTarjeta(n);
      if(pendientes.length) sug.push(`📅 ${n} mes a mes: ` + pendientes.map(p=>`${p.etiqueta} ${formato(p.monto)}`).join(' • '));
    }
  });
  if(servicios.length){ const total=servicios.filter(s=>s.activo).reduce((a,s)=>a+s.monto,0); sug.push(`🧾 Servicios: <b>${formato(total)} / mes</b> • Al año ${formato(total*12)}.`); }
  const cal=calcularCalendario(); const mesPesado=Object.entries(cal).sort((a,b)=>b[1]-a[1])[0];
  if(mesPesado) sug.push(`📅 Mes más pesado total: <b>${mesPesado[0]}</b> con ${formato(mesPesado[1])}.`);
  sug.push(`💡 Tip: Pagá primero la tarjeta con la cuota más alta para liberar cupo.`);
  box.innerHTML=sug.map(s=>`<div class="sugerencia">${s}</div>`).join('');
}

// ===== EXPORTAR =====
function exportarExcel(){
  if(!gastos.length && !servicios.length && !ingresos.length) return alert('No hay datos');
  let csv="INGRESOS\nDescripcion;Monto;Tipo;Fecha;Fijo\n";
  ingresos.forEach(i=>{ csv+=`${i.descripcion};${i.monto};${i.tipo};${i.fecha};${i.fijo?'Si':'No'}\n`; });
  csv+=`\nTOTAL INGRESOS MES;${totalIngresosMes()}\n`;
  csv+="\nTARJETAS\nNombre;Banco;Tipo;Digitos;Limite;Vencimiento;Cierre\n";
  misTarjetas.forEach(t=>{ csv+=`${t.nombre};${t.banco};${t.tipo};${t.digitos};${t.limite};${t.vencimiento};${t.cierre}\n`; });
  csv+="\nCUOTAS PENDIENTES MES A MES POR TARJETA\nTarjeta;Mes;Monto Pendiente;Cuantas Cuotas;Detalle\n";
  const porTarjeta=resumenPorTarjeta();
  Object.keys(porTarjeta).forEach(n=>{
    const pendientes=cuotasPendientesPorTarjeta(n);
    pendientes.forEach(p=>{ csv+=`${n};${p.etiqueta};${p.monto.toFixed(0)};${p.cant};${p.detalle.join(' | ')}\n`; });
  });
  csv+="\nPOR TARJETA\nTarjeta;Total Gastado;Falta Pagar;Cuotas Restantes;Cuotas Pagadas;Este Mes\n";
  Object.keys(porTarjeta).forEach(n=>{ const r=porTarjeta[n]; csv+=`${n};${r.totalGastado};${r.faltaPagar};${r.cuotasRestantes};${r.cuotasPagadas};${r.esteMes}\n`; });
  csv+="\nGASTOS\nDescripcion;Monto Total;Tarjeta;Categoria;Cuotas;Valor Cuota;Fecha;Pagadas;Restantes;Falta Pagar\n";
  gastos.forEach(g=>{ const d=detalleCuotas(g); csv+=`${g.descripcion};${g.montoTotal};${g.tarjeta};${g.categoria};${g.cuotas};${(g.montoTotal/g.cuotas).toFixed(0)};${g.fechaInicio};${d.pagadas};${d.restantes};${d.faltaPagar.toFixed(0)}\n`; });
  csv+="\nSERVICIOS\nNombre;Monto;Dia;Categoria;Activo\n";
  servicios.forEach(s=>{ csv+=`${s.nombre};${s.monto};${s.dia};${s.categoria};${s.activo?'Si':'No'}\n`; });
  csv+="\nCALENDARIO TOTAL\nMes;Monto\n"; const cal=calcularCalendario(); Object.keys(cal).forEach(k=>{ csv+=`${k};${cal[k].toFixed(0)}\n`; });
  csv+="\nDETALLE CUOTA POR CUOTA\nDescripcion;Tarjeta;Nro Cuota;Mes;Monto;Estado\n";
  gastos.forEach(g=>{ const d=detalleCuotas(g); d.lista.forEach(c=>{ csv+=`${g.descripcion};${g.tarjeta};${c.numero};${c.etiqueta};${c.monto.toFixed(0)};${c.estado}\n`; }); });
  const blob=new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='mis-gastos.csv'; a.click();
}
function exportarBackup(){
  const blob=new Blob([JSON.stringify({version:8, gastos, servicios, tarjetas:misTarjetas, ingresos},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup-gastos.json'; a.click();
}
