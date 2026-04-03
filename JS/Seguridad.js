const Seguridad = {
    // 1. GESTIÓN DE CLAVES (Persistencia)
    getClave() {
        return Persistencia.cargar('dom_seguridad_pin') || '1234';
    },

    setClave(nuevaClave) {
        Persistencia.guardar('dom_seguridad_pin', nuevaClave);
        alert("✅ PIN de seguridad actualizado con éxito.");
    },

    vibrar(patron = [200, 100, 200]) {
        if ("vibrate" in navigator) {
            navigator.vibrate(patron);
        }
    },

    // 2. LÓGICA DE INICIO (Con control de tiempo)
    async iniciarProteccion() {
        const ultimaVez = localStorage.getItem('dom_ultima_auth');
        const ahora = Date.now();
        const cincoMinutos = 5 * 60 * 1000;

        if (ultimaVez && (ahora - ultimaVez < cincoMinutos)) {
            console.log("🔓 Sesión activa (menos de 5 min). Acceso directo.");
            return true; 
        }

        // COMENTADO TEMPORALMENTE PARA DESARROLLO LOCAL (Evita errores de dominio)
        // const soportaBiometria = window.PublicKeyCredential && 
        //                          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        const soportaBiometria = false; 

        let resultado = false;
        if (soportaBiometria) {
            resultado = await this.autenticarBiometrico();
        } else {
            resultado = await this.solicitarPIN();
        }

        if (resultado) {
            localStorage.setItem('dom_ultima_auth', Date.now());
        }
        return resultado;
    },

    // 3. MÉTODOS DE AUTENTICACIÓN
    async autenticarBiometrico() {
        try {
            console.log("🔐 Iniciando protocolo robusto de biometría...");
            const options = {
                publicKey: {
                    challenge: Uint8Array.from(window.crypto.getRandomValues(new Uint8Array(32))),
                    rp: { name: "DOMINUS BUSINESS", id: window.location.hostname },
                    user: {
                        id: Uint8Array.from("user_id", c => c.charCodeAt(0)),
                        name: "Johander José",
                        displayName: "Johander"
                    },
                    pubKeyCredParams: [{alg: -7, type: "public-key"}],
                    userVerification: "preferred",
                    timeout: 30000
                }
            };
            const credential = await navigator.credentials.get(options);
            return !!credential;
        } catch (e) {
            console.error("⚠️ Error técnico:", e);
            return await this.solicitarPIN(); 
        }
    },

    // --- MEJORA: SOLICITAR PIN SIN PROMPT ---
    solicitarPIN() {
        return new Promise((resolve) => {
            // 1. Crear el contenedor visual desde JS
            const overlay = document.createElement('div');
            overlay.style = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.95); z-index: 20000;
                display: flex; align-items: center; justify-content: center;
                flex-direction: column; font-family: sans-serif;
            `;

            overlay.innerHTML = `
                <div style="text-align: center; width: 80%; max-width: 300px;">
                    <h2 style="color: #ffd700; margin-bottom: 5px;">DOMINUS</h2>
                    <p style="color: white; opacity: 0.7; margin-bottom: 20px;">Seguridad Requerida</p>
                    <input type="password" id="pin-invisible" 
                           inputmode="numeric" pattern="[0-9]*" maxlength="4"
                           style="width: 100%; background: transparent; border: none; 
                                  border-bottom: 2px solid #ffd700; color: white; 
                                  font-size: 3rem; text-align: center; outline: none;">
                    <div id="pin-error" style="color: #ff4444; margin-top: 15px; height: 20px;"></div>
                </div>
            `;

            document.body.appendChild(overlay);
            const input = document.getElementById('pin-invisible');
            const errorDiv = document.getElementById('pin-error');
            
            input.focus();

            // 2. Lógica de validación automática al escribir
            input.oninput = () => {
                if (input.value.length === 4) {
                    if (input.value === this.getClave()) {
                        overlay.remove();
                        resolve(true);
                    } else {
                        this.vibrar([100, 50, 100, 50, 100]);
                        input.value = "";
                        errorDiv.innerText = "PIN INCORRECTO";
                        setTimeout(() => errorDiv.innerText = "", 1500);
                    }
                }
            };
        });
    },

    // 4. FUNCIÓN PARA AJUSTES
    prepararCambioPIN() {
        const pinActual = prompt("🔐 Para seguridad, ingrese su PIN ACTUAL:");
        if (pinActual === this.getClave()) {
            const nuevoPin = prompt("✨ Ingrese su NUEVO PIN (mínimo 4 números):");
            if (nuevoPin && nuevoPin.length >= 4) {
                this.setClave(nuevoPin);
            } else {
                alert("❌ PIN inválido.");
                this.vibrar(300);
            }
        } else {
            alert("❌ El PIN no coincide.");
            this.vibrar([100, 50, 100, 50, 100]);
        }
    }
};