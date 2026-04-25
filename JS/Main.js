const rangosTallas = { //aqui se definen que numeros pertenecen a cada categoria-se conecta con filtrar tallas
    'ninos-peq': [18,19,20,21,22,23,24,25],
    'ninos-gra': [26,27,28,29,30,31,32],
    'juvenil': [33,34,35,36,37,38,39],
    'caballero': [40,41,42,43,44,45]
};

window.PERFIL_DOMINUS = (() => {
    try {
        const ram = navigator.deviceMemory || 4; 
        const cpu = navigator.hardwareConcurrency || 4;
        const conexion = navigator.connection ? navigator.connection.effectiveType : '4g';

        if (ram < 2 || cpu <= 2 || conexion.includes('2g') || conexion.includes('3g')) {
            return "BAJO";
        } else if (ram >= 4 && cpu >= 6) {
            return "ALTO";
        }
        return "MEDIO";
    } catch (e) {
        console.warn("DOMINUS: Fallo en detección de hardware, usando modo seguro (MEDIO).");
        return "MEDIO"; // EL SALTO DE EMERGENCIA
    }
})();

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





window.DOMINUS = DOMINUS;

const notificar = (msj, tipo = 'exito') => {
    // 1. Lógica de Audio Centralizada 🔊
    if (typeof DominusAudio !== 'undefined') {
        switch (tipo) {
            case 'error':
            case 'alerta':
                DominusAudio.play('error');
                break;
            case 'stock':
                // Mantenemos el silencio de stock para no aturdir
                console.warn("DOMINUS (Silencio de Stock):", msj);
                break;
            default:
                DominusAudio.play('add');
                break;
        }
    }

    // 2. Gestión de la interfaz (Toast Superior)
    // 🛡️ BLINDAJE: Buscamos cualquier toast existente para que no se amontonen arriba
    const toastActivo = document.querySelector('.toast-general');
    if (toastActivo) toastActivo.remove();

    const toast = document.createElement('div');
    // Aplicamos la base para posición y la específica para color
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
    
    // Ejecutamos la animación de entrada
    setTimeout(() => toast.classList.add('show'), 10);
    
    // ⏳ TIEMPO DE VIDA: 3 segundos es el estándar ideal para leer sin estorbar
    setTimeout(() => {
        toast.classList.remove('show');
        // Esperamos a que termine la animación de subida para borrarlo del DOM
        setTimeout(() => toast.remove(), 400);
    }, 3000); 
};


function AbrirGestorTallas() {
    const contenedor = document.getElementById('contenedor-filas-tallas');
    const unidadPrincipal = document.getElementById('inv-unidad')?.value || 'Und';
    if(!contenedor) return;

    // 🛡️ BLINDAJE: Si vamos a desglosar, aseguramos que tallasTemporales 
    // refleje lo que ya tiene el input de cantidad o lo que ya estaba guardado.
    // Si quieres empezar de cero, usa: window.tallasTemporales = {};
    if (typeof tallasTemporales === 'undefined') window.tallasTemporales = {};
    
    contenedor.innerHTML = `
        <div id="selector-categoria-tallas" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:15px;">
            <button onclick="GenerarInputsDinamicos('calzado')" class="btn-mini" style="background:rgba(255,255,255,0.1); color:white; padding:10px; border-radius:5px; border:1px solid #444;">👟 Calzado</button>
            <button onclick="GenerarInputsDinamicos('ropa')" class="btn-mini" style="background:rgba(255,255,255,0.1); color:white; padding:10px; border-radius:5px; border:1px solid #444;">👕 Ropa</button>
            <button onclick="GenerarInputsDinamicos('peso')" class="btn-mini" style="background:rgba(255,255,255,0.1); color:white; padding:10px; border-radius:5px; border:1px solid #444;">⚖️ Peso</button>
            <button onclick="GenerarInputsDinamicos('pacas')" class="btn-mini" style="background:rgba(255,255,255,0.1); color:white; padding:10px; border-radius:5px; border:1px solid #444;">📦 Pacas</button>
        </div>

        <div id="bloque-filtro-contenedor" style="margin-bottom: 15px; display:none;">
            <select id="inv-bloque-rango" class="glass" 
                    style="width:100%; padding:10px; border:1px solid var(--primary); background:#111; color:white; border-radius:8px;"
                    onchange="Interfaz.filtrarTallasPorBloque(this.value)">
                <option value="todos">-- Todas las Tallas --</option>
                <option value="ninos-peq">Niños (18-25)</option>
                <option value="ninos-gra">Niños Grandes (26-32)</option>
                <option value="juvenil">Juvenil (33-39)</option>
                <option value="caballero">Caballero (40-45)</option>
            </select>
        </div>
        <div id="lista-tallas-dinamica" style="max-height: 350px; overflow-y: auto; padding: 5px; border-radius:10px; background:rgba(0,0,0,0.2);"></div>
    `;
    
    // Auto-detección por unidad
    const mapaUnidades = { 'Kg': 'peso', 'Lts': 'liquido', 'Talla': 'calzado', 'Paca': 'pacas' };
    GenerarInputsDinamicos(mapaUnidades[unidadPrincipal] || 'calzado');

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

function CerrarGestorTallas() {
    const nombreManualInput = document.getElementById('manual-nombre-din');
    const cantidadManualInput = document.getElementById(`input-dinamico-Manual`);
    
    const valorNombre = nombreManualInput?.value.trim();
    const cantManual = parseFloat(cantidadManualInput?.value) || 0;
    
    // 🛡️ Lógica de guardado manual blindada
    if (valorNombre && cantManual > 0) {
        const unidad = document.getElementById('inv-unidad').value;
        const sufijo = (unidad === 'Kg') ? 'g' : (unidad === 'Lts' ? 'ml' : '');
        
        // Evitamos guardar con la key 'Manual', usamos el nombre real
        tallasTemporales[valorNombre + sufijo] = cantManual;
        delete tallasTemporales['Manual']; 
    }

    // 🛡️ Limpieza de basura: eliminamos lo que tenga stock 0
    Object.keys(tallasTemporales).forEach(key => {
        if (tallasTemporales[key] <= 0 || key === 'Manual') delete tallasTemporales[key];
    });

    // 🚀 Sincronización con el formulario principal
    const total = Object.values(tallasTemporales).reduce((a, b) => a + b, 0);
    const inputCant = document.getElementById('inv-cant');
    
    if(inputCant) {
        // Si es peso, mantenemos decimales; si es unidad, redondeamos
        const unidad = document.getElementById('inv-unidad').value;
        inputCant.value = (unidad === 'Kg' || unidad === 'Lts') ? total.toFixed(3) : total;
    }

    document.getElementById('modal-gestor-tallas').style.display = 'none';
    if(total > 0) notificar(`✅ ${total} desglosados correctamente`);
}



// Detección de potencia del teléfono





// Vinculamos el inicio al cargar el DOM


function efectoEscritura(elemento, texto, velocidad = 50) {
    return new Promise((resolve) => {
        let i = 0;
        elemento.innerText = ""; // Limpiamos el "Preparando ecosistema..." por defecto
        
        function escribir() {
            if (i < texto.length) {
                elemento.innerHTML += texto.charAt(i);
                i++;
                setTimeout(escribir, velocidad);
            } else {
                resolve(); // Notifica que terminó de escribir
            }
        }
        escribir();
    });
}

// --- FUNCIONES DE ARRANQUE Y CARGA ---

async function iniciarCargaSistemas() {
    console.log("⚙️ DOMINUS: Acceso verificado. Sincronizando entorno...");
    
    // 🚩 CLAVE: El sistema se detiene aquí hasta que la última letra de la frase aparezca
    if (window.promesaEscritura) {
        await window.promesaEscritura;
    }

    // Al terminar la promesa de arriba, el autor ya se hace visible
    console.log("⏱️ Frase completa y autor en pantalla. Iniciando conteo de 5s para finalizar...");
    
    // 🛡️ RE-ESCANEAMIENTO DE SEGURIDAD
    if (typeof Notificaciones !== 'undefined') {
        Notificaciones.revisarTodo();
    }

    // Espera de 5 segundos de cortesía tras la animación
    setTimeout(() => {
        finalizarArranque();
        
        // 💡 LANZAMIENTO DEL PRIMER TIP (Sincronizado con la nueva lógica visual)
        setTimeout(() => {
            if (typeof Notificaciones !== 'undefined' && Notificaciones.tips) {
                const tip = Notificaciones.tips[Math.floor(Math.random() * Notificaciones.tips.length)];
                // Usamos la nueva función visual persistente
                Notificaciones.lanzarAnuncioVisual(`💡 TIP: ${tip.titulo}`, tip.texto, "var(--accent)");
            }
        }, 2000);

    }, 5000); 
}

function finalizarArranque() {
    const splash = document.getElementById('splash-screen');
    const nav = document.querySelector('.bottom-nav');

    if (splash) {
        splash.classList.add('splash-fade-out');
        
        setTimeout(() => {
            splash.style.display = 'none';
            
            // 🚀 MOSTRAR EL MENÚ DE NAVEGACIÓN
            if (nav) {
                nav.classList.add('nav-visible');
            }
            
            // Mostramos el dashboard
            if (typeof Interfaz !== 'undefined') Interfaz.show('dashboard');
            
            // Sonido y Bienvenida
            if (typeof DominusAudio !== 'undefined') {
                DominusAudio.play('add'); 
                DominusAudio.saludarSegunHora();
            }
            
            notificar("Conexión establecida", "exito");
        }, 800); 
    }
}

async function iniciarDominus() {
    try {
        console.log("🚀 Dominus: Iniciando sistema...");

        // A. CONFIGURACIÓN VISUAL INICIAL
        const isDark = Persistencia.cargar('dom_dark_mode');
        if (isDark) {
            document.body.classList.add('dark-mode');
            const checkDark = document.getElementById('checkDarkMode');
            if (checkDark) checkDark.checked = true;
        }

        // B. PREPARACIÓN DE DATOS Y SESIÓN
        const haySesionLocal = Usuario.init(); 

        if (typeof bancoFrases !== 'undefined' && bancoFrases.length > 0) {
            const txtFrase = document.getElementById('frase-splash');
            const txtAutor = document.getElementById('autor-splash');
            
            if (txtFrase) {
                let seleccion;
                const diaUso = haySesionLocal ? Usuario.obtenerDiasDeUso() : 0;
                
                // 🧠 Lógica de Inducción Dominus
                const frasesInduccion = {
                    5:  { texto: "En solo 5 días, tu negocio ya respira el orden de DOMINUS. El control es el primer paso al éxito.", autor: "EQUIPO DOMINUS" },
                    10: { texto: "10 días transformando datos en decisiones. Tu disciplina y DOMINUS son el equipo perfecto.", autor: "EQUIPO DOMINUS" },
                    14: { texto: "Mañana se cumplen 15 días de evolución. Mira atrás y observa cuánto ha crecido tu claridad operativa.", autor: "EQUIPO DOMINUS" },
                    15: { texto: "Hoy celebramos 15 días de una nueva era educativa en tu negocio. No pierdas el enfoque.", autor: "EQUIPO DOMINUS" }
                };

                if (frasesInduccion[diaUso]) {
                    seleccion = frasesInduccion[diaUso];
                } else {
                    seleccion = bancoFrases[Math.floor(Math.random() * bancoFrases.length)];
                }

                window.promesaEscritura = efectoEscritura(txtFrase, `"${seleccion.texto}"`, 40);

                window.promesaEscritura.then(() => {
                    if (txtAutor) {
                        txtAutor.innerText = `— ${seleccion.autor || 'DOMINUS AI'}`;
                        txtAutor.style.opacity = "0";
                        txtAutor.style.transition = "opacity 1s";
                        setTimeout(() => txtAutor.style.opacity = "1", 100);
                    }
                });
            }
        }

        // C. CONTROL DE ACCESO
        if (haySesionLocal) {
            if (typeof Interfaz !== 'undefined' && Interfaz.actualizarAvatarHeader) {
                Interfaz.actualizarAvatarHeader(Usuario.datos);
            }

            const accesoConcedido = await Seguridad.iniciarProteccion();
            
            if (accesoConcedido) {
                console.log("🔓 Acceso concedido. Sincronizando Mando Central...");

                // 🔥 ACTIVACIÓN DE COMUNICACIÓN CON ADMIN
                if (typeof Usuario !== 'undefined' && Usuario.datos) {
                    Usuario.actualizarPresencia(); 
                    
                    // Activamos el "oído" para mensajes y anuncios globales
                    if (typeof Notificaciones !== 'undefined' && Notificaciones.escucharMandoCentral) {
                        Notificaciones.escucharMandoCentral(Usuario.datos.uid); 
                    }
                }

                // 🔴 MODO MANTENIMIENTO GLOBAL
                if (typeof escucharComandosGlobales === 'function') {
                    escucharComandosGlobales();
                }

                // D. CARGA DE DATOS LOCALES
                window.DOMINUS.historial = Persistencia.cargar('dom_ventas') || [];
                window.DOMINUS.deudas = Persistencia.cargar('dom_fiaos') || [];
                window.DOMINUS.gastos = Persistencia.cargar('dom_gastos') || [];

                if (typeof Notificaciones !== 'undefined') {
                    Notificaciones.init();
                }

                // E. CONFIGURACIÓN DE INVENTARIO
                const configGuardada = localStorage.getItem('dom_config');
                let invActivo = (configGuardada === null) ? true : JSON.parse(configGuardada).invActivo;
                
                if (configGuardada === null) {
                    localStorage.setItem('dom_config', JSON.stringify({ invActivo: true }));
                }

                if(typeof Inventario !== 'undefined') {
                    Inventario.activo = invActivo;
                    const checkInv = document.getElementById('check-inv-ajustes') || document.getElementById('check-inv');
                    if (checkInv) checkInv.checked = invActivo;
                    if (Inventario.init) Inventario.init();
                }

                // F. PREFERENCIAS Y AUTO-LLENADO
                if (typeof Controlador !== 'undefined' && Controlador.verificarPreferenciaPunto) {
                    Controlador.verificarPreferenciaPunto();
                }

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

                if (typeof Usuario !== 'undefined' && Usuario.cargarAjustes) {
                    Usuario.cargarAjustes();
                }

                // 🚀 LANZADOR FINAL
                iniciarCargaSistemas();
                
            } else {
                notificar("PIN incorrecto o cancelado", "error");
                setTimeout(() => location.reload(), 2000);
            }
        } else {
            if (!navigator.onLine) {
                notificar("Internet requerido para activación", "alerta");
            } else {
                Usuario.mostrarLogin();
            }
        }

    } catch (error) {
        console.error("❌ Fallo crítico en el arranque de Dominus:", error);
        if (typeof finalizarArranque === 'function') finalizarArranque();
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log("Dominus PWA: Lista"))
        .catch(err => console.log("Error en SW:", err));
}

// Pon esto fuera o dentro de Notificaciones, pero que se ejecute al inicio
function escucharComandosGlobales() {
    console.log("🛰️ Mando Central: Escuchando directivas globales...");

    // 1. MODO MANTENIMIENTO (Bloqueo Total)
    // Usamos Cloud.db que es la instancia real de tu Firebase
    Cloud.db.ref('config_global/mantenimiento').on('value', (snap) => {
        if (snap.val() === true) {
            document.body.innerHTML = `
                <div style="height:100vh; display:flex; align-items:center; justify-content:center; background:#050505; color:white; text-align:center; flex-direction:column; font-family:sans-serif; padding:20px;">
                    <div style="font-size:4rem; margin-bottom:20px;">⚒️</div>
                    <h1 style="color:#ff3333; letter-spacing:5px; margin:0;">MANTENIMIENTO</h1>
                    <p style="font-size:1.2rem; margin-top:15px; opacity:0.9;">El Gran Maestro está ajustando los engranajes.</p>
                    <p style="color:#666; font-size:0.9rem;">DOMINUS volverá a estar en línea pronto.</p>
                    <div style="margin-top:30px; width:50px; height:2px; background:#ff3333; border-radius:2px; animation: pulse 1.5s infinite;"></div>
                </div>
                <style>
                    @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
                </style>
            `;
        }
    });

    // 2. BROADCAST GLOBAL (Anuncios en Tarjeta)
    // Sincronizado con la ruta 'config_global/anuncio' que usa tu Admin
    Cloud.db.ref('config_global/anuncio').on('value', (snap) => {
        const anuncio = snap.val();
        
        if (anuncio && anuncio.mensaje) {
            // Validamos que el anuncio sea de las últimas 24 horas para no mostrar spam viejo
            const esReciente = (Date.now() - anuncio.timestamp) < (24 * 60 * 60 * 1000);
            
            if (esReciente && typeof Notificaciones !== 'undefined') {
                // Lanzamos la tarjeta visual que diseñamos con swipe
                Notificaciones.lanzarAnuncioVisual(
                    "📢 ANUNCIO GLOBAL", 
                    anuncio.mensaje, 
                    "var(--primary)"
                );
            }
        } else {
            // Si el Admin borró el anuncio (null), quitamos la tarjeta si existe
            const cardExistente = document.getElementById('anuncio-activo');
            if (cardExistente) {
                cardExistente.style.right = '-450px';
                setTimeout(() => cardExistente.remove(), 600);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', iniciarDominus);


