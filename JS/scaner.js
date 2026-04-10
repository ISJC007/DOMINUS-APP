const Scanner = {
    // 🔍 LÁSER USB / BLUETOOTH
  iniciarBusquedaEscannerLaser: function(callbackProcesar) {
    let inputScanner = document.getElementById('input-scanner-laser');
    
    if (!inputScanner) {
        inputScanner = document.createElement('input');
        inputScanner.type = 'text';
        inputScanner.id = 'input-scanner-laser';
        // 🚀 MEJORA: Evita que el teclado del móvil se abra al recibir el foco
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
        // Re-enfocar por seguridad
        setTimeout(() => inputScanner.focus(), 10);
    };

    document.addEventListener('click', () => inputScanner.focus(), { once: true });
},
    // 📸 ESCÁNER POR CÁMARA (QuaggaJS + Mejoras de Enfoque)
iniciarEscannerCamara: function(callbackProcesar) {
    const contenedorCamara = document.getElementById('contenedor-camara');
    const contenidoPrincipal = document.querySelector('body > *:not(#contenedor-camara)');
    
    // Control de flujo para evitar duplicados y errores de referencia
    if (typeof window.procesando === 'undefined') {
        window.procesando = false; 
    } else {
        window.procesando = false;
    }
    
    try { 
        Quagga.offDetected();
        Quagga.stop(); 
    } catch(e) {}
    
    contenedorCamara.innerHTML = ''; 
    
    // Estilos del contenedor
    contenedorCamara.style.cssText = `
        display: flex !important; 
        position: fixed !important; 
        top: 0; left: 0; width: 100vw; height: 100vh; 
        z-index: 999999; background: #000; 
        align-items: center; justify-content: center;
    `;
    
    if (contenidoPrincipal) contenidoPrincipal.style.filter = 'blur(8px)';

    setTimeout(() => {
        // Creación del elemento video con parches para Android/iOS
        const videoElement = document.createElement('video');
        videoElement.setAttribute('playsinline', 'true'); 
        videoElement.setAttribute('autoplay', 'true'); 
        videoElement.setAttribute('muted', 'true'); // VITAL: Permite el autoplay sin interacción previa
        videoElement.style.cssText = "width:100%; height:100%; object-fit:cover;";
        contenedorCamara.appendChild(videoElement);

        // Botón de Cierre
        const btnCerrar = document.createElement('button');
        btnCerrar.innerHTML = '✕ Cancelar';
        btnCerrar.style.cssText = "position:absolute; bottom:50px; left:50%; transform:translateX(-50%); z-index:1000000; background:#ff4444; color:white; border:none; padding:15px 30px; border-radius:50px; font-weight:bold; cursor:pointer;";
        btnCerrar.onclick = () => {
            Quagga.stop();
            contenedorCamara.style.display = 'none';
            if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
        };
        contenedorCamara.appendChild(btnCerrar);

        // Guía Visual
        const guia = document.createElement('div');
        guia.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:260px; height:160px; border:3px solid #25D366; border-radius:15px; box-shadow:0 0 0 4000px rgba(0,0,0,0.6); z-index:99999; pointer-events:none;";
        contenedorCamara.appendChild(guia);

        // Inicialización de Quagga
        Quagga.init({
            inputStream : {
                name : "Live",
                type : "LiveStream",
                target: videoElement,
                constraints: { 
                    facingMode: "environment",
                    width: { min: 640 },
                    height: { min: 480 },
                    aspectRatio: { min: 1, max: 2 } 
                }
            },
            locate: true,
            decoder : { 
                readers : ["ean_reader", "code_128_reader", "upc_reader", "code_39_reader"],
                multiple: false 
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            }
        }, (err) => {
            if (err) {
                console.error("Error Quagga:", err);
                if (typeof notificar === 'function') notificar("❌ Error de cámara", "error");
                return;
            }
            
            Quagga.start();
            
            // Forzamos el play por si el navegador lo dejó en pausa
            setTimeout(() => {
                videoElement.play().catch(e => console.warn("Video play forzado:", e));
            }, 200);
        });

        // Lógica de detección con filtro de confianza
        let lecturas = []; 
        Quagga.onDetected((result) => {
            if (window.procesando) return; 
            
            const codigo = result.codeResult.code;
            if (!codigo) return;

            lecturas.push(codigo);
            
            if (lecturas.length >= 3) {
                const todosIguales = lecturas.every(v => v === lecturas[0]);
                
                if (todosIguales && codigo.length > 5) {
                    window.procesando = true; 
                    lecturas = []; 
                    
                    if (typeof Audio !== 'undefined' && Audio.reproducir) Audio.reproducir('exito');
                    
                    Quagga.stop();
                    contenedorCamara.style.display = 'none';
                    if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
                    
                    // Enviamos el código limpio al callback
                    callbackProcesar(codigo.trim());
                } else {
                    lecturas.shift();
                }
            }
        });
    }, 300); // Aumentamos un poco el delay para asegurar que el DOM esté listo
},

procesarFoto: function(callbackProcesar, alCancelar) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = (e) => {
        const archivo = e.target.files[0];
        if (!archivo) {
            if (alCancelar) alCancelar();
            return;
        }

        if (typeof notificar === 'function') notificar("🔍 Analizando imagen...", "info");

        const reader = new FileReader();
        reader.onload = (event) => {
            Quagga.decodeSingle({
                src: event.target.result,
                decoder: { 
                    readers: ["ean_reader", "code_128_reader", "upc_reader", "code_39_reader", "upc_e_reader"] 
                },
                locate: true,
                patchSize: "medium", 
                numOfWorkers: 4,
                inputStream: {
                    size: 800 
                }
            }, (result) => {
                // Aquí ya no existe la variable 'procesando', el error desaparece
                if (result && result.codeResult) {
                    console.log("DOMINUS: Código detectado en foto:", result.codeResult.code);
                    
                    if (typeof Audio !== 'undefined' && Audio.reproducir) {
                        Audio.reproducir('exito');
                    }
                    
                    // Se inyecta el código al formulario de Inventario
                    callbackProcesar(result.codeResult.code.trim());
                } else {
                    console.warn("DOMINUS: Quagga no pudo leer la imagen.");
                    if (typeof Audio !== 'undefined' && Audio.reproducir) {
                        Audio.reproducir('error');
                    }
                    notificar("❌ No se detectó código. Asegura buena luz.", "error");
                    
                    if (alCancelar) alCancelar();
                }
            });
        };
        reader.readAsDataURL(archivo);
    };

    input.onclick = () => {
        console.log("DOMINUS: Selector de archivos abierto...");
    };

    input.click();
},


    efectoFlash: function() {
        const flash = document.createElement('div');
        flash.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999999; opacity:0; transition:opacity 0.1s;";
        document.body.appendChild(flash);
        
        setTimeout(() => { flash.style.opacity = '0.6'; }, 10);
        setTimeout(() => { 
            flash.style.opacity = '0'; 
            setTimeout(() => flash.remove(), 100);
        }, 100);
    },

    // 🎛️ EL SELECTOR PRINCIPAL (Láser o Cámara)
 // --- REEMPLAZA ESTAS FUNCIONES EN scaner.js ---
prepararMenu: function(esVenta = true) {
    const callback = (codigo) => {
        // 1. Limpieza inmediata de la UI del escáner
        try { Quagga.stop(); } catch(e) {}
        const contenedor = document.getElementById('contenedor-camara');
        if (contenedor) contenedor.style.display = 'none';

        // Usamos el delay para asegurar que los modales se cierren y el scroll funcione
        setTimeout(() => {
            console.log(`DOMINUS: Procesando código [${codigo}]`);

            if (esVenta) {
                // Lógica de Ventas
                const inputVenta = document.getElementById('codigo-venta');
                if (inputVenta) {
                    inputVenta.value = codigo;
                    inputVenta.dispatchEvent(new Event('input', { bubbles: true }));
                }
                Controlador.procesarCodigoEscaneado(codigo);
            } else {
                // --- LÓGICA DE INVENTARIO (Registro/Edición) ---
                
                // 1. Primero limpiamos el formulario para evitar datos mezclados
                if (typeof Controlador.limpiarFormularioInventario === 'function') {
                    Controlador.limpiarFormularioInventario();
                }

                // 2. Buscamos el input de código en tu fieldset de inventario
                const inputCodigoInv = document.getElementById('inv-codigo');
                if (inputCodigoInv) {
                    inputCodigoInv.value = codigo;
                    // Le damos un resalte visual para saber que se cargó con éxito
                    inputCodigoInv.style.border = "2px solid var(--primary)";
                    inputCodigoInv.focus();
                }

                // 3. Subimos el scroll hasta arriba donde está el formulario "Cargar Inventario"
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // 4. Activamos la búsqueda inteligente en el controlador
                // Esta función ahora se encarga de llenar el resto del formulario si el producto ya existe
                if (typeof Controlador.prepararEdicionInventario === 'function') {
                    Controlador.prepararEdicionInventario(codigo);
                }
                
                if (typeof notificar === 'function') {
                    notificar("✅ Código cargado: " + codigo, "success");
                }
            }
        }, 150);
    };

    // Abrimos el modal de elección inicial
    modalEleccion.abrir({
        titulo: "🔍 Entrada de Código",
        mensaje: "¿Cómo vas a ingresar el producto?",
        botones: [
            {
                texto: "🔦 Escáner Láser (USB/BT)",
                clase: "btn-main", 
                accion: () => this.iniciarBusquedaEscannerLaser(callback)
            },
            {
                texto: "📸 Cámara o Galería",
                clase: "btn-main",
                style: "background: #4CAF50; margin-top: 10px;", 
                mantener: true, 
                accion: () => this.subMenuCamara(callback, esVenta)
            }
        ]
    });
},

subMenuCamara: function(callback, esVenta) {
    modalEleccion.abrir({
        titulo: "📸 Opciones de Cámara",
        mensaje: "¿Deseas escanear en vivo o subir una imagen?",
        botones: [
            {
                texto: "🔍 Escanear en Vivo",
                clase: "btn-main",
                style: "background: #2196F3;",
                accion: () => {
                    // 1. Forzamos el cierre de cualquier modal abierto para liberar la pantalla
                    if (typeof modalEleccion.cerrar === 'function') modalEleccion.cerrar();
                    
                    // 2. Pequeño delay para que el DOM se limpie antes de encender la cámara
                    setTimeout(() => {
                        this.iniciarEscannerCamara(callback);
                    }, 300);
                }
            },
            {
                texto: "🖼️ Subir desde Galería",
                clase: "btn-main",
                style: "background: #9c27b0; margin-top: 10px;",
                // Aquí sí pasamos el callback y el retorno al menú principal
                accion: () => this.procesarFoto(callback, () => this.prepararMenu(esVenta))
            }
        ]
    });
},

}