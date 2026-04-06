let tallasTemporales = {}; // o el valor inicial correcto
let miGrafica = null;
let modoGraficaActual = 0;
const modalEleccion = {
    abrir: function(config) {
        // 1. Limpieza inmediata sin animaciones para evitar conflictos de IDs
        const modalPrevio = document.getElementById('modal-dinamico');
        if (modalPrevio) modalPrevio.remove();

        const html = `
            <div id="modal-dinamico" class="modal-eleccion active">
                <div class="eleccion-content glass">
                    <h3 style="color:var(--primary); margin-bottom:10px;">${config.titulo}</h3>
                    <p style="color:white; opacity:0.8; margin-bottom:20px;">${config.mensaje}</p>
                    <div id="contenedor-inputs-modal"></div>
                    <div id="btns-dinamicos" class="btns-eleccion" style="display: flex; flex-direction: column; gap: 10px;">
                    </div>
                    <button class="btn-no" onclick="modalEleccion.cerrar()" style="margin-top:15px; width:100%; opacity: 0.7;">Cancelar</button>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        // 2. Referencia al contenedor de botones
        const contenedorBtns = document.getElementById('btns-dinamicos');

        config.botones.forEach(btn => {
            const b = document.createElement('button');
            
            // Si no pasas clase, usa 'btn-si', si no, usa la que pases (ej. 'btn-main')
            b.className = btn.clase || 'btn-si';
            b.innerHTML = btn.texto;
            
            // 🔥 CLAVE: Aplicar estilos directos (colores, márgenes, etc.)
            if (btn.style) {
                b.style.cssText = btn.style;
            }

            b.onclick = () => { 
                // Ejecutamos la acción
                btn.accion(); 
                // Solo cerramos si no se pide explícitamente mantenerlo (para submenús)
                if(!btn.mantener) modalEleccion.cerrar(); 
            };
            
            contenedorBtns.appendChild(b);
        });
    },

    cerrar: function() {
        const m = document.getElementById('modal-dinamico');
        if(m) {
            m.classList.remove('active');
            m.style.opacity = '0';
            // Esperamos a que termine la transición de CSS antes de borrar del DOM
            setTimeout(() => {
                if(m) m.remove();
            }, 300);
        }
    }
};

const InterfazDevoluciones = {
    abrirSelectorDevolucion: function() {
        if (document.getElementById('modal-devoluciones')) return; 

        modalEleccion.abrir({
            titulo: "🔄 Cambio / Devolución",
            mensaje: "Ingrese el nombre del producto vendido:",
            botones: [],
            clase: "modal-devoluciones"
        });

        const contenedor = document.getElementById('contenedor-inputs-modal');
        contenedor.innerHTML = `
            <input type="text" id="busqueda-producto-dev" name="busqueda-producto-dev" placeholder="Ej. Jordan..." style="width:100%; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #444; background:#222; color:white; box-sizing: border-box;">
            <div id="resultados-busqueda-dev" style="max-height: 200px; overflow-y: auto;"></div>
        `;

        document.getElementById('busqueda-producto-dev').oninput = (e) => {
            const nombre = e.target.value;
            if (nombre.length < 2) {
                document.getElementById('resultados-busqueda-dev').innerHTML = "";
                return;
            }
            const ventasEncontradas = HistorialDevoluciones.buscarVentaPorProducto(nombre);
            this.renderizarResultados(ventasEncontradas);
        };
    },

    renderizarResultados: function(ventas) {
        const contenedor = document.getElementById('resultados-busqueda-dev');
        contenedor.innerHTML = "";

        if (ventas.length === 0) {
            contenedor.innerHTML = "<p style='text-align:center; opacity:0.5;'>No se encontraron ventas activas.</p>";
            return;
        }

        ventas.forEach(venta => {
            const tarjeta = document.createElement('div');
            tarjeta.style = "padding:10px; border-bottom:1px solid #444; cursor:pointer; display:flex; justify-content:space-between; align-items:center;";
            tarjeta.innerHTML = `
                <div>
                    <strong>${venta.producto}</strong><br>
                    <small style="opacity:0.7">${venta.fecha} - ${venta.montoTotal} Bs</small>
                </div>
                <div style="font-size:1.2rem; color:var(--primary); font-weight:bold;">
                    ${venta.id.toString().slice(-4)}
                </div>
            `;
            tarjeta.onclick = () => this.solicitarConfirmacion(venta);
            contenedor.appendChild(tarjeta);
        });
    },

    solicitarConfirmacion: function(venta) {
        // 🔥 CLAVE: Cerramos el modal de búsqueda primero para evitar conflictos
        modalEleccion.cerrar();

        const codigoVenta = venta.id.toString().slice(-4);
        
        // 🔥 Llamada a confirmarAccion en el ámbito global o en Interfaz
        Interfaz.confirmarAccion(
            "🛡️ Confirmación de Seguridad",
            `Ingrese los últimos 4 dígitos de la venta (${codigoVenta}) para aprobar la devolución/cambio:`,
            () => { // onConfirmar
                const codigoInput = document.getElementById('codigo-seguridad');
                if (codigoInput && codigoInput.value === codigoVenta) {
                    this.prepararCambio(venta);
                } else {
                    notificar("❌ Código incorrecto.", "error");
                }
            },
            () => { // onCancelar
                // Opcional: Reabrir el buscador si cancelan la seguridad
                // this.abrirSelectorDevolucion();
            },
            "Verificar", // textoConfirmar
            "Cancelar", // textoCancelar
            true // esPeligroso
        );

        // Insertar input de seguridad (Con IDs únicos)
        setTimeout(() => {
            const modal = document.querySelector('.modal-overlay .card');
            if (modal) {
                const inputContainer = document.createElement('div');
                inputContainer.innerHTML = `
                    <input type="number" id="codigo-seguridad" name="codigo-seguridad" placeholder="4 dígitos" style="width:100%; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #444; background:#222; color:white; text-align:center; font-size:1.2rem; box-sizing:border-box;">
                `;
                modal.insertBefore(inputContainer, modal.querySelector('.div-flex-botones'));
                document.getElementById('codigo-seguridad').focus();
            }
        }, 100);
    },

    // 🚀 LÓGICA DE INTERCAMBIO (Devuelve stock y abre nueva venta)
   prepararCambio: function(venta) {
    // 1. Devolver stock (Ya lo tienes)
    Inventario.devolver(venta.productoNombre, venta.cantidadVenta, venta.tallaElegida);
    
    // 2. Marcar como devuelta (Ya lo tienes)
    if (typeof HistorialDevoluciones !== 'undefined') {
        HistorialDevoluciones.marcarComoDevuelta(venta.id);
    }

    // 🛡️ BLINDAJE: Guardar el crédito en la memoria global de la App
    // Esto asegura que la función registrarVenta() que blindamos antes aplique el descuento
    window.creditoDevolucion = {
        montoBs: venta.montoTotal,
        idOriginal: venta.id,
        productoDevuelto: venta.producto
    };
    
    notificar(`✅ Crédito de Bs. ${venta.montoTotal} aplicado para el cambio.`, "exito");
    
    // 3. Abrir modal de venta normal
    if (typeof Interfaz.abrirModalVenta === 'function') {
        Interfaz.abrirModalVenta();
    }
    }
};

const Controlador = {
// Dentro de Controlador.js
// --- REEMPLAZA ESTA FUNCIÓN EN Controlador.js ---

procesarCodigoEscaneado: function(codigo) {
    if (typeof DominusAudio !== 'undefined') DominusAudio.play('scan');
    if (typeof Scanner !== 'undefined' && Scanner.efectoFlash) Scanner.efectoFlash();
    
    // 1. SIEMPRE intentar "pegar" el código en el input de Inventario si estamos en esa sección
    const inputInv = document.getElementById('inv-codigo');
    if (inputInv) {
        inputInv.value = codigo;
        inputInv.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const producto = Inventario.productos.find(p => p.codigo === codigo);
    
    if (producto) {
        notificar(`✅ Escaneado: ${producto.nombre}`);
        
        // Lógica de ventas (Tallas, precios, etc.)
        if (producto.tallas && Object.keys(producto.tallas).length > 0) {
            const tallasDisponibles = Object.keys(producto.tallas);
            this.mostrarModalTallas(
                "Seleccionar Talla",
                `¿Qué talla vender de ${producto.nombre}?`,
                tallasDisponibles,
                (tallaElegida) => {
                    Interfaz.pedirPrecioYRegistrarVenta(producto, tallaElegida);
                }
            );
        } else {
            Interfaz.pedirPrecioYRegistrarVenta(producto, null);
        }
    } else {
        // Lógica para productos NUEVOS (Tu código actual está perfecto aquí)
        notificar(`⚠️ El código ${codigo} no existe`, "info");
        
        this.confirmarAccion(
            "Producto No Registrado",
            `El código <b>${codigo}</b> no está en el inventario...`,
            () => {
                const btnInv = document.querySelector('[onclick*="mostrarSeccion(\'inventario\')"]') || 
                               document.querySelector('[onclick*="inventario"]');
                if(btnInv) btnInv.click();
                
                setTimeout(() => {
                    const inputInvCarga = document.getElementById('inv-codigo');
                    if (inputInvCarga) {
                        inputInvCarga.value = codigo; 
                        inputInvCarga.focus();
                        inputInvCarga.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (typeof Inventario.gestionarEscaneo === 'function') {
                        Inventario.gestionarEscaneo(codigo);
                    }
                }, 500);
            },
            null, "Ir a Inventario", "Cancelar"
        );
    }
},

ejecutarVenta() {
    // 1. CAPTURA DE DATOS (Mantenemos tu lógica impecable)
    const inputProducto = document.getElementById('v-producto');
    const inputMonto = document.getElementById('v-monto');
    const inputCant = document.getElementById('v-cantidad');
    const inputCli = document.getElementById('v-cliente');
    const inputMon = document.getElementById('v-moneda');
    const inputMet = document.getElementById('v-metodo');
    
    const p = inputProducto ? inputProducto.value : '';
    const m = inputMonto ? parseFloat(inputMonto.value) : NaN;
    const mon = inputMon ? inputMon.value : 'USD';
    const met = inputMet ? inputMet.value : 'Efectivo';
    const cli = inputCli ? inputCli.value : '';
    const cantidad = inputCant ? parseFloat(inputCant.value) : 1;
    
    const selectTalla = document.getElementById('v-talla');
    const divTalla = document.getElementById('contenedor-talla'); 
    const tallaElegida = (selectTalla && selectTalla.value) ? selectTalla.value : null;

    const inputCom = document.getElementById('v-comision');
    const comFinal = inputCom ? (parseFloat(inputCom.value) || 0) : 0;

    const btnPunto = document.getElementById('btn-modo-punto');
    const esServicio = btnPunto ? btnPunto.classList.contains('activo-punto') : false;

    // 🛡️ REGLA DE ORO: ¿Estamos validando inventario?
    const modoLibre = (typeof Inventario !== 'undefined' && Inventario.activo === false);

    // 2. VALIDACIONES DE SEGURIDAD
    if(!p || isNaN(m)) {
        return notificar("Falta producto o monto", "error");
    }

    if (met === 'Fiao' && (!cli || cli.trim() === "")) {
        return notificar("Para un fiao necesito el nombre", "fiao");
    }

    // 🛡️ VALIDACIÓN CONSCIENTE DE TALLAS:
    // Si el modo libre está activo, NO bloqueamos por falta de talla/peso.
    if (!modoLibre && divTalla && !divTalla.classList.contains('hidden')) {
        if (!tallaElegida || tallaElegida === "" || tallaElegida === "null") {
            return notificar("Selecciona una talla/peso", "error");
        }
    }

    // 3. PROCESAMIENTO
    if (typeof Ventas !== 'undefined' && typeof Ventas.prepararParaCarrito === 'function') {
        // Pasamos los datos al carrito. 
        // 💡 Importante: Ventas.prepararParaCarrito deberá saber si restar stock o no después.
        Ventas.prepararParaCarrito(p, m, mon, met, cli, comFinal, esServicio, cantidad, tallaElegida);
    } else {
        return notificar("Error interno del sistema", "error");
    }
    
    // El cerebro aprende solo si no es un servicio de punto
    if (!esServicio && typeof Inventario !== 'undefined' && typeof Inventario.aprenderDeVenta === 'function') {
        Inventario.aprenderDeVenta(p, m);
    }
    
    // 4. LIMPIEZA Y UX
    if (inputProducto) inputProducto.value = '';
    if (inputMonto) inputMonto.value = '';
    if (inputCant) inputCant.value = '1';
    
    if (divTalla) divTalla.classList.add('hidden');
    if (selectTalla) selectTalla.innerHTML = '<option value="">Seleccione Talla...</option>';
    
    if (inputCom && esServicio) inputCom.value = '';
    if (esServicio && typeof Interfaz !== 'undefined') Interfaz.alternarModoPunto();
    
    if (typeof this.renderCarrito === 'function') {
        this.renderCarrito();
    }
    
    if (inputProducto) inputProducto.focus(); 
    
    // Notificación personalizada según el modo
    const msj = modoLibre ? "🛒 Añadido (Modo Libre)" : "🛒 Añadido a la cuenta";
    notificar(msj, "stock");
},

// 👇 NUEVA: Dibuja la lista temporal en pantalla
renderCarrito() {
    const contenedor = document.getElementById('lista-carrito-temporal');
    const totalBsDiv = document.getElementById('total-carrito-bs');
    const totalUsdDiv = document.getElementById('total-carrito-usd');

    if (!contenedor || !Ventas.carrito) return;

    // 🛡️ Blindaje: Si no hay nada, limpiamos y salimos rápido
    if (Ventas.carrito.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:0.9em; padding:20px;">🛒 La cuenta está vacía</p>';
        if (totalBsDiv) totalBsDiv.innerText = '0.00 Bs';
        if (totalUsdDiv) totalUsdDiv.innerText = '$0.00';
        return;
    }

    // 🚀 MEJORA DE RENDIMIENTO: Construimos todo el HTML en una variable y lo inyectamos UNA sola vez
    let htmlCarrito = '';

    Ventas.carrito.forEach((item, index) => {
        const nombreMostrar = item.tallaEscogida ? `${item.p} (${item.tallaEscogida})` : item.p;
        
        // 🛡️ INDICADOR DE MODO: Si NO valida inventario, ponemos un aviso visual
        // Usamos la propiedad 'validarInventario' que añadimos en prepararParaCarrito
        const esModoLibre = (item.validarInventario === false);
        const iconoModo = esModoLibre ? '<span style="color:#ff9800; font-size:0.8em;"> [🔓 MODO LIBRE]</span>' : '';
        const bordeLateral = esModoLibre ? '3px solid #ff9800' : '3px solid var(--primary)';

        htmlCarrito += `
            <div style="display:flex; justify-content:space-between; background:rgba(0,0,0,0.2); padding:10px; margin-bottom:8px; border-radius:8px; border-left: ${bordeLateral}; align-items:center; animation: fadeIn 0.3s ease;">
                <div style="flex-grow:1;">
                    <b style="font-size:0.95em; color: ${esModoLibre ? '#ff9800' : 'white'};">${item.cant}x ${nombreMostrar}${iconoModo}</b><br>
                    <small style="opacity:0.8">${item.totalBs.toLocaleString('es-VE')} Bs / $${item.totalUSD.toFixed(2)}</small>
                </div>
                <button onclick="Controlador.eliminarDelCarrito(${index})" 
                        style="background:rgba(255, 77, 77, 0.2); color:#ff4d4d; border:1px solid #ff4d4d; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold; transition: 0.2s;"
                        onmouseover="this.style.background='#ff4d4d'; this.style.color='white';"
                        onmouseout="this.style.background='rgba(255, 77, 77, 0.2)'; this.style.color='#ff4d4d';">
                    X
                </button>
            </div>
        `;
    });

    contenedor.innerHTML = htmlCarrito;

    // 💰 CÁLCULO DE TOTALES
    const totalBs = Ventas.obtenerTotalVentaActual();
    const totalUsd = totalBs / (Conversor.tasaActual || 1);

    if (totalBsDiv) totalBsDiv.innerText = `${totalBs.toLocaleString('es-VE')} Bs`;
    if (totalUsdDiv) totalUsdDiv.innerText = `$${totalUsd.toFixed(2)}`;
},

// 👇 NUEVA: Permite borrar si se equivocaron
eliminarDelCarrito(index) {
    // 🛡️ Verificamos que el índice exista antes de cortar
    if (Ventas.carrito[index]) {
        Ventas.carrito.splice(index, 1);
        this.renderCarrito();
        // Notificación sutil (opcional)
        console.log("🗑️ Item removido del carrito.");
    }
},

ejecutarCobroFinal() {
    // 1. Verificación: ¿Hay productos en la lista?
    if (Ventas.carrito.length === 0) {
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
        return notificar("La cuenta está vacía", "error");
    }

    // 2. Procesamiento en el motor
    const exito = Ventas.procesarCobroCarrito();

    if (exito) {
        // --- 🚀 FASE DE ACTUALIZACIÓN ---
        if (typeof Interfaz !== 'undefined') {
            if (typeof Interfaz.actualizarDashboard === 'function') Interfaz.actualizarDashboard();
            if (typeof Interfaz.renderInventario === 'function') Interfaz.renderInventario();
        }

        // --- 🧼 FASE DE LIMPIEZA DE INTERFAZ ---
        const idInputsALimpiar = ['v-cliente', 'v-producto', 'v-monto', 'v-cantidad', 'v-comision'];
        idInputsALimpiar.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = (id === 'v-cantidad') ? '1' : '';
            }
        });

        // Valores por defecto
        const metodoPago = document.getElementById('v-metodo');
        if (metodoPago) metodoPago.value = 'Efectivo $'; 

        const moneda = document.getElementById('v-moneda');
        if (moneda) moneda.value = 'USD';

        // Ocultar elementos específicos
        const elementosAUltimar = ['wrapper-cliente', 'wrapper-comision', 'contenedor-talla', 'v-info-stock'];
        elementosAUltimar.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                id === 'v-info-stock' ? el.innerText = '' : el.classList.add('hidden');
            }
        });

        // 🛡️ Blindaje visual de Modo Punto
        const btnPunto = document.getElementById('btn-modo-punto');
        if (btnPunto) btnPunto.classList.remove('activo-punto');

        // --- 🛒 RESETEO DEL CARRITO ---
        if (typeof this.limpiarSeleccionVenta === 'function') this.limpiarSeleccionVenta();
        this.renderCarrito(); 

        // --- 🔊 FEEDBACK AUDITIVO (Caja Registradora) ---
        // Usamos nuestro nuevo módulo centralizado
        if (typeof DominusAudio !== 'undefined') {
            DominusAudio.play('exito'); 
        }

        // Devolver foco al producto para el siguiente cliente
        const inputProd = document.getElementById('v-producto');
        if (inputProd) inputProd.focus();
        
        notificar("✅ ¡Venta Cobrada con Éxito!", "exito");

    } else {
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
        notificar("❌ Error: No se pudo procesar el cobro", "error");
    }
},

  liquidarServicioManual(idVenta) {
    const venta = Ventas.historial.find(v => v.id === idVenta);
    if (!venta) return;

    const montoEstimado = venta.aEntregar;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = `
        position:fixed; top:0; left:0; width:100%; height:100%; 
        background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); 
        display:flex; align-items:center; justify-content:center; 
        z-index:10000; padding:20px;
    `;

    overlay.innerHTML = `
        <div class="card glass" style="max-width:350px; width:100%; border:1px solid var(--primary); padding:25px; border-radius:15px; text-align:center; animation: scaleIn 0.3s ease;">
            <h3 style="color:var(--primary); margin-bottom:10px;">⚖️ Liquidar Punto</h3>
            <p style="color:white; font-size:0.9em; margin-bottom:15px;">
                Liquidando: <b>${venta.producto}</b><br>
                Monto sugerido: <span style="color:var(--primary)">${montoEstimado.toLocaleString('es-VE')} Bs</span>
            </p>
            
            <label style="color:rgba(255,255,255,0.6); font-size:0.8em; display:block; text-align:left; margin-bottom:5px;">Monto a entregar:</label>
            <input type="number" id="liq-monto-final" value="${montoEstimado}" class="glass" 
                   style="width:100%; padding:12px; background:rgba(255,255,255,0.05); color:white; border:1px solid #444; border-radius:8px; margin-bottom:20px; font-size:1.2em; text-align:center;">

            <div style="display:flex; gap:10px;">
                <button id="btn-cancelar-liq" class="btn-mini" style="flex:1; background:#333; color:white; padding:12px; border-radius:8px;">Cancelar</button>
                <button id="btn-confirmar-liq" class="btn-mini" style="flex:1; background:var(--primary); color:black; font-weight:bold; padding:12px; border-radius:8px;">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    const inputMonto = document.getElementById('liq-monto-final');
    inputMonto.select();

    document.getElementById('btn-cancelar-liq').onclick = () => overlay.remove();

    document.getElementById('btn-confirmar-liq').onclick = () => {
        const montoFinal = parseFloat(inputMonto.value);

        if (isNaN(montoFinal) || montoFinal <= 0) {
            return notificar("Ingrese un monto válido", "error");
        }

        const nuevoGasto = {
            id: Date.now(),
            descripcion: `LIQ. PUNTO: ${venta.producto}`,
            montoBs: montoFinal,
            moneda: 'Bs',
            fecha: new Date().toLocaleDateString('es-VE'),
            hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
        };

        const gastosActuales = Persistencia.cargar('dom_gastos') || [];
        gastosActuales.push(nuevoGasto);
        Persistencia.guardar('dom_gastos', gastosActuales);

        venta.pagado = true;
        venta.montoPagadoReal = montoFinal;
        Persistencia.guardar('dom_ventas', Ventas.historial);

        overlay.remove();
        notificar("¡Liquidación exitosa! Registrado en Gastos.", "exito");
        
        if (typeof Interfaz !== 'undefined') {
            Interfaz.show('ventas');
            Interfaz.actualizarDashboard();
        }
    };
},

prepararEdicionInventario: function(identificador) {
    // 🔍 BUSQUEDA INTELIGENTE: Busca por nombre O por código
    const p = Inventario.productos.find(prod => 
        prod.nombre === identificador || (prod.codigo && prod.codigo === identificador)
    );

    // Si no existe, es un PRODUCTO NUEVO (Registro)
    if (!p) {
        notificar("🆕 Producto nuevo detectado", "info");
        this.limpiarFormularioInventario(); // Función que limpie los inputs
        const inputCodigo = document.getElementById('inv-codigo');
        if (inputCodigo) {
            inputCodigo.value = identificador; // Pegamos el código escaneado
            inputCodigo.style.border = "2px solid var(--primary)";
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // --- SI EL PRODUCTO EXISTE (Edición) ---
    const inputCodigo = document.getElementById('inv-codigo');
    if (inputCodigo) inputCodigo.value = p.codigo || "";

    document.getElementById('inv-nombre').value = p.nombre;
    document.getElementById('inv-cant').value = p.cantidad;
    document.getElementById('inv-precio').value = p.precio;
    
    if(document.getElementById('inv-unidad')) {
        document.getElementById('inv-unidad').value = p.unidad;
    }

    if (p.tallas) { tallasTemporales = {...p.tallas}; }

    const btnGuardar = document.querySelector('button[onclick="Controlador.guardarEnInventario()"]');
    if (btnGuardar) {
        btnGuardar.innerText = "💾 Actualizar";
        btnGuardar.style.background = "#2196F3";
        btnGuardar.setAttribute("onclick", `Controlador.actualizarProducto('${p.nombre}')`);
    }
    
    notificar(`Editando: ${p.nombre}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
},

actualizarProducto: function(nombreOriginal) {
    const cod = document.getElementById('inv-codigo').value.trim(); // 🚀 Capturamos código
    const n = document.getElementById('inv-nombre').value;
    const cStr = document.getElementById('inv-cant').value;
    const pStr = document.getElementById('inv-precio').value;
    const unidadElemento = document.getElementById('inv-unidad');
    const u = unidadElemento ? unidadElemento.value : 'Und';

    if(!n || !cStr) return notificar("Falta nombre o cantidad", "error");

    const c = parseFloat(cStr);
    const p = parseFloat(pStr) || 0;

    const tieneTallas = Object.keys(tallasTemporales).length > 0;
    const tallasParaGuardar = tieneTallas ? {...tallasTemporales} : null;

    if (tieneTallas) {
        const sumaTallas = Object.values(tallasTemporales).reduce((a, b) => a + b, 0);
        if (Math.abs(sumaTallas - c) > 0.01) {
            return notificar(`❌ El total (${c}) no coincide con la suma de tallas (${sumaTallas}).`, "error");
        }
    }

    // 🚀 CAMBIO CLAVE: Pasamos el código al método actualizar
    // Nota: Asegúrate de que tu función Inventario.actualizar acepte el código como último parámetro
    Inventario.actualizar(nombreOriginal, n, c, p, u, tallasParaGuardar, cod);

    this.limpiarFormularioInventario(); 
    
    Interfaz.renderInventario();
    notificar("✅ Producto actualizado");
},

limpiarFormularioInventario: function() {
        document.getElementById('inv-codigo').value = '';
        document.getElementById('inv-nombre').value = '';
        document.getElementById('inv-cant').value = '';
        document.getElementById('inv-precio').value = '';
        
        const unidadElemento = document.getElementById('inv-unidad');
        if(unidadElemento) unidadElemento.value = 'Und';
        
        tallasTemporales = {};
        
        // Restaurar botón guardar original si estaba en modo edición
        const btnGuardar = document.querySelector('button[onclick^="Controlador.actualizarProducto"]');
        if (btnGuardar) {
            btnGuardar.innerText = "💾 Guardar";
            btnGuardar.style.background = ""; // Color original
            btnGuardar.setAttribute("onclick", "Controlador.guardarEnInventario()");
        }
        
        // Si tienes una función para refrescar la UI de tallas, llámala aquí:
        // if (typeof Interfaz !== 'undefined' && Interfaz.renderTallasTemporales) Interfaz.renderTallasTemporales();
    },
ejecutarGasto() {
    const inputDesc = document.getElementById('g-desc');
    const inputMonto = document.getElementById('g-monto');
    const inputMon = document.getElementById('g-moneda');

    const d = inputDesc ? inputDesc.value.trim() : '';
    const m = inputMonto ? parseFloat(inputMonto.value) : NaN;
    const mon = inputMon ? inputMon.value : 'USD';
    
    // 1. Validación de seguridad
    if(!d || isNaN(m) || m <= 0) {
        notificar("❌ Escribe una descripción y un monto válido", "error");
        return;
    }

    // 2. Confirmación Consciente
    Interfaz.confirmarAccion(
        "Registrar Gasto",
        `¿Confirmar gasto de ${m} ${mon} por: "${d}"?`,
        () => {                
            // 🚀 Llamada al motor de datos
            Ventas.registrarGasto(d, m, mon);
            
            // 🧼 Limpiar formulario con seguridad
            if (inputDesc) inputDesc.value = '';
            if (inputMonto) inputMonto.value = '';
            
            // 🔄 Sincronización Total
            if (typeof Interfaz !== 'undefined') {
                Interfaz.actualizarDashboard();
                // IMPORTANTE: Refrescamos la lista de gastos para que aparezca el nuevo
                if (typeof Interfaz.renderGastos === 'function') {
                    Interfaz.renderGastos(); 
                }
            }
            
            notificar("💸 Gasto registrado correctamente", "exito");
        },
        null, 
        "Sí, registrar",
        "Cancelar",
        false // No es una acción destructiva (color azul/verde)
    );
},

guardarEnInventario() { 
    // 1. Captura y Normalización (Añadimos el código)
    const codigo = document.getElementById('inv-codigo').value.trim(); // 🚀 NUEVO
    const nombreRaw = document.getElementById('inv-nombre').value.trim();
    const cStr = document.getElementById('inv-cant').value;
    const pStr = document.getElementById('inv-precio').value;
    
    const unidadElemento = document.getElementById('inv-unidad');
    const u = unidadElemento ? unidadElemento.value : 'Und';

    // 2. Validaciones Críticas
    if(!nombreRaw || !cStr) {
        return notificar("❌ Falta nombre o cantidad", "error");
    }

    const c = parseFloat(cStr);
    const p = parseFloat(pStr) || 0;

    // 3. Validación de Integridad de Tallas
    const tieneTallas = Object.keys(tallasTemporales).length > 0;
    if (tieneTallas) {
        const sumaTallas = Object.values(tallasTemporales).reduce((a, b) => a + b, 0);
        if (Math.abs(sumaTallas - c) > 0.01) {
            return notificar(`❌ Error: El stock total es ${c}, pero el desglose suma ${sumaTallas.toFixed(2)}.`, "error");
        }
    }

    const tallasParaGuardar = tieneTallas ? {...tallasTemporales} : null;
    
    // 🚀 CAMBIO CLAVE: Ahora le pasamos el 'codigo' a la función guardar
    const exito = Inventario.guardar(nombreRaw, c, p, u, tallasParaGuardar, codigo); 

    if(exito) {
        // 5. Limpieza de Interfaz (Incluimos el código)
        document.getElementById('inv-codigo').value = ''; // 🚀 Limpiamos código
        document.getElementById('inv-nombre').value = '';
        document.getElementById('inv-cant').value = '';
        document.getElementById('inv-precio').value = '';
        if(unidadElemento) unidadElemento.value = 'Und';
        
        tallasTemporales = {};

        if (typeof Interfaz !== 'undefined' && Interfaz.renderInventario) {
            Interfaz.renderInventario();
        }
        
        notificar(`✅ Producto "${nombreRaw}" guardado con éxito.`, "exito");
    }
},

mostrarStockDisponible: function(talla) {
    const nombreProd = document.getElementById('v-producto').value;
    const infoStock = document.getElementById('v-info-stock');
    const inputCant = document.getElementById('v-cantidad');
    const btnAnadir = document.getElementById('btn-anadir-carrito') || document.querySelector('button[onclick*="ejecutarVenta"]');
    
    // 🛡️ CLAVE: ¿El sistema debe validar el inventario o está en modo libre?
    const validacionActiva = (typeof Inventario !== 'undefined' && Inventario.activo === true);

    if (!nombreProd || !talla) {
        if(infoStock) infoStock.innerText = "";
        return;
    }

    const p = Inventario.productos.find(prod => prod.nombre.toLowerCase() === nombreProd.trim().toLowerCase());
    
    if (p && p.tallas) {
        const stockDisponible = parseFloat(p.tallas[talla]) || 0;
        const cantSolicitada = inputCant ? parseFloat(inputCant.value) || 1 : 1;
        const unidad = p.unidad || "Und";
        
        if(infoStock) {
            infoStock.innerText = ` Stock: ${stockDisponible} ${unidad}`;
            
            // 🛡️ LÓGICA CONSCIENTE:
            // Si el inventario está APAGADO, siempre permitimos (puede vender 1000 aunque haya 0)
            // Si el inventario está PRENDIDO, validamos existencias.
            const puedeVender = !validacionActiva || (stockDisponible > 0 && stockDisponible >= cantSolicitada);

            if (puedeVender) {
                infoStock.style.color = validacionActiva ? "#4caf50" : "#ff9800"; // Verde si valida, Naranja si está en modo libre
                if (!validacionActiva) infoStock.innerText += " (Modo Libre)";
                
                if(btnAnadir) {
                    btnAnadir.disabled = false;
                    btnAnadir.style.opacity = "1";
                    btnAnadir.style.cursor = "pointer";
                }
            } else {
                // Solo entra aquí si Inventario.activo es TRUE y no hay stock
                infoStock.style.color = "#ff5252"; // Rojo
                infoStock.innerText += (stockDisponible <= 0) ? " (AGOTADO)" : " (INSUFICIENTE)";

                if(btnAnadir) {
                    btnAnadir.disabled = true;
                    btnAnadir.style.opacity = "0.5";
                    btnAnadir.style.cursor = "not-allowed";
                }
            }
        }
    }
},

editarPrecioRapido(id, nuevoPrecio) {
    // 1. Buscamos el producto (usamos == por si el ID viene como string desde el HTML)
    const producto = Inventario.productos.find(p => p.id == id);
    
    if (producto) {
        // 2. Validación de entrada: si está vacío es 0, si no, lo convertimos a número
        const precioLimpio = nuevoPrecio === "" ? 0 : parseFloat(nuevoPrecio);

        // 3. Verificamos que sea un número válido antes de asignar
        if (isNaN(precioLimpio)) {
            return notificar("❌ Precio inválido", "error");
        }

        // 4. Aplicamos el cambio
        producto.precio = precioLimpio;
        
        // 5. Usamos el "Guardián de Datos" para guardar y refrescar todo el sistema
        Inventario.sincronizar();
        
        // Log para depuración interna
        console.log(`✅ Precio de ${producto.nombre} actualizado a: ${producto.precio} USD`);
    }
},
    
 // Aceptamos el nombre del cliente en lugar del ID
abonar(nombreCliente) {
    // 1. Buscamos deudas normalizando el nombre (Escudo de Identidad)
    const nombreBusqueda = nombreCliente.trim().toLowerCase();
    const deudasCliente = Ventas.deudas.filter(d => 
        (d.cliente || "").trim().toLowerCase() === nombreBusqueda
    );
    
    if (deudasCliente.length === 0) return notificar("No se encontraron deudas para este cliente", "error");

    // 2. Calculamos totales para mostrar la verdad financiera
    const totalUSD = deudasCliente.reduce((sum, d) => sum + parseFloat(d.montoUSD || 0), 0);
    const totalBs = totalUSD * Conversor.tasaActual;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:380px; width:100%; border:1px solid var(--primary); padding:25px; border-radius:20px; text-align:center; color:white; animation: fadeIn 0.3s ease;">
            <span style="font-size:2.5em;">🤝</span>
            <h3 style="color:var(--primary); margin:10px 0;">Registrar Abono</h3>
            <p style="font-size:0.9em; opacity:0.8; margin-bottom:5px;">Cliente: <strong>${nombreCliente}</strong></p>
            <p style="font-size:1.1em; color:var(--primary); margin-bottom:15px; font-weight:bold;">
                Saldo Pendiente: $${totalUSD.toFixed(2)} (${totalBs.toLocaleString('es-VE')} Bs)
            </p>
            
            <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
                <input type="number" id="monto-abono" placeholder="¿Cuánto paga?" inputmode="decimal"
                       style="width:100%; padding:14px; border-radius:10px; border:1px solid var(--primary); background:rgba(0,0,0,0.3); color:white; font-size:1.2em; text-align:center; outline:none;">
                
                <select id="moneda-abono" style="width:100%; padding:12px; border-radius:10px; background:#1a1a1a; color:white; border:1px solid #444; font-size:1em;">
                    <option value="Bs">Bolívares (Bs)</option>
                    <option value="USD">Dólares ($)</option>
                </select>

                <select id="metodo-abono" style="width:100%; padding:12px; border-radius:10px; background:#1a1a1a; color:white; border:1px solid #444; font-size:1em;">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Punto">Punto de Venta</option>
                    <option value="Biopago">Biopago</option>
                </select>
            </div>

            <div style="display:flex; gap:10px;">
                <button id="btn-cerrar-abono" class="btn-main" style="background:#555; flex:1; padding:12px;">Cerrar</button>
                <button id="btn-guardar-abono" class="btn-main" style="flex:1; padding:12px; font-weight:bold;">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // MEJORA: Autofocus inmediato para rapidez de uso
    const inputMonto = document.getElementById('monto-abono');
    setTimeout(() => inputMonto.focus(), 100);

    // 1. Lógica de Cerrar mejorada
    document.getElementById('btn-cerrar-abono').onclick = () => overlay.remove();

    // 2. Lógica de Confirmar
    document.getElementById('btn-guardar-abono').onclick = () => {
        const monto = parseFloat(inputMonto.value);
        const moneda = document.getElementById('moneda-abono').value;
        const metodo = document.getElementById('metodo-abono').value;

        if (!monto || monto <= 0) return notificar("Ingrese un monto válido", "error");

        // Ejecutamos el motor lógico
        const resultado = Ventas.abonarDeudaPorCliente(nombreCliente, monto, moneda, metodo);

        if (resultado) {
            if (typeof Interfaz !== 'undefined') Interfaz.renderFiaos();
            overlay.remove();
            notificar(`¡Abono de ${monto}${moneda === 'USD' ? '$' : 'Bs'} registrado!`, "exito");
        }
    };
},

// --- 2. MODIFICADO PARA ELIMINAR TODO EL TOTAL DEL CLIENTE ---
eliminarDeuda(nombreCliente) {
    Interfaz.confirmarAccion(
        `¿Borrar Deuda de ${nombreCliente}?`,
        "Esta acción borrará todo el historial de crédito de este cliente.",
        () => {
            // --- ESTO SE EJECUTA SI EL USUARIO DICE "SÍ" ---
            let fiaos = Persistencia.cargar('dom_fiaos') || [];
            
            // Filtramos para eliminar todas las entradas del cliente
            fiaos = fiaos.filter(f => f.cliente !== nombreCliente);
            
            Persistencia.guardar('dom_fiaos', fiaos);
            
            // Sincronizamos la memoria de Ventas
            Ventas.deudas = fiaos; 
            
            // Refrescamos la vista
            Interfaz.renderFiaos();
            notificar(`Historial de ${nombreCliente} borrado`, "error");
        },
       null, // 🚀 CORRECCIÓN: Acción al cancelar
        "Sí, eliminar",
        "Cancelar",
        true
    );
},

eliminarInv(id) {
    Interfaz.confirmarAccion(
        "¿Borrar Producto?",
        "Se eliminará permanentemente del stock.",
        () => {
            // --- ESTO SE EJECUTA SI EL USUARIO DICE "SÍ" ---
            Inventario.eliminar(id);
            Interfaz.renderInventario();
            notificar("Producto eliminado", "error");
        },
       null, // 🚀 CORRECCIÓN: Acción al cancelar
        "Sí, eliminar",
        "Cancelar",
        true
    );
},

    toggleInv(activo) { //activa y descativa el inventario//
        Inventario.activo = activo; 
        
        const label = document.getElementById('estadoInv');
        if(label) {
            label.innerText = activo ? "Inventario ACTIVADO" : "Inventario DESACTIVADO";
            label.style.color = activo ? "#2e7d32" : "#d32f2f";
        }
        
        localStorage.setItem('dom_inv_activo', activo);
        console.log("Inventario está ahora:", activo);
    },

    toggleDarkMode(activo) { //para cambiar de claro a oscuro//
        if (activo) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        Persistencia.guardar('dom_dark_mode', activo);
        
        console.log("Modo oscuro:", activo);
    },

    limpiarSeleccionVenta() {
        const met = document.getElementById('v-metodo');
        if(met) met.value = 'Efectivo $';
        Interfaz.toggleClienteField('Efectivo $');
    },

generarCierre: function() { 
    if (document.getElementById('modal-dinamico')) return;

    const r = Ventas.finalizarJornada(); 
    const hoy = new Date().toLocaleDateString('es-VE');
    
    const totalVentas = r.conteoVentas || 0;
    const ticketPromedioBs = totalVentas > 0 ? (r.balanceNeto / totalVentas).toFixed(2) : 0;

    let texto = `📊 *REPORTE DOMINUS - ${hoy}*\n`;
    texto += `━━━━━━━━━━━━━━━━━━\n\n`;
    texto += `🛍️ *ACTIVIDAD:* \n`;
    texto += `• Ventas realizadas: ${totalVentas}\n`;
    texto += `• Ticket Promedio: ${ticketPromedioBs} Bs\n\n`;
    texto += `💵 *EFECTIVO EN CAJA:* \n`;
    texto += `• Bolívares: ${r.efectivoBS.toLocaleString('es-VE')} Bs\n`;
    texto += `• Dólares: ${r.efectivoUSD} $\n\n`;
    texto += `📱 *DINERO DIGITAL:* \n`;
    texto += `• Pago Móvil: ${r.detalle.pagoMovil.toLocaleString('es-VE')} Bs\n`;
    texto += `• Punto/Biopago: ${(r.detalle.punto + r.detalle.biopago).toLocaleString('es-VE')} Bs\n`;
    texto += `• Total Digital: ${r.digital.toLocaleString('es-VE')} Bs\n\n`;
    texto += `📉 *EGRESOS:* \n`;
    texto += `• Gastos Hoy: ${r.gastos.toLocaleString('es-VE')} Bs\n`;
    texto += `• Comisiones: ${r.detalle.comisiones.toLocaleString('es-VE')} Bs\n\n`;
    texto += `━━━━━━━━━━━━━━━━━━\n`;
    texto += `✅ *TOTAL NETO DEL DÍA:* \n`;
    texto += `💰 *${r.balanceNeto.toLocaleString('es-VE')} Bs*`;

    modalEleccion.abrir({
        titulo: "📊 Finalizar Jornada",
        mensaje: "¿Cómo deseas exportar el reporte detallado?",
        botones: [
            { 
                texto: "📱 WhatsApp Detallado", 
                // CAMBIO AQUÍ: Añadimos la clase de diseño largo
                clase: "btn-whatsapp btn-cierre-wa", 
                accion: () => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
                    setTimeout(() => { this.preguntarLimpieza(); }, 2000);
                }
            },
            { 
                texto: "📄 Generar PDF", 
                clase: "btn-pdf",
                accion: () => { 
                    this.generarPDF();
                    setTimeout(() => { this.preguntarLimpieza(); }, 1500);
                } 
            }
        ]
    });
},

preguntarLimpieza: function() {
    modalEleccion.abrir({
        titulo: "🗑️ ¿Borrar Datos?",
        mensaje: "Se limpiarán ventas, gastos e historial de devoluciones. El inventario NO se borra.",
        botones: [
            { 
                texto: "SÍ, REINICIAR TODO", 
                clase: "btn-danger", // Usamos una clase más llamativa para peligro
                accion: () => { 
                    Ventas.limpiarJornada();
                    
                    // 🚀 NUEVA LÓGICA: Limpiar el historial permanente
                    Persistencia.guardar('dom_historial_ventas', []);
                    console.log("✅ Historial permanente limpio.");
                    // ------------------------------------------------

                    location.reload(); 
                } 
            },
            { 
                texto: "MANTENER DATOS", 
                clase: "btn-no", 
                accion: () => { notificar("Datos guardados", "exito"); } 
            }
        ]
    });
},

   generarPDF() {
        const r = Ventas.finalizarJornada(); 
        const ahora = new Date();
        const hoy = ahora.toLocaleDateString('es-VE');
        const horaId = `${ahora.getHours()}-${ahora.getMinutes()}`;
        const nombreArchivo = `Dominus_Cierre_${hoy.replace(/\//g, '-')}_${horaId}.pdf`;
        
        const ventasHoy = Ventas.historial.filter(v => v.fecha === hoy);
        const canvas = document.getElementById('graficaVentas');
        const graficaImg = canvas ? canvas.toDataURL('image/png') : null;

        const totalConConvertido = r.efectivoBS + r.digital - r.gastos + (r.efectivoUSD * Conversor.tasaActual);

      const serviciosPendientes = ventasHoy.filter(v => v.esServicio && !v.pagado);

let tablaServiciosHTML = '';

if (serviciosPendientes.length > 0) {
    const filasServicios = serviciosPendientes.map(s => `
        <tr style="border-bottom: 1px dotted #ccc;">
            <td style="padding: 10px; font-size: 11px;">${s.producto.replace('PUNTO: ', '')}</td>
            <td style="padding: 10px; text-align: right; font-size: 11px;">${Number(s.montoBs).toLocaleString('es-VE')} Bs</td>
            <td style="padding: 10px; text-align: right; color: #d32f2f; font-size: 11px;">-${Number(s.comision).toLocaleString('es-VE')} Bs</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #2e7d32; font-size: 11px;">${Number(s.aEntregar).toLocaleString('es-VE')} Bs</td>
        </tr>
    `).join('');

    tablaServiciosHTML = `
        <div style="margin-top: 20px; border: 2px solid #ffd700; padding: 15px; border-radius: 8px; background: #fffdf0;">
            <h4 style="margin: 0 0 10px 0; color: #b8860b; font-size: 14px; text-align: center;">📋 PENDIENTES POR ENTREGAR (DINERO AJENO)</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 1px solid #ffd700; color: #666; font-size: 10px;">
                        <th style="text-align: left; padding: 5px;">A QUIÉN</th>
                        <th style="text-align: right; padding: 5px;">TOTAL</th>
                        <th style="text-align: right; padding: 5px;">COMISIÓN</th>
                        <th style="text-align: right; padding: 5px;">A ENTREGAR</th>
                    </tr>
                </thead>
                <tbody>${filasServicios}</tbody>
            </table>
            <div style="text-align: right; margin-top: 10px; font-size: 12px; font-weight: bold; color: #d32f2f;">
                TOTAL POR PAGAR: ${serviciosPendientes.reduce((acc, s) => acc + s.aEntregar, 0).toLocaleString('es-VE')} Bs
            </div>
        </div>
    `;
}

        const filasVentas = ventasHoy.map(v => {
            const esDolar = v.metodo.includes('$') || v.moneda === 'USD';
            const montoTexto = esDolar 
                ? `$ ${Number(v.montoUSD || (v.montoBs / Conversor.tasaActual)).toFixed(2)}` 
                : `${Number(v.montoBs).toLocaleString('es-VE')} Bs`;

            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; font-size: 13px;">
                        <span style="color: #888; font-size: 10px;">${v.hora}</span><br>
                        <b>${v.producto.toUpperCase()}</b>
                    </td>
                    <td style="padding: 12px; font-size: 13px; text-align: center;">${v.metodo}</td>
                    <td style="padding: 12px; font-size: 13px; text-align: right; font-weight: bold;">
                        ${montoTexto}
                    </td>
                </tr>
            `;
        }).join('');

        const contenidoHTML = `
            <div style="font-family: Arial, sans-serif; padding: 40px; color: #333; background: white;">
                
                <div style="height: 920px;"> 
                    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #ffd700; padding-bottom: 15px; margin-bottom: 25px;">
                        <div>
                            <h1 style="margin: 0; letter-spacing: 2px; font-size: 28px;">DOMINUS</h1>
                            <p style="margin: 0; font-style: italic; color: #666; font-size: 12px;">Domina tu negocio, Domina tu vida</p>
                        </div>
                        <div style="text-align: right;">
                            <h3 style="margin: 0;">Reporte de Cierre</h3>
                            <p style="margin: 0; font-weight: bold;">${hoy}</p>
                            <p style="margin: 0; font-size: 12px; color: #888;">Tasa: ${Conversor.tasaActual} Bs</p>
                        </div>
                    </div>

                    ${graficaImg ? `<div style="text-align: center; margin-bottom: 30px;"><img src="${graficaImg}" style="width: 100%; max-height: 250px;"></div>` : ''}

                    <div style="background: #1a1a1a; color: white; padding: 30px; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                            <span>Efectivo Bolívares:</span>
                            <span>${r.efectivoBS.toLocaleString('es-VE')} Bs</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                            <span>Efectivo Dólares:</span>
                            <span style="color: #4caf50; font-weight: bold;">$ ${Number(r.efectivoUSD).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                            <span>Ventas Digitales:</span>
                            <span>${r.digital.toLocaleString('es-VE')} Bs</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 25px; color: #ff5252;">
                            <span>Gastos del Día:</span>
                            <span>-${r.gastos.toLocaleString('es-VE')} Bs</span>
                        </div>
                        <div style="border-top: 1px solid #444; padding-top: 20px; text-align: right;">
                            <p style="margin: 0; font-size: 11px; color: #ffd700; opacity: 0.8;">TOTAL NETO (Caja propia)</p>
                            <h2 style="margin: 0; color: #ffd700; font-size: 36px;">${totalConConvertido.toLocaleString('es-VE')} Bs</h2>
                        </div>
                    </div>

                    ${tablaServiciosHTML}

                    <p style="text-align: center; margin-top: 40px; color: #bbb; font-size: 12px;">Deslice para ver detalle de operaciones ↓</p>
                </div>

                <div style="page-break-before: always; padding-top: 20px;">
                    <h4 style="color: #666; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">DETALLE DE OPERACIONES TOTALES</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f8f8f8;">
                            <tr style="color: #999; font-size: 11px;">
                                <th style="padding: 10px; text-align: left;">PRODUCTO / HORA</th>
                                <th style="padding: 10px; text-align: center;">MÉTODO</th>
                                <th style="padding: 10px; text-align: right;">MONTO</th>
                            </tr>
                        </thead>
                        <tbody>${filasVentas}</tbody>
                    </table>
                </div>
            </div>
        `;

        const opciones = {
            margin: 0,
            filename: nombreArchivo,
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opciones).from(contenidoHTML).save().then(() => {
            setTimeout(() => {
                this.preguntarLimpieza(); 
            }, 1500);
        });
    }, 

   rotarGrafica() {
    // Ciclo infinito: 0 -> 1 -> 2 -> 0...
    modoGraficaActual = (modoGraficaActual + 1) % 3;
    
    // Feedback táctil para que el usuario sienta el cambio
    if (navigator.vibrate) navigator.vibrate(50);
    
    this.renderizarGrafica();
},

renderizarGrafica() {
    const canvas = document.getElementById('graficaVentas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const hoy = new Date().toLocaleDateString('es-VE');
    const t = Conversor.tasaActual || 1;

    // --- CONFIGURACIÓN SEGÚN EL MODO DEL CICLO ---
    let fuente = [];
    let color = '#ffd700'; // Dorado (Ventas)
    let titulo = 'Ventas Hoy (Bs)';

    if (modoGraficaActual === 1) {
        fuente = Persistencia.cargar('dom_gastos') || [];
        color = '#ff4444'; // Rojo (Gastos)
        titulo = 'Gastos Hoy (Bs)';
    } else if (modoGraficaActual === 2) {
        fuente = Persistencia.cargar('dom_fiaos') || [];
        color = '#ffa500'; // Naranja (Fiaos)
        titulo = 'Fiaos Hoy (Bs)';
    } else {
        fuente = Persistencia.cargar('dom_ventas') || [];
    }

    // --- PROCESAMIENTO DE DATOS ---
    const datosHoy = fuente.filter(i => i.fecha === hoy);
    const datosPorHora = new Array(24).fill(0);

    datosHoy.forEach(item => {
        if (item.hora) {
            const h = parseInt(item.hora.split(':')[0]);
            const monto = (modoGraficaActual === 2) 
                ? (parseFloat(item.montoUSD) * t || 0) 
                : (parseFloat(item.montoBs) || 0);
            datosPorHora[h] += monto;
        }
    });

    if (miGrafica) miGrafica.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, color + '55');
    gradient.addColorStop(1, color + '00');

    miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: titulo, // El título cambia en el tooltip
                data: datosPorHora,
                borderColor: color,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0 // Más limpio, solo se ve al tocar
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                // Añadimos un título pequeño flotante opcional
                title: {
                    display: true,
                    text: titulo,
                    color: color,
                    font: { size: 14, weight: 'bold' },
                    padding: { bottom: 10 }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false }, ticks: { maxRotation: 0 } }
            }
        }
    });
 }

};