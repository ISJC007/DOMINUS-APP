const Scanner = {
    // 🔍 LÁSER USB / BLUETOOTH
    iniciarBusquedaEscannerLaser: function(callbackProcesar) {
        let inputScanner = document.getElementById('input-scanner-laser');
        if (!inputScanner) {
            inputScanner = document.createElement('input');
            inputScanner.type = 'text';
            inputScanner.id = 'input-scanner-laser';
            inputScanner.style.position = 'absolute';
            inputScanner.style.opacity = '0';
            inputScanner.style.top = '-100px'; 
            document.body.appendChild(inputScanner);
        }
        
        inputScanner.focus();
        if (typeof notificar === 'function') notificar("📢 Láser activado", "info");

        inputScanner.onchange = (e) => {
            const codigo = e.target.value;
            if (codigo) {
                // 🔊 Sonido de éxito
                if (typeof DominusAudio !== 'undefined') DominusAudio.play('scan');
                callbackProcesar(codigo);
            }
            e.target.value = '';
            inputScanner.focus();
        };
    },

    // 📸 ESCÁNER POR CÁMARA (QuaggaJS + Mejoras de Enfoque)
    iniciarEscannerCamara: function(callbackProcesar) {
        const contenedorCamara = document.getElementById('contenedor-camara');
        const contenidoPrincipal = document.querySelector('body > *:not(#contenedor-camara)');
        
        // Limpiamos el contenedor por si quedaron elementos de sesiones fallidas
        contenedorCamara.innerHTML = '';
        
        contenedorCamara.style.cssText = `
            display: block !important;               
            position: fixed !important;             
            top: 0 !important;                      
            left: 0 !important;                     
            width: 100vw !important;                
            height: 100vh !important;               
            z-index: 999999 !important;             
            background: black !important;           
            overflow: hidden !important;
        `;
        
        if (contenidoPrincipal) {
            contenidoPrincipal.style.transition = 'filter 0.3s ease';
            contenidoPrincipal.style.filter = 'blur(5px)';
        }

        // 1. Botón de Cierre
        const btnCerrar = document.createElement('button');
        btnCerrar.innerHTML = '✕ Cerrar Escáner';
        btnCerrar.style = "position:absolute; bottom:40px; left:50%; transform:translateX(-50%); z-index:9999999 !important; background:rgba(255,0,0,0.8); color:white; border:none; padding:15px 30px; border-radius:50px; font-weight:bold; cursor:pointer; font-size:1.1rem;";
        
        btnCerrar.onclick = () => {
            Quagga.stop();
            contenedorCamara.style.display = 'none';
            if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
        };
        contenedorCamara.appendChild(btnCerrar);

        // 2. Guía Visual (Línea de Enfoque)
        const guia = document.createElement('div');
        guia.style.cssText = `
            position: absolute; top: 50%; left: 10%; width: 80%; height: 2px;
            background: rgba(255, 0, 0, 0.5); box-shadow: 0 0 10px red;
            z-index: 9999998; pointer-events: none;
        `;
        contenedorCamara.appendChild(guia);
        
        if (typeof notificar === 'function') notificar("📷 Iniciando cámara...", "info");

        // 3. Configuración Agresiva de Quagga
        Quagga.init({
            inputStream : {
                name : "Live",
                type : "LiveStream",
                target: contenedorCamara,
                constraints: { 
                    // Forzamos cámara trasera y alta resolución para códigos pequeños
                    facingMode: "environment",
                    width: { min: 1280 }, 
                    height: { min: 720 }
                }
            },
            decoder : { 
                // Añadimos lectores extra para máxima compatibilidad
                readers : [
                    "ean_reader", 
                    "ean_8_reader", 
                    "code_128_reader", 
                    "code_39_reader", 
                    "upc_reader", 
                    "upc_e_reader"
                ] 
            },
            locate: true,
            halfSample: true, // Optimiza velocidad en móviles
            patchSize: "medium", // Tamaño de búsqueda del código
            frequency: 10 // Escaneos por segundo
        }, function(err) {
            if (err) {
                if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
                if (typeof notificar === 'function') notificar("❌ No se pudo acceder a la cámara", "error");
                contenedorCamara.style.display = 'none';
                if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
                return;
            }
            Quagga.start();
        });

        // 4. Lógica de Detección
        Quagga.onDetected((result) => {
            const codigo = result.codeResult.code;
            
            // Validamos que el código no sea basura (mínimo 4 dígitos)
            if (codigo && codigo.length > 3) {
                Quagga.stop();
                contenedorCamara.style.display = 'none';
                if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
                
                this.efectoFlash();
                
                // 🔊 Sonido de éxito
                if (typeof DominusAudio !== 'undefined') DominusAudio.play('scan');
                
                callbackProcesar(codigo);
            }
        });
    },
procesarFoto: function(callbackProcesar, alCancelar) { // <-- Añadimos el callback de retorno
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    // Detectamos si el usuario cierra el selector sin elegir nada
    input.oncancel = () => {
        if (alCancelar) alCancelar(); 
    };

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
                decoder: { readers: ["ean_reader", "code_128_reader", "upc_reader"] },
                locate: true
            }, (result) => {
                if (result && result.codeResult) {
                    if (typeof DominusAudio !== 'undefined') DominusAudio.play('scan');
                    callbackProcesar(result.codeResult.code);
                } else {
                    if (typeof DominusAudio !== 'undefined') DominusAudio.play('error');
                    notificar("❌ No se detectó código", "error");
                    if (alCancelar) alCancelar(); // Si falla la lectura, regresamos al menú
                }
            });
        };
        reader.readAsDataURL(archivo);
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
    }
};