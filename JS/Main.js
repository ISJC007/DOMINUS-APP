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
    // 🛡️ Llamada al componente de confirmación estilizado
    Interfaz.confirmarAccion(
        "⚠️ ZONA DE PELIGRO CRÍTICO", 
        "¿Estás seguro de borrar TODO? Se perderán ventas, gastos, fiaos e inventario permanentemente. Esta acción no se puede deshacer.", 
        () => { 
            // 🚀 INICIO DEL PROCESO DE PURGA
            
            // 1. Efecto visual de limpieza inmediata
            document.body.innerHTML = `
                <div class="overlay-reset">
                    <div style="text-align:center;">
                        <h2 style="color:#ff4444;">PURGANDO DOMINUS...</h2>
                        <p style="opacity:0.6;">Reiniciando base de datos local</p>
                    </div>
                </div>
            `;

            // 2. Limpieza de datos
            localStorage.clear();
            
            // 3. Feedback auditivo si está disponible
            if (typeof AudioDOMINUS !== 'undefined') AudioDOMINUS.reproducir('sonido-error');

            // 4. Recarga limpia tras un breve delay para asegurar la persistencia
            setTimeout(() => {
                location.reload();
            }, 1800); 
        },
        () => {
            console.log("%c🛡️ Reinicio abortado: Los datos están a salvo.", "color: #4caf50; font-weight: bold;");
        },
        "SÍ, BORRAR TODO", 
        "NO, CANCELAR",
        true // Activa el modo modal-peligro en la Interfaz
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


/**
 * Abre el gestor de tallas de forma global.
 * Definida como function para asegurar visibilidad en el scope global.
 */
function AbrirGestorTallas() {
    const contenedor = document.getElementById('contenedor-filas-tallas');
    const unidadPrincipal = document.getElementById('inv-unidad')?.value || 'Und';
    if(!contenedor) return;

    // 🛡️ BLINDAJE: Persistencia de datos temporales en el objeto global window
    if (typeof window.tallasTemporales === 'undefined') {
        window.tallasTemporales = {};
    }
    
    // Inyección de estructura HTML usando las clases de CSS
    contenedor.innerHTML = `
        <div id="selector-categoria-tallas" class="contenedor-categorias-tallas">
            <button onclick="GenerarInputsDinamicos('calzado')" class="btn-categoria-talla"><span>👟</span> Calzado</button>
            <button onclick="GenerarInputsDinamicos('ropa')" class="btn-categoria-talla"><span>👕</span> Ropa</button>
            <button onclick="GenerarInputsDinamicos('peso')" class="btn-categoria-talla"><span>⚖️</span> Peso</button>
            <button onclick="GenerarInputsDinamicos('pacas')" class="btn-categoria-talla"><span>📦</span> Pacas</button>
        </div>

        <div id="bloque-filtro-contenedor" style="display:none;">
            <select id="inv-bloque-rango" class="glass select-rango-estilizado" 
                    onchange="Interfaz.filtrarTallasPorBloque(this.value)">
                <option value="todos">-- Todas las Tallas --</option>
                <option value="ninos-peq">Niños (18-25)</option>
                <option value="ninos-gra">Niños Grandes (26-32)</option>
                <option value="juvenil">Juvenil (33-39)</option>
                <option value="caballero">Caballero (40-45)</option>
            </select>
        </div>

        <div id="lista-tallas-dinamica" class="lista-tallas-dinamica-scroll"></div>
    `;
    
    // --- AUTO-DETECCIÓN POR UNIDAD ---
    const mapaUnidades = { 
        'Kg': 'peso', 
        'Lts': 'liquido', 
        'Talla': 'calzado', 
        'Paca': 'pacas' 
    };

    const categoriaSugerida = mapaUnidades[unidadPrincipal] || 'calzado';
    
    // Generación inicial basada en la unidad detectada
    GenerarInputsDinamicos(categoriaSugerida);

    // Activación del Modal
    const modal = document.getElementById('modal-gestor-tallas');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Genera los inputs según la categoría seleccionada (Calzado, Ropa, etc.)
 * Mantenida como función global para acceso desde el HTML.
 */
function GenerarInputsDinamicos(tipo) {
    const lista = document.getElementById('lista-tallas-dinamica');
    const filtroContenedor = document.getElementById('bloque-filtro-contenedor');
    if(!lista) return;
    
    // Limpiamos la lista actual
    lista.innerHTML = '';

    // Gestión del filtro de rangos (solo para calzado)
    if(filtroContenedor) {
        filtroContenedor.style.display = (tipo === 'calzado') ? 'block' : 'none';
    }

    // --- CONFIGURACIÓN DE ESCALAS ---
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

    // --- RENDERIZADO DINÁMICO ---
    configuracion.forEach(talla => {
        const div = document.createElement('div');
        div.className = 'fila-talla'; 
        div.setAttribute('data-talla', talla); 
        
        // Creamos un ID seguro para el DOM
        const inputId = `input-dinamico-${talla.toString().replace(/\s+/g, '-')}`;

        if (talla === 'Manual') {
            const unidadPrincipal = document.getElementById('inv-unidad')?.value || 'Und';
            const sufijoSug = (unidadPrincipal === 'Kg') ? 'g' : (unidadPrincipal === 'Lts' ? 'ml' : '');

            div.innerHTML = `
                <div class="contenedor-manual-dinamico">
                    <label class="label-micro-primary" style="margin-bottom:5px; display:block;">
                        VALOR PERSONALIZADO (${sufijoSug}):
                    </label>
                    <div style="display:flex; gap:8px;">
                        <input type="number" id="manual-nombre-din" placeholder="Ej: 750" 
                               class="glass input-manual-nombre">
                        
                        <input type="number" id="${inputId}" placeholder="Cant" 
                               class="glass input-talla-dinamico" style="width:70px;"
                               oninput="tallasTemporales['Manual'] = parseFloat(this.value) || 0">
                    </div>
                </div>`;
        } else {
            div.innerHTML = `
                <label for="${inputId}" style="color:white; font-weight:600; font-size:0.9em;">
                    ${isNaN(talla) ? talla : 'Talla ' + talla}
                </label>
                <input type="number" 
                        id="${inputId}"
                        value="${tallasTemporales[talla] || 0}" 
                        oninput="tallasTemporales['${talla}'] = parseFloat(this.value) || 0"
                        min="0"
                        class="glass input-talla-dinamico">
            `;
        }
        lista.appendChild(div);
    });
}

/**
 * Actualiza visualmente el stock disponible cuando se cambia la talla en la venta.
 */
function actualizarStockEnVenta(nombreProducto) {
    const p = Inventario.productos.find(prod => prod.nombre === nombreProducto);
    const selectTalla = document.getElementById('v-talla');
    const infoStock = document.getElementById('info-stock-talla');
    
    if (p && p.tallas && selectTalla) {
        selectTalla.onchange = () => {
            const talla = selectTalla.value;
            const cantidad = p.tallas[talla] || 0;
            const unidad = p.unidad || 'Und';
            
            if (infoStock) {
                infoStock.innerHTML = `📦 Disponible: ${cantidad} ${unidad}`;
                
                // Feedback visual si queda poco (menos de 3 unidades)
                if (cantidad <= 3 && cantidad > 0) {
                    infoStock.classList.add('stock-critico');
                } else {
                    infoStock.classList.remove('stock-critico');
                }
            }
        };
    }
}

/**
 * Procesa los datos de tallasTemporales, limpia valores nulos y sincroniza con el inventario.
 */
function CerrarGestorTallas() {
    const nombreManualInput = document.getElementById('manual-nombre-din');
    const cantidadManualInput = document.getElementById(`input-dinamico-Manual`);
    
    const valorNombre = nombreManualInput?.value.trim();
    const cantManual = parseFloat(cantidadManualInput?.value) || 0;
    
    // 🛡️ Lógica de guardado manual: Convertimos "Manual" en un nombre real (Ej: 750g)
    if (valorNombre && cantManual > 0) {
        const unidad = document.getElementById('inv-unidad')?.value || 'Und';
        const sufijo = (unidad === 'Kg') ? 'g' : (unidad === 'Lts' ? 'ml' : '');
        
        tallasTemporales[valorNombre + sufijo] = cantManual;
        delete tallasTemporales['Manual']; 
    }

    // 🛡️ Purga de datos: Eliminamos stocks vacíos o llaves genéricas
    Object.keys(tallasTemporales).forEach(key => {
        if (tallasTemporales[key] <= 0 || key === 'Manual') {
            delete tallasTemporales[key];
        }
    });

    // 🚀 Sincronización: Calculamos el total para el input principal de cantidad
    const total = Object.values(tallasTemporales).reduce((a, b) => a + b, 0);
    const inputCant = document.getElementById('inv-cant');
    
    if (inputCant) {
        const unidad = document.getElementById('inv-unidad')?.value || 'Und';
        // Precision decimal para peso/líquido, entero para el resto
        inputCant.value = (unidad === 'Kg' || unidad === 'Lts') ? total.toFixed(3) : total;
        
        // Disparamos el evento input manualmente para que otros listeners se enteren del cambio
        inputCant.dispatchEvent(new Event('input'));
    }

    // Cierre visual
    const modal = document.getElementById('modal-gestor-tallas');
    if (modal) modal.style.display = 'none';

    if (total > 0) {
        notificar(`✅ ${total} desglosados correctamente`, "exito");
    }
}

// Detección de potencia del teléfono





// Vinculamos el inicio al cargar el DOM


function efectoEscritura(elemento, texto, velocidad = 50) {
    return new Promise((resolve) => {
        let i = 0;
        if (!elemento) return resolve(); // Salvaguarda: si el elemento no existe, no rompemos el código
        
        elemento.textContent = ""; // Usamos textContent para limpieza inicial rápida
        
        function escribir() {
            if (i < texto.length) {
                // Usamos textContent para evitar problemas con símbolos y mejorar rendimiento
                elemento.textContent += texto.charAt(i); 
                i++;
                setTimeout(escribir, velocidad);
            } else {
                // Pequeña pausa táctica de 500ms al final para que el usuario respire la frase
                setTimeout(resolve, 500); 
            }
        }
        escribir();
    });
}

// --- FUNCIONES DE ARRANQUE Y CARGA ---

async function iniciarCargaSistemas(datosUsuario = null) {
    console.log("⚙️ DOMINUS: Acceso verificado. Sincronizando entorno...");
    
    // 1. SINCRONIZACIÓN DE INTERFAZ
    // Esperamos a que la "Frase de Visión" termine de escribirse
    if (window.promesaEscritura) {
        await window.promesaEscritura;
    }

    console.log("⏱️ Frase lista. Preparando entrada triunfal...");

    // 2. INYECCIÓN DE DATOS EN MÓDULOS
    // Si recibimos datos de la nube, los repartimos a los sistemas antes de que despierten
    if (datosUsuario) {
        if (typeof Inventario !== 'undefined') Inventario.cargar(datosUsuario.inventario || []);
        if (typeof Ventas !== 'undefined') Ventas.inicializar(datosUsuario.administracion || {});
    }
    
    // 3. SEGURIDAD PASIVA
    if (typeof Notificaciones !== 'undefined') {
        // Revisamos mensajes directos, alertas de stock o pagos pendientes
        Notificaciones.revisarTodo(); 
    }

    // 4. TRANSICIÓN CINEMATOGRÁFICA
    // Bajamos a 2s para que la app se sienta rápida pero elegante
    setTimeout(() => {
        // Esta función debe ocultar el Splash y mostrar el Dashboard
        finalizarArranque(); 
        
        // 5. ENGAGEMENT (Tips de educación/negocio)
        setTimeout(() => {
            if (typeof Notificaciones !== 'undefined' && Notificaciones.tips) {
                const tip = Notificaciones.tips[Math.floor(Math.random() * Notificaciones.tips.length)];
                Notificaciones.lanzarAnuncioVisual(`💡 TIP: ${tip.titulo}`, tip.texto, "var(--accent)");
            }
        }, 1500);

    }, 2000); 
}

function finalizarArranque() {
    const splash = document.getElementById('splash-screen');
    const nav = document.querySelector('.bottom-nav');
    // 🚩 Buscamos cualquier overlay que haya quedado vivo (Login, PIN, etc)
    const overlays = document.querySelectorAll('[id^="overlay-"]');

    // 1. DISPARO DE TRANSICIÓN VISUAL
    if (splash) {
        splash.classList.add('splash-fade-out');
        splash.style.pointerEvents = 'none'; 
    }

    // Desvanecemos también los overlays si existen
    overlays.forEach(ov => {
        ov.style.transition = "opacity 0.6s ease";
        ov.style.opacity = "0";
        ov.style.pointerEvents = "none";
    });

    // 2. SINCRONIZACIÓN DE LA UI
    setTimeout(() => {
        // Limpieza física del DOM
        if (splash) splash.style.display = 'none';
        overlays.forEach(ov => ov.remove()); // 🧹 Aquí eliminamos el Login definitivamente
        
        // Revelamos la navegación
        if (nav) {
            nav.classList.add('nav-visible');
            nav.style.display = 'flex';
        }
        
        // 🚀 ACTIVACIÓN DE MÓDULOS
        try {
            if (typeof Interfaz !== 'undefined') {
                Interfaz.show('dashboard');
            }
        } catch (e) {
            console.error("⚠️ Error al mostrar Dashboard:", e);
        }
        
        // 🔊 MULTIMEDIA Y BIENVENIDA
        if (typeof DominusAudio !== 'undefined') {
            DominusAudio.play('success_unlock'); 
            DominusAudio.saludarSegunHora();
        }
        
        notificar("Ecosistema Sincronizado", "exito");
        
        // Limpieza final del Splash
        setTimeout(() => { if(splash) splash.remove(); }, 1000);

    }, 800); 
}


window.dominusIniciado = false;

async function iniciarDominus() {
    // 🚩 PROTECCIÓN: Evita que el DOMContentLoaded y Firebase disparen el inicio al mismo tiempo
    if (window.dominusIniciado) return;
    window.dominusIniciado = true;

    try {
        console.log("🚀 DOMINUS: Iniciando secuencia de arranque única...");

        // --- 1. VERIFICACIÓN DE INTEGRIDAD Y VERSIONES LOCALES ---
        const VERSION_ACTUAL = "1.0.5"; 
        const versionGuardada = Persistencia.cargar('dom_version');
        if (versionGuardada !== VERSION_ACTUAL) {
            console.log("🔄 Actualizando estructuras de datos...");
            Persistencia.guardar('dom_version', VERSION_ACTUAL);
        }

        // --- 2. CONFIGURACIÓN VISUAL INICIAL ---
        const isDark = Persistencia.cargar('dom_dark_mode');
        if (isDark) document.body.classList.add('dark-mode');

        // --- 3. CONEXIÓN Y SESIÓN (Sincronización Real con Firebase) ---
        const user = await new Promise(res => {
            const unsub = Cloud.auth.onAuthStateChanged(u => {
                unsub(); 
                res(u);
            });
        });

        Usuario.init(); 
        const haySesionLocal = (Usuario.datos && Usuario.datos.uid);

        // --- 4. LÓGICA DE BIENVENIDA (Frases y Sabiduría) ---
        if (typeof bancoFrases !== 'undefined' && bancoFrases.length > 0) {
            const txtFrase = document.getElementById('frase-splash');
            const txtAutor = document.getElementById('autor-splash');
            
            if (txtFrase) {
                const diaUso = haySesionLocal ? Usuario.obtenerDiasDeUso() : 0;
                const frasesInduccion = {
                    5:  { texto: "En solo 5 días, tu negocio ya respira el orden de DOMINUS.", autor: "EQUIPO DOMINUS" },
                    10: { texto: "10 días transformando datos en decisiones. El éxito es disciplina.", autor: "EQUIPO DOMINUS" },
                    15: { texto: "Hoy celebramos 15 días de una nueva era educativa en tu negocio.", autor: "EQUIPO DOMINUS" }
                };

                const seleccion = frasesInduccion[diaUso] || bancoFrases[Math.floor(Math.random() * bancoFrases.length)];
                const contenedorWisdom = document.getElementById('contenedor-sabiduria');
                if (contenedorWisdom) contenedorWisdom.style.opacity = "1";
                
                window.promesaEscritura = efectoEscritura(txtFrase, `"${seleccion.texto}"`, 40);
                window.promesaEscritura.then(() => {
                    if (txtAutor) {
                        txtAutor.innerText = `— ${seleccion.autor || 'DOMINUS AI'}`;
                        txtAutor.style.opacity = "0.8";
                    }
                });
            }
        }

        // --- 5. FILTRO DE SEGURIDAD Y ACCESO ---
        if (user) {
            if (!haySesionLocal) {
                console.log("📡 Sesión en nube detectada. Restaurando perfil...");
                const snapshot = await Cloud.db.ref(`usuarios/${user.uid}`).once('value');
                if (snapshot.exists()) {
                    Usuario.configurarSesion(snapshot.val());
                } else {
                    Usuario.mostrarLogin();
                    return;
                }
            }

            // [NUEVO] 🛡️ VALIDACIÓN DE VERSIÓN GLOBAL (Desde Mando Central)
            const snapConfig = await Cloud.db.ref('config_global/versionMinima').once('value');
            const versionMinima = snapConfig.val() || "1.0.0";
            
            if (VERSION_ACTUAL < versionMinima) {
                Usuario.mostrarPantallaBloqueo("⚠️ VERSIÓN OBSOLETA", `Es necesario actualizar DOMINUS a la versión ${versionMinima} para continuar.`);
                return;
            }

            // A. ¿Estado del usuario aprobado?
            if (Usuario.datos.estado !== 'aprobado') {
                console.warn("⏳ Acceso pendiente o suspendido.");
                Usuario.mostrarPantallaEspera(); // Esta función debe manejar los textos de 'suspendido' o 'pendiente'
                Usuario.verificarAprobacionAutomatica();
                return; 
            }

            // B. PASO CRÍTICO: Validación de Identidad (PIN)
            const accesoConcedido = await Seguridad.iniciarProteccion();
            
            if (accesoConcedido) {
                console.log("🔓 Identidad confirmada. Sincronizando módulos...");

                // [NUEVO] 🛰️ OÍDO DE ÓRDENES DEL MANDO CENTRAL
                // Este sensor escucha el botón de la nube (Respaldo Forzado)
                Cloud.db.ref(`usuarios/${user.uid}/seguridad/ordenServidor`).on('value', async snap => {
                    const orden = snap.val();
                    if (orden && orden.accion === 'SYNC_NOW') {
                        console.log("☁️ Mando Central solicita respaldo inmediato...");
                        // Llamamos a la función de respaldo (Asegúrate de que Cloud.subirRespaldoTotal exista)
                        if (typeof Cloud.subirRespaldoTotal === 'function') {
                            await Cloud.subirRespaldoTotal();
                            // Limpiamos la orden para que no se ejecute infinitamente
                            Cloud.db.ref(`usuarios/${user.uid}/seguridad/ordenServidor`).remove();
                            console.log("✅ Respaldo forzado completado con éxito.");
                        }
                    }
                });

                // --- 6. SINCRONIZACIÓN NUBE-LOCAL ---
                if (navigator.onLine) {
                    const invLocal = Persistencia.cargar('dom_inventario');
                    if (!invLocal || invLocal.length === 0) {
                        await Cloud.descargarRespaldo('inventario');
                        await Cloud.descargarRespaldo('ventas');
                    }
                    Usuario.actualizarPresencia();
                }

                // --- 7. CARGA DE MEMORIA ---
                window.DOMINUS.historial = Persistencia.cargar('dom_ventas') || [];
                window.DOMINUS.deudas = Persistencia.cargar('dom_fiaos') || [];

                if (typeof Notificaciones !== 'undefined') Notificaciones.init();
                if (typeof Inventario !== 'undefined') Inventario.init();

                // --- 8. LANZAMIENTO ---
                if (window.promesaEscritura) await window.promesaEscritura;
                setTimeout(() => finalizarArranque(), 800);
                
            } else {
                window.dominusIniciado = false;
                console.warn("🚫 Seguridad: Acceso denegado.");
            }
        } else {
            console.warn("☁️ Sin sesión detectada. Yendo al login.");
            window.dominusIniciado = false; 
            const loader = document.querySelector('.loader');
            if (loader) loader.style.display = 'none';
            Usuario.limpiarPantalla();
            Usuario.mostrarLogin();
        }

    } catch (error) {
        window.dominusIniciado = false;
        console.error("❌ Fallo crítico en iniciarDominus:", error);
    }
}

// Inicialización de variable de control
if (typeof window.dominusIniciado === 'undefined') {
    window.dominusIniciado = false;
}

// Disparador de inicio
document.addEventListener('DOMContentLoaded', () => {
    iniciarDominus(); 
});
// 3. Registro del Service Worker (Solo una vez)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log("🛡️ DOMINUS PWA: Escudo Offline Activo"))
        .catch(err => console.error("❌ Error en SW:", err));
}