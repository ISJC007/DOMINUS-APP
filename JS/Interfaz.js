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
    const uniqueId = Date.now();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; z-index:99999; padding:20px;";

    // Generar botones para cada talla
    let botonesTallas = "";
    tallas.forEach(talla => {
        const btnTallaId = `btn-talla-${talla}-${uniqueId}`;
        botonesTallas += `<button id="${btnTallaId}" class="btn-main" style="background:rgba(76, 175, 80, 0.3); border:1px solid #4caf50; flex:1; margin:5px;">${talla}</button>`;
    });

    overlay.innerHTML = `
        <div class="card glass" style="max-width:320px; width:100%; text-align:center; border:1px solid #4caf50; padding:25px; border-radius:20px;">
            <h3 style="color:#ffffff; margin-bottom:10px;">${titulo}</h3>
            <p style="color:white; opacity:0.9; margin-bottom:20px; font-size:0.9em;">${mensaje}</p>
            <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:20px;">
                ${botonesTallas}
            </div>
            <button id="btn-cancelar-talla" class="btn-main" style="background:#444; width:100%">Cancelar</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Eventos para botones de tallas
    tallas.forEach(talla => {
        const btnTallaId = `btn-talla-${talla}-${uniqueId}`;
        document.getElementById(btnTallaId).onclick = () => {
            onSeleccionar(talla);
            overlay.remove();
        };
    });

    document.getElementById('btn-cancelar-talla').onclick = () => overlay.remove();
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
        // Ocultar todas las secciones de ajustes
        document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
        
        // Mostrar solo la que clickeamos
        const tabActiva = document.getElementById(tabId);
        if(tabActiva) tabActiva.style.display = 'block';
        
        // Cambiar colores de los botones para que sepa cuál está activo
        const esUsuario = tabId === 'tab-usuario';
        const btnUser = document.getElementById('btn-tab-usuario');
        const btnSist = document.getElementById('btn-tab-sistema');

        if(esUsuario) {
            btnUser.style.background = 'var(--primary)';
            btnUser.style.color = 'black';
            btnSist.style.background = 'transparent';
            btnSist.style.color = 'white';
        } else {
            btnUser.style.background = 'transparent';
            btnUser.style.color = 'white';
            btnSist.style.background = 'var(--primary)';
            btnSist.style.color = 'black';
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
    // 1. Limpieza total de secciones
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));
    
    // 2. Identificar el objetivo
    const target = document.getElementById(`view-${view}`);
    if (!target) return; // Seguridad por si el ID no existe

    // 3. Hacer visible la sección
    target.classList.remove('hidden');

    // 4. LA ORDEN DEL CLIENTE: Actualizar Dashboard siempre
    // No importa a dónde vaya, los números se refrescan
    this.actualizarDashboard();

    // 5. Carga de lógica específica por sección
    switch(view) {
        case 'ventas':
            this.renderVentas();
            this.cargarSugerencias();
            // Truco de velocidad: Ponemos el foco en el buscador automáticamente
            setTimeout(() => {
                const searchInput = document.getElementById('buscar-producto');
                if(searchInput) searchInput.focus();
            }, 150);
            break;

        case 'gastos':
            this.renderGastos();
            break;

        case 'fiaos-list':
            this.renderFiaos();
            break;

        case 'inventario':
            this.renderInventario();
            break;

        case 'inicio':
            // Aquí podrías disparar una animación de entrada para los números
            console.log("🏠 Dashboard refrescado al entrar al inicio.");
            break;
    }
    
    // 6. (Opcional) Guardar en qué vista quedó el usuario por si se recarga la app
    Persistencia.guardar('dom_ultima_vista', view);
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

    const vHoy = v.filter(vent => vent.fecha === hoy);
    const gHoy = g.filter(gas => gas.fecha === hoy);

    // Sumamos ventas del día (Blindado contra datos no numéricos)
    const totalV = vHoy.reduce((acc, i) => acc + (parseFloat(i.montoBs) || 0), 0);
    
    // Sumamos gastos del día
    const totalG = gHoy.reduce((acc, i) => acc + (parseFloat(i.montoBs) || 0), 0);

    // Según el feedback del cliente: El neto muestra el INGRESO TOTAL BRUTO
    const netoBs = totalV; 
    const netoConvertido = netoBs / t;

    // --- ACTUALIZACIÓN DE INTERFAZ CON VALORES POR DEFECTO ---
    
    // Caja en Bs
    const elCaja = document.getElementById('total-caja');
    if(elCaja) elCaja.innerText = `${(netoBs || 0).toLocaleString('es-VE')} Bs`;
    
    // Caja en USD (Divisa estimada)
    const elUsd = document.getElementById('total-usd');
    if(elUsd) elUsd.innerText = `$ ${(netoConvertido || 0).toFixed(2)}`;
    
    // FIAOS: Basado en valor real (USD) para proteger de la devaluación
    const elFiaos = document.getElementById('total-fiaos');
    if(elFiaos) {
        const totalFiaosUSD = f.reduce((acc, i) => acc + (parseFloat(i.montoUSD) || 0), 0);
        const totalFiaosBs = totalFiaosUSD * t;
        elFiaos.innerText = `${(totalFiaosBs || 0).toLocaleString('es-VE')} Bs`;
    }
    
    // GASTOS: Informativo, no resta de la caja principal
    const elGastos = document.getElementById('total-gastos');
    if(elGastos) elGastos.innerText = `${(totalG || 0).toLocaleString('es-VE')} Bs`;
    
    // Sincronizar el input de la tasa
    const elTasa = document.getElementById('tasa-global');
    if(elTasa) elTasa.value = t;

    // Refrescar Gráfica
    if (typeof Controlador !== 'undefined' && Controlador.renderizarGrafica) {
        Controlador.renderizarGrafica();
    }
},

  renderVentas() {
    const datos = Persistencia.cargar('dom_ventas') || [];
    const lista = document.getElementById('lista-ventas-historial');
    if(!lista) return;

    // Invertimos para mostrar lo más nuevo primero
    const ventasInvertidas = datos.slice().reverse();
    
    if (ventasInvertidas.length <= 6) {
        lista.innerHTML = ventasInvertidas.map(v => this.generarFilaVenta(v)).join('');
    } else {
        const recientes = ventasInvertidas.slice(0, 3);
        const antiguas = ventasInvertidas.slice(3);
        const grupos = {};

        // --- TU LÓGICA DE AGRUPAMIENTO POR HORA ---
        antiguas.forEach(v => {
            const horaBloque = v.hora ? v.hora.split(':')[0] + ":00" : "Otras";
            if (!grupos[horaBloque]) grupos[horaBloque] = [];
            grupos[horaBloque].push(v);
        });

        const htmlAntiguas = Object.keys(grupos).map(hora => `
            <div class="bloque-hora-container">
                <div class="bloque-hora-titulo">🕒 Bloque ${hora}</div>
                ${grupos[hora].map(v => this.generarFilaVenta(v)).join('')}
            </div>
        `).join('');

        // --- ESTRUCTURA DE LA LISTA CON DETALLES ---
        lista.innerHTML = `
            ${recientes.map(v => this.generarFilaVenta(v)).join('')}
            <details class="glass detalles-historial">
                <summary class="summary-historial">
                    ➕ Ver ${antiguas.length} anteriores (por horas)
                </summary>
                <div class="detalles-content">
                    ${htmlAntiguas}
                </div>
            </details>
        `;
    }
},

generarFilaVenta(v) {
    let btnLiq = "";
    if (v.esServicio && !v.pagado) {
        btnLiq = `<button class="btn-liquidar" onclick="Controlador.liquidarServicioManual(${v.id})">💸 LIQUIDAR</button>`;
    } else if (v.esServicio && v.pagado) {
        btnLiq = `<span class="tag-pagado">✔ PAGADO</span>`;
    }

    // 🛡️ INDICADOR DE MODO LIBRE:
    // Si la venta NO validó inventario, mostramos el icono de candado abierto
    const badgeModo = (v.inventarioValidado === false && !v.esServicio) 
        ? `<span title="Venta en Modo Libre (No afectó stock)" style="filter: grayscale(1); margin-left:5px;">🔓</span>` 
        : "";

    const cantidadStr = v.cantidadVenta > 1 ? `<span class="cantidad-badge">x${v.cantidadVenta}</span>` : "";
    const montoUSD = v.montoUSD ? `<span class="monto-usd-venta">$ ${Number(v.montoUSD).toFixed(2)}</span>` : "";

    // 🚀 BOTÓN DE ANULACIÓN
    const btnAnular = `
        <button class="btn-mini btn-danger" 
            onclick="Ventas.anularVenta('${v.id}')" 
            title="Anular venta y devolver stock"
            style="width: 35px; height: 35px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; border-radius: 8px;">
            🔄
        </button>`;

    // Estilo condicional: Si es modo libre, el borde izquierdo es naranja
    const colorBorde = (v.inventarioValidado === false && !v.esServicio) ? '#ff9800' : 'var(--primary)';

    return `
        <div class="item-venta glass" style="border-left: 4px solid ${colorBorde}; margin-bottom: 10px;">
            <div class="venta-info">
                <div style="display:flex; align-items:center;">
                    <strong>${v.producto}</strong> ${badgeModo}
                </div>
                ${cantidadStr} ${btnLiq}
                <small class="venta-fecha">🕒 ${v.fecha} - ${v.hora || ''}</small>
                <small class="venta-metodo">${v.metodo} ${v.cliente ? '• ' + v.cliente : ''}</small>
            </div>
            
            <div class="venta-montos" style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                <span class="monto-bs-venta">${Number(v.montoBs).toLocaleString('es-VE')} Bs</span>
                ${montoUSD}
                <div style="margin-top: 5px;">
                    ${btnAnular}
                </div>
            </div>
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

    // 1. Limpieza rápida si no hay datos
    if (datos.length === 0) {
        lista.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:0.9em; padding:20px;">No hay gastos registrados hoy</p>';
        return;
    }

    // 2. Invertimos para mostrar lo más nuevo arriba
    const gastosInvertidos = datos.slice().reverse();
    let htmlFinal = '';

    if (gastosInvertidos.length <= 6) {
        // Vista simple para pocos gastos
        htmlFinal = gastosInvertidos.map(g => this.generarFilaGasto(g)).join('');
    } else {
        // Vista inteligente con agrupamiento para muchos gastos
        const recientes = gastosInvertidos.slice(0, 3);
        const antiguas = gastosInvertidos.slice(3);
        const grupos = {};

        // --- LÓGICA DE AGRUPAMIENTO ---
        antiguas.forEach(g => {
            // Blindaje: Si no hay hora, evitamos que el split de error
            const horaLimpia = g.hora || "00:00 AM";
            const horaBloque = horaLimpia.split(':')[0] + ":00";
            
            if (!grupos[horaBloque]) grupos[horaBloque] = [];
            grupos[horaBloque].push(g);
        });

        // Construcción del HTML de los bloques antiguos
        const htmlAntiguos = Object.keys(grupos).map(hora => `
            <div style="border-left: 2px solid #ff5252; margin: 12px 0; padding-left: 12px;">
                <div style="font-size: 11px; font-weight: bold; color: #ff5252; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">🕒 Bloque ${hora}</div>
                ${grupos[hora].map(g => this.generarFilaGasto(g)).join('')}
            </div>
        `).join('');

        // Unión de Recientes + Acordeón de Antiguos
        htmlFinal = `
            ${recientes.map(g => this.generarFilaGasto(g)).join('')}
            
            <details class="glass" style="margin-top: 15px; border: 1px solid rgba(255, 82, 82, 0.3); border-radius: 10px; overflow: hidden;">
                <summary style="padding: 12px; cursor: pointer; text-align: center; font-weight: bold; color: #ff5252; list-style: none; background: rgba(255, 82, 82, 0.05);">
                    ➕ Ver anteriores (${antiguas.length})
                </summary>
                <div style="max-height: 350px; overflow-y: auto; padding: 10px; background: rgba(0,0,0,0.1);">
                    ${htmlAntiguos}
                </div>
            </details>
        `;
    }

    // Inyección única al DOM (Máximo rendimiento)
    lista.innerHTML = htmlFinal;
},

generarFilaGasto(g) {
    return `
        <div class="item-lista glass" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid #ff5252; padding: 10px;">
            <div style="flex-grow: 1;">
                <strong style="font-size: 0.95em;">${g.descripcion}</strong><br>
                <small style="opacity:0.7; font-size: 0.8em;">🕒 ${g.fecha} ${g.hora ? '• ' + g.hora : ''}</small>
            </div>
            <div style="text-align: right; margin-left: 10px;">
                <span style="color:#ff5252; font-weight:bold; font-size: 1em;">
                    -${Number(g.montoBs).toLocaleString('es-VE')} Bs
                </span>
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

    const mensaje = `Hola ${c.cliente}, te escribo de DOMINUS BUSINESS. Tienes una deuda total de $${montoUSDDisplay} (${montoBsDisplay} Bs). ¡Esperamos tu pago!`;
    const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    return `
        <div class="card-fiao glass border-fiao">
            <div class="fiao-header">
                <div class="fiao-info">
                    <strong>👤 ${c.cliente}</strong>
                    <span class="monto-usd">$${montoUSDDisplay}</span>
                </div>
                <div class="fiao-actions">
                    <span class="monto-bs">${montoBsDisplay} Bs</span>
                    <div class="action-buttons">
                        <a href="${urlWhatsapp}" target="_blank" class="btn-whatsapp btn-redondo-wa" title="Cobrar por WhatsApp">📲</a>
                        <button class="btn-abonar" onclick="Ventas.abrirProcesoAbono('${c.cliente}')">Abonar</button>
                    </div>
                </div>
            </div>
            
            <details class="fiao-details">
                <summary>Ver detalles de deuda</summary>
                <div class="details-content">
                    ${c.deudas.map(d => `
                        <div class="detail-item">
                            <div class="detail-text">
                                <span class="detail-product">${d.producto}</span>
                                <small class="detail-date">🕒 ${d.fecha || 'Sin fecha'}</small>
                            </div>
                            <div class="detail-price-actions">
                                <span class="detail-price">$${Number(d.montoUSD).toFixed(2)}</span>
                                <div class="detail-btns">
                                    <button class="btn-edit-small" onclick="Ventas.editarDeudaEspecifica(${d.id})" title="Editar monto">✏️</button>
                                    <button class="btn-delete-small" onclick="Ventas.eliminarRegistroEspecifico(${d.id})" title="Eliminar registro">🗑️</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    <button class="btn-eliminar-todo" onclick="Controlador.eliminarDeuda('${c.cliente}')">⚠️ Borrar historial del cliente</button>
                </div>
            </details>
        </div>`;
},

renderInventario() {
    if (typeof Inventario === 'undefined' || !Inventario.productos) return;
    const lista = document.getElementById('lista-inventario');
    if (!lista) return;

    const generarHTMLItem = (p) => {
        const unidad = p.unidad || 'Und';
        const stockActual = parseFloat(p.cantidad) || 0;
        const minConfigurado = parseFloat(p.stockMinimo) || (p.unidad === 'Kg' || p.unidad === 'Lts' ? 1.5 : 3);
        
        const estaVacio = stockActual <= 0;
        const esBajo = stockActual <= minConfigurado;
        
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
            htmlTallas = `
                <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
                    ${Object.entries(p.tallas)
                        .filter(([t, c]) => c > 0)
                        .map(([t, c]) => `
                            <span style="font-size: 10px; background: rgba(255,255,255,0.08); color: #ddd; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); font-family: monospace;">
                                ${t}:<b>${c}</b>
                            </span>
                        `).join('')}
                </div>`;
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
                            Disponible: ${stockActual} ${unidad}
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

        const prodsOrdenados = [...prods].sort((a, b) => {
            const minA = a.stockMinimo || (a.unidad === 'Kg' ? 1.5 : 3);
            const minB = b.stockMinimo || (b.unidad === 'Kg' ? 1.5 : 3);
            const alertaA = a.cantidad <= minA ? 1 : 0;
            const alertaB = b.cantidad <= minB ? 1 : 0;
            return alertaB - alertaA;
        });

        lista.innerHTML = prodsOrdenados.map(p => generarHTMLItem(p)).join('');
    };

    dibujarItems(Inventario.productos);

    const buscador = document.getElementById('busqueda-real-inv');
    if(buscador) {
        buscador.oninput = (e) => {
            const t = e.target.value.toLowerCase().trim();
            const filtrados = Inventario.productos.filter(prod => 
                prod.nombre.toLowerCase().includes(t) || (prod.codigo && prod.codigo.includes(t))
            );
            dibujarItems(filtrados);
        };
    }
},

filtrarTallasPorBloque(rango) { //aqui filtra las tallas para que no sea una lista larga//
    const filas = document.querySelectorAll('.fila-talla');
    const permitidas = rangosTallas[rango] || [];

    filas.forEach(fila => {
        const nroTalla = parseInt(fila.getAttribute('data-talla'));
        
        if (isNaN(nroTalla)) {
            fila.style.display = 'flex';
            return;
        }

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

    // 🛡️ Blindaje: Si el nombre está vacío, limpiamos y salimos
    if (!nombreProducto || nombreProducto.trim() === "") {
        contenedor.classList.add('hidden');
        return;
    }

    // Buscamos el producto en el inventario global
    const p = Inventario.productos.find(prod => 
        prod.nombre.toLowerCase() === nombreProducto.trim().toLowerCase()
    );

    if (p) {
        // 1. AUTO-LLENADO DE PRECIO
        // Permitimos que el vendedor lo cambie si es necesario, 
        // pero el sistema le da la base del inventario.
        if (inputMonto && p.precio) {
            inputMonto.value = parseFloat(p.precio) || 0;
        }

        // 2. LÓGICA DE VARIANTES (Solo las que tengan STOCK > 0)
        if (p.tallas && Object.keys(p.tallas).length > 0) {
            let opcionesHTML = '<option value="">Elegir Talla/Peso...</option>';
            let hayVariantesConStock = false;

            Object.entries(p.tallas).forEach(([talla, cant]) => {
                const stock = parseFloat(cant) || 0;
                
                // 🛡️ FILTRO ESTRICTO: Si no hay stock, la opción NI SE CREA
                if (stock > 0) {
                    hayVariantesConStock = true;
                    let prefijo = (p.unidad === 'kg') ? "Peso: " : "Talla: ";
                    if (talla === 'Manual' || talla === 'Única') prefijo = "";

                    const unidadMedida = p.unidad || 'und';
                    opcionesHTML += `<option value="${talla}">${prefijo}${talla} (${stock} ${unidadMedida} disp.)</option>`;
                }
            });

            // Solo mostramos el contenedor si hay al menos una opción válida
            if (hayVariantesConStock) {
                select.innerHTML = opcionesHTML;
                contenedor.classList.remove('hidden');
            } else {
                // Si el producto existe pero todas sus tallas están en 0
                contenedor.classList.add('hidden');
                select.innerHTML = '';
                // Opcional: Notificar que no hay existencia
                // notificar("Producto sin stock disponible", "error");
            }
        } else {
            contenedor.classList.add('hidden');
        }
    } else {
        // Si es un producto nuevo o manual, ocultamos variantes
        contenedor.classList.add('hidden');
        select.innerHTML = '';
    }
}

};

function notificarProximamente() {
    // 1. Sonido de aviso (Si tienes el ID 'sonido-alerta')
    if (typeof AudioDOMINUS !== 'undefined') {
        AudioDOMINUS.reproducir('sonido-alerta');
    }

    // 2. Mensajes de intriga
    notificar("🛠️ ¡Algo grande se está cocinando!", "info");
    
    setTimeout(() => {
        notificar("Esta función se desbloqueará en una futura actualización. ¡No te desesperes!", "alerta");
    }, 1500);
    
    console.log("💡 El usuario intentó entrar a Devoluciones. ¡Sigue generando curiosidad!");
}