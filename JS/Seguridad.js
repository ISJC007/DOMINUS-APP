const Seguridad = {
    // 1. GESTIÓN DE CLAVES (Persistencia)
    getClave() {
        // Buscamos la clave guardada; si no existe, usamos '1234' por defecto
        return Persistencia.cargar('dom_seguridad_pin') || '1234';
    },

    setClave(nuevaClave) {
        Persistencia.guardar('dom_seguridad_pin', nuevaClave);
        alert("✅ PIN de seguridad actualizado con éxito.");
    },

    // --- FUNCIÓN DE VIBRACIÓN (NUEVA) ---
    vibrar(patron = [200, 100, 200]) {
        // Verifica si el dispositivo soporta vibración
        if ("vibrate" in navigator) {
            navigator.vibrate(patron);
        }
    },

    // 2. LÓGICA DE INICIO (Con control de tiempo)
    async iniciarProteccion() {
        const ultimaVez = localStorage.getItem('dom_ultima_auth');
        const ahora = Date.now();
        const cincoMinutos = 5 * 60 * 1000; // Bloqueo automático tras 5 min de inactividad

        // Si se autenticó hace menos de 5 minutos, dejamos pasar sin preguntar
        if (ultimaVez && (ahora - ultimaVez < cincoMinutos)) {
            console.log("🔓 Sesión activa (menos de 5 min). Acceso directo.");
            return true; 
        }

        // Si pasó el tiempo, verificamos hardware biométrico
        const soportaBiometria = window.PublicKeyCredential && 
                                 await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

        let resultado = false;
        if (soportaBiometria) {
            resultado = await this.autenticarBiometrico();
        } else {
            resultado = await this.solicitarPIN();
        }

        // Si el acceso es correcto (por PIN o Huella), renovamos el sello de tiempo
        if (resultado) {
            localStorage.setItem('dom_ultima_auth', Date.now());
        }
        return resultado;
    },

    // 3. MÉTODOS DE AUTENTICACIÓN
    async autenticarBiometrico() {
        try {
            console.log("🔐 Iniciando protocolo robusto de biometría...");

            // Definimos las opciones de la credencial
            const options = {
                publicKey: {
                    // Genera un reto aleatorio que el navegador acepta mejor
                    challenge: Uint8Array.from(window.crypto.getRandomValues(new Uint8Array(32))),
                    rp: {
                        name: "DOMINUS BUSINESS",
                        id: window.location.hostname
                    },
                    userVerification: "preferred", // 'preferred' es más compatible que 'required' en algunos móviles
                    timeout: 30000 // 30 segundos
                }
            };

            const credential = await navigator.credentials.get(options);
            return !!credential; // Devuelve true si la credencial es válida

        } catch (e) {
            console.error("⚠️ Error técnico: Fallo en lectura Biométrica:", e);
            // Si hay error en la huella, volvemos a intentar con PIN
            return await this.solicitarPIN(); 
        }
    },

    async solicitarPIN() {
        const pinIngresado = prompt("DOMINUS PROTECTED\nIngrese su PIN de seguridad para entrar:");
        
        if (pinIngresado === this.getClave()) {
            return true;
        } else {
            // --- AÑADIMOS LA VIBRACIÓN AQUÍ ---
            this.vibrar([100, 50, 100, 50, 100]); // Vibración de error
            alert("❌ PIN Incorrecto");
            return false;
        }
    },

    // 4. FUNCIÓN PARA AJUSTES (Llamada desde el botón que pusimos en el panel)
    prepararCambioPIN() {
        const pinActual = prompt("🔐 Para seguridad, ingrese su PIN ACTUAL:");
        
        if (pinActual === this.getClave()) {
            const nuevoPin = prompt("✨ Ingrese su NUEVO PIN (mínimo 4 números):");
            
            if (nuevoPin && nuevoPin.length >= 4) {
                this.setClave(nuevoPin);
            } else {
                alert("❌ PIN inválido. Debe tener al menos 4 números.");
                this.vibrar(300); // Vibración corta de error
            }
        } else {
            alert("❌ El PIN ingresado no coincide con el actual.");
            this.vibrar([100, 50, 100, 50, 100]); // Vibración de error
        }
    }
};