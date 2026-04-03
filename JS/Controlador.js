let tallasTemporales = {}; // o el valor inicial correcto
let miGrafica = null;
const modalEleccion = {
    abrir: function(config) {
        this.cerrar();

        const html = `
            <div id="modal-dinamico" class="modal-eleccion active">
                <div class="eleccion-content">
                    <h3 style="color:var(--primary); margin-bottom:10px;">${config.titulo}</h3>
                    <p style="color:white; opacity:0.8; margin-bottom:20px;">${config.mensaje}</p>
                    <div id="contenedor-inputs-modal"></div>
                    <div id="btns-dinamicos" class="btns-eleccion">
                        </div>
                    <button class="btn-no" onclick="modalEleccion.cerrar()" style="margin-top:15px; width:100%;">Cancelar</button>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        config.botones.forEach(btn => {
            const b = document.createElement('button');
            b.className = btn.clase || 'btn-si';
            b.innerHTML = btn.texto;
            b.onclick = () => { 
                btn.accion(); 
                if(!btn.mantener) modalEleccion.cerrar(); 
            };
            document.getElementById('btns-dinamicos').appendChild(b);
        });
    },
    cerrar: () => {
        const m = document.getElementById('modal-dinamico');
        if(m) {
            m.style.opacity = '0';
            setTimeout(() => m.remove(), 300);
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
        // 1. Devolver producto al inventario (Llama a tu función `devolver` que ya está OK)
        Inventario.devolver(venta.productoNombre, venta.cantidadVenta, venta.tallaElegida);
        
        // 2. Marcar venta como devuelta en el historial permanente
        if (typeof HistorialDevoluciones !== 'undefined') {
            HistorialDevoluciones.marcarComoDevuelta(venta.id);
        }
        
        notificar("✅ Venta verificada. Ahora seleccione el nuevo producto.", "exito");
        
        // 3. 🔥 CLAVE: Abrir el modal de venta normal para que el usuario elija el nuevo producto
        if (typeof Interfaz.abrirModalVenta === 'function') {
            Interfaz.abrirModalVenta();
        }
    }
};

const Controlador = {

    procesarCodigoEscaneado: function(codigo) {
        // 💡 EFECTO SONIDO
        const audio = new Audio('AUDIO/scan.mp3'); 
        audio.play().catch(e => console.log("Sonido no reproducido", e));
        
        // 🚀 Llamamos a efectoFlash a través del objeto Scanner
        Scanner.efectoFlash();
        
        const producto = Inventario.buscarPorCodigo(codigo);
        
        if (producto) {
            notificar(`✅ Escaneado: ${producto.nombre}`);
            
            // 🚀 LÓGICA DE VENTA CON TALLAS Y CONFIRMACIÓN
            if (producto.tallas && Object.keys(producto.tallas).length > 0) {
                const tallasDisponibles = Object.keys(producto.tallas);
                
                // Pedir talla
                this.mostrarModalTallas(
                    "Seleccionar Talla",
                    `¿Qué talla vender de ${producto.nombre}?`,
                    tallasDisponibles,
                    (tallaElegida) => {
                        // Después de elegir talla, pedir precio
                        this.pedirPrecioYRegistrarVenta(producto, tallaElegida);
                    }
                );
            } else {
                // Si no tiene tallas, pedir precio directamente
                this.pedirPrecioYRegistrarVenta(producto, null);
            }
            
        } else {
            // 🚀 Producto no encontrado -> Registrar Nuevo
            notificar(`⚠️ Producto no encontrado: ${codigo}`, "error");
            
            // Preguntar si quiere registrarlo
            this.confirmarAccion(
                "Producto Nuevo",
                `El código <b>${codigo}</b> no existe. ¿Deseas registrarlo ahora?`,
                () => {
                    // Abrir el modal de crear producto nuevo
                    this.modalRecargaRapida("", codigo);
                },
                null,
                "Sí, registrar",
                "No",
                false
            );
        }
    },
    
ejecutarVenta() {
    const p = document.getElementById('v-producto').value;
    const m = parseFloat(document.getElementById('v-monto').value);
    const mon = document.getElementById('v-moneda').value;
    const met = document.getElementById('v-metodo').value;
    const cli = document.getElementById('v-cliente').value;
    const cantInput = document.getElementById('v-cantidad');
    const cantidad = cantInput ? parseFloat(cantInput.value) : 1;
    
    const selectTalla = document.getElementById('v-talla');
    const divTalla = document.getElementById('contenedor-talla'); 
    const tallaElegida = (selectTalla && selectTalla.value) ? selectTalla.value : null;

    const inputCom = document.getElementById('v-comision');
    const comFinal = inputCom ? (parseFloat(inputCom.value) || 0) : 0;

    if(!p || isNaN(m)) {
        return notificar("Falta producto o monto", "error");
    }

    if (met === 'Fiao' && (!cli || cli.trim() === "")) {
        return notificar("Para un fiao necesito el nombre", "fiao");
    }

    if (divTalla && !divTalla.classList.contains('hidden')) {
        if (!tallaElegida || tallaElegida === "") {
            return notificar("Selecciona una talla/peso", "error");
        }
    }

    const btnPunto = document.getElementById('btn-modo-punto');
    const esServicio = btnPunto ? btnPunto.classList.contains('activo-punto') : false;
        
    // 1. AÑADIR AL CARRITO (Ya no guarda en el historial directo)
    Ventas.prepararParaCarrito(p, m, mon, met, cli, comFinal, esServicio, cantidad, tallaElegida);
    
    // 2. Aprender producto (El cerebro aprende al añadir al carrito)
    if (typeof Inventario !== 'undefined' && typeof Inventario.aprenderDeVenta === 'function') {
        Inventario.aprenderDeVenta(p, m);
    }
    
    // 3. Limpiamos SOLO producto, monto y cantidad para seguir escaneando el siguiente
    document.getElementById('v-producto').value = '';
    document.getElementById('v-monto').value = '';
    if(cantInput) cantInput.value = '1';
    if(inputCom && esServicio) inputCom.value = '';
    
    if (esServicio) Interfaz.alternarModoPunto();
    
    // 4. Actualizamos la vista de la cesta
   this.renderCarrito();
    document.getElementById('v-producto').focus(); // 👈 El cursor vuelve aquí para el siguiente escaneo
    notificar("🛒 Añadido", "stock");
},

// 👇 NUEVA: Dibuja la lista temporal en pantalla
renderCarrito() {
    const contenedor = document.getElementById('lista-carrito-temporal');
    const totalBsDiv = document.getElementById('total-carrito-bs');
    const totalUsdDiv = document.getElementById('total-carrito-usd');

    if (!contenedor || !Ventas.carrito) return;

    contenedor.innerHTML = '';

    if (Ventas.carrito.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:0.9em;">La cuenta está vacía</p>';
        totalBsDiv.innerText = '0.00 Bs';
        totalUsdDiv.innerText = '$0.00';
        return;
    }

    Ventas.carrito.forEach((item, index) => {
        const nombreMostrar = item.tallaEscogida ? `${item.p} (${item.tallaEscogida})` : item.p;
        contenedor.innerHTML += `
            <div style="display:flex; justify-content:space-between; background:rgba(0,0,0,0.2); padding:10px; margin-bottom:5px; border-radius:8px; border-left: 3px solid var(--primary); align-items:center;">
                <div style="flex-grow:1;">
                    <b style="font-size:0.95em;">${item.cant}x ${nombreMostrar}</b><br>
                    <small style="opacity:0.8">${item.totalBs.toLocaleString('es-VE')} Bs / $${item.totalUSD.toFixed(2)}</small>
                </div>
                <button onclick="Controlador.eliminarDelCarrito(${index})" style="background:#ff4d4d; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:bold;">X</button>
            </div>
        `;
    });

    const totalBs = Ventas.obtenerTotalVentaActual();
    const totalUsd = totalBs / Conversor.tasaActual;

    totalBsDiv.innerText = `${totalBs.toLocaleString('es-VE')} Bs`;
    totalUsdDiv.innerText = `$${totalUsd.toFixed(2)}`;
},

// 👇 NUEVA: Permite borrar si se equivocaron
eliminarDelCarrito(index) {
    Ventas.carrito.splice(index, 1);
    this.renderCarrito();
},

// 👇 NUEVA: El botón gigante que cobra todo de una vez
ejecutarCobroFinal() {
    if (Ventas.carrito.length === 0) return notificar("La cuenta está vacía", "error");

    const exito = Ventas.procesarCobroCarrito();

    if (exito) {
        // Refrescar toda la interfaz real
        Interfaz.actualizarDashboard();
        Interfaz.renderInventario(); 
        if (Interfaz.renderHistorial) Interfaz.renderHistorial();
        
        // Limpiar cliente y método
        document.getElementById('v-cliente').value = '';
        this.limpiarSeleccionVenta();
        
        // Limpiar la cesta visual
        this.renderCarrito();
        
        notificar("✅ ¡Venta Cobrada con Éxito!", "exito");
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

prepararEdicionInventario: function(nombreProducto) {
    const p = Inventario.productos.find(prod => prod.nombre === nombreProducto);
    if (!p) return notificar("Producto no encontrado", "error");

    // Llenar el formulario superior
    document.getElementById('inv-nombre').value = p.nombre;
    document.getElementById('inv-cant').value = p.cantidad;
    document.getElementById('inv-precio').value = p.precio;
    if(document.getElementById('inv-unidad')) document.getElementById('inv-unidad').value = p.unidad;

    // Cargar tallas temporales para edición
    if (p.tallas) {
        tallasTemporales = {...p.tallas};
        // 💡 Llama aquí a tu función que refresca visualmente las tallas si tienes una
        // Interfaz.renderTallasTemporales(); 
    }

    // Cambiar el estilo del botón guardar para indicar modo edición
    const btnGuardar = document.querySelector('button[onclick="Controlador.guardarEnInventario()"]');
    if (btnGuardar) {
        btnGuardar.innerText = "💾 Actualizar";
        btnGuardar.style.background = "#2196F3"; // Color azul
        // Cambiamos la función del botón temporalmente
        btnGuardar.setAttribute("onclick", `Controlador.actualizarProducto('${p.nombre}')`);
    }
    
    notificar(`Editando: ${p.nombre}`);
},

actualizarProducto: function(nombreOriginal) {
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

    // LLAMADA A LA LÓGICA DE INVENTARIO
    Inventario.actualizar(nombreOriginal, n, c, p, u, tallasParaGuardar);

    // --- IMPORTANTE: Restaurar el botón Guardar ---
    this.limpiarFormularioInventario(); // 💡 Asegúrate de tener esta función para limpiar
    
    Interfaz.renderInventario();
    notificar("✅ Producto actualizado");
},

limpiarFormularioInventario: function() {
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
    const d = document.getElementById('g-desc').value;
    const m = parseFloat(document.getElementById('g-monto').value);
    const mon = document.getElementById('g-moneda').value;
    
    if(!d || isNaN(m)) {
        notificar("❌ Faltan datos o el monto es inválido", "error");
        return;
    }

    // 🚀 INTEGRACIÓN: Actualizado con parámetros personalizados
   Interfaz.confirmarAccion(
        "Registrar Gasto",
        `¿Confirmar gasto de ${m} ${mon} por: "${d}"?`,
        () => {                
            Ventas.registrarGasto(d, m, mon);
            
            // Limpiar formulario
            document.getElementById('g-desc').value = '';
            document.getElementById('g-monto').value = '';
            
            // Actualizar vista
            Interfaz.actualizarDashboard();
            notificar("💸 Gasto registrado correctamente");
        },
       null, // 🚀 CORRECCIÓN: Acción al cancelar
        "Sí, registrar",
        "Cancelar",
        false
    );
},

guardarEnInventario() { 
    const n = document.getElementById('inv-nombre').value;
    const cStr = document.getElementById('inv-cant').value;
    const pStr = document.getElementById('inv-precio').value;
    
    const unidadElemento = document.getElementById('inv-unidad');
    const u = unidadElemento ? unidadElemento.value : 'Und';

    // ✅ CORRECCIÓN: Usar notificar en lugar de alert
    if(!n || !cStr) {
        notificar("❌ Falta nombre o cantidad", "error");
        return;
    }

    // Convertimos a float para soportar Kg y Lts con decimales
    const c = parseFloat(cStr);
    const p = parseFloat(pStr) || 0;

    const tieneTallas = Object.keys(tallasTemporales).length > 0;
    const tallasParaGuardar = tieneTallas ? {...tallasTemporales} : null;

    if (tieneTallas) {
        const sumaTallas = Object.values(tallasTemporales).reduce((a, b) => a + b, 0);
        // Usamos una pequeña tolerancia para evitar errores de decimales en JS
        if (Math.abs(sumaTallas - c) > 0.01) {
            // ✅ CORRECCIÓN: Usar notificar en lugar de alert
            notificar(`❌ Error: El stock total es ${c}, pero las tallas suman ${sumaTallas}. Deben ser iguales.`, "error");
            return;
        }
    }

    Inventario.guardar(n, c, p, u, tallasParaGuardar); 

    // Limpiar campos
    document.getElementById('inv-nombre').value = '';
    document.getElementById('inv-cant').value = '';
    document.getElementById('inv-precio').value = '';
    if(unidadElemento) unidadElemento.value = 'Und';
    tallasTemporales = {};

    Interfaz.renderInventario();
    
    // ✅ OPCIONAL: Notificar éxito
    notificar(`✅ Producto "${n}" guardado correctamente.`);
},

mostrarStockDisponible: function(talla) { //informa al usuario cuanto queda de esa talla antes de vender//
    const nombreProd = document.getElementById('v-producto').value;
    const infoStock = document.getElementById('v-info-stock');
    
    if (!nombreProd || !talla) {
        if(infoStock) infoStock.innerText = "";
        return;
    }

    const p = Inventario.productos.find(prod => prod.nombre.toLowerCase() === nombreProd.trim().toLowerCase());
    
    if (p && p.tallas) {
        const cantidad = p.tallas[talla] || 0;
        const unidad = p.unidad || "Und";
        
        if(infoStock) {
            infoStock.innerText = ` Stock: ${cantidad} ${unidad}`;
            infoStock.style.color = cantidad > 0 ? "#4caf50" : "#ff5252";
        }
    }
},

    editarPrecioRapido(id, nuevoPrecio) {
    const producto = Inventario.productos.find(p => p.id == id);
    
    if (producto) {
        producto.precio = nuevoPrecio === "" ? 0 : parseFloat(nuevoPrecio);
        
        Persistencia.guardar('dom_inventario', Inventario.productos);
        
        console.log(`Precio de ${producto.nombre} actualizado a: ${producto.precio} Bs`);
    }
},
    
 // Aceptamos el nombre del cliente en lugar del ID
abonar(nombreCliente) {
    // 1. Buscamos al cliente en lugar de una deuda específica
    const deudasCliente = Ventas.deudas.filter(d => d.cliente === nombreCliente);
    
    if (deudasCliente.length === 0) return notificar("No se encontraron deudas para este cliente", "error");

    // 2. Calculamos el total en USD agrupado para mostrarlo en el modal
    const totalUSD = deudasCliente.reduce((sum, d) => sum + parseFloat(d.montoUSD || 0), 0);
    const totalBs = totalUSD * Conversor.tasaActual;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    // Estilos igual que antes...
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:380px; width:100%; border:1px solid var(--primary); padding:25px; border-radius:20px; text-align:center; color:white;">
            <span style="font-size:2.5em;">🤝</span>
            <h3 style="color:var(--primary); margin:10px 0;">Registrar Abono</h3>
            <p style="font-size:0.9em; opacity:0.8; margin-bottom:5px;">Cliente: <strong>${nombreCliente}</strong></p>
            <p style="font-size:1.1em; color:var(--primary); margin-bottom:15px; font-weight:bold;">
                Debe: $${totalUSD.toFixed(2)} (${totalBs.toLocaleString('es-VE')} Bs)
            </p>
            
            <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
                <input type="number" id="monto-abono" placeholder="¿Cuánto paga?" 
                       style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--primary); background:rgba(0,0,0,0.2); color:white; font-size:1.1em; text-align:center;">
                
                <select id="moneda-abono" style="width:100%; padding:10px; border-radius:10px; background:#222; color:white; border:1px solid #444;">
                    <option value="Bs">Bolívares (Bs)</option>
                    <option value="USD">Dólares ($)</option>
                </select>

                <select id="metodo-abono" style="width:100%; padding:10px; border-radius:10px; background:#222; color:white; border:1px solid #444;">
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Punto">Punto de Venta</option>
                    <option value="Biopago">Biopago</option>
                </select>
            </div>

            <div style="display:flex; gap:10px;">
                <button id="btn-cerrar-abono" class="btn-main" style="background:#444; flex:1">Cerrar</button>
                <button id="btn-guardar-abono" class="btn-main" style="flex:1">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // --- MAGIA: Lógica de los botones ---
    
    // 1. Botón Cerrar
    document.getElementById('btn-cerrar-abono').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    // 2. Botón Confirmar
    document.getElementById('btn-guardar-abono').addEventListener('click', () => {
        const montoRaw = document.getElementById('monto-abono').value;
        const monto = parseFloat(montoRaw);
        const moneda = document.getElementById('moneda-abono').value;
        const metodo = document.getElementById('metodo-abono').value;

        if (!monto || monto <= 0) return notificar("Ingrese un monto válido", "error");

        // Llama a tu función lógica existente
        const resultado = Ventas.abonarDeudaPorCliente(nombreCliente, monto, moneda, metodo);

        if (resultado) {
            // Refrescar vista
            Interfaz.renderFiaos();
            // Cerrar modal
            document.body.removeChild(overlay);
            notificar(`Abono de ${monto} ${moneda} registrado`, "exito");
        }
    });
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

generarCierre: function() { //llama para hacer el cierre del dia//
    if (document.getElementById('modal-dinamico')) return;

    const r = Ventas.finalizarJornada();
    const hoy = new Date().toLocaleDateString('es-VE');
    const texto = `📊 *CIERRE DOMINUS - ${hoy}*\n\n` +
                  `💵 Efec: ${r.efectivoBS.toLocaleString('es-VE')} Bs / ${r.efectivoUSD} $\n` +
                  `📱 Dig: ${r.digital.toLocaleString('es-VE')} Bs\n` +
                  `📉 Gastos: ${r.gastos.toLocaleString('es-VE')} Bs\n\n` +
                  `✅ *Total Neto:* ${r.balanceNeto.toLocaleString('es-VE')} Bs`;

    modalEleccion.abrir({
        titulo: "📊 Finalizar Día",
        mensaje: "¿Cómo deseas exportar el reporte?",
        botones: [
            { 
                texto: "📱 Enviar a WhatsApp", 
                clase: "btn-whatsapp",
                accion: () => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
                    // 🚀 Mantenemos el flujo, pero ahora limpiará más datos
                    setTimeout(() => { this.preguntarLimpieza(); }, 1500);
                }
            },
            { 
                texto: "📄 Generar PDF", 
                clase: "btn-pdf",
                accion: () => { 
                    this.generarPDF();
                    // 🚀 Opcional: También preguntar limpieza después de generar PDF
                    setTimeout(() => { this.preguntarLimpieza(); }, 1000);
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
}