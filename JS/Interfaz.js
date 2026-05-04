let lastScrollTop = 0;
const header = document.querySelector('.main-header');

// Ajustamos el body para que el contenido no quede tapado por el header fixed
if (header) {
    document.body.style.paddingTop = header.offsetHeight + "px";
}

window.addEventListener('scroll', () => {
    // 🛡️ EL CANDADO DE DOMINUS:
    // Si Herramientas.bloqueado es true, ignoramos por completo el movimiento del scroll.
    if (typeof Herramientas !== 'undefined' && Herramientas.bloqueado) return;

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

function purgarInterfaz() {
    console.log("🧹 Limpiando capas de acceso...");
    // Borramos físicamente el Splash y cualquier overlay de Login/Registro
    const capas = document.querySelectorAll('.splash, #splash-screen, [id*="overlay"]');
    capas.forEach(capa => capa.remove());
    
    // Devolvemos el scroll al cuerpo por si se quedó bloqueado
    document.body.style.overflow = 'auto';
}

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
        console.warn("DOMINUS: Intento de abrir modal sin tallas.");
        return;
    }

    const uniqueId = Date.now();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active'; // Reutilizamos tu clase de overlay estándar

    // Generamos los botones usando la nueva clase CSS
    const botonesHTML = tallas.map(talla => `
        <button id="btn-talla-${talla}-${uniqueId}" class="btn-talla-opcion">
            ${talla}
        </button>
    `).join('');

    overlay.innerHTML = `
        <div class="card glass modal-alert-shake" style="max-width:350px; width:90%; border:1px solid #4caf50;">
            <h3 style="margin-bottom:8px;">${titulo}</h3>
            <p style="opacity:0.8; font-size:0.9em; margin-bottom:20px;">${mensaje}</p>
            
            <div class="tallas-grid-container">
                ${botonesHTML}
            </div>
            
            <button id="btn-cancelar-talla-${uniqueId}" class="btn-talla-cancelar">
                Cerrar
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Asignación de eventos
    tallas.forEach(talla => {
        const btn = document.getElementById(`btn-talla-${talla}-${uniqueId}`);
        if (btn) {
            btn.onclick = () => {
                onSeleccionar(talla);
                overlay.remove();
            };
        }
    });

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
    overlay.className = 'modal-overlay active';

    // 🎨 Estilos dinámicos para garantizar visibilidad y estética Glassmorphism
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '10000',
        backdropFilter: 'blur(8px)',
        webkitBackdropFilter: 'blur(8px)'
    });

    overlay.innerHTML = `
        <div class="card glass modal-alert-shake" style="max-width:350px; width:90%; border:1px solid ${colorPrimario}; text-align:center; padding: 25px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="font-size:3.5em; margin-bottom:10px; filter: drop-shadow(0 0 12px ${colorPrimario}66);">${icono}</div>
            <h3 style="color:#ffffff; margin-bottom:10px; letter-spacing:1px; font-family: sans-serif;">${titulo}</h3>
            <p style="color:rgba(255,255,255,0.9); margin-bottom:25px; line-height:1.5; font-size: 0.95em;">${mensaje}</p>
            
            <div class="modal-confirm-btns" style="display: flex; gap: 10px; justify-content: center;">
                <button id="${btnAbortarId}" class="btn-confirm-cancel" style="padding: 10px 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; cursor: pointer;">
                    ${textoCancelar}
                </button>
                <button id="${btnProcederId}" class="btn-confirm-proceder" style="padding: 10px 20px; border-radius: 8px; border: none; background: ${colorPrimario}; color: white; cursor: pointer; font-weight: bold; box-shadow: 0 4px 15px ${colorPrimario}44;">
                    ${textoConfirmar}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Lógica de cierre y ejecución con limpieza de DOM
    const cerrarYEjecutar = (callback) => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        setTimeout(() => {
            overlay.remove(); 
            if (callback) callback();
        }, 200);
    };

    // Asignación de eventos
    const btnAbortar = document.getElementById(btnAbortarId);
    const btnProceder = document.getElementById(btnProcederId);

    if (btnAbortar) {
        btnAbortar.onclick = () => cerrarYEjecutar(onCancelar);
    }

    if (btnProceder) {
        btnProceder.onclick = () => {
            console.log("Acción confirmada en Interfaz.");
            cerrarYEjecutar(onConfirmar);
        };
    }
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

    const isActive = panel.classList.toggle('active');

    if (isActive) {
        document.body.style.overflow = 'hidden';
        
        // Atributo para que el Teclado.js sepa que debe activar atajos de una letra (O, A, P)
        panel.setAttribute('data-keyboard-mode', 'ajustes');

        // Foco automático al primer switch (Modo Oscuro) para que pueda usar flechas de inmediato
        const primerAjuste = panel.querySelector('#checkDarkMode');
        if (primerAjuste) primerAjuste.focus();

        const cerrarAlClickFuera = (e) => {
            // Se agregó validación para que el clic en el disparador (avatar) no entre en conflicto
            if (!panel.contains(e.target) && !e.target.closest('#user-trigger')) {
                this.toggleAjustes(); // Usamos la misma función para mantener la lógica de limpieza
                document.removeEventListener('click', cerrarAlClickFuera);
            }
        };
        
        setTimeout(() => document.addEventListener('click', cerrarAlClickFuera), 100);
        
    } else {
        document.body.style.overflow = 'auto';
        panel.removeAttribute('data-keyboard-mode');
        
        // Devolvemos el foco al botón disparador para que la navegación no se pierda
        const trigger = document.getElementById('user-trigger');
        if (trigger) trigger.focus();
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
    // 🛡️ Blindaje de tasa para evitar división por cero
    const t = (Number(Conversor.tasaActual) > 0) ? Conversor.tasaActual : 1;
    const hoy = new Date().toLocaleDateString('es-VE');

    // 1. Filtramos por fecha (Ventas y Gastos)
    const vHoy = v.filter(vent => vent.fecha === hoy);
    const gHoy = g.filter(gas => gas.fecha === hoy);

    // 2. Sumamos ventas del día (Ignorando devoluciones)
    const totalV = vHoy.reduce((acc, i) => {
        return i.devuelta ? acc : acc + (parseFloat(i.montoBs) || 0);
    }, 0);
    
    // 3. Sumamos gastos del día
    const totalG = gHoy.reduce((acc, i) => acc + (parseFloat(i.montoBs) || 0), 0);

    // 🛡️ Cálculo Neto: Evitamos NaN si no hay ventas
    const netoBs = totalV || 0; 
    const netoConvertido = netoBs / t;

    // --- ACTUALIZACIÓN DE INTERFAZ ---
    
    // Caja en Bs
    const elCaja = document.getElementById('total-caja');
    if(elCaja) elCaja.innerText = `${netoBs.toLocaleString('es-VE')} Bs`;
    
    // Caja en USD
    const elUsd = document.getElementById('total-usd');
    if(elUsd) elUsd.innerText = `$ ${netoConvertido.toFixed(2)}`;
    
    // FIAOS: Basado en USD para protección contra devaluación
    const elFiaos = document.getElementById('total-fiaos');
    if(elFiaos) {
        // 🛡️ Usamos montoUSD de la tabla de fiaos para mayor precisión
        const totalFiaosUSD = f.reduce((acc, i) => acc + (parseFloat(i.montoUSD) || 0), 0);
        const totalFiaosBs = totalFiaosUSD * t;
        elFiaos.innerText = `${(totalFiaosBs || 0).toLocaleString('es-VE')} Bs`;
    }
    
    // GASTOS: Informativo
    const elGastos = document.getElementById('total-gastos');
    if(elGastos) elGastos.innerText = `${(totalG || 0).toLocaleString('es-VE')} Bs`;
    
    // Sincronizar tasa en el Input
    const elTasa = document.getElementById('tasa-global');
    if(elTasa) elTasa.value = t;

    // 🛡️ Lanzamiento seguro de la gráfica
    if (typeof Controlador !== 'undefined' && typeof Controlador.renderizarGrafica === 'function') {
        try {
            Controlador.renderizarGrafica();
        } catch (err) {
            console.warn("⚠️ La gráfica no pudo renderizarse aún:", err);
        }
    }
},

renderVentas() {
    const datos = Persistencia.cargar('dom_ventas') || [];
    const lista = document.getElementById('lista-ventas-historial');
    if (!lista) return;

    if (datos.length === 0) {
        lista.innerHTML = '<div class="empty-state">No hay ventas registradas</div>';
        return;
    }

    const mapaVentas = {};
    const ventasAgrupadas = [];

    // Agrupación por Transacción
    datos.forEach(item => {
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

    const historialInvertido = [...ventasAgrupadas].reverse(); // Copia y reversa
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

        // Construcción de bloques horarios
        const htmlAntiguas = Object.keys(gruposHora).sort().reverse().map(hora => `
            <div class="bloque-hora-container">
                <div class="bloque-hora-titulo">🕒 BLOQUE ${hora}</div>
                ${gruposHora[hora].map(v => this.generarFilaVenta(v)).join('')}
            </div>
        `).join('');

        htmlFinal = `
            ${recientes.map(v => this.generarFilaVenta(v)).join('')}
            <details class="glass detalles-historial">
                <summary class="summary-historial">
                    ➕ Ver ${antiguas.length} ventas anteriores
                </summary>
                <div class="detalles-content scroll-y-custom" style="max-height: 400px;">
                    ${htmlAntiguas}
                </div>
            </details>
        `;
    }

    lista.innerHTML = htmlFinal;
},

generarFilaVenta(v) {
    const totalBs = Number(v.totalBs).toLocaleString('es-VE');
    const totalUSD = v.totalUSD ? Number(v.totalUSD).toFixed(2) : "0.00";

    // Mapeamos los productos del ticket
    const htmlDetalleProductos = v.items.map(p => {
        const cant = p.cantidadVenta > 1 ? `<span style="color:var(--primary); font-weight:bold;">${p.cantidadVenta}x</span>` : "";
        const claseEstado = p.devuelta ? 'producto-tachado' : '';

        const accionHtml = p.devuelta ? 
            `<span style="font-size: 0.75em; color: #ff4757;">(Anulado)</span>` : 
            `<button class="btn-borrar-item" 
                     onclick="Ventas.anularProductoIndividual('${p.id}', '${v.id}')"
                     title="Devolver este producto">✕</button>`;

        return `
            <div class="fila-producto-detalle ${claseEstado}">
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${accionHtml}
                    <span>${cant} ${p.producto}</span>
                </div>
                <span style="font-weight: 500;">${Number(p.montoBs).toLocaleString('es-VE')} Bs</span>
            </div>
        `;
    }).join('');

    return `
        <div class="item-venta glass">
            <div style="padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div class="venta-info">
                    <div style="font-size: 1.1em; font-weight: 800; color: #fff;">👤 ${v.cliente.toUpperCase()}</div>
                    <div style="font-size: 0.75em; opacity: 0.5; margin-top: 2px;">
                        <span style="color:var(--primary)">●</span> ${v.hora} • ${v.metodo}
                    </div>
                </div>
                
                <div class="venta-montos" style="text-align: right;">
                    <div style="font-weight: 900; font-size: 1.1em; color: #fff;">${totalBs} Bs</div>
                    <div style="color: #2ecc71; font-size: 0.9em; font-weight: 700;">$ ${totalUSD}</div>
                </div>
            </div>

            <details class="detalles-historial-cliente" style="background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);">
                <summary style="padding: 10px; font-size: 0.75em; text-align: center; cursor: pointer; color: var(--primary); list-style: none;">
                    Ver detalle de compra (${v.items.length})
                </summary>
                <div style="padding: 5px 15px 15px 15px;">
                    ${htmlDetalleProductos}
                    <div style="margin-top: 12px; text-align: right;">
                        <span class="ticket-id-tag">ID: ${v.id.toString().substring(0,12)}</span>
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
    
    if (!btnPunto || !wrapper) return;

    // La clase 'activo-punto' ahora controla visualmente todo el botón
    const activo = btnPunto.classList.toggle('activo-punto');
    
    if (activo) {
        // --- ACTIVAR MODO SERVICIO ---
        wrapper.classList.remove('hidden');
        btnPunto.innerText = "🏦 MODO SERVICIO ACTIVO";
        
        if (btnVender) btnVender.innerText = "Registrar Servicio de Punto";
        
        // Foco automático para velocidad de operación
        if (inputComision) {
            setTimeout(() => {
                inputComision.focus();
                inputComision.select();
            }, 50); // Pequeño delay para asegurar que el wrapper sea visible
        }

    } else {
        // --- VOLVER A MODO VENTA NORMAL ---
        wrapper.classList.add('hidden');
        btnPunto.innerText = "🏦 ¿Es Servicio de Punto?";
        
        if (btnVender) btnVender.innerText = "Registrar Venta";
        
        // Reset de seguridad
        if (inputComision) inputComision.value = 0;
    }
},

renderGastos() {
    const datos = Persistencia.cargar('dom_gastos') || [];
    const lista = document.getElementById('lista-gastos-historial');
    if (!lista) return;

    if (datos.length === 0) {
        lista.innerHTML = '<div class="empty-state">No hay gastos registrados</div>';
        return;
    }

    const gastosInvertidos = [...datos].reverse();
    let htmlFinal = '';

    if (gastosInvertidos.length <= 6) {
        htmlFinal = gastosInvertidos.map(g => this.generarFilaGasto(g)).join('');
    } else {
        const recientes = gastosInvertidos.slice(0, 3);
        const antiguas = gastosInvertidos.slice(3);
        
        // 🧮 Cálculo de acumulado oculto para transparencia total
        const totalAntiguosBs = antiguas.reduce((sum, g) => sum + (Number(g.montoBs) || 0), 0);

        const grupos = {};
        antiguas.forEach(g => {
            const horaBloque = (g.hora || "00:00").split(':')[0] + ":00";
            if (!grupos[horaBloque]) grupos[horaBloque] = [];
            grupos[horaBloque].push(g);
        });

        const htmlAntiguos = Object.keys(grupos).sort().reverse().map(hora => `
            <div class="bloque-gasto-container">
                <div class="bloque-gasto-titulo">🕒 BLOQUE ${hora}</div>
                ${grupos[hora].map(g => this.generarFilaGasto(g)).join('')}
            </div>
        `).join('');

        htmlFinal = `
            ${recientes.map(g => this.generarFilaGasto(g)).join('')}
            
            <details class="glass detalles-gastos">
                <summary class="summary-gastos">
                    <div style="font-weight: 800; color: #ff5252;">➕ Ver anteriores (${antiguas.length})</div>
                    <div class="acumulado-text">Oculto: ${totalAntiguosBs.toLocaleString('es-VE')} Bs</div>
                </summary>
                <div class="scroll-y-custom" style="max-height: 350px; padding: 10px;">
                    ${htmlAntiguos}
                </div>
            </details>
        `;
    }
    lista.innerHTML = htmlFinal;
},

generarFilaGasto(g) {
    const montoBs = Number(g.montoBs).toLocaleString('es-VE');
    // Si manejas montos en USD para gastos también:
    const montoUSD = g.montoUSD ? Number(g.montoUSD).toFixed(2) : null;

    return `
        <div class="item-gasto glass">
            <div style="display: flex; align-items: center; gap: 12px;">
                <button class="btn-borrar-item" 
                        onclick="Gastos.anularGasto('${g.id}')"
                        style="background: rgba(255, 82, 82, 0.1); color: #ff5252;"
                        title="Eliminar gasto">
                    ✕
                </button>
                
                <div class="gasto-info">
                    <div class="gasto-descripcion">${g.descripcion || 'Gasto General'}</div>
                    <div class="gasto-meta">🕒 ${g.hora || '--:--'} • ${g.metodo || 'Caja'}</div>
                </div>
            </div>

            <div class="gasto-monto">
                <div>- ${montoBs} Bs</div>
                ${montoUSD ? `<div style="font-size: 0.8em; opacity: 0.6;">$ ${montoUSD}</div>` : ''}
            </div>
        </div>
    `;
},

renderFiaos() {
    const datos = Persistencia.cargar('dom_fiaos') || [];
    const lista = document.getElementById('lista-fiaos');
    if(!lista) return;

    if(datos.length === 0) {
        lista.innerHTML = '<p class="sin-creditos">¡Todos los clientes están al día! 👏</p>';
        return;
    }

    // Lógica de agrupación optimizada
    const agrupado = datos.reduce((acc, f) => {
        const nombre = (f.cliente || "Cliente Desconocido").trim();
        const llave = nombre.toLowerCase();

        if (!acc[llave]) {
            acc[llave] = {
                cliente: nombre,
                totalUSD: 0,
                deudas: [] 
            };
        }
        
        acc[llave].totalUSD += parseFloat(f.montoUSD || 0);
        acc[llave].deudas.push(f);
        return acc;
    }, {});

    const listaAgrupada = Object.values(agrupado);
    lista.className = 'lista-fiaos-container';
    
    // Renderizado mediante componente dedicado
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

    // --- LÓGICA DE MORA ---
    const fechaRaiz = new Date(c.deudas[0].fecha); 
    const hoy = new Date();
    const diasMora = Math.floor((hoy - fechaRaiz) / (1000 * 60 * 60 * 24));

    // --- SEMÁFORO ---
    const limiteRojo = parseInt(Persistencia.cargar('cfg_limite_dias')) || 5;
    let colorClase = diasMora >= limiteRojo ? "fiao-rojo" : (diasMora >= 3 ? "fiao-amarillo" : "fiao-verde");

    // --- MENSAJE WHATSAPP ---
    const horaActual = hoy.getHours();
    const saludo = horaActual < 12 ? "Buenos días" : (horaActual < 19 ? "Buenas tardes" : "Buenas noches");
    const nombreNegocio = Persistencia.cargar('cfg_nombre_negocio') || "DOMINUS";
    
    let plantilla = GestorMensajes.obtenerMensajeSegunHora() || "[saludo] [cliente], te escribo de [negocio]. Tu saldo pendiente es $[montoUSD].";
    const detalleTexto = c.deudas.map(d => `• ${d.producto} ($${Number(d.montoUSD).toFixed(2)})`).join('\n');

    const reemplazos = {
        "[saludo]": saludo,
        "[cliente]": c.cliente,
        "[negocio]": nombreNegocio,
        "[montoUSD]": montoUSDDisplay,
        "[montoBs]": montoBsDisplay,
        "[monto_detalle]": detalleTexto,
        "[dias_mora]": diasMora
    };

    let mensajeFinal = plantilla;
    Object.keys(reemplazos).forEach(key => {
        mensajeFinal = mensajeFinal.split(key).join(reemplazos[key]);
    });

    const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(mensajeFinal)}`;

    // --- SVG LOGO WHATSAPP ---
    const logoWS = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.06 3.973L0 16l4.14-1.086A7.98 7.98 0 0 0 7.994 16h.004c4.367 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>`;

    return `
        <div class="card-fiao glass ${colorClase}">
            <div class="fiao-header">
                <div class="fiao-info">
                    <strong style="font-size: 1.1em; color: #fff;">👤 ${c.cliente.toUpperCase()}</strong>
                    <br>
                    <span class="mora-tag">${diasMora > 0 ? `Hace ${diasMora} días` : 'Hoy'}</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 900; font-size: 1.2em; color: var(--primary);">$${montoUSDDisplay}</div>
                    <div style="font-size: 0.8em; opacity: 0.6;">${montoBsDisplay} Bs</div>
                    <div class="action-buttons" style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
                        <a href="${urlWhatsapp}" target="_blank" class="btn-whatsapp-cierre" style="padding: 8px 12px; width: auto; margin-bottom: 0;">
                            ${logoWS}
                        </a>
                        <button class="btn-abonar" onclick="Ventas.abrirProcesoAbono('${c.cliente}')" style="background: var(--primary); color: #000; border: none; border-radius: 8px; padding: 8px 12px; font-weight: bold; cursor: pointer;">
                            ABONAR
                        </button>
                    </div>
                </div>
            </div>
            
            <details class="fiao-details" style="background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05); border-radius: 0 0 16px 16px;">
                <summary style="padding: 10px; font-size: 0.75em; text-align: center; cursor: pointer; color: var(--primary);">
                    Desglose de deuda (${c.deudas.length} items)
                </summary>
                <div style="padding: 10px 15px 15px;">
                    ${c.deudas.map(d => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <div>
                                <div style="font-size: 0.9em; font-weight: 600;">${d.producto}</div>
                                <small style="opacity: 0.5;">🕒 ${d.fecha}</small>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-weight: bold;">$${Number(d.montoUSD).toFixed(2)}</span>
                                <button class="btn-borrar-item" onclick="Ventas.eliminarRegistroEspecifico('${d.id}')" style="background: none; border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px; cursor: pointer; padding: 2px 6px; font-size: 10px;">✕</button>
                            </div>
                        </div>
                    `).join('')}
                    <button class="btn-main" onclick="Controlador.eliminarDeuda('${c.cliente}')" 
                            style="background: #e74c3c; color: white; border: none; border-radius: 10px; width: 100%; margin-top: 15px; padding: 10px; font-size: 0.8em; font-weight: bold; cursor: pointer;">
                        ⚠️ LIQUIDAR CUENTA TOTAL
                    </button>
                </div>
            </details>
        </div>`;
},

filtrarFiaos() {
    const busqueda = document.getElementById('search-deudores')?.value.toLowerCase().trim() || "";
    const tarjetas = document.querySelectorAll('.card-fiao');
    let resultadosEncontrados = 0;

    tarjetas.forEach(tarjeta => {
        // Buscamos el nombre del cliente (está en el strong que pusimos en mayúsculas)
        const nombreCliente = tarjeta.querySelector('strong')?.innerText.toLowerCase() || "";
        
        if (nombreCliente.includes(busqueda)) {
            tarjeta.classList.remove('card-fiao-hidden');
            tarjeta.classList.add('card-fiao-visible');
            resultadosEncontrados++;
        } else {
            tarjeta.classList.remove('card-fiao-visible');
            tarjeta.classList.add('card-fiao-hidden');
        }
    });

    // Gestión del mensaje de "No hay resultados"
    const listaContenedor = document.getElementById('lista-fiaos');
    let msgNoResult = document.getElementById('no-results-search');

    if (resultadosEncontrados === 0 && busqueda !== "") {
        if (!msgNoResult) {
            msgNoResult = document.createElement('div');
            msgNoResult.id = 'no-results-search';
            msgNoResult.className = 'search-empty-state';
            msgNoResult.innerHTML = `
                <div style="font-size: 2em; margin-bottom: 10px;">🔍</div>
                No se encontró a "<strong>${busqueda}</strong>" en la lista de deudores.
            `;
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
        const stockActual = parseFloat(p.cantidad) || 0;
        const minConfig = parseFloat(p.stockMinimo) || (['Kg', 'Lts'].includes(p.unidad) ? 1.5 : 3);
        
        // Determinación de estado
        const estaVacio = stockActual <= 0;
        const esBajo = stockActual <= minConfig;
        
        const claseEstado = estaVacio ? 'inv-vacio' : (esBajo ? 'inv-bajo' : 'inv-normal');
        const colorStock = estaVacio ? '#ff4444' : (esBajo ? '#ff9800' : 'var(--primary)');
        
        const etiquetaAlerta = estaVacio 
            ? `<span class="badge-alerta" style="background:#ff4444;">SIN STOCK</span>` 
            : (esBajo ? `<span class="badge-alerta" style="background:#ff9800;">REABASTECER</span>` : '');

        const stockVisual = ['Kg', 'Lts'].includes(p.unidad) ? stockActual.toFixed(3) : Math.round(stockActual);

        // Renderizado de tallas (solo las que tienen existencia)
        let htmlTallas = "";
        if (p.tallas) {
            const tallasActivas = Object.entries(p.tallas)
                .filter(([_, cant]) => parseFloat(cant) > 0)
                .sort((a, b) => a[0].localeCompare(b[0], undefined, {numeric: true}));

            if (tallasActivas.length > 0) {
                htmlTallas = `<div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
                    ${tallasActivas.map(([t, c]) => `<span class="talla-tag">${t}:<b>${c}</b></span>`).join('')}
                </div>`;
            }
        }

        return `
            <div class="item-lista-inv glass ${claseEstado}">
                <div style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <strong style="color: white; text-transform: uppercase; font-size: 0.9em; flex: 1;">${p.nombre}</strong>
                        ${etiquetaAlerta}
                    </div>
                    ${p.codigo ? `<div class="id-badge-micro">🆔 ${p.codigo}</div>` : ''}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                    <div style="flex: 1;">
                        <small style="color: ${colorStock}; font-weight: 800; font-size: 0.85em;">
                            ${stockVisual} ${p.unidad || 'Und'}
                        </small>
                        ${htmlTallas}
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="position: relative;">
                            <span style="position: absolute; left: 6px; top: 50%; transform: translateY(-50%); color: #4caf50; font-size: 0.7em; font-weight: bold;">$</span>
                            <input type="number" value="${p.precio}" step="0.01" 
                                   onchange="Controlador.editarPrecioRapido('${p.nombre}', this.value)" 
                                   class="input-precio-rapido">
                        </div>
                        <button class="btn-mini-action" onclick="Interfaz.modalRecargaRapida('${p.nombre}')" title="Recargar Stock">➕</button>
                        <button class="btn-mini-action" onclick="Controlador.prepararEdicionInventario('${p.nombre}')" style="color:#2196f3; border-color:#2196f3;" title="Editar">✏️</button>
                    </div>
                </div>
            </div>`;
    };

    const dibujarItems = (prods) => {
        if (prods.length === 0) {
            lista.innerHTML = `<div class="empty-state-simple">Sin coincidencias en inventario.</div>`;
            return;
        }

        // Ordenamiento por prioridad de urgencia
        const prodsOrdenados = [...prods].sort((a, b) => {
            const getPrioridad = (x) => {
                const min = parseFloat(x.stockMinimo) || (['Kg', 'Lts'].includes(x.unidad) ? 1.5 : 3);
                if (x.cantidad <= 0) return 2;
                if (x.cantidad <= min) return 1;
                return 0;
            };
            return getPrioridad(b) - getPrioridad(a);
        });

        lista.innerHTML = prodsOrdenados.map(p => generarHTMLItem(p)).join('');
    };

    dibujarItems(Inventario.productos);

    // Buscador en tiempo real
    const buscador = document.getElementById('busqueda-real-inv');
    if(buscador) {
        buscador.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtrados = Inventario.productos.filter(prod => 
                prod.nombre.toLowerCase().includes(query) || (prod.codigo && String(prod.codigo).includes(query))
            );
            dibujarItems(filtrados);
        };
    }
},

filtrarTallasPorBloque(rango) {
    const filas = document.querySelectorAll('.fila-talla');
    
    // 🛡️ Blindaje de Arquitectura
    if (typeof rangosTallas === 'undefined') {
        filas.forEach(f => f.classList.add('talla-visible'));
        return;
    }

    const permitidas = rangosTallas[rango] || [];

    filas.forEach(fila => {
        const nroTallaAttr = fila.getAttribute('data-talla');
        const nroTalla = parseInt(nroTallaAttr);
        
        // --- LÓGICA DE VISIBILIDAD ---
        
        // 1. Las tallas no numéricas (S, M, L, XL, "Única") siempre se muestran
        if (isNaN(nroTalla)) {
            fila.classList.remove('talla-oculta');
            fila.classList.add('talla-visible');
            return;
        }

        // 2. Filtro por rango o mostrar 'todos'
        const esPermitida = rango === 'todos' || permitidas.includes(nroTalla);

        if (esPermitida) {
            fila.classList.remove('talla-oculta');
            fila.classList.add('talla-visible');
        } else {
            fila.classList.remove('talla-visible');
            fila.classList.add('talla-oculta');
        }
    });

    // 🛡️ Feedback visual en los botones de filtro si existen
    this.actualizarEstadoBotonesFiltro(rango);
},

actualizarEstadoBotonesFiltro(rangoActivo) {
    const botones = document.querySelectorAll('.btn-filtro-talla');
    botones.forEach(btn => {
        if (btn.getAttribute('data-rango') === rangoActivo) {
            btn.classList.add('btn-rango-activo');
        } else {
            btn.classList.remove('btn-rango-activo');
        }
    });
},

actualizarSelectorTallas(nombreProducto) {
    const contenedor = document.getElementById('contenedor-talla');
    const select = document.getElementById('v-talla');
    const inputMonto = document.getElementById('v-monto');
    
    if (!contenedor || !select) return;

    // 1. Reset preventivo: Limpieza total antes de evaluar
    contenedor.classList.add('hidden');
    select.innerHTML = '';

    if (!nombreProducto || nombreProducto.trim() === "") return;

    // Buscamos el producto en el Inventario global
    const p = Inventario.productos.find(prod => 
        prod.nombre.toLowerCase() === nombreProducto.trim().toLowerCase()
    );

    if (p) {
        // --- AUTO-LLENADO DE PRECIO ---
        // Prioridad: El precio que ya viene configurado en el inventario
        if (inputMonto && p.precio) {
            inputMonto.value = parseFloat(p.precio) || 0;
        }

        // --- LÓGICA DE VARIANTES ---
        if (p.tallas && Object.keys(p.tallas).length > 0) {
            let opcionesHTML = '<option value="">-- Seleccionar Talla/Peso --</option>';
            let hayVariantesConStock = false;

            // Ordenamos las tallas numéricamente si es posible
            const variantesOrdenadas = Object.entries(p.tallas).sort((a, b) => {
                return parseFloat(a[0]) - parseFloat(b[0]);
            });

            variantesOrdenadas.forEach(([talla, cant]) => {
                const stock = parseFloat(cant) || 0;
                
                if (stock > 0) {
                    hayVariantesConStock = true;
                    const unidad = (p.unidad || 'und').toLowerCase();
                    
                    // Lógica de Prefijo Inteligente
                    let prefijo = (unidad === 'kg' || unidad === 'lts') ? "Peso: " : "Talla: ";
                    const tLower = talla.toLowerCase();
                    
                    if (['manual', 'unica', 'única', 'u'].includes(tLower)) {
                        prefijo = "";
                    }

                    opcionesHTML += `<option value="${talla}">${prefijo}${talla} (${stock} ${unidad} disp.)</option>`;
                }
            });

            if (hayVariantesConStock) {
                select.innerHTML = opcionesHTML;
                contenedor.classList.remove('hidden');
                
                // Efecto visual de enfoque para recordar que debe elegir talla
                select.style.boxShadow = "0 0 10px rgba(255, 215, 0, 0.3)";
                setTimeout(() => select.style.boxShadow = "none", 1000);
            }
        }
    }
},

notificarProximamente: function(funcionalidad = "Esta función") {
    // 1. AudioDOMINUS: Feedback auditivo de sistema
    if (typeof AudioDOMINUS !== 'undefined') {
        AudioDOMINUS.reproducir('sonido-alerta');
    }

    // 2. Primer impacto: Intriga
    // Usamos el tipo "info" pero podrías crear uno llamado "futuro"
    notificar(`🛠️ ¡${funcionalidad} está en el taller!`, "info");
    
    // 3. Segundo impacto: Promesa de valor con delay
    setTimeout(() => {
        notificar(
            "Se desbloqueará en una futura actualización de DOMINUS. ¡Estamos trabajando para ti! 😉", 
            "alerta"
        );
    }, 1800);
    
    // 4. Métrica silenciosa: Saber qué es lo que más intenta usar el usuario
    console.log(
        `%c💡 Intento de acceso: ${funcionalidad}. Generando expectativa...`, 
        "color: #bb86fc; font-weight: bold; background: rgba(187, 134, 252, 0.1); padding: 5px; border-radius: 5px;"
    );
},
};

