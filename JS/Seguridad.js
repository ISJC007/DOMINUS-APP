const Seguridad = {

  intentosFallidos: 0,

// 1. GESTIÓN DE CLAVES
intentosFallidos: 0,

// 1. GESTIÓN DE CLAVES
getClave() {
    const uuid = Persistencia.cargar('dom_id_unico') || 'DOMINUS-CORE';
    let raw = Persistencia.cargar('dom_seguridad_pin');

    if (!raw) return '1234';

    // Limpieza ultra-rápida de residuos de JSON
    if (typeof raw === 'string') raw = raw.replace(/^"|"$/g, ''); 

    try {
        const decodificado = atob(raw); // Decodificamos la firma Base64
        
        // Verificamos si existe nuestro separador de seguridad ':'
        if (decodificado.includes(':')) {
            const [idEnFirma, pinExtraido] = decodificado.split(':');
            
            // Solo devolvemos el PIN si el ID de la firma coincide con este equipo
            if (idEnFirma === uuid) return pinExtraido;
        }
        
        // Si no tiene el formato nuevo, intentamos limpiar el UUID del string (compatibilidad)
        return decodificado.replace(uuid, ""); 
    } catch (e) {
        return raw; // Caso de texto plano o error de formato
    }
},

setClave(nuevoPin) {
    // Validación de seguridad básica
    if (!nuevoPin || nuevoPin.length < 4) {
        notificar("El PIN debe tener al menos 4 dígitos", "error");
        return false;
    }

    const uuid = Persistencia.cargar('dom_id_unico') || 'DOMINUS-CORE';
    
    // FIRMA ESTRUCTURADA: [ID DEL EQUIPO]:[PIN]
    // Esto asegura que la firma sea única para este usuario y equipo.
    const firma = btoa(`${uuid}:${nuevoPin}`);
    
    Persistencia.guardar('dom_seguridad_pin', firma);
    
    console.log("🔐 Seguridad: PIN actualizado y firmado estructuralmente.");
    notificar("PIN Guardado correctamente", "exito");
    return true;
},

vibrar(patron = [200, 100, 200]) {
    if ("vibrate" in navigator) {
        navigator.vibrate(patron);
    }
},

    // 2. LÓGICA DE INICIO (Con control de tiempo)
   async iniciarProteccion() {
    // 1. PRIMERO: Unificamos con el nombre que usa Usuario.js
    const datosLocal = Persistencia.cargar('dom_usuario_local');
    
    // Si no hay datos, o el usuario desactivó el PIN, o es un invitado
    // (Asegúrate de que 'usaPin' sea la propiedad correcta en tu Firebase)
    if (!datosLocal || datosLocal.usaPin === false) {
        console.log("🔓 Seguridad: PIN desactivado o usuario no identificado.");
        return true; 
    }

    // 2. SEGUNDO: Control de tiempo (los 5 minutos)
    const ultimaVez = localStorage.getItem('dom_ultima_auth');
    const ahora = Date.now();
    const cincoMinutos = 5 * 60 * 1000;

    if (ultimaVez && (ahora - ultimaVez < cincoMinutos)) {
        console.log("🔓 Sesión reciente. Acceso directo.");
        return true; 
    }

    // 3. TERCERO: Lanzamos el modal de PIN
    // Pasamos el mensaje y el largo de 4 dígitos por defecto
    let resultado = await this.solicitarPIN("Identidad Requerida", "4");

    if (resultado) {
        localStorage.setItem('dom_ultima_auth', Date.now());
    }
    
    return resultado; // Retorna true o false/null
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
/**
 * Lanza el modal de seguridad para validar el acceso mediante PIN.
 * @returns {Promise<boolean>}
 */
solicitarPIN() {
    return new Promise((resolve) => {
        const bloqueoGuardado = Persistencia.cargar('dom_seguridad_bloqueo');
        const ahora = Date.now();

        // 1. Verificación de Bloqueo Activo
        if (bloqueoGuardado && ahora < bloqueoGuardado) {
            const restante = Math.ceil((bloqueoGuardado - ahora) / 1000);
            notificar(`⚠️ Sistema bloqueado. Espera ${restante}s`, 'error');
            return resolve(false);
        }

        // Usamos el ID estándar para que el sistema sepa que es una capa de seguridad
        const overlay = Usuario.crearOverlay('overlay-seguridad-pin');

        overlay.innerHTML = `
            <div class="glass" style="width: 85%; max-width: 350px; padding: 35px 25px; border-radius: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h2 style="color: var(--primary); margin-bottom: 10px; font-size: 1.5rem; letter-spacing: 2px;">DOMINUS</h2>
                <p style="color: white; opacity: 0.8; margin-bottom: 25px; font-size: 0.9em;">Seguridad Requerida</p>
                
                <div style="position: relative; width: 100%; max-width: 180px; margin: 0 auto;">
                    <input type="password" id="pin-invisible" 
                           inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="one-time-code"
                           style="width: 100%; background: transparent; border: none; 
                                 border-bottom: 2px solid var(--primary); color: white; 
                                 font-size: 3rem; text-align: center; outline: none; 
                                 letter-spacing: 15px; box-sizing: border-box; font-family: monospace;">
                    
                    <span id="ojo-pin-seg" 
                          style="position: absolute; right: -40px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 1.2rem; filter: grayscale(1); user-select: none;"
                          onclick="Usuario.togglePassword('pin-invisible', 'ojo-pin-seg')">
                          🔒
                    </span>
                </div>

                <div id="pin-error" style="color: #ff4444; margin-top: 20px; height: 20px; font-size: 0.8em; font-weight: bold; min-height: 1.2em;"></div>
                
                <p id="btn-olvido-pin" style="color: #666; font-size: 0.7em; margin-top: 25px; cursor: pointer; text-decoration: underline;">
                    ¿Olvidaste tu PIN?
                </p>
            </div>
        `;

        document.body.appendChild(overlay);
        const input = document.getElementById('pin-invisible');
        const errorDiv = document.getElementById('pin-error');
        
        setTimeout(() => input.focus(), 100);

        // --- MANEJO DE OLVIDO (Unificado con dom_usuario_local) ---
        document.getElementById('btn-olvido-pin').onclick = () => {
            if(confirm("Si olvidaste tu PIN, deberás iniciar sesión nuevamente. ¿Continuar?")) {
                Persistencia.eliminar('dom_usuario_local'); 
                location.reload();
            }
        };

        input.oninput = () => {
            input.value = input.value.replace(/[^0-9]/g, '');

            if (input.value.length === 4) {
                const claveCorrecta = this.getClave(); 

                if (input.value === claveCorrecta) {
                    // ÉXITO
                    this.intentosFallidos = 0; 
                    Persistencia.guardar('dom_seguridad_bloqueo', null); 
                    
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.remove();
                        resolve(true); // Liberamos el flujo hacia iniciarDominus
                    }, 300);
                } else {
                    // ERROR
                    this.intentosFallidos++;
                    if (typeof this.vibrar === 'function') this.vibrar([100, 50, 100]);
                    
                    input.value = "";
                    input.classList.add('shake-anim');
                    
                    if (this.intentosFallidos >= 3) {
                        const tiempoBloqueo = Date.now() + 60000;
                        Persistencia.guardar('dom_seguridad_bloqueo', tiempoBloqueo);
                        this.intentosFallidos = 0;
                        
                        errorDiv.innerText = "SISTEMA BLOQUEADO";
                        notificar("Demasiados intentos. Espera 60s", 'error');
                        
                        setTimeout(() => { 
                            overlay.remove(); 
                            resolve(false); 
                        }, 1500);
                    } else {
                        errorDiv.innerText = `PIN INCORRECTO (${this.intentosFallidos}/3)`;
                        setTimeout(() => input.classList.remove('shake-anim'), 400);
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
/**
 * Lanza un modal de PIN genérico para capturar o validar datos.
 * @param {string} titulo - Instrucción para el usuario.
 * @param {number} largo - Cantidad de dígitos (def: 4).
 * @param {boolean} devolverValor - Si es true, retorna el PIN; si es false, lo valida contra el actual.
 */
solicitarPINPersonalizado(titulo, largo = 4, devolverValor = false) {
    return new Promise((resolve) => {
        // ✅ Usamos la centralización de Usuario para overlays
        const overlay = Usuario.crearOverlay('overlay-pin-personalizado');

        overlay.innerHTML = `
            <div class="glass" style="width: 85%; max-width: 350px; padding: 30px; border-radius: 20px; text-align: center;">
                <h2 style="color: var(--primary); margin-bottom: 5px; letter-spacing: 2px;">DOMINUS</h2>
                <p style="color: white; opacity: 0.8; margin-bottom: 25px; font-size: 0.95em;">${titulo}</p>
                
                <div style="position: relative; width: 170px; margin: 0 auto;">
                    <input type="password" id="pin-dinamico" 
                           inputmode="numeric" pattern="[0-9]*" maxlength="${largo}"
                           style="width: 100%; background: transparent; border: none; 
                                 border-bottom: 2px solid var(--primary); color: white; 
                                 font-size: 3rem; text-align: center; outline: none;
                                 letter-spacing: 12px; padding-right: 35px; box-sizing: border-box;">
                    
                    <span id="ojo-pin-personalizado" 
                          style="position: absolute; right: -5px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 1.2rem; filter: grayscale(1); user-select: none;"
                          onclick="Usuario.togglePassword('pin-dinamico', 'ojo-pin-personalizado')">
                          👁️
                    </span>
                </div>

                <div id="pin-error-dinamico" style="color: #ff4444; margin-top: 15px; height: 20px; font-size: 0.8em; font-weight: bold;"></div>
                
                <button id="btn-cancelar-pin" class="btn-secundario-dominus">
                    CANCELAR
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        const input = document.getElementById('pin-dinamico');
        const errorDiv = document.getElementById('pin-error-dinamico');
        const btnCancel = document.getElementById('btn-cancelar-pin');
        
        // Foco inmediato
        setTimeout(() => input.focus(), 150);

        // --- MANEJO DE CIERRE ---
        btnCancel.onclick = () => {
            overlay.remove();
            resolve(null);
        };

        // --- LÓGICA DE VALIDACIÓN / CAPTURA ---
        input.oninput = () => {
            // Limpieza de caracteres no numéricos
            input.value = input.value.replace(/[^0-9]/g, '');

            if (input.value.length === parseInt(largo)) {
                const valorCapturado = input.value;
                
                if (!devolverValor) {
                    // MODO VALIDACIÓN: Compara contra el PIN maestro
                    if (valorCapturado === this.getClave()) {
                        overlay.remove();
                        resolve(true);
                    } else {
                        if (typeof this.vibrar === 'function') this.vibrar([100, 50, 100, 50, 100]);
                        input.value = "";
                        input.classList.add('shake-anim');
                        errorDiv.innerText = "PIN INCORRECTO";
                        
                        setTimeout(() => { 
                            input.classList.remove('shake-anim');
                            if(errorDiv) errorDiv.innerText = ""; 
                        }, 1500);
                    }
                } else {
                    // MODO CAPTURA: Retorna el valor (usado para "Cambiar PIN")
                    overlay.remove();
                    resolve(valorCapturado);
                }
            }
        };
    });
}
};