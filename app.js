let gastos = JSON.parse(localStorage.getItem('misGastos')) || [];

// Si no hay nada, cargar ejemplo del datos.json
if (gastos.length === 0) {
  fetch('datos.json')
    .then(r => r.json())
    .then(data => {
      gastos = data.gastos;
      guardarYMostrar();
    })
    .catch(() => mostrar());
} else {
  mostrar();
}

function formatoDinero(n) {
  return "$" + Number(n).toLocaleString('es-AR');
}

function agregarGasto() {
  const descripcion = document.getElementById('descripcion').value;
  const monto = parseFloat(document.getElementById('monto').value);
  const tarjeta = document.getElementById('tarjeta').value;
  const cuotas = parseInt(document.getElementById('cuotas').value) || 1;
  const fecha = document.getElementById('fecha').value || new Date().toISOString().slice(0,10);

  if (!descripcion || !monto) return alert('Completá descripción y monto');

  gastos.push({
    id: Date.now(),
    descripcion,
    montoTotal: monto,
    tarjeta,
    cuotas,
    fechaInicio: fecha,
    pagado: false
  });

  document.getElementById('descripcion').value = '';
  document.getElementById('monto').value = '';
  guardarYMostrar();
}

function eliminar(id) {
  gastos = gastos.filter(g => g.id !== id);
  guardarYMostrar();
}

function guardarYMostrar() {
  localStorage.setItem('misGastos', JSON.stringify(gastos));
  mostrar();
}

function mostrar() {
  const lista = document.getElementById('lista');
  lista.innerHTML = '';

  let totalMes = 0;
  let totalDeuda = 0;

  gastos.forEach(g => {
    const valorCuota = g.montoTotal / g.cuotas;
    totalMes += valorCuota;
    totalDeuda += g.montoTotal;

    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div>
        <b>${g.descripcion}</b><br>
        <span class="cuota">${g.tarjeta} • ${g.cuotas} cuota/s de ${formatoDinero(valorCuota)} • desde ${g.fechaInicio}</span>
      </div>
      <div style="text-align:right">
        <b>${formatoDinero(g.montoTotal)}</b><br>
        <button class="delete" onclick="eliminar(${g.id})">Eliminar</button>
      </div>
    `;
    lista.appendChild(div);
  });

  document.getElementById('totalMes').textContent = `Cuota mensual aprox: ${formatoDinero(totalMes)}`;
  document.getElementById('totalDeuda').textContent = `Deuda total: ${formatoDinero(totalDeuda)}`;
}
