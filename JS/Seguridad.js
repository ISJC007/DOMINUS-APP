const Seguridad = {

    intentosFallidos: 0,

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
            // 1. Usamos tu función Persistencia.cargar()
            const bloqueoGuardado = Persistencia.cargar('dom_seguridad_bloqueo');
            const ahora = Date.now();

            if (bloqueoGuardado && ahora < bloqueoGuardado) {
                const restante = Math.ceil((bloqueoGuardado - ahora) / 1000);
                notificar(`⚠️ Sistema bloqueado. Espera ${restante}s`, 'error');
                return resolve(false);
            }

            const overlay = Usuario.crearOverlay('overlay-seguridad-pin');

            overlay.innerHTML = `
                <div class="glass" style="width: 85%; max-width: 350px; padding: 35px 25px; border-radius: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <h2 style="color: #ffd700; margin-bottom: 10px; font-size: 1.5rem; letter-spacing: 2px;">DOMINUS</h2>
                    <p style="color: white; opacity: 0.8; margin-bottom: 25px; font-size: 0.9em;">Seguridad Requerida</p>
                    
                    <div style="position: relative; width: 100%; max-width: 180px; margin: 0 auto;">
                        <input type="password" id="pin-invisible" 
                               inputmode="numeric" pattern="[0-9]*" maxlength="4"
                               style="width: 100%; background: transparent; border: none; 
                                     border-bottom: 2px solid #ffd700; color: white; 
                                     font-size: 3rem; text-align: center; outline: none; 
                                     letter-spacing: 15px; text-indent: 15px;
                                     box-sizing: border-box; font-family: monospace;">
                        
                        <span id="ojo-pin-seg" 
                              style="position: absolute; right: -40px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 1.2rem; filter: grayscale(1); user-select: none;"
                              onclick="Usuario.togglePassword('pin-invisible', 'ojo-pin-seg')">
                              🔒
                        </span>
                    </div>

                    <div id="pin-error" style="color: #ff4444; margin-top: 20px; height: 20px; font-size: 0.8em; font-weight: bold; text-shadow: 0 0 10px rgba(255,0,0,0.3);"></div>
                </div>
            `;

            document.body.appendChild(overlay);
            const input = document.getElementById('pin-invisible');
            const errorDiv = document.getElementById('pin-error');
            input.focus();

            input.oninput = () => {
                input.value = input.value.replace(/[^0-9]/g, '');

                if (input.value.length === 4) {
                    if (input.value === this.getClave()) {
                        this.intentosFallidos = 0; 
                        // Para "eliminar" el bloqueo usando tu función:
                        Persistencia.guardar('dom_seguridad_bloqueo', null); 
                        overlay.remove();
                        resolve(true);
                    } else {
                        this.intentosFallidos++;
                        this.vibrar([100, 50, 100]);
                        input.value = "";
                        
                        if (this.intentosFallidos >= 3) {
                            const tiempoBloqueo = Date.now() + 30000; 
                            // Usamos tu función Persistencia.guardar()
                            Persistencia.guardar('dom_seguridad_bloqueo', tiempoBloqueo);
                            this.intentosFallidos = 0;
                            
                            errorDiv.innerText = "SISTEMA BLOQUEADO";
                            notificar("Bloqueo de seguridad: 30s", 'error');
                            setTimeout(() => { overlay.remove(); resolve(false); }, 1500);
                        } else {
                            errorDiv.innerText = `PIN INCORRECTO (${this.intentosFallidos}/3)`;
                            input.parentElement.style.animation = "shake 0.3s ease";
                            setTimeout(() => {
                                errorDiv.innerText = "";
                                input.parentElement.style.animation = "";
                            }, 1500);
                        }
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
        // Usamos la utilidad crearOverlay para asegurar el desenfoque y centrado
        const overlay = this.crearOverlay('overlay-pin-personalizado');

        overlay.innerHTML = `
            <div class="glass" style="width: 85%; max-width: 350px; padding: 30px; border-radius: 20px; text-align: center;">
                <h2 style="color: #ffd700; margin-bottom: 5px; letter-spacing: 2px;">DOMINUS</h2>
                <p style="color: white; opacity: 0.8; margin-bottom: 25px; font-size: 0.95em;">${titulo}</p>
                
                <div style="position: relative; width: 170px; margin: 0 auto;">
                    <input type="password" id="pin-dinamico" 
                           inputmode="numeric" pattern="[0-9]*" maxlength="${largo}"
                           style="width: 100%; background: transparent; border: none; 
                                  border-bottom: 2px solid #ffd700; color: white; 
                                  font-size: 3rem; text-align: center; outline: none;
                                  letter-spacing: 12px; padding-right: 35px; box-sizing: border-box;">
                    
                    <span id="ojo-pin-personalizado" 
                          style="position: absolute; right: -5px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 1.2rem; filter: grayscale(1); user-select: none;"
                          onclick="Usuario.togglePassword('pin-dinamico', 'ojo-pin-personalizado')">
                          👁️
                    </span>
                </div>

                <div id="pin-error-dinamico" style="color: #ff4444; margin-top: 15px; height: 20px; font-size: 0.8em; font-weight: bold;"></div>
                
                <button id="btn-cancelar-pin" 
                        style="margin-top: 25px; background: rgba(255,255,255,0.05); border: 1px solid #444; color: #bbb; width: 100%; padding: 12px; border-radius: 10px; cursor: pointer; font-size: 0.9em; transition: all 0.3s ease;">
                    CANCELAR
                </button>
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

        // Efecto hover para el botón de cancelar
        btnCancel.onmouseover = () => { btnCancel.style.background = "rgba(255,255,255,0.1)"; btnCancel.style.color = "#fff"; };
        btnCancel.onmouseout = () => { btnCancel.style.background = "rgba(255,255,255,0.05)"; btnCancel.style.color = "#bbb"; };

        input.oninput = () => {
            if (input.value.length === largo) {
                const valorCapturado = input.value;
                
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
                    overlay.remove();
                    resolve(valorCapturado);
                }
            }
        };
    });
    }
};