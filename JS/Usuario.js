/**
 * DOMINUS - Sistema Avanzado de Autenticación
 * Flujo: Login -> Registro -> Verificación (Simulada) -> PIN Opcional -> Auto-Login
 */

const Usuario = {
    datos: null,
    dbSimulada: 'dom_usuarios_db',
    sesionActual: 'dom_sesion_activa',

    init() {
        console.log("🔐 DOMI: Verificando sesión...");
        const sesion = Persistencia.cargar(this.sesionActual);
        
        if (sesion && sesion.logueado) {
            this.datos = sesion.perfil;
            console.log(`👤 Sesión activa: ${this.datos.usuario}`);
            return true; // Hay sesión, podemos proceder
        } else {
            console.log("🎟️ No hay sesión. Mostrando Login...");
            this.mostrarLogin();
            return false; // No hay sesión, el flujo se detiene en el Login
        }
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
                <div id="preview-container" style="width: 100%; height: 100%; border-radius: 50%; border: 3px solid #ffd700; overflow: hidden; background: #222; display: flex; align-items: center; justify-content: center; cursor: pointer;">
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
            <input type="email" id="reg-correo" placeholder="Correo Electrónico" class="input-moderno" style="width: 100%; margin-bottom: 10px; padding: 10px; box-sizing: border-box;">
            <input type="text" id="reg-user" placeholder="Nombre de Usuario" class="input-moderno" style="width: 100%; margin-bottom: 10px; padding: 10px; box-sizing: border-box;">
            
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <div style="position: relative; width: 100%; margin-bottom: 10px;">
                    <input type="password" id="reg-pass1" placeholder="Contraseña" class="input-moderno" 
                           style="width: 100%; padding: 10px; padding-right: 40px; box-sizing: border-box;">
                    <span id="ojo-reg-1" 
                          style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; filter: grayscale(1); user-select: none;"
                          onclick="Usuario.togglePassword('reg-pass1', 'ojo-reg-1')">👁️</span>
                </div>

                <div style="position: relative; width: 100%;">
                    <input type="password" id="reg-pass2" placeholder="Confirmar Contraseña" class="input-moderno" 
                           style="width: 100%; padding: 10px; padding-right: 40px; box-sizing: border-box;">
                    <span id="ojo-reg-2" 
                          style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; filter: grayscale(1); user-select: none;"
                          onclick="Usuario.togglePassword('reg-pass2', 'ojo-reg-2')">👁️</span>
                </div>
            </div>

            <button id="btn-crear-cuenta" class="btn-main" style="width: 100%; padding: 15px;">REGISTRARSE</button>
            
            <p id="link-volver-login" style="color: #888; cursor: pointer; margin-top: 15px; font-size: 0.9em;">Volver a Inicio de Sesión</p>
        </div>
    `;
    document.body.appendChild(overlay);

    // Lógica para previsualizar la foto
    const inputFoto = document.getElementById('reg-foto');
    const imgPreview = document.getElementById('img-preview');
    const placeholder = document.getElementById('placeholder-icon');

    inputFoto.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imgPreview.src = event.target.result;
                imgPreview.style.display = 'block';
                placeholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    };

    document.getElementById('link-volver-login').onclick = () => {
        overlay.remove();
        this.mostrarLogin();
    };

    document.getElementById('btn-crear-cuenta').onclick = () => {
        const p1 = document.getElementById('reg-pass1').value;
        const p2 = document.getElementById('reg-pass2').value;
        const correo = document.getElementById('reg-correo').value;
        const usuario = document.getElementById('reg-user').value;
        const nombre = document.getElementById('reg-nombre').value;
        const negocio = document.getElementById('reg-negocio').value;
        const fotoFile = inputFoto.files[0]; // Aquí tenemos el archivo de imagen

        if (!correo || !usuario || !nombre || !negocio) {
            return notificar("Faltan datos obligatorios", 'alerta');
        }
        
        if (p1 !== p2) {
            return notificar("Las contraseñas no coinciden", 'error');
        }
        
        if (p1.length < 4) {
            return notificar("Contraseña demasiado corta (min. 4)", 'alerta');
        }

        const nuevoPerfil = {
            nombre: nombre,
            apellido: document.getElementById('reg-apellido').value,
            negocio: negocio,
            correo: correo,
            usuario: usuario,
            pass: p1,
            foto: fotoFile // Enviamos el archivo real para procesarlo en Firebase
        };
        
        overlay.remove();
        // Cambiaremos 'simularEnvioCorreo' por tu lógica real de Firebase pronto
        this.simularEnvioCorreo(nuevoPerfil);
    };
},
    // ==========================================
    // PANTALLA 3: VERIFICACIÓN DE CORREO
    // ==========================================
    simularEnvioCorreo(perfil) {
        // Generamos código aleatorio de 4 dígitos
        const codigoReal = Math.floor(1000 + Math.random() * 9000).toString();
        
        // SIMULADOR: Mostramos el código en una alerta (Esto reemplaza al email temporalmente)
        alert(`SIMULADOR DE EMAIL\n\nDe: soporte@dominus.com\nPara: ${perfil.correo}\n\nTu código de verificación es: ${codigoReal}`);

        this.mostrarVerificacion(perfil, codigoReal);
    },

 mostrarVerificacion(perfil, codigoReal) {
    const overlay = this.crearOverlay('overlay-verificacion');

    overlay.innerHTML = `
        <div class="glass" style="width: 85%; max-width: 400px; padding: 30px; border-radius: 15px; text-align: center;">
            <h2 style="color: #ffd700;">VERIFICA TU CORREO</h2>
            <p style="color: white; opacity: 0.8; margin-bottom: 20px; font-size: 0.9em;">
                Hemos enviado un código a:<br><strong style="color:#fff;">${perfil.correo}</strong>
            </p>
            
            <input type="text" id="codigo-input" placeholder="- - - -" maxlength="4" inputmode="numeric"
                   style="width: 150px; text-align: center; font-size: 2rem; letter-spacing: 10px; padding: 10px; border: none; border-bottom: 2px solid #ffd700; background: transparent; color: white; margin-bottom: 20px; outline: none;">
            
            <button id="btn-verificar" class="btn-main" style="width: 100%; padding: 15px;">CONFIRMAR CÓDIGO</button>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-verificar').onclick = () => {
        const inputCodigo = document.getElementById('codigo-input').value;
        
        if (inputCodigo === codigoReal) {
            // Éxito: Notificamos y procedemos
            notificar("Correo verificado con éxito", 'exito');
            overlay.remove();
            this.guardarEnBaseDeDatos(perfil);
        } else {
            // Error: El usuario permanece en la pantalla para reintentar
            notificar("Código incorrecto. Intenta de nuevo.", 'error');
            
            // Opcional: Limpiar el input y poner el foco para facilitar el reintento
            const input = document.getElementById('codigo-input');
            input.value = '';
            input.focus();
        }
    };
},

  async guardarEnBaseDeDatos(perfil) {
    // 1. Lo registramos en la Nube de Google (Mundo Real)
    // Usamos el correo y la pass que el usuario puso en el formulario
    const uid = await Cloud.registrarNuevoUsuario(perfil.correo, perfil.pass);

    if (uid) {
        // 2. Si Google lo aceptó, guardamos su perfil extendido en la DB de Firebase
        Cloud.respaldardatos("perfil", perfil);
        
        // 3. Guardamos localmente para rapidez (Tu lógica actual)
        this.datos = perfil;
        Persistencia.guardar(this.sesionActual, { logueado: true, perfil: perfil });

        // 4. Continuamos al PIN
        this.preguntarPorPIN();
    } else {
        notificar("Error al crear cuenta en la nube. ¿Ya existe este correo?", "error");
    }
},

    // ==========================================
    // PANTALLA 4: PREGUNTA DE PIN
    // ==========================================
   preguntarPorPIN() {
    const overlay = this.crearOverlay('overlay-pregunta-pin');

    overlay.innerHTML = `
        <div class="glass" style="width: 85%; max-width: 400px; padding: 30px; border-radius: 15px; text-align: center;">
            <h2 style="color: #ffd700;">CAPA DE SEGURIDAD</h2>
            <p style="color: white; opacity: 0.8; margin-bottom: 25px;">
                ¿Deseas activar un PIN de acceso rápido (4 dígitos)?
            </p>
            <button id="btn-si-pin" class="btn-main" style="width: 100%; padding: 15px; margin-bottom: 10px;">SÍ, CREAR PIN</button>
            <button id="btn-no-pin" style="width: 100%; padding: 15px; background: transparent; border: 1px solid #555; color: #888; border-radius: 10px;">NO POR AHORA</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // OPCIÓN: SÍ QUIERE PIN
    document.getElementById('btn-si-pin').onclick = () => {
        overlay.remove();
        this.pantallaCapturaPIN("CREAR NUEVO PIN"); // Iniciamos el flujo de doble modal
    };

    // OPCIÓN: NO QUIERE PIN
    document.getElementById('btn-no-pin').onclick = () => {
        this.datos.usaPin = false;
        Persistencia.guardar(this.sesionActual, { logueado: true, perfil: this.datos });
        
        overlay.remove();
        notificar("Seguridad desactivada. Puedes activarla en Ajustes.", 'alerta');
        setTimeout(() => location.reload(), 1500); // Pausa para que vea el toast
    };
},

pantallaCapturaPIN(titulo, primerPin = null) {
    const overlay = this.crearOverlay('overlay-input-pin');

    overlay.innerHTML = `
        <div class="glass" style="width: 85%; max-width: 400px; padding: 35px 25px; border-radius: 15px; text-align: center;">
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

        if (pinIngresado.length !== 4 || isNaN(pinIngresado)) {
            this.vibrar([50, 100, 50]);
            return notificar("El PIN debe ser de 4 números", 'error');
        }

        overlay.remove();

        if (!primerPin) {
            // Primer paso: Captura inicial
            this.pantallaCapturaPIN("CONFIRMA TU PIN", pinIngresado);
        } else {
            // Segundo paso: Verificación
            if (pinIngresado === primerPin) {
                Persistencia.guardar('dom_seguridad_pin', pinIngresado);
                this.datos.usaPin = true;
                Persistencia.guardar(this.sesionActual, { logueado: true, perfil: this.datos });
                
                notificar("✅ PIN Activado con éxito", 'exito');
                setTimeout(() => location.reload(), 1500);
            } else {
                notificar("Los PIN no coinciden. Reintenta.", 'error');
                this.vibrar([100, 50, 100, 50, 100]);
                // Reiniciamos el flujo completo
                this.pantallaCapturaPIN("CREAR NUEVO PIN"); 
            }
        }
    };
},
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
            // 2. DESCARGA DEL PERFIL REAL: Vamos a la ruta usuarios/uid/perfil
            notificar("Sincronizando perfil...", "alerta");
            const snapshot = await Cloud.db.ref(`usuarios/${uid}/perfil`).once('value');
            const perfilNube = snapshot.val();

            if (perfilNube) {
                // 3. Guardamos TODO (Foto, Negocio, etc.) en la sesión local
                this.datos = perfilNube;
                
                const datosSesion = { 
                    logueado: true, 
                    perfil: this.datos 
                };

                Persistencia.guardar(this.sesionActual, datosSesion);

                // 4. Actualizamos la interfaz antes de recargar (Feedback visual)
                if (window.Interfaz && Interfaz.actualizarAvatarHeader) {
                    Interfaz.actualizarAvatarHeader(this.datos);
                }

                notificar(`Bienvenido, ${perfilNube.nombre}`, 'exito');
                
                // Esperamos un poco para que vea su foto antes de recargar
                setTimeout(() => location.reload(), 1500);
            } else {
                // Si por alguna razón no hay perfil, creamos uno básico para no romper la app
                console.warn("⚠️ Usuario sin perfil en DB. Creando uno básico...");
                this.datos = { usuario: usuario, correo: usuario, negocio: "Mi Negocio" };
                Persistencia.guardar(this.sesionActual, { logueado: true, perfil: this.datos });
                location.reload();
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
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.92); z-index: 50000;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            animation: fadeIn 0.3s ease;
        `;
        return overlay;
    },

   limpiarPantalla() {
    const loader = document.querySelector('.loader');
    if (loader) loader.style.display = 'none';
    
    // Eliminamos los overlays existentes de golpe para evitar conflictos de ID
    const overlays = document.querySelectorAll('[id^="overlay-"]');
    overlays.forEach(o => o.remove()); 
}
};

document.addEventListener('DOMContentLoaded', () => Usuario.init());