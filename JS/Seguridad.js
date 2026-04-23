const Seguridad = {

    intentosFallidos: 0,

    // 1. GESTIÓN DE CLAVES (Persistencia)
getClave() {
    const uuid = Persistencia.cargar('dom_id_unico') || 'DOMINUS-CORE';
    let raw = Persistencia.cargar('dom_seguridad_pin');

    if (!raw) return '1234';

    // 🚩 EL PARCHE: Si viene con comillas de JSON, las quitamos
    if (typeof raw === 'string') {
        raw = raw.replace(/^"|"$/g, ''); 
    }

    try {
        const decodificado = atob(raw);
        if (decodificado.startsWith(uuid)) {
            return decodificado.replace(uuid, "");
        }
        return raw; // Caso de PIN viejo
    } catch (e) {
        return raw; // Caso de texto plano
    }
},

    setClave(nuevoPin) {
        const uuid = Persistencia.cargar('dom_id_unico') || 'DOMINUS-CORE';
        
        // CREAMOS LA FIRMA ÚNICA
        const firma = btoa(uuid + nuevoPin);
        
        // GUARDAMOS
        Persistencia.guardar('dom_seguridad_pin', firma);
        
        // LIMPIEZA DE SEGURIDAD: Borramos cualquier rastro del PIN viejo si existiera
        // (Asegúrate de que no haya otra variable 'pin' flotando)
        
        console.log("🔐 Seguridad: PIN actualizado y firmado para este equipo.");
        notificar("PIN Guardado correctamente", "exito");
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
                                 letter-spacing: 15px; box-sizing: border-box; font-family: monospace;">
                    
                    <span id="ojo-pin-seg" 
                          style="position: absolute; right: -40px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 1.2rem; filter: grayscale(1); user-select: none;"
                          onclick="Usuario.togglePassword('pin-invisible', 'ojo-pin-seg')">
                          🔒
                    </span>
                </div>

                <div id="pin-error" style="color: #ff4444; margin-top: 20px; height: 20px; font-size: 0.8em; font-weight: bold;"></div>
                
                <p id="btn-olvido-pin" style="color: #666; font-size: 0.7em; margin-top: 25px; cursor: pointer; text-decoration: underline;">
                    ¿Olvidaste tu PIN?
                </p>
            </div>
        `;

        document.body.appendChild(overlay);
        const input = document.getElementById('pin-invisible');
        const errorDiv = document.getElementById('pin-error');
        input.focus();

        // Escotilla de emergencia: Si olvida el PIN, deslogueamos para que entre con su correo
        document.getElementById('btn-olvido-pin').onclick = () => {
            if(confirm("Si olvidaste tu PIN, deberás iniciar sesión nuevamente con tu correo y contraseña. ¿Continuar?")) {
                Persistencia.eliminar('dom_sesion_activa'); // Borra la sesión para forzar login
                location.reload();
            }
        };

        input.oninput = () => {
            input.value = input.value.replace(/[^0-9]/g, '');

            if (input.value.length === 4) {
                // Aquí usamos el getClave() que ya tiene el UUID integrado
                if (input.value === this.getClave()) {
                    this.intentosFallidos = 0; 
                    Persistencia.guardar('dom_seguridad_bloqueo', null); 
                    
                    // ✅ CRÍTICO: Avisamos al sistema que la sesión es válida ahora
                    Usuario.sesionValidadaPorPin = true; 
                    
                    overlay.remove();
                    resolve(true);
                } else {
                    this.intentosFallidos++;
                    this.vibrar([100, 50, 100]);
                    input.value = "";
                    
                    if (this.intentosFallidos >= 3) {
                        const tiempoBloqueo = Date.now() + 60000; // 1 minuto de bloqueo real
                        Persistencia.guardar('dom_seguridad_bloqueo', tiempoBloqueo);
                        this.intentosFallidos = 0;
                        
                        errorDiv.innerText = "SISTEMA BLOQUEADO";
                        notificar("Demasiados intentos. Bloqueo: 60s", 'error');
                        setTimeout(() => { overlay.remove(); resolve(false); }, 1500);
                    } else {
                        errorDiv.innerText = `PIN INCORRECTO (${this.intentosFallidos}/3)`;
                        // Efecto de vibración visual en el input
                        input.classList.add('shake-anim'); 
                        setTimeout(() => input.classList.remove('shake-anim'), 300);
                    }
                }
            }
        };
    });
},
    // 4. FUNCIÓN PARA AJUSTES
async prepararCambioPIN() {
    // 1. Validar PIN Actual
    // Aquí el sistema verifica que el usuario conoce la clave que quiere cambiar
    const validado = await this.solicitarPINPersonalizado("🔒 Ingrese PIN ACTUAL", 4);
    if (!validado) return; // Si cancela o el PIN es incorrecto (dentro de la función), se detiene

    // 2. Pedir Nuevo PIN
    // Pasamos 'true' para que nos devuelva el valor escrito y no solo un booleano
    const nuevoPin = await this.solicitarPINPersonalizado("✨ Ingrese NUEVO PIN", 4, true);
    if (!nuevoPin) return;

    // 🛡️ Validación Extra: Evitar que el PIN nuevo sea igual al viejo
    if (nuevoPin === this.getClave()) {
        notificar("El PIN nuevo no puede ser igual al actual", "error");
        this.vibrar([100, 50, 100]);
        return;
    }

    // 3. Confirmar Nuevo PIN
    const confirmacion = await this.solicitarPINPersonalizado("✅ Confirme NUEVO PIN", 4, true);
    if (!confirmacion) return;

    // --- LÓGICA DE VALIDACIÓN FINAL ---
    if (nuevoPin === confirmacion) {
        // Guardamos en persistencia
        this.setClave(nuevoPin);
        
        // Notificación de Éxito usando tu sistema de notificar
        notificar("PIN actualizado con éxito", "exito");
        
        // Feedback físico
        this.vibrar(100); 
        console.log("🔐 PIN de DOMINUS actualizado correctamente.");
    } else {
        // Notificación de Error
        notificar("Los PIN no coinciden", "error");
        
        // Feedback de error (Vibración de rechazo)
        this.vibrar([100, 50, 100, 50, 100]);
        
        // Reintentar automáticamente para que el flujo sea fluido (con un tiempo prudente)
        setTimeout(() => {
            this.prepararCambioPIN();
        }, 1500);
    }
},

// Una versión genérica de tu solicitarPIN para reusar en cambios de clave
solicitarPINPersonalizado(titulo, largo = 4, devolverValor = false) {
    return new Promise((resolve) => {
        // ✅ CORRECCIÓN: Usamos Usuario.crearOverlay porque Seguridad no tiene ese método
        const overlay = Usuario.crearOverlay('overlay-pin-personalizado');

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

        // 🛡️ Manejo de cierre seguro
        btnCancel.onclick = () => {
            overlay.remove();
            resolve(null);
        };

        // UX: Efectos visuales del botón
        btnCancel.onmouseover = () => { 
            btnCancel.style.background = "rgba(255,255,255,0.1)"; 
            btnCancel.style.color = "#fff"; 
        };
        btnCancel.onmouseout = () => { 
            btnCancel.style.background = "rgba(255,255,255,0.05)"; 
            btnCancel.style.color = "#bbb"; 
        };

        // 🚀 Lógica de validación en tiempo real
        input.oninput = () => {
            if (input.value.length === largo) {
                const valorCapturado = input.value;
                
                if (!devolverValor) {
                    // Modo validación: Compara con el PIN guardado
                    if (valorCapturado === this.getClave()) {
                        overlay.remove();
                        resolve(true);
                    } else {
                        this.vibrar([100, 50, 100, 50, 100]);
                        input.value = "";
                        errorDiv.innerText = "PIN INCORRECTO";
                        setTimeout(() => { if(errorDiv) errorDiv.innerText = ""; }, 1500);
                    }
                } else {
                    // Modo captura: Devuelve lo que el usuario escribió (para PIN nuevo)
                    overlay.remove();
                    resolve(valorCapturado);
                }
            }
        };
    });
}
};