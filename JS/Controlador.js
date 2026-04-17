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
    // 1. Feedback inmediato
    if (typeof DominusAudio !== 'undefined') DominusAudio.play('scan');
    
    // 2. Sincronizar input de Inventario (Por si acaso estás cargando stock)
    const inputInv = document.getElementById('inv-codigo');
    if (inputInv) {
        inputInv.value = codigo;
        inputInv.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 3. Buscar el producto
    const producto = Inventario.productos.find(p => p.codigo === codigo);
    
    if (producto) {
        const manejarVenta = (talla = null) => {
            // A. VALIDACIÓN DE STOCK
            const stockDisponible = talla ? producto.tallas[talla] : producto.cantidad;
            if (!stockDisponible || stockDisponible <= 0) {
                if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
                return notificar(`❌ ALERTA: ${producto.nombre} AGOTADO`, "error");
            }

            // B. BUSCAR PRECIO
            const precioSugerido = producto.precio || (typeof Inventario.buscarPrecioMemoria === 'function' ? Inventario.buscarPrecioMemoria(producto.nombre) : 0) || 0;

            if (precioSugerido > 0) {
                // --- DECISIÓN DE FLUJO ---
                // Si la cámara está activa, lo mandamos al CARRITO (Modo Ráfaga)
                // Si la cámara está cerrada, hacemos la VENTA DIRECTA (Tu lógica original)
                
                if (window.scannerActivo) {
                    Ventas.prepararParaCarrito(
                        producto.nombre, precioSugerido, 'USD', 'Efectivo', 'Anónimo', 0, false, 1, talla
                    );
                } else {
                    Ventas.registrarVenta(
                        producto.nombre, precioSugerido, 'USD', 'Efectivo', 'Anónimo', 0, false, 1, talla
                    );
                    notificar(`💰 Venta: ${producto.nombre} - $${precioSugerido}`, "success");
                    if (typeof Interfaz !== 'undefined') Interfaz.renderVentas();
                }

                // 4. LIMPIEZA DE INPUT (Solo si no hay cámara para no abrir teclado)
                const campoIDVenta = document.getElementById('codigo-venta');
                if (campoIDVenta && !window.scannerActivo) {
                    campoIDVenta.value = '';
                    campoIDVenta.focus(); 
                } else if (campoIDVenta) {
                    campoIDVenta.value = ''; // Limpiamos pero sin focus()
                }

            } else {
                // Si no hay precio, pedimos precio (esto cerrará el scanner por el modal)
                if (window.scannerActivo) Scanner.detenerYSalir();
                this.pedirPrecioYRegistrarVenta(producto, talla);
            }
        };

        // --- DISPARADOR DE TALLAS ---
        if (producto.tallas && Object.keys(producto.tallas).length > 0) {
            // Si hay tallas, detenemos el scanner momentáneamente para que el modal funcione
            if (window.scannerActivo) Scanner.detenerYSalir(); 
            this.mostrarModalTallas(
                "Seleccionar Talla",
                `¿Talla de ${producto.nombre}?`,
                Object.keys(producto.tallas),
                (tallaElegida) => manejarVenta(tallaElegida)
            );
        } else {
            manejarVenta(null);
        }

    } else {
        // --- PRODUCTO NUEVO ---
        if (window.scannerActivo) Scanner.detenerYSalir(); // Cerramos cámara para ver el diálogo
        notificar(`⚠️ El código ${codigo} no existe`, "info");
        this.confirmarAccion(
            "Producto No Registrado",
            `El código <b>${codigo}</b> no está en el inventario...`,
            () => {
                // Lógica de ir a inventario (la tuya es perfecta)
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
                }, 500);
            },
            null, "Ir a Inventario", "Cancelar"
        );
    }
},

/**
 * Función auxiliar para inyectar datos en la interfaz y procesar la venta
 * sin intervención manual (el "Enter" automático).
 */
autoRegistrarVenta: function(producto, talla) {
    // 1. Identificamos los campos de la interfaz de ventas
    const campoID = document.getElementById('codigo-venta');
    const campoNombre = document.getElementById('nombre-venta'); 
    const campoPrecio = document.getElementById('precio-venta');

    // 2. Inyectamos los datos del inventario
    if (campoID) campoID.value = producto.codigo;
    if (campoNombre) campoNombre.value = producto.nombre + (talla ? ` (${talla})` : "");
    if (campoPrecio) campoPrecio.value = producto.precio;

    // 3. ¡EL MOMENTO CLAVE!: Disparamos el registro
    // Llamamos a la función que guarda el item en la lista actual de ventas
    // Asegúrate de que esta función exista en tu Interfaz o Controlador
    if (typeof Interfaz.confirmarProductoLista === 'function') {
        Interfaz.confirmarProductoLista();
    } else {
        // Si no tienes esa función separada, ejecutamos la lógica de 'pedirPrecio'
        // pero enviándole los datos para que no pregunte nada.
        Interfaz.pedirPrecioYRegistrarVenta(producto, talla, true); 
    }

    // 4. Limpieza y preparación para el siguiente escaneo (Paso, Paso, Paso...)
    setTimeout(() => {
        if (campoID) {
            campoID.value = '';
            campoID.focus(); // Mantenemos el foco para la pistola láser
        }
    }, 200);
},

procesarEscaneoVentaRapida: function(identificador) {
    console.log("DOMINUS: Procesando identificador:", identificador);
    const idLimpio = String(identificador).trim();

    // 1. Buscamos el producto en el Inventario (Blindaje de tipos de datos)
    // Usamos doble igual (==) a propósito o String() para comparar códigos que puedan ser números
    const p = Inventario.productos.find(prod => 
        prod.nombre === idLimpio || 
        (prod.codigo && String(prod.codigo).trim() === idLimpio)
    );

    // 2. Feedback si NO existe
    if (!p) {
        // El audio 'error' ya se dispara dentro de notificar(..., 'error')
        const cCod = document.getElementById('v-codigo');
        if (cCod) {
            cCod.value = idLimpio;
            cCod.focus(); // Ponemos el foco para que el usuario pueda corregir rápido
        }
        return notificar(`No registrado: ${idLimpio}`, "error");
    }

    // 3. PINTADO VISUAL INICIAL
    // Llenamos los campos para que el usuario sepa qué se encontró
    const inputCodigo = document.getElementById('v-codigo');
    const inputProducto = document.getElementById('v-producto');
    
    if (inputCodigo) inputCodigo.value = p.codigo || idLimpio;
    if (inputProducto) inputProducto.value = p.nombre;
    
    // 4. PASAMOS EL CONTROL A LA AUTOMATIZACIÓN
    if (typeof this.finalizarVentaAutomatica === 'function') {
        // Notificación silenciosa de éxito (sin alert, solo feedback visual si lo deseas)
        this.finalizarVentaAutomatica(p);
    } else {
        // Backup de seguridad
        const inputMonto = document.getElementById('v-monto');
        if (inputMonto) inputMonto.value = p.precio;
        notificar(`Cargado: ${p.nombre}`, "exito");
    }

    // Subida suave para dispositivos móviles
    window.scrollTo({ top: 0, behavior: 'smooth' });
},

ejecutarVenta() {
    // 1. CAPTURA Y NORMALIZACIÓN (Blindaje de inputs)
    const inputProducto = document.getElementById('v-producto');
    const inputMonto = document.getElementById('v-monto');
    const inputCant = document.getElementById('v-cantidad');
    const inputCli = document.getElementById('v-cliente');
    
    // Captura segura: si no existe el elemento, no rompemos el código
    const p = inputProducto?.value.trim() || '';
    const m = inputMonto ? parseFloat(inputMonto.value) : NaN;
    const cantidad = (inputCant && inputCant.value !== "") ? parseFloat(inputCant.value) : 1;
    const cli = inputCli?.value.trim() || 'Cliente General';

    const selectTalla = document.getElementById('v-talla');
    const divTalla = document.getElementById('contenedor-talla'); 
    // 🛡️ Normalización de talla: siempre string, nunca null
    let tallaElegida = (selectTalla && selectTalla.value) ? selectTalla.value : "";

    const inputMon = document.getElementById('v-moneda');
    const inputMet = document.getElementById('v-metodo');
    const mon = inputMon?.value || 'USD';
    const met = inputMet?.value || 'Efectivo';

    const inputCom = document.getElementById('v-comision');
    const comFinal = inputCom ? (parseFloat(inputCom.value) || 0) : 0;

    const btnPunto = document.getElementById('btn-modo-punto');
    const esServicio = btnPunto ? btnPunto.classList.contains('activo-punto') : false;

    const modoLibre = (typeof Inventario !== 'undefined' && Inventario.activo === false);

    // 2. VALIDACIONES DE SEGURIDAD
    if(!p || isNaN(m)) {
        return notificar("Falta producto o monto", "error");
    }

    if (met === 'Fiao' && cli === 'Cliente General') {
        return notificar("Para un fiao necesito el nombre del cliente", "fiao");
    }

    // 🛡️ Validación estricta de tallas si el inventario está activo
    const necesitaTalla = divTalla && !divTalla.classList.contains('hidden');
    if (!modoLibre && necesitaTalla) {
        if (!tallaElegida || tallaElegida === "null" || tallaElegida === "") {
            return notificar("Por favor, selecciona una talla o peso", "error");
        }
    }

    // 3. PROCESAMIENTO (El puente hacia el carrito)
    if (typeof Ventas !== 'undefined' && typeof Ventas.prepararParaCarrito === 'function') {
        // 🚀 Pasamos los datos ya limpios y validados
        Ventas.prepararParaCarrito(p, m, mon, met, cli, comFinal, esServicio, cantidad, tallaElegida);
        
        // El sistema aprende nombres nuevos automáticamente para auto-sugerencia
        if (!esServicio && typeof Inventario?.aprenderDeVenta === 'function') {
            Inventario.aprenderDeVenta(p, m);
        }
    } else {
        return notificar("Error: El módulo de ventas no responde", "error");
    }
    
    // 4. LIMPIEZA Y UX
    this.limpiarInterfazVenta(inputProducto, inputMonto, inputCant, divTalla, selectTalla);
    
    if (typeof this.renderCarrito === 'function') this.renderCarrito();
    
    // 🛡️ Manejo inteligente del foco para el escáner
    if (inputProducto && !window.scannerActivo) { 
        inputProducto.focus(); 
    } 
    
    const msj = modoLibre ? "🛒 Añadido (Sin descontar inventario)" : "🛒 Añadido a la cuenta";
    notificar(msj, modoLibre ? "info" : "stock");
},

// Función auxiliar para mantener ejecutarVenta limpia
limpiarInterfazVenta(prod, monto, cant, divT, selT) {
    if (prod) prod.value = '';
    if (monto) monto.value = '';
    if (cant) cant.value = '1';
    if (divT) divT.classList.add('hidden');
    if (selT) selT.innerHTML = '<option value="">Seleccione Talla...</option>';
},

// 👇 NUEVA: Dibuja la lista temporal en pantalla
renderCarrito() {
    const contenedor = document.getElementById('lista-carrito-temporal');
    const totalBsDiv = document.getElementById('total-carrito-bs');
    const totalUsdDiv = document.getElementById('total-carrito-usd');

    if (!contenedor || !Ventas.carrito) return;

    if (Ventas.carrito.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:0.9em; padding:20px;">🛒 La cuenta está vacía</p>';
        if (totalBsDiv) totalBsDiv.innerText = '0.00 Bs';
        if (totalUsdDiv) totalUsdDiv.innerText = '$0.00';
        return;
    }

    let htmlCarrito = '';

    Ventas.carrito.forEach((item, index) => {
        const nombreMostrar = item.tallaEscogida ? `${item.p} (${item.tallaEscogida})` : item.p;
        
        // 🛡️ LÓGICA DE ALERTAS DE STOCK EN TIEMPO REAL
        let avisoStock = '';
        let bordeStock = ''; // Para reforzar visualmente el borde si hay problema

        if (item.validarInventario && typeof Inventario !== 'undefined') {
            const nombreLimpio = item.p.trim().toLowerCase();
            const inv = Inventario.productos.find(p => p.nombre.toLowerCase() === nombreLimpio);
            
            if (inv) {
                const stockDisponible = parseFloat(inv.cantidad) || 0;
                const min = parseFloat(inv.stockMinimo) || 3;

                if (item.cant > stockDisponible) {
                    avisoStock = `<span class="badge-stock-warning">🚨 ¡SUPERA EL STOCK! (Disp: ${stockDisponible})</span>`;
                    bordeStock = '2px solid #ff4444';
                } else if (item.cant >= stockDisponible) {
                    avisoStock = `<span class="badge-stock-warning">⚠️ ¡ÚLTIMA UNIDAD!</span>`;
                    bordeStock = '2px solid #ff4444';
                } else if (stockDisponible - item.cant <= min) {
                    avisoStock = `<span class="badge-stock-warning" style="color: #ffa500; animation: none;">⚠️ QUEDARÁ POCO STOCK</span>`;
                }
            }
        }

        const esModoLibre = (item.validarInventario === false);
        const iconoModo = esModoLibre ? '<span style="color:#ff9800; font-size:0.8em;"> [🔓 MODO LIBRE]</span>' : '';
        // Prioridad de borde: Alerta Stock > Modo Libre > Normal
        const bordeLateral = bordeStock ? bordeStock : (esModoLibre ? '3px solid #ff9800' : '3px solid var(--primary)');

        htmlCarrito += `
            <div style="display:flex; justify-content:space-between; background:rgba(0,0,0,0.2); padding:10px; margin-bottom:8px; border-radius:8px; border-left: ${bordeLateral}; align-items:center; animation: fadeIn 0.3s ease; position: relative;">
                <div style="flex-grow:1;">
                    <b style="font-size:0.95em; color: ${esModoLibre ? '#ff9800' : 'white'};">${item.cant}x ${nombreMostrar}${iconoModo}</b>
                    ${avisoStock}
                    <br>
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

    // 2. Procesamiento en el motor (Cerebro)
    const exito = Ventas.procesarCobroCarrito();

    if (exito) {
        // --- 🚀 FASE DE ACTUALIZACIÓN (Sincronización Total) ---
        if (typeof Interfaz !== 'undefined') {
            if (typeof Interfaz.actualizarDashboard === 'function') {
                Interfaz.actualizarDashboard();
            }
            if (typeof Interfaz.renderInventario === 'function') {
                Interfaz.renderInventario();
            }
            if (typeof Interfaz.renderVentas === 'function') {
                Interfaz.renderVentas(); 
            }
        }

        // --- 🧼 FASE DE LIMPIEZA DE INTERFAZ ---
        const idInputsALimpiar = ['v-cliente', 'v-producto', 'v-monto', 'v-cantidad', 'v-comision'];
        idInputsALimpiar.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = (id === 'v-cantidad') ? '1' : '';
            }
        });

        const metodoPago = document.getElementById('v-metodo');
        if (metodoPago) metodoPago.value = 'Efectivo $'; 

        const moneda = document.getElementById('v-moneda');
        if (moneda) moneda.value = 'USD';

        const elementosAUltimar = ['wrapper-cliente', 'wrapper-comision', 'contenedor-talla', 'v-info-stock'];
        elementosAUltimar.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                id === 'v-info-stock' ? el.innerText = '' : el.classList.add('hidden');
            }
        });

        const btnPunto = document.getElementById('btn-modo-punto');
        if (btnPunto) btnPunto.classList.remove('activo-punto');

        // --- 🛒 RESETEO DEL CARRITO ---
        if (typeof this.limpiarSeleccionVenta === 'function') {
            this.limpiarSeleccionVenta();
        }
        this.renderCarrito(); 

        // --- 🔊 FEEDBACK AUDITIVO (Caja Registradora) ---
        if (typeof DominusAudio !== 'undefined') {
            DominusAudio.play('exito'); 
        }

        // --- 🎯 FOCO AUTOMÁTICO ---
        const inputProd = document.getElementById('v-producto');
        if (inputProd) inputProd.focus();
        
        notificar("✅ ¡Venta Cobrada con Éxito!", "exito");

        // --- 🛡️ INYECCIÓN CENTINELA DOMINUS ---
        // Después de cobrar, actualizamos todas las notificaciones (Burbujas de Stock, Fiaos y Cierre)
        if (typeof Notificaciones !== 'undefined') {
            Notificaciones.revisarTodo();
        }

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
    const esVistaVentas = !document.getElementById('view-ventas').classList.contains('hidden');

    if (window.scannerActivo && !esVistaVentas) {
        Scanner.detenerYSalir();
    }

    // 🔍 BUSQUEDA POR ID O NOMBRE (Doble seguridad)
    const p = Inventario.productos.find(prod => 
        prod.id === identificador || 
        prod.nombre === identificador || 
        (prod.codigo && prod.codigo === identificador)
    );

    // --- CASO A: PRODUCTO NUEVO ---
    if (!p) {
        Inventario.idEdicion = null; 
        // 🛡️ BLINDAJE CRÍTICO: Limpiar tallas temporales para el producto nuevo
        window.tallasTemporales = {}; 

        notificar("🆕 Producto nuevo detectado", "info");
        this.limpiarFormularioInventario(); 
        
        const inputCodigo = document.getElementById('inv-codigo');
        if (inputCodigo) {
            inputCodigo.value = identificador; 
            inputCodigo.style.border = "2px solid var(--primary)";
        }

        // Reset del botón a modo "Crear"
        const btnGuardar = document.querySelector('button[onclick*="guardarEnInventario"]');
        if (btnGuardar) {
            btnGuardar.innerText = "➕ Crear Producto";
            btnGuardar.style.background = "var(--primary)";
        }

        setTimeout(() => document.getElementById('inv-nombre')?.focus(), 300);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // --- CASO B: PRODUCTO EXISTENTE ---
    Inventario.idEdicion = p.id; 

    document.getElementById('inv-codigo').value = p.codigo || "";
    document.getElementById('inv-nombre').value = p.nombre;
    document.getElementById('inv-cant').value = p.cantidad;
    document.getElementById('inv-precio').value = p.precio;
    
    if(document.getElementById('inv-unidad')) {
        document.getElementById('inv-unidad').value = p.unidad || "Und";
    }

    // 🛡️ Clonación segura (Si p.tallas es null/undefined, queda {} )
    window.tallasTemporales = p.tallas ? JSON.parse(JSON.stringify(p.tallas)) : {}; 

    const btnGuardar = document.querySelector('button[onclick*="guardarEnInventario"]');
    if (btnGuardar) {
        btnGuardar.innerText = "💾 Guardar Cambios";
        btnGuardar.style.background = "#2196F3"; 
    }

    setTimeout(() => document.getElementById('inv-nombre')?.focus(), 300);
    notificar(`Editando: ${p.nombre}`, "info");
    window.scrollTo({ top: 0, behavior: 'smooth' });
},

// Función de apoyo para no repetir código
finalizarVentaAutomatica: function(producto, talla = null) {
    console.log("DOMINUS: Finalizando proceso para", producto.nombre);

    // 1. Llenamos los campos de la interfaz
    const vMonto = document.getElementById('v-monto');
    const vCant = document.getElementById('v-cantidad');
    const vProd = document.getElementById('v-producto');

    if (vProd) vProd.value = producto.nombre;
    if (vMonto) vMonto.value = producto.precio;
    if (vCant) vCant.value = 1;

    // 2. ¿TIENE TALLAS?
    if (producto.tallas && Object.keys(producto.tallas).length > 0 && !talla) {
        const clavesTallas = Object.keys(producto.tallas);
        
        // --- MEJORA: AUTO-SELECCIÓN SI SOLO HAY UNA TALLA ---
        if (clavesTallas.length === 1) {
            talla = clavesTallas[0];
            console.log(`DOMINUS: Auto-seleccionada única medida: ${talla}`);
        } else {
            // Si hay varias, hay que preguntar
            if (typeof Interfaz !== 'undefined' && Interfaz.actualizarSelectorTallas) {
                Interfaz.actualizarSelectorTallas(producto.nombre);
            }
            
            notificar(`Seleccione medida para ${producto.nombre}`, "info");
            
            // Solo hacemos focus si la cámara NO está abierta
            if (!window.scannerActivo) {
                const selTalla = document.getElementById('v-talla');
                if (selTalla) selTalla.focus();
            }
            
            return; // Esperamos elección manual
        }
    }

    // 3. Sincronización de Talla (Si ya existe o fue auto-seleccionada)
    if (talla) {
        const selTalla = document.getElementById('v-talla');
        if (selTalla) {
            selTalla.innerHTML = `<option value="${talla}">${talla}</option>`;
            selTalla.value = talla;
        }
    }

    // 4. EJECUCIÓN DE VENTA
    setTimeout(() => {
        if (typeof this.ejecutarVenta === 'function') {
            this.ejecutarVenta();
        }
        
        // Limpiamos el campo de código
        const vCodigo = document.getElementById('v-codigo');
        if (vCodigo) {
            // En modo ráfaga limpiamos más rápido para no confundir visualmente
            const delayLimpieza = window.scannerActivo ? 500 : 1000;
            setTimeout(() => { vCodigo.value = ''; }, delayLimpieza);
        }
        
        // --- BLOQUEO DE INTERRUPCIONES ---
        // Si el escáner está activo, NO hacemos focus ni scroll
        if (!window.scannerActivo) {
            if (vProd) vProd.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
    }, 150); 
},

// Dentro de tu objeto Controlador en JS/Controlador.js
eliminarUltimoDelCarrito: function() {
    // 1. Verificamos que el carrito exista y tenga algo
    if (typeof Ventas !== 'undefined' && Ventas.carrito && Ventas.carrito.length > 0) {
        
        // 2. Referenciamos el último índice y el elemento real
        const ultimoIndice = Ventas.carrito.length - 1;
        const item = Ventas.carrito[ultimoIndice];

        // Guardamos el nombre usando 'item.p' (como en tu render)
        window.ultimoNombreBorrado = item.p;

        // 3. LÓGICA DE DEVOLUCIÓN POR UNIDAD (Usando 'item.cant')
        if (item.cant > 1) {
            // Calculamos el precio unitario antes de restar para actualizar totales
            const precioUnitarioBs = item.totalBs / item.cant;
            const precioUnitarioUSD = item.totalUSD / item.cant;

            // Restamos la unidad
            item.cant -= 1;
            
            // Actualizamos los totales del item para que el render los muestre bien
            item.totalBs = item.cant * precioUnitarioBs;
            item.totalUSD = item.cant * precioUnitarioUSD;
            
            console.log(`DOMINUS: Se restó 1 unidad de: ${window.ultimoNombreBorrado}. Quedan: ${item.cant}`);
        } else {
            // Si solo queda una unidad, eliminamos el renglón completo
            Ventas.carrito.pop();
            console.log(`DOMINUS: Se eliminó el renglón completo de: ${window.ultimoNombreBorrado}`);
        }

        // 4. DEVOLUCIÓN DE STOCK (Sincronizado con 'item.p')
        // Buscamos por item.p que es el nombre del producto
        const pOriginal = Inventario.productos.find(p => p.nombre === item.p);
        if (pOriginal && pOriginal.stock !== undefined) {
            pOriginal.stock += 1;
            console.log(`DOMINUS: Stock restaurado (+1) para ${pOriginal.nombre}`);
        }

        // 5. REFRESCAR INTERFAZ
        // Llamamos a renderCarrito que ya usa item.cant e item.p
        if (typeof this.renderCarrito === 'function') {
            this.renderCarrito();
        }
        
        // Recalculamos totales globales de la venta
        if (typeof Ventas.calcularTotales === 'function') {
            Ventas.calcularTotales();
        }

    } else {
        if (typeof notificar === 'function') notificar("Nada que deshacer", "alerta");
    }
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
    // 1. Limpieza de campos básicos
    document.getElementById('inv-codigo').value = '';
    document.getElementById('inv-nombre').value = '';
    document.getElementById('inv-cant').value = '';
    document.getElementById('inv-precio').value = '';
    
    const unidadElemento = document.getElementById('inv-unidad');
    if(unidadElemento) unidadElemento.value = 'Und';
    
    // 🛡️ CRÍTICO: Limpiar memoria de edición y tallas
    tallasTemporales = {};
    Inventario.idEdicion = null; // 👈 Sin esto, el sistema se queda "pegado" en el último producto editado

    // 2. Restaurar botón a su estado original
    // Ahora buscamos cualquier botón que mencione "guardarEnInventario" para resetear su texto/color
    const btnGuardar = document.querySelector('button[onclick*="guardarEnInventario"]');
    if (btnGuardar) {
        btnGuardar.innerText = "💾 Guardar";
        btnGuardar.style.background = ""; // Vuelve al color original de tu CSS (verde/primario)
    }

    // 3. 🛡️ FOCUS INTELIGENTE (El toque DOMINUS)
    const esVistaVentas = !document.getElementById('view-ventas').classList.contains('hidden');
    
    if (!window.scannerActivo || !esVistaVentas) {
        // Sugerencia: Si tu papá usa escáner, quizás el foco debería ir al Código primero. 
        // Pero si prefieres el Nombre, mantenemos este:
        const inputNombre = document.getElementById('inv-nombre');
        if (inputNombre) inputNombre.focus();
    }
    
    console.log("DOMINUS: Memoria de edición liberada y formulario limpio.");
},

ejecutarGasto() {
    const inputDesc = document.getElementById('g-desc');
    const inputMonto = document.getElementById('g-monto');
    const inputMon = document.getElementById('g-moneda');

    const d = inputDesc ? inputDesc.value.trim() : '';
    const m = inputMonto ? parseFloat(inputMonto.value) : NaN;
    const mon = inputMon ? inputMon.value : 'USD';
    
    if(!d || isNaN(m) || m <= 0) {
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
        notificar("❌ Escribe una descripción y un monto válido", "error");
        return;
    }

    Interfaz.confirmarAccion(
        "Registrar Gasto",
        `¿Confirmar gasto de ${m} ${mon} por: "${d}"?`,
        () => {                
            // 1. Motor de datos: Registra y guarda en localStorage
            Ventas.registrarGasto(d, m, mon);
            
            // 2. Sincronización Inmediata: Refrescar Dashboard y la Lista de Gastos
            if (typeof Interfaz !== 'undefined') {
                // Actualizamos los números del dashboard (Ingresos/Gastos)
                if (typeof Interfaz.actualizarDashboard === 'function') {
                    Interfaz.actualizarDashboard();
                }
                // Dibujamos la lista de nuevo para que aparezca el último registro
                if (typeof Interfaz.renderGastos === 'function') {
                    Interfaz.renderGastos(); 
                }
            }
            
            // 3. Limpieza y Foco: Prepara el terreno para el siguiente gasto
            if (inputDesc) inputDesc.value = '';
            if (inputMonto) inputMonto.value = '';
            if (inputDesc) inputDesc.focus(); // 👈 El cursor vuelve aquí solo
            
            if (typeof DominusAudio !== 'undefined') DominusAudio.play('error'); // Sonido de salida
            notificar("💸 Gasto registrado correctamente", "exito");
        },
        null, 
        "Sí, registrar",
        "Cancelar",
        false 
    );
},

guardarEnInventario() { 
    // 1. Captura y Normalización
    const inputCod = document.getElementById('inv-codigo');
    const codigo = inputCod ? inputCod.value.trim() : '';
    const nombreRaw = document.getElementById('inv-nombre').value.trim();
    const cStr = document.getElementById('inv-cant').value;
    const pStr = document.getElementById('inv-precio').value;
    const u = document.getElementById('inv-unidad')?.value || 'Und';
    const nMinStr = document.getElementById('inv-minimo')?.value || (u === 'Kg' ? 1.5 : 3);

    // 2. Validaciones Críticas
    if(!nombreRaw || cStr === "") {
        return notificar("❌ Falta nombre o cantidad", "error");
    }

    const c = parseFloat(cStr);
    const p = parseFloat(pStr) || 0;
    const nMin = parseFloat(nMinStr);

    // 🛡️ CONTROL DE DUPLICADOS (Evita que dos productos tengan el mismo código)
    if (codigo !== "" && typeof Inventario !== 'undefined') {
        const existe = Inventario.productos.find(prod => prod.codigo === codigo);
        if (existe && existe.id !== Inventario.idEdicion) {
            return notificar(`❌ El código "${codigo}" ya lo tiene: ${existe.nombre}`, "error");
        }
    }

    // 3. VALIDACIÓN DE INTEGRIDAD (Suma de tallas === Total)
    const tieneTallas = typeof tallasTemporales !== 'undefined' && Object.keys(tallasTemporales).length > 0;
    if (tieneTallas) {
        const sumaTallas = Object.values(tallasTemporales).reduce((a, b) => a + b, 0);
        // Usamos un margen de error de 0.001 por los gramos en pesaje
        if (Math.abs(sumaTallas - c) > 0.001) {
            return notificar(`❌ Error: El total es ${c}, pero el desglose suma ${sumaTallas.toFixed(3)}.`, "error");
        }
    }

    // 🛡️ BLINDAJE: Si no tiene tallas, guardamos objeto vacío, no null.
    const tallasParaGuardar = tieneTallas ? {...tallasTemporales} : {}; 
    
    // 4. 🚀 LÓGICA DE PERSISTENCIA
    let exito = false;

    if (Inventario.idEdicion) {
        // MODO EDICIÓN: Usamos el ID como ancla de seguridad
        const index = Inventario.productos.findIndex(prod => prod.id === Inventario.idEdicion);
        
        if (index !== -1) {
            // Actualizamos directamente en el array para evitar fallos de referencia por nombre
            const pAntiguo = Inventario.productos[index];
            
            Inventario.actualizar(
                pAntiguo.nombre,  // nOriginal (para logs o histórico)
                nombreRaw,        // nNuevo
                c, p, u, 
                tallasParaGuardar, 
                nMin,             // nMin
                codigo            // nCodigo
            );
            exito = true; 
        }
    } else {
        // MODO GUARDAR: Nuevo producto
        exito = Inventario.guardar(nombreRaw, c, p, u, tallasParaGuardar, codigo, nMin); 
    }

    // 5. FINALIZACIÓN Y LIMPIEZA
    if(exito) {
        // 🛡️ Reset total de variables temporales
        window.tallasTemporales = {}; 
        Inventario.idEdicion = null; 

        this.limpiarFormularioInventario();

        if (typeof Interfaz !== 'undefined' && Interfaz.renderInventario) {
            Interfaz.renderInventario();
        }
        
        const mensaje = Inventario.idEdicion ? "actualizado" : "guardado";
        notificar(`✅ "${nombreRaw}" listo.`, "exito");
        
        // Volver arriba para que tu papá vea la lista
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
},

mostrarStockDisponible: function(talla) {
    const nombreProd = document.getElementById('v-producto')?.value;
    const infoStock = document.getElementById('v-info-stock');
    const inputCant = document.getElementById('v-cantidad');
    const btnAnadir = document.getElementById('btn-anadir-carrito') || document.querySelector('button[onclick*="ejecutarVenta"]');
    
    const validacionActiva = (typeof Inventario !== 'undefined' && Inventario.activo === true);

    if (!nombreProd) {
        if(infoStock) infoStock.innerText = "";
        return;
    }

    const p = Inventario.productos.find(prod => prod.nombre.toLowerCase() === nombreProd.trim().toLowerCase());
    
    if (p) {
        // 🛡️ MEJORA: Si el producto NO tiene tallas, usamos el stock global
        let stockDisponible;
        if (p.tallas && talla) {
            stockDisponible = parseFloat(p.tallas[talla]) || 0;
        } else {
            stockDisponible = parseFloat(p.cantidad) || 0;
        }

        const cantSolicitada = inputCant ? parseFloat(inputCant.value) || 0 : 1;
        const unidad = p.unidad || "Und";
        
        if(infoStock) {
            infoStock.innerText = ` Stock: ${stockDisponible} ${unidad}`;
            
            // LÓGICA CONSCIENTE (Blindada)
            const tieneSuficiente = (stockDisponible >= cantSolicitada);
            const puedeVender = !validacionActiva || (stockDisponible > 0 && tieneSuficiente);

            if (puedeVender) {
                infoStock.style.color = validacionActiva ? "#4caf50" : "#ff9800"; 
                if (!validacionActiva) infoStock.innerText += " (Modo Libre)";
                
                this.setEstadoBoton(btnAnadir, true);
            } else {
                infoStock.style.color = "#ff5252"; 
                infoStock.innerText += (stockDisponible <= 0) ? " (AGOTADO)" : " (INSUFICIENTE)";

                this.setEstadoBoton(btnAnadir, false);
            }
        }
    }
},

// Función auxiliar para no repetir código de botones
setEstadoBoton: function(btn, activado) {
    if(!btn) return;
    btn.disabled = !activado;
    btn.style.opacity = activado ? "1" : "0.5";
    btn.style.cursor = activado ? "pointer" : "not-allowed";
},

editarPrecioRapido(id, nuevoPrecio) {
    // 1. Buscamos por ID (Blindado: convertimos ambos a String para comparar)
    const producto = Inventario.productos.find(p => String(p.id) === String(id));
    
    if (producto) {
        // 2. Limpieza de entrada
        let valor = nuevoPrecio.replace(',', '.'); // Por si usa coma decimal por costumbre
        const precioLimpio = valor === "" ? 0 : parseFloat(valor);

        // 3. Validación de seguridad
        if (isNaN(precioLimpio) || precioLimpio < 0) {
            notificar("❌ Valor no válido", "error");
            // 🛡️ UX: Refrescamos la lista para devolver el precio anterior al input
            if (Interfaz && Interfaz.renderInventario) Interfaz.renderInventario();
            return;
        }

        // 4. Aplicamos el cambio (Normalizado a 2 decimales para evitar números infinitos)
        producto.precio = Number(precioLimpio.toFixed(2));
        
        // 5. Persistencia y Actualización
        Inventario.sincronizar(); 

        // 🛡️ Sincronización con Formulario: 
        // Si justo está editando ese producto, actualizamos el input del form también
        const inputFormPrecio = document.getElementById('inv-precio');
        if (Inventario.idEdicion === producto.id && inputFormPrecio) {
            inputFormPrecio.value = producto.precio;
        }
        
        // Una notificación sutil (tipo toast pequeña o consola)
        console.log(`💰 ${producto.nombre} -> $${producto.precio}`);
        
        // Si tienes una función de feedback visual rápido, úsala aquí
        // notificar(`Precio actualizado: ${producto.nombre}`, "exito");
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

    const inputMonto = document.getElementById('monto-abono');
    setTimeout(() => inputMonto.focus(), 100);

    document.getElementById('btn-cerrar-abono').onclick = () => overlay.remove();

    document.getElementById('btn-guardar-abono').onclick = () => {
        const monto = parseFloat(inputMonto.value);
        const moneda = document.getElementById('moneda-abono').value;
        const metodo = document.getElementById('metodo-abono').value;

        if (!monto || monto <= 0) return notificar("Ingrese un monto válido", "error");

        const resultado = Ventas.abonarDeudaPorCliente(nombreCliente, monto, moneda, metodo);

        if (resultado) {
            // --- 🛡️ INYECCIÓN CENTINELA ---
            if (typeof Notificaciones !== 'undefined') {
                Notificaciones.revisarTodo();
            }
            // ------------------------------

            if (typeof Interfaz !== 'undefined') Interfaz.renderFiaos();
            overlay.remove();
            notificar(`¡Abono de ${monto}${moneda === 'USD' ? '$' : 'Bs'} registrado!`, "exito");
        }
    };
},

// --- 2. MODIFICADO PARA ELIMINAR TODO EL TOTAL DEL CLIENTE ---
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

    const inputMonto = document.getElementById('monto-abono');
    setTimeout(() => inputMonto.focus(), 100);

    document.getElementById('btn-cerrar-abono').onclick = () => overlay.remove();

    document.getElementById('btn-guardar-abono').onclick = () => {
        const monto = parseFloat(inputMonto.value);
        const moneda = document.getElementById('moneda-abono').value;
        const metodo = document.getElementById('metodo-abono').value;

        if (!monto || monto <= 0) return notificar("Ingrese un monto válido", "error");

        const resultado = Ventas.abonarDeudaPorCliente(nombreCliente, monto, moneda, metodo);

        if (resultado) {
            // --- 🛡️ INYECCIÓN CENTINELA ---
            if (typeof Notificaciones !== 'undefined') {
                Notificaciones.revisarTodo();
            }
            // ------------------------------

            if (typeof Interfaz !== 'undefined') Interfaz.renderFiaos();
            overlay.remove();
            notificar(`¡Abono de ${monto}${moneda === 'USD' ? '$' : 'Bs'} registrado!`, "exito");
        }
    };
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

    // Dentro del objeto Controlador = { ... }

toggleModoPunto(activado) {
    const btnPunto = document.getElementById('btn-modo-punto');
    
    if (btnPunto) {
        // 1. Aplicamos el cambio visual inmediato
        btnPunto.style.display = activado ? 'block' : 'none';
        
        // 2. Guardamos la preferencia (Persistencia)
        Persistencia.guardar('dom_pref_modo_punto', activado);
        
        // 3. Notificación rápida de UX
        const msj = activado ? "Modo Punto Activado" : "Modo Punto Oculto";
        console.log(`🏧 DOMINUS: ${msj}`);
    }
},

// Esta función debe llamarse al cargar la app (en el init)
verificarPreferenciaPunto() {
    // Cargamos la preferencia, si no existe, por defecto es true (activado)
    const preferencia = Persistencia.cargar('dom_pref_modo_punto');
    const estadoFinal = preferencia !== null ? preferencia : true;
    
    // Sincronizamos el Switch de la configuración
    const checkPunto = document.getElementById('check-modo-punto');
    if (checkPunto) checkPunto.checked = estadoFinal;
    
    // Aplicamos al botón
    const btnPunto = document.getElementById('btn-modo-punto');
    if (btnPunto) btnPunto.style.display = estadoFinal ? 'block' : 'none';
},

    limpiarSeleccionVenta() {
        const met = document.getElementById('v-metodo');
        if(met) met.value = 'Efectivo $';
        Interfaz.toggleClienteField('Efectivo $');
    },

generarCierre: function() { 
    if (document.getElementById('modal-dinamico')) return;

    const r = Ventas.finalizarJornada(); 

    // --- 🚀 INYECCIÓN CENTINELA DOMINUS ---
    // Marcamos que se ha consultado el cierre y refrescamos las burbujas
    if (typeof Ventas !== 'undefined') Ventas.cierreRealizado = true; 
    
    if (typeof Notificaciones !== 'undefined') {
        Notificaciones.revisarTodo(); 
    }
    // --------------------------------------

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