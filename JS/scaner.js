const Scanner = {

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
        if (typeof notificar === 'function') notificar("📢 Láser activado, escanee el producto", "info");

        inputScanner.onchange = (e) => {
            const codigo = e.target.value;
            if (codigo) {
                // 🚀 MODIFICADA: Ejecuta el callback en lugar de 'this.procesarCodigoEscaneado'
                callbackProcesar(codigo);
            }
            e.target.value = '';
            inputScanner.focus();
        };
    },

iniciarEscannerCamara: function(callbackProcesar) {
    const contenedorCamara = document.getElementById('contenedor-camara');
    
    // 💡 NUEVO: Seleccionamos el contenido principal para desenfocarlo
    const contenidoPrincipal = document.querySelector('body > *:not(#contenedor-camara)');
    
    // 💡 MEJORADO: CSS forzado con !important para que la cámara flote sobre todo
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
    
    // 💡 MEJORADO: Aplicar desenfoque al fondo con !important
    if (contenidoPrincipal) {
        contenidoPrincipal.style.transition = 'filter 0.3s ease';
        contenidoPrincipal.style.filter = 'blur(5px) !important';
    }

    // 💡 Crear botón de cerrar dinámicamente
    const btnCerrar = document.createElement('button');
    btnCerrar.innerHTML = '✕ Cerrar';
    // 💡 Botón con z-index alto para asegurar que se vea
    btnCerrar.style = "position:absolute; top:20px; right:20px; z-index:9999999 !important; background:rgba(255,0,0,0.7); color:white; border:none; padding:15px; border-radius:50px; font-weight:bold; cursor:pointer;";
    
    btnCerrar.onclick = () => {
        Quagga.stop();
        contenedorCamara.style.display = 'none';
        btnCerrar.remove(); // Eliminar botón
        // 💡 Restaurar fondo
        if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
    };
    contenedorCamara.appendChild(btnCerrar);
    
    if (typeof notificar === 'function') notificar("📷 Iniciando cámara...", "info");

    Quagga.init({
        inputStream : {
            name : "Live",
            type : "LiveStream",
            target: contenedorCamara,
            constraints: { facingMode: "environment" }
        },
        decoder : { readers : ["ean_reader", "code_128_reader"] }
    }, function(err) {
        if (err) {
            if (typeof notificar === 'function') notificar("❌ Error al abrir la cámara", "error");
            contenedorCamara.style.display = 'none';
            btnCerrar.remove();
            if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected((result) => {
        const codigo = result.codeResult.code;
        Quagga.stop();
        contenedorCamara.style.display = 'none';
        btnCerrar.remove();
        
        // 💡 Restaurar fondo
        if (contenidoPrincipal) contenidoPrincipal.style.filter = 'none';
        
        // 🚀 CAMBIO: Llamamos a efectoFlash del propio objeto Scanner
        this.efectoFlash();
        const audio = new Audio('AUDIO/scan.mp3'); 
        audio.play().catch(e => console.log("Sonido no reproducido", e));
        
        // 🚀 CAMBIO: Llamamos al callback pasado como parámetro
        callbackProcesar(codigo);
    });
},

  efectoFlash: function() {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = 'white';
    flash.style.zIndex = '999999'; // Muy alto para estar sobre todo
    flash.style.opacity = '0';
    flash.style.transition = 'opacity 0.2s';
    document.body.appendChild(flash);
    
    setTimeout(() => { flash.style.opacity = '0.5'; }, 10);
    setTimeout(() => { flash.style.opacity = '0'; }, 100);
    setTimeout(() => { document.body.removeChild(flash); }, 200);
},

}