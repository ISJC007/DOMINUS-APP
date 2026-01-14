let miGrafica = null; // Añade esto en la línea 1 de Main.js

const Interfaz = {
    
    show(view) {
        document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));
        const target = document.getElementById(`view-${view}`);
        if(target) target.classList.remove('hidden');
        
        this.actualizarDashboard();
        
        // Ejecutar funciones específicas según la vista
        if(view === 'ventas') {
            this.renderVentas();
            this.cargarSugerencias(); // Ahora sí llama a la función de abajo
        }
        if(view === 'gastos') this.renderGastos();
        if(view === 'fiaos-list') this.renderFiaos();
        if(view === 'inventario') this.renderInventario();
    },

    // Esta función debe estar FUERA de show(view), pero dentro de Interfaz
    cargarSugerencias() {
        const listaSugerencias = document.getElementById('sugerencias-ventas');
        if (!listaSugerencias) return;

        const productos = Ventas.getSugerencias();
        listaSugerencias.innerHTML = productos.map(p => `<option value="${p}">`).join('');
    },

    toggleClienteField(metodo) {
        const campo = document.getElementById('v-cliente');
        if(campo) {
            metodo === 'Fiao' ? campo.classList.remove('hidden') : campo.classList.add('hidden');
        }
    },

 actualizarDashboard() {
    const v = Persistencia.cargar('dom_ventas') || [];
    const g = Persistencia.cargar('dom_gastos') || [];
    const f = Persistencia.cargar('dom_fiaos') || [];
    const t = Conversor.tasaActual > 0 ? Conversor.tasaActual : 1;
    const hoy = new Date().toLocaleDateString('es-VE');

    const vHoy = v.filter(vent => vent.fecha === hoy);
    const gHoy = g.filter(gas => gas.fecha === hoy);

    // 1. Calculamos el Neto en Bolívares
    const totalV = vHoy.reduce((acc, i) => acc + (Number(i.montoBs) || 0), 0);
    const totalG = gHoy.reduce((acc, i) => acc + (Number(i.montoBs) || 0), 0);
    const netoBs = totalV - totalG;

    // 2. Aquí está la magia:
    // Mostramos el neto de la caja convertido a tasa (Referencial)
    const netoConvertido = netoBs / t;

    if(document.getElementById('total-caja')) 
        document.getElementById('total-caja').innerText = `${netoBs.toLocaleString('es-VE')} Bs`;
    
    // Mostramos la conversión en el Dashboard (Para que tu papá vea el valor)
    if(document.getElementById('total-usd')) 
        document.getElementById('total-usd').innerText = `$ ${netoConvertido.toFixed(2)}`;
    
    if(document.getElementById('total-fiaos')) 
        document.getElementById('total-fiaos').innerText = `${f.reduce((acc, i) => acc + (Number(i.montoBs) || 0), 0).toLocaleString('es-VE')} Bs`;
    
    if(document.getElementById('total-gastos')) 
        document.getElementById('total-gastos').innerText = `${totalG.toLocaleString('es-VE')} Bs`;
    
    if(document.getElementById('tasa-global')) 
        document.getElementById('tasa-global').value = t;

    Controlador.renderizarGrafica();
},

    renderVentas() {
        const datos = Persistencia.cargar('dom_ventas') || [];
        const lista = document.getElementById('lista-ventas-historial');
        if(!lista) return;
        lista.innerHTML = datos.slice().reverse().map(v => `
            <div class="item-lista glass">
                <span>
                    <strong>${v.producto}</strong><br>
                    <small style="opacity:0.8">🕒 ${v.fecha} - ${v.hora || ''}</small><br>
                    <small style="color:var(--primary)">${v.metodo}</small>
                </span>
                <span style="font-weight:bold">${Number(v.montoBs).toLocaleString('es-VE')} Bs</span>
            </div>`).join('');
    },

    renderGastos() {
        const datos = Persistencia.cargar('dom_gastos') || [];
        const lista = document.getElementById('lista-gastos-historial');
        if(!lista) return;
        lista.innerHTML = datos.slice().reverse().map(g => `
            <div class="item-lista glass">
                <span>
                    <strong>${g.descripcion}</strong><br>
                    <small style="opacity:0.8">🕒 ${g.fecha} - ${g.hora || ''}</small>
                </span>
                <span style="color:#ff5252; font-weight:bold">-${Number(g.montoBs).toLocaleString('es-VE')} Bs</span>
            </div>`).join('');
    },

    renderFiaos() {
        const datos = Persistencia.cargar('dom_fiaos') || [];
        const lista = document.getElementById('lista-fiaos');
        if(!lista) return;
        if(datos.length === 0) {
            lista.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">Sin fiaos.</p>';
            return;
        }
        lista.innerHTML = datos.slice().reverse().map(f => `
            <div class="item-lista glass border-fiao">
                <span>
                    <strong>${f.cliente}</strong><br>
                    <small>${f.producto}</small><br>
                    <small style="opacity:0.8">📅 ${f.fecha} 🕒 ${f.hora || ''}</small>
                </span>
                <div class="acciones-fiao">
                    <span class="monto-deuda">${Number(f.montoBs).toLocaleString('es-VE')} Bs</span>
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <button class="btn-mini btn-success" onclick="Controlador.abonar('${f.id}')">Abonar</button>
                        <button class="btn-mini" style="background:#2196F3" onclick="Controlador.editarDeuda('${f.id}')">✏️</button>
                        <button class="btn-mini btn-danger" onclick="Controlador.eliminarDeuda('${f.id}')">🗑️</button>
                    </div>
                </div>
            </div>`).join('');
    },

    renderInventario() {
        const productos = Inventario.productos || [];
        const lista = document.getElementById('lista-inventario');
        if(!lista) return;
        const config = Persistencia.cargar('dom_config') || { invActivo: false };
        const switchBtn = document.getElementById('check-inv');
        if(switchBtn) switchBtn.checked = config.invActivo;

        lista.innerHTML = productos.map(p => `
            <div class="item-lista glass">
                <span><strong>${p.nombre}</strong><br><small>Stock: ${p.cantidad}</small></span>
                <div class="acciones-fiao">
                    <span>${Number(p.precio).toLocaleString('es-VE')} Bs</span>
                    <button class="btn-mini btn-danger" onclick="Controlador.eliminarInv('${p.id}')">🗑️</button>
                </div>
            </div>`).join('');
    }
};

const Controlador = {
    ejecutarVenta() {
        const p = document.getElementById('v-producto').value;
        const m = parseFloat(document.getElementById('v-monto').value);
        const mon = document.getElementById('v-moneda').value;
        const met = document.getElementById('v-metodo').value;
        const cli = document.getElementById('v-cliente').value;
        const stockOk = typeof Inventario !== 'undefined' ? Inventario.descontar(p, 1) : true;

    if (stockOk) {
        Ventas.registrarVenta(p, m, mon, met, cli);
    }
        if(!p || isNaN(m)) return alert("Falta producto o monto");
        Ventas.registrarVenta(p, m, mon, met, cli);

        if (typeof Inventario !== 'undefined') Inventario.descontar(p, 1);
        
        document.getElementById('v-producto').value = '';
        document.getElementById('v-monto').value = '';
        document.getElementById('v-cliente').value = '';
        this.limpiarSeleccionVenta();
        Interfaz.show('dashboard');
    },

    ejecutarGasto() {
        const d = document.getElementById('g-desc').value;
        const m = parseFloat(document.getElementById('g-monto').value);
        const mon = document.getElementById('g-moneda').value;
        if(!d || isNaN(m)) return alert("Faltan datos");
        Ventas.registrarGasto(d, m, mon);
        document.getElementById('g-desc').value = '';
        document.getElementById('g-monto').value = '';
        Interfaz.show('dashboard');
    },

    guardarEnInventario() {
        const n = document.getElementById('inv-nombre').value;
        const c = document.getElementById('inv-cant').value;
        const p = document.getElementById('inv-precio').value;
        if(!n || !c) return alert("Falta nombre o cantidad");
        Inventario.guardar(n, c, p || 0);
        document.getElementById('inv-nombre').value = '';
        document.getElementById('inv-cant').value = '';
        document.getElementById('inv-precio').value = '';
        Interfaz.renderInventario();
    },

    abonar(id) {
        const monto = prompt("¿Cuánto abona el cliente?");
        if(!monto || isNaN(monto)) return;
        const moneda = confirm("¿El abono es en Dólares ($)?") ? 'USD' : 'Bs';
        const metodo = prompt("Método de pago (Ej: Pago Móvil, Efectivo, Punto, Biopago):", "Pago Móvil");

        if (Ventas.abonarDeuda(id, parseFloat(monto), moneda, metodo)) {
            alert("Abono registrado con éxito");
            Interfaz.show('fiaos-list');
        }
    },

    eliminarDeuda(id) {
        if(confirm("¿Borrar deuda definitivamente?")) {
            Ventas.eliminarDeuda(id);
            Interfaz.show('fiaos-list');
        }
    },

    eliminarInv(id) {
        if(confirm("¿Borrar producto del inventario?")) {
            Inventario.eliminar(id);
            Interfaz.renderInventario();
        }
    },

    editarDeuda(id) {
        const montoNuevo = prompt("Ingrese el nuevo monto total de la deuda (en Bs):");
        if(montoNuevo !== null && montoNuevo !== "" && !isNaN(montoNuevo)) {
            let fiaos = Persistencia.cargar('dom_fiaos') || [];
            const index = fiaos.findIndex(f => f.id === Number(id));
            if(index !== -1) {
                fiaos[index].montoBs = parseFloat(montoNuevo);
                Persistencia.guardar('dom_fiaos', fiaos);
                Ventas.init(); 
                Interfaz.renderFiaos();
                alert("Deuda actualizada correctamente.");
            }
        }
    },

    toggleInv(val) {
        Inventario.activo = val;
        Persistencia.guardar('dom_config', { invActivo: val });
        console.log("Inventario: " + (val ? "Activado" : "Desactivado"));
    },

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        Persistencia.guardar('dom_dark_mode', isDark);
    },

    limpiarSeleccionVenta() {
        const met = document.getElementById('v-metodo');
        if(met) met.value = 'Efectivo $';
        Interfaz.toggleClienteField('Efectivo $');
    },

    calcularComision() { 
        const monto = prompt("Monto total para calcular comisión:");
        if(monto && !isNaN(monto)) {
            const porcentaje = 5; 
            const resultado = (parseFloat(monto) * porcentaje) / 100;
            alert(`La comisión (5%) es: ${resultado.toLocaleString('es-VE')} Bs`);
            if(confirm("¿Deseas registrar esta comisión como una venta?")) {
                Ventas.registrarVenta("Comisión por Punto", resultado, "BS", "Pago Móvil", "Sistema");
                Interfaz.show('dashboard');
            }
        }
    },

    generarCierre() {
    const r = Ventas.finalizarJornada();
    const hoy = new Date().toLocaleDateString('es-VE');
    
    const texto = `📊 *CIERRE DOMINUS - ${hoy}*\n\n` +
                  `💵 Efectivo: ${r.efectivoBS.toLocaleString('es-VE')} Bs / ${r.efectivoUSD} $\n` +
                  `📱 Digital: ${r.digital.toLocaleString('es-VE')} Bs\n` +
                  `📉 Gastos: ${r.gastos.toLocaleString('es-VE')} Bs\n\n` +
                  `✅ *Total Neto:* ${(r.efectivoBS + r.digital - r.gastos).toLocaleString('es-VE')} Bs`;

    const opcion = prompt("¿Cómo deseas el cierre?\n1. Mensaje de WhatsApp\n2. Documento PDF", "1");

    if (opcion === "1") {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    } else if (opcion === "2") {
        this.exportarPDF(r, hoy, texto);
    }
},

exportarPDF(r, fecha) {
    const cuerpo = document.getElementById('pdf-tabla-cuerpo');
    document.getElementById('pdf-fecha').innerText = fecha;
    document.getElementById('pdf-tasa').innerText = `Tasa referencial: ${Conversor.tasaActual} Bs`;
    
    const neto = r.efectivoBS + r.digital - r.gastos;

    cuerpo.innerHTML = `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 15px;">💵 Efectivo Bolívares</td>
            <td style="padding: 15px; text-align: right; font-weight: bold;">
                ${r.efectivoBS.toLocaleString('es-VE')} Bs
            </td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 15px;">💰 Efectivo Dólares</td>
            <td style="padding: 15px; text-align: right; font-weight: bold; color: #2e7d32;">
                $ ${Number(r.efectivoUSD).toFixed(2)}
            </td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 15px;">📱 Ventas Digitales</td>
            <td style="padding: 15px; text-align: right; font-weight: bold;">
                ${r.digital.toLocaleString('es-VE')} Bs
            </td>
        </tr>
        <tr style="border-bottom: 1px solid #eee; color: #d32f2f;">
            <td style="padding: 15px;">📉 Gastos del Día</td>
            <td style="padding: 15px; text-align: right; font-weight: bold;">
                -${r.gastos.toLocaleString('es-VE')} Bs
            </td>
        </tr>
    `;

    document.getElementById('pdf-total-neto').innerText = `${neto.toLocaleString('es-VE')} Bs`;

    const elemento = document.getElementById('plantilla-pdf');
    const ahora = new Date();
    const fechaFmt = ahora.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
    const horaFmt = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
                         .replace(/\s/g, '-')
                         .replace(/:/g, '.');

    const nombreArchivo = `Cierre_${fechaFmt}_${horaFmt}.pdf`; 

    const opciones = {
        margin: 0.3,
        filename: nombreArchivo,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // EJECUCIÓN Y LIMPIEZA POST-CIERRE
// Busca esta parte dentro de exportarPDF:
    html2pdf().set(opciones).from(elemento).save().then(() => {
        setTimeout(() => {
            const confirmar = confirm("✅ PDF Generado. ¿Deseas CERRAR la jornada y borrar las ventas/gastos de hoy?");
            if (confirmar) {
                Ventas.limpiarJornada(); 
                // Cambia 'actualizarDashboard()' por 'Interfaz.actualizarDashboard()'
                Interfaz.actualizarDashboard(); 
                alert("Jornada cerrada con éxito.");
                location.reload(); 
            }
        }, 1500);
    });
},

renderizarGrafica() {
        const canvas = document.getElementById('graficaVentas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const ventas = Persistencia.cargar('dom_ventas') || [];
        const hoy = new Date().toLocaleDateString('es-VE');
        const vHoy = ventas.filter(v => v.fecha === hoy);
        
        const datosPorHora = new Array(24).fill(0);
        vHoy.forEach(v => {
            if (v.hora) {
                const hora = parseInt(v.hora.split(':')[0]);
                datosPorHora[hora] += (Number(v.montoBs) || 0);
            }
        });

        if (miGrafica) miGrafica.destroy();

        miGrafica = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Ventas Bs',
                    data: datosPorHora,
                    borderColor: '#ffd700', // Dorado Dominus
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}; // <-- ESTA LLAVE CIERRA EL CONTROLADOR

document.addEventListener('DOMContentLoaded', () => {

    const isDark = Persistencia.cargar('dom_dark_mode');
    if (isDark) document.body.classList.add('dark-mode');

    try {
        console.log("🚀 Dominus iniciando...");
        Ventas.init();
        
        // Forzamos el cierre del splash tras 2.5s pase lo que pase
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if(splash) {
                splash.style.opacity = '0';
                setTimeout(() => {
                    splash.style.display = 'none';
                    // Solo mostramos el dashboard si el splash se quitó con éxito
                    Interfaz.show('dashboard');
                }, 500);
            }
        }, 2500);

    } catch (error) {
        console.error("❌ Error crítico en el inicio:", error);
        // Si hay un error, quitamos el splash igual para que puedas ver qué pasó
        const splash = document.getElementById('splash-screen');
        if(splash) splash.style.display = 'none';
    }
});

const DOMINUS = {
    debug() {
        console.group("🔍 Auditoría de Salud Dominus");
        
        const modulos = {
            "Persistencia": typeof Persistencia !== 'undefined',
            "Ventas": typeof Ventas !== 'undefined',
            "Interfaz": typeof Interfaz !== 'undefined',
            "Controlador": typeof Controlador !== 'undefined',
            "Inventario": typeof Inventario !== 'undefined'
        };

        console.table(modulos);

        const datos = {
            "Ventas registradas": Ventas.historial?.length || 0,
            "Deudas activas": Ventas.deudas?.length || 0,
            "Productos en Stock": Inventario.productos?.length || 0,
            "Tasa actual": Conversor.tasaActual || "No cargada"
        };
        
        console.log("📊 Estado de Datos:", datos);
        
        if (Object.values(modulos).includes(false)) {
            console.error("⛔ ALERTA: Hay módulos que no cargaron. Revisa el orden de tus scripts en el HTML.");
        } else {
            console.log("✅ SISTEMA NOMINAL: Todos los módulos están respondiendo.");
        }

        console.groupEnd();
    },
    
    // Función extra para limpiar todo en caso de emergencia
    resetTotal() {
        if(confirm("⚠️ ¿BORRAR TODO? Esto eliminará ventas, gastos y fiaos permanentemente.")) {
            localStorage.clear();
            location.reload();
        }
    }
};

// Lo hacemos global para acceder desde la consola
window.DOMINUS = DOMINUS;