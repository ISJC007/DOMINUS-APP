const Ventas = {
    historial: [],
    deudas: [],
    gastos: [],
    carrito: [], 
    cierreRealizado: false,
    // 👈 NUEVO: Array temporal

    // 👈 NUEVA FUNCIÓN: Guarda en el carrito temporal
prepararParaCarrito(p, m, mon, met, cli, com, esServicio, cant, tallaEscogida) {
    const tasa = Conversor.tasaActual || 1;
    const precioBase = parseFloat(m) || 0;
    let cantidadOperativa = parseFloat(cant) || 1;

    // 1. 📦 LÓGICA DE PACAS / BULTOS (Normalización de cantidad)
    if (tallaEscogida && tallaEscogida.toLowerCase().includes('paca')) {
        const unidadesPorPaca = parseInt(tallaEscogida.match(/\d+/)) || 1;
        cantidadOperativa = unidadesPorPaca * cantidadOperativa;
    }

    // 🚀 NOVEDAD: PRE-CHEQUEO DE STOCK (Antes de agrupar o añadir)
    const validarEsteItem = (typeof Inventario !== 'undefined' && Inventario.activo === true && !esServicio);
    
    if (validarEsteItem) {
        const nombreBusqueda = p.trim().toLowerCase();
        const inv = Inventario.productos.find(i => i.nombre.toLowerCase() === nombreBusqueda);
        
        if (inv) {
            // Calculamos la cantidad total que habría en el carrito si sumamos esta
            const yaEnCarrito = this.carrito
                .filter(item => item.p === p && item.tallaEscogida === tallaEscogida)
                .reduce((acc, item) => acc + item.cant, 0);
            
            const cantidadTotalProyectada = yaEnCarrito + cantidadOperativa;

            // Llamamos al experto para ver el futuro
            // Nota: Debes asegurarte de haber actualizado chequearSaludStock con el segundo parámetro
            Inventario.chequearSaludStock(inv, cantidadTotalProyectada);
        }
    }

    // 2. 🔍 DETECCIÓN DE DUPLICADOS (Agrupación inteligente)
    const indexExistente = this.carrito.findIndex(item => 
        item.p === p && 
        item.m === precioBase && 
        item.tallaEscogida === tallaEscogida &&
        item.met === met && 
        item.esServicio === esServicio
    );

    if (indexExistente !== -1) {
        this.carrito[indexExistente].cant += cantidadOperativa;
        const nuevaCant = this.carrito[indexExistente].cant;
        const baseCalculo = precioBase * nuevaCant;

        this.carrito[indexExistente].totalBs = Number((mon === 'BS' ? baseCalculo : baseCalculo * tasa).toFixed(2));
        this.carrito[indexExistente].totalUSD = Number((mon === 'USD' ? baseCalculo : baseCalculo / tasa).toFixed(2));
        
        console.log(`DOMINUS: Agrupado ${cantidadOperativa} unidades a ${p}`);
    } else {
        // 3. 🆕 REGISTRO NUEVO
        const baseCalculo = precioBase * cantidadOperativa;
        const montoBs = (mon === 'BS') ? baseCalculo : baseCalculo * tasa;
        const montoUSD = (mon === 'USD') ? baseCalculo : baseCalculo / tasa;

        this.carrito.push({
            p, m: precioBase, mon, met, cli, com, esServicio,
            cant: cantidadOperativa,
            tallaEscogida,
            totalBs: Number(montoBs.toFixed(2)),
            totalUSD: Number(montoUSD.toFixed(2)),
            validarInventario: validarEsteItem 
        });
    }

    // 4. 🔊 FEEDBACK Y UX
    if (typeof DominusAudio !== 'undefined') DominusAudio.play('add');

    if (!window.scannerActivo) {
        notificar(`🛒 ${p} añadido`);
    }

    return this.carrito;
},

obtenerTotalVentaActual() {
    return this.carrito.reduce((acc, item) => acc + (parseFloat(item.totalBs) || 0), 0);
},

procesarCobroCarrito() {
    // 1. Validación de carrito vacío
    if (this.carrito.length === 0) {
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
        if (typeof notificar === 'function') notificar("⚠️ El carrito está vacío", "error");
        return false;
    }

    // --- 🔑 INICIO DE LÓGICA DE TICKET Y CLIENTE ---
    const ventasHistorial = Persistencia.cargar('dom_ventas') || [];
    const hoy = new Date().toLocaleDateString('es-VE');
    
    // Calculamos el próximo número de cliente del día
    const ventasHoy = ventasHistorial.filter(v => v.fecha === hoy);
    const idsUnicosHoy = [...new Set(ventasHoy.map(v => v.idTransaccion))];
    
    // Obtenemos el nombre del input (si está vacío, asignamos número)
    let nombreClienteFinal = document.getElementById('v-cliente')?.value.trim();
    if (!nombreClienteFinal) {
        nombreClienteFinal = `Cliente ${idsUnicosHoy.length + 1}`;
    }

    // Generamos un ID único para toda esta compra
    const idTicketActual = `T-${Date.now()}`;
    // --- 🔑 FIN DE LÓGICA DE TICKET ---

    const modoLibre = (typeof Inventario !== 'undefined' && Inventario.activo === false);
    const totalItems = this.carrito.length;
    const productosParaChequear = [...new Set(this.carrito.map(item => item.p.trim().toLowerCase()))];

    try {
        // 🚀 BUCLE DE PROCESAMIENTO
        this.carrito.forEach(item => {
            if (item && item.p) {
                // Pasamos el ID del ticket y el nombre calculado a registrarVenta
                this.registrarVenta(
                    item.p, 
                    item.m, 
                    item.mon, 
                    item.met, 
                    nombreClienteFinal, // 👤 Usamos nuestro nombre/número calculado
                    item.com || 0, 
                    item.esServicio || false, 
                    item.cant || 1, 
                    item.tallaEscogida || null,
                    true,
                    idTicketActual // 🎫 Pasamos el ID del ticket como nuevo argumento
                );
            }
        });

        // ... (Tu lógica de chequeo de salud de stock se mantiene igual) ...
        if (!modoLibre && typeof Inventario !== 'undefined' && typeof Inventario.chequearSaludStock === 'function') {
            productosParaChequear.forEach(nombre => {
                const inv = Inventario.productos.find(i => i.nombre.toLowerCase() === nombre);
                if (inv) Inventario.chequearSaludStock(inv);
            });
        }

        if (typeof DominusAudio !== 'undefined') DominusAudio.play('exito');

        // Notificación profesional con el nombre del cliente
        notificar(`✨ Venta de ${nombreClienteFinal} procesada`, "exito");

        this.carrito = []; 
        if (window.scannerActivo && typeof Scanner !== 'undefined') {
            Scanner.detenerYSalir();
        }

        return true;

    } catch (error) {
        console.error("❌ Error crítico al procesar el cobro:", error);
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
        return false;
    }
},

registrarVenta(p, m, mon, met, cli, com = 0, esServicio = false, cant = 1, tallaEscogida = null, esVentaMasiva = false, idTicketRecibido = null) {
    const tasa = Conversor.tasaActual || 1;
    const precioBase = Number(m) || 0;
    const cantidadVendida = Number(cant) || 0;

    // 🛡️ REGLA DE ORO: Solo tocamos stock si el inventario está activo y no es un servicio (punto)
    const debeTocarStock = (typeof Inventario !== 'undefined' && Inventario.activo === true && !esServicio);

    // 1. 🔍 LÓGICA DE INVENTARIO Y PESAJE
    let cantidadEfectivaRestada = cantidadVendida; 

    if (debeTocarStock) {
        const nombreLimpio = p.trim().toLowerCase();
        const inv = Inventario.productos.find(i => i.nombre.toLowerCase() === nombreLimpio);
        
        if (inv) {
            // Conversiones inteligentes para productos pesables (Kg, Lts)
            if ((inv.unidad === 'Kg' || inv.unidad === 'Lts') && tallaEscogida) {
                const medida = tallaEscogida.toLowerCase();
                const valorMedida = parseFloat(medida) || 0;
                
                if (medida.includes('g') || medida.includes('ml')) {
                    cantidadEfectivaRestada = (valorMedida / 1000) * cantidadVendida;
                } else if (medida.includes('kg') || medida.includes('l')) {
                    cantidadEfectivaRestada = valorMedida * cantidadVendida;
                }
            }
            // 🚀 DELEGACIÓN AL EXPERTO
            Inventario.descontar(p, cantidadEfectivaRestada, tallaEscogida);
        }
    }

    // 2. 💰 CÁLCULOS FINANCIEROS
    let montoAjustado = precioBase;
    let idRef = null;

    if (window.creditoDevolucion && window.creditoDevolucion.montoBs > 0) {
        const divisor = cantidadVendida > 0 ? cantidadVendida : 1;
        montoAjustado = Math.max(0, precioBase - (window.creditoDevolucion.montoBs / divisor));
        idRef = window.creditoDevolucion.idOriginal;
    }

    const montoBs = (mon === 'BS') ? (montoAjustado * cantidadVendida) : (montoAjustado * cantidadVendida) * tasa;
    const montoUSD = (mon === 'USD') ? (montoAjustado * cantidadVendida) : (montoAjustado * cantidadVendida) / tasa;
    
    const montoComision = (Number(montoBs) * (Number(com) / 100));
    const montoAEntregar = esServicio ? (montoBs - montoComision) : 0;

    // 3. 🎫 ESTRUCTURA DEL OBJETO VENTA
    const datosVenta = {
        id: Date.now() + Math.random(),
        idTransaccion: idTicketRecibido || `T-${Date.now()}`,
        fecha: new Date().toLocaleDateString('es-VE'),
        hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        producto: esServicio ? `PUNTO: ${p}` : (tallaEscogida ? `${p} (${tallaEscogida})` : p),
        productoNombre: p, 
        tallaElegida: tallaEscogida,
        cantidadVenta: cantidadVendida,
        cantidadARestarInv: cantidadEfectivaRestada,
        montoBs: Number(montoBs.toFixed(2)),
        montoUSD: Number(montoUSD.toFixed(2)),
        montoTotal: Number(montoBs.toFixed(2)),
        tasaHistorica: tasa,
        monedaOriginal: mon,
        metodo: met,
        comision: montoComision,
        aEntregar: montoAEntregar,
        cliente: cli || "Cliente General",
        esServicio: esServicio,
        inventarioValidado: debeTocarStock, 
        devuelta: false,
        idReferenciaCambio: idRef 
    };

    // 4. 💾 PERSISTENCIA
    const storageKey = (met === 'Fiao') ? 'dom_fiaos' : 'dom_ventas';
    let db = Persistencia.cargar(storageKey) || [];
    db.push(datosVenta);
    Persistencia.guardar(storageKey, db);
    
    if (met === 'Fiao') this.deudas = db; else this.historial = db;

    // 🛡️ REACCIÓN DEL CENTINELA
    if (typeof Notificaciones !== 'undefined') {
        
        // 🚩 NOVEDAD: Resetear el estado de "Visto" si ocurre algo nuevo
        if (met === 'Fiao') {
            Notificaciones.resetVisto('fiaos'); // Despierta la burbuja de fiaos
        }
        
        if (debeTocarStock) {
            Notificaciones.resetVisto('inventario'); // Despierta la burbuja de stock
            
            // Si el stock bajó demasiado, lanzar notificación nativa
            const prodStock = Inventario.productos.find(i => i.nombre.toLowerCase() === p.trim().toLowerCase());
            if (prodStock && prodStock.cantidad <= (prodStock.stockMinimo || 3)) {
                Notificaciones.enviarNotificacionNativa("Stock Crítico", `El producto ${p} se está agotando.`);
            }
        }

        // Refrescar visualmente los badges
        Notificaciones.revisarTodo();
    }

    // 5. 🔊 UX Y FINALIZACIÓN
    if (!esVentaMasiva && typeof DominusAudio !== 'undefined') {
        DominusAudio.play(met === 'Fiao' ? 'success' : 'add');
    }

    window.creditoDevolucion = null;

    if (typeof Controlador !== 'undefined' && Controlador.renderizarGrafica) {
        Controlador.renderizarGrafica();
    }

    return datosVenta;
},

anularProductoIndividual: function(idProd, idTick) {
    const ventas = Persistencia.cargar('dom_ventas') || [];
    
    const item = ventas.find(v => 
        v.id.toString() === idProd.toString() && 
        v.idTransaccion.toString().trim() === idTick.toString().trim()
    );

    if (!item) {
        console.error("DOMINUS: No se encontró el registro.");
        if (typeof notificar === 'function') notificar("Error: Registro no encontrado", "error");
        return;
    }

    if (confirm(`¿Anular la venta de ${item.producto}?`)) {
        // 1. 🚀 Usamos tu lógica de Inventario con tus campos reales:
        if (typeof Inventario !== 'undefined' && typeof Inventario.devolver === 'function') {
            // Usamos 'tallaElegida' porque así lo bautizaste en registrarVenta
            Inventario.devolver(item.producto, item.cantidadVenta, item.tallaElegida);
        }

        // 2. Marcamos como devuelta
        item.devuelta = true;

        // 3. Persistencia y Render
        Persistencia.guardar('dom_ventas', ventas);
        Interfaz.renderVentas();
        
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
    }
},

anularVenta: function(id) {
    const idNum = Number(id);
    const v = Ventas.historial.find(item => item.id === idNum);
    
    if (!v) {
        return notificar("❌ Error: Venta no encontrada", "error");
    }

    // 🛡️ DETECCIÓN DE MODO: ¿Esta venta restó stock realmente?
    // Usamos 'inventarioValidado', la propiedad que guardamos al cobrar.
    const fueVentaConStock = (v.inventarioValidado === true && !v.esServicio);
    
    // Mensaje dinámico para que el usuario sepa qué va a pasar
    const mensajeConfirmar = fueVentaConStock 
        ? `¿Estás seguro de anular "${v.producto}"? El stock se devolverá al inventario.`
        : `¿Anular registro de "${v.producto}"? (Esta venta no afectó el stock).`;

    Interfaz.confirmarAccion(
        "¿Anular Venta?",
        mensajeConfirmar,
        () => {
            // --- LÓGICA DE REVERSIÓN ---
            
            // Solo devolvemos si la venta original REALMENTE tocó el inventario
            if (fueVentaConStock && typeof Inventario !== 'undefined') {
                // Aquí usamos tu lógica de devolución (nombre, cantidad, talla)
                Inventario.devolver(v.productoNombre || v.producto, v.cantidadVenta, v.tallaElegida);
            }

            // Filtramos el historial para eliminar la venta
            Ventas.historial = Ventas.historial.filter(item => item.id !== idNum);
            Persistencia.guardar('dom_ventas', Ventas.historial);
            
            // Sincronización total de la Interfaz
            if (typeof Interfaz !== 'undefined') {
                if (typeof Interfaz.actualizarDashboard === 'function') Interfaz.actualizarDashboard();
                if (typeof Interfaz.renderInventario === 'function') Interfaz.renderInventario();
                if (typeof Interfaz.renderVentas === 'function') Interfaz.renderVentas();
            }
            
            const msjExito = fueVentaConStock 
                ? "🗑️ Venta anulada y stock recuperado" 
                : "🗑️ Registro eliminado del historial";
                
            notificar(msjExito, "exito");
        },
        null,
        "Sí, anular",
        "Cancelar",
        true // Color rojo de peligro
    );
},
registrarGasto(desc, m, mon) {
    const ahora = new Date();
    const tasa = Conversor.tasaActual || 1;
    
    // 1. Cargamos historial real para no sobrescribir nada por error
    this.gastos = Persistencia.cargar('dom_gastos') || [];

    // 2. Cálculos limpios desde el origen (m)
    let montoBs, montoUSD;

    if (mon === 'USD') {
        montoUSD = m;
        montoBs = m * tasa;
    } else {
        montoBs = m;
        montoUSD = m / tasa;
    }

    // 3. Creación del objeto con datos blindados
    const nuevoGasto = {
        id: ahora.getTime(),
        descripcion: desc,
        montoOriginal: Number(m), 
        monedaOriginal: mon,
        montoBs: Number(montoBs.toFixed(2)),
        montoUSD: Number(montoUSD.toFixed(2)),
        tasaHistorica: tasa, // 👈 Importante guardar la tasa que se usó
        fecha: ahora.toLocaleDateString('es-VE'),
        hora: ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
    };

    this.gastos.push(nuevoGasto);

    // 4. Persistencia y Log
    Persistencia.guardar('dom_gastos', this.gastos);
    console.log(`📉 Gasto registrado: ${desc} - ${nuevoGasto.montoBs} Bs ($${nuevoGasto.montoUSD})`);
},

eliminarGasto(id) {
    Interfaz.confirmarAccion(
        "¿Eliminar Gasto?",
        "Esta acción no se puede deshacer.",
        () => {
            // Convertimos el id a número por si viene como string desde el HTML
            this.gastos = Persistencia.cargar('dom_gastos') || [];
            this.gastos = this.gastos.filter(g => g.id !== Number(id));
            
            Persistencia.guardar('dom_gastos', this.gastos);
            
            if (typeof Interfaz !== 'undefined') {
                Interfaz.renderGastos();
                Interfaz.actualizarDashboard();
            }
            notificar("🗑️ Gasto eliminado", "exito");
        },
        null, "Sí, borrar", "Cancelar", true // True porque es acción destructiva (Rojo)
    );
},

abonarDeudaPorCliente(nombreCliente, montoAbono, moneda, metodoPago) {
    let fiaos = Persistencia.cargar('dom_fiaos') || [];
    let historial = Persistencia.cargar('dom_ventas') || [];
    const tasaActual = Conversor.tasaActual;
    const ahora = new Date();

    // Normalizamos el nombre de búsqueda para que no importen mayúsculas/minúsculas
    const nombreBusqueda = nombreCliente.trim().toLowerCase();

    // 1. Convertir TODO el abono a USD para trabajar con valor real
    let abonoRestanteUSD = (moneda === 'USD') ? montoAbono : (montoAbono / tasaActual);
    const abonoOriginalUSD = abonoRestanteUSD; 

    // 2. Filtrado Inteligente (Inmune a Mayúsculas/Minúsculas)
    let deudasCliente = fiaos
        .filter(f => (f.cliente || "").trim().toLowerCase() === nombreBusqueda)
        .sort((a, b) => a.id - b.id); 

    // 3. Procesar abono inteligente
    for (let i = 0; i < deudasCliente.length; i++) {
        if (abonoRestanteUSD <= 0) break;

        let deudaActual = deudasCliente[i];
        let montoDeudaUSD = parseFloat(deudaActual.montoUSD || 0);

        if (abonoRestanteUSD >= (montoDeudaUSD - 0.001)) { // Margen de error por decimales
            abonoRestanteUSD -= montoDeudaUSD;
            fiaos = fiaos.filter(f => f.id !== deudaActual.id);
        } else {
            // Aplicamos Number().toFixed(2) para que no salgan decimales infinitos
            deudaActual.montoUSD = Number((montoDeudaUSD - abonoRestanteUSD).toFixed(2));
            deudaActual.montoBs = Number((deudaActual.montoUSD * tasaActual).toFixed(2));
            abonoRestanteUSD = 0;
            
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

    // --- GUARDADO ---
    Persistencia.guardar('dom_fiaos', fiaos);
    Persistencia.guardar('dom_ventas', historial);

    // 🛡️ ACTUALIZACIÓN DEL CENTINELA
    // Llamamos a revisarTodo para que la burbuja de créditos se actualice 
    // inmediatamente después de que el abono afecte la lista de fiaos.
    if (typeof Notificaciones !== 'undefined') {
        Notificaciones.revisarTodo();
    }

    return true;
},

editarDeudaEspecifica(id) {
    let fiaos = Persistencia.cargar('dom_fiaos') || [];
    const deuda = fiaos.find(d => d.id === Number(id));

    if (!deuda) return notificar("No se encontró el registro", "error");

    // --- CREAMOS EL MODAL ESTÉTICO DINÁMICAMENTE ---
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
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
            
            // 🛡️ ACTUALIZACIÓN DEL CENTINELA
            // Necesario por si el cambio de monto afecta alguna lógica de alertas futuras
            if (typeof Notificaciones !== 'undefined') {
                Notificaciones.revisarTodo();
            }

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

    // 1. Botón Cancelar
    document.getElementById('btn-cancelar-eliminar').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    // 2. Botón Eliminar
    document.getElementById('btn-confirmar-eliminar').addEventListener('click', () => {
        // 1. ELIMINAMOS EL REGISTRO
        fiaos = fiaos.filter(d => d.id !== Number(id));
        
        // 2. GUARDAMOS EL ESTADO LIMPIO
        Persistencia.guardar('dom_fiaos', fiaos);
        this.deudas = fiaos; 

        // 🛡️ ACTUALIZACIÓN DEL CENTINELA
        // Si se eliminó la deuda, el contador de fiaos en el menú debe refrescarse
        if (typeof Notificaciones !== 'undefined') {
            Notificaciones.revisarTodo();
        }
        
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
    
    // 🛡️ BLINDAJE 1: Solo hoy y que no sean devoluciones
    const vHoy = ventas.filter(v => v.fecha === hoy && !v.devuelta);
    
    let efecBS = 0;
    let efecUSD = 0;
    let digital = 0;
    
    let detalleMetodos = {
        pagoMovil: 0,
        biopago: 0,
        punto: 0,
        comisiones: 0
    };

    // 🚀 LÓGICA DE TICKETS: Usamos un Set para contar clientes reales
    const ticketsUnicos = new Set();

    vHoy.forEach(v => {
        const mBs = Number(v.montoBs) || 0;
        const mUsd = Number(v.montoUSD) || 0;
        detalleMetodos.comisiones += (Number(v.comision) || 0);

        // Agregamos la llave del ticket (idTransaccion o la combinación hora-cliente)
        const idTicket = v.idTransaccion || `${v.fecha}-${v.hora}-${v.cliente}`;
        ticketsUnicos.add(idTicket);

        // Clasificación de dinero
        if (v.monedaOriginal === 'USD') {
            efecUSD += mUsd;
        } else if (v.metodo === 'Pago Móvil') {
            digital += mBs;
            detalleMetodos.pagoMovil += mBs;
        } else if (v.metodo === 'Biopago') {
            digital += mBs;
            detalleMetodos.biopago += mBs;
        } else if (v.metodo === 'Punto') {
            digital += mBs;
            detalleMetodos.punto += mBs;
        } else if (v.metodo !== 'Fiao') {
            efecBS += mBs;
        }
    });

    const totalGastos = gastos.filter(g => g.fecha === hoy)
                              .reduce((acc, g) => acc + (Number(g.montoBs) || 0), 0);

    const usdConvertidos = efecUSD * (Conversor.tasaActual || 0);

    // 🛡️ BLINDAJE 2: Balance exacto con redondeo
    return {
        efectivoBS: Number(efecBS.toFixed(2)),
        efectivoUSD: Number(efecUSD.toFixed(2)),
        digital: Number(digital.toFixed(2)),
        gastos: Number(totalGastos.toFixed(2)), 
        detalle: detalleMetodos, 
        balanceNeto: Number((efecBS + digital + usdConvertidos).toFixed(2)),
        // 🏁 Representa la cantidad de clientes/tickets del día
        conteoVentas: ticketsUnicos.size 
    };
},

limpiarJornada() {
    // 🛡️ Antes de borrar, verificamos que el historial tenga los datos
    // (Opcional, pero te da una capa extra de seguridad)
    this.historial = [];
    
    // Limpiamos las tablas temporales del día
    Persistencia.guardar('dom_ventas', []);
    Persistencia.guardar('dom_gastos', []);
    
    // Si usas una variable de estado en el objeto Ventas, resetéala también
    if (this.ventasHoy) this.ventasHoy = [];
    
    console.log("🚀 DOMINUS: Mesa limpia para el próximo turno.");
    notificar("Datos del día limpiados correctamente", "exito");
},

/**
 * Abre la interfaz para registrar un abono a la deuda total de un cliente.
 * @param {string} nombreCliente - Nombre del deudor.
 */
abrirProcesoAbono(nombreCliente) {
    // 1. SINCRONIZACIÓN DE DATOS (Single Source of Truth)
    const todosLosFiaos = Persistencia.cargar('dom_fiaos') || [];
    Ventas.deudas = todosLosFiaos; 

    const deudasCliente = Ventas.deudas.filter(d => d.cliente === nombreCliente);
    if (deudasCliente.length === 0) return notificar("No hay deudas pendientes", "error");

    // 2. CÁLCULOS DE SALDO
    const totalUSD = deudasCliente.reduce((sum, d) => sum + parseFloat(d.montoUSD || 0), 0);
    const tasa = Conversor.tasaActual || 1;
    const totalBs = totalUSD * tasa;

    const overlay = Usuario.crearOverlay('overlay-abono');
    
    overlay.innerHTML = `
        <div class="card glass" style="max-width:400px; width:100%; padding:30px; border-radius:25px; text-align:center; border:1px solid rgba(255,215,0,0.2);">
            <h3 style="color:var(--primary); margin-bottom:5px; letter-spacing:1px;">🤝 REGISTRAR ABONO</h3>
            <p style="font-size:0.9em; opacity:0.7;">Cliente: <span style="color:white; font-weight:bold;">${nombreCliente}</span></p>
            
            <div class="deuda-total-highlight">
                <span style="display:block; font-size:0.8em; opacity:0.6; text-transform:uppercase;">Saldo Pendiente</span>
                <span style="font-size:1.6rem; color:var(--primary); font-weight:bold;">$${totalUSD.toFixed(2)}</span>
                <span style="display:block; font-size:0.9em; opacity:0.8;">≈ ${totalBs.toLocaleString('es-VE')} Bs.</span>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:15px; margin-bottom:25px;">
                <div style="position:relative;">
                    <input type="number" id="monto-abono" placeholder="0.00" step="any"
                           style="width:100%; padding:15px; border-radius:12px; border:2px solid #333; background:#111; color:var(--primary); font-size:1.5rem; text-align:center; outline:none; transition:0.3s;">
                    <div id="conversion-live" style="font-size:0.8em; color:#888; margin-top:5px;">Equivale a: $0.00</div>
                </div>
                
                <div style="display:flex; gap:10px;">
                    <select id="moneda-abono" style="flex:1; padding:12px; border-radius:10px; background:#222; color:white; border:1px solid #444; cursor:pointer;">
                        <option value="USD">$ Dólares</option>
                        <option value="BS">Bs Bolívares</option>
                    </select>

                    <select id="metodo-abono" style="flex:1; padding:12px; border-radius:10px; background:#222; color:white; border:1px solid #444; cursor:pointer;">
                        <option value="Efectivo">Efectivo</option>
                        <option value="Pago Móvil">Pago Móvil</option>
                        <option value="Transferencia">Transferencia</option>
                    </select>
                </div>
            </div>

            <div style="display:flex; gap:12px;">
                <button id="btn-cerrar-abono" class="btn-main" style="background:#333; flex:1; padding:15px;">CANCELAR</button>
                <button id="btn-guardar-abono" class="btn-main" style="flex:1; padding:15px; font-weight:bold;">CONFIRMAR</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // CAPTURA DE ELEMENTOS
    const inputMonto = document.getElementById('monto-abono');
    const selectMoneda = document.getElementById('moneda-abono');
    const labelLive = document.getElementById('conversion-live');
    const btnGuardar = document.getElementById('btn-guardar-abono');

    setTimeout(() => inputMonto.focus(), 150);

    // --- LÓGICA DE CONVERSIÓN EN VIVO ---
    const actualizarConversion = () => {
        const val = parseFloat(inputMonto.value) || 0;
        if (selectMoneda.value === 'BS') {
            const enUSD = val / tasa;
            labelLive.innerText = `Equivale a: $${enUSD.toFixed(2)}`;
            if (enUSD > (totalUSD + 0.01)) inputMonto.style.borderColor = "#ff4444";
            else inputMonto.style.borderColor = "var(--primary)";
        } else {
            labelLive.innerText = `Equivale a: ${(val * tasa).toLocaleString('es-VE')} Bs.`;
            if (val > (totalUSD + 0.01)) inputMonto.style.borderColor = "#ff4444";
            else inputMonto.style.borderColor = "var(--primary)";
        }
    };

    inputMonto.oninput = actualizarConversion;
    selectMoneda.onchange = actualizarConversion;

    // --- GUARDADO ---
    document.getElementById('btn-cerrar-abono').onclick = () => overlay.remove();

    btnGuardar.onclick = () => {
        const monto = parseFloat(inputMonto.value);
        const mon = selectMoneda.value;
        const met = document.getElementById('metodo-abono').value;

        if (isNaN(monto) || monto <= 0) return notificar("Monto inválido", "error");
        
        // Validación de sobrepago (opcional, por si no quieres que el saldo sea negativo)
        const montoEnUSD = mon === 'USD' ? monto : monto / tasa;
        if (montoEnUSD > (totalUSD + 0.01)) {
            if (!confirm("El abono supera la deuda. ¿Deseas dejar el saldo a favor?")) return;
        }

        const exito = Ventas.abonarDeudaPorCliente(nombreCliente, monto, mon, met);

        if (exito) {
            overlay.remove();
            notificar(`¡Abono de ${monto} ${mon} registrado!`, 'exito');
            if (typeof Interfaz !== 'undefined') {
                Interfaz.actualizarDashboard();
                if (Interfaz.renderFiaos) Interfaz.renderFiaos();
            }
        }
    };
},

}

// --- JS/Ventas.js ---

const HistorialDevoluciones = {
    registrarVentaParaHistorial: function(datosVenta) {
        let historial = Persistencia.cargar('dom_historial_ventas') || [];
        
        if (!historial.find(v => v.id === datosVenta.id)) {
            historial.push(datosVenta);
            Persistencia.guardar('dom_historial_ventas', historial);
            console.log("✅ Venta registrada en historial permanente.");
        }
    },

    buscarVentaPorProducto: function(nombreProducto) {
        let historial = Persistencia.cargar('dom_historial_ventas') || [];
        
        // 🚀 FILTRO: Solo mostrar ventas que NO han sido devueltas y coincidan
        const resultados = historial.filter(venta => 
            !venta.devuelta && 
            venta.productoNombre && 
            venta.productoNombre.toLowerCase().includes(nombreProducto.toLowerCase())
        );

        // 🛡️ BLINDAJE: Ordenar por más reciente y limitar a los últimos 30 resultados
        // Esto mantiene el modal rápido aunque tengas 10.000 ventas grabadas.
        return resultados.sort((a, b) => b.id - a.id).slice(0, 30);
    },

    marcarComoDevuelta: function(idVenta) {
        let historial = Persistencia.cargar('dom_historial_ventas') || [];
        const index = historial.findIndex(v => v.id === idVenta);
        
        if (index !== -1) {
            historial[index].devuelta = true; 
            Persistencia.guardar('dom_historial_ventas', historial);
            
            // 🛡️ BLINDAJE: Si el historial diario también tiene esta venta, la marcamos ahí también
            // Esto evita que el dinero de esa venta siga apareciendo en el total del día
            let historialDiario = Persistencia.cargar('dom_ventas') || [];
            const indexDiario = historialDiario.findIndex(v => v.id === idVenta);
            if(indexDiario !== -1) {
                historialDiario[indexDiario].devuelta = true;
                Persistencia.guardar('dom_ventas', historialDiario);
            }

            console.log(`✅ Venta ${idVenta} marcada como devuelta en todos los registros.`);
        }
    }
};