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
                // 🔊 Sonido de escáner desde nuestro módulo central
                if (typeof DominusAudio !== 'undefined') DominusAudio.play('scan');
                callbackProcesar(codigo);
            }
            e.target.value = '';
            inputScanner.focus();
        };
    },

    // 📸 ESCÁNER POR CÁMARA (QuaggaJS)
    iniciarEscannerCamara: function(callbackProcesar) {
        const contenedorCamara = document.getElementById('contenedor-camara');
        const contenidoPrincipal = document.querySelector('body > *:not(#contenedor-camara)');
        
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

        const btnCerrar = document.createElement('button');
        btnCerrar.innerHTML = '✕ Cerrar Escáner';
        btnCerrar.style = "position:absolute; bottom:40px; left:50%; transform:translateX(-50%); z-index:9999999 !important; background:rgba(255,0,0,0.8); color:white; border:none; padding:15px 30px; border-radius:50px; font-weight:bold; cursor:pointer; font-size:1.1rem;";
        
        btnCerrar.onclick = () => {
            Quagga.stop();
            contenedorCamara.style.display = 'none';
            btnCerrar.remove();
            if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
        };
        contenedorCamara.appendChild(btnCerrar);
        
        if (typeof notificar === 'function') notificar("📷 Iniciando cámara...", "info");

        Quagga.init({
            inputStream : {
                name : "Live",
                type : "LiveStream",
                target: contenedorCamara,
                constraints: { 
                    facingMode: "environment",
                    // 💡 MEJORA: Forzamos una resolución decente para códigos pequeños
                    width: { min: 640 },
                    height: { min: 480 }
                }
            },
            decoder : { 
                readers : ["ean_reader", "code_128_reader", "code_39_reader"] 
            },
            // 💡 MEJORA: Localizador ayuda a encontrar el código en la imagen
            locate: true
        }, function(err) {
            if (err) {
                if (typeof notificar === 'function') notificar("❌ Error de cámara", "error");
                contenedorCamara.style.display = 'none';
                btnCerrar.remove();
                if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
                return;
            }
            Quagga.start();
        });

        Quagga.onDetected((result) => {
            const codigo = result.codeResult.code;
            
            // 🛑 Detenemos para evitar lecturas múltiples
            Quagga.stop();
            contenedorCamara.style.display = 'none';
            btnCerrar.remove();
            if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
            
            this.efectoFlash();
            
            // 🔊 Sonido de escáner CENTRALIZADO
            if (typeof DominusAudio !== 'undefined') {
                DominusAudio.play('scan');
            }
            
            callbackProcesar(codigo);
        });
    },

    efectoFlash: function() {
        const flash = document.createElement('div');
        flash.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:999999; opacity:0; transition:opacity 0.1s;";
        document.body.appendChild(flash);
        
        setTimeout(() => { flash.style.opacity = '0.6'; }, 10);
        setTimeout(() => { 
            flash.style.opacity = '0'; 
            setTimeout(() => flash.remove(), 100);
        }, 100);
    }
}