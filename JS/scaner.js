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
    
    // Propiedad temporal para comparar lecturas
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
            if (this.escaneando) return;

            // --- 🛡️ CERROJO DE SEGURIDAD DOMINUS ---
            const codigoLimpio = codigo.trim();

            // 1. Si el código es muy corto (basura visual), lo ignoramos
            if (codigoLimpio.length < 3) return;

            // 2. Si es diferente al anterior, lo guardamos como "voto" y esperamos
            if (codigoLimpio !== this.votoPrevio) {
                this.votoPrevio = codigoLimpio;
                console.log("DOMINUS: Validando código: " + codigoLimpio);
                return; // No procesamos todavía
            }
            
            // 3. Si llegamos aquí, es que leyó lo MISMO dos veces seguidas
            this.escaneando = true;
            this.votoPrevio = null; // Limpiamos para el siguiente producto
            // --- 🛡️ FIN DEL CERROJO ---

            // Feedback Visual
            const contenedor = document.getElementById('contenedor-camara');
            if (contenedor) contenedor.style.outline = "8px solid #2ecc71";
            
            if (typeof DominusAudio !== 'undefined') DominusAudio.play('exito');
            
            const btnUndo = document.getElementById('btn-deshacer-scanner');
            if (btnUndo) btnUndo.style.display = 'flex';

            // ENVIAR AL CONTROLADOR
            if (callback) callback(codigoLimpio);

            // Timer de Ráfaga
            setTimeout(() => {
                this.escaneando = false;
                const cont = document.getElementById('contenedor-camara');
                if (cont) cont.style.outline = "none";
            }, 1000);
        }
    ).catch(err => {
        console.error("DOMINUS: Error de hardware", err);
        if (typeof notificar === 'function') notificar("Cámara bloqueada", "error");
        this.detenerYSalir();
    });
},

    // --- 🛠️ UTILIDADES DE INTERFAZ ---
    asegurarControles: function(contenedor) {
        // Botón Cerrar (X Roja)
        if (!document.getElementById('btn-cerrar-scanner')) {
            const btnCerrar = document.createElement('button');
            btnCerrar.id = 'btn-cerrar-scanner';
            btnCerrar.innerHTML = '✕';
            btnCerrar.style = `position:absolute; top:20px; right:20px; z-index:10001; background:#ff4d4d; color:white; border:none; width:50px; height:50px; border-radius:50%; font-size:26px; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;`;
            btnCerrar.onclick = () => this.detenerYSalir();
            contenedor.appendChild(btnCerrar);
        }

        // Botón Deshacer (⟲ Naranja)
        if (!document.getElementById('btn-deshacer-scanner')) {
            const btnUndo = document.createElement('button');
            btnUndo.id = 'btn-deshacer-scanner';
            btnUndo.innerHTML = '⟲';
            btnUndo.style = `position:absolute; top:20px; left:20px; z-index:10001; background:#f39c12; color:white; border:none; width:50px; height:50px; border-radius:50%; font-size:26px; cursor:pointer; display:none; align-items:center; justify-content:center; box-shadow:0 4px 15px rgba(0,0,0,0.5);`;
            btnUndo.onclick = () => this.deshacerUltimoEscaneo();
            contenedor.appendChild(btnUndo);
        }
    },

   deshacerUltimoEscaneo: function() {
    if (typeof Controlador !== 'undefined' && typeof Controlador.eliminarUltimoDelCarrito === 'function') {
        
        // 1. Ejecutamos la resta/eliminación en el controlador
        Controlador.eliminarUltimoDelCarrito();
        
        // 2. Notificamos qué se devolvió
        notificar("Devuelto: " + (window.ultimoNombreBorrado || "Producto"), "error");
        
        // 3. VALIDACIÓN INTELIGENTE DEL BOTÓN
        // Solo ocultamos el botón si el carrito se quedó vacío
        if (typeof Ventas !== 'undefined' && (!Ventas.carrito || Ventas.carrito.length === 0)) {
            const btnUndo = document.getElementById('btn-deshacer-scanner');
            if (btnUndo) btnUndo.style.display = 'none';
        }
        
        // Si quieres que el botón desaparezca tras unos segundos de inactividad 
        // podrías poner un timeout, pero dejarlo visible mientras haya items 
        // es lo más profesional para una ráfaga.
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
    // El callback es lo que se ejecuta apenas el escáner (láser o cámara) detecta un código
    const callback = (codigo) => {
        if (esVenta) {
            // --- FLUJO DE VENTAS ---
            // 1. Inyectamos el código en el input real de tu sección de ventas (v-producto)
            const inputVenta = document.getElementById('v-producto');
            if (inputVenta) {
                inputVenta.value = codigo;
                // Disparamos el evento input para activar cualquier lógica de búsqueda visual
                inputVenta.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // 2. Ejecutamos la lógica de venta rápida (Bip -> Registro)
            // Esta función debe estar definida en tu Controlador
            if (typeof Controlador.procesarEscaneoVentaRapida === 'function') {
                Controlador.procesarEscaneoVentaRapida(codigo);
            } else {
                console.error("DOMINUS Error: Controlador.procesarEscaneoVentaRapida no definida.");
            }

        } else {
            // --- FLUJO DE INVENTARIO ---
            // 1. Inyectamos en el input de inventario (inv-codigo)
            const inputInv = document.getElementById('inv-codigo');
            if (inputInv) {
                inputInv.value = codigo;
                inputInv.focus();
                
                // 2. Cargamos el producto para edición o nuevo registro
                if (typeof Controlador.prepararEdicionInventario === 'function') {
                    Controlador.prepararEdicionInventario(codigo);
                }
            }
        }
    };

    // Abrimos el modal de elección para que el usuario decida el hardware
    modalEleccion.abrir({
        titulo: "🔍 Entrada de Producto",
        mensaje: "¿Cómo registrarás el código?",
        botones: [
            { 
                texto: "🔦 Láser USB", 
                clase: "btn-main", 
                accion: () => this.iniciarBusquedaEscannerLaser(callback) 
            },
            { 
                texto: "📸 Cámara en Vivo", 
                clase: "btn-main", 
                style: "background:#2196F3; margin-top:10px;", 
                accion: () => this.iniciarEscannerCamara(callback) 
            },
            { 
                texto: "🖼️ Subir Foto", 
                clase: "btn-main", 
                style: "background:#9c27b0; margin-top:10px;", 
                accion: () => this.procesarFoto(callback, () => this.prepararMenu(esVenta)) 
            }
        ]
    });
}
};