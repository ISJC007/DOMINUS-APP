let miGrafica = null; 
let tallasTemporales = {};

const rangosTallas = { //aqui se definen que numeros pertenecen a cada categoria-se conecta con filtrar tallas
    'ninos-peq': [18,19,20,21,22,23,24,25],
    'ninos-gra': [26,27,28,29,30,31,32],
    'juvenil': [33,34,35,36,37,38,39],
    'caballero': [40,41,42,43,44,45]
};

const Interfaz = { //muestra todo en pantalla lo que se clickea//

 modalRecargaRapida: function(nombreProducto) {
    const p = Inventario.productos.find(prod => prod.nombre === nombreProducto);
    if (!p) return notificar("Producto no encontrado", "error");

    // 1. Pedir cantidad (Modal personalizado)
    this.mostrarModalEntrada(
        "Recarga Rápida",
        `Producto: <b>${p.nombre}</b><br>Stock actual: ${p.cantidad} ${p.unidad}`,
        "Cantidad a sumar",
        (cantidadStr) => {
            const cantidad = parseFloat(cantidadStr);
            if (isNaN(cantidad) || cantidad <= 0) {
                notificar("Cantidad inválida", "error");
                return;
            }

            // 2. Si tiene tallas, usar modal de tallas en vez de prompt
            if (p.tallas && Object.keys(p.tallas).length > 0) {
                const tallasDisponibles = Object.keys(p.tallas);
                
                // 🚀 USANDO EL NUEVO MODAL DE TALLAS
                this.mostrarModalTallas(
                    "Seleccionar Talla",
                    `¿A qué TALLA sumar ${cantidad}?`,
                    tallasDisponibles,
                    (tallaElegida) => {
                        // 3. Confirmar la acción final
                        this.ejecutarConfirmacionRecarga(p, cantidad, tallaElegida);
                    }
                );
            } else {
                // Si no tiene tallas, confirmar directamente
                this.ejecutarConfirmacionRecarga(p, cantidad, null);
            }
        }
    );
},

// 💡 FUNCIÓN AUXILIAR PARA NO REPETIR CÓDIGO
ejecutarConfirmacionRecarga: function(p, cantidad, tallaElegida) {
    Interfaz.confirmarAccion(
        "Confirmar Recarga",
        `¿Sumar ${cantidad} ${p.unidad} a "${p.nombre}"${tallaElegida ? ' en talla ' + tallaElegida : ''}?`,
        () => {
            Inventario.recargarRapido(p.nombre, cantidad, tallaElegida);
        },
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
    const btnAceptarId = `btn-aceptar-${uniqueId}`;
    const btnCancelarId = `btn-cancelar-${uniqueId}`;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; z-index:99999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:320px; width:100%; text-align:center; border:1px solid #4caf50; padding:25px; border-radius:20px;">
            <h3 style="color:#ffffff; margin-bottom:10px;">${titulo}</h3>
            <p style="color:white; opacity:0.9; margin-bottom:15px; font-size:0.9em;">${mensaje}</p>
            <input type="number" id="${inputId}" placeholder="${placeholder}" 
                style="width:100%; padding:10px; border-radius:10px; border:1px solid #4caf50; background:rgba(0,0,0,0.3); color:white; margin-bottom:20px; text-align:center; font-size:1.2em;">
            <div style="display:flex; gap:10px;">
                <button id="${btnCancelarId}" class="btn-main" style="background:#444; flex:1">Cancelar</button>
                <button id="${btnAceptarId}" class="btn-main" style="background:#4caf50; flex:1">Aceptar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Enfocar el input automáticamente
    document.getElementById(inputId).focus();

    document.getElementById(btnCancelarId).onclick = () => overlay.remove();
    document.getElementById(btnAceptarId).onclick = () => {
        const valor = document.getElementById(inputId).value;
        onAceptar(valor);
        overlay.remove();
    };
},

// 🔥 FUNCIÓN MODIFICADA
confirmarAccion(titulo, mensaje, onConfirmar, textoConfirmar = "Sí, proceder", textoCancelar = "No, cancelar", esPeligroso = false) {
    // Generar ID único para este modal
    const uniqueId = Date.now();
    const btnAbortarId = `btn-abortar-${uniqueId}`;
    const btnProcederId = `btn-proceder-${uniqueId}`;
    
    // 🔥 Definir colores y icono según la acción
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

    document.getElementById(btnAbortarId).onclick = () => overlay.remove();
    document.getElementById(btnProcederId).onclick = () => {
        onConfirmar();
        overlay.remove();
    };
},

    cambiarSeccion: function(id) {
        console.log("Cambiando a:", id);
    }, 

toggleAjustes: function() { //abre y cierra el panel de ajustes//

    const panel = document.getElementById('panelAjustes');
    if (panel) {
        panel.classList.toggle('active');
    }
    }, 

    show(view) { //esta hace los cambios visibles para cada seccion de la app-.app-section
        document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));
        const target = document.getElementById(`view-${view}`);
        if(target) target.classList.remove('hidden');
        
        this.actualizarDashboard();
        
        if(view === 'ventas') {
            this.renderVentas();
            this.cargarSugerencias();
        }
        if(view === 'gastos') this.renderGastos();
        if(view === 'fiaos-list') this.renderFiaos();
        if(view === 'inventario') this.renderInventario();
    },

    cargarSugerencias() {
        const listaSugerencias = document.getElementById('sugerencias-ventas');
        if (!listaSugerencias) return;
        const productos = Ventas.getSugerencias();
        listaSugerencias.innerHTML = productos.map(p => `<option value="${p}">`).join('');
    },

    toggleClienteField(metodo) { //Si selecciono "Fiao", esta función muestra el campo para poner el nombre del cliente//
    const wrapper = document.getElementById('wrapper-cliente'); 
    const input = document.getElementById('v-cliente');

    if (wrapper) {
        if (metodo === 'Fiao') {
            wrapper.classList.remove('hidden');
            if (input) input.focus(); 
        } else {
            wrapper.classList.add('hidden');
            if (input) input.value = ''; 
        }
    }
},

 actualizarDashboard() {
    const v = Persistencia.cargar('dom_ventas') || [];
    const g = Persistencia.cargar('dom_gastos') || [];
    const f = Persistencia.cargar('dom_fiaos') || [];
    const t = Conversor.tasaActual > 0 ? Conversor.tasaActual : 1;
    const hoy = new Date().toLocaleDateString('es-VE');

    const vHoy = v.filter(vent => vent.fecha === hoy);
    const gHoy = g.filter(gas => gas.fecha === hoy);

    // Sumamos ventas del día
    const totalV = vHoy.reduce((acc, i) => acc + (Number(i.montoBs) || 0), 0);
    // Sumamos gastos del día
    const totalG = gHoy.reduce((acc, i) => acc + (Number(i.montoBs) || 0), 0);

    // LA VERDAD: El neto ya no resta el totalG
    const netoBs = totalV; 
    const netoConvertido = netoBs / t;

    // Actualizamos los textos en el HTML (ID por ID)
    if(document.getElementById('total-caja')) 
        document.getElementById('total-caja').innerText = `${netoBs.toLocaleString('es-VE')} Bs`;
    
    if(document.getElementById('total-usd')) 
        document.getElementById('total-usd').innerText = `$ ${netoConvertido.toFixed(2)}`;
    
    // FIAOS: RECALCULADO INTELIGENTEMENTE (Basado en USD * Tasa Actual)
    if(document.getElementById('total-fiaos')) {
        // 1. Sumamos la deuda total en USD
        const totalFiaosUSD = f.reduce((acc, i) => acc + (Number(i.montoUSD) || 0), 0);
        // 2. Convertimos a Bs con la tasa actual (t)
        const totalFiaosBs = totalFiaosUSD * t;

        document.getElementById('total-fiaos').innerText = `${totalFiaosBs.toLocaleString('es-VE')} Bs`;
    }
    
    // GASTOS: Se muestran aquí, pero no afectan al neto de arriba
    if(document.getElementById('total-gastos')) 
        document.getElementById('total-gastos').innerText = `${totalG.toLocaleString('es-VE')} Bs`;
    
    if(document.getElementById('tasa-global')) 
        document.getElementById('tasa-global').value = t;

    // Actualizamos la gráfica al final
    if (typeof Controlador !== 'undefined') 
        Controlador.renderizarGrafica();
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

    const cantidadStr = v.cantidadVenta > 1 ? `<span class="cantidad-badge">x${v.cantidadVenta}</span>` : "";
    const montoUSD = v.montoUSD ? `<span class="monto-usd-venta">$ ${Number(v.montoUSD).toFixed(2)}</span>` : "";

    // 🚀 AÑADIR BOTÓN DE ANULACIÓN AQUÍ
   const btnAnular = `<button class="btn-mini btn-danger" 
        onclick="Ventas.anularVenta('${v.id}')" 
        title="Anular venta y devolver stock"
        style="width: 35px; height: 35px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 16px;">
        🔄
    </button>`;

    return `
        <div class="item-venta glass">
            <div class="venta-info">
                <strong>${v.producto}</strong> ${cantidadStr} ${btnLiq}
                <small class="venta-fecha">🕒 ${v.fecha} - ${v.hora || ''}</small>
                <small class="venta-metodo">${v.metodo} ${v.cliente ? '• ' + v.cliente : ''}</small>
            </div>
            
            <div class="venta-montos" style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                <span class="monto-bs-venta">${Number(v.montoBs).toLocaleString('es-VE')} Bs</span>
                ${montoUSD}
                ${btnAnular}
            </div>
        </div>`;
},

 alternarModoPunto() { //aqui se activa el modo punto de mi papa//
    const btnPunto = document.getElementById('btn-modo-punto');
    const wrapper = document.getElementById('wrapper-comision');
    const btnVender = document.querySelector('.btn-main'); //botón de registrar
    
    const activo = btnPunto.classList.toggle('activo-punto');
    
    if (activo) {
        wrapper.classList.remove('hidden');
        btnPunto.style.background = "var(--primary)";
        btnPunto.style.color = "black";
        btnPunto.innerText = "🏦 MODO SERVICIO ACTIVO";
        if(btnVender) btnVender.innerText = "Registrar Servicio de Punto";
    } else {
        wrapper.classList.add('hidden');
        btnPunto.style.background = "transparent";
        btnPunto.style.color = "var(--primary)";
        btnPunto.innerText = "🏦 ¿Es Servicio de Punto?";
        if(btnVender) btnVender.innerText = "Registrar Venta";
        document.getElementById('v-comision').value = 0;
    }
},

    renderGastos() {
        const datos = Persistencia.cargar('dom_gastos') || [];
        const lista = document.getElementById('lista-gastos-historial');
        if(!lista) return;
        const gastosInvertidos = datos.slice().reverse();
        if (gastosInvertidos.length <= 6) {
            lista.innerHTML = gastosInvertidos.map(g => this.generarFilaGasto(g)).join('');
        } else {
            const recientes = gastosInvertidos.slice(0, 3);
            const antiguas = gastosInvertidos.slice(3);
            const grupos = {};
            antiguas.forEach(g => {
                const horaBloque = g.hora ? g.hora.split(':')[0] + ":00" : "Otras";
                if (!grupos[horaBloque]) grupos[horaBloque] = [];
                grupos[horaBloque].push(g);
            });
            const htmlAntiguos = Object.keys(grupos).map(hora => `
                <div style="border-left: 2px solid #ff5252; margin: 10px 0; padding-left: 10px;">
                    <div style="font-size: 11px; font-weight: bold; color: #ff5252; margin-bottom: 5px;">🕒 Bloque ${hora}</div>
                    ${grupos[hora].map(g => this.generarFilaGasto(g)).join('')}
                </div>
            `).join('');
            lista.innerHTML = `${recientes.map(g => this.generarFilaGasto(g)).join('')}
                <details class="glass" style="margin-top: 10px; border: 1px solid #ff5252; border-radius: 8px;">
                    <summary style="padding: 12px; cursor: pointer; text-align: center; font-weight: bold; color: #ff5252;">➕ Ver anteriores</summary>
                    <div style="max-height: 400px; overflow-y: auto; padding: 5px;">${htmlAntiguos}</div>
                </details>`;
        }
    },

    generarFilaGasto(g) {
        return `
            <div class="item-lista glass" style="margin-bottom: 8px;">
                <span>
                    <strong>${g.descripcion}</strong><br>
                    <small style="opacity:0.8">🕒 ${g.fecha} - ${g.hora || ''}</small>
                </span>
                <span style="color:#ff5252; font-weight:bold">-${Number(g.montoBs).toLocaleString('es-VE')} Bs</span>
            </div>`;
    },
renderFiaos() {
    // 1. Cargamos datos frescos de la persistencia
    const datos = Persistencia.cargar('dom_fiaos') || [];
    const lista = document.getElementById('lista-fiaos');
    if(!lista) return;

    if(datos.length === 0) {
        lista.innerHTML = '<p class="sin-creditos">🎉 ¡Todos los clientes están al día! 🎉</p>';
        return;
    }

    // 2. Lógica para agrupar por cliente
    const agrupado = {};

    datos.forEach(f => {
        const cliente = f.cliente || "Cliente";
        if (!agrupado[cliente]) {
            agrupado[cliente] = {
                cliente: cliente,
                totalUSD: 0,
                deudas: [] 
            };
        }
        
        // Sumamos en dólares asegurando que sea un número
        agrupado[cliente].totalUSD += parseFloat(f.montoUSD || 0);
        
        // Guardamos la deuda completa para los detalles
        agrupado[cliente].deudas.push(f);
    });

    // 3. Renderizar grupos
    const listaAgrupada = Object.values(agrupado);
    
    lista.className = 'lista-fiaos-container';
    
    // IMPORTANTE: Asegúrate de que 'this' se refiere al objeto Interfaz
    lista.innerHTML = listaAgrupada.map(c => this.generarFilaFiaoAgrupada(c)).join('');
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
                        <a href="${urlWhatsapp}" target="_blank" class="btn-whatsapp" title="Cobrar por WhatsApp">📲</a>
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
        
        let htmlTallas = "";
        if (p.tallas) {
            htmlTallas = `
                <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
                    ${Object.entries(p.tallas)
                        .filter(([t, c]) => c > 0)
                        .map(([t, c]) => `
                            <span style="font-size: 10px; background: rgba(62, 187, 66, 0.2); color: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(76, 175, 80, 0.3); font-family: monospace;">
                                T${t}:<b>${c}</b>
                            </span>
                        `).join('')}
                </div>`;
        }

        return `
            <div class="item-lista glass" style="margin-bottom:8px; display: flex; justify-content: space-between; align-items: center; padding: 12px; border-radius: 10px;">
                <span style="flex: 1;">
                    <strong style="color: white; text-transform: uppercase; letter-spacing: 0.5px;">${p.nombre}</strong><br>
                    <small style="color: var(--primary); font-weight: bold;">Stock Total: ${p.cantidad} ${unidad}</small>
                    ${htmlTallas}
                </span>
                
                <div class="acciones-fiao" style="text-align: right; display: flex; align-items: center; gap: 6px;">
                    
                    <button class="btn-mini btn-success" onclick="Interfaz.modalRecargaRapida('${p.nombre}')" style="padding: 8px; border-radius: 6px;" title="Recarga Rápida">➕</button>
                    
                    <button class="btn-mini btn-info" onclick="Controlador.prepararEdicionInventario('${p.nombre}')" style="padding: 8px; border-radius: 6px;" title="Editar Detalles">✏️</button>

                    <div style="display: flex; flex-direction: column; align-items: flex-end;">
                        <input type="number" value="${p.precio}" step="0.01" 
                            onchange="Controlador.editarPrecioRapido('${p.id}', this.value)" 
                            style="width: 70px; background: rgba(0,0,0,0.5); color: #4caf50; border: 1px solid #4caf50; border-radius: 6px; text-align: right; font-weight: bold; padding: 4px;">
                    </div>
                    
                    <button class="btn-mini btn-danger" onclick="Controlador.eliminarInv('${p.id}')" style="padding: 8px; border-radius: 6px;" title="Eliminar">🗑️</button>
                </div>
            </div>`;
    };

    const dibujarItems = (prods) => {
        if (prods.length === 0) {
            lista.innerHTML = `<p style="color: #aaa; text-align: center; padding: 20px;">No se encontraron resultados.</p>`;
            return;
        }
        lista.innerHTML = prods.map(p => generarHTMLItem(p)).join('');
    };

    dibujarItems(Inventario.productos);

    const buscador = document.getElementById('busqueda-real-inv');
    if(buscador) {
        buscador.oninput = (e) => {
            const t = e.target.value.toLowerCase().trim();
            const filtrados = Inventario.productos.filter(prod => 
                prod.nombre.toLowerCase().includes(t)
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

actualizarSelectorTallas(nombreProducto) { //cuando escribo un producto, busca si hay tallas para mostrar en el selector//
    const contenedor = document.getElementById('contenedor-talla');
    const select = document.getElementById('v-talla');
    const inputMonto = document.getElementById('v-monto');
    
    if (!contenedor || !select) return;

    const p = Inventario.productos.find(prod => prod.nombre.toLowerCase() === nombreProducto.trim().toLowerCase());

    if (p) {
        if (inputMonto && p.precio) {
            inputMonto.value = p.precio;
        }

       if (p.tallas && Object.keys(p.tallas).length > 0) {
            contenedor.classList.remove('hidden');
            select.innerHTML = '<option value="">Elegir Talla/Peso...</option>';

            Object.entries(p.tallas).forEach(([talla, cant]) => {
                if (Number(cant) > 0) {
                    let etiqueta = (talla === 'Manual') ? `${p.unidad || 'Cant.'}` : `Talla ${talla}`;
                    select.innerHTML += `<option value="${talla}">${etiqueta} (${cant} disp.)</option>`;
                }
            });

            if (select.options.length <= 1) {
                contenedor.classList.add('hidden');
            }
        } else {
            contenedor.classList.add('hidden');
            select.innerHTML = '';
        }
    } else {
        contenedor.classList.add('hidden');
        select.innerHTML = '';
    }
  },
};

function AbrirGestorTallas() { //Abre el modal para desglosar productos por número-modifica el display del ID #modal-gestor-tallas 
    const contenedor = document.getElementById('contenedor-filas-tallas');
    const unidadPrincipal = document.getElementById('inv-unidad').value;
    if(!contenedor) return;
    
    contenedor.innerHTML = `
        <div id="selector-categoria-tallas" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-bottom:15px;">
            <button onclick="GenerarInputsDinamicos('Tallas')" class="btn-mini" style="background:#333; color:white; padding:10px; border-radius:5px;">👟 Calzado</button>
            <button onclick="GenerarInputsDinamicos('ropa')" class="btn-mini" style="background:#333; color:white; padding:10px; border-radius:5px;">👕 Ropa</button>
            <button onclick="GenerarInputsDinamicos('peso')" class="btn-mini" style="background:#333; color:white; padding:10px; border-radius:5px;">⚖️ Peso</button>
            <button onclick="GenerarInputsDinamicos('liquido')" class="btn-mini" style="background:#333; color:white; padding:10px; border-radius:5px;">💧 Líquidos</button>
            <button onclick="GenerarInputsDinamicos('pacas')" class="btn-mini" style="background:#333; color:white; padding:10px; border-radius:5px;">📦 Pacas</button>
        </div>

        <div id="bloque-filtro-contenedor" style="margin-bottom: 15px; display:none;">
            <select id="inv-bloque-rango" class="glass" 
                    style="width:100%; padding:10px; border:1px solid var(--primary); background:#111; color:white; border-radius:8px;"
                    onchange="Interfaz.filtrarTallasPorBloque(this.value)">
                <option value="todos">-- Mostrar Todas las Tallas --</option>
                <option value="ninos-peq">Niños (18-25)</option>
                <option value="ninos-gra">Niños Grandes (26-32)</option>
                <option value="juvenil">Juvenil/Damas (33-39)</option>
                <option value="caballero">Caballeros (40-45)</option>
            </select>
        </div>

        <div id="lista-tallas-dinamica" style="max-height: 350px; overflow-y: auto; padding: 5px;"></div>
    `;
    
    if(unidadPrincipal === 'Kg') GenerarInputsDinamicos('peso');
    else if(unidadPrincipal === 'Lts') GenerarInputsDinamicos('liquido');
    else if(unidadPrincipal === 'Talla') GenerarInputsDinamicos('calzado');
    else if(unidadPrincipal === 'Paca') GenerarInputsDinamicos('pacas');
    else GenerarInputsDinamicos('calzado');

    document.getElementById('modal-gestor-tallas').style.display = 'flex';
}

function GenerarInputsDinamicos(tipo) {
    const lista = document.getElementById('lista-tallas-dinamica');
    const filtroContenedor = document.getElementById('bloque-filtro-contenedor');
    if(!lista) return;
    lista.innerHTML = '';

    if(filtroContenedor) {
        filtroContenedor.style.display = (tipo === 'calzado') ? 'block' : 'none';
    }

    let configuracion = [];
    if(tipo === 'calzado') {
        for(let i=18; i<=45; i++) configuracion.push(i);
    } else if(tipo === 'ropa') {
        configuracion = ['S', 'M', 'L', 'XL', '2XL', '3XL', 'Única'];
    } else if(tipo === 'peso') {
        configuracion = ['100g', '250g', '500g', '1Kg', 'Manual'];
    } else if(tipo === 'liquido') { 
        configuracion = ['250ml', '500ml', '1L', '2L', 'Manual']; 
    } else if(tipo === 'pacas') {
        configuracion = ['Paca Small', 'Paca Grande', 'Manual'];
    }

    configuracion.forEach(talla => {
        const div = document.createElement('div');
        div.className = 'fila-talla'; 
        div.setAttribute('data-talla', talla); 
        
        const inputId = `input-dinamico-${talla.toString().replace(/\s+/g, '-')}`;

        if (talla === 'Manual') {
            const unidadPrincipal = document.getElementById('inv-unidad').value;
            const sufijoSug = (unidadPrincipal === 'Kg') ? 'g' : (unidadPrincipal === 'Lts' ? 'ml' : '');

            div.innerHTML = `
                <div style="width:100%; background:rgba(255,215,0,0.05); padding:12px; border-radius:10px; border:1px dashed var(--primary); margin-top:10px;">
                    <label style="color:var(--primary); font-size:0.75em; display:block; margin-bottom:5px;">VALOR PERSONALIZADO (${sufijoSug}):</label>
                    <div style="display:flex; gap:8px;">
                        <input type="number" id="manual-nombre-din" placeholder="Ej: 750" class="glass" 
                               style="flex:1; background:#111; color:white; border:1px solid #444; padding:8px; border-radius:5px;">
                        
                        <input type="number" id="${inputId}" placeholder="Cant" class="glass" 
                               style="width:70px; background:#222; color:var(--primary); border:1px solid #444; text-align:center; border-radius:5px;"
                               oninput="tallasTemporales['Manual'] = parseFloat(this.value) || 0">
                    </div>
                </div>`;
        } else {
            div.innerHTML = `
                <label for="${inputId}" style="color:white; font-weight:600;">${isNaN(talla) ? talla : 'Talla ' + talla}</label>
                <input type="number" 
                        id="${inputId}"
                        name="${inputId}"
                        value="${tallasTemporales[talla] || 0}" 
                        oninput="tallasTemporales['${talla}'] = parseFloat(this.value) || 0"
                        min="0"
                        class="glass"
                        style="width: 75px; background: #222; color: var(--primary); border: 1px solid #444; text-align: center; border-radius: 5px; padding:5px;">
            `;
        }
        lista.appendChild(div);
    });
}

function actualizarStockEnVenta(nombreProducto) {
    const p = Inventario.productos.find(prod => prod.nombre === nombreProducto);
    const selectTalla = document.getElementById('v-talla');
    const infoStock = document.getElementById('info-stock-talla');
    
    if (p && p.tallas) {
        selectTalla.onchange = () => {
            const talla = selectTalla.value;
            const cantidad = p.tallas[talla] || 0;
            const unidad = p.tallas['Manual'] !== undefined ? p.unidad : 'Und';
            
        };
    }
}

function CerrarGestorTallas() { //confirma las tallas para cerrar el modal-//Cierra el modal para desglosar productos por número-modifica el display del ID #modal-gestor-tallas 
    const nombreManualInput = document.getElementById('manual-nombre-din');
    const valorManual = nombreManualInput ? nombreManualInput.value : '';
    
    if (valorManual && tallasTemporales['Manual'] > 0) {
        const unidad = document.getElementById('inv-unidad').value;
        const sufijo = (unidad === 'Kg') ? 'g' : (unidad === 'Lts' ? 'ml' : '');
        
        tallasTemporales[valorManual + sufijo] = tallasTemporales['Manual'];
        delete tallasTemporales['Manual']; 
    }

    Object.keys(tallasTemporales).forEach(key => {
        if (tallasTemporales[key] === 0) delete tallasTemporales[key];
    });

    const total = Object.values(tallasTemporales).reduce((a, b) => a + b, 0);
    const inputCant = document.getElementById('inv-cant');
    if(inputCant) inputCant.value = total;

    document.getElementById('modal-gestor-tallas').style.display = 'none';
    if(total > 0) notificar(`✅ ${total} unidades desglosadas`);
}

const notificar = (msj, tipo = 'exito') => {
    const viejo = document.querySelector('.toast-exito');
    if(viejo) viejo.remove();

    const toast = document.createElement('div');
    toast.className = `toast-exito toast-${tipo}`;
    
    const iconos = {
        exito: '✨',
        gasto: '📉',
        stock: '📦',
        fiao: '🤝',
        error: '⚠️'
    };

    toast.innerHTML = `<span>${iconos[tipo] || '✅'}</span> ${msj}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2500);
};

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


const Controlador = {
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
        
    // 1. Registramos la venta en el historial principal
    Ventas.registrarVenta(p, m, mon, met, cli, comFinal, esServicio, cantidad, tallaElegida);
    
    // 👇 2. EL CEREBRO ENTRA EN ACCIÓN: DOMINUS aprende lo que acabas de vender
    if (typeof Inventario !== 'undefined' && typeof Inventario.aprenderDeVenta === 'function') {
        Inventario.aprenderDeVenta(p, m);
    }
    // 👆 ------------------------------------------------------------------ 👆
    
    // 3. Actualizamos la pantalla para reflejar los cambios
    Interfaz.actualizarDashboard();
    Interfaz.renderInventario(); 
    Interfaz.actualizarSelectorTallas(p); 

    notificar("Venta registrada con éxito", "exito");

    // 4. Limpiamos el formulario para el siguiente cliente
    document.getElementById('v-producto').value = '';
    document.getElementById('v-monto').value = '';
    document.getElementById('v-cliente').value = '';
    if(cantInput) cantInput.value = '1';
    if(inputCom) inputCom.value = '';
    
    if (esServicio) Interfaz.alternarModoPunto();
    
    if (typeof Interfaz.toggleClienteField === 'function') {
        Interfaz.toggleClienteField(null);
    }

    this.limpiarSeleccionVenta();
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
            // --- ESTO SE EJECUTA SI EL USUARIO DICE "SÍ" ---
            Ventas.registrarGasto(d, m, mon);
            
            // Limpiar formulario
            document.getElementById('g-desc').value = '';
            document.getElementById('g-monto').value = '';
            
            // Actualizar vista
            Interfaz.actualizarDashboard();
            notificar("💸 Gasto registrado correctamente");
        },
        "Sí, registrar", // 👈 Texto personalizado para confirmar
        "Cancelar",       // 👈 Texto personalizado para cancelar
        false             // 👈 No es peligroso (color verde por defecto)
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
    // 🚀 INTEGRACIÓN: Actualizado con parámetros personalizados y color rojo
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
        "Sí, eliminar", // 👈 Texto personalizado para confirmar
        "Cancelar",     // 👈 Texto personalizado para cancelar
        true            // 👈 ¡Es peligroso! (color rojo)
    );
},

eliminarInv(id) {
    // 🚀 INTEGRACIÓN: Actualizado con parámetros personalizados y color rojo
    Interfaz.confirmarAccion(
        "¿Borrar Producto?",
        "Se eliminará permanentemente del stock.",
        () => {
            // --- ESTO SE EJECUTA SI EL USUARIO DICE "SÍ" ---
            Inventario.eliminar(id);
            Interfaz.renderInventario();
            notificar("Producto eliminado", "error");
        },
        "Sí, eliminar", // 👈 Texto personalizado para confirmar
        "Cancelar",     // 👈 Texto personalizado para cancelar
        true            // 👈 ¡Es peligroso! (color rojo)
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
                        setTimeout(() => { this.preguntarLimpieza(); }, 1500);
                    }
                },
                { 
                    texto: "📄 Generar PDF", 
                    clase: "btn-pdf",
                    accion: () => { 
                        this.generarPDF(); 
                    } 
                }
            ]
        });
    },

    preguntarLimpieza: function() {
        modalEleccion.abrir({
            titulo: "🗑️ ¿Borrar Datos?",
            mensaje: "Se limpiarán ventas y gastos. El inventario NO se borra.",
            botones: [
                { 
                    texto: "SÍ, REINICIAR TODO", 
                    clase: "btn-pdf", 
                    accion: () => { 
                        Ventas.limpiarJornada(); 
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

document.addEventListener('DOMContentLoaded', () => { 
    // MODO OSCURO (Tu lógica intacta)
    const isDark = Persistencia.cargar('dom_dark_mode');
    if (isDark) {
        document.body.classList.add('dark-mode');
        const checkDark = document.getElementById('checkDarkMode');
        if (checkDark) checkDark.checked = true;
    }

    // --- AUTO-LLENADO DE PRECIOS ---
    const inputProducto = document.getElementById('v-producto');
    if (inputProducto) {
        // Le conectamos el datalist para que salgan las sugerencias visuales
        inputProducto.setAttribute('list', 'sugerencias-ventas');
        
        // Escuchamos cada vez que escribes o seleccionas una sugerencia
        inputProducto.addEventListener('input', (e) => {
            const nombreEscrito = e.target.value;
            const precioRecordado = Inventario.buscarPrecioMemoria(nombreEscrito);
            
            // Si la memoria tiene un precio para ese producto, ¡pónselo al input de monto!
            if (precioRecordado !== null) {
                const inputMonto = document.getElementById('v-monto');
                if (inputMonto) {
                    inputMonto.value = precioRecordado;
                    
                    // Pequeña animación visual para que sepas que se auto-llenó
                    inputMonto.style.backgroundColor = 'rgba(76, 175, 80, 0.2)'; 
                    setTimeout(() => inputMonto.style.backgroundColor = '', 500);
                }
            }
        });
    }
    // Asegurarnos de que el datalist se cargue al iniciar
    if(typeof Inventario !== 'undefined' && typeof Inventario.actualizarDatalist === 'function') {
        Inventario.actualizarDatalist();
    }
    // --- FIN AUTO-LLENADO ---

    // CONFIGURACIÓN INVENTARIO (Tu lógica intacta)
    const configGuardada = localStorage.getItem('dom_config');
    let invActivo = (configGuardada === null) ? true : JSON.parse(configGuardada).invActivo;
    if (configGuardada === null) {
        localStorage.setItem('dom_config', JSON.stringify({ invActivo: true }));
    }
    if(typeof Inventario !== 'undefined') Inventario.activo = invActivo;
    const checkInv = document.getElementById('check-inv-ajustes') || document.getElementById('check-inv');
    if (checkInv) checkInv.checked = invActivo;

    try {
        console.log("🚀 Dominus iniciando...");

        (async () => {
        await Ventas.init();
    })();
        // ELIMINAMOS EL SETTIMEOUT DE AQUÍ PARA QUE NO SE CRUCE CON VENTAS
    } catch (error) {
        console.error("❌ Error crítico en el inicio:", error);
        const splash = document.getElementById('splash-screen');
        if(splash) splash.style.display = 'none';
    }
});


const DOMINUS = { //herramienta de diagnostico-revisa si los archivos cargaron bien
    debug() {
        console.group("🔍 Auditoría de Salud Dominus");
        const modulos = {
            "Persistencia": typeof Persistencia !== 'undefined',
            "Ventas": typeof Ventas !== 'undefined',
            "Interfaz": typeof Interfaz !== 'undefined',
            "Controlador": typeof Controlador !== 'undefined',
            "Inventario": typeof Inventario !== 'undefined'
        };
        console.table(modulos);
        console.groupEnd();
    },
    
    resetTotal() { //esto borra todo lo que esta en el local storage, aunque por un momento no sera necesario//
        if(confirm("⚠️ ¿BORRAR TODO? Esto eliminará ventas, gastos y fiaos permanentemente.")) {
            localStorage.clear();
            location.reload();
        }
    }
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log("Dominus PWA: Lista"))
        .catch(err => console.log("Error en SW:", err));
}



window.DOMINUS = DOMINUS;

