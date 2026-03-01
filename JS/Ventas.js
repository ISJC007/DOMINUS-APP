const Ventas = {
    historial: [],
    deudas: [],
    gastos: [],

    async init() {
        // --- REGISTRO Y ACTUALIZACIÓN AUTOMÁTICA DEL SW ---
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('Dominus: SW registrado', reg);
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 Nueva versión disponible. Recargando automáticamente...');
                            window.location.reload();
                        }
                    });
                });
            })
            .catch(err => console.error('Dominus: SW fallo', err));
        }
        // ---------------------------------------------------

        // 1. Carga de datos base (Inalterado)
        this.historial = Persistencia.cargar('dom_ventas') || [];
        this.deudas = Persistencia.cargar('dom_fiaos') || [];
        this.gastos = Persistencia.cargar('dom_gastos') || [];

        if (typeof Inventario !== 'undefined') Inventario.init();

        // 2. INYECCIÓN DE FRASES AL AZAR (Inalterado)
        if (typeof bancoFrases !== 'undefined' && bancoFrases.length > 0) {
            const indice = Math.floor(Math.random() * bancoFrases.length);
            const fraseElegida = bancoFrases[indice];

            const txtFrase = document.getElementById('frase-splash');
            const txtAutor = document.getElementById('autor-splash');

            if (txtFrase && txtAutor) {
                txtFrase.innerText = `"${fraseElegida.texto}"`;
                txtAutor.innerText = `— ${fraseElegida.autor}`;
            }
        }

        // --- VERIFICACIÓN DE SEGURIDAD (Punto #3) ---
        const accesoConcedido = await Seguridad.iniciarProteccion();

        if (!accesoConcedido) {
            alert("Acceso denegado.");
            location.reload();
            return;
        }

        // 3. CONTROL DEL SPLASH (Solo inicia si hubo acceso)
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) {
                splash.classList.add('splash-fade-out');
                setTimeout(() => {
                    splash.style.display = 'none';
                    if (typeof Interfaz !== 'undefined') Interfaz.show('dashboard');
                }, 800);
            }
        }, 5000);
    },

registrarVenta(p, m, mon, met, cli, com = 0, esServicio = false, cant = 1, tallaEscogida = null) {
    const tasa = Conversor.tasaActual;
    const precioBase = Number(m);
    const cantidadVendida = Number(cant);

    // 1. Lógica de Inventario (Stock) - 🚀 MEJORADO PARA PUNTO 7
    const nombreLimpio = p.trim().toLowerCase();
    const inv = Inventario.productos.find(i => i.nombre.toLowerCase() === nombreLimpio);

    if (inv && !esServicio) {
        let cantidadARestarGlobal = cantidadVendida;

        // Lógica para Kg/Lts (siempre usa tallaEscogida para el desglose)
        if ((inv.unidad === 'Kg' || inv.unidad === 'Lts') && tallaEscogida) {
            const medida = tallaEscogida.toLowerCase();
            if (medida.includes('g') || medida.includes('ml')) {
                cantidadARestarGlobal = (parseFloat(medida) / 1000) * cantidadVendida;
            } else if (medida.includes('kg') || medida.includes('l')) {
                cantidadARestarGlobal = parseFloat(medida) * cantidadVendida;
            }
        }

        // ✅ CORRECCIÓN: Resta segura con decimales (máximo 3 decimales)
        inv.cantidad -= cantidadARestarGlobal;
        if (inv.unidad === 'Kg' || inv.unidad === 'Lts') {
            inv.cantidad = parseFloat(inv.cantidad.toFixed(3));
        }

        // Lógica de Tallas (Ropa/Calzado)
        if (inv.tallas && tallaEscogida && inv.tallas[tallaEscogida] !== undefined) {
            inv.tallas[tallaEscogida] -= cantidadVendida;
            if (inv.tallas[tallaEscogida] <= 0) {
                delete inv.tallas[tallaEscogida];
            }
        }

        Inventario.sincronizar();

        // ✅ CORRECCIÓN: ¡Alerta de Stock Bajo (Punto 7)!
        const minimo = inv.stockMinimo || ((inv.unidad === 'Kg' || inv.unidad === 'Lts') ? 1.5 : 3);
        
        if (inv.cantidad <= minimo && inv.cantidad > 0) {
            notificar(`⚠️ ALERTA: Queda poco stock de ${inv.nombre} (${inv.cantidad} ${inv.unidad})`);
        } else if (inv.cantidad <= 0) {
            notificar(`❌ ALERTA: ${inv.nombre} AGOTADO`);
        }

    } else if (!esServicio) {
        console.warn(`⚠️ DOMINUS: El producto "${p}" no existe en el inventario.`);
    }

    // 2. Cálculos Financieros
    const montoUSD = (mon === 'USD') ? (precioBase * cantidadVendida) : (precioBase * cantidadVendida) / tasa;
    const montoBs = (mon === 'BS') ? (precioBase * cantidadVendida) : (precioBase * cantidadVendida) * tasa;
    const montoComision = (Number(montoBs) * (Number(com) / 100));
    const montoAEntregar = esServicio ? (montoBs - montoComision) : 0;

    // 3. Estructura de la Venta
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

    // 4. PERSISTENCIA SEGURA
    if (met === 'Fiao') {
        // Cargar, PUSH, Guardar
        let fiaos = Persistencia.cargar('dom_fiaos') || [];
        fiaos.push({ ...datosVenta });
        Persistencia.guardar('dom_fiaos', fiaos);
        this.deudas = fiaos; // Sincronizar memoria
    } else {
        // Cargar, PUSH, Guardar
        let historial = Persistencia.cargar('dom_ventas') || [];
        historial.push(datosVenta);
        Persistencia.guardar('dom_ventas', historial);
        this.historial = historial; // Sincronizar memoria
    }
},

anularVenta: function(id) {
    const idNum = Number(id);
    const v = Ventas.historial.find(item => item.id === idNum);
    
    if (!v) {
        notificar("❌ Error: Venta no encontrada", "error");
        return;
    }

    // 🚀 INTEGRACIÓN: Actualizado con parámetros personalizados y color rojo
    Interfaz.confirmarAccion(
        "¿Anular Venta?",
        `¿Estás seguro de anular la venta de "${v.producto}"? El stock regresará automáticamente.`,
        () => {
            // --- ESTO SE EJECUTA SI EL USUARIO DICE "SÍ" ---
            
            if (!v.esServicio && typeof Inventario !== 'undefined') {
                Inventario.devolver(v.producto, v.cantidadVenta, v.tallaEscogida);
            }

            Ventas.historial = Ventas.historial.filter(item => item.id !== idNum);
            
            Persistencia.guardar('dom_ventas', Ventas.historial);
            
            // Asegurar actualización total de la interfaz
            if (typeof Interfaz !== 'undefined') {
                Interfaz.actualizarDashboard();
                if (Interfaz.renderHistorial) Interfaz.renderHistorial();
            }
            
            notificar("🗑️ Venta anulada y stock recuperado");
        },
        "Sí, anular",  // 👈 Texto personalizado para confirmar
        "Cancelar",    // 👈 Texto personalizado para cancelar
        true           // 👈 ¡Es peligroso! (color rojo)
    );
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

abonarDeudaPorCliente(nombreCliente, montoAbono, moneda, metodoPago) {
    let fiaos = Persistencia.cargar('dom_fiaos') || [];
    let historial = Persistencia.cargar('dom_ventas') || [];
    const tasaActual = Conversor.tasaActual;
    const ahora = new Date();

    // 1. Convertir TODO el abono a USD para trabajar con valor real
    let abonoRestanteUSD = (moneda === 'USD') ? montoAbono : (montoAbono / tasaActual);
    const abonoOriginalUSD = abonoRestanteUSD; // Para el historial

    // 2. Ordenar deudas del cliente de la más vieja a la más nueva (por fecha o ID)
    let deudasCliente = fiaos
        .filter(f => f.cliente === nombreCliente)
        .sort((a, b) => a.id - b.id); // Asumiendo que ID es timestamp

    // 3. Procesar abono inteligente
    for (let i = 0; i < deudasCliente.length; i++) {
        if (abonoRestanteUSD <= 0) break;

        let deudaActual = deudasCliente[i];
        let montoDeudaUSD = parseFloat(deudaActual.montoUSD || 0);

        if (abonoRestanteUSD >= montoDeudaUSD) {
            // El abono cubre toda esta deuda
            abonoRestanteUSD -= montoDeudaUSD;
            // Eliminamos esta deuda del array principal
            fiaos = fiaos.filter(f => f.id !== deudaActual.id);
        } else {
            // El abono cubre solo una parte de esta deuda
            deudaActual.montoUSD = montoDeudaUSD - abonoRestanteUSD;
            // Recalculamos Bs de esta deuda específica
            deudaActual.montoBs = deudaActual.montoUSD * tasaActual;
            abonoRestanteUSD = 0;
            
            // Actualizamos la deuda parcial en el array principal
            let index = fiaos.findIndex(f => f.id === deudaActual.id);
            if (index !== -1) fiaos[index] = deudaActual;
        }
    }

    // 4. Registrar en el historial
    historial.push({
        id: ahora.getTime(),
        producto: `Abono Cliente: ${nombreCliente}`,
        montoUSD: abonoOriginalUSD,
        montoBs: abonoOriginalUSD * tasaActual,
        metodo: metodoPago,
        fecha: ahora.toLocaleDateString('es-VE'),
        hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // 5. Guardar todo
    Persistencia.guardar('dom_fiaos', fiaos);
    Persistencia.guardar('dom_ventas', historial);
    return true;
},

editarDeudaEspecifica(id) {
    let fiaos = Persistencia.cargar('dom_fiaos') || [];
    const deuda = fiaos.find(d => d.id === Number(id));

    if (!deuda) return notificar("No se encontró el registro", "error");

    // --- CREAMOS EL MODAL ESTÉTICO DINÁMICAMENTE ---
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    // Estilos para centrar y fondo borroso
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:350px; width:100%; padding:25px; border-radius:20px; text-align:center; color:white; border:1px solid var(--primary);">
            <h3 style="color:var(--primary); margin-bottom:15px;">✏️ Editar Monto</h3>
            <p style="opacity:0.8; font-size:0.9em; margin-bottom:5px;">${deuda.producto}</p>
            <p style="font-weight:bold; margin-bottom:15px;">Actual: $${Number(deuda.montoUSD).toFixed(2)}</p>
            
            <input type="number" id="nuevo-monto-input" value="${deuda.montoUSD}" step="0.01"
                   style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--primary); background:rgba(0,0,0,0.3); color:white; font-size:1.1em; text-align:center;">
            
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button id="btn-cancelar-edicion" class="btn-main" style="background:#444; flex:1">Cancelar</button>
                <button id="btn-guardar-edicion" class="btn-main" style="flex:1">Guardar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // --- MAGIA: Lógica de los botones ---
    
    // 1. Botón Cancelar
    document.getElementById('btn-cancelar-edicion').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    // 2. Botón Guardar
    document.getElementById('btn-guardar-edicion').addEventListener('click', () => {
        const nuevoMontoRaw = document.getElementById('nuevo-monto-input').value;
        const nuevoMonto = parseFloat(nuevoMontoRaw);

        if (nuevoMonto && !isNaN(nuevoMonto) && nuevoMonto > 0) {
            // Aplicamos los cambios a los datos
            deuda.montoUSD = nuevoMonto;
            deuda.montoBs = deuda.montoUSD * Conversor.tasaActual;
            
            Persistencia.guardar('dom_fiaos', fiaos);
            this.deudas = fiaos; 
            
            if (typeof Interfaz !== 'undefined') Interfaz.renderFiaos();
            notificar("Registro actualizado", "exito");
            
            // Cerramos modal
            document.body.removeChild(overlay);
        } else {
            notificar("Monto inválido", "error");
        }
    });
},

    // --- NUEVA FUNCIÓN NECESARIA EN VENTAS.JS ---
eliminarRegistroEspecifico(id) {
    let fiaos = Persistencia.cargar('dom_fiaos') || [];
    const deudaAEliminar = fiaos.find(d => d.id === Number(id));
    
    if (!deudaAEliminar) return notificar("Registro no encontrado", "error");

    // --- CREAMOS EL MODAL DE CONFIRMACIÓN DINÁMICAMENTE ---
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    // Estilos para centrar y fondo borroso
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:350px; width:100%; padding:25px; border-radius:20px; text-align:center; color:white; border:1px solid #ff4d4d;">
            <span style="font-size:2.5em;">⚠️</span>
            <h3 style="color:#ff4d4d; margin-bottom:15px;">¿Eliminar registro?</h3>
            <p style="opacity:0.8; font-size:0.9em; margin-bottom:5px;">${deudaAEliminar.producto}</p>
            <p style="font-weight:bold; margin-bottom:20px;">Monto: $${Number(deudaAEliminar.montoUSD).toFixed(2)}</p>
            
            <p style="font-size:0.85em; opacity:0.7; margin-bottom:20px;">Esta acción no se puede deshacer y actualizará el saldo total del cliente.</p>
            
            <div style="display:flex; gap:10px;">
                <button id="btn-cancelar-eliminar" class="btn-main" style="background:#444; flex:1">Cancelar</button>
                <button id="btn-confirmar-eliminar" class="btn-main" style="background:#ff4d4d; flex:1">Eliminar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // --- MAGIA: Lógica de los botones ---
    
    // 1. Botón Cancelar
    document.getElementById('btn-cancelar-eliminar').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    // 2. Botón Eliminar
    document.getElementById('btn-confirmar-eliminar').addEventListener('click', () => {
        // --- AQUÍ VA TU LÓGICA ORIGINAL DE ELIMINACIÓN ---
        
        // 1. ELIMINAMOS EL REGISTRO
        fiaos = fiaos.filter(d => d.id !== Number(id));
        
        // 2. GUARDAMOS EL ESTADO LIMPIO
        Persistencia.guardar('dom_fiaos', fiaos);
        this.deudas = fiaos; 
        
        // 3. ACTUALIZAMOS UI
        if (typeof Interfaz !== 'undefined') Interfaz.renderFiaos();
        
        notificar("Registro eliminado y saldo actualizado", "exito");
        
        // Cerrar modal
        document.body.removeChild(overlay);
    });
},

    getSugerencias() {
        const nombres = this.historial.map(v => v.producto);
        const nombresInv = (typeof Inventario !== 'undefined') ? Inventario.productos.map(p => p.nombre) : [];
        
        const unicos = [...new Set([...nombres, ...nombresInv])];
        return unicos.slice(0, 10); 
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
                
                if (v.metodo === 'Pago Móvil') detalleMetodos.pagoMovil += mBs;
                if (v.metodo === 'Biopago') detalleMetodos.biopago += mBs;
                if (v.metodo === 'Punto') detalleMetodos.punto += mBs;
            } else if (v.metodo !== 'Fiao') {
                efecBS += mBs;
            }
        });

        // 1. Calculamos el total de gastos del día (Solo para información)
        const totalGastos = gastos.filter(g => g.fecha === hoy)
                                  .reduce((acc, g) => acc + (Number(g.montoBs) || 0), 0);

        // 2. Convertimos los USD acumulados a Bolívares según la tasa actual
        const usdConvertidos = efecUSD * (Conversor.tasaActual || 0);

        // 3. RETORNO DE DATOS
        return {
            efectivoBS: efecBS,
            efectivoUSD: efecUSD,
            digital: digital,
            gastos: totalGastos, 
            detalle: detalleMetodos, 
            // EL BALANCE NETO: Sumamos todo lo que entró (Bs + Digital + USD convertidos)
            // Sin restar los gastos, para que el neto sea real.
            balanceNeto: (efecBS + digital + usdConvertidos) 
        };
    },

    limpiarJornada() {
        this.historial = [];
        Persistencia.guardar('dom_ventas', []);
        Persistencia.guardar('dom_gastos', []);
        console.log("DOMINUS: Jornada limpiada.");
    },

 abrirProcesoAbono(nombreCliente) {
    // 1. CARGAMOS DATOS FRESCOS DE LA PERSISTENCIA
    // Esto asegura que si se hicieron abonos o ventas recientes,
    // el saldo mostrado sea el correcto y no uno antiguo en memoria.
    const todosLosFiaos = Persistencia.cargar('dom_fiaos') || [];
    
    // Sincronizamos la memoria para seguridad de otros módulos
    Ventas.deudas = todosLosFiaos; 

    // Buscamos todas las deudas del cliente para sumar el total
    const deudasCliente = Ventas.deudas.filter(d => d.cliente === nombreCliente);
    
    if (deudasCliente.length === 0) return notificar("No se encontraron deudas para este cliente", "error");

    // 2. Calculamos el total agrupado para mostrarlo en el modal
    const totalUSD = deudasCliente.reduce((sum, d) => sum + parseFloat(d.montoUSD || 0), 0);
    const totalBs = totalUSD * Conversor.tasaActual;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:380px; width:100%; border:1px solid var(--primary); padding:25px; border-radius:20px; text-align:center; color:white;">
            <h3 style="color:var(--primary); margin-bottom:5px;">🤝 Abonar Deuda</h3>
            <p style="font-size:0.9em; opacity:0.8; margin-bottom:5px;">Cliente: <strong>${nombreCliente}</strong></p>
            
            <p style="font-size:1.1em; color:var(--primary); margin-bottom:15px; font-weight:bold;">
                Debe Total: $${totalUSD.toFixed(2)} (${totalBs.toLocaleString('es-VE')} Bs)
            </p>
            
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
    setTimeout(() => document.getElementById('monto-abono').focus(), 100);

    document.getElementById('btn-cerrar-abono').onclick = () => overlay.remove();

    document.getElementById('btn-guardar-abono').onclick = () => {
        const monto = parseFloat(document.getElementById('monto-abono').value);
        const mon = document.getElementById('moneda-abono').value;
        const met = document.getElementById('metodo-abono').value;

        if (isNaN(monto) || monto <= 0) {
            return notificar("Ingrese un monto válido", "error");
        }

        // 3. LLAMAMOS A LA FUNCIÓN QUE PROCESA POR CLIENTE
        const exito = Ventas.abonarDeudaPorCliente(nombreCliente, monto, mon, met);

        if (exito) {
            overlay.remove();
            notificar("Abono registrado con éxito", "fiao");
            if (typeof Interfaz !== 'undefined') {
                Interfaz.actualizarDashboard();
                // Aseguramos que se actualice la vista agrupada
                if (Interfaz.renderFiaos) Interfaz.renderFiaos();
            }
        }
    };
}

}