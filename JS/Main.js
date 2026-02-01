let miGrafica = null; // Añade esto en la línea 1 de Main.js
let tallasTemporales = {};

const rangosTallas = {
    'ninos-peq': [18,19,20,21,22,23,24,25],
    'ninos-gra': [26,27,28,29,30,31,32],
    'juvenil': [33,34,35,36,37,38,39],
    'caballero': [40,41,42,43,44,45]
};

const Interfaz = {

    // Agrega esto a tu objeto Interfaz
confirmarAccion(titulo, mensaje, onConfirmar) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; z-index:99999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:320px; width:100%; text-align:center; border:1px solid #ff4444; padding:25px; border-radius:20px;">
            <span style="font-size:3em;">⚠️</span>
            <h3 style="color:#ff4444; margin:10px 0;">${titulo}</h3>
            <p style="color:white; opacity:0.9; margin-bottom:20px;">${mensaje}</p>
            <div style="display:flex; gap:10px;">
                <button id="btn-abortar" class="btn-main" style="background:#444; flex:1">No, cancelar</button>
                <button id="btn-proceder" class="btn-main" style="background:#ff4444; flex:1">Sí, borrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-abortar').onclick = () => overlay.remove();
    document.getElementById('btn-proceder').onclick = () => {
        onConfirmar();
        overlay.remove();
    };
},

    cambiarSeccion: function(id) {
        console.log("Cambiando a:", id);
        // ... tu código actual aquí ...
    }, // <-- IMPORTANTE: Esta coma separa las funciones

    // Función 2: El Toggle de Ajustes (La que faltaba)
   // Dentro de tu objeto Interfaz
toggleAjustes: function() {
    const panel = document.getElementById('panelAjustes');
    if (panel) {
        panel.classList.toggle('active');
    }
    }, // <-- OTRA COMA AQUÍ

    show(view) {
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

    // Busca esta función en tu código y reemplázala por esta

    cargarSugerencias() {
        const listaSugerencias = document.getElementById('sugerencias-ventas');
        if (!listaSugerencias) return;
        const productos = Ventas.getSugerencias();
        listaSugerencias.innerHTML = productos.map(p => `<option value="${p}">`).join('');
    },

    toggleClienteField(metodo) {
    // Apuntamos al contenedor, no solo al input
    const wrapper = document.getElementById('wrapper-cliente'); 
    const input = document.getElementById('v-cliente');

    if (wrapper) {
        if (metodo === 'Fiao') {
            wrapper.classList.remove('hidden');
            if (input) input.focus(); // Enfoca el campo para escribir de una vez
        } else {
            wrapper.classList.add('hidden');
            if (input) input.value = ''; // Limpia el nombre si cambias de opinión
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

        const totalV = vHoy.reduce((acc, i) => acc + (Number(i.montoBs) || 0), 0);
        const totalG = gHoy.reduce((acc, i) => acc + (Number(i.montoBs) || 0), 0);
        const netoBs = totalV - totalG;
        const netoConvertido = netoBs / t;

        if(document.getElementById('total-caja')) 
            document.getElementById('total-caja').innerText = `${netoBs.toLocaleString('es-VE')} Bs`;
        
        if(document.getElementById('total-usd')) 
            document.getElementById('total-usd').innerText = `$ ${netoConvertido.toFixed(2)}`;
        
        if(document.getElementById('total-fiaos')) 
            document.getElementById('total-fiaos').innerText = `${f.reduce((acc, i) => acc + (Number(i.montoBs) || 0), 0).toLocaleString('es-VE')} Bs`;
        
        if(document.getElementById('total-gastos')) 
            document.getElementById('total-gastos').innerText = `${totalG.toLocaleString('es-VE')} Bs`;
        
        if(document.getElementById('tasa-global')) 
            document.getElementById('tasa-global').value = t;

        
                if (typeof Controlador !== 'undefined') //esto puede ser borrado//
                 Controlador.renderizarGrafica();
    },

    renderVentas() {
        const datos = Persistencia.cargar('dom_ventas') || [];
        const lista = document.getElementById('lista-ventas-historial');
        if(!lista) return;

        const ventasInvertidas = datos.slice().reverse();
        
        if (ventasInvertidas.length <= 6) {
            lista.innerHTML = ventasInvertidas.map(v => this.generarFilaVenta(v)).join('');
        } else {
            const recientes = ventasInvertidas.slice(0, 3);
            const antiguas = ventasInvertidas.slice(3);
            const grupos = {};
            antiguas.forEach(v => {
                const horaBloque = v.hora ? v.hora.split(':')[0] + ":00" : "Otras";
                if (!grupos[horaBloque]) grupos[horaBloque] = [];
                grupos[horaBloque].push(v);
            });

            const htmlAntiguas = Object.keys(grupos).map(hora => `
                <div style="border-left: 2px solid var(--primary); margin: 10px 0; padding-left: 10px;">
                    <div style="font-size: 11px; font-weight: bold; color: var(--primary); margin-bottom: 5px;">🕒 Bloque ${hora}</div>
                    ${grupos[hora].map(v => this.generarFilaVenta(v)).join('')}
                </div>
            `).join('');

            lista.innerHTML = `
                ${recientes.map(v => this.generarFilaVenta(v)).join('')}
                <details class="glass" style="margin-top: 10px; border: 1px solid var(--primary); border-radius: 8px;">
                    <summary style="padding: 12px; cursor: pointer; text-align: center; font-weight: bold; color: var(--primary);">
                        ➕ Ver ${antiguas.length} anteriores (por horas)
                    </summary>
                    <div style="max-height: 400px; overflow-y: auto; padding: 5px;">
                        ${htmlAntiguas}
                    </div>
                </details>
            `;
        }
    },

    alternarModoPunto() {
    const btnPunto = document.getElementById('btn-modo-punto');
    const wrapper = document.getElementById('wrapper-comision');
    const btnVender = document.querySelector('.btn-main'); // Tu botón de registrar
    
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

    generarFilaVenta(v) {
    let btnLiq = "";
    if (v.esServicio && !v.pagado) {
        btnLiq = `<button onclick="Controlador.liquidarServicioManual(${v.id})" style="background:#ffd700; color:#000; border:none; padding:2px 6px; border-radius:4px; font-size:10px; cursor:pointer; margin-left:5px; font-weight:bold;">💸 LIQUIDAR</button>`;
    } else if (v.esServicio && v.pagado) {
        btnLiq = `<span style="color:#4caf50; font-size:10px; margin-left:5px; font-weight:bold;">✔ PAGADO</span>`;
    }

    // INTEGRACIÓN: Mostramos la cantidad al lado del producto y el monto en USD
    // Usamos v.montoBs y v.montoUSD que ya vienen calculados de registrarVenta
    const cantidadStr = v.cantidadVenta > 1 ? `<span style="color:var(--primary)">x${v.cantidadVenta}</span>` : "";
    const montoUSD = v.montoUSD ? `<br><small style="opacity:0.6">$ ${Number(v.montoUSD).toFixed(2)}</small>` : "";

    return `
        <div class="item-lista glass" style="margin-bottom: 8px;">
            <span>
                <strong>${v.producto}</strong> ${cantidadStr} ${btnLiq}<br>
                <small style="opacity:0.8">🕒 ${v.fecha} - ${v.hora || ''}</small><br>
                <small style="color:var(--primary)">${v.metodo} ${v.cliente ? '• ' + v.cliente : ''}</small>
            </span>
            <div style="text-align: right;">
                <span style="font-weight:bold; display:block;">${Number(v.montoBs).toLocaleString('es-VE')} Bs</span>
                ${montoUSD}
            </div>
        </div>`;
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
        const datos = Persistencia.cargar('dom_fiaos') || [];
        const lista = document.getElementById('lista-fiaos');
        if(!lista) return;
        if(datos.length === 0) {
            lista.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">Sin fiaos.</p>';
            return;
        }
        const fiaosInvertidos = datos.slice().reverse();
        if (fiaosInvertidos.length <= 6) {
            lista.innerHTML = fiaosInvertidos.map(f => this.generarFilaFiao(f)).join('');
        } else {
            const recientes = fiaosInvertidos.slice(0, 3);
            const antiguas = fiaosInvertidos.slice(3);
            const grupos = {};
            antiguas.forEach(f => {
                const horaBloque = f.hora ? f.hora.split(':')[0] + ":00" : "Otras";
                if (!grupos[horaBloque]) grupos[horaBloque] = [];
                grupos[horaBloque].push(f);
            });
            const htmlAntiguos = Object.keys(grupos).map(hora => `
                <div style="border-left: 2px solid #2196F3; margin: 10px 0; padding-left: 10px;">
                    <div style="font-size: 11px; font-weight: bold; color: #2196F3; margin-bottom: 5px;">🕒 Bloque ${hora}</div>
                    ${grupos[hora].map(f => this.generarFilaFiao(f)).join('')}
                </div>
            `).join('');
            lista.innerHTML = `${recientes.map(f => this.generarFilaFiao(f)).join('')}
                <details class="glass" style="margin-top: 10px; border: 1px solid #2196F3; border-radius: 8px;">
                    <summary style="padding: 12px; cursor: pointer; text-align: center; font-weight: bold; color: #2196F3;">➕ Ver anteriores</summary>
                    <div style="max-height: 400px; overflow-y: auto; padding: 5px;">${htmlAntiguos}</div>
                </details>`;
        }
    },

   generarFilaFiao(f) {
    // 1. INTEGRACIÓN: Usamos el montoBs ya calculado y añadimos referencia en USD
    // f.montoBs ya viene multiplicado por la cantidad desde registrarVenta
    const montoDisplay = Number(f.montoBs).toLocaleString('es-VE');
    const montoUSD = f.montoUSD ? `($${Number(f.montoUSD).toFixed(2)})` : '';

    // 2. Mensaje de WhatsApp mejorado con el nombre del negocio (Dominus) y la cantidad
    const mensaje = `Hola ${f.cliente}, te escribo de DOMINUS para recordarte el pago pendiente de ${montoDisplay} Bs por: ${f.producto} (x${f.cantidadVenta || 1}). ¡Feliz día!`;
    const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    return `
        <div class="item-lista glass border-fiao" style="margin-bottom: 8px;">
            <span>
                <strong>👤 ${f.cliente || "Cliente"}</strong><br>
                <small>${f.producto} (x${f.cantidadVenta || 1})</small>
            </span>
            <div class="acciones-fiao text-right">
                <span class="monto-deuda" style="display:block;">${montoDisplay} Bs</span>
                <small style="color: #aaa; font-size: 0.7rem;">${montoUSD}</small>
                
                <div style="display:flex; gap:5px; margin-top:5px; justify-content: flex-end;">
                    <a href="${urlWhatsapp}" target="_blank" class="btn-mini" title="Cobrar por WhatsApp" style="background:#25D366; border-radius:50%; padding:5px; display: flex; align-items: center; justify-content: center; text-decoration: none;">📲</a>
                    <button class="btn-mini btn-success" onclick="Controlador.abonar('${f.id}')">Abonar</button>
                    <button class="btn-mini btn-danger" onclick="Controlador.eliminarDeuda('${f.id}')">🗑️</button>
                </div>
            </div>
        </div>`;
   },

 renderInventario() {
    if (typeof Inventario === 'undefined' || !Inventario.productos) return;
    const lista = document.getElementById('lista-inventario');
    if (!lista) return;

    const generarHTMLItem = (p) => {
        const unidad = p.unidad || 'Und';
        // CALCULAMOS LA REFERENCIA EN DÓLARES AQUÍ MISMO
        const precioUSD = (p.precio / Conversor.tasaActual).toFixed(2);
        
        let htmlTallas = "";
        if (p.tallas) {
            htmlTallas = `
                <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
                    ${Object.entries(p.tallas)
                        .filter(([t, c]) => c > 0)
                        .map(([t, c]) => `
                            <span style="font-size: 10px; background: rgba(76, 175, 80, 0.2); color: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(76, 175, 80, 0.3); font-family: monospace;">
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
                
                <div class="acciones-fiao" style="text-align: right; display: flex; align-items: center; gap: 10px;">
                    <div style="display: flex; flex-direction: column; align-items: flex-end;">
                        <input type="number" value="${p.precio}" step="0.01" 
                            onchange="Controlador.editarPrecioRapido('${p.id}', this.value)" 
                            style="width: 85px; background: rgba(0,0,0,0.5); color: #4caf50; border: 1px solid #4caf50; border-radius: 6px; text-align: right; font-weight: bold; padding: 4px;">
                        <small style="font-size: 10px; color: #4caf50; margin-top: 2px; font-weight: bold;">
                             ≈ $${precioUSD}
                        </small>
                    </div>
                    <button class="btn-mini btn-danger" onclick="Controlador.eliminarInv('${p.id}')" style="padding: 8px; border-radius: 6px;">🗑️</button>
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

    // Renderizado inicial
    dibujarItems(Inventario.productos);

    // Activación del buscador (Con limpieza de espacios)
    const buscador = document.getElementById('busqueda-real-inv');
    if(buscador) {
        // Quitamos el evento viejo si existía para no duplicar
        buscador.oninput = (e) => {
            const t = e.target.value.toLowerCase().trim();
            const filtrados = Inventario.productos.filter(prod => 
                prod.nombre.toLowerCase().includes(t)
            );
            dibujarItems(filtrados);
        };
    }
},

// Dentro del objeto Interfaz en Main.js
// Dentro del objeto Interfaz = { ... }
filtrarTallasPorBloque(rango) {
    const filas = document.querySelectorAll('.fila-talla');
    const permitidas = rangosTallas[rango] || [];

    filas.forEach(fila => {
        const nroTalla = parseInt(fila.getAttribute('data-talla'));
        
        // Si no es un número (ej: talla "S"), siempre se muestra o se ignora el filtro
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

    // Usamos trim() para evitar errores por espacios accidentales
    const p = Inventario.productos.find(prod => prod.nombre.toLowerCase() === nombreProducto.trim().toLowerCase());

    if (p) {
        // AUTO-PRECIO
        if (inputMonto && p.precio) {
            inputMonto.value = p.precio;
        }

       if (p.tallas && Object.keys(p.tallas).length > 0) {
            contenedor.classList.remove('hidden');
            select.innerHTML = '<option value="">Elegir Talla/Peso...</option>';

            Object.entries(p.tallas).forEach(([talla, cant]) => {
                // Forzamos que 'cant' sea número para comparar bien
                if (Number(cant) > 0) {
                    // MEJORA: Si la talla se llama 'Manual', usamos la unidad del producto
                    let etiqueta = (talla === 'Manual') ? `${p.unidad || 'Cant.'}` : `Talla ${talla}`;
                    select.innerHTML += `<option value="${talla}">${etiqueta} (${cant} disp.)</option>`;
                }
            });

            // Si después de filtrar no quedó ninguna talla con stock, ocultamos
            if (select.options.length <= 1) {
                contenedor.classList.add('hidden');
            }
        } else {
            // Si el producto no tiene el objeto tallas definido
            contenedor.classList.add('hidden');
            select.innerHTML = '';
        }
    } else {
        // Si el producto no existe en el inventario
        contenedor.classList.add('hidden');
        select.innerHTML = '';
    }
  },
};

// --- PEGAR ESTO AL FINAL DEL ARCHIVO, FUERA DE TODO OBJETO ---

// SUSTITUIR ESTA FUNCIÓN EN TU ARCHIVO (Es la que llama el botón 👟)
function AbrirGestorTallas() {
    const contenedor = document.getElementById('contenedor-filas-tallas');
    const unidadPrincipal = document.getElementById('inv-unidad').value;
    if(!contenedor) return;
    
    // Preparamos la estructura del modal con tus botones
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
    
    // Detección inteligente según la unidad principal
    if(unidadPrincipal === 'Kg') GenerarInputsDinamicos('peso');
    else if(unidadPrincipal === 'Lts') GenerarInputsDinamicos('liquido');
    else if(unidadPrincipal === 'Talla') GenerarInputsDinamicos('calzado');
    else if(unidadPrincipal === 'Paca') GenerarInputsDinamicos('pacas');
    else GenerarInputsDinamicos('calzado');

    document.getElementById('modal-gestor-tallas').style.display = 'flex';
}

// FUNCIÓN AUXILIAR DE GENERACIÓN
function GenerarInputsDinamicos(tipo) {
    const lista = document.getElementById('lista-tallas-dinamica');
    const filtroContenedor = document.getElementById('bloque-filtro-contenedor');
    if(!lista) return;
    lista.innerHTML = '';

    // Mostrar filtro solo si es calzado
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

        // LÓGICA ESPECIAL PARA EL CAMPO MANUAL
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
            // LÓGICA NORMAL (Botones fijos)
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

// En tu main.js, añade esta función para que el papá vea el stock al vender
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

function CerrarGestorTallas() {
    // 1. Capturar el nombre manual antes de cerrar
    const nombreManualInput = document.getElementById('manual-nombre-din');
    const valorManual = nombreManualInput ? nombreManualInput.value : '';
    
    if (valorManual && tallasTemporales['Manual'] > 0) {
        const unidad = document.getElementById('inv-unidad').value;
        const sufijo = (unidad === 'Kg') ? 'g' : (unidad === 'Lts' ? 'ml' : '');
        
        // Creamos la etiqueta real (ej: "750g") y le pasamos la cantidad
        tallasTemporales[valorManual + sufijo] = tallasTemporales['Manual'];
        delete tallasTemporales['Manual']; // Borramos el genérico
    }

    // 2. Limpieza de ceros
    Object.keys(tallasTemporales).forEach(key => {
        if (tallasTemporales[key] === 0) delete tallasTemporales[key];
    });

    // 3. Calcular total de piezas/paquetes para el input principal
    const total = Object.values(tallasTemporales).reduce((a, b) => a + b, 0);
    const inputCant = document.getElementById('inv-cant');
    if(inputCant) inputCant.value = total;

    document.getElementById('modal-gestor-tallas').style.display = 'none';
    if(total > 0) notificar(`✅ ${total} unidades desglosadas`);
}

// --- FUNCIÓN GLOBAL DE NOTIFICACIÓN ---
// Ponla fuera de cualquier llave { } al final del archivo
// --- NOTIFICACIÓN UNIFICADA ---
const notificar = (msj, tipo = 'exito') => {
    const viejo = document.querySelector('.toast-exito');
    if(viejo) viejo.remove();

    const toast = document.createElement('div');
    toast.className = `toast-exito toast-${tipo}`;
    
    // Iconos según el tipo de acción
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

// --- EL NUEVO MODAL DE ELECCIÓN (PARA CIERRE Y ABONOS) ---
// UBICACIÓN: Pon esto al principio de tu Main.js o justo antes del Controlador
const modalEleccion = {
    abrir: function(config) {
        // Si ya hay uno abierto, lo borramos para no duplicar
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
        
        // Inyectar botones (WhatsApp, PDF, etc)
        config.botones.forEach(btn => {
            const b = document.createElement('button');
            // Si no trae clase, usa 'btn-si' (dorado) por defecto
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
            // Animación de salida
            m.style.opacity = '0';
            setTimeout(() => m.remove(), 300);
        }
    }
};


const Controlador = {
 ejecutarVenta() {
    // 1. Captura de datos
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

    // 2. Validaciones
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
    
    // --- SECCIÓN 3: CAMBIO CLAVE ---
    // Ya no llamamos a Inventario.descontar() aquí porque registrarVenta() 
    // ahora se encarga de descontar con la lógica inteligente de unidades.
    
    // 4. Registro y Limpieza
    // Pasamos tallaElegida como último parámetro para que se descuente correctamente
    Ventas.registrarVenta(p, m, mon, met, cli, comFinal, esServicio, cantidad, tallaElegida);
    
    // Actualizamos todo
    Interfaz.actualizarDashboard();
    Interfaz.renderInventario(); 
    Interfaz.actualizarSelectorTallas(p); 

    notificar("Venta registrada con éxito", "exito");

    // Limpieza de campos
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
    // 1. Buscamos la venta
    const venta = Ventas.historial.find(v => v.id === idVenta);
    if (!venta) return;

    const montoEstimado = venta.aEntregar;

    // 2. Creamos el Modal Estético (UI Blindada)
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
    
    // Enfocar el input automáticamente
    const inputMonto = document.getElementById('liq-monto-final');
    inputMonto.select();

    // 3. Lógica de los botones
    document.getElementById('btn-cancelar-liq').onclick = () => overlay.remove();

    document.getElementById('btn-confirmar-liq').onclick = () => {
        const montoFinal = parseFloat(inputMonto.value);

        if (isNaN(montoFinal) || montoFinal <= 0) {
            return notificar("Ingrese un monto válido", "error");
        }

        // --- PROCESO DE REGISTRO ---
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

        // Actualizamos la venta
        venta.pagado = true;
        venta.montoPagadoReal = montoFinal;
        Persistencia.guardar('dom_ventas', Ventas.historial);

        // Limpieza y Notificación Final (Bello)
        overlay.remove();
        notificar("¡Liquidación exitosa! Registrado en Gastos.", "exito");
        
        if (typeof Interfaz !== 'undefined') {
            Interfaz.show('ventas');
            Interfaz.actualizarDashboard();
        }
    };
},
    
    ejecutarGasto() {
        const d = document.getElementById('g-desc').value;
        const m = parseFloat(document.getElementById('g-monto').value);
        const mon = document.getElementById('g-moneda').value;
        if(!d || isNaN(m)) return alert("Faltan datos");
        Ventas.registrarGasto(d, m, mon);
        document.getElementById('g-desc').value = '';
        document.getElementById('g-monto').value = '';
Interfaz.actualizarDashboard();
    },

guardarEnInventario() {
    const n = document.getElementById('inv-nombre').value;
    const c = document.getElementById('inv-cant').value;
    const p = document.getElementById('inv-precio').value;
    
    // --- Mantenemos tu captura de unidad original ---
    const unidadElemento = document.getElementById('inv-unidad');
    const u = unidadElemento ? unidadElemento.value : 'Und';

    if(!n || !c) return alert("Falta nombre o cantidad");

    // --- INYECCIÓN DE TALLAS ---
    // Verificamos si hay algo en la memoria temporal de tallas
    const tieneTallas = Object.keys(tallasTemporales).length > 0;
    const tallasParaGuardar = tieneTallas ? {...tallasTemporales} : null;

    // +++ INTEGRACIÓN: VALIDACIÓN DE SUMA EXACTA (Lo único nuevo aquí) +++
    if (tieneTallas) {
        const sumaTallas = Object.values(tallasTemporales).reduce((a, b) => a + b, 0);
        if (sumaTallas !== parseFloat(c)) {
            return alert(`❌ Error: El stock total es ${c}, pero las tallas suman ${sumaTallas}. Deben ser iguales.`);
        }
    }
    // +++ FIN INTEGRACIÓN +++

    // --- TU LLAMADO ORIGINAL EXTENDIDO ---
    // Agregamos el 5to parámetro que definimos en el objeto Inventario
    Inventario.guardar(n, c, p || 0, u, tallasParaGuardar); 

    // --- TU LÓGICA DE LIMPIEZA ORIGINAL ---
    document.getElementById('inv-nombre').value = '';
    document.getElementById('inv-cant').value = '';
    document.getElementById('inv-precio').value = '';
    
    if(unidadElemento) unidadElemento.value = 'Und';

    // --- LIMPIEZA DE SEGURIDAD ---
    // Vaciamos la memoria de tallas para que el próximo producto empiece de cero
    tallasTemporales = {};

    // --- TU RENDER ORIGINAL ---
    Interfaz.renderInventario();
    
    notificar("📦 Producto cargado correctamente");
},

// Dentro del objeto Controlador en tu Main.js
mostrarStockDisponible: function(talla) {
    const nombreProd = document.getElementById('v-producto').value;
    const infoStock = document.getElementById('v-info-stock');
    
    if (!nombreProd || !talla) {
        if(infoStock) infoStock.innerText = "";
        return;
    }

    // Buscamos en el inventario global
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
    // 1. Buscamos el producto en la memoria
    const producto = Inventario.productos.find(p => p.id == id);
    
    if (producto) {
        // 2. Actualizamos el precio (si está vacío ponemos 0)
        producto.precio = nuevoPrecio === "" ? 0 : parseFloat(nuevoPrecio);
        
        // 3. Guardamos en LocalStorage inmediatamente
        Persistencia.guardar('dom_inventario', Inventario.productos);
        
        // 4. Log para confirmar en consola (opcional)
        console.log(`Precio de ${producto.nombre} actualizado a: ${producto.precio} Bs`);
    }
},
    
  abonar(id) {
    // 1. Buscamos la deuda para saber quién es el cliente
    const deuda = Ventas.deudas.find(d => d.id === Number(id));
    if (!deuda) return notificar("No se encontró la deuda", "error");

    // 2. Creamos el Modal Estético (Igual al de la Tasa)
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";

    overlay.innerHTML = `
        <div class="card glass" style="max-width:380px; width:100%; border:1px solid var(--primary); padding:25px; border-radius:20px; text-align:center; color:white;">
            <span style="font-size:2.5em;">🤝</span>
            <h3 style="color:var(--primary); margin:10px 0;">Registrar Abono</h3>
            <p style="font-size:0.9em; opacity:0.8; margin-bottom:15px;">Cliente: <strong>${deuda.cliente}</strong></p>
            
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
    
    // Auto-focus al input de monto para que tu papá no tenga que hacer clic
    setTimeout(() => document.getElementById('monto-abono').focus(), 100);

    // 3. Lógica de los botones
    document.getElementById('btn-cerrar-abono').onclick = () => overlay.remove();

    document.getElementById('btn-guardar-abono').onclick = () => {
        const montoVal = document.getElementById('monto-abono').value;
        const mon = document.getElementById('moneda-abono').value;
        const met = document.getElementById('metodo-abono').value;

        if (!montoVal || isNaN(montoVal) || parseFloat(montoVal) <= 0) {
            return notificar("Ingrese un monto válido", "error");
        }

        // Ejecutamos tu lógica de Ventas
        if (Ventas.abonarDeuda(id, parseFloat(montoVal), mon, met)) {
            overlay.remove();
            notificar("Abono registrado con éxito", "fiao");
            
            // Refrescamos la interfaz usando tu función original
            if (typeof Interfaz !== 'undefined') {
                Interfaz.show('fiaos-list');
                Interfaz.actualizarDashboard();
            }
        }
    };
},

eliminarDeuda(id) {
    Interfaz.confirmarAccion("¿Borrar Deuda?", "Esta acción no se puede deshacer.", () => {
        Ventas.eliminarDeuda(id);
        Interfaz.show('fiaos-list');
        notificar("Deuda eliminada", "error");
    });
},

eliminarInv(id) {
    Interfaz.confirmarAccion("¿Borrar Producto?", "Se eliminará permanentemente del stock.", () => {
        Inventario.eliminar(id);
        Interfaz.renderInventario();
        notificar("Producto eliminado", "error");
    });
},

    editarDeuda(id) {
        const montoNuevo = prompt("Ingrese el nuevo monto total de la deuda (en Bs):");
        if(montoNuevo !== null && montoNuevo !== "" && !isNaN(montoNuevo)) {
            let fiaos = Persistencia.cargar('dom_fiaos') || [];
            const index = fiaos.findIndex(f => f.id === Number(id));
            if(index !== -1) {
                fiaos[index].montoBs = parseFloat(montoNuevo);
                Persistencia.guardar('dom_fiaos', fiaos);
                Ventas.init(); 
                Interfaz.renderFiaos();
                alert("Deuda actualizada correctamente.");
            }
        }
    },

    toggleInv(activo) {
        Inventario.activo = activo; // Cambia el estado en el objeto Inventario
        
        const label = document.getElementById('estadoInv');
        if(label) {
            label.innerText = activo ? "Inventario ACTIVADO" : "Inventario DESACTIVADO";
            label.style.color = activo ? "#2e7d32" : "#d32f2f";
        }
        
        // Guardamos para que no se pierda al recargar la página
        localStorage.setItem('dom_inv_activo', activo);
        console.log("Inventario está ahora:", activo);
    },

    toggleDarkMode(activo) {
        // 1. Aplicamos o quitamos la clase según el switch
        if (activo) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // 2. Guardamos el estado booleano (true/false)
        Persistencia.guardar('dom_dark_mode', activo);
        
        console.log("Modo oscuro:", activo);
    },

    limpiarSeleccionVenta() {
        const met = document.getElementById('v-metodo');
        if(met) met.value = 'Efectivo $';
        Interfaz.toggleClienteField('Efectivo $');
    },
generarCierre: function() {
        // 1. Verificamos si ya hay un modal abierto para no duplicar
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
                    clase: "btn-pdf", // Color rojo para advertir
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
        // --- 1. CAPTURA DE DATOS ORIGINALES ---
        const r = Ventas.finalizarJornada(); 
        const ahora = new Date();
        const hoy = ahora.toLocaleDateString('es-VE');
        const horaId = `${ahora.getHours()}-${ahora.getMinutes()}`;
        const nombreArchivo = `Dominus_Cierre_${hoy.replace(/\//g, '-')}_${horaId}.pdf`;
        
        const ventasHoy = Ventas.historial.filter(v => v.fecha === hoy);
        const canvas = document.getElementById('graficaVentas');
        const graficaImg = canvas ? canvas.toDataURL('image/png') : null;

        const totalConConvertido = r.efectivoBS + r.digital - r.gastos + (r.efectivoUSD * Conversor.tasaActual);

        // --- NUEVA LÓGICA: TABLA DE LIQUIDACIÓN PARA TU PAPÁ ---
      const serviciosPendientes = ventasHoy.filter(v => v.esServicio && !v.pagado);

let tablaServiciosHTML = '';

// Ahora usamos 'serviciosPendientes' en lugar de 'serviciosHoy'
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

        // --- 2. CONSTRUCCIÓN DE LA TABLA DE DETALLE ---
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

        // --- 3. DISEÑO FINAL DEL PDF ---
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

        // --- 4. GENERACIÓN DEL ARCHIVO ---
        const opciones = {
            margin: 0,
            filename: nombreArchivo,
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

       // --- Al final de generarPDF ---
       // --- BUSCA EL FINAL DE TU FUNCIÓN generarPDF ---
        html2pdf().set(opciones).from(contenidoHTML).save().then(() => {
            setTimeout(() => {
                // Llamamos a la función que ya tiene los botones configurados
                this.preguntarLimpieza(); 
            }, 1500);
        });
    }, // Aquí termina generarPDF

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

    // 1. RECUPERAR MODO OSCURO
    const isDark = Persistencia.cargar('dom_dark_mode');
    if (isDark) {
        document.body.classList.add('dark-mode');
        // Sincronizamos el switch visualmente
        const checkDark = document.getElementById('checkDarkMode');
        if (checkDark) checkDark.checked = true;
    }

    // // 2. RECUPERAR ESTADO DEL INVENTARIO (CORREGIDO)
const configGuardada = localStorage.getItem('dom_config');
let invActivo;

if (configGuardada === null) {
    // Si no hay configuración, forzamos que sea TRUE la primera vez
    invActivo = true; 
    // Guardamos para que la próxima vez ya exista
    localStorage.setItem('dom_config', JSON.stringify({ invActivo: true }));
} else {
    // Si ya existe, leemos el valor real que dejó el usuario
    invActivo = JSON.parse(configGuardada).invActivo;
}

if(typeof Inventario !== 'undefined') Inventario.activo = invActivo;

const checkInv = document.getElementById('check-inv-ajustes') || document.getElementById('check-inv');
if (checkInv) checkInv.checked = invActivo;
    try {
        console.log("🚀 Dominus iniciando...");
        Ventas.init();
        
        // Forzamos el cierre del splash tras 2.5s
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if(splash) {
                splash.style.opacity = '0';
                setTimeout(() => {
                    splash.style.display = 'none';
                    Interfaz.show('dashboard');
                }, 500);
            }
        }, 2500);

    } catch (error) {
        console.error("❌ Error crítico en el inicio:", error);
        const splash = document.getElementById('splash-screen');
        if(splash) splash.style.display = 'none';
    }
});


const DOMINUS = {
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
    
    resetTotal() {
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

