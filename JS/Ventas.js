const Ventas = {
    historial: [], 
    deudas: [],
    gastos: [],

    init() {
        // 1. Carga de datos (Tu lógica original)
        this.historial = Persistencia.cargar('dom_ventas') || [];
        this.deudas = Persistencia.cargar('dom_fiaos') || [];
        this.gastos = Persistencia.cargar('dom_gastos') || [];
        if (typeof Inventario !== 'undefined') Inventario.init();

        // 2. Control de la animación (Punto 1 de tu lista)
        // Usamos una función de flecha para no perder el contexto
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if(splash) {
                splash.classList.add('splash-fade-out');
                // Quitamos el display después de la transición de 0.8s del CSS
                setTimeout(() => {
                    splash.style.display = 'none';
                }, 800);
            }
        }, 2000); // Mantiene el logo 2 segundos mientras todo carga
    },
    // ... resto de tus funciones
    // Busca la función registrarVenta y reemplázala por esta:
    // Agregamos 'com' como último parámetro para que si no se envía, valga 0
registrarVenta(p, m, mon, met, cli, com = 0, esServicio = false, cant = 1, tallaEscogida = null) {
    const tasa = Conversor.tasaActual; 
    const precioBase = Number(m);
    const cantidadVendida = Number(cant);
    
    // --- SECCIÓN 1: LÓGICA DE STOCK (DOBLE IMPACTO) ---
    const inv = Inventario.productos.find(i => i.nombre === p);
    
    if (inv && !esServicio) {
        let cantidadARestarGlobal = cantidadVendida;

        // A. Conversión matemática para el Stock Global
        if ((inv.unidad === 'Kg' || inv.unidad === 'Lts') && tallaEscogida) {
            const medida = tallaEscogida.toLowerCase();
            if (medida.includes('g') || medida.includes('ml')) {
                // "500g" -> 0.5 unidades de Kg
                cantidadARestarGlobal = (parseFloat(medida) / 1000) * cantidadVendida;
            } else if (medida.includes('kg') || medida.includes('l')) {
                cantidadARestarGlobal = parseFloat(medida) * cantidadVendida;
            }
        }
        
        // B. RESTA DEL STOCK GLOBAL (El total que se ve afuera)
        inv.cantidad -= cantidadARestarGlobal;

        // C. RESTA DEL STOCK INDIVIDUAL (La talla/peso dentro del modal)
        if (inv.tallas && tallaEscogida && inv.tallas[tallaEscogida] !== undefined) {
            inv.tallas[tallaEscogida] -= cantidadVendida;
            
            // Limpieza: Si la talla se agota, la borramos para mantener el orden
            if (inv.tallas[tallaEscogida] <= 0) {
                delete inv.tallas[tallaEscogida];
            }
        }
        
        // Guardamos los cambios físicos en LocalStorage
        Inventario.sincronizar();

    } else if (!esServicio) {
        console.warn(`⚠️ DOMINUS: El producto "${p}" no existe.`);
    }

    // --- SECCIÓN 2: CÁLCULOS FINANCIEROS ---
    const montoUSD = (mon === 'USD') ? (precioBase * cantidadVendida) : (precioBase * cantidadVendida) / tasa;
    const montoBs = (mon === 'BS') ? (precioBase * cantidadVendida) : (precioBase * cantidadVendida) * tasa;

    const montoComision = (Number(montoBs) * (Number(com) / 100));
    const montoAEntregar = esServicio ? (montoBs - montoComision) : 0;

    const datosVenta = {
        id: Date.now(),
        fecha: new Date().toLocaleDateString('es-VE'),
        hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        producto: esServicio ? `PUNTO: ${p}` : (tallaEscogida ? `${p} (${tallaEscogida})` : p),
        cantidadVenta: cantidadVendida,
        montoBs: Number(montoBs.toFixed(2)),
        montoUSD: Number(montoUSD.toFixed(2)),
        tasaHistorica: tasa,
        monedaOriginal: mon,
        metodo: met,
        comision: montoComision,
        aEntregar: montoAEntregar,
        cliente: cli || "Anónimo",
        esServicio: esServicio,
        pagado: false, 
        montoPagadoReal: 0 
    };

    // --- SECCIÓN 3: PERSISTENCIA ---
    if (met === 'Fiao') {
        this.deudas.push({ ...datosVenta });
        Persistencia.guardar('dom_fiaos', this.deudas);
    } else {
        this.historial.push(datosVenta);
        Persistencia.guardar('dom_ventas', this.historial);
    }
},

// DENTRO del objeto Ventas
anularVenta: function(id) {
    // 1. Buscamos la venta en el historial global
    const v = Ventas.historial.find(item => item.id === Number(id));
    
    if (!v) return notificar("❌ Error: Venta no encontrada");

    if (confirm(`¿Anular venta de "${v.producto}"? El stock regresará.`)) {
        
        // 2. Devolver al inventario (Solo si no es un servicio de punto)
        if (!v.esServicio && typeof Inventario !== 'undefined') {
            // Usamos los nombres exactos que guardamos: v.producto, v.cantidadVenta, v.tallaVenta
            Inventario.devolver(v.producto, v.cantidadVenta, v.tallaVenta);
        }

        // 3. Eliminar del historial
        Ventas.historial = Ventas.historial.filter(item => item.id !== Number(id));
        
        // 4. Persistir y Refrescar
        Persistencia.guardar('dom_ventas', Ventas.historial);
        Interfaz.actualizarDashboard();
        
        // Recargar el selector de ventas para que el stock se actualice visualmente
        if (typeof Interfaz.actualizarSelectorTallas === 'function') {
            Interfaz.actualizarSelectorTallas(document.getElementById('v-producto').value);
        }

        notificar("🗑️ Venta anulada y stock recuperado");
    }
},

    registrarGasto(desc, m, mon) {
        const ahora = new Date();
        const montoBs = (mon === 'USD') ? m * Conversor.tasaActual : m;
        this.gastos.push({
            id: ahora.getTime(),
            descripcion: desc,
            montoBs: montoBs,
            fecha: ahora.toLocaleDateString('es-VE'),
            hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        Persistencia.guardar('dom_gastos', this.gastos);
    },

    abonarDeuda(id, monto, mon, metodoPago) {
        const index = this.deudas.findIndex(d => d.id === Number(id));
        if (index !== -1) {
            const ahora = new Date();
            const abonoBs = (mon === 'USD') ? monto * Conversor.tasaActual : monto;
            
            // Restamos de la deuda
            this.deudas[index].montoBs -= abonoBs;
            
            // Registramos en el historial con fecha, hora y el método de pago elegido
            this.historial.push({
                id: ahora.getTime(),
                producto: `Abono: ${this.deudas[index].cliente}`,
                montoBs: abonoBs,
                metodo: metodoPago || `Abono ${mon}`, // Guardamos si fue Punto, Pago Móvil, etc.
                fecha: ahora.toLocaleDateString('es-VE'),
                hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            // Si la deuda llega a cero, la eliminamos
            if (this.deudas[index].montoBs <= 1) this.deudas.splice(index, 1);
            
            Persistencia.guardar('dom_fiaos', this.deudas);
            Persistencia.guardar('dom_ventas', this.historial);
            return true;
        }
        return false;
    },

    eliminarDeuda(id) {
        this.deudas = this.deudas.filter(d => d.id !== Number(id));
        Persistencia.guardar('dom_fiaos', this.deudas);
    },

    // Dentro de Ventas = { ...
    getSugerencias() {
        // Extraemos solo los nombres de los productos del historial
        const nombres = this.historial.map(v => v.producto);
        // También sumamos los nombres de los productos en el inventario
        const nombresInv = (typeof Inventario !== 'undefined') ? Inventario.productos.map(p => p.nombre) : [];
        
        // Unimos ambos, eliminamos duplicados y ordenamos por los más frecuentes
        const unicos = [...new Set([...nombres, ...nombresInv])];
        return unicos.slice(0, 10); // Retornamos las 10 mejores sugerencias
    },

  finalizarJornada() {
        const ventas = Persistencia.cargar('dom_ventas') || [];
        const gastos = Persistencia.cargar('dom_gastos') || [];
        const hoy = new Date().toLocaleDateString('es-VE');
        const vHoy = ventas.filter(v => v.fecha === hoy);
        
        let efecBS = 0;
        let efecUSD = 0;
        let digital = 0;
        
        let detalleMetodos = {
            pagoMovil: 0,
            biopago: 0,
            punto: 0,
            comisiones: 0
        };

        vHoy.forEach(v => {
            const mBs = Number(v.montoBs) || 0;
            const mUsd = Number(v.montoUSD) || 0;
            detalleMetodos.comisiones += (Number(v.comision) || 0);

            if (mUsd > 0) {
                efecUSD += mUsd;
            } else if (v.metodo.includes('Pago') || v.metodo.includes('Punto') || v.metodo.includes('Biopago')) {
                digital += mBs;
                
                // Desglose para el PDF (Biopago integrado aquí)
                if (v.metodo === 'Pago Móvil') detalleMetodos.pagoMovil += mBs;
                if (v.metodo === 'Biopago') detalleMetodos.biopago += mBs;
                if (v.metodo === 'Punto') detalleMetodos.punto += mBs;
            } else if (v.metodo !== 'Fiao') {
                efecBS += mBs;
            }
        });

        const totalGastos = gastos.filter(g => g.fecha === hoy)
                                  .reduce((acc, g) => acc + (Number(g.montoBs) || 0), 0);

        return {
            efectivoBS: efecBS,
            efectivoUSD: efecUSD,
            digital: digital,
            gastos: totalGastos,
            detalle: detalleMetodos, 
            balanceNeto: (efecBS + digital) - totalGastos
        };
    },

    limpiarJornada() {
        this.historial = [];
        Persistencia.guardar('dom_ventas', []);
        Persistencia.guardar('dom_gastos', []);
        console.log("DOMINUS: Jornada limpiada.");
    },

   abrirProcesoAbono(clienteId) {
    // 1. Buscamos los datos de la deuda para mostrarlos en el modal
    const deuda = Ventas.deudas.find(d => d.id === Number(clienteId));
    if (!deuda) return notificar("No se encontró la deuda", "error");

    // 2. Creamos el Modal Estético
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:380px; width:100%; border:1px solid var(--primary); padding:25px; border-radius:20px; text-align:center;">
            <h3 style="color:var(--primary); margin-bottom:5px;">🤝 Abonar Deuda</h3>
            <p style="font-size:0.9em; opacity:0.8; margin-bottom:15px;">Cliente: <strong>${deuda.cliente}</strong></p>
            
            <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
                <input type="number" id="monto-abono" placeholder="¿Cuánto paga?" 
                       style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--primary); background:rgba(0,0,0,0.2); color:white; font-size:1.1em; text-align:center;">
                
                <select id="moneda-abono" style="width:100%; padding:10px; border-radius:10px; background:#222; color:white; border:1px solid #444;">
                    <option value="BS">Bs Bolívares</option>
                    <option value="USD">$ Dólares</option>
                </select>

                <select id="metodo-abono" style="width:100%; padding:10px; border-radius:10px; background:#222; color:white; border:1px solid #444;">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Punto">Punto de Venta</option>
                </select>
            </div>

            <div style="display:flex; gap:10px;">
                <button id="btn-cerrar-abono" class="btn-main" style="background:#444; flex:1">Cerrar</button>
                <button id="btn-guardar-abono" class="btn-main" style="flex:1">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('monto-abono').focus();

    // 3. Lógica de los botones
    document.getElementById('btn-cerrar-abono').onclick = () => overlay.remove();

    document.getElementById('btn-guardar-abono').onclick = () => {
        const monto = parseFloat(document.getElementById('monto-abono').value);
        const mon = document.getElementById('moneda-abono').value;
        const met = document.getElementById('metodo-abono').value;

        if (isNaN(monto) || monto <= 0) {
            return notificar("Ingrese un monto válido", "error");
        }

        // Llamamos a tu lógica real de deudas
        const exito = Ventas.abonarDeuda(clienteId, monto, mon, met);

        if (exito) {
            overlay.remove();
            notificar("Abono registrado con éxito", "fiao");
            // Refrescamos la interfaz (ajusta el nombre si es distinto en tu código)
            if (typeof Interfaz !== 'undefined') {
                Interfaz.actualizarDashboard();
                if (Interfaz.renderCreditos) Interfaz.renderCreditos(); 
                else if (Interfaz.mostrarSeccion) Interfaz.mostrarSeccion('creditos'); 
                }
            }
         };
    }
}