const Ventas = {
    historial: [],
    deudas: [],
    gastos: [],
    carrito: [], // 👈 NUEVO: Array temporal

    // 👈 NUEVA FUNCIÓN: Guarda en el carrito temporal
prepararParaCarrito(p, m, mon, met, cli, com, esServicio, cant, tallaEscogida) {
    const tasa = Conversor.tasaActual || 1;
    const precioBase = parseFloat(m) || 0;
    let cantidadFinal = parseFloat(cant) || 0;

    // 📦 LÓGICA DE PACAS / BULTOS
    if (tallaEscogida && tallaEscogida.toLowerCase().includes('paca')) {
        const unidadesPorPaca = parseInt(tallaEscogida.match(/\d+/)) || 1;
        cantidadFinal = unidadesPorPaca * cantidadFinal;
    }

    const validarEsteItem = (typeof Inventario !== 'undefined' && Inventario.activo === true && !esServicio);

    const montoBs = (mon === 'BS') ? (precioBase * cantidadFinal) : (precioBase * cantidadFinal) * tasa;
    const montoUSD = (mon === 'USD') ? (precioBase * cantidadFinal) : (precioBase * cantidadFinal) / tasa;

    // 🔊 SONIDO DE ESCÁNER (Feedback inmediato al añadir)
    if (typeof DominusAudio !== 'undefined') DominusAudio.play('add');

    this.carrito.push({
        p, m, mon, met, cli, com, esServicio,
        cant: cantidadFinal,
        tallaEscogida,
        totalBs: Number(montoBs.toFixed(2)),
        totalUSD: Number(montoUSD.toFixed(2)),
        validarInventario: validarEsteItem 
    });

    notificar(`🛒 ${p} añadido`);
    return this.carrito;
},

obtenerTotalVentaActual() {
    return this.carrito.reduce((acc, item) => acc + (parseFloat(item.totalBs) || 0), 0);
},

procesarCobroCarrito() {
    // 1. Validación de carrito vacío
    if (this.carrito.length === 0) {
        // 🔊 SONIDO DE ERROR (Carrito vacío)
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
        if (typeof notificar === 'function') notificar("⚠️ El carrito está vacío", "error");
        return false;
    }

    const modoLibre = (typeof Inventario !== 'undefined' && Inventario.activo === false);
    const totalItems = this.carrito.length;

    try {
        // 🚀 BUCLE DE PROCESAMIENTO
        this.carrito.forEach(item => {
            if (item && item.p) {
                /* LLAMADO A REGISTRAR VENTA:
                   Pasamos un último parámetro en 'true' para indicar que es una venta 
                   por lote (carrito) y que debe silenciar las alertas de stock individuales.
                */
                this.registrarVenta(
                    item.p, 
                    item.m, 
                    item.mon, 
                    item.met, 
                    item.cli, 
                    item.com || 0, 
                    item.esServicio || false, 
                    item.cant || 1, 
                    item.tallaEscogida || null,
                    true // <--- 🔥 FLAG DE SILENCIO (Para evitar la repetición de voz)
                );
            }
        });

        // 🔊 SONIDO DE ÉXITO (Venta completada - Suena una sola vez al final)
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('exito');

        // 📢 NOTIFICACIÓN FINAL
        if (modoLibre) {
            console.log("⚠️ Cobro procesado en MODO LIBRE.");
            if (typeof notificar === 'function') {
                notificar(`✨ Venta de ${totalItems} ítems lista (Modo Libre)`, "info");
            }
        } else {
            if (typeof notificar === 'function') {
                notificar(`✨ Venta de ${totalItems} ítems procesada con éxito`, "exito");
            }
        }

        // 🧹 LIMPIEZA
        this.carrito = []; 
        return true;

    } catch (error) {
        console.error("❌ Error crítico al procesar el cobro:", error);
        
        // 🔊 SONIDO DE ERROR (Fallo técnico)
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
        
        if (typeof notificar === 'function') {
            notificar("Error al procesar el cobro. Revisa el historial.", "error");
        }
        return false;
    }
},

 async init() {
    // --- REGISTRO Y ACTUALIZACIÓN DEL SW ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
        .then(reg => {
            console.log('Dominus: SW registrado');
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        window.location.reload();
                    }
                });
            });
        })
        .catch(err => console.error('Dominus: SW fallo', err));
    }

    // 1. Carga de datos base
    this.historial = Persistencia.cargar('dom_ventas') || [];
    this.deudas = Persistencia.cargar('dom_fiaos') || [];
    this.gastos = Persistencia.cargar('dom_gastos') || [];

    if (typeof Inventario !== 'undefined') Inventario.init();

    // 2. INYECCIÓN DE FRASES AL AZAR
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

    // --- EL NUEVO FLUJO DE CONTROL ---
    
    // Primero: ¿Quién es el usuario?
    const haySesion = Usuario.init();

    if (haySesion) {
        // Segundo: Si el usuario existe, ¿tiene PIN?
        const accesoConcedido = await Seguridad.iniciarProteccion();

        if (accesoConcedido) {
            // 🚀 INYECCIÓN DE AUDIO: Saludamos según la hora (mañana, tarde o noche)
            // Solo sonará una vez al día gracias a la lógica que pusimos en Audio.js
            if (typeof DominusAudio !== 'undefined') {
                DominusAudio.saludarSegunHora();
            }

            // Tercero: Si el PIN es correcto, entramos de una vez
            this.quitarSplash();
        } else {
            // 🔊 Sonido de error si el PIN falla varias veces (opcional)
            if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
            
            alert("Acceso denegado.");
            location.reload();
        }
    }
},

// Función auxiliar para una salida fluida
quitarSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('splash-fade-out');
        setTimeout(() => {
            splash.style.display = 'none';
            if (typeof Interfaz !== 'undefined') Interfaz.show('dashboard');
            
            // 🔊 Opcional: Sonido sutil de "Éxito" al entrar al Dashboard
            // if (typeof DominusAudio !== 'undefined') DominusAudio.play('success');
            
        }, 600); 
    }
},

    

registrarVenta(p, m, mon, met, cli, com = 0, esServicio = false, cant = 1, tallaEscogida = null, esVentaMasiva = false) {
    const tasa = Conversor.tasaActual || 1;
    const precioBase = Number(m) || 0;
    const cantidadVendida = Number(cant) || 0;

    // 🛡️ REGLA DE ORO
    const debeTocarStock = (typeof Inventario !== 'undefined' && Inventario.activo === true && !esServicio);

    // 1. LÓGICA DE INVENTARIO (Unificada)
    const nombreLimpio = p.trim().toLowerCase();
    const inv = Inventario.productos.find(i => i.nombre.toLowerCase() === nombreLimpio);

    if (inv && debeTocarStock) {
        let cantidadARestarGlobal = cantidadVendida;
        
        // Conversiones inteligentes (g, ml, kg, l)
        if ((inv.unidad === 'Kg' || inv.unidad === 'Lts') && tallaEscogida) {
            const medida = tallaEscogida.toLowerCase();
            const valorMedida = parseFloat(medida) || 0;
            if (medida.includes('g') || medida.includes('ml')) {
                cantidadARestarGlobal = (valorMedida / 1000) * cantidadVendida;
            } else if (medida.includes('kg') || medida.includes('l')) {
                cantidadARestarGlobal = valorMedida * cantidadVendida;
            }
        }

        // Resta con precisión
        inv.cantidad = Number((inv.cantidad - cantidadARestarGlobal).toFixed(3));

        // Tallas: Solo restamos si NO es una conversión de peso/volumen
        if (inv.tallas && tallaEscogida && inv.tallas[tallaEscogida] !== undefined) {
            inv.tallas[tallaEscogida] = Math.max(0, Number((inv.tallas[tallaEscogida] - cantidadVendida).toFixed(2)));
        }

        Inventario.sincronizar();
        
        // 🚀 LLAMADA AL CENTINELA (Solo suena si NO es venta masiva)
        // Esto evita que si vendes 5 cosas bajas de stock, suenen 5 voces a la vez.
        if (!esVentaMasiva) {
            Inventario.chequearSaludStock(inv);
        }
    }

    // 2. CÁLCULOS FINANCIEROS
    let montoAjustado = precioBase;
    let idRef = null;

    if (window.creditoDevolucion && window.creditoDevolucion.montoBs > 0) {
        const divisor = cantidadVendida > 0 ? cantidadVendida : 1;
        montoAjustado = Math.max(0, precioBase - (window.creditoDevolucion.montoBs / divisor));
        idRef = window.creditoDevolucion.idOriginal;
    }

    const montoBs = (mon === 'BS') ? (montoAjustado * cantidadVendida) : (montoAjustado * cantidadVendida) * tasa;
    const montoUSD = (mon === 'USD') ? (montoAjustado * cantidadVendida) : (montoAjustado * cantidadVendida) / tasa;
    
    // Comisión (La de tu papá 🤝)
    const montoComision = (Number(montoBs) * (Number(com) / 100));
    const montoAEntregar = esServicio ? (montoBs - montoComision) : 0;

    // 3. ESTRUCTURA DE VENTA
    const datosVenta = {
        id: Date.now() + Math.random(),
        fecha: new Date().toLocaleDateString('es-VE'),
        hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        producto: esServicio ? `PUNTO: ${p}` : (tallaEscogida ? `${p} (${tallaEscogida})` : p),
        productoNombre: p, 
        tallaElegida: tallaEscogida,
        cantidadVenta: cantidadVendida,
        montoBs: Number(montoBs.toFixed(2)),
        montoUSD: Number(montoUSD.toFixed(2)),
        montoTotal: Number(montoBs.toFixed(2)),
        tasaHistorica: tasa,
        monedaOriginal: mon,
        metodo: met,
        comision: montoComision,
        aEntregar: montoAEntregar,
        cliente: cli || "Anónimo",
        esServicio: esServicio,
        inventarioValidado: debeTocarStock, 
        devuelta: false,
        idReferenciaCambio: idRef 
    };

    // 4. PERSISTENCIA
    const storageKey = (met === 'Fiao') ? 'dom_fiaos' : 'dom_ventas';
    let db = Persistencia.cargar(storageKey) || [];
    db.push(datosVenta);
    Persistencia.guardar(storageKey, db);
    
    if (met === 'Fiao') this.deudas = db; else this.historial = db;

    // 5. EFECTO SONORO DE VENTA 🔊
    // 🚀 CAMBIO: Solo suena si NO es venta masiva para evitar ruidos encimados.
    if (!esVentaMasiva && typeof DominusAudio !== 'undefined') {
        if (met !== 'Fiao') {
            DominusAudio.play('add'); 
        } else {
            DominusAudio.play('success');
        }
    }

    // Limpieza de estados globales
    window.creditoDevolucion = null;

    if (typeof Controlador !== 'undefined' && Controlador.renderizarGrafica) {
        Controlador.renderizarGrafica();
    }

    return datosVenta;
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
    const tasa = Conversor.tasaActual || 1; // 🛡️ Seguridad: Evita multiplicar por 0
    
    // Calculamos el monto siempre a 2 decimales para evitar errores de coma flotante
    const montoCalculado = (mon === 'USD') ? (m * tasa) : m;
    const montoBs = Number(montoCalculado.toFixed(2));

 this.gastos.push({
    id: ahora.getTime(),
    descripcion: desc,
    montoOriginal: m, // Para saber exactamente qué anotó el usuario
    monedaOriginal: mon,
    montoBs: Number(montoBs.toFixed(2)),
    montoUSD: Number((montoBs / tasa).toFixed(2)), // Para el reporte en divisas
    fecha: ahora.toLocaleDateString('es-VE'),
    hora: ahora.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
});

    Persistencia.guardar('dom_gastos', this.gastos);
    console.log(`📉 Gasto registrado: ${desc} - ${montoBs} Bs`);
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

    // 4. Registrar en el historial (Explicación abajo)
    historial.push({
        id: ahora.getTime(),
        producto: `Abono Cliente: ${nombreCliente}`,
        montoUSD: abonoOriginalUSD,
        montoBs: abonoOriginalUSD * tasaActual,
        metodo: metodoPago,
        fecha: ahora.toLocaleDateString('es-VE'),
        hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

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
    
    // 🛡️ BLINDAJE 1: Solo contamos ventas de HOY que NO hayan sido devueltas
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

    vHoy.forEach(v => {
        const mBs = Number(v.montoBs) || 0;
        const mUsd = Number(v.montoUSD) || 0;
        detalleMetodos.comisiones += (Number(v.comision) || 0);

        // Lógica de separación por método
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
            // Entra aquí si es Efectivo BS
            efecBS += mBs;
        }
    });

    const totalGastos = gastos.filter(g => g.fecha === hoy)
                              .reduce((acc, g) => acc + (Number(g.montoBs) || 0), 0);

    const usdConvertidos = efecUSD * (Conversor.tasaActual || 0);

    // 🛡️ BLINDAJE 2: Redondeo a 2 decimales para que el balance sea exacto
    return {
        efectivoBS: Number(efecBS.toFixed(2)),
        efectivoUSD: Number(efecUSD.toFixed(2)),
        digital: Number(digital.toFixed(2)),
        gastos: Number(totalGastos.toFixed(2)), 
        detalle: detalleMetodos, 
        balanceNeto: Number((efecBS + digital + usdConvertidos).toFixed(2)),
        conteoVentas: vHoy.length
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