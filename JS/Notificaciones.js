// Pon esto fuera o dentro de Notificaciones, pero que se ejecute al inicio
/**
 * Escucha directivas en tiempo real desde Firebase.
 * Permite control remoto de la aplicación.
 */
function escucharComandosGlobales() {
    console.log("🛰️ Mando Central: Conectado al satélite de datos...");

    // 1. MODO MANTENIMIENTO (Kill Switch)
    Cloud.db.ref('config_global/mantenimiento').on('value', (snap) => {
        if (snap.val() === true) {
            document.body.innerHTML = `
                <div class="pantalla-mantenimiento">
                    <div class="mantenimiento-icon">⚒️</div>
                    <h1 class="mantenimiento-titulo">MANTENIMIENTO</h1>
                    <p style="font-size:1.2rem; margin-top:15px; opacity:0.8;">
                        El Gran Maestro está ajustando los engranajes.
                    </p>
                    <p style="color:#666; font-size:0.9rem; margin-top:5px;">
                        DOMINUS volverá a estar en línea pronto.
                    </p>
                    <div class="pulsor-mantenimiento"></div>
                </div>
            `;
            // Bloqueamos cualquier interacción adicional
            window.stop(); 
        }
    });

    // 2. BROADCAST GLOBAL (Sistema de Anuncios)
    Cloud.db.ref('config_global/anuncio').on('value', (snap) => {
        const anuncio = snap.val();
        
        if (anuncio && anuncio.mensaje) {
            // Validamos frescura del mensaje (máximo 24h)
            const hace24Horas = Date.now() - (24 * 60 * 60 * 1000);
            const esReciente = anuncio.timestamp > hace24Horas;
            
            if (esReciente && typeof Notificaciones !== 'undefined') {
                Notificaciones.lanzarAnuncioVisual(
                    "📢 ANUNCIO GLOBAL", 
                    anuncio.mensaje, 
                    "var(--primary)"
                );
            }
        } else {
            // Limpieza automática si el administrador retira el anuncio
            const cardExistente = document.getElementById('anuncio-activo');
            if (cardExistente) {
                cardExistente.style.transform = 'translateX(120%)';
                setTimeout(() => cardExistente.remove(), 600);
            }
        }
    });
}

const Notificaciones = {
    // Base de datos de conocimiento
    tips: [
        { id: 1, titulo: "Regla del 80/20", texto: "El 80% de tus ventas vienen del 20% de tus productos. ¡Identifícalos!", categoria: "negocios" },
        { id: 2, titulo: "Stock de Seguridad", texto: "No esperes a tener 0 para comprar. El stock mínimo evita perder ventas.", categoria: "inventario" },
        { id: 3, titulo: "Fiaos bajo control", texto: "Revisar tus cuentas por cobrar cada mañana mejora tu flujo de caja.", categoria: "finanzas" },
        { id: 4, titulo: "Atención al Cliente", texto: "Un cliente satisfecho vuelve, pero uno bien atendido te recomienda.", categoria: "ventas" }
    ],

    init() {
        this.revisarTodo();
        this.solicitarPermisoNativo();
        this.programarEventosGlobales();
        console.log("DOMINUS: Centinela de notificaciones activo.");
    },

    // --- NIVEL 1: BURBUJAS (DENTRO DE LA APP) ---
    revisarTodo() {
        this.checkStock();
        this.checkFiaos();
        this.checkCierre();
    },

  /**
 * Monitorea productos con bajo stock.
 */
checkStock() {
    const badge = document.getElementById('badge-stock');
    
    // 🛡️ Blindaje: Si no hay badge, no hay inventario o ya se vió, limpiamos y salimos
    if (!badge || typeof Inventario === 'undefined' || this.vistoStock) {
        if (badge) badge.classList.remove('active');
        return;
    }
    
    const criticos = Inventario.productos.filter(p => {
        const cant = parseFloat(p.cantidad) || 0;
        const min = parseFloat(p.stockMinimo) || 3; // 3 es el estándar de seguridad
        return cant <= min;
    });
    
    if (criticos.length > 0) {
        badge.innerText = criticos.length;
        badge.classList.add('active');
    } else {
        badge.classList.remove('active');
    }
},

/**
 * Monitorea la cantidad de deudas (Fiaos) activas.
 */
checkFiaos() {
    const badge = document.getElementById('badge-fiaos');
    
    // 🛡️ Si ya se revisó la sección de fiaos, ocultamos la burbuja
    if (!badge || this.vistoFiaos) {
        if (badge) badge.classList.remove('active');
        return;
    }

    // Cargamos datos de fiaos de manera segura
    const datos = (typeof Persistencia !== 'undefined') ? (Persistencia.cargar('dom_fiaos') || []) : [];
    
    if (datos.length > 0) {
        // Si hay más de 9 deudas, mostramos +9 para no romper el diseño circular
        badge.innerText = datos.length > 9 ? "+9" : datos.length;
        badge.classList.add('active');
    } else {
        badge.classList.remove('active');
    }
},

  /**
 * Marca una sección como vista para limpiar las notificaciones visuales.
 */
marcarComoLeido(seccion) {
    if (seccion === 'fiaos') this.vistoFiaos = true;
    if (seccion === 'inventario') this.vistoStock = true;
    
    // Feedback inmediato: refresca todas las burbujas
    this.revisarTodo(); 
},

/**
 * Resetea el estado de lectura. Útil cuando ocurre un evento nuevo 
 * (ej: alguien fía o el stock baja de un nuevo límite).
 */
resetVisto(seccion) {
    if (seccion === 'fiaos') this.vistoFiaos = false;
    if (seccion === 'inventario') this.vistoStock = false;
    
    this.revisarTodo();
},

/**
 * Centinela de tiempo: Avisa si es hora de cerrar caja y aún no se ha hecho.
 */
checkCierre() {
    const badge = document.getElementById('badge-inicio');
    if (!badge) return;

    const ahora = new Date();
    // Verificamos si el módulo de Ventas ya registró el cierre de hoy
    const yaCerro = (typeof Ventas !== 'undefined') ? Ventas.cierreRealizado : false;

    // A partir de las 6:00 PM (18:00h) se activa la alerta si no hay cierre
    if (ahora.getHours() >= 18 && !yaCerro) {
        badge.classList.add('active'); 
        // Podríamos poner un icono de exclamación o "!" en el texto
        badge.innerText = "!";
    } else {
        badge.classList.remove('active');
        badge.innerText = "";
    }
},

    /**
 * Lanza una tarjeta informativa aleatoria desde un lateral.
 */
lanzarTipFlotante() {
    // Aseguramos que haya tips disponibles
    if (!this.tips || this.tips.length === 0) return;

    const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
    
    const card = document.createElement('div');
    card.className = 'card-tip-flotante';

    card.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center;">
            <span style="font-size:1.8em;">💡</span>
            <div>
                <strong class="tip-label">¿Sabías que?</strong>
                <h4 class="tip-titulo">${tip.titulo}</h4>
                <p class="tip-texto">${tip.texto}</p>
            </div>
        </div>
    `;

    document.body.appendChild(card);

    // Animación de entrada con un pequeño delay para el DOM
    setTimeout(() => card.classList.add('show'), 100);

    const remover = () => {
        card.classList.remove('show');
        setTimeout(() => card.remove(), 600);
    };

    // Auto-remover en 12 segundos
    const autoRemover = setTimeout(remover, 12000);

    // Permitir cerrar al hacer clic
    card.onclick = () => {
        clearTimeout(autoRemover);
        remover();
    };
},

/**
 * Solicita permiso al sistema operativo para enviar notificaciones push.
 */
solicitarPermisoNativo() {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("🚀 Permisos de notificación concedidos.");
                }
            });
        }
    }
},

/**
 * Envía una notificación nativa al sistema (incluso si la app está en segundo plano).
 */
enviarNotificacionNativa(titulo, mensaje) {
    // --- 🔊 INYECCIÓN DE AUDIO DOMINUS ---
    // Si el título menciona "Stock" o "Reposición", disparamos el audio específico
    if (typeof notificar === 'function') {
        if (titulo.toLowerCase().includes("stock") || titulo.toLowerCase().includes("reposición")) {
            notificar(mensaje, "stock"); // Esto activará DominusAudio.play('stockBajito')
        } else {
            notificar(mensaje, "alerta"); // Audio de alerta general para otros casos
        }
    }

    if ("Notification" in window && Notification.permission === "granted") {
        // Usamos el Service Worker para mayor estabilidad en móviles
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(`DOMINUS: ${titulo}`, {
                body: mensaje,
                icon: 'IMG/icon-512.png',    // Ruta del icono principal
                badge: 'IMG/icon-192.png',   // Icono para la barra de estado
                vibrate: [200, 100, 200],    // Patrón de vibración [vibrar, pausa, vibrar]
                tag: 'dominus-alerta',       // Evita duplicados
                renotify: true               // Fuerza la notificación visual
            });
        });
    }
},

// Añade esto dentro de tu objeto Notificaciones
async capturarDireccionPush(uuid) {
    // 💡 LOG: Para que sepas que se llamó pero no rompió nada
    console.log("ℹ️ DOMINUS: Captura Push saltada (Priorizando WhatsApp)");
    
    // Devolvemos una promesa resuelta con null para que el 'await' no se quede trabado
    return Promise.resolve(null); 
},

 /**
 * Orquestador de eventos temporales.
 * Maneja el cronograma de tips y alertas nativas.
 */
programarEventosGlobales() {
    console.log("⏰ Cronos: Ciclo de eventos automáticos iniciado...");

    // 1. Ciclo de Tips Flotantes (Cada 15 minutos)
    // Mantiene la aplicación dinámica y ofrece consejos útiles.
    setInterval(() => {
        if (typeof this.lanzarTipFlotante === 'function') {
            this.lanzarTipFlotante();
        }
    }, 15 * 60 * 1000);

    // 2. Monitor de Alertas Horarias (Chequeo cada minuto)
    setInterval(() => {
        const ahora = new Date();
        const hora = ahora.getHours();
        const minuto = ahora.getMinutes();

        // A. ALERTA DE CIERRE (7:00 PM - 19:00h)
        const yaCerro = (typeof Ventas !== 'undefined') ? Ventas.cierreRealizado : false;
        if (hora === 19 && minuto === 0 && !yaCerro) {
            this.enviarNotificacionNativa(
                "Hora del Cierre 📊", 
                "Es momento de registrar las ventas totales del día."
            );
        }

        // B. TIP NATIVO DE LA MAÑANA (10:00 AM)
        // Ideal para motivar o recordar tareas de apertura.
        if (hora === 10 && minuto === 0) {
            if (this.tips && this.tips.length > 0) {
                const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
                this.enviarNotificacionNativa("Dominus: Tip del día 💡", tip.texto);
            }
        }

    }, 60000); // El chequeo se hace cada minuto para no perder la ventana de tiempo
},


    

  /**
 * Escucha las directivas en tiempo real desde Firebase (Mando Central).
 * @param {string} uuid - El identificador único del usuario (tu papá).
 */
escucharMandoCentral(uuid) {
    if (!uuid) return;

    console.log("📡 Radar de Notificaciones: Sincronizado.");

    // 1. ESCUCHAR MENSAJES PRIVADOS 
    Cloud.db.ref(`usuarios/${uuid}/comunicacion/mensajeDirecto`).on('value', (snap) => {
        const data = snap.val();
        if (data && !data.leido) {
            this.lanzarAnuncioVisual("✉️ MENSAJE PRIVADO", data.texto, "var(--accent)");
        }
    });

    // 2. ESCUCHAR ANUNCIOS GLOBALES 
    Cloud.db.ref('config_global/anuncio').on('value', (snap) => {
        const anuncio = snap.val();
        if (anuncio && anuncio.mensaje) {
            const esReciente = (Date.now() - anuncio.timestamp) < (24 * 60 * 60 * 1000);
            if (esReciente) {
                this.lanzarAnuncioVisual("📢 ANUNCIO GLOBAL", anuncio.mensaje, "var(--primary)");
                this.enviarNotificacionNativa("DOMINUS: Anuncio Global", anuncio.mensaje);
            }
        }
    });
},
/**
 * Lanza la interfaz visual táctil para los anuncios.
 */
lanzarAnuncioVisual(titulo, texto, colorBorde) {
    if (document.getElementById('anuncio-activo')) return;

    const card = document.createElement('div');
    card.id = 'anuncio-activo';
    card.className = 'card-anuncio-interactiva';
    card.style.borderLeft = `6px solid ${colorBorde}`;

    card.innerHTML = `
        <div style="display:flex; gap:12px; align-items:flex-start;">
            <div class="anuncio-icono-box" style="background:${colorBorde};">
                <span style="font-size:1.3em;">⚡</span>
            </div>
            <div style="flex:1;">
                <strong class="anuncio-texto-header" style="color:${colorBorde};">${titulo}</strong>
                <p class="anuncio-texto-body">${texto}</p>
                <small style="display:block; margin-top:8px; opacity:0.4; font-size:0.7em;">Desliza para cerrar</small>
            </div>
        </div>
    `;

    document.body.appendChild(card);
    setTimeout(() => card.classList.add('show'), 100);

    // --- LÓGICA DE SWIPE (TACTIL) ---
    let startX = 0;
    const cerrar = () => {
        card.classList.remove('show');
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 600);
    };

    card.onclick = cerrar;

    card.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    }, {passive: true});

    card.addEventListener('touchmove', (e) => {
        let diff = e.touches[0].clientX - startX;
        if (diff > 0) { // Solo permite arrastrar hacia la derecha
            card.style.transform = `translateX(${diff}px)`;
            card.style.opacity = 1 - (diff / 300);
        }
    }, {passive: true});

    card.addEventListener('touchend', (e) => {
        let diff = e.changedTouches[0].clientX - startX;
        if (diff > 100) {
            cerrar();
        } else {
            card.style.transform = `translateX(0)`;
            card.style.opacity = '1';
        }
    });
}
};