const rangosTallas = { //aqui se definen que numeros pertenecen a cada categoria-se conecta con filtrar tallas
    'ninos-peq': [18,19,20,21,22,23,24,25],
    'ninos-gra': [26,27,28,29,30,31,32],
    'juvenil': [33,34,35,36,37,38,39],
    'caballero': [40,41,42,43,44,45]
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
    // 1. Lógica de Audio Centralizada 🔊
    if (typeof DominusAudio !== 'undefined') {
        switch (tipo) {
            case 'error':
            case 'alerta':
                DominusAudio.play('error');
                break;
            case 'stock':
                // 🤫 SILENCIO: Se elimina la llamada a DominusAudio.play('stockBajo');
                // Solo registramos en consola para que no grite.
                console.warn("DOMINUS (Silencio de Stock):", msj);
                break;
            case 'gasto':
                DominusAudio.play('add'); 
                break;
            case 'fiao':
                DominusAudio.play('add');
                break;
            default:
                DominusAudio.play('add');
                break;
        }
    }

    // 2. Gestión de la interfaz (Toast)
    // El visual lo dejamos para que sepas que pasó, pero no hará ruido.
    const viejo = document.querySelector(`.toast-${tipo}`);
    if(viejo) viejo.remove();

    const toast = document.createElement('div');
    toast.className = `toast-general toast-${tipo}`; 
    
    const iconos = {
        exito: '✨',
        gasto: '📉',
        stock: '📦',
        fiao: '🤝',
        error: '❌',
        alerta: '⚠️'
    };

    toast.innerHTML = `<span>${iconos[tipo] || '✅'}</span> ${msj}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500); 
};


async function iniciarDominus() {
    try {
        console.log("🚀 Dominus: Iniciando sistema...");

        // 1. CARGA DE DATOS BASE
        // Centralizamos los datos en el objeto global window.DOMINUS
        window.DOMINUS.historial = Persistencia.cargar('dom_ventas') || [];
        window.DOMINUS.deudas = Persistencia.cargar('dom_fiaos') || [];
        window.DOMINUS.gastos = Persistencia.cargar('dom_gastos') || [];

        // 2. CONFIGURACIÓN VISUAL Y MODO OSCURO
        const isDark = Persistencia.cargar('dom_dark_mode');
        if (isDark) {
            document.body.classList.add('dark-mode');
            const checkDark = document.getElementById('checkDarkMode');
            if (checkDark) checkDark.checked = true;
        }

        // 3. CONFIGURACIÓN DE INVENTARIO
        const configGuardada = localStorage.getItem('dom_config');
        let invActivo = (configGuardada === null) ? true : JSON.parse(configGuardada).invActivo;
        
        if (configGuardada === null) {
            localStorage.setItem('dom_config', JSON.stringify({ invActivo: true }));
        }

        if(typeof Inventario !== 'undefined') {
            Inventario.activo = invActivo;
            const checkInv = document.getElementById('check-inv-ajustes') || document.getElementById('check-inv');
            if (checkInv) checkInv.checked = invActivo;
        }

        // 4. AUTO-LLENADO DE PRECIOS (INTELIGENCIA DE VENTAS)
        const inputProducto = document.getElementById('v-producto');
        if (inputProducto) {
            inputProducto.setAttribute('list', 'sugerencias-ventas');
            inputProducto.addEventListener('input', (e) => {
                if (typeof Inventario !== 'undefined' && Inventario.buscarPrecioMemoria) {
                    const precioRecordado = Inventario.buscarPrecioMemoria(e.target.value);
                    if (precioRecordado !== null) {
                        const inputMonto = document.getElementById('v-monto');
                        if (inputMonto) {
                            inputMonto.value = precioRecordado;
                            inputMonto.style.backgroundColor = 'rgba(76, 175, 80, 0.2)'; 
                            setTimeout(() => inputMonto.style.backgroundColor = '', 500);
                        }
                    }
                }
            });
        }
        
        if(typeof Inventario !== 'undefined' && Inventario.actualizarDatalist) {
            Inventario.actualizarDatalist();
        }

        // 5. FRASES DEL SPLASH (MOTIVACIÓN)
        if (typeof bancoFrases !== 'undefined' && bancoFrases.length > 0) {
            const frase = bancoFrases[Math.floor(Math.random() * bancoFrases.length)];
            const txtFrase = document.getElementById('frase-splash');
            if (txtFrase) txtFrase.innerText = `"${frase.texto}"`;
        }

        // --- 6. CONTROL DE ACCESO Y FLUJO DE ENTRADA (IDENTIDAD) ---
        const haySesionLocal = Usuario.init(); 

        if (haySesionLocal) {
            // 🚀 ACTUALIZACIÓN DE IDENTIDAD: Si hay sesión, pintamos la foto y nombre
            if (typeof Interfaz !== 'undefined' && Interfaz.actualizarAvatarHeader) {
                Interfaz.actualizarAvatarHeader(Usuario.datos);
            }

            // Usuario con sesión activa: puede entrar offline si es necesario
            const accesoConcedido = await Seguridad.iniciarProteccion();
            
            if (accesoConcedido) {
                // Encendemos módulos secundarios
                if (typeof DominusAudio !== 'undefined') DominusAudio.saludarSegunHora();
                if (typeof Inventario !== 'undefined' && Inventario.init) Inventario.init();
                
                quitarSplash(); 
            } else {
                notificar("PIN incorrecto", "error");
                location.reload();
            }
        } else {
            // Usuario nuevo o sin sesión: validamos internet para la primera activación
            if (!navigator.onLine) {
                notificar("Internet requerido para activación", "alerta");
                const txtFrase = document.getElementById('frase-splash');
                if (txtFrase) txtFrase.innerText = "DOMINUS: Conéctate para activar tu cuenta.";
            } else {
                Usuario.mostrarLogin();
            }
        }

    } catch (error) {
        console.error("❌ Fallo crítico en el arranque de Dominus:", error);
        if (typeof quitarSplash === 'function') quitarSplash();
    }
}

// Vinculamos el inicio al cargar el DOM
document.addEventListener('DOMContentLoaded', iniciarDominus);

function quitarSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('splash-fade-out');
        setTimeout(() => {
            splash.style.display = 'none';
            if (typeof Interfaz !== 'undefined') Interfaz.show('dashboard');
            
            // 🔊 Opcional: Sonido sutil de "Éxito"
            if (typeof DominusAudio !== 'undefined') DominusAudio.play('add'); 
        }, 600); 
    }
}

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
    
resetTotal() {
    // Usamos tu nueva función de confirmación estilizada
    Interfaz.confirmarAccion(
        "⚠️ ¡ZONA DE PELIGRO!", // Título
        "¿Estás absolutamente seguro de borrar TODO? Se eliminarán ventas, gastos, fiaos e inventario de forma permanente.", // Mensaje
        () => { 
            // Acción si confirma
            localStorage.clear();
            notificar("Aplicación reiniciada por completo", "error");
            setTimeout(() => location.reload(), 1500); 
        },
        () => {
            // Acción si cancela (opcional)
            console.log("Reinicio abortado por el usuario.");
        },
        "BORRAR TODO", // Texto botón confirmar
        "CANCELAR",    // Texto botón cancelar
        true           // esPeligroso = true (Esto pone el modal en modo rojo/alerta)
    );
    }
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log("Dominus PWA: Lista"))
        .catch(err => console.log("Error en SW:", err));
}



window.DOMINUS = DOMINUS;

