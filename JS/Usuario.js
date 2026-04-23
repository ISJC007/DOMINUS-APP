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
        const sesion = Persistencia.cargar(this.sesionActual);
        
        if (sesion && sesion.logueado) {
            this.datos = sesion.perfil;
            
            // FILTRO DE SEGURIDAD: Si está registrado pero falta tu aprobación
            if (this.datos.estado === 'pendiente') {
                console.log("⏳ Acceso retenido: Esperando aprobación del administrador.");
                this.mostrarPantallaEspera(); // Lo mandamos a la espera
                return false; // Bloqueamos el flujo hacia el Dashboard
            }

            console.log(`👤 Sesión activa y aprobada: ${this.datos.usuario}`);
            return true; // Acceso concedido al ecosistema
        } else {
            console.log("🎟️ No hay sesión activa. Mostrando Login...");
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
        <div class="glass" style="width: 85%; max-width: 400px; padding: 30px; border-radius: 15px; text-align: center;">
            <h2 style="color: #ffd700; margin-bottom: 20px;">INICIAR SESIÓN</h2>
            
            <input type="text" id="login-user" placeholder="Usuario o Correo" class="input-moderno" 
                   style="width: 100%; margin-bottom: 15px; padding: 12px; box-sizing: border-box;">
            
            <div style="position: relative; width: 100%; margin-bottom: 10px;">
                <input type="password" id="login-pass" placeholder="Contraseña" class="input-moderno" 
                       style="width: 100%; padding: 12px; padding-right: 45px; box-sizing: border-box;">
                
                <span id="btn-ver-login" 
                      style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 1.2rem; filter: grayscale(1); user-select: none;"
                      onclick="Usuario.togglePassword('login-pass', 'btn-ver-login')">
                      👁️
                </span>
            </div>

            <p id="link-recuperar" style="color: #888; font-size: 0.8em; text-align: right; margin-bottom: 20px; cursor: pointer; transition: 0.3s;">
                ¿Olvidaste tu contraseña?
            </p>
            
            <button id="btn-login" class="btn-main" style="width: 100%; padding: 15px; margin-bottom: 15px;">ENTRAR</button>
            
            <p style="color: #aaa; font-size: 0.9em; margin-top: 15px;">
                ¿No tienes cuenta? <br>
                <span id="link-registro" style="color: #ffd700; cursor: pointer; font-weight: bold; text-decoration: underline;">Regístrate aquí</span>
            </p>
        </div>
    `;
    document.body.appendChild(overlay);

    // --- LÓGICA DE RECUPERACIÓN ---
    document.getElementById('link-recuperar').onclick = async () => {
        const email = prompt("Introduce tu correo electrónico para restablecer la contraseña:");
        if (email) {
            try {
                notificar("Enviando correo de recuperación...", "alerta");
                await Cloud.auth.sendPasswordResetEmail(email);
                notificar("Revisa tu bandeja de entrada", "exito");
            } catch (error) {
                console.error(error);
                notificar("Error: Correo no encontrado", "error");
            }
        }
    };

    // Lógica de Login (Botón Entrar)
    document.getElementById('btn-login').onclick = () => {
        const u = document.getElementById('login-user').value;
        const p = document.getElementById('login-pass').value;
        if(!u || !p) return notificar("Ingresa credenciales", "alerta");
        this.procesarLogin(u, p);
    };

    // Ir a registro
    document.getElementById('link-registro').onclick = () => {
        const actual = document.getElementById('overlay-login');
        if(actual) actual.remove();
        this.mostrarRegistro();
    };
},
    // ==========================================
    // PANTALLA 2: REGISTRO
    // ==========================================
mostrarRegistro() {
    this.limpiarPantalla();
    const overlay = this.crearOverlay('overlay-registro');

    overlay.innerHTML = `
        <div class="glass" style="width: 90%; max-width: 450px; padding: 25px; border-radius: 15px; text-align: center; max-height: 90vh; overflow-y: auto;">
            <h2 style="color: #ffd700; margin-bottom: 10px;">CREAR CUENTA</h2>
            
            <div style="position: relative; width: 100px; height: 100px; margin: 0 auto 20px;">
                <div id="p-container" style="width: 100%; height: 100%; border-radius: 50%; border: 3px solid #444; overflow: hidden; background: #222; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: border 0.3s ease;">
                    <span id="placeholder-icon" style="font-size: 3rem;">👤</span>
                    <img id="img-preview" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                </div>
                <label for="reg-foto" style="position: absolute; bottom: 0; right: 0; background: #ffd700; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #111;">
                    📷
                </label>
                <input type="file" id="reg-foto" accept="image/*" style="display: none;">
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <input type="text" id="reg-nombre" placeholder="Nombres" class="input-moderno" style="width: 50%; padding: 10px;">
                <input type="text" id="reg-apellido" placeholder="Apellidos" class="input-moderno" style="width: 50%; padding: 10px;">
            </div>
            
            <input type="text" id="reg-negocio" placeholder="Nombre de tu Negocio" class="input-moderno" style="width: 100%; margin-bottom: 10px; padding: 10px; box-sizing: border-box; border-left: 4px solid #ffd700;">
            
            <input type="email" id="reg-correo" placeholder="Correo Electrónico" class="input-moderno" style="width: 100%; margin-bottom: 5px; padding: 10px; box-sizing: border-box;">
            <p id="msg-correo" style="font-size: 0.75rem; color: #888; text-align: left; margin-bottom: 10px; padding-left: 5px;">• Ingresa un correo válido (@ y .com)</p>
            
            <input type="tel" id="reg-tlf" value="+58" class="input-moderno" style="width: 100%; margin-bottom: 5px; padding: 10px; box-sizing: border-box; border-left: 4px solid #2ecc71;">
            <p id="msg-tlf" style="font-size: 0.75rem; color: #888; text-align: left; margin-bottom: 10px; padding-left: 5px;">• Completa tu número después del +58</p>

            <input type="text" id="reg-user" placeholder="Nombre de Usuario" class="input-moderno" style="width: 100%; margin-bottom: 10px; padding: 10px; box-sizing: border-box;">
            
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: left;">
                <div style="position: relative; width: 100%; margin-bottom: 5px;">
                    <input type="password" id="reg-pass1" placeholder="Contraseña" class="input-moderno" 
                           style="width: 100%; padding: 10px; padding-right: 40px; box-sizing: border-box; transition: 0.3s;">
                    <span id="ojo-reg-1" 
                          style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; filter: grayscale(1); user-select: none;"
                          onclick="Usuario.togglePassword('reg-pass1', 'ojo-reg-1')">👁️</span>
                </div>
                <p id="msg-pass1" style="font-size: 0.75rem; color: #888; margin-bottom: 10px; padding-left: 5px;">• Mínimo 8 caracteres, una Mayúscula y un Número.</p>

                <div style="position: relative; width: 100%; margin-bottom: 5px;">
                    <input type="password" id="reg-pass2" placeholder="Confirmar Contraseña" class="input-moderno" 
                           style="width: 100%; padding: 10px; padding-right: 40px; box-sizing: border-box; transition: 0.3s;">
                    <span id="ojo-reg-2" 
                          style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; filter: grayscale(1); user-select: none;"
                          onclick="Usuario.togglePassword('reg-pass2', 'ojo-reg-2')">👁️</span>
                </div>
                <p id="msg-pass2" style="font-size: 0.75rem; color: #888; padding-left: 5px;">• Las contraseñas deben ser iguales.</p>
            </div>

            <button id="btn-crear-cuenta" class="btn-main" style="width: 100%; padding: 15px; opacity: 0.5; cursor: not-allowed;" disabled>REGISTRARSE</button>
            <p id="link-volver-login" style="color: #888; cursor: pointer; margin-top: 15px; font-size: 0.9em;">Volver a Inicio de Sesión</p>
        </div>
    `;
    document.body.appendChild(overlay);

    // --- CAPTURA DE ELEMENTOS ---
    const p1 = document.getElementById('reg-pass1');
    const p2 = document.getElementById('reg-pass2');
    const correo = document.getElementById('reg-correo');
    const tlf = document.getElementById('reg-tlf');
    const btn = document.getElementById('btn-crear-cuenta');
    
    const m1 = document.getElementById('msg-pass1');
    const m2 = document.getElementById('msg-pass2');
    const mCorreo = document.getElementById('msg-correo');
    const mTlf = document.getElementById('msg-tlf');

    // --- LÓGICA DE PROTECCIÓN DEL PREFIJO (+58) ---
    tlf.onkeydown = (e) => {
        // Bloquea borrar el +58 con retroceso o suprimir si el cursor está al inicio
        if (tlf.selectionStart <= 3 && (e.key === 'Backspace' || e.key === 'Delete')) {
            e.preventDefault();
        }
    };

    // --- LÓGICA DE VALIDACIÓN MAESTRA ---
    const validarFormulario = () => {
        // Forzar que siempre empiece con +58 si intentan pegar texto o borrar todo
        if (!tlf.value.startsWith('+58')) {
            tlf.value = '+58' + tlf.value.replace(/^\+?5?8?/, '');
        }

        const valP1 = p1.value;
        const valP2 = p2.value;
        const valCorreo = correo.value;
        const valTlf = tlf.value.trim();
        
        const regexPass = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        let passOk = false;
        let coincidenOk = false;
        let correoOk = false;
        let tlfOk = false;

        // Validar Correo
        if (regexEmail.test(valCorreo)) {
            mCorreo.innerText = "✅ Correo válido";
            mCorreo.style.color = "#2ecc71";
            correo.style.border = "1px solid #2ecc71";
            correoOk = true;
        } else {
            mCorreo.innerText = "❌ Correo inválido (@ y .com)";
            mCorreo.style.color = "#e74c3c";
            correo.style.border = "1px solid #e74c3c";
            correoOk = false;
        }

        // Validar WhatsApp (+58 + 10 dígitos = 13 caracteres)
        if (valTlf.length === 13) {
            mTlf.innerText = "✅ Número completo";
            mTlf.style.color = "#2ecc71";
            tlf.style.border = "1px solid #2ecc71";
            tlfOk = true;
        } else {
            const faltan = 13 - valTlf.length;
            mTlf.innerText = faltan > 0 ? `❌ Faltan ${faltan} dígitos` : "❌ Número demasiado largo";
            mTlf.style.color = "#e74c3c";
            tlf.style.border = "1px solid #e74c3c";
            tlfOk = false;
        }

        // Validar Requisitos Pass
        if (regexPass.test(valP1)) {
            m1.innerText = "✅ Seguridad validada";
            m1.style.color = "#2ecc71";
            p1.style.border = "1px solid #2ecc71";
            passOk = true;
        } else {
            m1.innerText = "❌ Falta: 8 carac, Mayús o Número";
            m1.style.color = "#e74c3c";
            p1.style.border = "1px solid #e74c3c";
            passOk = false;
        }

        // Validar Coincidencia
        if (valP2.length > 0 && valP1 === valP2) {
            m2.innerText = "✅ Las contraseñas coinciden";
            m2.style.color = "#2ecc71";
            p2.style.border = "1px solid #2ecc71";
            coincidenOk = true;
        } else {
            m2.innerText = "❌ Las contraseñas no coinciden";
            m2.style.color = "#e74c3c";
            p2.style.border = "1px solid #e74c3c";
            coincidenOk = false;
        }

        // CONTROL DEL BOTÓN
        if (passOk && coincidenOk && correoOk && tlfOk) {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
        } else {
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
        }
    };

    p1.oninput = validarFormulario;
    p2.oninput = validarFormulario;
    correo.oninput = validarFormulario;
    tlf.oninput = validarFormulario;

    // --- LÓGICA DE IMAGEN ---
    const inputFoto = document.getElementById('reg-foto');
    const imgPreview = document.getElementById('img-preview');
    const placeholder = document.getElementById('placeholder-icon');
    const container = document.getElementById('p-container');
    let fotoProcesada = null;

    inputFoto.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            container.style.border = "3px solid #3498db"; 
            fotoProcesada = await this.procesarFotoRegistro(file);
            imgPreview.src = fotoProcesada;
            imgPreview.style.display = 'block';
            placeholder.style.display = 'none';
            container.style.border = "3px solid #ffd700"; 
        }
    };

    document.getElementById('link-volver-login').onclick = () => {
        overlay.remove();
        this.mostrarLogin();
    };

    // --- REGISTRO FINAL ---
    btn.onclick = async () => {
        const valTlf = tlf.value.trim();
        const usuario = document.getElementById('reg-user').value;
        const nombre = document.getElementById('reg-nombre').value;
        const negocio = document.getElementById('reg-negocio').value;

        if (!usuario || !nombre || !negocio || !valTlf) return notificar("Faltan datos obligatorios", 'alerta');

        const identidad = await this.obtenerIDUnico();

        const nuevoPerfil = {
            nombre: nombre,
            apellido: document.getElementById('reg-apellido').value,
            negocio: negocio,
            correo: correo.value,
            telefono: valTlf,
            usuario: usuario,
            pass: p1.value,
            foto: fotoProcesada,
            identidad: identidad
        };
        
        overlay.remove();
        this.simularEnvioCorreo(nuevoPerfil);
    };
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

mostrarVerificacion(perfil, codigoReal) {
        const overlay = this.crearOverlay('overlay-verificacion');

        overlay.innerHTML = `
            <div class="glass" style="width: 85%; max-width: 400px; padding: 30px; border-radius: 15px; text-align: center;">
                <h2 style="color: #ffd700; margin-bottom: 5px;">VERIFICA TU CORREO</h2>
                <p style="color: white; opacity: 0.8; margin-bottom: 25px; font-size: 0.9em;">
                    Hemos enviado un código a:<br><strong style="color:#ffd700;">${perfil.correo}</strong>
                </p>
                
                <input type="text" id="codigo-input" placeholder="· · · · · ·" maxlength="6" inputmode="numeric"
                       style="width: 200px; text-align: center; font-size: 2.2rem; letter-spacing: 8px; padding: 10px; border: none; border-bottom: 3px solid #ffd700; background: transparent; color: white; margin-bottom: 30px; outline: none; transition: border-color 0.3s ease;">
                
                <button id="btn-verificar" class="btn-main" style="width: 100%; padding: 15px; font-weight: bold;">CONFIRMAR CÓDIGO</button>
                
                <p id="resend-code" style="color: #888; margin-top: 20px; font-size: 0.8em; cursor: pointer;">
                    ¿No recibiste el código? <span style="color: #ffd700;">Reenviar</span>
                </p>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = document.getElementById('codigo-input');
        input.focus(); // Foco automático para mejorar la experiencia

        document.getElementById('btn-verificar').onclick = () => {
            const inputCodigo = input.value.trim();
            
            if (inputCodigo === codigoReal) {
                notificar("Identidad confirmada", 'exito');
                overlay.remove();
                
                // Procedemos al guardado final que hablará con el Admin
                this.guardarEnBaseDeDatos(perfil);
            } else {
                // Efecto de error visual
                input.style.borderBottomColor = "#ff4d4d";
                notificar("Código incorrecto. Revisa tu correo.", 'error');
                
                setTimeout(() => {
                    input.style.borderBottomColor = "#ffd700";
                    input.value = '';
                    input.focus();
                }, 600);
            }
        };

        // Lógica simple de reenvío (Vuelve a disparar el flujo de simulación)
        document.getElementById('resend-code').onclick = () => {
            overlay.remove();
            this.simularEnvioCorreo(perfil);
        };
    },

async guardarEnBaseDeDatos(perfil) {
    // 1. PREPARACIÓN DE LICENCIA (15 días de prueba + 1 de margen)
    const ahora = new Date();
    const fechaCorte = new Date();
    fechaCorte.setDate(ahora.getDate() + 16); 

    // 🔑 ASEGURAMOS EL ID MAESTRO (Hardware Binding)
    const uuidMaestro = perfil.identidad?.idFinal || await this.obtenerIDUnico();

    // 🛰️ CAPTURA DE METADATOS TÉCNICOS (Máxima administración)
    const metadatos = {
        dispositivo: navigator.userAgent.includes("Android") ? "Android" : "PC/Browser",
        plataforma: navigator.platform,
        browser: navigator.appName,
        idioma: navigator.language,
        resolucion: `${window.screen.width}x${window.screen.height}`,
        versionApp: "1.0.5", // Control de versiones para soporte
        zonaHoraria: Intland.DateTimeFormat().resolvedOptions().timeZone
    };

    // 🛡️ PREPARACIÓN DE RAMA DE SEGURIDAD (Para el Centinela)
    const seguridadInicial = {
        alertaHora: false,
        multicuenta: false,
        ultimoAcceso: ahora.toISOString(),
        intentosPIN: 0
    };

    // 💎 PERFIL FINAL ENRIQUECIDO
    const perfilFinal = {
        ...perfil,
        idFinal: uuidMaestro,
        uuid: uuidMaestro,
        fechaRegistro: ahora.toISOString(),
        fechaCorte: fechaCorte.toISOString(),
        estado: 'pendiente', 
        licenciaActiva: true,
        metadatos: metadatos,      // Datos técnicos para el Admin
        seguridad: seguridadInicial // Espacio para reportes de fraude
    };

    // 2. RESPALDO LOCAL (Offline First)
    this.datos = perfilFinal;
    Persistencia.guardar(this.sesionActual, { 
        logueado: true, 
        perfil: perfilFinal,
        aprobado: false 
    });

    notificar("Vinculando hardware con red DOMINUS...", "info");

    // 3. ENVÍO A LA NUBE
    try {
        const exito = await Cloud.registrarNuevoUsuario(perfilFinal);

        if (exito) {
            // 🔔 AVISO AL MAESTRO POR TELEGRAM (Opcional si ya tienes el bot)
            if (this.notificarMaestroTelegram) {
                const msj = `🆕 *NUEVO GUERRERO*\n👤: ${perfil.nombre}\n🏢: ${perfil.negocio}\n📱: ${metadatos.dispositivo}\n🆔: ${uuidMaestro}`;
                this.notificarMaestroTelegram(msj);
            }

            notificar("¡Solicitud enviada al Admin!", "exito");
            this.preguntarPorPIN();
        } else {
            // Datos seguros en LocalStorage aunque no haya internet
            notificar("Datos guardados en el dispositivo (Offline)", "alerta");
            this.preguntarPorPIN();
        }
    } catch (error) {
        console.error("❌ Error en el salto a la nube:", error);
        this.preguntarPorPIN(); 
    }
},

// En Usuario.js (App del negocio)
actualizarPresencia() {
    if (!this.datos.uuid) return;
    Cloud.db.ref(`usuarios/${this.datos.uuid}/perfil/ultimaConexion`).set(new Date().toISOString());
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

bloquearPorMantenimiento() {
    // Creamos un telón negro que cubra todo
    let capa = document.getElementById('capa-mantenimiento');
    if (!capa) {
        capa = document.createElement('div');
        capa.id = 'capa-mantenimiento';
        capa.innerHTML = `
            <div style="text-align: center; color: white; font-family: sans-serif;">
                <h1 style="font-size: 3em;">⚒️</h1>
                <h2>DOMINUS EN MANTENIMIENTO</h2>
                <p>Estamos reforzando el sistema para servirte mejor.</p>
                <p style="color: #ffd700;"><i>"El amor y la educación son la única verdad."</i></p>
            </div>
        `;
        // Estilos para que sea un bloqueo total
        Object.assign(capa.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.95)', zIndex: '9999',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        });
        document.body.appendChild(capa);
    }
},

desbloquearApp() {
    const capa = document.getElementById('capa-mantenimiento');
    if (capa) capa.remove();
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

pantallaCapturaPIN(titulo, primerPin = null) {
    // 1. Limpieza de overlays previos para evitar duplicados en el DOM
    const overlayPrevio = document.getElementById('overlay-input-pin');
    if (overlayPrevio) overlayPrevio.remove();

    const overlay = this.crearOverlay('overlay-input-pin');

    overlay.innerHTML = `
        <div class="glass" style="width: 85%; max-width: 400px; padding: 35px 25px; border-radius: 15px; text-align: center; animation: fadeIn 0.3s ease;">
            <h2 style="color: #ffd700; font-size: 1.2rem; letter-spacing: 1px;">${titulo}</h2>
            <p style="color: white; opacity: 0.6; margin-bottom: 30px; font-size: 0.9em;">Ingresa 4 dígitos numéricos</p>
            
            <div style="position: relative; width: 100%; max-width: 180px; margin: 0 auto 40px; display: flex; justify-content: center; align-items: center;">
                <input type="password" id="pin-input" placeholder="****" maxlength="4" inputmode="numeric"
                       style="width: 100%; text-align: center; font-size: 2.8rem; letter-spacing: 12px; padding: 10px 0; border: none; border-bottom: 2px solid #ffd700; background: transparent; color: white; outline: none; box-sizing: border-box; text-indent: 12px;">
                
                <span id="ojo-pin" 
                      style="position: absolute; right: -35px; cursor: pointer; font-size: 1.3rem; filter: grayscale(1); user-select: none; transition: all 0.3s ease; padding: 5px;"
                      onclick="Usuario.togglePassword('pin-input', 'ojo-pin')">
                      👁️
                </span>
            </div>
            
            <button id="btn-continuar-pin" class="btn-main" style="width: 100%; padding: 16px; font-weight: bold; letter-spacing: 1px;">
                ${primerPin ? 'CONFIRMAR PIN' : 'SIGUIENTE'}
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const input = document.getElementById('pin-input');
    input.focus();

    document.getElementById('btn-continuar-pin').onclick = () => {
        const pinIngresado = input.value;

        // Validación de formato
        if (pinIngresado.length !== 4 || isNaN(pinIngresado)) {
            this.vibrar([50, 100, 50]);
            return notificar("El PIN debe ser de 4 números", 'error');
        }

        overlay.remove();

        if (!primerPin) {
            // PASO A: Captura inicial y salto a confirmación
            this.pantallaCapturaPIN("CONFIRMA TU PIN", pinIngresado);
        } else {
            // PASO B: Verificación de coincidencia
            if (pinIngresado === primerPin) {
                // 🔐 ÉXITO: Vinculamos el PIN con el hardware antes de seguir
                this.vincularPinSeguro(pinIngresado); 
            } else {
                // ❌ ERROR: Los pines no coinciden
                notificar("Los PIN no coinciden. Reintenta.", 'error');
                this.vibrar([100, 50, 100, 50, 100]);
                // Reiniciamos el flujo desde el principio
                this.pantallaCapturaPIN("CREAR NUEVO PIN"); 
            }
        }
    };
},

vincularPinSeguro(pin) {
    // 1. OBTENCIÓN DEL UUID MAESTRO
    // Buscamos en todas las posibles rutas donde guardamos el ID de hardware
    const uuid = this.datos.idFinal || this.datos.identidad?.idFinal || "ID_LOCAL";
    
    // 2. GENERACIÓN DE LLAVE DE CIFRADO (Base64)
    // Combinamos el UUID del equipo con el PIN para crear una firma única
    const llaveMaestra = btoa(uuid + ":" + pin);

    // 3. ACTUALIZACIÓN DEL PERFIL LOCAL
    this.datos.usaPin = true;
    this.datos.llaveMaestra = llaveMaestra; 
    
    // 4. PERSISTENCIA DE SESIÓN
    // IMPORTANTE: logueado: true permite que el sistema mantenga la instancia activa
    // mientras el centinela espera la aprobación del Admin.
    Persistencia.guardar(this.sesionActual, { 
        logueado: true, 
        perfil: this.datos,
        aprobado: false // Sigue en false hasta que el Admin firme en la nube
    });

    notificar("✅ Seguridad Vinculada", "exito");

    // 5. SALTO AL CENTINELA
    // Damos un segundo para que el usuario vea el éxito y pasamos a la espera
    setTimeout(() => this.mostrarPantallaEspera(), 1000);
},

mostrarPantallaEspera() {
    this.limpiarPantalla();
    const overlay = this.crearOverlay('overlay-espera');
    let tiempoRestante = 300; 
    
    // 🔑 OBTENCIÓN ROBUSTA DEL UUID
    const uuid = this.datos.idFinal || this.datos.identidad?.idFinal || this.datos.uuid;

    overlay.innerHTML = `
        <div id="contenedor-espera" class="glass" style="width: 90%; max-width: 450px; padding: 35px; border-radius: 20px; text-align: center; transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); transform: scale(1); opacity: 1;">
            <div id="loader-dominus" style="margin-bottom: 20px; font-size: 2.5rem; animation: pulse 2s infinite;">⏳</div>
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
        // ⚠️ RECUERDA: Cambiar las X por tu número real
        const url = `https://wa.me/58412XXXXXXX?text=${encodeURIComponent(mensaje)}`;
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

    console.log("📡 Centinela de Élite: Escuchando cambios en tiempo real...");
    const refEstado = Cloud.db.ref(`usuarios/${uuid}/perfil/estado`);
    
    // El método .on('value') reacciona instantáneamente cuando cambias el estado en el Admin
    refEstado.on('value', async (snapshot) => {
        const estado = snapshot.val();
        
        if (estado === 'aprobado') {
            console.log("⚡ ¡Acceso autorizado desde la red DOMINUS!");
            refEstado.off(); // Importante: dejamos de escuchar para evitar bucles
            
            const contenedor = document.getElementById('contenedor-espera');
            const overlay = document.getElementById('overlay-espera');
            
            if (overlay) {
                // Si la pantalla de espera está abierta, usamos la salida con animación
                this.finalizarEsperaExitosa(overlay, contenedor, null); 
            } else {
                // Si por alguna razón no hay overlay, ejecutamos la validación directa
                await this.ejecutarVerificacionDeAcceso();
            }
        }
    });
},

async ejecutarVerificacionDeAcceso() {
    const uuid = this.datos.idFinal || this.datos.identidad?.idFinal || this.datos.uuid;
    if (!uuid) return false;

    try {
        // Consultamos directamente a la base de datos
        const perfilActualizado = await Cloud.obtenerEstadoUsuario(uuid);

        if (perfilActualizado && perfilActualizado.estado === 'aprobado') {
            // Sincronizamos los datos nuevos del servidor con los locales
            this.datos = { ...this.datos, ...perfilActualizado };
            
            // ✅ PERSISTENCIA TOTAL: Marcamos logueado: true para entrar al ecosistema
            Persistencia.guardar(this.sesionActual, { 
                logueado: true, 
                perfil: this.datos 
            });

            notificar("¡ACCESO CONCEDIDO!", "exito");
            
            // Tiempo para que el usuario lea el mensaje antes de recargar
            setTimeout(() => {
                const overlay = document.getElementById('overlay-espera');
                if (overlay) overlay.remove();
                
                // Recarga para que Main.js detecte la sesión activa y abra el Dashboard
                location.reload(); 
            }, 1200);

            return true;
        }
        
        // Si no está aprobado, notificamos sutilmente si fue manual
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

    // 1. Validamos en Firebase Auth
    const uid = await Cloud.conectarACaja(usuario, pass);

    if (uid) {
        try {
            notificar("Sincronizando perfil...", "alerta");
            const snapshot = await Cloud.db.ref(`usuarios/${uid}/perfil`).once('value');
            const perfilNube = snapshot.val();

            if (perfilNube) {
                // 2. ACTUALIZACIÓN DE IDENTIDAD LOCAL
                // Si el usuario cambió de equipo, bajamos su ID aprobado de la nube
                if (perfilNube.idFinal) {
                    Persistencia.guardar('dom_id_unico', perfilNube.idFinal);
                }
                
                this.datos = perfilNube;

                // 3. FILTRO DE APROBACIÓN
                // Si el Admin (tú) aún no lo ha aprobado, no puede estar "logueado" totalmente
                const esAprobado = perfilNube.estado === 'aprobado';
                
                const datosSesion = { 
                    logueado: esAprobado, // Solo es true si está aprobado
                    perfil: this.datos 
                };

                Persistencia.guardar(this.sesionActual, datosSesion);

                // 4. DIRECCIONAMIENTO SEGÚN ESTADO
                if (!esAprobado) {
                    notificar("Acceso pendiente de aprobación", "alerta");
                    setTimeout(() => this.mostrarPantallaEspera(), 1000);
                    return;
                }

                // 5. FEEDBACK Y ÉXITO
                if (window.Interfaz && Interfaz.actualizarAvatarHeader) {
                    Interfaz.actualizarAvatarHeader(this.datos);
                }

                notificar(`Bienvenido, ${perfilNube.nombre}`, 'exito');
                
                // 6. SALTO FINAL: ¿PIN o Dashboard?
                setTimeout(() => {
                    if (this.datos.usaPin) {
                        this.pantallaDesbloqueoPIN(); // Hueco 2 resuelto
                    } else {
                        location.reload();
                    }
                }, 1500);

            } else {
                // Caso de seguridad: Existe en Auth pero no en Database
                notificar("Error: Perfil no encontrado en la red", "error");
            }

        } catch (error) {
            console.error("Error descargando perfil:", error);
            notificar("Error al recuperar datos del perfil", "error");
        }
    } else {
        notificar("Credenciales incorrectas o sin conexión.", 'error');
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

    
    franjaActual: 'mañana',
    
    plantillasBase: {
        mañana: "Buenos días [cliente], te escribo de [negocio]. Tienes un pendiente de:\n[monto_detalle]\n\nTotal: $[montoUSD]. ¡Feliz día!",
        tarde: "Buenas tardes [cliente], de parte de [negocio]. Te recordamos tu cuenta:\n[monto_detalle]\n\nTotal: $[montoUSD]. ¡Saludos!",
        noche: "Buenas noches [cliente], te escribo de [negocio] antes de cerrar. Tu cuenta es:\n[monto_detalle]\n\nTotal: $[montoUSD]. ¡Gracias!"
    },

    cambiarFranjaMensaje(franja) {
        this.franjaActual = franja;
        // Actualizar UI de botones
        ['mañana', 'tarde', 'noche'].forEach(f => {
            const btn = document.getElementById(`btn-msj-${f}`);
            btn.style.background = (f === franja) ? '#ffd700' : '#333';
            btn.style.color = (f === franja) ? 'black' : 'white';
        });

        // Cargar el mensaje de esa franja
        const guardado = Persistencia.cargar(`cfg_msj_${franja}`);
        document.getElementById('cfg-msj-maestro').value = guardado || this.plantillasBase[franja];
    },

    guardarPlantilla() {
        const txt = document.getElementById('cfg-msj-maestro').value;
        Persistencia.guardar(`cfg_msj_${this.franjaActual}`, txt);
    },

    restablecerPlantilla() {
        if(confirm("¿Quieres volver al mensaje original de esta franja?")) {
            const defaultMsj = this.plantillasBase[this.franjaActual];
            document.getElementById('cfg-msj-maestro').value = defaultMsj;
            this.guardarPlantilla();
        }
    },

    mostrarEjemplo() {
        const txt = document.getElementById('cfg-msj-maestro').value;
        const demo = txt
            .replace("[cliente]", "Juan Pérez")
            .replace("[negocio]", Persistencia.cargar('cfg_nombre_negocio') || "Mi Negocio")
            .replace("[monto_detalle]", "• Harina ($1.00)\n• Arroz ($1.20)")
            .replace("[montoUSD]", "2.20")
            .replace("[montoBs]", "85.50");
        
        alert("ASÍ SE VERÁ EN WHATSAPP:\n\n" + demo);
    },

    // Esta función la llamará Interfaz.js para saber qué mensaje usar según la hora
    obtenerMensajeSegunHora() {
        const hora = new Date().getHours();
        let franja = 'noche';
        if (hora >= 6 && hora < 12) franja = 'mañana';
        else if (hora >= 12 && hora < 19) franja = 'tarde';
        
        return Persistencia.cargar(`cfg_msj_${franja}`) || this.plantillasBase[franja];
    },
};

document.addEventListener('DOMContentLoaded', () => Usuario.init());