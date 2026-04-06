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
    
    try { 
        Quagga.offDetected();
        Quagga.stop(); 
    } catch(e) {}
    
    contenedorCamara.innerHTML = ''; 
    
    // 1. PRIMERO mostramos el contenedor para que tenga dimensiones reales
    contenedorCamara.style.cssText = `
        display: flex !important; 
        position: fixed !important; 
        top: 0; left: 0; width: 100vw; height: 100vh; 
        z-index: 999999; background: #000; 
        align-items: center; justify-content: center;
    `;
    
    if (contenidoPrincipal) contenidoPrincipal.style.filter = 'blur(8px)';

    // 2. PEQUEÑO DELAY (Vital): Le damos 100ms al DOM para "existir" antes de Quagga
    setTimeout(() => {
        const videoElement = document.createElement('video');
        videoElement.setAttribute('playsinline', 'true'); 
        videoElement.style.cssText = "width:100%; height:100%; object-fit:cover;";
        contenedorCamara.appendChild(videoElement);

        // Botón de Cierre
        const btnCerrar = document.createElement('button');
        btnCerrar.innerHTML = '✕ Cancelar';
        btnCerrar.style.cssText = "position:absolute; bottom:50px; left:50%; transform:translateX(-50%); z-index:1000000; background:#ff4444; color:white; border:none; padding:15px 30px; border-radius:50px; font-weight:bold;";
        btnCerrar.onclick = () => {
            Quagga.stop();
            contenedorCamara.style.display = 'none';
            if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
        };
        contenedorCamara.appendChild(btnCerrar);

        // Guía Visual
        const guia = document.createElement('div');
        guia.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:260px; height:160px; border:3px solid #25D366; border-radius:15px; box-shadow:0 0 0 4000px rgba(0,0,0,0.6); z-index:99999;";
        contenedorCamara.appendChild(guia);

        // 3. INICIO DE QUAGGA (Con resolución balanceada)
        Quagga.init({
            inputStream : {
                name : "Live",
                type : "LiveStream",
                target: videoElement, // Apuntamos al video directamente
                constraints: { 
                    facingMode: "environment",
                    // Bajamos a 640x480 para asegurar que funcione en CUALQUIER teléfono sin "falta de luz"
                    width: 640, 
                    height: 480
                }
            },
            decoder : { 
                readers : ["ean_reader", "code_128_reader", "upc_reader"] 
            },
            locate: true
        }, (err) => {
            if (err) {
                notificar("❌ Error de cámara", "error");
                btnCerrar.click();
                return;
            }
            Quagga.start();
        });

        let procesando = false;
        Quagga.onDetected((result) => {
            if (procesando) return; 
            const codigo = result.codeResult.code;
            if (codigo && codigo.length > 5) {
                procesando = true;
                if (typeof Audio !== 'undefined') Audio.reproducir('exito');
                Quagga.stop();
                contenedorCamara.style.display = 'none';
                if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
                callbackProcesar(codigo.trim());
            }
        });
    }, 150); // El delay mágico
},

procesarFoto: function(callbackProcesar, alCancelar) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // Mantenemos capture para que en móvil dé la opción de "Cámara" directamente
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
            // AJUSTE CRÍTICO: Quagga.decodeSingle requiere una estructura específica.
            // A veces 'inputStream' dentro de decodeSingle causa conflictos si no es una URL simple.
            Quagga.decodeSingle({
                src: event.target.result,
                decoder: { 
                    readers: ["ean_reader", "code_128_reader", "upc_reader", "code_39_reader", "upc_e_reader"] 
                },
                locate: true,
                // Reducimos un poco el patchSize si las fotos son muy pesadas para evitar que el navegador se trabe
                patchSize: "medium", 
                numOfWorkers: 4, // Ayuda a procesar la foto más rápido en paralelo
                inputStream: {
                    size: 800 // 800-1000 es el "punto dulce" para Quagga. 1600 puede ser demasiado y fallar.
                }
            }, (result) => {
                if (result && result.codeResult) {
                    console.log("DOMINUS: Código detectado en foto:", result.codeResult.code);
                    
                    if (typeof Audio !== 'undefined' && Audio.reproducir) {
                        Audio.reproducir('exito');
                    }
                    
                    // Ejecutamos el callback que pegará el código en el formulario
                    callbackProcesar(result.codeResult.code.trim());
                } else {
                    console.warn("DOMINUS: Quagga no pudo leer la imagen.");
                    if (typeof Audio !== 'undefined' && Audio.reproducir) {
                        Audio.reproducir('error');
                    }
                    notificar("❌ No se detectó código. Asegura buena luz.", "error");
                    
                    // Si falla, regresamos al menú anterior para que el usuario no se quede bloqueado
                    if (alCancelar) alCancelar();
                }
            });
        };
        reader.readAsDataURL(archivo);
    };

    // Respaldo para navegadores que no disparan oncancel
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