window.onload = () => {
    // 1. Verificar sesión primero
    const usuarioLogueado = Auth.check();
    
    if (usuarioLogueado) {
        // 2. Poner nombre en el saludo
        document.getElementById('user-greet').innerText = `Bienvenido, ${usuarioLogueado.nombre}`;
        
        // 3. Iniciar el resto de la app
        Ventas.init();
        mostrarSeccion('ventas');
        actualizarDashboard();
    }
};

function mostrarSeccion(seccion) {
    const cont = document.getElementById('pantalla-dinamica');
    const btnV = document.getElementById('btn-ventas');
    const btnD = document.getElementById('btn-deudas');

    if (seccion === 'ventas') {
        btnV.classList.add('active');
        btnD.classList.remove('active');
        cont.innerHTML = `
            <h4>Nueva Venta</h4>
            <input type="text" id="v-nom" placeholder="¿Qué vendiste?">
            <div style="display:flex; gap:5px">
                <input type="number" id="v-monto" placeholder="Monto">
                <select id="v-moneda"><option value="Bs">Bs</option><option value="USD">$</option></select>
            </div>
            <select id="v-met">
                <option value="Efectivo Bs">Efectivo Bs</option>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Punto/Biopago">Punto/Biopago</option>
                <option value="Efectivo $">Efectivo $</option>
                <option value="Fiao">Pide Fiao (Deuda)</option>
            </select>
            <button onclick="procesarOperacion()" class="btn-accion">Registrar Movimiento</button>`;
    } else {
        btnD.classList.add('active');
        btnV.classList.remove('active');
        cont.innerHTML = `<h4>Fiaos Pendientes</h4>` + (Ventas.deudas.length > 0 ? Ventas.deudas.map(d => `
            <div class="item-deuda">
                <p><b>${d.cliente}</b> debe <b>$${(d.montoUsd || 0).toFixed(2)}</b><br><small>(${d.concepto})</small></p>
                <button onclick="cobrarFiao(${d.id})" class="btn-mini">Cobrar</button>
            </div>`).join('') : '<p>No hay deudas pendientes.</p>');
    }
}

function procesarOperacion() {
    const nom = document.getElementById('v-nom').value;
    const monto = document.getElementById('v-monto').value;
    const moneda = document.getElementById('v-moneda').value;
    const met = document.getElementById('v-met').value;

    if (nom && monto) {
        if (met === "Fiao") {
            Ventas.registrarDeuda(nom, monto, moneda, "Venta");
        } else {
            Ventas.registrarVenta(nom, monto, moneda, met);
        }
        actualizarDashboard();
        mostrarSeccion('ventas');
    }
}

function cobrarFiao(id) {
    const deuda = Ventas.deudas.find(d => d.id === id);
    const metodo = prompt(`Cobrando fiao de $${deuda.montoUsd.toFixed(2)}. Método:`, "Pago Móvil");
    if(metodo) {
        Ventas.pagarDeuda(id, metodo);
        actualizarDashboard();
        mostrarSeccion('deudas');
    }
}

function actualizarDashboard() {
    const hoy = new Date().toLocaleDateString();
    const ventasHoy = Ventas.historial.filter(v => v.fecha && v.fecha.includes(hoy));
    
    const totalBs = ventasHoy.reduce((a,b) => a + (b.bs || 0), 0);
    const totalUsdActual = totalBs / Conversor.tasaActual;
    
    document.getElementById('caja-bs').innerText = `${totalBs.toLocaleString('de-DE')} Bs`;
    document.getElementById('caja-usd').innerText = `$${totalUsdActual.toFixed(2)}`;
    
    const deudaTotal = Ventas.deudas.reduce((a,b) => a + (b.montoUsd || 0), 0);
    document.getElementById('deudas-pendientes').innerText = `$${deudaTotal.toFixed(2)}`;
    
    const lista = document.getElementById('lista-movimientos');
    lista.innerHTML = Ventas.historial.slice(-5).reverse().map(v => {
        const usdRec = v.bs / Conversor.tasaActual;
        return `<li><b>${v.producto}</b>: ${v.bs.toLocaleString('de-DE')} Bs / $${usdRec.toFixed(2)} <br><small>${v.metodo} - ${v.fecha}</small></li>`;
    }).join('');
}

function enviarCierreWhatsApp() {
    const hoy = new Date().toLocaleDateString();
    const ventas = Ventas.historial.filter(v => v.fecha && v.fecha.includes(hoy));
    const totalBs = ventas.reduce((a,b) => a + (b.bs || 0), 0);
    
    let msg = `*CIERRE DOMINUS - ${hoy}*%0A`;
    msg += `Total Bs: ${totalBs.toLocaleString('de-DE')} Bs%0A`;
    msg += `Tasa: ${Conversor.tasaActual} Bs/$%0A`;
    msg += `--------------------%0A`;
    ventas.forEach(v => msg += `- ${v.producto}: ${v.bs.toLocaleString('de-DE')} Bs%0A`);
    
    window.open(`https://wa.me/?text=${msg}`);
}

function generarPDF(tipo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const hoy = new Date();
    const diasFiltro = tipo === 'semanal' ? 7 : 30;
    const fechaLimite = new Date();
    fechaLimite.setDate(hoy.getDate() - diasFiltro);

    const ventasFiltradas = Ventas.historial.filter(v => new Date(v.id) >= fechaLimite);
    
    doc.setFontSize(20);
    doc.text(`REPORTE ${tipo.toUpperCase()}`, 15, 20);
    doc.setFontSize(10);
    doc.text(`Tasa: ${Conversor.tasaActual} Bs | Fecha: ${hoy.toLocaleString()}`, 15, 30);

    const rows = ventasFiltradas.map(v => [v.fecha.split(',')[0], v.producto, v.metodo, `${v.bs.toLocaleString('de-DE')} Bs`, `$${(v.bs / Conversor.tasaActual).toFixed(2)}`]);

    doc.autoTable({ startY: 40, head: [['Fecha', 'Producto', 'Método', 'Bs', '$']], body: rows });
    doc.save(`reporte_${tipo}.pdf`);
}