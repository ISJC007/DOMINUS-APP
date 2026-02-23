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
            console.log("🔐 Intentando autenticación biométrica...");
            // Esto activa el sensor de huella/rostro nativo del sistema
            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge: new Uint8Array([10, 20, 30, 40]), // Reto de seguridad
                    authenticatorSelection: { userVerification: "required" },
                    timeout: 60000
                }
            });
            return !!credential; 
        } catch (e) {
            console.warn("⚠️ Biometría fallida o cancelada, recurriendo a PIN.");
            return await this.solicitarPIN(); 
        }
    },

    async solicitarPIN() {
        const pinIngresado = prompt("DOMINUS PROTECTED\nIngrese su PIN de seguridad para entrar:");
        
        if (pinIngresado === this.getClave()) {
            return true;
        } else {
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
            }
        } else {
            alert("❌ El PIN ingresado no coincide con el actual.");
        }
    }
};