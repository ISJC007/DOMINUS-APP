/**
 * DOMINUS - Sistema Avanzado de Autenticación
 * Flujo: Login -> Registro -> Verificación (Simulada) -> PIN Opcional -> Auto-Login
 */

const Usuario = {
    datos: null,
    dbSimulada: 'dom_usuarios_db',
    sesionActual: 'dom_sesion_activa',

  init() {
    console.log("🔐 DOMI: Verificando sesión y estado de aprobación...");
    
    // Cargamos lo que hay en LocalStorage (Offline First)
    const sesion = Persistencia.cargar(this.sesionActual);
    
    if (sesion && sesion.perfil) {
        this.datos = sesion.perfil;
        
        // 🛡️ FILTRO DE SEGURIDAD INTEGRAL
        // Verificamos si el estado es 'pendiente' o 'bloqueado_temp'
        // Al estar aplanados en 'procesarLogin', los campos están en el primer nivel de this.datos
        const estadoActual = this.datos.estado;

        if (estadoActual === 'pendiente' || !sesion.logueado) {
            console.log("⏳ Acceso retenido: Esperando aprobación del Mando Central.");
            this.mostrarPantallaEspera(); 
            return false; 
        }

        if (estadoActual === 'bloqueado_temp' || estadoActual === 'suspendido') {
            console.log("🚫 Acceso denegado: Esta cuenta se encuentra inactiva.");
            notificar("Cuenta suspendida temporalmente", "error");
            this.mostrarLogin(); 
            return false;
        }

        console.log(`👤 Guerrero en línea: ${this.datos.usuario || this.datos.nombre}`);
        
        // Iniciamos el rastro de presencia en la nube
        this.actualizarPresencia();
        
        return true; // Acceso concedido al Dashboard
    } else {
        console.log("🎟️ Sin sesión previa. Iniciando portal de acceso...");
        this.mostrarLogin();
        return false;
    }
},

    // --- OPTIMIZACIÓN DE MEDIA (GEMS: NIVEL 2) ---
    async procesarFotoRegistro(archivo) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(archivo);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Tamaño máximo (Avatar)
                    const MAX_SIZE = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Comprimimos al 70% en formato JPEG para ahorrar espacio
                    const fotoOptimizada = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(fotoOptimizada);
                };
            };
        });
    },

    async obtenerIDUnico() {
        // 1. CAPTURA DE DATOS (El ADN del Hardware)
        const hardware = {
            n: navigator.hardwareConcurrency || 0,
            m: navigator.deviceMemory || 0,
            r: `${screen.width}x${screen.height}`,
            ua: navigator.userAgent,
            z: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // 2. EL ANCLA (Canvas Fingerprint)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200; canvas.height = 20;
        ctx.textBaseline = "top"; ctx.font = "14px 'Arial'";
        ctx.fillText("DOMINUS-AUTH-TOKEN-99", 2, 2);
        const huellaCanvas = canvas.toDataURL().slice(-50);

        // 3. IDENTIDAD FINAL
        const rawID = `${hardware.n}-${hardware.m}-${hardware.r}-${huellaCanvas}`;
        const idGenerado = btoa(rawID).substring(0, 16);

        // 4. TESTEO DE COINCIDENCIA (Usando tu sistema Persistencia)
        const idViejo = Persistencia.cargar('dom_id_unico');
        const mapaViejo = Persistencia.cargar('dom_mapa_hardware');
        
        let porcentajeSimilitud = 100;

        if (mapaViejo) {
            let aciertos = 0;
            const puntos = [
                hardware.n === mapaViejo.n,
                hardware.m === mapaViejo.m,
                hardware.r === mapaViejo.r,
                huellaCanvas === mapaViejo.huella,
                hardware.z === mapaViejo.z
            ];
            aciertos = puntos.filter(p => p).length;
            porcentajeSimilitud = (aciertos / puntos.length) * 100;
        }

        const identidad = {
            idFinal: (porcentajeSimilitud >= 80 && idViejo) ? idViejo : idGenerado,
            mapaHardware: { ...hardware, huella: huellaCanvas },
            porcentajeSimilitud: porcentajeSimilitud
        };

        // Guardamos usando tu lógica actual
        Persistencia.guardar('dom_id_unico', identidad.idFinal);
        Persistencia.guardar('dom_mapa_hardware', identidad.mapaHardware);

        return identidad;
    },


mostrarLogin() {
    this.limpiarPantalla();
    const overlay = this.crearOverlay('overlay-login');

    overlay.innerHTML = `
        <div class="glass" style="width: 85%; max-width: 400px; padding: 35px; border-radius: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            <h2 style="color: var(--primary); margin-bottom: 5px; letter-spacing: 2px;">DOMINUS</h2>
            <p style="color: #888; font-size: 0.85em; margin-bottom: 25px; text-transform: uppercase;">Control de Acceso</p>
            
            <input type="text" id="login-user" placeholder="Usuario o Correo" class="input-moderno" 
                   style="width: 100%; margin-bottom: 15px; padding: 14px; box-sizing: border-box;">
            
            <div style="position: relative; width: 100%; margin-bottom: 8px;">
                <input type="password" id="login-pass" placeholder="Contraseña" class="input-moderno" 
                       style="width: 100%; padding: 14px; padding-right: 50px; box-sizing: border-box;">
                
                <span id="btn-ver-login" 
                      style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 1.2rem; filter: grayscale(1); user-select: none;"
                      onclick="Usuario.togglePassword('login-pass', 'btn-ver-login')">
                      👁️
                </span>
            </div>

            <p id="link-recuperar" style="color: #666; font-size: 0.75em; text-align: right; margin-bottom: 25px; cursor: pointer; transition: 0.3s;">
                ¿Olvidaste tu contraseña?
            </p>
            
            <button id="btn-login" class="btn-main" style="width: 100%; padding: 16px; font-weight: bold; font-size: 1em;">ENTRAR</button>
            
            <p style="color: #888; font-size: 0.85em; margin-top: 25px;">
                ¿No tienes cuenta? <br>
                <span id="link-registro" style="color: var(--primary); cursor: pointer; font-weight: bold; text-decoration: underline; display: inline-block; margin-top: 5px;">Regístrate aquí</span>
            </p>
        </div>
    `;

    document.body.appendChild(overlay);

    // --- LÓGICA DE RECUPERACIÓN (FIREBASE) ---
    document.getElementById('link-recuperar').onclick = async () => {
        const email = prompt("Introduce tu correo para recibir instrucciones:");
        if (email) {
            try {
                notificar("Enviando correo...", "alerta");
                // Asegúrate de que Cloud.auth esté correctamente inicializado
                await Cloud.auth.sendPasswordResetEmail(email);
                notificar("Instrucciones enviadas", "exito");
            } catch (error) {
                console.error("Auth Error:", error);
                notificar("Error: Verifica el correo", "error");
            }
        }
    };

    // --- LÓGICA DE ACCESO ---
    document.getElementById('btn-login').onclick = () => {
        const user = document.getElementById('login-user').value.trim();
        const pass = document.getElementById('login-pass').value.trim();
        
        if(!user || !pass) return notificar("Faltan datos", "alerta");
        
        this.procesarLogin(user, pass);
    };

    // --- NAVEGACIÓN A REGISTRO ---
    document.getElementById('link-registro').onclick = () => {
        overlay.style.opacity = '0'; // Efecto de salida suave
        setTimeout(() => {
            overlay.remove();
            this.mostrarRegistro();
        }, 300);
    };
},
    // ==========================================
    // PANTALLA 2: REGISTRO
    // ==========================================

mostrarRegistro() {
    this.limpiarPantalla();
    const overlay = this.crearOverlay('overlay-registro');

    overlay.innerHTML = `
        <div class="glass" style="width: 90%; max-width: 450px; padding: 25px; border-radius: 20px; text-align: center; max-height: 92vh; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1);">
            <h2 style="color: var(--primary); margin-bottom: 5px; letter-spacing: 1px;">DOMINUS</h2>
            <p style="color: #eee; margin-bottom: 20px; font-size: 0.9em; opacity: 0.7;">Crea tu ecosistema de gestión</p>
            
            <div style="position: relative; width: 110px; height: 110px; margin: 0 auto 25px;">
                <div id="p-container" class="p-container-avatar">
                    <span id="placeholder-icon" style="font-size: 3.2rem;">👤</span>
                    <img id="img-preview" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                </div>
                <label for="reg-foto" style="position: absolute; bottom: 5px; right: 5px; background: var(--primary); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 3px solid #111; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                    📷
                </label>
                <input type="file" id="reg-foto" accept="image/*" style="display: none;">
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                <input type="text" id="reg-nombre" placeholder="Nombres" class="input-moderno" style="width: 50%; padding: 12px;">
                <input type="text" id="reg-apellido" placeholder="Apellidos" class="input-moderno" style="width: 50%; padding: 12px;">
            </div>
            
            <input type="text" id="reg-negocio" placeholder="Nombre de tu Negocio" class="input-moderno" style="width: 100%; margin-bottom: 12px; padding: 12px; box-sizing: border-box; border-left: 4px solid var(--primary);">
            
            <input type="email" id="reg-correo" placeholder="Correo Electrónico" class="input-moderno" style="width: 100%; padding: 12px; box-sizing: border-box;">
            <p id="msg-correo" class="msg-validacion">• Ingresa un correo válido (@ y .com)</p>
            
            <input type="tel" id="reg-tlf" value="+58" class="input-moderno" style="width: 100%; padding: 12px; box-sizing: border-box; border-left: 4px solid #2ecc71;">
            <p id="msg-tlf" class="msg-validacion">• Completa tu número después del +58</p>

            <input type="text" id="reg-user" placeholder="Nombre de Usuario" class="input-moderno" style="width: 100%; margin-bottom: 15px; padding: 12px; box-sizing: border-box;">
            
            <div style="background: rgba(0,0,0,0.25); padding: 18px; border-radius: 12px; margin-bottom: 20px; text-align: left; border: 1px solid rgba(255,255,255,0.05);">
                <div style="position: relative; width: 100%; margin-bottom: 5px;">
                    <input type="password" id="reg-pass1" placeholder="Nueva Contraseña" class="input-moderno" 
                           style="width: 100%; padding: 12px; padding-right: 45px; box-sizing: border-box;">
                    <span id="ojo-reg-1" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; opacity: 0.5;"
                          onclick="Usuario.togglePassword('reg-pass1', 'ojo-reg-1')">👁️</span>
                </div>
                <p id="msg-pass1" class="msg-validacion">• 8+ carac, Mayúscula y Número.</p>

                <div style="position: relative; width: 100%; margin-bottom: 5px;">
                    <input type="password" id="reg-pass2" placeholder="Repetir Contraseña" class="input-moderno" 
                           style="width: 100%; padding: 12px; padding-right: 45px; box-sizing: border-box;">
                    <span id="ojo-reg-2" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; opacity: 0.5;"
                          onclick="Usuario.togglePassword('reg-pass2', 'ojo-reg-2')">👁️</span>
                </div>
                <p id="msg-pass2" class="msg-validacion">• Deben coincidir.</p>
            </div>

            <button id="btn-crear-cuenta" class="btn-main" style="width: 100%; padding: 16px; opacity: 0.5; cursor: not-allowed;" disabled>FINALIZAR REGISTRO</button>
            <p id="link-volver-login" style="color: #666; cursor: pointer; margin-top: 20px; font-size: 0.85em; text-decoration: underline;">Ya tengo una cuenta</p>
        </div>
    `;

    document.body.appendChild(overlay);

    const campos = {
        p1: document.getElementById('reg-pass1'),
        p2: document.getElementById('reg-pass2'),
        correo: document.getElementById('reg-correo'),
        tlf: document.getElementById('reg-tlf'),
        btn: document.getElementById('btn-crear-cuenta')
    };

    const mensajes = {
        m1: document.getElementById('msg-pass1'),
        m2: document.getElementById('msg-pass2'),
        mCorreo: document.getElementById('msg-correo'),
        mTlf: document.getElementById('msg-tlf')
    };

    // --- PROTECCIÓN DE PREFIJO ---
    campos.tlf.onkeydown = (e) => {
        if (campos.tlf.selectionStart <= 3 && (e.key === 'Backspace' || e.key === 'Delete')) {
            e.preventDefault();
        }
    };

    // --- VALIDACIÓN MAESTRA ---
    const validarFormulario = () => {
        if (!campos.tlf.value.startsWith('+58')) campos.tlf.value = '+58';

        const regexPass = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const checks = {
            correo: regexEmail.test(campos.correo.value),
            tlf: campos.tlf.value.trim().length === 13,
            pass: regexPass.test(campos.p1.value),
            match: campos.p2.value.length > 0 && campos.p1.value === campos.p2.value
        };

        // Estilos dinámicos
        const updateUI = (ok, msgElement, inputElement, textOk, textError) => {
            msgElement.innerText = ok ? `✅ ${textOk}` : `❌ ${textError}`;
            msgElement.style.color = ok ? "#2ecc71" : "#ff4444";
            inputElement.style.borderColor = ok ? "#2ecc71" : "rgba(255,255,255,0.1)";
        };

        updateUI(checks.correo, mensajes.mCorreo, campos.correo, "Válido", "Correo inválido");
        updateUI(checks.tlf, mensajes.mTlf, campos.tlf, "Completo", "Faltan dígitos");
        updateUI(checks.pass, mensajes.m1, campos.p1, "Segura", "8+ carac, Mayús y Núm");
        updateUI(checks.match, mensajes.m2, campos.p2, "Coinciden", "No coinciden");

        const todoOk = Object.values(checks).every(v => v);
        campos.btn.disabled = !todoOk;
        campos.btn.style.opacity = todoOk ? "1" : "0.5";
        campos.btn.style.cursor = todoOk ? "pointer" : "not-allowed";
    };

    [campos.p1, campos.p2, campos.correo, campos.tlf].forEach(el => el.oninput = validarFormulario);

    // --- MANEJO DE IMAGEN ---
    const inputFoto = document.getElementById('reg-foto');
    const imgPreview = document.getElementById('img-preview');
    const placeholder = document.getElementById('placeholder-icon');
    let fotoProcesada = null;

    inputFoto.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            fotoProcesada = await this.procesarFotoRegistro(file);
            imgPreview.src = fotoProcesada;
            imgPreview.style.display = 'block';
            placeholder.style.display = 'none';
        }
    };

    document.getElementById('link-volver-login').onclick = () => {
        overlay.remove();
        this.mostrarLogin();
    };

    campos.btn.onclick = async () => {
        const identidad = await this.obtenerIDUnico();
        const nuevoPerfil = {
            nombre: document.getElementById('reg-nombre').value,
            apellido: document.getElementById('reg-apellido').value,
            negocio: document.getElementById('reg-negocio').value,
            correo: campos.correo.value,
            telefono: campos.tlf.value,
            usuario: document.getElementById('reg-user').value,
            pass: campos.p1.value,
            foto: fotoProcesada,
            identidad: identidad
        };
        
        overlay.remove();
        this.simularEnvioCorreo(nuevoPerfil);
    };
},

cerrarSesion() {
    // 🔥 IMPORTANTE: Apagar radares para evitar fugas de datos
    if (Usuario.datos && Usuario.datos.uid) {
        DA_Cloud.db.ref(`usuarios/${Usuario.datos.uid}/comunicacion/mensajeDirecto`).off();
        DA_Cloud.db.ref('config_global/anuncio').off();
    }
    
    localStorage.removeItem('dom_sesion'); 
    location.reload();
},


    // ==========================================
    // PANTALLA 3: VERIFICACIÓN DE CORREO
    // ==========================================
   simularEnvioCorreo(perfil) {
        // 1. Generamos código de 6 dígitos para mayor seguridad
        const codigoReal = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 2. Bifurcación técnica (Local vs Real)
        const modoDesarrollador = confirm(
            "DOMINUS DEVS:\n\n¿Desea usar el Simulador Local?\n(Aceptar = Alerta local / Cancelar = Preparar envío Gmail)"
        );

        if (modoDesarrollador) {
            // MODO LOCAL: Para pruebas rápidas
            alert(`[SIMULADOR LOCAL]\n\nCódigo para ${perfil.correo}:\n${codigoReal}`);
            this.mostrarVerificacion(perfil, codigoReal);
        } else {
            // MODO GMAIL: Aquí es donde conectaremos el bot de correo luego
            console.log("🚀 Iniciando protocolo de envío Gmail...");
            
            // TODO: Integrar EmailJS o Firebase Functions aquí
            notificar("Enviando código a su correo...", "info");
            
            // Por ahora, para no trabar el flujo hoy, lanzamos la alerta
            // pero dejamos la marca de que esto será automático.
            alert(`SOPORTE DOMINUS:\nSe ha enviado un código de seguridad a ${perfil.correo}`);
            this.mostrarVerificacion(perfil, codigoReal);
        }
    },

/**
 * Renderiza la interfaz de verificación de identidad mediante código.
 * @param {Object} perfil - Datos del usuario a registrar.
 * @param {string} codigoReal - El código generado aleatoriamente.
 */
mostrarVerificacion(perfil, codigoReal) {
    const overlay = this.crearOverlay('overlay-verificacion');

    overlay.innerHTML = `
        <div class="glass" style="width: 85%; max-width: 400px; padding: 35px 30px; border-radius: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            <h2 style="color: var(--primary); margin-bottom: 8px; letter-spacing: 1px;">VERIFICA TU CORREO</h2>
            <p style="color: #eee; opacity: 0.8; margin-bottom: 30px; font-size: 0.9em; line-height: 1.4;">
                Hemos enviado un código de acceso a:<br>
                <strong style="color: var(--primary); font-family: monospace; font-size: 1.1em;">${perfil.correo}</strong>
            </p>
            
            <div style="position: relative; width: 100%; display: flex; justify-content: center; margin-bottom: 35px;">
                <input type="text" id="codigo-input" placeholder="000000" maxlength="6" inputmode="numeric"
                       style="width: 220px; text-align: center; font-size: 2.8rem; letter-spacing: 6px; 
                              padding: 10px; border: none; border-bottom: 3px solid var(--primary); 
                              background: transparent; color: white; outline: none; font-family: 'Courier New', monospace;">
            </div>
            
            <button id="btn-verificar" class="btn-main" style="width: 100%; padding: 18px; font-weight: bold; font-size: 1em; letter-spacing: 1px;">
                CONFIRMAR IDENTIDAD
            </button>
            
            <p id="resend-code" style="color: #666; margin-top: 25px; font-size: 0.85em; cursor: pointer; transition: 0.3s;">
                ¿No recibiste el código? <span style="color: var(--primary); font-weight: bold;">Reenviar ahora</span>
            </p>
        </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('codigo-input');
    const btnConfirmar = document.getElementById('btn-verificar');
    
    // Auto-focus inteligente
    setTimeout(() => input.focus(), 200);

    // --- LÓGICA DE VALIDACIÓN ---
    const procesarValidacion = () => {
        const inputCodigo = input.value.trim();
        
        if (inputCodigo === String(codigoReal)) {
            // ÉXITO
            notificar("¡Identidad confirmada!", 'exito');
            overlay.style.opacity = '0';
            
            setTimeout(() => {
                overlay.remove();
                // ✅ GUARDADO FINAL: Inicia la persistencia en Firebase/Cloud
                this.guardarEnBaseDeDatos(perfil);
            }, 300);
        } else {
            // ERROR: Feedback visual y físico
            if (typeof Seguridad !== 'undefined' && Seguridad.vibrar) {
                Seguridad.vibrar([100, 50, 100]);
            }
            
            input.classList.add('shake-anim');
            input.style.borderBottomColor = "#ff4d4d";
            notificar("Código incorrecto", 'error');
            
            setTimeout(() => {
                input.classList.remove('shake-anim');
                input.style.borderBottomColor = "var(--primary)";
                input.value = '';
                input.focus();
            }, 600);
        }
    };

    // Confirmar con el botón
    btnConfirmar.onclick = procesarValidacion;

    // Confirmar automáticamente al llenar los 6 dígitos
    input.oninput = () => {
        input.value = input.value.replace(/[^0-9]/g, '');
        if (input.value.length === 6) {
            setTimeout(procesarValidacion, 300); // Pequeño delay para que el usuario vea el último dígito
        }
    };

    // Lógica de reenvío
    document.getElementById('resend-code').onclick = () => {
        notificar("Generando nuevo código...", "alerta");
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            this.simularEnvioCorreo(perfil);
        }, 300);
    };
},

async guardarEnBaseDeDatos(perfil) {
    // 1. PREPARACIÓN DE IDENTIDAD (Hardware Binding)
    const uuidMaestro = perfil.identidad?.idFinal || await this.obtenerIDUnico();

    // 🛰️ CAPTURA DE METADATOS (Añadimos la marca del dispositivo aquí también)
    const metadatos = {
        dispositivo: navigator.userAgent.includes("Android") ? "Android" : "PC/Browser",
        plataforma: navigator.platform,
        modelo: navigator.userAgentData?.brands[0]?.brand || "Estándar",
        idioma: navigator.language,
        resolucion: `${window.screen.width}x${window.screen.height}`,
        versionApp: "1.0.5",
        zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    // 💎 OBJETO DE TRASPASO
    // Solo mandamos los datos crudos, Cloud.js se encargará de crear las carpetas
    const datosParaRegistro = {
        ...perfil,
        idFinal: uuidMaestro,
        metadatos: metadatos
    };

    // 2. RESPALDO LOCAL PREVENTIVO (Offline First)
    // Guardamos una versión plana localmente mientras esperamos aprobación
    this.datos = datosParaRegistro;
    Persistencia.guardar(this.sesionActual, { 
        logueado: false, // Importante: falso hasta que el Admin apruebe
        perfil: datosParaRegistro,
        aprobado: false 
    });

    notificar("Vinculando hardware con red DOMINUS...", "info");

    // 3. ENVÍO AL MOTOR DE NUBE
    try {
        // Llamamos a la función de Cloud que ya organizamos antes
        const perfilCreado = await Cloud.registrarNuevoUsuario(datosParaRegistro);

        if (perfilCreado) {
            // 🔔 AVISO AL MAESTRO POR TELEGRAM
            if (this.notificarMaestroTelegram) {
                const msj = `🆕 *NUEVO GUERRERO*\n👤: ${perfil.nombre}\n🏢: ${perfil.negocio}\n📱: ${metadatos.modelo}\n🆔: ${uuidMaestro}`;
                this.notificarMaestroTelegram(msj);
            }

            notificar("¡Solicitud enviada al Mando Central!", "exito");
            this.preguntarPorPIN();
        } else {
            notificar("Perfil guardado localmente (Sin red)", "alerta");
            this.preguntarPorPIN();
        }
    } catch (error) {
        console.error("❌ Error en el salto a la nube:", error);
        this.preguntarPorPIN(); 
    }
},

// En Usuario.js (App del negocio)
actualizarPresencia() {
    // Usamos el ID de hardware vinculado
    const uuid = this.datos.idFinal || this.datos.uuid;
    
    if (!uuid) return;

    // 🛡️ RUTA ACTUALIZADA: Guardamos el rastro en la carpeta de seguridad
    Cloud.db.ref(`usuarios/${uuid}/seguridad/ultimaConexion`).set(new Date().toISOString());
},

// En Usuario.js
escucharMensajesAdmin() {
    Cloud.db.ref(`usuarios/${this.datos.uuid}/comunicacion/mensajeDirecto`).on('value', (snap) => {
        const data = snap.val();
        if (data && !data.leido) {
            // Aquí puedes usar tu función de notificar()
            notificar(`✉️ MENSAJE DEL ADMIN: ${data.texto}`, "alerta");
            // Opcional: marcar como leído automáticamente tras 5 segundos
        }
    });
},

// En la App del Usuario (Lado Business)
escucharComandosGlobales() {
    // 1. Escuchar Modo Mantenimiento
    Cloud.db.ref('config_global/mantenimiento').on('value', (snap) => {
        const enMantenimiento = snap.val();
        if (enMantenimiento) {
            this.bloquearPorMantenimiento();
        } else {
            this.desbloquearApp();
        }
    });

    // 2. Escuchar Anuncios o Mensajes Globales
    Cloud.db.ref('config_global/anuncio').on('value', (snap) => {
        const anuncio = snap.val();
        if (anuncio && anuncio.mensaje) {
            // Solo mostramos si el anuncio es reciente (ej. de las últimas 24h)
            const hace24h = Date.now() - (24 * 60 * 60 * 1000);
            if (anuncio.timestamp > hace24h) {
                this.mostrarAnuncioGlobal(anuncio.mensaje);
            }
        }
    });
},

/**
 * Bloquea la interfaz completa para realizar tareas de mantenimiento.
 * Se puede activar remotamente si se integra con una bandera en la base de datos.
 */
bloquearPorMantenimiento() {
    let capa = document.getElementById('capa-mantenimiento');
    
    if (!capa) {
        capa = document.createElement('div');
        capa.id = 'capa-mantenimiento';
        
        capa.innerHTML = `
            <div style="text-align: center; color: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px;">
                <span class="mantenimiento-icon">⚒️</span>
                <h2 style="font-size: 1.8rem; letter-spacing: 2px; margin: 10px 0;">DOMINUS</h2>
                <h3 style="font-weight: 300; opacity: 0.9;">SISTEMA EN MANTENIMIENTO</h3>
                
                <div style="width: 50px; height: 2px; background: var(--primary); margin: 20px auto;"></div>
                
                <p style="max-width: 300px; margin: 0 auto 15px; line-height: 1.5; font-size: 0.95em; color: #ccc;">
                    Estamos reforzando el núcleo del sistema para servirte mejor.
                </p>
                
                <p class="quote-mantenimiento">
                    "El amor y la educación son la única verdad."
                </p>
            </div>
        `;

        // Estilos de bloqueo total
        Object.assign(capa.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(10, 10, 10, 0.98)',
            zIndex: '100000', // Por encima de cualquier modal o notificación
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: '0',
            transition: 'opacity 0.5s ease'
        });

        document.body.appendChild(capa);
        
        // Trigger de opacidad para entrada suave
        setTimeout(() => { capa.style.opacity = '1'; }, 10);
        
        // Bloquear scroll del body
        document.body.style.overflow = 'hidden';
    }
},



    

desbloquearApp() {
const capa = document.getElementById('capa-mantenimiento');
    if (capa) {
        capa.style.opacity = '0';
        setTimeout(() => {
            capa.remove();
            document.body.style.overflow = 'auto';
        }, 500);
    }
},


    // ==========================================
    // PANTALLA 4: PREGUNTA DE PIN
    // ==========================================
preguntarPorPIN() {
        const overlay = this.crearOverlay('overlay-pregunta-pin');

        overlay.innerHTML = `
            <div class="glass" style="width: 85%; max-width: 400px; padding: 30px; border-radius: 15px; text-align: center; border: 1px solid rgba(255, 215, 0, 0.2);">
                <div style="font-size: 3rem; margin-bottom: 15px;">🛡️</div>
                <h2 style="color: #ffd700; margin-bottom: 10px;">CAPA DE SEGURIDAD</h2>
                <p style="color: white; opacity: 0.8; margin-bottom: 25px;">
                    ¿Deseas activar un PIN de acceso rápido? <br>
                    <span style="font-size: 0.85em; color: #aaa;">Protege tu inventario y ventas de miradas curiosas.</span>
                </p>
                <button id="btn-si-pin" class="btn-main" style="width: 100%; padding: 15px; margin-bottom: 10px; font-weight: bold;">SÍ, ASEGURAR MI APP</button>
                <button id="btn-no-pin" style="width: 100%; padding: 12px; background: transparent; border: 1px solid #444; color: #666; border-radius: 10px; cursor: pointer;">Omitir protección</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // OPCIÓN: SÍ QUIERE PIN
        document.getElementById('btn-si-pin').onclick = () => {
            overlay.remove();
            this.pantallaCapturaPIN("CREAR NUEVO PIN"); 
        };

        // OPCIÓN: NO QUIERE PIN (Con Advertencia GEMS)
        document.getElementById('btn-no-pin').onclick = () => {
            if (confirm("⚠️ ADVERTENCIA DE SEGURIDAD:\n\nSin un PIN, cualquier persona que tome tu teléfono podrá ver tus ganancias y deudas. Además, el PIN facilita recuperar tu cuenta si cambias de equipo.\n\n¿Estás seguro de continuar sin protección?")) {
                this.datos.usaPin = false;
                this.datos.pin = null;
                
                // Actualizamos el perfil local y preparamos el salto final
                Persistencia.guardar(this.sesionActual, { 
                    logueado: true, 
                    perfil: this.datos,
                    aprobado: false // Sigue pendiente de tu aprobación en Admin
                });
                
                overlay.remove();
                notificar("Seguridad desactivada. Puedes activarla luego.", 'alerta');
                
                // En lugar de reload, vamos a la pantalla de "Espera de Aprobación"
                setTimeout(() => this.mostrarPantallaEspera(), 1500);
            }
        };
    },

/**
 * Lanza el flujo de creación o confirmación de PIN de seguridad.
 * @param {string} titulo - Texto de encabezado.
 * @param {string|null} primerPin - Si existe, estamos en fase de confirmación.
 */
pantallaCapturaPIN(titulo, primerPin = null) {
    // 1. Limpieza de overlays previos para evitar duplicados en el DOM
    const overlayPrevio = document.getElementById('overlay-input-pin');
    if (overlayPrevio) overlayPrevio.remove();

    const overlay = this.crearOverlay('overlay-input-pin');

    overlay.innerHTML = `
        <div class="glass" style="width: 85%; max-width: 400px; padding: 35px 25px; border-radius: 20px; text-align: center; animation: fadeIn 0.3s ease; border: 1px solid rgba(255,255,255,0.1);">
            <h2 style="color: var(--primary); font-size: 1.3rem; letter-spacing: 1px; margin-bottom: 5px;">${titulo}</h2>
            <p style="color: white; opacity: 0.6; margin-bottom: 35px; font-size: 0.85em;">Por seguridad, ingresa 4 números</p>
            
            <div style="position: relative; width: 100%; max-width: 180px; margin: 0 auto 45px; display: flex; justify-content: center; align-items: center;">
                <input type="password" id="pin-input" placeholder="****" maxlength="4" inputmode="numeric"
                       style="width: 100%; text-align: center; font-size: 3rem; letter-spacing: 12px; 
                              padding: 10px 0; border: none; border-bottom: 2px solid var(--primary); 
                              background: transparent; color: white; outline: none; box-sizing: border-box; text-indent: 12px;">
                
                <span id="ojo-pin" 
                      style="position: absolute; right: -40px; cursor: pointer; font-size: 1.3rem; filter: grayscale(1); user-select: none; transition: all 0.3s ease; padding: 5px;"
                      onclick="Usuario.togglePassword('pin-input', 'ojo-pin')">
                      👁️
                </span>
            </div>
            
            <button id="btn-continuar-pin" class="btn-main" style="width: 100%; padding: 18px; font-weight: bold; letter-spacing: 1px; opacity: 0.5;">
                ${primerPin ? 'VINCULAR DISPOSITIVO' : 'CONTINUAR'}
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const input = document.getElementById('pin-input');
    const btn = document.getElementById('btn-continuar-pin');
    
    setTimeout(() => input.focus(), 150);

    // UX: Validación reactiva
    input.oninput = () => {
        input.value = input.value.replace(/[^0-9]/g, ''); // Solo números
        const listo = input.value.length === 4;
        btn.style.opacity = listo ? "1" : "0.5";
        btn.style.cursor = listo ? "pointer" : "not-allowed";
        
        // Auto-click sutil al llegar a 4 dígitos para agilizar el flujo
        if (listo && primerPin) {
             // En confirmación, dejamos que el usuario presione el botón para estar seguro
        }
    };

    btn.onclick = () => {
        const pinIngresado = input.value;

        if (pinIngresado.length !== 4) {
            this.vibrar([50, 100, 50]);
            input.classList.add('input-pin-error');
            setTimeout(() => input.classList.remove('input-pin-error'), 500);
            return notificar("Ingresa los 4 dígitos", 'alerta');
        }

        overlay.style.opacity = '0'; // Transición suave entre pasos

        setTimeout(() => {
            overlay.remove();

            if (!primerPin) {
                // FASE 1: Registro inicial
                this.pantallaCapturaPIN("CONFIRMAR PIN NUEVO", pinIngresado);
            } else {
                // FASE 2: Verificación de igualdad
                if (pinIngresado === primerPin) {
                    notificar("PIN establecido correctamente", 'exito');
                    this.vincularPinSeguro(pinIngresado); 
                } else {
                    notificar("Los PIN no coinciden. Intenta de nuevo.", 'error');
                    if (this.vibrar) this.vibrar([100, 50, 100, 50, 100]);
                    this.pantallaCapturaPIN("CREAR PIN DE ACCESO"); 
                }
            }
        }, 300);
    };
},

vincularPinSeguro(pin) {
    console.log("-> Iniciando vinculación de seguridad...");

    // 1. OBTENCIÓN DEL UUID (Hardware ID)
    // Usamos el ID que generamos al inicio del registro
    const uuid = this.datos?.idFinal || "DEV_MODE_ID";
    
    // 2. GENERACIÓN DE LLAVE DE ACCESO
    // Creamos un hash simple en Base64 combinando el ID del equipo y el PIN
    const llaveMaestra = btoa(uuid + ":" + pin);

    // 3. ACTUALIZACIÓN DEL PERFIL EN MEMORIA
    if (!this.datos) this.datos = {}; // Salvaguarda
    this.datos.usaPin = true;
    this.datos.llaveMaestra = llaveMaestra; 
    this.datos.pin = pin; // Guardamos el pin para validaciones locales rápidas
    
    // 4. PERSISTENCIA DE SESIÓN
    // Aquí es donde DOMINUS dice: "Ya te conozco, pero espera a que el Admin te apruebe"
    Persistencia.guardar('dom_sesion_activa', { 
        logueado: true, 
        perfil: this.datos,
        aprobado: false // El Centinela revisará este estado
    });

    console.log("-> Seguridad vinculada con éxito. Llave generada.");
    notificar("Seguridad Vinculada", "exito");

    // 5. SALTO AL CENTINELA (Pantalla de Espera)
    // El setTimeout da aire a la UI antes de cambiar de pantalla
    setTimeout(() => {
        if (typeof this.mostrarPantallaEspera === 'function') {
            this.mostrarPantallaEspera();
        } else {
            console.error("Error: mostrarPantallaEspera no está definida.");
            notificar("Error de redirección", "error");
        }
    }, 1000);
},

mostrarPantallaEspera() {
    this.limpiarPantalla();
    const overlay = this.crearOverlay('overlay-espera');
    let tiempoRestante = 300; 
    
    //  OBTENCIÓN ROBUSTA DEL UUID
    const uuid = this.datos.idFinal || this.datos.identidad?.idFinal || this.datos.uuid;

    overlay.innerHTML = `
        <div id="contenedor-espera" class="glass" style="width: 90%; max-width: 450px; padding: 35px; border-radius: 20px; text-align: center; transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); transform: scale(1); opacity: 1;">
            <div id="loader-dominus" style="margin-bottom: 20px; font-size: 2.5rem; animation: pulse 2s infinite;">⌛</div>
            <h2 style="color: #ffd700; margin-bottom: 10px; letter-spacing: 1px; font-size: 1.4rem;">SOLICITUD ENVIADA</h2>
            <p style="color: white; opacity: 0.9; font-size: 0.95em; line-height: 1.5; margin-bottom: 25px;">
                "El amor y la educación son la única verdad."<br>
                <span id="sub-msg" style="color: #888; font-size: 0.8em; transition: all 0.5s;">Estamos validando tu equipo en la red DOMINUS.</span>
            </p>

            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #333;">
                <p style="color: #ffd700; font-size: 0.7em; margin-bottom: 5px; text-transform: uppercase;">ID de Dispositivo (UUID)</p>
                <code style="color: #fff; font-family: monospace; font-size: 1rem; word-break: break-all;">${uuid || 'Generando ID...'}</code>
            </div>

            <button id="btn-check-status" class="btn-main" style="width: 100%; padding: 15px; margin-bottom: 15px; transition: all 0.3s; font-weight: bold;">
                CHECKEAR ESTADO
            </button>

            <button id="btn-contactar-admin" disabled 
                style="width: 100%; padding: 12px; background: transparent; border: 1px solid #444; color: #444; border-radius: 10px; cursor: not-allowed; transition: all 0.5s ease; font-size: 0.85em;">
                CONTACTAR ADMIN (<span id="timer-espera">05:00</span>)
            </button>
        </div>
    `;
    document.body.appendChild(overlay);

    const btnContactar = document.getElementById('btn-contactar-admin');
    const displayTimer = document.getElementById('timer-espera');
    const btnCheck = document.getElementById('btn-check-status');
    const subMsg = document.getElementById('sub-msg');
    const contenedor = document.getElementById('contenedor-espera');

    // --- 1. CAPTURA DE TOKEN (PUSH) ---
    if (uuid && typeof Notificaciones !== 'undefined') {
        Notificaciones.capturarDireccionPush(uuid).catch(e => console.warn("Push no disponible"));
    }

    // --- 2. TEMPORIZADOR ---
    const cuentaRegresiva = setInterval(() => {
        tiempoRestante--;
        const min = Math.floor(tiempoRestante / 60);
        const seg = tiempoRestante % 60;
        
        if (displayTimer) {
            displayTimer.innerText = `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
        }

        if (tiempoRestante <= 0) {
            clearInterval(cuentaRegresiva);
            if (btnContactar) {
                btnContactar.disabled = false;
                btnContactar.style.borderColor = "#ffd700";
                btnContactar.style.color = "#ffd700";
                btnContactar.style.cursor = "pointer";
                btnContactar.innerText = "CONTACTAR POR WHATSAPP";
            }
            if (subMsg) {
                subMsg.innerText = "Estamos tardando un poco más. Johander revisará tu acceso pronto.";
                subMsg.style.color = "#ffd700";
            }
        }
    }, 1000);

    // --- 3. ACCIÓN MANUAL ---
    btnCheck.onclick = async () => {
        btnCheck.disabled = true; // Evitamos spam de clicks
        notificar("Consultando red DOMINUS...", "info");
        const aprobado = await this.ejecutarVerificacionDeAcceso();
        
        if (aprobado) {
            this.finalizarEsperaExitosa(overlay, contenedor, cuentaRegresiva);
        } else {
            setTimeout(() => { btnCheck.disabled = false; }, 2000);
        }
    };

    // --- 4. ACCIÓN DE CONTACTO ---
    btnContactar.onclick = () => {
        const mensaje = `Hola Johander! Mi ID es: ${uuid}. Sigo esperando aprobación en DOMINUS.`;
        // RECUERDA: Cambiar las X por tu número real
        const url = `https://wa.me/584248466139?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    };

    // --- 5. EL CENTINELA (TIEMPO REAL) ---
    if (uuid && Cloud.db) {
        const refEstado = Cloud.db.ref(`usuarios/${uuid}/perfil/estado`);
        
        // Escuchamos cualquier cambio en el nodo 'estado'
        refEstado.on('value', async (snapshot) => {
            if (snapshot.val() === 'aprobado') {
                console.log("⚡ Acceso detectado desde DOMINUS Admin.");
                refEstado.off(); // Dejamos de escuchar una vez aprobado
                this.finalizarEsperaExitosa(overlay, contenedor, cuentaRegresiva);
            }
        });
    }
},

// Nueva función auxiliar para manejar la salida limpia y evitar repetir código
async finalizarEsperaExitosa(overlay, contenedor, cuentaRegresiva) {
    // 1. Detenemos el cronómetro inmediatamente
    if (cuentaRegresiva) clearInterval(cuentaRegresiva);
    
    // Obtenemos el ID de forma segura
    const uuid = this.datos.idFinal || this.datos.identidad?.idFinal;

    // 2. Animación de salida cinematográfica
    if (contenedor) {
        contenedor.style.opacity = "0";
        contenedor.style.transform = "scale(1.1) translateY(-30px)";
        contenedor.style.filter = "blur(15px)";
    }
    if (overlay) overlay.style.background = "rgba(0,0,0,1)"; 

    // Esperamos a que la animación de arriba termine (800ms)
    setTimeout(async () => {
        try {
            // 3. Sincronización final con la Nube
            // Traemos los datos que el Admin acaba de autorizar (fechaCorte, estado, etc.)
            const perfilActualizado = await Cloud.obtenerEstadoUsuario(uuid);
            
            if (perfilActualizado) {
                // Fusionamos datos locales (como la llaveMaestra del PIN) con los de la nube
                this.datos = { ...this.datos, ...perfilActualizado };
            }

            // 4. Persistencia de Sesión Activa
            // Guardamos como logueado: true para que el Main.js arranque el ecosistema.
            // El Centinela ya hizo su trabajo, ahora le toca al Dashboard.
            Persistencia.guardar(this.sesionActual, { 
                logueado: true, 
                perfil: this.datos 
            });

            if (overlay) overlay.remove();
            notificar("¡Ecosistema Activado!", "exito");
            
            // 5. Recarga limpia para entrar al Dashboard
            setTimeout(() => location.reload(), 500);

        } catch (error) {
            console.error("Error en la activación final:", error);
            notificar("Error al sincronizar perfil", "error");
        }
    }, 800);
},

    // 1. El motor de consulta constante
verificarAprobacionAutomatica() {
    const uuid = this.datos.idFinal || this.datos.identidad?.idFinal || this.datos.uuid;
    if (!uuid || !Cloud.db) return; 

    console.log("📡 Centinela de Élite: Escuchando aprobación en tiempo real...");
    
    // 🛡️ CAMBIO DE RUTA: Ahora escuchamos dentro de la carpeta 'administracion'
    const refEstado = Cloud.db.ref(`usuarios/${uuid}/administracion/estado`);
    
    refEstado.on('value', async (snapshot) => {
        const estado = snapshot.val();
        
        if (estado === 'aprobado') {
            console.log("⚡ ¡Acceso autorizado desde el Mando Central!");
            
            // Dejamos de escuchar para ahorrar recursos
            refEstado.off(); 
            
            const contenedor = document.getElementById('contenedor-espera');
            const overlay = document.getElementById('overlay-espera');
            
            if (overlay) {
                // Si está en la pantalla de espera, disolvemos el bloqueo con estilo
                this.finalizarEsperaExitosa(overlay, contenedor, null); 
            } else {
                // Si por alguna razón no hay overlay, forzamos la validación y recarga
                await this.ejecutarVerificacionDeAcceso();
            }
        }
    });
},
async ejecutarVerificacionDeAcceso() {
    const uuid = this.datos.idFinal || this.datos.identidad?.idFinal || this.datos.uuid;
    if (!uuid) return false;

    try {
        // 🛰️ CONSULTA: Ahora Cloud.obtenerEstadoUsuario(uuid) nos trae el nodo 'administracion'
        const adminData = await Cloud.obtenerEstadoUsuario(uuid);

        // 🛡️ VERIFICACIÓN: Buscamos el estado dentro de la nueva carpeta 'administracion'
        if (adminData && adminData.estado === 'aprobado') {
            
            // Sincronizamos: Mantenemos lo que tenemos y añadimos lo legal (administracion)
            // Esto asegura que this.datos.estado ahora sea 'aprobado'
            this.datos = { 
                ...this.datos, 
                ...adminData 
            };
            
            // ✅ PERSISTENCIA TOTAL
            Persistencia.guardar(this.sesionActual, { 
                logueado: true, 
                perfil: this.datos 
            });

            notificar("¡ACCESO CONCEDIDO!", "exito");
            
            setTimeout(() => {
                const overlay = document.getElementById('overlay-espera');
                if (overlay) overlay.remove();
                
                location.reload(); 
            }, 1200);

            return true;
        }
        
        return false;
    } catch (e) {
        console.error("❌ Fallo en la comunicación con la red DOMINUS:", e.message);
        return false;
    }
},

    obtenerDiasDeUso() {
        // Usamos la fecha de corte (que ya tenemos de la nube) restándole 15 días 
        // para saber cuándo fue aprobada, o mejor, guardamos fechaAprobacion en el perfil.
        const fechaCorte = this.datos?.fechaCorte; 
        if (!fechaCorte) return 0;

        const fin = new Date(fechaCorte);
        const hoy = new Date();
        
        // Calculamos cuántos días faltan para el corte y restamos desde 15
        const msPorDia = 1000 * 60 * 60 * 24;
        const diasRestantes = Math.ceil((fin - hoy) / msPorDia);
        
        const diaActual = 15 - diasRestantes;
        return diaActual > 0 ? diaActual : 0;
    },

    // 2. Modificación en mostrarPantallaEspera
    // Debes llamar a la función anterior justo al final de mostrarPantallaEspera()
    // ==========================================
    // UTILIDADES
    // ==========================================
   // ==========================================
    // MEJORA EN PROCESAR LOGIN
    // ==========================================
async procesarLogin(usuario, pass) {
    notificar("Conectando con la nube...", "alerta");

    const uid = await Cloud.conectarACaja(usuario, pass);

    if (uid) {
        try {
            notificar("Sincronizando perfil integral...", "alerta");
            
            const snapshot = await Cloud.db.ref(`usuarios/${uid}`).once('value');
            const dataNube = snapshot.val();

            if (dataNube) {
                const perfilPersonal = dataNube.perfil || {};
                const adminData = dataNube.administracion || {};
                const seguridadData = dataNube.seguridad || {};

                this.datos = { 
                    ...perfilPersonal, 
                    ...adminData, 
                    idFinal: seguridadData.idFinal || uid 
                };

                Persistencia.guardar('dom_id_unico', this.datos.idFinal);

                const esAprobado = adminData.estado === 'aprobado';
                const datosSesion = { 
                    logueado: esAprobado, 
                    perfil: this.datos 
                };

                Persistencia.guardar(this.sesionActual, datosSesion);

                // --- 🚀 INICIO DE LIMPIEZA VISUAL ---
                const overlayActual = document.getElementById('overlay-login');

                // 5. DIRECCIONAMIENTO SEGÚN ESTADO
                if (!esAprobado) {
                    notificar("Acceso pendiente de aprobación", "alerta");
                    setTimeout(() => {
                        if (overlayActual) overlayActual.remove(); // Quitamos login para mostrar espera
                        this.mostrarPantallaEspera();
                    }, 1000);
                    return;
                }

                // 6. ÉXITO Y FEEDBACK
                if (window.Interfaz && Interfaz.actualizarAvatarHeader) {
                    Interfaz.actualizarAvatarHeader(this.datos);
                }

                notificar(`Bienvenido, ${this.datos.nombre}`, 'exito');
                
                setTimeout(() => {
                    // Si vamos a otra pantalla, quitamos el overlay primero
                    if (overlayActual) {
                        overlayActual.style.opacity = '0';
                        setTimeout(() => overlayActual.remove(), 300);
                    }

                    if (this.datos.usaPin) {
                        this.pantallaDesbloqueoPIN();
                    } else {
                        // Si usas reload, el overlay se iría solo, 
                        // pero es mejor quitarlo antes por si el reload tarda.
                        location.reload();
                    }
                }, 1500);

            } else {
                notificar("Error: Nodo de usuario inexistente", "error");
            }

        } catch (error) {
            console.error("❌ Error sincronizando datos:", error);
            notificar("Fallo de red al recuperar perfil", "error");
        }
    } else {
        notificar("Credenciales incorrectas", 'error');
    }
},
    // ==========================================
    // UTILIDADES MEJORADAS (CON LÓGICA DE OJO 👁️)
    // ==========================================
    
    // Función global para cambiar visibilidad de contraseñas
   togglePassword(idInput, idIcono) {
    const input = document.getElementById(idInput);
    const icono = document.getElementById(idIcono);
    
    if (input.type === "password") {
        input.type = "text";
        icono.innerText = "👁️"; // Ojo abierto
        icono.style.filter = "grayscale(0) drop-shadow(0 0 5px #ffd700)"; // Brilla cuando está activo
    } else {
        input.type = "password";
        icono.innerText = "🔒"; // Monito tapándose o puedes usar "🔒" o un ojo con barra si usas iconos pro
        icono.style.filter = "grayscale(1)"; 
    }
},

crearOverlay(id) {
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.style = `
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%;
        background: rgba(0, 0, 0, 0.5); /* Semi-transparente */
        z-index: 50000;
        display: flex; 
        align-items: center; 
        justify-content: center;
        backdrop-filter: blur(15px); /* El efecto borroso */
        -webkit-backdrop-filter: blur(15px);
        animation: fadeIn 0.4s ease;
    `;
    return overlay;
},

   limpiarPantalla() {
    const loader = document.querySelector('.loader');
    if (loader) loader.style.display = 'none';
    
    // Eliminamos los overlays existentes de golpe para evitar conflictos de ID
    const overlays = document.querySelectorAll('[id^="overlay-"]');
    overlays.forEach(o => o.remove()); 
},

guardarNombreNegocio() {
        const el = document.getElementById('perfil-nombre-negocio');
        if (el) {
            const nuevoNombre = el.innerText.trim();
            // Guardamos en la persistencia global
            Persistencia.guardar('cfg_nombre_negocio', nuevoNombre);
            console.log("Nombre del negocio actualizado:", nuevoNombre);
        }
    },

    guardarPlantilla() {
        const el = document.getElementById('cfg-msj-maestro');
        if (el) {
            const nuevaPlantilla = el.value.trim();
            Persistencia.guardar('cfg_msj_cobro', nuevaPlantilla);
        }
    },

    guardarConfigCobro() {
        const limite = document.getElementById('cfg-limite-confianza').value;
        Persistencia.guardar('cfg_limite_dias', limite);
        
        // Refrescamos la vista de fiaos para que el semáforo cambie al instante
        if(typeof Interfaz !== 'undefined') Interfaz.renderFiaos();
    },

    // Esta función debe ejecutarse al INICIAR la app (en Main.js o al cargar la pestaña)
    cargarAjustes() {
        const nombre = Persistencia.cargar('cfg_nombre_negocio') || "Mi Negocio";
        const plantilla = Persistencia.cargar('cfg_msj_cobro') || "";
        const limite = Persistencia.cargar('cfg_limite_dias') || "5";

        if(document.getElementById('perfil-nombre-negocio')) 
            document.getElementById('perfil-nombre-negocio').innerText = nombre;
        
        if(document.getElementById('cfg-msj-maestro')) 
            document.getElementById('cfg-msj-maestro').value = plantilla;

        if(document.getElementById('cfg-limite-confianza')) 
            document.getElementById('cfg-limite-confianza').value = limite;
    },

};

    
 
const GestorMensajes = {
    franjaActual: 'mañana',
    plantillasBase: {
        mañana: "¡Buen día, [cliente]! ☀️ Gracias por elegir a [negocio]. Aquí tienes el detalle de tu compra:\n\n[monto_detalle]\n\nTotal: $[montoUSD] ([montoBs] Bs.)\n¡Que tengas un excelente día!",
        tarde: "¡Buenas tardes, [cliente]! ✨ En [negocio] confirmamos tu pedido:\n\n[monto_detalle]\n\nTotal: $[montoUSD] ([montoBs] Bs.)\n¡Gracias por tu preferencia!",
        noche: "¡Feliz noche, [cliente]! 🌙 Aquí te enviamos el resumen de tu compra en [negocio]:\n\n[monto_detalle]\n\nTotal: $[montoUSD] ([montoBs] Bs.)\n¡Felices sueños!"
    },

    /**
     * Cambia la franja horaria seleccionada en la UI.
     */
    cambiarFranjaMensaje(franja) {
        this.franjaActual = franja;
        
        // Actualizar UI de botones con clases y estilos
        ['mañana', 'tarde', 'noche'].forEach(f => {
            const btn = document.getElementById(`btn-msj-${f}`);
            if (btn) {
                const esActivo = (f === franja);
                btn.style.background = esActivo ? 'var(--primary)' : '#333';
                btn.style.color = esActivo ? 'black' : 'white';
                btn.style.boxShadow = esActivo ? '0 4px 15px rgba(255, 215, 0, 0.3)' : 'none';
            }
        });

        // Cargar el mensaje de esa franja
        const guardado = Persistencia.cargar(`cfg_msj_${franja}`);
        const textarea = document.getElementById('cfg-msj-maestro');
        if (textarea) {
            textarea.value = guardado || this.plantillasBase[franja];
        }
    },

    guardarPlantilla() {
        const txt = document.getElementById('cfg-msj-maestro').value;
        Persistencia.guardar(`cfg_msj_${this.franjaActual}`, txt);
        notificar(`Plantilla de la ${this.franjaActual} guardada`, "exito");
    },

    restablecerPlantilla() {
        if(confirm(`¿Quieres volver al mensaje original de la ${this.franjaActual}?`)) {
            const defaultMsj = this.plantillasBase[this.franjaActual];
            document.getElementById('cfg-msj-maestro').value = defaultMsj;
            this.guardarPlantilla();
        }
    },

    /**
     * Simulación visual de cómo se verá el mensaje final.
     */
    mostrarEjemplo() {
        const txt = document.getElementById('cfg-msj-maestro').value;
        const nombreNegocio = Persistencia.cargar('cfg_nombre_negocio') || "DOMINUS Store";
        
        const demo = txt
            .replace(/\[cliente\]/g, "Johander José")
            .replace(/\[negocio\]/g, nombreNegocio)
            .replace(/\[monto_detalle\]/g, "• Calzado Deportivo ($45.00)\n• Medias Algodón ($5.00)")
            .replace(/\[montoUSD\]/g, "50.00")
            .replace(/\[montoBs\]/g, "1,850.00");
        
        // Usamos una notificación larga o un modal de previsualización
        console.log("%c VISTA PREVIA WHATSAPP ", "background: #25D366; color: white; font-weight: bold;");
        console.log(demo);
        
        alert("SIMULACIÓN DE WHATSAPP:\n\n" + demo);
    },

    /**
     * Retorna la plantilla correcta según la hora actual del sistema.
     */
    obtenerMensajeSegunHora() {
        const hora = new Date().getHours();
        let franja = 'noche';
        
        if (hora >= 6 && hora < 12) franja = 'mañana';
        else if (hora >= 12 && hora < 19) franja = 'tarde';
        
        return Persistencia.cargar(`cfg_msj_${franja}`) || this.plantillasBase[franja];
    }
  };

document.addEventListener('DOMContentLoaded', () => Usuario.init());