const Scanner = {
    scannerInstancia: null, // Para guardar el Html5QrcodeScanner

    // --- 🔦 LÁSER USB / BLUETOOTH (Se queda igual, funciona perfecto) ---
    iniciarBusquedaEscannerLaser: function(callbackProcesar) {
        let inputScanner = document.getElementById('input-scanner-laser');
        if (!inputScanner) {
            inputScanner = document.createElement('input');
            inputScanner.type = 'text';
            inputScanner.id = 'input-scanner-laser';
            inputScanner.setAttribute('inputmode', 'none'); 
            inputScanner.style.cssText = "position:fixed; opacity:0; top:-100px; left:-100px; z-index:-1;";
            document.body.appendChild(inputScanner);
        }
        inputScanner.value = '';
        inputScanner.focus();
        if (typeof notificar === 'function') notificar("📢 Láser listo", "info");

        inputScanner.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const codigo = e.target.value.trim();
                if (codigo) {
                    if (typeof Audio !== 'undefined') Audio.reproducir('exito');
                    callbackProcesar(codigo);
                    e.target.value = '';
                }
            }
        };
        document.addEventListener('click', () => inputScanner.focus(), { once: true });
    },

    scannerInstancia: null,
    escaneando: false,
    ultimoProductoId: null,

iniciarEscannerCamara: function(callbackProcesar) {
    // 1. Bloqueo inmediato de teclado y estado
    if (document.activeElement) document.activeElement.blur(); 
    window.scannerActivo = true;

    // 2. Identificación dinámica de la vista activa (Ventas o Inventario)
    const esVentas = !document.getElementById('view-ventas').classList.contains('hidden');
    
    // 🚀 CAMBIO CLAVE: Seleccionar el contenedor y lector correcto
    const idCont = esVentas ? 'contenedor-camara' : 'contenedor-camara-inv';
    const idLect = esVentas ? 'reader-ventas' : 'reader';
    
    const contenedorPrincipal = document.getElementById(idCont);
    const lectorDiv = document.getElementById(idLect);
    
    if (!contenedorPrincipal || !lectorDiv) {
        console.error("DOMINUS: No se encontraron los contenedores:", idCont, idLect);
        return;
    }

    // Mostramos el overlay oscuro (usamos flex para centrar el reader que pusimos en el HTML)
    contenedorPrincipal.style.display = 'flex'; 
    lectorDiv.style.display = 'block';

    // 3. Inyección de Botones (X y Deshacer)
    // Ahora se inyectarán en el contenedor que esté activo en ese momento
    this.asegurarControles(contenedorPrincipal);

    // 4. Reinicio Limpio de Hardware
    if (this.scannerInstancia) {
        this.scannerInstancia.stop().then(() => {
            this.activarCamaraPura(idLect, callbackProcesar);
        }).catch(() => {
            this.activarCamaraPura(idLect, callbackProcesar);
        });
    } else {
        this.activarCamaraPura(idLect, callbackProcesar);
    }
},

activarCamaraPura: function(idLector, callback) {
    this.scannerInstancia = new Html5Qrcode(idLector);
    
    this.votoPrevio = null; 

    const perfilActual = window.PERFIL_DOMINUS || "MEDIO";
    let fpsConfig = (perfilActual === "ALTO") ? 20 : (perfilActual === "BAJO" ? 5 : 10);

    const config = { 
        fps: fpsConfig, 
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.0
    };

    this.scannerInstancia.start(
        { facingMode: "environment" }, 
        config,
        (codigo) => {
            // Si ya estamos procesando o el sistema está en pausa, ignoramos
            if (this.escaneando || window.pausaScanner) return; 

            const codigoLimpio = codigo.trim();

            if (codigoLimpio.length < 3) return;

            if (codigoLimpio !== this.votoPrevio) {
                this.votoPrevio = codigoLimpio;
                console.log("DOMINUS: Validando código: " + codigoLimpio);
                return; 
            }
            
            this.escaneando = true;
            this.votoPrevio = null; 

            // Feedback Visual (Outline verde de éxito)
            const contenedor = document.getElementById('contenedor-camara');
            if (contenedor) contenedor.style.outline = "8px solid #2ecc71";
            
            if (typeof DominusAudio !== 'undefined') DominusAudio.play('exito');
            
            // Mostrar botón Deshacer (Atajo: Z)
            const btnUndo = document.getElementById('btn-deshacer-scanner');
            if (btnUndo) btnUndo.style.display = 'flex';

            if (callback) callback(codigoLimpio);

            // Timer de Ráfaga: evita lecturas múltiples accidentales
            setTimeout(() => {
                this.escaneando = false;
                const cont = document.getElementById('contenedor-camara');
                if (cont) cont.style.outline = "none";
            }, 1200); // Un poco más de tiempo para dar estabilidad al teclado
        }
    ).catch(err => {
        console.error("DOMINUS: Error de hardware", err);
        if (typeof notificar === 'function') notificar("Cámara bloqueada", "error");
        this.detenerYSalir();
    });
},

 /**
 * Asegura que los botones de control existan sobre el contenedor del escáner.
 * @param {HTMLElement} contenedor - El div que contiene el video de la cámara.
 */
asegurarControles: function(contenedor) {
    if (!contenedor) return;

    // 1. Botón Cerrar (X Roja) - Atajo: ESC / X
    if (!document.getElementById('btn-cerrar-scanner')) {
        const btnCerrar = document.createElement('button');
        btnCerrar.id = 'btn-cerrar-scanner';
        btnCerrar.className = 'btn-flotante-scanner';
        // Añadimos (X) como pista visual del atajo
        btnCerrar.innerHTML = '✕ <small style="font-size:10px; display:block</small>';
        btnCerrar.title = "Cerrar Escáner (Tecla X)";
        
        // Inyección para el motor de atajos global
        btnCerrar.setAttribute('data-shortcut', 'X'); 
        
        btnCerrar.onclick = () => this.detenerYSalir();
        contenedor.appendChild(btnCerrar);
    }

    // 2. Botón Deshacer (⟲ Naranja) - Atajo: Z
    if (!document.getElementById('btn-deshacer-scanner')) {
        const btnUndo = document.createElement('button');
        btnUndo.id = 'btn-deshacer-scanner';
        btnUndo.className = 'btn-flotante-scanner';
        // Añadimos (Z) como pista visual del atajo
        btnUndo.innerHTML = '⟲ <small style="font-size:10px; display:block;">(Z)</small>';
        btnUndo.title = "Deshacer último escaneo (Tecla Z)";
        
        // Inyección para el motor de atajos global
        btnUndo.setAttribute('data-shortcut', 'Z');
        
        btnUndo.onclick = () => this.deshacerUltimoEscaneo();
        contenedor.appendChild(btnUndo);
    }
},

deshacerUltimoEscaneo: function() {
    if (typeof Controlador !== 'undefined' && typeof Controlador.eliminarUltimoDelCarrito === 'function') {
        
        // 1. Feedback Visual del Atajo (Efecto de pulsación)
        const btnUndo = document.getElementById('btn-deshacer-scanner');
        if (btnUndo) {
            btnUndo.style.transform = "scale(0.9)";
            setTimeout(() => btnUndo.style.transform = "scale(1)", 100);
        }

        // 2. Ejecutamos la resta/eliminación en el controlador
        Controlador.eliminarUltimoDelCarrito();
        
        // 3. Notificamos qué se devolvió
        // Usamos el nombre guardado para que el usuario esté seguro de qué borró
        if (typeof notificar === 'function') {
            notificar("Devuelto: " + (window.ultimoNombreBorrado || "Producto"), "error");
        }
        
        // 4. VALIDACIÓN INTELIGENTE DEL BOTÓN
        // Si el carrito queda vacío, ya no hay nada que deshacer, ocultamos.
        if (typeof Ventas !== 'undefined' && (!Ventas.carrito || Ventas.carrito.length === 0)) {
            if (btnUndo) btnUndo.style.display = 'none';
        }
        
        // Feedback Sonoro de retroceso (Opcional si tienes el objeto Audio)
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('borrar');

        console.log("DOMINUS: Deshacer ejecutado correctamente.");
    }
},

    // --- 🧹 LIMPIEZA TOTAL (Garantiza estabilidad) ---
    // --- 🧹 LIMPIEZA TOTAL (Garantiza estabilidad) ---
detenerYSalir: async function() {
    // 1. Ocultar TODOS los contenedores posibles inmediatamente
    const idsContenedores = ['contenedor-camara', 'contenedor-camara-inv'];
    idsContenedores.forEach(id => {
        const cont = document.getElementById(id);
        if (cont) {
            cont.style.display = 'none';
            cont.style.outline = "none";
        }
    });

    // 2. Apagar el hardware de la cámara con await
    if (this.scannerInstancia) {
        try {
            await this.scannerInstancia.stop();
            // Limpiamos los lectores para que no quede rastro de video
            const idsLectores = ['reader', 'reader-ventas'];
            idsLectores.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.innerHTML = "";
                    el.style.display = 'none';
                }
            });
        } catch (e) {
            console.warn("DOMINUS: Error al limpiar hardware:", e);
        }
        this.scannerInstancia = null;
    }

    // 3. Eliminar botones dinámicos
    const btnCerrar = document.getElementById('btn-cerrar-scanner');
    const btnUndo = document.getElementById('btn-deshacer-scanner');
    if (btnCerrar) btnCerrar.remove();
    if (btnUndo) btnUndo.remove();

    // 4. Reset de estados
    window.scannerActivo = false;
    this.escaneando = false;
    this.votoPrevio = null; // 🛡️ Limpiamos también el cerrojo de seguridad

    // 5. Restaurar efectos visuales (Filtros)
    // Aplicamos a cualquier elemento que no sea uno de nuestros contenedores
    document.querySelectorAll('body > *:not([id^="contenedor-camara"])').forEach(el => {
        el.style.filter = 'none';
    });

    console.log("DOMINUS: Escáner cerrado y recursos liberados correctamente.");
},

   procesarFoto: function(callbackProcesar, alCancelar) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const archivo = e.target.files[0];
            if (!archivo) return alCancelar?.();

            if (typeof notificar === 'function') notificar("🔍 Analizando imagen...", "info");

            const tempDiv = document.createElement('div');
            tempDiv.id = "temp-lector";
            tempDiv.style.display = "none";
            document.body.appendChild(tempDiv);
            
            const procesador = new Html5Qrcode("temp-lector");
            try {
                const codigo = await procesador.scanFile(archivo, true);
                if (typeof Audio !== 'undefined' && Audio.reproducir) Audio.reproducir('exito');
                callbackProcesar(codigo.trim());
            } catch (err) {
                if (typeof notificar === 'function') notificar("❌ No se detectó código", "error");
                alCancelar?.();
            } finally {
                tempDiv.remove();
            }
        };
        input.click();
    },

    // --- 🎛️ MENÚS (Adaptado para usar los nuevos métodos) ---
prepararMenu: function(esVenta = true) {
    const callback = (codigo) => {
        if (esVenta) {
            // --- FLUJO DE VENTAS ---
            const inputVenta = document.getElementById('v-producto');
            if (inputVenta) {
                inputVenta.value = codigo;
                inputVenta.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (typeof Controlador.procesarEscaneoVentaRapida === 'function') {
                Controlador.procesarEscaneoVentaRapida(codigo);
            } else {
                console.error("DOMINUS Error: Controlador.procesarEscaneoVentaRapida no definida.");
            }

        } else {
            // --- FLUJO DE INVENTARIO ---
            const inputInv = document.getElementById('inv-codigo');
            if (inputInv) {
                inputInv.value = codigo;
                inputInv.focus();
                
                if (typeof Controlador.prepararEdicionInventario === 'function') {
                    Controlador.prepararEdicionInventario(codigo);
                }
            }
        }
    };

    // Abrimos el modal con inyección de atajos numéricos
    modalEleccion.abrir({
        titulo: "🔍 Entrada de Producto",
        mensaje: "¿Cómo registrarás el código?",
        botones: [
            { 
                texto: "🔦 (1) Láser USB", 
                clase: "btn-main", 
                accion: () => this.iniciarBusquedaEscannerLaser(callback),
                shortcut: "1" // Para que tu motor de modal lo identifique
            },
            { 
                texto: "📸 (2) Cámara en Vivo", 
                clase: "btn-main", 
                style: "background:#2196F3; margin-top:10px;", 
                accion: () => this.iniciarEscannerCamara(callback),
                shortcut: "2"
            },
            { 
                texto: "🖼️ (3) Subir Foto", 
                clase: "btn-main", 
                style: "background:#9c27b0; margin-top:10px;", 
                accion: () => this.procesarFoto(callback, () => this.prepararMenu(esVenta)),
                shortcut: "3"
            }
        ]
    });
}
};