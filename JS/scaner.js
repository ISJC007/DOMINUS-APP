const Scanner = {
    html5QrCode: null,

    // --- 🔦 LÁSER USB / BLUETOOTH (Este funciona perfecto, lo mantenemos limpio) ---
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

    // --- 📸 ESCÁNER EN VIVO (Nueva Lógica desde Cero) ---
 iniciarEscannerCamara: async function(callbackProcesar) {
        const contenedor = document.getElementById('contenedor-camara');
        
        // 1. Matamos todo lo que haya en el body excepto el contenedor
        document.body.classList.add('camara-activa');
        
        // 2. Reinicio agresivo del HTML
        contenedor.innerHTML = ''; 
        const lectorDiv = document.createElement('div');
        lectorDiv.id = 'lector-en-vivo';
        lectorDiv.style.cssText = "width:100vw; height:100vh; background:black;";
        contenedor.appendChild(lectorDiv);
        
        contenedor.style.cssText = "display:flex !important; position:fixed !important; z-index:9999999 !important; top:0; left:0; width:100vw; height:100vh;";

        // 3. Botón de cerrar manual
        const btn = document.createElement('button');
        btn.innerText = "CERRAR CÁMARA";
        btn.style.cssText = "position:fixed; top:20px; right:20px; z-index:10000000; padding:15px; background:red; color:white; border:none; border-radius:5px;";
        btn.onclick = () => {
            this.detenerYSalir();
            document.body.classList.remove('camara-activa');
        };
        contenedor.appendChild(btn);

        // 4. Intentar encendido
        this.html5QrCode = new Html5Qrcode("lector-en-vivo");

        try {
            await this.html5QrCode.start(
                { facingMode: "environment" },
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 150 }
                },
                (codigo) => {
                    if (typeof Audio !== 'undefined') Audio.reproducir('exito');
                    document.body.classList.remove('camara-activa');
                    this.detenerYSalir();
                    callbackProcesar(codigo.trim());
                }
            );
        } catch (err) {
            console.error("DOMINUS CRITICAL ERROR:", err);
            document.body.classList.remove('camara-activa');
            this.detenerYSalir();
            alert("Error: " + err); // Para ver el error real en el teléfono
        }
    },

    // --- 🖼️ PROCESAR FOTO ---
    procesarFoto: function(callbackProcesar, alCancelar) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const archivo = e.target.files[0];
            if (!archivo) return alCancelar?.();

            notificar("🔍 Analizando...", "info");
            const tempDiv = document.createElement('div');
            tempDiv.id = "temp-lector";
            document.body.appendChild(tempDiv);
            
            const procesador = new Html5Qrcode("temp-lector");
            try {
                const codigo = await procesador.scanFile(archivo, true);
                if (typeof Audio !== 'undefined') Audio.reproducir('exito');
                callbackProcesar(codigo.trim());
            } catch (err) {
                notificar("❌ No se detectó código", "error");
                alCancelar?.();
            } finally {
                tempDiv.remove();
            }
        };
        input.click();
    },

    // --- 🛠️ LIMPIEZA DE SISTEMA ---
    detenerYSalir: async function() {
        const contenedor = document.getElementById('contenedor-camara');
        const principal = document.querySelector('body > *:not(#contenedor-camara)');
        
        if (this.html5QrCode && this.html5QrCode.isScanning) {
            await this.html5QrCode.stop();
        }
        
        contenedor.style.display = 'none';
        contenedor.innerHTML = '';
        if (principal) principal.style.filter = 'none';
    },

    // --- 🎛️ MENÚS ---
    prepararMenu: function(esVenta = true) {
        const callback = (codigo) => {
            if (esVenta) {
                const inputVenta = document.getElementById('codigo-venta');
                if (inputVenta) {
                    inputVenta.value = codigo;
                    inputVenta.dispatchEvent(new Event('input', { bubbles: true }));
                }
                Controlador.procesarCodigoEscaneado(codigo);
            } else {
                const inputInv = document.getElementById('inv-codigo');
                if (inputInv) {
                    inputInv.value = codigo;
                    inputInv.focus();
                    Controlador.prepararEdicionInventario(codigo);
                }
            }
        };

        modalEleccion.abrir({
            titulo: "🔍 Entrada de Producto",
            mensaje: "¿Cómo registrarás el código?",
            botones: [
                { texto: "🔦 Láser USB", clase: "btn-main", accion: () => this.iniciarBusquedaEscannerLaser(callback) },
                { texto: "📸 Cámara en Vivo", clase: "btn-main", style: "background:#2196F3; margin-top:10px;", accion: () => this.iniciarEscannerCamara(callback) },
                { texto: "🖼️ Subir Foto", clase: "btn-main", style: "background:#9c27b0; margin-top:10px;", accion: () => this.procesarFoto(callback, () => this.prepararMenu(esVenta)) }
            ]
        });
    }
};