let lastScrollTop = 0;
const header = document.querySelector('.main-header');

// Ajustamos el body o el contenedor principal para que no empiece debajo del header
document.body.style.paddingTop = header.offsetHeight + "px";

window.addEventListener('scroll', () => {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // El usuario baja -> Escondemos el header
        header.classList.add('hidden');
    } else {
        // El usuario sube -> Mostramos el header
        header.classList.remove('hidden');
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
}, { passive: true });



const Interfaz = { //muestra todo en pantalla lo que se clickea//

// --- REEMPLAZA ESTA FUNCIÓN EN Interfaz.js ---

mostrarSelectorEscaner: function(esVenta = true) {
    if (typeof Scanner !== 'undefined' && Scanner.prepararMenu) {
        Scanner.prepararMenu(esVenta);
    } else {
        // MEJORA: El respaldo ahora también usa el sistema de botones de DOMINUS
        this.confirmarAccion(
            "Método de Gestión",
            "¿Qué dispositivo vas a utilizar?",
            () => Scanner.iniciarBusquedaEscannerLaser((c) => {
                // Usamos una función anónima para decidir el destino
                if(esVenta) Controlador.procesarCodigoEscaneado(c);
                else Inventario.gestionarEscaneo(c);
            }),
            () => Scanner.iniciarEscannerCamara((c) => {
                if(esVenta) Controlador.procesarCodigoEscaneado(c);
                else Inventario.gestionarEscaneo(c);
            }),
            "Láser", "Cámara"
        );
    }
},
// 🚀 NUEVA FUNCIÓN AUXILIAR: Pide precio y registra
pedirPrecioYRegistrarVenta: function(producto, tallaElegida) {
    
    // 💡 VALIDACIÓN DE STOCK
    if (tallaElegida) {
        // Si hay talla, verificar stock específico
        if (!producto.tallas[tallaElegida] || producto.tallas[tallaElegida] <= 0) {
            notificar(`❌ ALERTA: ${producto.nombre} talla ${tallaElegida} AGOTADO`, "error");
            return; // ⛔ Detenemos la venta
        }
    } else {
        // Si no hay tallas, verificar stock general
        if (!producto.cantidad || producto.cantidad <= 0) {
            notificar(`❌ ALERTA: ${producto.nombre} AGOTADO`, "error");
            return; // ⛔ Detenemos la venta
        }
    }

    // Buscamos el precio en memoria
    const precioMemoria = Inventario.buscarPrecioMemoria(producto.nombre) || 0;
    
    // Usamos modal de entrada para mostrar el precio y permitir cambiarlo
    this.mostrarModalEntrada(
        "Confirmar Venta",
        `Producto: <b>${producto.nombre}</b>${tallaElegida ? ' (' + tallaElegida + ')' : ''}<br>Precio sugerido: $${precioMemoria}`,
        "Precio USD",
        (nuevoPrecioStr) => {
            const precioFinal = parseFloat(nuevoPrecioStr);
            
            if (isNaN(precioFinal) || precioFinal < 0) {
                notificar("Precio inválido", "error");
                return;
            }
            
            // Registramos la venta con el precio confirmado/cambiado
            Ventas.registrarVenta(
                producto.nombre, 
                precioFinal, 
                'USD', 
                'Efectivo', 
                'Anónimo', 
                0, // comisión
                false, // esServicio
                1, // cantidad
                tallaElegida
            );
            
            notificar(`💰 Venta registrada: ${producto.nombre} - $${precioFinal}`);
            
            // Actualizamos la pantalla de historial
            if (typeof Interfaz !== 'undefined') Interfaz.renderVentas();
        },
        precioMemoria
    );
},

modalRecargaRapida: function(nombreProducto) {
    // 1. Buscamos el producto (normalizando para evitar errores)
    const p = Inventario.productos.find(prod => prod.nombre.toLowerCase() === nombreProducto.toLowerCase());
    
    if (!p) return notificar("❌ Producto no encontrado", "error");

    // 2. Pedir cantidad (Modal de entrada de texto)
    this.mostrarModalEntrada(
        "⚡ Recarga Rápida",
        `<div style="text-align:center; margin-bottom:10px;">
            <span style="font-size:1.2em; color:var(--primary);">${p.nombre}</span><br>
            <small>Stock actual: <b>${p.cantidad} ${p.unidad}</b></small>
         </div>`,
        "¿Cuántas unidades sumar?",
        (cantidadStr) => {
            const cantidad = parseFloat(cantidadStr);
            
            if (isNaN(cantidad) || cantidad <= 0) {
                return notificar("❌ Cantidad inválida", "error");
            }

            // 3. Lógica de Tallas (Composición)
            const tieneTallas = p.tallas && Object.keys(p.tallas).length > 0;

            if (tieneTallas) {
                const tallasDisponibles = Object.keys(p.tallas);
                
                // Abrimos el modal de selección de talla
                this.mostrarModalTallas(
                    "📏 Seleccionar Talla",
                    `¿A qué talla sumar los <b>${cantidad}</b>?`,
                    tallasDisponibles,
                    (tallaElegida) => {
                        // Confirmación final con talla
                        this.ejecutarConfirmacionRecarga(p, cantidad, tallaElegida);
                    }
                );
            } else {
                // Confirmación directa si no hay tallas
                this.ejecutarConfirmacionRecarga(p, cantidad, null);
            }
        }
    );

    // 4. UX: Autofocus y Selección automática
    setTimeout(() => {
        const inputModal = document.getElementById('input-modal-entrada');
        if (inputModal) {
            inputModal.type = "number"; // Aseguramos teclado numérico en móvil
            inputModal.focus();
            inputModal.select(); 
        }
    }, 350); // Un poco más de margen para animaciones CSS
},

// 💡 FUNCIÓN AUXILIAR PARA NO REPETIR CÓDIGO
ejecutarConfirmacionRecarga: function(p, cantidad, tallaElegida) {
    Interfaz.confirmarAccion(
        "Confirmar Recarga",
        `¿Sumar ${cantidad} ${p.unidad} a "${p.nombre}"${tallaElegida ? ' en talla ' + tallaElegida : ''}?`,
        () => {
            Inventario.recargarRapido(p.nombre, cantidad, tallaElegida);
        },
        null, // 🚀 CORRECCIÓN: Acción al cancelar (null si no hace nada)
        "Sí, recargar",
        "Cancelar",
        false
    );
},

// AÑADE ESTO A TU OBJETO INTERFAZ
mostrarModalTallas: function(titulo, mensaje, tallas, onSeleccionar) {
    if (!tallas || tallas.length === 0) {
        console.warn("DOMINUS: Intento de abrir modal sin tallas disponibles.");
        return;
    }

    const uniqueId = Date.now();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    // 🛡️ Mejora: Añadimos 'overflow-y: auto' por si hay muchas tallas
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; z-index:99999; padding:20px; overflow-y:auto;";

    // 1. Generar botones con reducción (más limpio que concatenar con +=)
    const botonesTallas = tallas.map(talla => `
        <button id="btn-talla-${talla}-${uniqueId}" 
                class="btn-main" 
                style="background:rgba(76, 175, 80, 0.2); border:1px solid #4caf50; flex: 1 1 calc(50% - 10px); min-width:80px; margin:5px; padding:12px;">
            ${talla}
        </button>
    `).join('');

    overlay.innerHTML = `
        <div class="card glass" style="max-width:350px; width:100%; text-align:center; border:1px solid #4caf50; padding:25px; border-radius:20px; background: #1a1a1a;">
            <h3 style="color:#ffffff; margin-bottom:10px;">${titulo}</h3>
            <p style="color:white; opacity:0.8; margin-bottom:20px; font-size:0.9em;">${mensaje}</p>
            <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:5px; margin-bottom:20px; max-height:60vh; overflow-y:auto; padding-right:5px;">
                ${botonesTallas}
            </div>
            <button id="btn-cancelar-talla-${uniqueId}" class="btn-main" style="background:#cc3300; width:100%; margin-top:10px;">Cerrar</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // 2. Asignación de eventos segura
    tallas.forEach(talla => {
        const btn = document.getElementById(`btn-talla-${talla}-${uniqueId}`);
        if (btn) {
            btn.onclick = () => {
                onSeleccionar(talla);
                overlay.remove();
            };
        }
    });

    // 🛡️ Blindaje de cierre: usamos el ID único también para el botón cancelar
    const btnCancel = document.getElementById(`btn-cancelar-talla-${uniqueId}`);
    if (btnCancel) btnCancel.onclick = () => overlay.remove();
},

mostrarModalEntrada: function(titulo, mensaje, placeholder, onAceptar) {
    const uniqueId = Date.now();
    const inputId = `input-${uniqueId}`;
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; z-index:99999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:320px; width:100%; text-align:center; border:1px solid #4caf50; padding:25px; border-radius:20px;">
            <h3 style="color:#ffffff; margin-bottom:10px;">${titulo}</h3>
            <p style="color:white; opacity:0.9; margin-bottom:15px; font-size:0.9em;">${mensaje}</p>
            <input type="number" id="${inputId}" placeholder="${placeholder}" 
                style="width:100%; padding:10px; border-radius:10px; border:1px solid #4caf50; background:rgba(0,0,0,0.3); color:white; margin-bottom:20px; text-align:center; font-size:1.2em; outline:none;">
            <div style="display:flex; gap:10px;">
                <button id="btn-cancelar-${uniqueId}" class="btn-main" style="background:#444; flex:1">Cancelar</button>
                <button id="btn-aceptar-${uniqueId}" class="btn-main" style="background:#4caf50; flex:1">Aceptar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    const inputEl = document.getElementById(inputId);
    
    // Autofocus inmediato
    setTimeout(() => {
        inputEl.focus();
        inputEl.select();
    }, 100);

    // Función cerrar y aceptar
    const ejecutarAceptar = () => {
        const valor = inputEl.value;
        if(valor !== "") {
            onAceptar(valor);
            overlay.remove();
        }
    };

    // Evento Enter
    inputEl.onkeyup = (e) => { if(e.key === "Enter") ejecutarAceptar(); };
    
    document.getElementById(`btn-aceptar-${uniqueId}`).onclick = ejecutarAceptar;
    document.getElementById(`btn-cancelar-${uniqueId}`).onclick = () => overlay.remove();
},

// 🔥 FUNCIÓN MODIFICADA
confirmarAccion(titulo, mensaje, onConfirmar, onCancelar = null, textoConfirmar = "Sí, proceder", textoCancelar = "No, cancelar", esPeligroso = false) {
    const uniqueId = Date.now();
    const btnAbortarId = `btn-abortar-${uniqueId}`;
    const btnProcederId = `btn-proceder-${uniqueId}`;
    
    const colorPrimario = esPeligroso ? "#ff4444" : "#4caf50";
    const icono = esPeligroso ? "⚠️" : "❓";

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; z-index:99999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:320px; width:100%; text-align:center; border:1px solid ${colorPrimario}; padding:25px; border-radius:20px;">
            <span style="font-size:3em;">${icono}</span>
            <h3 style="color:#ffffff; margin:10px 0;">${titulo}</h3>
            <p style="color:white; opacity:0.9; margin-bottom:20px;">${mensaje}</p>
            <div style="display:flex; gap:10px;">
                <button id="${btnAbortarId}" class="btn-main" style="background:#444; flex:1">${textoCancelar}</button>
                <button id="${btnProcederId}" class="btn-main" style="background:${colorPrimario}; flex:1">${textoConfirmar}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById(btnAbortarId).onclick = () => {
        // Primero removemos el modal actual 🗑️
        overlay.remove();
        // Luego ejecutamos la acción secundaria (que puede abrir otro modal)
        if (onCancelar) onCancelar(); 
    };

    document.getElementById(btnProcederId).onclick = () => {
        // Primero removemos el modal actual 🗑️
        overlay.remove();
        // Luego ejecutamos la acción principal
        onConfirmar();
    };
},



    cambiarSeccion: function(id) {
        console.log("Cambiando a:", id);
    }, 

 cambiarTabAjustes(tabId) {
    console.log("Activando pestaña:", tabId);

    // 1. Quitamos la clase 'active' de todas las pestañas
    document.querySelectorAll('.tab-content').forEach(t => {
        t.classList.remove('active');
        t.style.display = ''; // Limpiamos estilos previos que puedan estorbar
    });

    // 2. Quitamos la clase 'active' de los botones de la cabecera
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Activamos la pestaña seleccionada
    const tabActiva = document.getElementById(tabId);
    if (tabActiva) {
        tabActiva.classList.add('active');
    }

    // 4. Activamos el botón correspondiente (asumiendo que tus botones tienen IDs o clases)
    const btnActivo = (tabId === 'tab-usuario') ? 
        document.getElementById('btn-tab-usuario') : 
        document.getElementById('btn-tab-sistema');

    if (btnActivo) {
        btnActivo.classList.add('active');
    }
},

    // 2. Intercambia el ⚙️ por la Foto Real en el Header y en el Panel
    actualizarAvatarHeader(perfil) {
        // Elementos del Header
        const iconDefault = document.getElementById('nav-icon-default');
        const imgPerfilNav = document.getElementById('nav-img-perfil');
        
        // Elementos del Panel Lateral
        const imgPerfilPanel = document.getElementById('perfil-avatar-img');
        const placeholderPanel = document.getElementById('perfil-avatar-placeholder');
        const txtNegocio = document.getElementById('perfil-nombre-negocio');
        const txtUser = document.getElementById('perfil-usuario-tag');

        if (perfil && perfil.fotoPerfil) {
            // En el Header
            if(iconDefault) iconDefault.style.display = 'none';
            if(imgPerfilNav) {
                imgPerfilNav.src = perfil.fotoPerfil;
                imgPerfilNav.style.display = 'block';
            }

            // En el Panel Lateral
            if(placeholderPanel) placeholderPanel.style.display = 'none';
            if(imgPerfilPanel) {
                imgPerfilPanel.src = perfil.fotoPerfil;
                imgPerfilPanel.style.display = 'block';
            }
        }

        // Actualizar textos del negocio si existen
        if(perfil) {
            if(txtNegocio) txtNegocio.innerText = perfil.negocio || "Mi Negocio";
            if(txtUser) txtUser.innerText = `@${perfil.usuario || 'usuario'}`;
        }
    },

toggleAjustes: function() {
    const panel = document.getElementById('panelAjustes');
    if (!panel) return;

    panel.classList.toggle('active');

    // Bloquear scroll del fondo cuando está abierto para mejorar el foco
    if (panel.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
        
        // Cierre automático al hacer clic fuera del panel
        const cerrarAlClickFuera = (e) => {
            if (!panel.contains(e.target) && !e.target.closest('.btn-ajustes-top')) {
                panel.classList.remove('active');
                document.body.style.overflow = 'auto';
                document.removeEventListener('click', cerrarAlClickFuera);
            }
        };
        // El setTimeout evita que el clic que abre el panel lo cierre inmediatamente
        setTimeout(() => document.addEventListener('click', cerrarAlClickFuera), 100);
        
    } else {
        document.body.style.overflow = 'auto';
    }
},

show(view) {
    // 0. ACTUALIZAR BOTONES DE NAVEGACIÓN (El "encendido" 3D)
    // Buscamos todos los botones y quitamos la luz
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Buscamos el botón que coincide con la vista actual y lo encendemos
    // Nota: Asegúrate de que el 'onclick' pase el nombre exacto de la vista
    const currentBtn = document.querySelector(`.nav-btn[onclick*="'${view}'"]`);
    if (currentBtn) currentBtn.classList.add('active');

    // 1. Limpieza total de secciones
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));
    
    // 2. Identificar el objetivo
    const target = document.getElementById(`view-${view}`);
    if (!target) return; 

    // 3. Hacer visible la sección
    target.classList.remove('hidden');

    // 4. LA ORDEN DEL CLIENTE: Actualizar Dashboard siempre
    this.actualizarDashboard();

    // 5. Carga de lógica específica por sección
    switch(view) {
        case 'dashboard': // Cambié 'inicio' por 'dashboard' si ese es tu ID
        case 'inicio':
            console.log("🏠 Dashboard refrescado.");
            break;

        case 'ventas':
            this.renderVentas();
            this.cargarSugerencias();
            setTimeout(() => {
                const searchInput = document.getElementById('buscar-producto');
                if(searchInput) searchInput.focus();
            }, 150);
            break;

        case 'gastos':
            this.renderGastos();
            break;

        case 'fiaos-list':
            if (typeof Notificaciones !== 'undefined') {
                Notificaciones.marcarComoLeido('fiaos');
            }
            this.renderFiaos();
            break;

        case 'inventario':
            if (typeof Notificaciones !== 'undefined') {
                Notificaciones.marcarComoLeido('inventario');
            }
            this.renderInventario();
            break;
    }
    
    // 6. Guardar última vista
    Persistencia.guardar('dom_ultima_vista', view);
    
    // Extra: Feedback táctil para Johander
    if (navigator.vibrate) navigator.vibrate(10);
},

    cargarSugerencias() {
        const listaSugerencias = document.getElementById('sugerencias-ventas');
        if (!listaSugerencias) return;
        const productos = Ventas.getSugerencias();
        listaSugerencias.innerHTML = productos.map(p => `<option value="${p}">`).join('');
    },

toggleClienteField(metodo) {
    const wrapper = document.getElementById('wrapper-cliente'); 
    const input = document.getElementById('v-cliente');

    if (!wrapper) return; // 🛡️ Blindaje: Evita errores si el DOM no carga el elemento

    if (metodo === 'Fiao') {
        // --- MODO OBLIGATORIO ---
        wrapper.classList.remove('hidden');
        if (input) {
            input.placeholder = "Nombre del deudor (Obligatorio)";
            input.focus(); 
        }
    } else {
        // --- MODO OPCIONAL / OCULTO ---
        // 💡 Decisión de Diseño: ¿Ocultarlo o dejarlo opcional?
        // Por ahora mantenemos tu lógica de ocultar, pero limpiamos con seguridad.
        wrapper.classList.add('hidden');
        if (input) {
            input.value = ''; 
            input.placeholder = "Nombre del cliente (Opcional)";
        }
    }
},

actualizarDashboard() {
    const v = Persistencia.cargar('dom_ventas') || [];
    const g = Persistencia.cargar('dom_gastos') || [];
    const f = Persistencia.cargar('dom_fiaos') || [];
    const t = (Conversor.tasaActual > 0) ? Conversor.tasaActual : 1;
    const hoy = new Date().toLocaleDateString('es-VE');

    // 1. Filtramos por fecha
    const vHoy = v.filter(vent => vent.fecha === hoy);
    const gHoy = g.filter(gas => gas.fecha === hoy);

    // 2. Sumamos ventas del día (SOLO las que NO son devoluciones)
    // Usamos el flag 'devuelta' para ignorar el dinero que salió por reembolso
    const totalV = vHoy.reduce((acc, i) => {
        return i.devuelta ? acc : acc + (parseFloat(i.montoBs) || 0);
    }, 0);
    
    // 3. Sumamos gastos del día
    const totalG = gHoy.reduce((acc, i) => acc + (parseFloat(i.montoBs) || 0), 0);

    // Ingreso Total Bruto Real (Ventas efectivas)
    const netoBs = totalV; 
    const netoConvertido = netoBs / t;

    // --- ACTUALIZACIÓN DE INTERFAZ ---
    
    // Caja en Bs
    const elCaja = document.getElementById('total-caja');
    if(elCaja) elCaja.innerText = `${(netoBs || 0).toLocaleString('es-VE')} Bs`;
    
    // Caja en USD
    const elUsd = document.getElementById('total-usd');
    if(elUsd) elUsd.innerText = `$ ${(netoConvertido || 0).toFixed(2)}`;
    
    // FIAOS: Basado en USD para protección contra devaluación
    const elFiaos = document.getElementById('total-fiaos');
    if(elFiaos) {
        const totalFiaosUSD = f.reduce((acc, i) => acc + (parseFloat(i.montoUSD) || 0), 0);
        const totalFiaosBs = totalFiaosUSD * t;
        elFiaos.innerText = `${(totalFiaosBs || 0).toLocaleString('es-VE')} Bs`;
    }
    
    // GASTOS: Informativo
    const elGastos = document.getElementById('total-gastos');
    if(elGastos) elGastos.innerText = `${(totalG || 0).toLocaleString('es-VE')} Bs`;
    
    // Sincronizar tasa
    const elTasa = document.getElementById('tasa-global');
    if(elTasa) elTasa.value = t;

    if (typeof Controlador !== 'undefined' && Controlador.renderizarGrafica) {
        Controlador.renderizarGrafica();
    }
},

renderVentas() {
    const datos = Persistencia.cargar('dom_ventas') || [];
    const lista = document.getElementById('lista-ventas-historial');
    if(!lista) return;

    if (datos.length === 0) {
        lista.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">No hay ventas registradas</p>';
        return;
    }

    const mapaVentas = {};
    const ventasAgrupadas = [];

    datos.forEach(item => {
        // Usamos el ID de transacción como ancla principal
        const llave = item.idTransaccion || `legacy-${item.fecha}-${item.hora}`;
        
        if (!mapaVentas[llave]) {
            mapaVentas[llave] = {
                id: llave,
                cliente: item.cliente || "Consumidor Final",
                hora: item.hora,
                fecha: item.fecha,
                metodo: item.metodo || 'Efectivo',
                items: [], 
                totalBs: 0,
                totalUSD: 0
            };
            ventasAgrupadas.push(mapaVentas[llave]);
        }
        
        mapaVentas[llave].items.push(item);

        if (!item.devuelta) {
            mapaVentas[llave].totalBs += Number(item.montoBs || 0);
            mapaVentas[llave].totalUSD += Number(item.montoUSD || 0);
        }
    });

    // Lo más nuevo arriba
    const historialInvertido = ventasAgrupadas.reverse();
    let htmlFinal = '';
    
    if (historialInvertido.length <= 6) {
        htmlFinal = historialInvertido.map(v => this.generarFilaVenta(v)).join('');
    } else {
        const recientes = historialInvertido.slice(0, 3);
        const antiguas = historialInvertido.slice(3);

        const gruposHora = {};
        antiguas.forEach(v => {
            const horaBloque = v.hora ? v.hora.split(':')[0] + ":00" : "Otras";
            if (!gruposHora[horaBloque]) gruposHora[horaBloque] = [];
            gruposHora[horaBloque].push(v);
        });

        // Ordenamos las llaves de hora para que el historial sea coherente
        const htmlAntiguas = Object.keys(gruposHora).sort().reverse().map(hora => `
            <div class="bloque-hora-container" style="border-left: 2px solid var(--primary-color); margin: 10px 0; padding-left: 10px;">
                <div class="bloque-hora-titulo" style="font-size: 0.7em; font-weight: bold; opacity: 0.7;">🕒 BLOQUE ${hora}</div>
                ${gruposHora[hora].map(v => this.generarFilaVenta(v)).join('')}
            </div>
        `).join('');

        htmlFinal = `
            ${recientes.map(v => this.generarFilaVenta(v)).join('')}
            <details class="glass detalles-historial" style="border-radius:10px; overflow:hidden; margin-top:10px;">
                <summary class="summary-historial" style="padding:10px; cursor:pointer; text-align:center; font-weight:bold; background: rgba(255,255,255,0.05);">
                    ➕ Ver ${antiguas.length} ventas anteriores
                </summary>
                <div class="detalles-content" style="padding: 10px; max-height: 400px; overflow-y: auto;">
                    ${htmlAntiguas}
                </div>
            </details>
        `;
    }

    // Inyección única: Aquí es donde ocurre la magia del "Cero Refresh"
    lista.innerHTML = htmlFinal;
},

generarFilaVenta(v) {
    const totalBs = Number(v.totalBs).toLocaleString('es-VE');
    const totalUSD = v.totalUSD ? Number(v.totalUSD).toFixed(2) : "0.00";

    // Mapeamos los productos del ticket
    const htmlDetalleProductos = v.items.map(p => {
        const cant = p.cantidadVenta > 1 ? `<span style="color:var(--primary)">${p.cantidadVenta}x</span>` : "";
        
        // 🎨 Estilo: Tachado si ya se devolvió
        const estiloTachado = p.devuelta 
            ? 'text-decoration: line-through; opacity: 0.4; font-style: italic;' 
            : '';

        // 🛡️ EL BOTÓN: Usamos los IDs que ya aseguramos en registrarVenta
        // v.id es el ID del grupo (Ticket), p.id es el ID del producto individual
        const btnAccion = p.devuelta ? 
            `<span style="font-size: 0.75em; opacity: 0.6;">(Devuelto)</span>` : 
            `<button class="btn-borrar-item" 
                     onclick="Ventas.anularProductoIndividual('${p.id}', '${v.id}')"
                     title="Devolver este producto"
                     style="background:none; border:none; color:#ff4757; cursor:pointer; font-size:14px; padding:0 5px; line-height:1;">
                ✕
             </button>`;

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85em; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); ${estiloTachado}">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${btnAccion}
                    <span>${cant} ${p.producto}</span>
                </div>
                <span style="opacity: 0.8;">${Number(p.montoBs).toLocaleString('es-VE')} Bs</span>
            </div>
        `;
    }).join('');

    return `
        <div class="item-venta glass" style="border-left: 4px solid var(--primary); margin-bottom: 12px; padding: 0; overflow: hidden;">
            <div style="padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div class="venta-info">
                    <strong style="font-size: 1.1em; color: var(--primary);">👤 ${v.cliente}</strong>
                    <div style="font-size: 0.75em; opacity: 0.6;">🕒 ${v.hora} • ${v.metodo}</div>
                </div>
                
                <div class="venta-montos" style="text-align: right;">
                    <div style="font-weight: bold; font-size: 1.05em;">${totalBs} Bs</div>
                    <div style="color: #2ecc71; font-size: 0.85em; font-weight: 500;">$ ${totalUSD}</div>
                </div>
            </div>

            <details class="detalles-historial-cliente" style="background: rgba(0,0,0,0.15); border-top: 1px solid rgba(255,255,255,0.05);">
                <summary style="padding: 8px; font-size: 0.75em; text-align: center; cursor: pointer; color: var(--primary); list-style: none; opacity: 0.8;">
                    ▼ Ver ${v.items.length} productos
                </summary>
                <div style="padding: 5px 12px 12px 12px;">
                    ${htmlDetalleProductos}
                    <div style="margin-top: 10px; text-align: right;">
                        <span style="font-size: 0.65em; opacity: 0.3; letter-spacing: 0.5px;">TICKET: ${v.id.toString().substring(0,15)}</span>
                    </div>
                </div>
            </details>
        </div>`;
},

 alternarModoPunto() {
    const btnPunto = document.getElementById('btn-modo-punto');
    const wrapper = document.getElementById('wrapper-comision');
    const inputComision = document.getElementById('v-comision');
    const btnVender = document.querySelector('.btn-main'); 
    
    if (!btnPunto || !wrapper) return; // 🛡️ Blindaje: Evita errores si los IDs no existen

    const activo = btnPunto.classList.toggle('activo-punto');
    
    if (activo) {
        // --- ACTIVAR MODO SERVICIO ---
        wrapper.classList.remove('hidden');
        btnPunto.style.background = "var(--primary)";
        btnPunto.style.color = "black";
        btnPunto.innerText = "🏦 MODO SERVICIO ACTIVO";
        
        if (btnVender) btnVender.innerText = "Registrar Servicio de Punto";
        
        // 🛡️ UX: Ponemos el cursor en la comisión automáticamente
        if (inputComision) {
            inputComision.focus();
            inputComision.select(); // Selecciona el texto para escribir encima rápido
        }

    } else {
        // --- VOLVER A MODO VENTA NORMAL ---
        wrapper.classList.add('hidden');
        btnPunto.style.background = "transparent";
        btnPunto.style.color = "var(--primary)";
        btnPunto.innerText = "🏦 ¿Es Servicio de Punto?";
        
        if (btnVender) btnVender.innerText = "Registrar Venta";
        
        // 🛡️ Limpieza profunda para que no afecte a la siguiente venta
        if (inputComision) inputComision.value = 0;
    }
},

renderGastos() {
    const datos = Persistencia.cargar('dom_gastos') || [];
    const lista = document.getElementById('lista-gastos-historial');
    if (!lista) return;

    if (datos.length === 0) {
        lista.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">No hay gastos registrados</p>';
        return;
    }

    const gastosInvertidos = datos.slice().reverse();
    let htmlFinal = '';

    if (gastosInvertidos.length <= 6) {
        htmlFinal = gastosInvertidos.map(g => this.generarFilaGasto(g)).join('');
    } else {
        const recientes = gastosInvertidos.slice(0, 3);
        const antiguas = gastosInvertidos.slice(3);
        
        // 🧮 Calculamos el total de lo que se va a ocultar
        const totalAntiguosBs = antiguas.reduce((sum, g) => sum + g.montoBs, 0);

        const grupos = {};
        antiguas.forEach(g => {
            const horaBloque = (g.hora || "00:00").split(':')[0] + ":00";
            if (!grupos[horaBloque]) grupos[horaBloque] = [];
            grupos[horaBloque].push(g);
        });

        const htmlAntiguos = Object.keys(grupos).map(hora => `
            <div style="border-left: 2px solid #ff5252; margin: 12px 0; padding-left: 12px;">
                <div style="font-size: 10px; font-weight: bold; color: #ff5252; margin-bottom: 5px; text-transform: uppercase;">🕒 Bloque ${hora}</div>
                ${grupos[hora].map(g => this.generarFilaGasto(g)).join('')}
            </div>
        `).join('');

        htmlFinal = `
            ${recientes.map(g => this.generarFilaGasto(g)).join('')}
            
            <details class="glass" style="margin-top: 15px; border: 1px solid rgba(255, 82, 82, 0.3); border-radius: 10px;">
                <summary style="padding: 12px; cursor: pointer; text-align: center; color: #ff5252; list-style: none;">
                    <div style="font-weight: bold;">➕ Ver anteriores (${antiguas.length})</div>
                    <div style="font-size: 0.75em; opacity: 0.8;">Acumulado: ${totalAntiguosBs.toLocaleString('es-VE')} Bs</div>
                </summary>
                <div style="max-height: 350px; overflow-y: auto; padding: 10px; background: rgba(0,0,0,0.15);">
                    ${htmlAntiguos}
                </div>
            </details>
        `;
    }
    lista.innerHTML = htmlFinal;
},

generarFilaGasto(g) {
    // 💡 Calculamos la referencia para que el usuario siempre vea ambas monedas
    const montoRef = g.monedaOriginal === 'BS' 
        ? `$ ${Number(g.montoUSD).toFixed(2)}` 
        : `${Number(g.montoBs).toLocaleString('es-VE')} Bs`;

    return `
        <div class="item-lista glass" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid #ff5252; padding: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-grow: 1;">
                <button onclick="Ventas.eliminarGasto('${g.id}')" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:16px; padding:0 5px;">✕</button>
                
                <div style="line-height: 1.2;">
                    <strong style="font-size: 0.95em; color: #fff;">${g.descripcion}</strong><br>
                    <small style="opacity:0.6; font-size: 0.75em;">${g.fecha} • ${g.hora || ''}</small>
                </div>
            </div>
            
            <div style="text-align: right; margin-left: 10px;">
                <div style="color:#ff5252; font-weight:bold; font-size: 0.95em;">
                    -${Number(g.montoOriginal).toLocaleString('es-VE')} ${g.monedaOriginal}
                </div>
                <div style="font-size: 0.7em; opacity: 0.5;">
                    Ref: ${montoRef}
                </div>
            </div>
        </div>`;
},

renderFiaos() {
    // 1. Cargamos datos frescos de la persistencia
    const datos = Persistencia.cargar('dom_fiaos') || [];
    const lista = document.getElementById('lista-fiaos');
    if(!lista) return;

    if(datos.length === 0) {
        lista.innerHTML = '<p class="sin-creditos">¡Todos los clientes están al día! 👏</p>';
        return;
    }

    // 2. Lógica para agrupar por cliente (Sensible a variaciones de escritura)
    const agrupado = {};

    datos.forEach(f => {
        // Creamos una "Llave de Identidad" única: todo a minúsculas y sin espacios extras
        // Esto hace que "Pedro " y "pedro" caigan en la misma bolsa
        const nombreCrudo = f.cliente || "Cliente Desconocido";
        const llaveUnica = nombreCrudo.trim().toLowerCase();

        if (!agrupado[llaveUnica]) {
            agrupado[llaveUnica] = {
                cliente: nombreCrudo, // Guardamos el primer nombre que aparezca para el diseño
                totalUSD: 0,
                deudas: [] 
            };
        }
        
        // Sumamos en dólares asegurando que sea un número (con blindaje de 2 decimales)
        agrupado[llaveUnica].totalUSD += parseFloat(f.montoUSD || 0);
        
        // Guardamos la deuda completa para los detalles
        agrupado[llaveUnica].deudas.push(f);
    });

    // 3. Renderizar grupos
    // Convertimos el objeto de grupos a un Array para poder mapearlo
    const listaAgrupada = Object.values(agrupado);
    
    lista.className = 'lista-fiaos-container';
    
    // Inyectamos el HTML usando el componente visual de filas
    // Nota: 'this' debe ser el objeto Interfaz
    lista.innerHTML = listaAgrupada
        .map(c => this.generarFilaFiaoAgrupada(c))
        .join('');
},


// --- 3. NUEVA FUNCIÓN PARA FILAS AGRUPADAS ---
generarFilaFiaoAgrupada(c) {
    const tasaActual = Conversor.tasaActual;
    const totalBs = c.totalUSD * tasaActual;
    const montoBsDisplay = Number(totalBs).toLocaleString('es-VE');
    const montoUSDDisplay = Number(c.totalUSD).toFixed(2);

    // --- 1. LÓGICA DE DÍAS DE MORA ---
    const fechaRaiz = new Date(c.deudas[0].fecha); 
    const hoy = new Date();
    const diferenciaTiempo = hoy - fechaRaiz;
    const diasMora = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));

    // --- 2. LÓGICA DE SEMÁFORO ---
    const limiteRojo = parseInt(Persistencia.cargar('cfg_limite_dias')) || 5;
    let colorClase = "fiao-verde";
    if (diasMora >= limiteRojo) colorClase = "fiao-rojo";
    else if (diasMora >= 3) colorClase = "fiao-amarillo";

    // --- 3. LÓGICA DE SALUDO TEMPORAL ---
    const hora = hoy.getHours();
    let saludo = "Hola";
    if (hora >= 6 && hora < 12) saludo = "Buenos días";
    else if (hora >= 12 && hora < 19) saludo = "Buenas tardes";
    else saludo = "Buenas noches";

    // --- 4. CONSTRUCCIÓN DEL MENSAJE DINÁMICO ---
    const nombreNegocio = Persistencia.cargar('cfg_nombre_negocio') || "DOMINUS BUSINESS";
    
    // Obtenemos la plantilla personalizada según la franja horaria actual
    let plantilla = Usuario.obtenerMensajeSegunHora();

    // Formateo del detalle de productos para el mensaje de WhatsApp
    const detalleTexto = c.deudas.map(d => `• ${d.producto} ($${Number(d.montoUSD).toFixed(2)})`).join('\n');

    // Reemplazo de etiquetas
    let mensajeFinal = plantilla
        .split("[saludo]").join(saludo)
        .split("[cliente]").join(c.cliente)
        .split("[negocio]").join(nombreNegocio)
        .split("[montoUSD]").join(montoUSDDisplay)
        .split("[montoBs]").join(montoBsDisplay)
        .split("[monto_detalle]").join(detalleTexto)
        .split("[dias_mora]").join(diasMora);

    const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(mensajeFinal)}`;

    // --- 5. RENDERIZADO DEL HTML ---
    return `
        <div class="card-fiao glass ${colorClase}">
            <div class="fiao-header">
                <div class="fiao-info">
                    <strong>👤 ${c.cliente}</strong>
                    <div class="mora-tag">${diasMora > 0 ? `Hace ${diasMora} días` : 'Hoy'}</div>
                </div>
                <div class="fiao-actions">
                    <div class="monto-block">
                        <span class="monto-usd">$${montoUSDDisplay}</span>
                        <span class="monto-bs">${montoBsDisplay} Bs</span>
                    </div>
                    <div class="action-buttons">
                        <a href="${urlWhatsapp}" target="_blank" class="btn-whatsapp btn-redondo-wa" title="Enviar cobro detallado">📲</a>
                        <button class="btn-abonar" onclick="Ventas.abrirProcesoAbono('${c.cliente}')">Abonar</button>
                    </div>
                </div>
            </div>
            
            <details class="fiao-details">
                <summary>Ver desglose (${c.deudas.length} pendientes)</summary>
                <div class="details-content">
                    ${c.deudas.map(d => `
                        <div class="detail-item">
                            <div class="detail-text">
                                <span class="detail-product">${d.producto}</span>
                                <small class="detail-date">🕒 ${d.fecha}</small>
                            </div>
                            <div class="detail-price-actions">
                                <span class="detail-price">$${Number(d.montoUSD).toFixed(2)}</span>
                                <div class="detail-btns">
                                    <button class="btn-edit-small" onclick="Ventas.editarDeudaEspecifica('${d.id}')">✏️</button>
                                    <button class="btn-delete-small" onclick="Ventas.eliminarRegistroEspecifico('${d.id}')">🗑️</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    <button class="btn-eliminar-todo" onclick="Controlador.eliminarDeuda('${c.cliente}')">
                        ⚠️ Liquidar cuenta total
                    </button>
                </div>
            </details>
        </div>`;
},

filtrarFiaos() {
    const busqueda = document.getElementById('search-deudores').value.toLowerCase().trim();
    const tarjetas = document.querySelectorAll('.card-fiao');
    let resultadosEncontrados = 0;

    tarjetas.forEach(tarjeta => {
        // Buscamos el nombre del cliente dentro de la etiqueta strong de la tarjeta
        const nombreCliente = tarjeta.querySelector('strong').innerText.toLowerCase();
        
        if (nombreCliente.includes(busqueda)) {
            tarjeta.style.display = "block";
            tarjeta.style.animation = "fadeIn 0.3s ease"; // Un pequeño efecto visual
            resultadosEncontrados++;
        } else {
            tarjeta.style.display = "none";
        }
    });

    // Opcional: Mostrar un mensaje si no hay resultados
    const listaContenedor = document.getElementById('lista-fiaos');
    let msgNoResult = document.getElementById('no-results-search');

    if (resultadosEncontrados === 0 && busqueda !== "") {
        if (!msgNoResult) {
            msgNoResult = document.createElement('p');
            msgNoResult.id = 'no-results-search';
            msgNoResult.innerHTML = "❌ No se encontró ningún deudor con ese nombre.";
            msgNoResult.style.textAlign = "center";
            msgNoResult.style.color = "#888";
            msgNoResult.style.marginTop = "20px";
            listaContenedor.appendChild(msgNoResult);
        }
    } else {
        if (msgNoResult) msgNoResult.remove();
    }
},

renderInventario() {
    if (typeof Inventario === 'undefined' || !Inventario.productos) return;
    const lista = document.getElementById('lista-inventario');
    if (!lista) return;

    const generarHTMLItem = (p) => {
        const unidad = p.unidad || 'Und';
        // 🛡️ Aseguramos precisión decimal para balanza
        const stockActual = parseFloat(p.cantidad) || 0;
        const stockVisual = (p.unidad === 'Kg' || p.unidad === 'Lts') ? stockActual.toFixed(3) : Math.round(stockActual);
        
        const minConfigurado = parseFloat(p.stockMinimo) || (p.unidad === 'Kg' || p.unidad === 'Lts' ? 1.5 : 3);
        
        const estaVacio = stockActual <= 0;
        const esBajo = stockActual <= minConfigurado;
        
        // Estilos dinámicos
        let colorStock = 'var(--primary)';
        let bordeStyle = 'border: 1px solid rgba(255,255,255,0.1);';
        let fondoAlerta = 'rgba(255,255,255,0.05)';
        let etiquetaAlerta = '';

        if (estaVacio) {
            colorStock = '#ff4444';
            bordeStyle = 'border: 1px solid #ff4444;';
            fondoAlerta = 'rgba(255, 68, 68, 0.1)';
            etiquetaAlerta = `<span style="background:#ff4444; color:white; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:bold; margin-left:8px;">SIN STOCK</span>`;
        } else if (esBajo) {
            colorStock = '#ff9800';
            bordeStyle = 'border: 1px solid #ff9800;';
            fondoAlerta = 'rgba(255, 152, 0, 0.1)';
            etiquetaAlerta = `<span style="background:#ff9800; color:white; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:bold; margin-left:8px;">REABASTECER</span>`;
        }

        let htmlCodigo = p.codigo ? 
            `<div style="font-family: monospace; font-size: 11px; color: rgba(255,255,255,0.5); background: rgba(255,215,0,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">🆔 ${p.codigo}</div>` : '';

        let htmlTallas = "";
        if (p.tallas && Object.keys(p.tallas).length > 0) {
            // 🛡️ Filtramos tallas con stock y las ordenamos alfabéticamente
            const tallasActivas = Object.entries(p.tallas)
                                    .filter(([t, c]) => parseFloat(c) > 0)
                                    .sort((a, b) => a[0].localeCompare(b[0]));

            if (tallasActivas.length > 0) {
                htmlTallas = `
                    <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
                        ${tallasActivas.map(([t, c]) => `
                            <span style="font-size: 10px; background: rgba(255,255,255,0.08); color: #ddd; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); font-family: monospace;">
                                ${t}:<b>${c}</b>
                            </span>
                        `).join('')}
                    </div>`;
            }
        }

        return `
            <div class="item-lista glass" style="margin-bottom:12px; display: flex; flex-direction: column; padding: 14px; border-radius: 15px; ${bordeStyle} background: ${fondoAlerta}; gap: 10px;">
                <div style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <strong style="color: white; text-transform: uppercase; font-size: 0.95em; letter-spacing: 0.5px; flex: 1;">${p.nombre}</strong>
                        ${etiquetaAlerta}
                    </div>
                    ${htmlCodigo}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                    <div style="flex: 1;">
                        <small style="color: ${colorStock}; font-weight: bold; font-size: 0.85em; display: block;">
                            Disponible: ${stockVisual} ${unidad}
                        </small>
                        ${htmlTallas}
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="position: relative;">
                            <span style="position: absolute; left: 6px; top: 50%; transform: translateY(-50%); color: #4caf50; font-size: 0.75em; font-weight: bold;">$</span>
                            <input type="number" value="${p.precio}" step="0.01" 
                                onchange="Controlador.editarPrecioRapido('${p.nombre}', this.value)" 
                                style="width: 65px; background: rgba(0,0,0,0.4); color: #4caf50; border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 8px; text-align: right; font-weight: bold; padding: 6px 6px 6px 14px; outline: none; font-size: 0.9em;">
                        </div>

                        <button class="btn-mini" onclick="Interfaz.modalRecargaRapida('${p.nombre}')" style="background: rgba(76, 175, 80, 0.2); color: #4caf50; border: 1px solid #4caf50; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">➕</button>
                        <button class="btn-mini" onclick="Controlador.prepararEdicionInventario('${p.nombre}')" style="background: rgba(33, 150, 243, 0.2); color: #2196f3; border: 1px solid #2196f3; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">✏️</button>
                    </div>
                </div>
            </div>`;
    };

    const dibujarItems = (prods) => {
        if (prods.length === 0) {
            lista.innerHTML = `<p style="color: #666; text-align: center; padding: 30px; font-style: italic;">Sin coincidencias.</p>`;
            return;
        }

        // 🛡️ Ordenamiento inteligente: Sin Stock > Reabastecer > Normal
        const prodsOrdenados = [...prods].sort((a, b) => {
            const minA = parseFloat(a.stockMinimo) || (a.unidad === 'Kg' ? 1.5 : 3);
            const minB = parseFloat(b.stockMinimo) || (b.unidad === 'Kg' ? 1.5 : 3);
            
            const nivelA = a.cantidad <= 0 ? 2 : (a.cantidad <= minA ? 1 : 0);
            const nivelB = b.cantidad <= 0 ? 2 : (b.cantidad <= minB ? 1 : 0);
            
            return nivelB - nivelA;
        });

        lista.innerHTML = prodsOrdenados.map(p => generarHTMLItem(p)).join('');
    };

    // 🚀 EJECUCIÓN INICIAL
    dibujarItems(Inventario.productos);

    // 🛡️ GESTIÓN DE BUSCADOR (Sin duplicar eventos)
    const buscador = document.getElementById('busqueda-real-inv');
    if(buscador) {
        buscador.oninput = (e) => {
            const t = e.target.value.toLowerCase().trim();
            const filtrados = Inventario.productos.filter(prod => 
                prod.nombre.toLowerCase().includes(t) || 
                (prod.codigo && String(prod.codigo).includes(t))
            );
            dibujarItems(filtrados);
        };
    }
},

filtrarTallasPorBloque(rango) {
    const filas = document.querySelectorAll('.fila-talla');
    // 🛡️ Blindaje: Si no existe el objeto de rangos, mostramos todo para no bloquear al usuario
    if (typeof rangosTallas === 'undefined') {
        filas.forEach(f => f.style.display = 'flex');
        return;
    }

    const permitidas = rangosTallas[rango] || [];

    filas.forEach(fila => {
        const nroTallaAttr = fila.getAttribute('data-talla');
        const nroTalla = parseInt(nroTallaAttr);
        
        // Si no es un número (ej: "XL", "Manual"), lo dejamos visible siempre
        if (isNaN(nroTalla)) {
            fila.style.display = 'flex';
            return;
        }

        // Filtro inteligente
        if (rango === 'todos' || permitidas.includes(nroTalla)) {
            fila.style.display = 'flex';
        } else {
            fila.style.display = 'none';
        }
    });
},

actualizarSelectorTallas(nombreProducto) {
    const contenedor = document.getElementById('contenedor-talla');
    const select = document.getElementById('v-talla');
    const inputMonto = document.getElementById('v-monto');
    
    if (!contenedor || !select) return;

    // 1. Reset de estado inicial
    contenedor.classList.add('hidden');
    select.innerHTML = '';

    if (!nombreProducto || nombreProducto.trim() === "") return;

    const p = Inventario.productos.find(prod => 
        prod.nombre.toLowerCase() === nombreProducto.trim().toLowerCase()
    );

    if (p) {
        // AUTO-LLENADO DE PRECIO
        if (inputMonto && p.precio) {
            inputMonto.value = parseFloat(p.precio) || 0;
        }

        // LÓGICA DE VARIANTES
        if (p.tallas && Object.keys(p.tallas).length > 0) {
            let opcionesHTML = '<option value="">Elegir Talla/Peso...</option>';
            let hayVariantesConStock = false;

            Object.entries(p.tallas).forEach(([talla, cant]) => {
                const stock = parseFloat(cant) || 0;
                
                if (stock > 0) {
                    hayVariantesConStock = true;
                    // 🛡️ Normalizamos unidad para el prefijo
                    const unidadLower = (p.unidad || 'und').toLowerCase();
                    let prefijo = (unidadLower === 'kg' || unidadLower === 'lts') ? "Peso: " : "Talla: ";
                    
                    if (['manual', 'unica', 'única'].includes(talla.toLowerCase())) {
                        prefijo = "";
                    }

                    opcionesHTML += `<option value="${talla}">${prefijo}${talla} (${stock} ${p.unidad || 'und'} disp.)</option>`;
                }
            });

            if (hayVariantesConStock) {
                select.innerHTML = opcionesHTML;
                contenedor.classList.remove('hidden');
            }
        }
    }
},

notificarProximamente: function() {
        // 1. Sonido de aviso con tu sistema AudioDOMINUS
        if (typeof AudioDOMINUS !== 'undefined') {
            AudioDOMINUS.reproducir('sonido-alerta');
        }

        // 2. Primer mensaje de intriga
        notificar("🛠️ ¡Algo grande se está cocinando!", "info");
        
        // 3. Segundo mensaje con delay para generar curiosidad
        setTimeout(() => {
            notificar("Esta función se desbloqueará en una futura actualización. ¡No te desesperes! 😉", "alerta");
        }, 1500);
        
        console.log("💡 El usuario intentó entrar a Devoluciones. ¡Sigue generando curiosidad!");
    }
};

