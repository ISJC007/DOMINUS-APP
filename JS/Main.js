let miGrafica = null; // Añade esto en la línea 1 de Main.js
let tallasTemporales = {};

const Interfaz = {
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

    toggleAjustes() {
        document.getElementById('panelAjustes').classList.toggle('active');
    },

    cargarSugerencias() {
        const listaSugerencias = document.getElementById('sugerencias-ventas');
        if (!listaSugerencias) return;
        const productos = Ventas.getSugerencias();
        listaSugerencias.innerHTML = productos.map(p => `<option value="${p}">`).join('');
    },

    toggleClienteField(metodo) {
        const campo = document.getElementById('v-cliente');
        if(campo) {
            metodo === 'Fiao' ? campo.classList.remove('hidden') : campo.classList.add('hidden');
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

    generarFilaVenta(v) {
        let btnLiq = "";
        if (v.esServicio && !v.pagado) {
            btnLiq = `<button onclick="Controlador.liquidarServicioManual(${v.id})" style="background:#ffd700; color:#000; border:none; padding:2px 6px; border-radius:4px; font-size:10px; cursor:pointer; margin-left:5px; font-weight:bold;">💸 LIQUIDAR</button>`;
        } else if (v.esServicio && v.pagado) {
            btnLiq = `<span style="color:#4caf50; font-size:10px; margin-left:5px; font-weight:bold;">✔ PAGADO</span>`;
        }

        return `
            <div class="item-lista glass" style="margin-bottom: 8px;">
                <span>
                    <strong>${v.producto}</strong> ${btnLiq}<br>
                    <small style="opacity:0.8">🕒 ${v.fecha} - ${v.hora || ''}</small><br>
                    <small style="color:var(--primary)">${v.metodo}</small>
                </span>
                <span style="font-weight:bold">${Number(v.montoBs).toLocaleString('es-VE')} Bs</span>
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
        const mensaje = `Hola ${f.cliente}, te escribo de la bodega para recordarte el pago pendiente de ${Number(f.montoBs).toLocaleString('es-VE')} Bs por concepto de: ${f.producto}. ¡Feliz día!`;
        const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        return `
            <div class="item-lista glass border-fiao" style="margin-bottom: 8px;">
                <span><strong>${f.cliente}</strong><br><small>${f.producto}</small></span>
                <div class="acciones-fiao">
                    <span class="monto-deuda">${Number(f.montoBs).toLocaleString('es-VE')} Bs</span>
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <a href="${urlWhatsapp}" target="_blank" class="btn-mini" style="background:#25D366; border-radius:50%; padding:5px;">📲</a>
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

    const dibujarItems = (prods) => {
        lista.innerHTML = prods.map(p => {
            const unidad = p.unidad || 'Und';
            
            // --- INTEGRACIÓN DE TALLAS CON DISEÑO DE ETIQUETAS ---
            let htmlTallas = "";
            if (p.tallas) {
                htmlTallas = `
                    <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
                        ${Object.entries(p.tallas)
                            .filter(([t, c]) => c > 0) // Solo mostramos las que tienen stock
                            .map(([t, c]) => `
                                <span style="font-size: 10px; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(76, 175, 80, 0.3); font-family: monospace;">
                                    T${t}:<b>${c}</b>
                                </span>
                            `).join('')}
                    </div>
                `;
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
                            <small style="font-size: 9px; color: #aaa; margin-top: 2px;">Precio Bs</small>
                        </div>
                        <button class="btn-mini btn-danger" onclick="Controlador.eliminarInv('${p.id}')" style="padding: 8px; border-radius: 6px;">🗑️</button>
                    </div>
                </div>`;
        }).join('');
    };

    if (Inventario.productos.length === 0) {
        lista.innerHTML = `<p style="color: #aaa; text-align: center; padding: 20px;">No hay productos en stock.</p>`;
    } else {
        dibujarItems(Inventario.productos);
    }

    const buscadorFijo = document.getElementById('busqueda-real-inv');
    if(buscadorFijo) {
        buscadorFijo.oninput = (e) => {
            const t = e.target.value.toLowerCase();
            const filtrados = Inventario.productos.filter(prod => prod.nombre.toLowerCase().includes(t));
            dibujarItems(filtrados);
        };
    }
},

actualizarSelectorTallas(nombreProducto) {
    const contenedor = document.getElementById('contenedor-talla');
    const select = document.getElementById('v-talla');
    const inputMonto = document.getElementById('v-monto'); // +++ CAPTURA PRECIO
    if (!contenedor || !select) return;

    const p = Inventario.productos.find(prod => prod.nombre.toLowerCase() === nombreProducto.toLowerCase());

    if (p) {
        // +++ AUTO-PRECIO: Si el producto existe, ponemos su precio en el input +++
        if (inputMonto && p.precio) {
            inputMonto.value = p.precio;
        }

        // Lógica de tallas original intacta
        if (p.tallas) {
            contenedor.classList.remove('hidden');
            select.innerHTML = '<option value="">Elegir Talla...</option>';
            Object.entries(p.tallas).forEach(([talla, cant]) => {
                if (cant > 0) {
                    select.innerHTML += `<option value="${talla}">Talla ${talla} (${cant} disp.)</option>`;
                }
            });
        } else {
            contenedor.classList.remove('hidden'); // Lo dejamos visible por si quieres elegir algo
            contenedor.classList.add('hidden');
            select.innerHTML = '';
        }
    } else {
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
    
    // Limpiamos y preparamos el modal
    contenedor.innerHTML = `
        <div id="selector-categoria-tallas" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:15px;">
            <button onclick="GenerarInputsDinamicos('calzado')" class="btn-mini" style="background:#333; color:white;">👟 Calzado</button>
            <button onclick="GenerarInputsDinamicos('ropa')" class="btn-mini" style="background:#333; color:white;">👕 Ropa</button>
            <button onclick="GenerarInputsDinamicos('peso')" class="btn-mini" style="background:#333; color:white;">⚖️ Peso/Gramos</button>
            <button onclick="GenerarInputsDinamicos('liquido')" class="btn-mini" style="background:#333; color:white;">💧 Líquidos</button>
            <button onclick="GenerarInputsDinamicos('pacas')" class="btn-mini" style="background:#333; color:white;">📦 Pacas</button>
        </div>
        <div id="lista-tallas-dinamica" style="max-height: 350px; overflow-y: auto;"></div>
    `;
    
    // Auto-selección lógica según el select de unidad
    if(unidadPrincipal === 'Kg') GenerarInputsDinamicos('peso');
    else if(unidadPrincipal === 'Lts') GenerarInputsDinamicos('liquido');
    else if(unidadPrincipal === 'Talla') GenerarInputsDinamicos('ropa');
    else GenerarInputsDinamicos('calzado');

    document.getElementById('modal-gestor-tallas').style.display = 'flex';
}

// FUNCIÓN AUXILIAR DE GENERACIÓN
function GenerarInputsDinamicos(tipo) {
    const lista = document.getElementById('lista-tallas-dinamica');
    lista.innerHTML = '';
    let opciones = [];

    if(tipo === 'calzado') { for(let i=35; i<=45; i++) opciones.push(i); }
    else if(tipo === 'ropa') { opciones = ['SS', 'S', 'M', 'L', 'XL', 'XXL', 'Única']; }
    else if(tipo === 'peso') { opciones = ['100g', '250g', '500g', '1Kg', 'Otr']; }
    else if(tipo === 'liquido') { opciones = ['250ml', '500ml', '1L', '2L', 'Otr']; }

    opciones.forEach(op => {
        const valor = tallasTemporales[op] || 0;
        lista.innerHTML += `
            <div class="fila-talla">
                <span style="color:white; font-size:14px;">${op}</span>
                <input type="number" value="${valor}" step="any"
                       onchange="tallasTemporales['${op}'] = parseFloat(this.value) || 0">
            </div>`;
    });
}

// En tu main.js, añade esta función para que el papá vea el stock al vender
function actualizarStockEnVenta(nombreProducto) {
    const p = Inventario.productos.find(prod => prod.nombre === nombreProducto);
    const selectTalla = document.getElementById('v-talla');
    const infoStock = document.getElementById('info-stock-talla'); // Un span que puedes poner al lado
    
    if (p && p.tallas) {
        selectTalla.onchange = () => {
            const talla = selectTalla.value;
            const cantidad = p.tallas[talla] || 0;
            const unidad = p.tallas['Manual'] !== undefined ? p.unidad : 'Und';
            infoStock.innerText = ` Quedan: ${cantidad} ${unidad}`;
            infoStock.style.color = cantidad > 0 ? '#4caf50' : '#ff5252';
        };
    }
}

function CerrarGestorTallas() {
    document.getElementById('modal-gestor-tallas').style.display = 'none';
    const total = Object.values(tallasTemporales).reduce((a, b) => a + b, 0);
    if(total > 0) {
        document.getElementById('inv-cant').value = total;
        // Aquí se usa tu función notificar original
        notificar(`✅ ${total} unidades desglosadas`);
    }
}

// --- FUNCIÓN GLOBAL DE NOTIFICACIÓN ---
// Ponla fuera de cualquier llave { } al final del archivo

const notificar = (msj) => {
    // Creamos el elemento del mensaje
    const toast = document.createElement('div');
    toast.className = 'toast-exito'; // Asegúrate de tener esta clase en tu CSS
    toast.innerText = msj;
    
    // Estilos rápidos por si el CSS no carga
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#4caf50',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        zIndex: '10000',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'all 0.5s ease'
    });

    document.body.appendChild(toast);
    
    // Desaparecer después de 2 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 500);
    }, 2000);
};




const Controlador = {
 ejecutarVenta() {
    const p = document.getElementById('v-producto').value;
    const m = parseFloat(document.getElementById('v-monto').value);
    const mon = document.getElementById('v-moneda').value;
    const met = document.getElementById('v-metodo').value;
    const cli = document.getElementById('v-cliente').value;
    
    // CAPTURAMOS LA CANTIDAD (Error 2)
    const cantInput = document.getElementById('v-cantidad');
    const cantidad = cantInput ? parseFloat(cantInput.value) : 1;

    // +++ INTEGRACIÓN: CAPTURA DE TALLA +++
    const selectTalla = document.getElementById('v-talla');
    const divTalla = document.getElementById('contenedor-talla'); // Asumo que este ID existe en tu HTML
    // Solo tomamos el valor si el contenedor no está oculto

    const tallaElegida = (selectTalla && selectTalla.value) ? selectTalla.value : null;    // +++ FIN INTEGRACIÓN +++

    const inputCom = document.getElementById('v-comision');
    const comisionValor = inputCom ? parseFloat(inputCom.value) : 0;
    const comFinal = isNaN(comisionValor) ? 0 : comisionValor;

    if(!p || isNaN(m)) return alert("Falta producto o monto");

    // TU LÓGICA DE SERVICIO (INTACTA)
    const esServicio = confirm(`¿Este cobro de "${p}" es un SERVICIO DE PUNTO?`);

    let stockOk = true;
    if (!esServicio) {

        if (typeof Inventario !== 'undefined') {

        Inventario.descontar(p, cantidad, tallaElegida);
        
        // +++ VALIDACIÓN: Si requiere talla y no la puso, frenamos antes de descontar +++
        if (divTalla && !divTalla.classList.contains('hidden') && !tallaElegida) {
            return alert("⚠️ Debes seleccionar una talla para este producto.");
        }

        // AHORA PASAMOS LA 'cantidad' REAL Y LA TALLA (INTEGRACIÓN)
        stockOk = typeof Inventario !== 'undefined' ? Inventario.descontar(p, cantidad, tallaElegida) : true;
    }

}

    if (stockOk) {
        // Tu función Ventas.registrarVenta (le paso cant que te faltaba en el código original que me mostraste arriba, pero respeto tu orden)
        Ventas.registrarVenta(p, m, mon, met, cli, comFinal, esServicio, cantidad);
        
        Interfaz.actualizarDashboard(); 
        notificar("✅ Venta registrada con éxito");

        // para que lea el inventario actualizado. 
    if(typeof cargarProductosVenta === 'function') {
        cargarProductosVenta(); 
    }
        
        // Limpieza
        document.getElementById('v-producto').value = '';
        document.getElementById('v-monto').value = '';
        document.getElementById('v-cliente').value = '';
        if(cantInput) cantInput.value = '1'; // Reset a 1
        if(inputCom) inputCom.value = ''; 
        
        // Respetando tu función propia
        this.limpiarSeleccionVenta();
        
        // Respetando tu comentario de Interfaz vs this
        Interfaz.actualizarDashboard();

        console.log("Venta registrada con éxito");
    }
},

   liquidarServicioManual(idVenta) {
        // 1. Buscamos la venta en el historial
        const venta = Ventas.historial.find(v => v.id === idVenta);
        if (!venta) return;

        // 2. Preguntamos el monto (Margen de seguridad)
        const montoEstimado = venta.aEntregar;
        const inputUsuario = prompt(`Liquidando a: ${venta.producto}\nMonto: ${montoEstimado.toLocaleString('es-VE')} Bs\n\n¿Cuánto vas a entregar?`, montoEstimado);

        if (inputUsuario === null || inputUsuario.trim() === "" || isNaN(parseFloat(inputUsuario))) return;

        const montoFinal = parseFloat(inputUsuario);

        if (confirm(`Se registrará un GASTO de ${montoFinal.toLocaleString('es-VE')} Bs. ¿Confirmar?`)) {
            
            // --- INYECCIÓN DIRECTA EN LA BASE DE GASTOS ---
            const nuevoGasto = {
                id: Date.now(),
                descripcion: `LIQ. PUNTO: ${venta.producto}`,
                montoBs: montoFinal, // Usamos montoBs para que coincida con tu renderGastos
                moneda: 'Bs',
                fecha: new Date().toLocaleDateString('es-VE'),
                hora: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
            };

            // Cargamos, añadimos y guardamos en dom_gastos
            const gastosActuales = Persistencia.cargar('dom_gastos') || [];
            gastosActuales.push(nuevoGasto);
            Persistencia.guardar('dom_gastos', gastosActuales);

            // 3. ACTUALIZAMOS LA VENTA
            venta.pagado = true;
            venta.montoPagadoReal = montoFinal;
            Persistencia.guardar('dom_ventas', Ventas.historial);
            
            alert("¡Liquidación exitosa! El monto se descontó en Gastos.");
            
            // 4. REFRESCAMOS LA VISTA (Usamos tu función show)
           Interfaz.show('ventas'); 
        }
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
        const monto = prompt("¿Cuánto abona el cliente?");
        if(!monto || isNaN(monto)) return;
        const moneda = confirm("¿El abono es en Dólares ($)?") ? 'USD' : 'Bs';
        const metodo = prompt("Método de pago (Ej: Pago Móvil, Efectivo, Punto, Biopago):", "Pago Móvil");

        if (Ventas.abonarDeuda(id, parseFloat(monto), moneda, metodo)) {
            alert("Abono registrado con éxito");
            Interfaz.show('fiaos-list');
        }
    },

    eliminarDeuda(id) {
        if(confirm("¿Borrar deuda definitivamente?")) {
            Ventas.eliminarDeuda(id);
            Interfaz.show('fiaos-list');
        }
    },

    eliminarInv(id) {
        if(confirm("¿Borrar producto del inventario?")) {
            Inventario.eliminar(id);
            Interfaz.renderInventario();
        }
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

    generarCierre() {
        const r = Ventas.finalizarJornada();
        const hoy = new Date().toLocaleDateString('es-VE');
        
        // 1. Texto resumido para WhatsApp
        const texto = `📊 *CIERRE DOMINUS - ${hoy}*\n\n` +
                      `💵 Efectivo: ${r.efectivoBS.toLocaleString('es-VE')} Bs / ${r.efectivoUSD} $\n` +
                      `📱 Digital: ${r.digital.toLocaleString('es-VE')} Bs\n` +
                      `📉 Gastos: ${r.gastos.toLocaleString('es-VE')} Bs\n\n` +
                      `✅ *Total Neto:* ${r.balanceNeto.toLocaleString('es-VE')} Bs`;

        const opcion = prompt("¿Cómo deseas el cierre?\n1. Mensaje de WhatsApp (Rápido)\n2. Documento PDF (Detallado/Excel)", "2");

        if (opcion === "1") {
            window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
            
            // Opcional: ¿Quieres que también pregunte para limpiar después del WhatsApp?
            setTimeout(() => {
                if(confirm("¿Deseas cerrar la jornada y limpiar los datos ahora?")) {
                    Ventas.limpiarJornada();
                    location.reload();
                }
            }, 1000);

        } else if (opcion === "2") {
            // AQUÍ ESTÁ EL CAMBIO CLAVE: Llamamos a la nueva función detallada
            this.generarPDF(); 
        }
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

        html2pdf().set(opciones).from(contenidoHTML).save().then(() => {
            setTimeout(() => {
                if (confirm("¿Cerrar jornada y limpiar datos?")) {
                    Ventas.limpiarJornada();
                    location.reload();
                }
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
};

document.addEventListener('DOMContentLoaded', () => {

    // 1. RECUPERAR MODO OSCURO
    const isDark = Persistencia.cargar('dom_dark_mode');
    if (isDark) {
        document.body.classList.add('dark-mode');
        // Sincronizamos el switch visualmente
        const checkDark = document.getElementById('checkDarkMode');
        if (checkDark) checkDark.checked = true;
    }

    // 2. RECUPERAR ESTADO DEL INVENTARIO
    const invActivo = localStorage.getItem('dom_inv_activo') === 'true'; 
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

window.DOMINUS = DOMINUS;

    