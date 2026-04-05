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
        // 1. PRIMERO: Verificar si el usuario logueado quiere usar PIN
        // Buscamos en la sesión que creó Usuario.js
        const sesion = Persistencia.cargar('dom_sesion_activa');
        
        // Si no hay sesión o el usuario explícitamente dijo que NO quiere PIN, salimos.
        if (!sesion || !sesion.perfil || sesion.perfil.usaPin === false) {
            console.log("🔓 Seguridad: El usuario desactivó el PIN o no ha iniciado sesión.");
            return true; 
        }

        // 2. SEGUNDO: Control de tiempo (los 5 minutos)
        const ultimaVez = localStorage.getItem('dom_ultima_auth');
        const ahora = Date.now();
        const cincoMinutos = 5 * 60 * 1000;

        if (ultimaVez && (ahora - ultimaVez < cincoMinutos)) {
            console.log("🔓 Sesión activa (menos de 5 min). Acceso directo.");
            return true; 
        }

        // 3. TERCERO: Si llegamos aquí, es porque SÍ quiere PIN y ya pasó el tiempo
        let resultado = await this.solicitarPIN();

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
async prepararCambioPIN() {
    // 1. Validar PIN Actual
    const validado = await this.solicitarPINPersonalizado("🔒 Ingrese PIN ACTUAL", 4);
    if (!validado) return; // Si cancela, no hace nada

    // 2. Pedir Nuevo PIN
    const nuevoPin = await this.solicitarPINPersonalizado("✨ Ingrese NUEVO PIN", 4, true);
    if (!nuevoPin) return;

    // 3. Confirmar Nuevo PIN
    const confirmacion = await this.solicitarPINPersonalizado("✅ Confirme NUEVO PIN", 4, true);
    if (!confirmacion) return;

    // --- LÓGICA DE VALIDACIÓN FINAL ---
    if (nuevoPin === confirmacion) {
        this.setClave(nuevoPin);
        
        // Notificación de Éxito
        notificar("PIN actualizado con éxito", "exito");
        
        // Feedback táctil y auditivo (Opcional)
        this.vibrar(100); 
        console.log("🔐 PIN de DOMINUS actualizado.");
    } else {
        // Notificación de Error
        notificar("Los PIN no coinciden", "error");
        
        // Feedback de error (Vibración de rechazo)
        this.vibrar([100, 50, 100, 50, 100]);
        
        // Reintentar automáticamente para que el flujo sea fluido
        setTimeout(() => this.prepararCambioPIN(), 2000);
    }
},

// Una versión genérica de tu solicitarPIN para reusar en cambios de clave
solicitarPINPersonalizado(titulo, largo = 4, devolverValor = false) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.98); z-index: 30000;
            display: flex; align-items: center; justify-content: center;
            flex-direction: column; backdrop-filter: blur(10px);
        `;

        overlay.innerHTML = `
            <div style="text-align: center; width: 80%; max-width: 300px;">
                <h2 style="color: #ffd700; margin-bottom: 5px; font-family: sans-serif;">DOMINUS</h2>
                <p style="color: white; opacity: 0.7; margin-bottom: 20px; font-family: sans-serif;">${titulo}</p>
                <input type="password" id="pin-dinamico" 
                       inputmode="numeric" pattern="[0-9]*" maxlength="${largo}"
                       style="width: 100%; background: transparent; border: none; 
                              border-bottom: 2px solid #ffd700; color: white; 
                              font-size: 3rem; text-align: center; outline: none;">
                <div id="pin-error-dinamico" style="color: #ff4444; margin-top: 15px; height: 20px; font-family: sans-serif;"></div>
                <button id="btn-cancelar-pin" style="margin-top: 30px; background: none; border: 1px solid #444; color: #888; padding: 5px 15px; border-radius: 5px; cursor: pointer;">Cancelar</button>
            </div>
        `;

        document.body.appendChild(overlay);
        const input = document.getElementById('pin-dinamico');
        const errorDiv = document.getElementById('pin-error-dinamico');
        const btnCancel = document.getElementById('btn-cancelar-pin');
        
        input.focus();

        btnCancel.onclick = () => {
            overlay.remove();
            resolve(null);
        };

        input.oninput = () => {
            if (input.value.length === largo) {
                const valorCapturado = input.value;
                
                // Si es solo para validar el actual
                if (!devolverValor) {
                    if (valorCapturado === this.getClave()) {
                        overlay.remove();
                        resolve(true);
                    } else {
                        this.vibrar([100, 50, 100, 50, 100]);
                        input.value = "";
                        errorDiv.innerText = "PIN INCORRECTO";
                        setTimeout(() => errorDiv.innerText = "", 1500);
                    }
                } else {
                    // Si es para capturar un valor nuevo
                    overlay.remove();
                    resolve(valorCapturado);
                }
            }
        };
    });
    }
};