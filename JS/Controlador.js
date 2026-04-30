let tallasTemporales = {}; // Variable global para almacenar tallas temporalmente durante la edición
let miGrafica = null; // Variable global para la gráfica de ventas
let modoGraficaActual = 0;


const modalEleccion = {
    abrir: function(config) {
        // 1. Limpieza inmediata para evitar duplicados
        const modalPrevio = document.getElementById('modal-dinamico');
        if (modalPrevio) modalPrevio.remove();

        // 2. HTML Limpio (Las clases CSS hacen el trabajo ahora)
        const html = `
            <div id="modal-dinamico" class="modal-eleccion">
                <div class="eleccion-content glass">
                    <h3>${config.titulo}</h3>
                    <p>${config.mensaje}</p>
                    <div id="contenedor-inputs-modal"></div>
                    <div id="btns-dinamicos" class="btns-eleccion"></div>
                    <button class="btn-no" onclick="modalEleccion.cerrar()">Cancelar</button>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Pequeño timeout para asegurar que la animación de entrada (opacity) se ejecute
        setTimeout(() => {
            document.getElementById('modal-dinamico').classList.add('active');
        }, 10);
        
        const contenedorBtns = document.getElementById('btns-dinamicos');

        // 3. Generación de botones dinámica
        config.botones.forEach(btn => {
            const b = document.createElement('button');
            
            // Clase por defecto 'btn-si' o la que pases en la config
            b.className = btn.clase || 'btn-si'; 
            b.innerHTML = btn.texto;
            
            // Solo aplicamos style dinámico si es estrictamente necesario (ej: un color de una categoría)
            if (btn.style) {
                b.style.cssText = btn.style;
            }

            b.onclick = () => { 
                btn.accion(); 
                if(!btn.mantener) modalEleccion.cerrar(); 
            };
            
            contenedorBtns.appendChild(b);
        });
    },

    cerrar: function() {
        const m = document.getElementById('modal-dinamico');
        if(m) {
            m.classList.remove('active');
            // Esperamos los 300ms de la transición definida en el CSS
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

    async forzarReinstalacion() {
    // Usamos tu función personalizada para el modal estilizado
    Interfaz.confirmarAccion(
        "Reiniciar Sistema",
        "Se forzará la descarga de la última versión de DOMINUS para corregir errores o actualizar módulos. ¿Continuar?",
        async () => {
            if ('serviceWorker' in navigator) {
                try {
                    // Eliminamos el registro actual para forzar la reinstalación
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (let reg of registrations) {
                        await reg.unregister();
                    }

                    // Limpiamos caché manualmente antes de recargar
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));

                    console.log("Sistema purgado. Recargando...");
                    // Recarga forzada desde el servidor
                    window.location.reload(true); 
                } catch (err) {
                    console.error("Error en reinstalación:", err);
                    window.location.reload(true);
                }
            } else {
                window.location.reload(true);
            }
        },
        null,
        "SÍ, REINSTALAR",
        "CANCELAR",
        true // esPeligroso = true para activar el color rojo y el icono ⚠️
    );
},
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

renderCarrito() {
    const contenedor = document.getElementById('lista-carrito-temporal');
    const totalBsDiv = document.getElementById('total-carrito-bs');
    const totalUsdDiv = document.getElementById('total-carrito-usd');

    if (!contenedor || !Ventas.carrito) return;

    if (Ventas.carrito.length === 0) {
        contenedor.innerHTML = '<p class="carrito-vacio-msg">🛒 La cuenta está vacía</p>';
        if (totalBsDiv) totalBsDiv.innerText = '0.00 Bs';
        if (totalUsdDiv) totalUsdDiv.innerText = '$0.00';
        return;
    }

    let htmlCarrito = '';

    Ventas.carrito.forEach((item, index) => {
        const nombreMostrar = item.tallaEscogida ? `${item.p} (${item.tallaEscogida})` : item.p;
        
        let avisoStock = '';
        let claseBorde = ''; 

        if (item.validarInventario && typeof Inventario !== 'undefined') {
            const nombreLimpio = item.p.trim().toLowerCase();
            const inv = Inventario.productos.find(p => p.nombre.toLowerCase() === nombreLimpio);
            
            if (inv) {
                const stockDisponible = parseFloat(inv.cantidad) || 0;
                const min = parseFloat(inv.stockMinimo) || 3;

                if (item.cant > stockDisponible) {
                    avisoStock = `<span class="badge-stock-warning">🚨 ¡SUPERA EL STOCK! (${stockDisponible})</span>`;
                    claseBorde = 'alerta-critica';
                } else if (item.cant >= stockDisponible) {
                    avisoStock = `<span class="badge-stock-warning">⚠️ ¡ÚLTIMA UNIDAD!</span>`;
                    claseBorde = 'alerta-critica';
                } else if (stockDisponible - item.cant <= min) {
                    avisoStock = `<span class="badge-stock-warning naranja">⚠️ POCO STOCK</span>`;
                }
            }
        }

        const esModoLibre = (item.validarInventario === false);
        const claseItem = `${claseBorde} ${esModoLibre ? 'modo-libre' : ''}`;

        htmlCarrito += `
            <div class="carrito-item ${claseItem}">
                <div class="carrito-item-info">
                    <b class="carrito-item-titulo ${esModoLibre ? 'libre' : ''}">
                        ${item.cant}x ${nombreMostrar} ${esModoLibre ? '🔓' : ''}
                    </b>
                    ${avisoStock}
                    <div class="carrito-item-precios">
                        ${item.totalBs.toLocaleString('es-VE')} Bs / $${item.totalUSD.toFixed(2)}
                    </div>
                </div>
                <button class="btn-del-item" onclick="Controlador.eliminarDelCarrito(${index})">X</button>
            </div>
        `;
    });

    contenedor.innerHTML = htmlCarrito;

    // ... lógica de totales (se mantiene igual)
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
        this.renderCarrito()

        // --- 🔊 FEEDBACK AUDITIVO (Caja Registradora) ---
        if (typeof DominusAudio !== 'undefined') {
            DominusAudio.play('exito'); 
        }

        // --- 🎯 FOCO AUTOMÁTICO ---
        const inputProd = document.getElementById('v-producto');
        if (inputProd) inputProd.focus();
        
        notificar("✅ ¡Venta Cobrada con Éxito!", "exito");

        // --- 🛡️ INYECCIÓN CENTINELA DOMINUS (SISTEMA DE NOTIFICACIONES) ---
        // Forzamos la actualización de las burbujas tras el cobro.
        if (typeof Notificaciones !== 'undefined') {
            // 1. Reseteamos el estado de 'visto' para que las burbujas vuelvan a aparecer
            Notificaciones.vistoStock = false;
            Notificaciones.vistoFiaos = false;
            
            // 2. Ejecutamos el recuento de Stock, Deudas y Alerta de Cierre
            Notificaciones.revisarTodo();
        }

    } else {
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
        notificar("❌ Error: No se pudo procesar el cobro", "error");
    }
},

eliminarDeuda(nombreCliente) {
    // 1. Invocamos tu función de confirmación personalizada
    Interfaz.confirmarAccion(
        "Liquidar Cuenta", 
        `¿Estás seguro de que deseas eliminar todas las deudas de <strong>${nombreCliente.toUpperCase()}</strong>? Esta acción no se puede deshacer.`,
        () => {
            // --- LOGICA DE ELIMINACIÓN (Se ejecuta al confirmar) ---
            
            // 2. Cargamos los datos actuales de la persistencia
            let fiaos = Persistencia.cargar('dom_fiaos') || [];
            
            // 3. Normalizamos el nombre para evitar errores por espacios o mayúsculas
            const nombreBusqueda = nombreCliente.trim().toLowerCase();
            
            // 4. Filtramos el array: mantenemos todo lo que NO sea de este cliente
            const nuevosFiaos = fiaos.filter(f => 
                f.cliente.trim().toLowerCase() !== nombreBusqueda
            );

            // 5. Guardamos la lista actualizada
            Persistencia.guardar('dom_fiaos', nuevosFiaos);
            
            // 6. Refrescamos la vista para que el cambio sea instantáneo
            Interfaz.renderFiaos();

            // Opcional: Si tienes un sistema de notificaciones tipo Toast
            // Interfaz.notificar(`Cuenta de ${nombreCliente} liquidada`, "success");
            
            console.log(`Deuda de ${nombreCliente} eliminada con éxito.`);
        },
        null, // onCancelar (no hace falta hacer nada si cancela)
        "SÍ, LIQUIDAR", 
        "VOLVER", 
        true // esPeligroso = true para que el modal use tonos rojos (alerta)
    );
},

 liquidarServicioManual(idVenta) {
    const venta = Ventas.historial.find(v => v.id === idVenta);
    if (!venta) return;

    const montoEstimado = venta.aEntregar;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active'; // Reutilizamos el overlay del sistema

    overlay.innerHTML = `
        <div class="modal-liquidacion-card glass">
            <h3>⚖️ Liquidar Punto</h3>
            <p class="liq-info-box">
                Liquidando: <b>${venta.producto}</b><br>
                Monto sugerido: <span class="liq-monto-sugerido">${montoEstimado.toLocaleString('es-VE')} Bs</span>
            </p>
            
            <label class="liq-label">Monto real a entregar:</label>
            <input type="number" id="liq-monto-final" value="${montoEstimado}" class="input-liq-monto">

            <div class="btn-group-liq">
                <button id="btn-cancelar-liq" class="btn-liq-cancelar">Cancelar</button>
                <button id="btn-confirmar-liq" class="btn-liq-confirmar">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    const inputMonto = document.getElementById('liq-monto-final');
    inputMonto.focus();
    inputMonto.select();

    document.getElementById('btn-cancelar-liq').onclick = () => overlay.remove();

    document.getElementById('btn-confirmar-liq').onclick = () => {
        const montoFinal = parseFloat(inputMonto.value);

        if (isNaN(montoFinal) || montoFinal <= 0) {
            return notificar("Ingrese un monto válido", "error");
        }

        // Lógica de registro (Mantenida intacta)
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

    const p = Inventario.productos.find(prod => 
        prod.id === identificador || 
        prod.nombre === identificador || 
        (prod.codigo && prod.codigo === identificador)
    );

    const inputCodigo = document.getElementById('inv-codigo');
    const btnGuardar = document.querySelector('.btn-inv-action'); // Asegúrate de ponerle esta clase en el HTML

    // --- CASO A: PRODUCTO NUEVO ---
    if (!p) {
        Inventario.idEdicion = null; 
        window.tallasTemporales = {}; 

        notificar("🆕 Producto nuevo detectado", "info");
        this.limpiarFormularioInventario(); 
        
        if (inputCodigo) {
            inputCodigo.value = identificador; 
            inputCodigo.classList.add('input-inv-nuevo'); // Aplicamos clase de resalte
        }

        if (btnGuardar) {
            btnGuardar.innerHTML = "➕ Crear Producto";
            btnGuardar.classList.remove('modo-editar');
            btnGuardar.classList.add('modo-crear');
        }

        this.finalizarPreparacion();
        return;
    }

    // --- CASO B: PRODUCTO EXISTENTE ---
    Inventario.idEdicion = p.id; 

    document.getElementById('inv-codigo').value = p.codigo || "";
    document.getElementById('inv-nombre').value = p.nombre;
    document.getElementById('inv-cant').value = p.cantidad;
    document.getElementById('inv-precio').value = p.precio;
    
    if(inputCodigo) inputCodigo.classList.remove('input-inv-nuevo');

    if(document.getElementById('inv-unidad')) {
        document.getElementById('inv-unidad').value = p.unidad || "Und";
    }

    window.tallasTemporales = p.tallas ? JSON.parse(JSON.stringify(p.tallas)) : {}; 

    if (btnGuardar) {
        btnGuardar.innerHTML = "💾 Guardar Cambios";
        btnGuardar.classList.remove('modo-crear');
        btnGuardar.classList.add('modo-editar');
    }

    notificar(`Editando: ${p.nombre}`, "info");
    this.finalizarPreparacion();
},

// Función auxiliar para no repetir código de scroll y focus
finalizarPreparacion: function() {
    setTimeout(() => document.getElementById('inv-nombre')?.focus(), 300);
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
    const campos = ['inv-codigo', 'inv-nombre', 'inv-cant', 'inv-precio'];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            el.classList.remove('input-inv-nuevo'); // Limpieza visual de la detección
        }
    });
    
    const unidadElemento = document.getElementById('inv-unidad');
    if(unidadElemento) unidadElemento.value = 'Und';
    
    // 🛡️ CRÍTICO: Limpiar memoria
    tallasTemporales = {};
    Inventario.idEdicion = null; 

    // 2. Restaurar botón usando clases (Cero estilos en línea)
    const btnGuardar = document.querySelector('.btn-inv-action'); 
    if (btnGuardar) {
        btnGuardar.innerHTML = "💾 Guardar";
        btnGuardar.classList.remove('modo-editar');
        btnGuardar.classList.add('modo-crear'); // Por defecto vuelve a modo creación
    }

    // 3. 🛡️ FOCUS INTELIGENTE
    const esVistaVentas = !document.getElementById('view-ventas').classList.contains('hidden');
    
    if (!window.scannerActivo || !esVistaVentas) {
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
        let stockDisponible;
        if (p.tallas && talla) {
            stockDisponible = parseFloat(p.tallas[talla]) || 0;
        } else {
            stockDisponible = parseFloat(p.cantidad) || 0;
        }

        const cantSolicitada = inputCant ? parseFloat(inputCant.value) || 0 : 1;
        const unidad = p.unidad || "Und";
        
        if(infoStock) {
            // Limpiamos clases previas
            infoStock.classList.remove('stock-disponible', 'stock-modo-libre', 'stock-alerta');
            infoStock.innerText = ` Stock: ${stockDisponible} ${unidad}`;
            
            const tieneSuficiente = (stockDisponible >= cantSolicitada);
            const puedeVender = !validacionActiva || (stockDisponible > 0 && tieneSuficiente);

            if (puedeVender) {
                // Asignamos clase según modo
                infoStock.classList.add(validacionActiva ? 'stock-disponible' : 'stock-modo-libre');
                
                if (!validacionActiva) infoStock.innerText += " (Modo Libre)";
                this.setEstadoBoton(btnAnadir, true);
            } else {
                // Caso: Error / Agotado
                infoStock.classList.add('stock-alerta');
                infoStock.innerText += (stockDisponible <= 0) ? " (AGOTADO)" : " (INSUFICIENTE)";
                this.setEstadoBoton(btnAnadir, false);
            }
        }
    }
},

// Función auxiliar para centralizar la lógica del botón
setEstadoBoton: function(btn, activo) {
    if (!btn) return;
    if (activo) {
        btn.classList.remove('btn-disabled');
        btn.disabled = false;
    } else {
        btn.classList.add('btn-disabled');
        btn.disabled = true;
    }
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
    const nombreBusqueda = nombreCliente.trim().toLowerCase();
    const deudasCliente = Ventas.deudas.filter(d => 
        (d.cliente || "").trim().toLowerCase() === nombreBusqueda
    );
    
    if (deudasCliente.length === 0) return notificar("No se encontraron deudas", "error");

    const totalUSD = deudasCliente.reduce((sum, d) => sum + parseFloat(d.montoUSD || 0), 0);
    const totalBs = totalUSD * Conversor.tasaActual;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';

    overlay.innerHTML = `
        <div class="modal-abono-card glass">
            <span class="abono-icon">🤝</span>
            <h3>Registrar Abono</h3>
            <p style="font-size:0.9em; opacity:0.7;">Cliente: <strong>${nombreCliente}</strong></p>
            
            <div class="abono-saldo-box">
                $${totalUSD.toFixed(2)} <br>
                <small style="font-size:0.7em; opacity:0.8;">(${totalBs.toLocaleString('es-VE')} Bs)</small>
            </div>
            
            <div class="abono-form-group">
                <input type="number" id="monto-abono" placeholder="¿Cuánto paga?" inputmode="decimal" class="input-abono">
                
                <select id="moneda-abono" class="select-abono">
                    <option value="Bs">Bolívares (Bs)</option>
                    <option value="USD">Dólares ($)</option>
                </select>

                <select id="metodo-abono" class="select-abono">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Punto">Punto de Venta</option>
                    <option value="Biopago">Biopago</option>
                </select>
            </div>

            <div style="display:flex; gap:10px;">
                <button id="btn-cerrar-abono" class="btn-abono-cancelar">Cerrar</button>
                <button id="btn-guardar-abono" class="btn-abono-confirmar">Confirmar</button>
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
            if (typeof Notificaciones !== 'undefined') Notificaciones.revisarTodo();
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
toggleDarkMode(activo) {
    if (activo) {
        document.body.classList.add('dark-mode');
        // Cambia la barra superior del móvil a negro
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0a0a0a');
    } else {
        document.body.classList.remove('dark-mode');
        // Cambia la barra superior del móvil a dorado o gris platino
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f5f5f7');
    }
    
    Persistencia.guardar('dom_dark_mode', activo);
    console.log("DOMINUS Theme - Modo oscuro:", activo);
},



toggleModoPunto(activado) {
    // Apuntamos al ID correcto de la interfaz de ventas
    const elSeccionPunto = document.getElementById('seccion-modo-punto');
    
    if (elSeccionPunto) {
        // Usamos clase 'hidden' o style.display según tu sistema global
        if (activado) {
            elSeccionPunto.classList.remove('hidden');
            elSeccionPunto.style.display = 'block'; 
        } else {
            elSeccionPunto.classList.add('hidden');
            elSeccionPunto.style.display = 'none';
        }
        
        // Persistencia
        Persistencia.guardar('dom_pref_modo_punto', activado);
        console.log(`🏧 DOMINUS: Modo Punto ${activado ? 'Visible' : 'Oculto'}`);
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

    // 1. OBTENCIÓN DE DATOS (Sincronizado con tu motor de ventas)
    const r = Ventas.finalizarJornada(); 

    // --- 🚀 INYECCIÓN CENTINELA DOMINUS ---
    if (typeof Ventas !== 'undefined') Ventas.cierreRealizado = true; 
    
    if (typeof Notificaciones !== 'undefined') {
        Notificaciones.revisarTodo(); 
    }

    const hoy = new Date().toLocaleDateString('es-VE');
    const balanceBs = parseFloat(r.balanceNeto) || 0;
    const totalVentas = r.conteoVentas || 0;
    const ticketPromedioBs = totalVentas > 0 ? (r.balanceNeto / totalVentas).toFixed(2) : 0;

    // --- 🛡️ MEJORA: DETECCIÓN DE PRODUCTOS CRÍTICOS ---
    // Usamos tu propia función chequearSaludStock para el reporte
    let listaReposicion = "";
    if (typeof Inventario !== 'undefined' && Inventario.lista) {
        const criticos = Inventario.lista.filter(p => {
            const salud = this.chequearSaludStock(p, 0); 
            return salud === "bajo" || salud === "agotado";
        });

        if (criticos.length > 0) {
            listaReposicion = `\n📦 *REPOSICIÓN SUGERIDA:* \n`;
            criticos.forEach(p => {
                const unidad = p.unidad || 'Und';
                listaReposicion += `• ${p.nombre} (${p.cantidad} ${unidad})\n`;
            });
        }
    }

    // 2. CONSTRUCCIÓN DEL REPORTE OPTIMIZADO[cite: 2, 5]
    let texto = `📊 *REPORTE DOMINUS - ${hoy}*\n`;
    texto += `━━━━━━━━━━━━━━━━━━\n\n`;
    
    texto += `🛍️ *ACTIVIDAD:* \n`;
    texto += `• Ventas hoy: ${totalVentas}\n`;
    texto += `• Ticket Promedio: ${ticketPromedioBs} Bs\n\n`;
    
    texto += `💵 *FLUJO DE CAJA:* \n`;
    texto += `• Efectivo $: ${r.efectivoUSD} $\n`;
    texto += `• Efectivo Bs: ${r.efectivoBS.toLocaleString('es-VE')} Bs\n`;
    texto += `• Gastos Aplicados: -${r.gastos.toLocaleString('es-VE')} Bs\n\n`;

    texto += `📱 *DINERO DIGITAL:* \n`;
    texto += `• Pago Móvil: ${r.detalle.pagoMovil.toLocaleString('es-VE')} Bs\n`;
    // Unificamos Biopago y Punto según tu selector
    texto += `• Punto/Biopago: ${(r.detalle.punto + r.detalle.biopago).toLocaleString('es-VE')} Bs\n`;
    texto += `• Total Digital: ${r.digital.toLocaleString('es-VE')} Bs\n\n`;

    texto += `📉 *SALDOS Y COMISIONES:* \n`;
    texto += `• Créditos (Fiao): ${r.detalle.fiao.toLocaleString('es-VE')} Bs\n`;
    texto += `• Comisión Padre: ${r.detalle.comisiones.toLocaleString('es-VE')} Bs\n`;
    
    // Inyectamos la lista de stock si hay productos bajos[cite: 2]
    texto += listaReposicion;

    texto += `\n━━━━━━━━━━━━━━━━━━\n`;
    texto += `✅ *TOTAL NETO DEL DÍA:* \n`;
    texto += `💰 *${r.balanceNeto.toLocaleString('es-VE')} Bs*`;

    // 3. SVG LOGOS (Tus originales)[cite: 2]
    const logoWS = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.06 3.973L0 16l4.14-1.086A7.98 7.98 0 0 0 7.994 16h.004c4.367 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>`;
    const logoPDF = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/><path d="M4.603 12.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.487-.64c.21-.075.408-.139.605-.192a3.323 3.323 0 0 1 .12-.367 1.92 1.92 0 0 1 .116-.277c.18-.328.375-.677.582-.999.253-.393.51-.762.754-1.017.242-.252.432-.359.584-.406.309-.095.646-.01.91.137.357.198.557.569.579.927.015.233-.051.5-.165.723-.121.238-.321.407-.51.523-.351.213-.761.306-1.162.356-.369.046-.73.042-1.036.027a19.12 19.12 0 0 1-1.527-.145 11.91 11.91 0 0 1-1.315 1.833 5.1 5.1 0 0 1-1.059 1.13c-.15.115-.313.208-.474.269.04.03.078.06.115.09.11.088.196.162.243.213.06.064.06.115.043.153-.024.053-.131.066-.255.034-.143-.037-.306-.118-.465-.234z"/></svg>`;

    // 4. MODAL DE ELECCIÓN[cite: 2]
    modalEleccion.abrir({
        titulo: "📊 Finalizar Jornada",
        mensaje: "¿Cómo deseas exportar el reporte detallado?",
        botones: [
            { 
                texto: `${logoWS} WHATSAPP`, 
                clase: "btn-whatsapp-cierre", 
                accion: () => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
                    setTimeout(() => { this.preguntarLimpieza(); }, 2000);
                }
            },
            { 
                texto: `${logoPDF} GENERAR PDF`, 
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
    // 🛡️ Evita duplicidad de modales
    if (document.getElementById('modal-dinamico')) return;

    modalEleccion.abrir({
        titulo: "🗑️ ¿BORRAR DATOS DE JORNADA?",
        mensaje: "Esta acción limpiará ventas, gastos e historial de devoluciones del día. El inventario NO se verá afectado.",
        // Clase para feedback visual de advertencia
        claseModal: "modal-alert-shake", 
        botones: [
            { 
                texto: "SÍ, REINICIAR TODO", 
                clase: "btn-danger-destructivo", 
                accion: () => { 
                    try {
                        // 1. Limpieza lógica en memoria activa
                        if (typeof Ventas !== 'undefined' && Ventas.limpiarJornada) {
                            Ventas.limpiarJornada();
                        }

                        // 2. Limpieza de persistencia local
                        // Vaciamos los contenedores de la jornada actual
                        Persistencia.guardar('dom_ventas', []); 
                        Persistencia.guardar('dom_gastos', []);
                        Persistencia.guardar('dom_historial_ventas', []);
                        
                        console.log("✅ DOMINUS: Datos de jornada liberados localmente.");

                        // 3. Reinicio de Interfaz
                        // El reload asegura que todos los objetos globales (como el contador de ventas)
                        // vuelvan a su estado inicial limpios.
                        location.reload(); 
                    } catch (error) {
                        console.error("❌ Error en limpieza:", error);
                        if (typeof notificar === 'function') {
                            notificar("Error al limpiar datos", "error");
                        }
                    }
                } 
            },
            { 
                texto: "MANTENER DATOS", 
                clase: "btn-mantener-datos", 
                accion: () => { 
                    if (typeof notificar === 'function') {
                        notificar("Datos protegidos", "exito"); 
                    }
                } 
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
    
    const ventasHoy = Ventas.historial.filter(v => v.fecha && v.fecha.includes(hoy));
    const canvas = document.getElementById('graficaVentas');
    // Forzamos fondo blanco en la captura de la gráfica para que se vea en el PDF
    const graficaImg = canvas ? canvas.toDataURL('image/png') : null;
    
    const tasa = Conversor.tasaActual || 1;
    const totalConConvertido = r.balanceNeto + (r.efectivoUSD * tasa);

    const C_PRIMARIO = "#ffd700"; 
    const C_FONDO_DARK = "#1a1a1a";
    const C_TEXTO = "#333";
    const C_BORDE = "#eee";

    // 1. BLOQUE STOCK CRÍTICO (Optimizado)
    let bloqueStockHTML = '';
    if (typeof Inventario !== 'undefined' && Inventario.lista) {
        const criticos = Inventario.lista.filter(p => {
            // Asumiendo que esta función existe en tu objeto Inventario/Ventas
            const salud = this.chequearSaludStock ? this.chequearSaludStock(p, 0) : (p.cantidad <= 2 ? "bajo" : "ok"); 
            return salud === "bajo" || salud === "agotado" || p.cantidad <= 0;
        });

        if (criticos.length > 0) {
            const filasStock = criticos.map(p => `
                <tr style="border-bottom: 1px solid #ffeeba;">
                    <td style="padding: 6px; font-size: 10px;">${p.nombre.toUpperCase()}</td>
                    <td style="padding: 6px; text-align: right; font-size: 10px; font-weight: bold; color: ${p.cantidad <= 0 ? '#d32f2f' : '#856404'};">
                        ${p.cantidad} ${p.unidad || 'Und'}
                    </td>
                </tr>`).join('');

            bloqueStockHTML = `
                <div style="border: 1px solid #ffeeba; border-radius: 8px; background: #fffcf0; padding: 10px;">
                    <h4 style="margin: 0 0 5px 0; color: #856404; font-size: 11px; text-align: center;">📦 REPOSICIÓN</h4>
                    <table style="width: 100%; border-collapse: collapse;">${filasStock}</table>
                </div>`;
        }
    }

    // 2. BLOQUE SERVICIOS (Dinero ajeno)
    const serviciosPendientes = ventasHoy.filter(v => v.esServicio && !v.pagado);
    let tablaServiciosHTML = '';
    if (serviciosPendientes.length > 0) {
        const filasServicios = serviciosPendientes.map(s => `
            <tr style="border-bottom: 1px dotted #ccc;">
                <td style="padding: 6px; font-size: 10px;">${s.producto.replace('PUNTO: ', '')}</td>
                <td style="padding: 6px; text-align: right; font-size: 10px; font-weight: bold; color: #2e7d32;">
                    ${Number(s.aEntregar).toLocaleString('es-VE')} Bs
                </td>
            </tr>`).join('');

        tablaServiciosHTML = `
            <div style="border: 1px solid ${C_PRIMARIO}; padding: 10px; border-radius: 8px; background: #fffdf0;">
                <h4 style="margin: 0 0 5px 0; color: #b8860b; font-size: 11px; text-align: center;">📋 PENDIENTES</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tbody>${filasServicios}</tbody>
                </table>
            </div>`;
    }

    // 3. AUDITORÍA DETALLADA (Con cantidades y totalización clara)
    const filasVentas = ventasHoy.map(v => {
        const esDolar = v.metodo.includes('$') || v.moneda === 'USD';
        const montoTexto = esDolar 
            ? `<span style="color: #2e7d32;">$ ${Number(v.montoUSD || (v.montoBs / tasa)).toFixed(2)}</span>` 
            : `<span>${Number(v.montoBs).toLocaleString('es-VE')} Bs</span>`;

        return `
            <tr style="border-bottom: 1px solid ${C_BORDE};">
                <td style="padding: 10px; font-size: 11px;">
                    <span style="color: #999; font-size: 9px;">${v.hora}</span><br>
                    <b style="color: #000;">${v.producto.toUpperCase()}</b>
                    ${v.cantidad > 1 ? `<br><small style="color: #666;">Cant: ${v.cantidad}</small>` : ''}
                </td>
                <td style="padding: 10px; font-size: 10px; text-align: center; color: #666;">${v.metodo}</td>
                <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: bold;">${montoTexto}</td>
            </tr>`;
    }).join('');

    const contenidoHTML = `
        <div style="font-family: Arial, sans-serif; padding: 25px; color: ${C_TEXTO}; background: white;">
            
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; border-bottom: 3px solid ${C_PRIMARIO}; padding-bottom: 10px; margin-bottom: 20px;">
                <div>
                    <h1 style="margin: 0; letter-spacing: 3px; font-size: 24px; color: #000;">DOMINUS</h1>
                    <p style="margin: 0; font-style: italic; color: #888; font-size: 10px;">Gestión de Inventario y Ventas</p>
                </div>
                <div style="text-align: right;">
                    <h3 style="margin: 0; color: #555; font-size: 14px;">CIERRE DE CAJA</h3>
                    <p style="margin: 0; font-weight: bold; font-size: 12px;">${hoy}</p>
                </div>
            </div>

            <!-- Gráfica -->
            ${graficaImg ? `
                <div style="text-align: center; margin-bottom: 20px; background: #fcfcfc; border: 1px solid ${C_BORDE}; padding: 10px; border-radius: 8px;">
                    <img src="${graficaImg}" style="width: 100%; max-height: 180px; object-fit: contain;">
                </div>` : ''}

            <!-- Resumen Financiero -->
            <div style="background: ${C_FONDO_DARK}; color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <table style="width: 100%; font-size: 13px;">
                    <tr><td>Efectivo Bolívares:</td><td style="text-align: right;">${r.efectivoBS.toLocaleString('es-VE')} Bs</td></tr>
                    <tr style="color: #4caf50;"><td>Efectivo Dólares:</td><td style="text-align: right;">$ ${Number(r.efectivoUSD).toFixed(2)}</td></tr>
                    <tr style="color: #ff5252;"><td>Gastos/Comisiones:</td><td style="text-align: right;">-${(r.gastos + r.detalle.comisiones).toLocaleString('es-VE')} Bs</td></tr>
                    <tr><td colspan="2" style="border-top: 1px solid #444; padding-top: 10px; margin-top: 10px;"></td></tr>
                    <tr>
                        <td style="color: ${C_PRIMARIO}; font-weight: bold; font-size: 16px;">TOTAL NETO:</td>
                        <td style="text-align: right; color: ${C_PRIMARIO}; font-size: 28px; font-weight: bold;">
                            ${totalConConvertido.toLocaleString('es-VE')} Bs
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Grid de Alertas -->
            ${(tablaServiciosHTML || bloqueStockHTML) ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                ${tablaServiciosHTML}
                ${bloqueStockHTML}
            </div>` : ''}

            <!-- Auditoría en Nueva Página o Continuación -->
            <div style="border-top: 2px solid ${C_BORDE}; padding-top: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #555; font-size: 12px; letter-spacing: 1px;">HISTORIAL DE OPERACIONES</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: #f5f5f5;">
                        <tr>
                            <th style="text-align: left; padding: 8px; font-size: 10px;">PRODUCTO</th>
                            <th style="text-align: center; padding: 8px; font-size: 10px;">MÉTODO</th>
                            <th style="text-align: right; padding: 8px; font-size: 10px;">MONTO</th>
                        </tr>
                    </thead>
                    <tbody>${filasVentas}</tbody>
                </table>
            </div>

            <p style="text-align: center; margin-top: 30px; color: #bbb; font-size: 9px; letter-spacing: 2px;">DOMINUS SYSTEM • ${ahora.getFullYear()}</p>
        </div>`;

    const opciones = {
        margin: 0,
        filename: nombreArchivo,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true }, // Subimos escala a 3 para máxima nitidez
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opciones).from(contenidoHTML).save().then(() => {
        setTimeout(() => { this.preguntarLimpieza(); }, 1500);
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
    const t = (Number(Conversor.tasaActual) > 0) ? Conversor.tasaActual : 1;

    const MODOS = {
        0: { key: 'dom_ventas', color: '#09ff00', titulo: 'Ventas Hoy (Bs)' },
        1: { key: 'dom_gastos', color: '#ff4444', titulo: 'Gastos Hoy (Bs)' },
        2: { key: 'dom_fiaos', color: '#ffa500', titulo: 'Fiaos Hoy (Bs)' } // 🛡️ Corregido: Ahora apunta a la persistencia de fiaos
    };

    const configActual = MODOS[modoGraficaActual] || MODOS[0];
    const fuente = Persistencia.cargar(configActual.key) || [];
    const color = configActual.color;
    const titulo = configActual.titulo;

    const datosHoy = fuente.filter(i => i.fecha === hoy);
    const datosPorHora = new Array(24).fill(0);

    datosHoy.forEach(item => {
        if (item.hora) {
            const h = parseInt(item.hora.split(':')[0]);
            
            // 🛡️ Lógica de montos diferenciada por fuente
            let monto = 0;
            if (modoGraficaActual === 2) {
                // Para fiaos usamos montoUSD * tasa para normalizar a Bs en la gráfica
                monto = (parseFloat(item.montoUSD) || 0) * t;
            } else {
                // Para ventas (0) y gastos (1) usamos montoBs
                monto = (parseFloat(item.montoBs) || 0);
                
                // Evitar sumar ventas devueltas en el modo de ventas
                if (modoGraficaActual === 0 && item.devuelta) return;
            }

            datosPorHora[h] += monto;
        }
    });

    if (window.miGrafica) window.miGrafica.destroy();

    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    try {
        gradient.addColorStop(0, hexToRgba(color, 0.4));
        gradient.addColorStop(1, hexToRgba(color, 0));
    } catch (e) {
        console.error("Error en gradiente", e);
        gradient = color;
    }

    window.miGrafica = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}h`),
            datasets: [{
                label: titulo,
                data: datosPorHora,
                borderColor: color,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: color,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                title: {
                    display: true,
                    text: titulo.toUpperCase(),
                    color: color,
                    font: { size: 12, weight: '900' },
                    padding: { bottom: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    titleColor: color,
                    callbacks: {
                        label: (context) => ` Total: ${Number(context.parsed.y).toLocaleString('es-VE')} Bs`
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { 
                        color: 'rgba(255,255,255,0.3)', 
                        font: { size: 10 },
                        callback: (value) => `${value.toLocaleString('es-VE')}`
                    }
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 }, maxTicksLimit: 12 } 
                }
            }
        }
    });
}

};