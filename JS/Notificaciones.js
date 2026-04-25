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

   checkStock() {
        const badge = document.getElementById('badge-stock');
        if (!badge || typeof Inventario === 'undefined' || this.vistoStock) {
            if (badge && this.vistoStock) badge.classList.remove('active');
            return;
        }
        
        const criticos = Inventario.productos.filter(p => {
            const cant = parseFloat(p.cantidad) || 0;
            const min = parseFloat(p.stockMinimo) || 3;
            return cant <= min;
        });
        
        if (criticos.length > 0) {
            badge.innerText = criticos.length;
            badge.classList.add('active');
        } else {
            badge.classList.remove('active');
        }
    },

    // MODIFICAMOS checkFiaos
    checkFiaos() {
        const badge = document.getElementById('badge-fiaos');
        // Si ya lo vio, quitamos la burbuja aunque sigan existiendo deudas
        if (!badge || this.vistoFiaos) {
            if (badge) badge.classList.remove('active');
            return;
        }

        const datos = (typeof Persistencia !== 'undefined') ? (Persistencia.cargar('dom_fiaos') || []) : [];
        
        if (datos.length > 0) {
            badge.innerText = datos.length > 9 ? "+9" : datos.length;
            badge.classList.add('active');
        } else {
            badge.classList.remove('active');
        }
    },

    // NUEVA FUNCIÓN: Para marcar como leído
    marcarComoLeido(seccion) {
        if (seccion === 'fiaos') this.vistoFiaos = true;
        if (seccion === 'inventario') this.vistoStock = true;
        this.revisarTodo(); // Actualiza las burbujas inmediatamente
    },

    // IMPORTANTE: Resetear cuando se agregue algo nuevo
    // (Llama a esto cuando registres un nuevo fiao o el stock baje más)
    resetVisto(seccion) {
        if (seccion === 'fiaos') this.vistoFiaos = false;
        if (seccion === 'inventario') this.vistoStock = false;
        this.revisarTodo();
    },

    checkCierre() {
        const badge = document.getElementById('badge-inicio');
        if (!badge) return;

        const ahora = new Date();
        const yaCerro = (typeof Ventas !== 'undefined') ? Ventas.cierreRealizado : false;

        if (ahora.getHours() >= 18 && !yaCerro) {
            badge.classList.add('active'); 
        } else {
            badge.classList.remove('active');
        }
    },

    // --- NIVEL 2: CARD FLOTANTE (SABÍAS QUE - TEMPORAL) ---
    lanzarTipFlotante() {
        const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
        
        // Crear el elemento dinámicamente
        const card = document.createElement('div');
        card.style = `
            position: fixed; bottom: 80px; right: -400px; max-width: 300px;
            padding: 15px; background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(10px);
            border-left: 5px solid var(--primary); border-radius: 12px; color: white;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 10000;
            transition: right 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer;
        `;

        card.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center;">
                <span style="font-size:1.8em;">💡</span>
                <div>
                    <strong style="color:var(--primary); font-size:0.75em; text-transform:uppercase; letter-spacing:1px;">¿Sabías que?</strong>
                    <h4 style="margin:2px 0; font-size:0.95em;">${tip.titulo}</h4>
                    <p style="margin:0; font-size:0.85em; opacity:0.8; line-height:1.3;">${tip.texto}</p>
                </div>
            </div>
        `;

        document.body.appendChild(card);

        // Animación de entrada
        setTimeout(() => card.style.right = '20px', 100);

        // Función para remover
        const remover = () => {
            card.style.right = '-400px';
            setTimeout(() => card.remove(), 600);
        };

        // Auto-remover en 12 segundos (un poco más para que lea bien)
        const autoRemover = setTimeout(remover, 12000);

        card.onclick = () => {
            clearTimeout(autoRemover);
            remover();
        };
    },

    // --- NIVEL 3: SISTEMA NATIVO (FUERA DE LA APP) ---
    solicitarPermisoNativo() {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    },

  enviarNotificacionNativa(titulo, mensaje) {
    if ("Notification" in window && Notification.permission === "granted") {
        // Intentamos usar el Service Worker para mostrarla (es más estable)
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(`DOMINUS: ${titulo}`, {
                body: mensaje,
                icon: 'IMG/icon-512.png',
                badge: 'IMG/icon-192.png', // Icono pequeño para la barra de estado
                vibrate: [200, 100, 200]    // ¡Haz que el tlf de tu papá vibre!
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

    programarEventosGlobales() {
        // 1. Ciclo de Tips Flotantes (Cada 15 minutos)
        setInterval(() => this.lanzarTipFlotante(), 15 * 60 * 1000);

        // 2. Alerta de Cierre Nativa (Solo si no ha cerrado y son las 7 PM)
        setInterval(() => {
            const ahora = new Date();
            const yaCerro = (typeof Ventas !== 'undefined') ? Ventas.cierreRealizado : false;
            if (ahora.getHours() === 19 && ahora.getMinutes() === 0 && !yaCerro) {
                this.enviarNotificacionNativa("Hora del Cierre", "No olvides registrar las ventas totales de hoy.");
            }
        }, 60000);

        // 3. Tip Nativo a las 10 AM
        setInterval(() => {
            const ahora = new Date();
            if (ahora.getHours() === 10 && ahora.getMinutes() === 0) {
                const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
                this.enviarNotificacionNativa("Tip de la mañana", tip.texto);
            }
        }, 60000);
    },

    

    // --- NUEVO: Oído para el Mando Central ---
// --- EL OÍDO DEL SISTEMA ---
escucharMandoCentral(uuid) {
    if (!uuid) return;

    console.log("📡 Radar de Notificaciones: Sincronizado con Mando Central.");

    // 1. Escuchar Mensajes Privados
    DA_Cloud.db.ref(`usuarios/${uuid}/comunicacion/mensajeDirecto`).on('value', (snap) => {
        const data = snap.val();
        // Solo lanzamos si hay mensaje y no ha sido marcado como leído
        if (data && !data.leido) {
            this.lanzarAnuncioVisual("✉️ MENSAJE PRIVADO", data.texto, "var(--accent)");
        }
    });

    // 2. Escuchar Anuncios Globales (Broadcast)
    DA_Cloud.db.ref('config_global/anuncio').on('value', (snap) => {
        const anuncio = snap.val();
        if (anuncio && anuncio.mensaje) {
            // Evitamos anuncios de hace más de 24 horas
            const esReciente = (Date.now() - anuncio.timestamp) < (24 * 60 * 60 * 1000);
            if (esReciente) {
                this.lanzarAnuncioVisual("📢 ANUNCIO GLOBAL", anuncio.mensaje, "var(--primary)");
                this.enviarNotificacionNativa("DOMINUS: Anuncio Global", anuncio.mensaje);
            }
        }
    });
},

// --- LA INTERFAZ TÁCTIL ---
lanzarAnuncioVisual(titulo, texto, colorBorde) {
    // Evitar duplicados molestos
    if (document.getElementById('anuncio-activo')) return;

    const card = document.createElement('div');
    card.id = 'anuncio-activo';
    card.style = `
        position: fixed; bottom: 85px; right: -450px; max-width: 320px;
        padding: 18px; background: rgba(15, 15, 15, 0.98); backdrop-filter: blur(15px);
        border-left: 6px solid ${colorBorde}; border-radius: 12px; color: white;
        box-shadow: 0 20px 50px rgba(0,0,0,0.8); z-index: 10000;
        transition: right 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.3s ease, opacity 0.3s ease;
        cursor: pointer; border-top: 1px solid rgba(255,255,255,0.1);
        user-select: none; touch-action: pan-y;
    `;

    card.innerHTML = `
        <div style="display:flex; gap:12px; align-items:flex-start;">
            <div style="background:${colorBorde}; width:42px; height:42px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <span style="font-size:1.3em;">⚡</span>
            </div>
            <div style="flex:1;">
                <strong style="color:${colorBorde}; font-size:0.7em; text-transform:uppercase; letter-spacing:1.5px;">${titulo}</strong>
                <p style="margin:4px 0 0 0; font-size:0.95em; font-weight:500; line-height:1.4;">${texto}</p>
                <small style="display:block; margin-top:8px; opacity:0.4; font-size:0.7em;">Desliza para cerrar</small>
            </div>
        </div>
    `;

    document.body.appendChild(card);
    setTimeout(() => card.style.right = '20px', 100);

    // Lógica de Swipe (Arrastre)
    let startX = 0;
    const cerrar = () => {
        card.style.right = '-450px';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 600);
    };

    card.onclick = cerrar;
    card.addEventListener('touchstart', (e) => startX = e.touches[0].clientX, {passive: true});
    card.addEventListener('touchmove', (e) => {
        let diff = e.touches[0].clientX - startX;
        if (diff > 0) {
            card.style.transform = `translateX(${diff}px)`;
            card.style.opacity = 1 - (diff / 300);
        }
    }, {passive: true});
    card.addEventListener('touchend', (e) => {
        let diff = e.changedTouches[0].clientX - startX;
        if (diff > 100) cerrar();
        else {
            card.style.transform = `translateX(0)`;
            card.style.opacity = '1';
        }
    });
}
};