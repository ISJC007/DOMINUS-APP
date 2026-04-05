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
    
    // ... (aquí mantienes tus funciones de mostrarLogin, mostrarRegistro, etc.

    // ==========================================
    // PANTALLA 1: INICIAR SESIÓN
    // ==========================================
    mostrarLogin() {
        this.limpiarPantalla();
        const overlay = this.crearOverlay('overlay-login');

        overlay.innerHTML = `
            <div class="glass" style="width: 85%; max-width: 400px; padding: 30px; border-radius: 15px; text-align: center;">
                <h2 style="color: #ffd700; margin-bottom: 20px;">INICIAR SESIÓN</h2>
                
                <input type="text" id="login-user" placeholder="Usuario o Correo" class="input-moderno" style="width: 100%; margin-bottom: 15px; padding: 12px; box-sizing: border-box;">
                <input type="password" id="login-pass" placeholder="Contraseña" class="input-moderno" style="width: 100%; margin-bottom: 20px; padding: 12px; box-sizing: border-box;">
                
                <button id="btn-login" class="btn-main" style="width: 100%; padding: 15px; margin-bottom: 15px;">ENTRAR</button>
                
                <p style="color: #aaa; font-size: 0.9em; margin-top: 15px;">
                    ¿No tienes cuenta? <br>
                    <span id="link-registro" style="color: #ffd700; cursor: pointer; font-weight: bold; text-decoration: underline;">Regístrate aquí</span>
                </p>
            </div>
        `;
        document.body.appendChild(overlay);

        // Lógica de Login
        document.getElementById('btn-login').onclick = () => {
            const u = document.getElementById('login-user').value;
            const p = document.getElementById('login-pass').value;
            this.procesarLogin(u, p);
        };

        // Ir a registro
        document.getElementById('link-registro').onclick = () => {
            overlay.remove();
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
                <h2 style="color: #ffd700; margin-bottom: 20px;">CREAR CUENTA</h2>
                
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="text" id="reg-nombre" placeholder="Nombres" class="input-moderno" style="width: 50%; padding: 10px;">
                    <input type="text" id="reg-apellido" placeholder="Apellidos" class="input-moderno" style="width: 50%; padding: 10px;">
                </div>
                
                <input type="email" id="reg-correo" placeholder="Correo Electrónico" class="input-moderno" style="width: 100%; margin-bottom: 10px; padding: 10px; box-sizing: border-box;">
                <input type="text" id="reg-user" placeholder="Nombre de Usuario" class="input-moderno" style="width: 100%; margin-bottom: 10px; padding: 10px; box-sizing: border-box;">
                
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <input type="password" id="reg-pass1" placeholder="Contraseña" class="input-moderno" style="width: 100%; margin-bottom: 10px; padding: 10px; box-sizing: border-box;">
                    <input type="password" id="reg-pass2" placeholder="Confirmar Contraseña" class="input-moderno" style="width: 100%; padding: 10px; box-sizing: border-box;">
                </div>

                <button id="btn-crear-cuenta" class="btn-main" style="width: 100%; padding: 15px;">REGISTRARSE</button>
                
                <p id="link-volver-login" style="color: #888; cursor: pointer; margin-top: 15px; font-size: 0.9em;">Volver a Inicio de Sesión</p>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('link-volver-login').onclick = () => {
            overlay.remove();
            this.mostrarLogin();
        };

        document.getElementById('btn-crear-cuenta').onclick = () => {
            const p1 = document.getElementById('reg-pass1').value;
            const p2 = document.getElementById('reg-pass2').value;
            const correo = document.getElementById('reg-correo').value;
            const usuario = document.getElementById('reg-user').value;

            if (!correo || !usuario) return alert("Faltan datos");
            if (p1 !== p2) return alert("Las contraseñas no coinciden");
            if (p1.length < 4) return alert("La contraseña es muy corta");

            // Recolectar datos y pasar a verificación
            const nuevoPerfil = {
                nombre: document.getElementById('reg-nombre').value,
                apellido: document.getElementById('reg-apellido').value,
                correo: correo,
                usuario: usuario,
                pass: p1 // En un sistema real esto se encripta
            };
            
            overlay.remove();
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
                alert("✅ Correo verificado con éxito.");
                overlay.remove();
                this.guardarEnBaseDeDatos(perfil);
            } else {
                alert("❌ Código incorrecto. Intenta de nuevo.");
            }
        };
    },

    guardarEnBaseDeDatos(perfil) {
        // Obtenemos la BD de usuarios (o creamos una si no existe)
        let baseDatos = Persistencia.cargar(this.dbSimulada) || [];
        baseDatos.push(perfil);
        Persistencia.guardar(this.dbSimulada, baseDatos);

        // Guardamos la sesión actual (Auto-login)
        this.datos = perfil;
        Persistencia.guardar(this.sesionActual, { logueado: true, perfil: perfil });

        // Pasamos a la pregunta final
        this.preguntarPorPIN();
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

    document.getElementById('btn-si-pin').onclick = () => {
        const nuevoPin = prompt("Ingresa tu nuevo PIN de 4 dígitos:");
        if(nuevoPin && nuevoPin.length === 4) {
            // PRIMERO: Guardamos el PIN físico
            Persistencia.guardar('dom_seguridad_pin', nuevoPin);
            
            // SEGUNDO: Marcamos la preferencia en el perfil
            this.datos.usaPin = true;
            Persistencia.guardar(this.sesionActual, { logueado: true, perfil: this.datos });
            
            overlay.remove();
            alert("✅ PIN Activado.");
            location.reload();
        } else {
            alert("PIN no válido. Intenta de nuevo.");
        }
    };

    document.getElementById('btn-no-pin').onclick = () => {
        // Marcamos que NO quiere usar PIN
        this.datos.usaPin = false;
        Persistencia.guardar(this.sesionActual, { logueado: true, perfil: this.datos });
        
        overlay.remove();
        alert("Seguridad desactivada. Puedes activarla en Ajustes.");
        location.reload();
    };
},
    // ==========================================
    // UTILIDADES
    // ==========================================
    crearOverlay(id) {
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95); z-index: 50000;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(10px);
        `;
        return overlay;
    },

    limpiarPantalla() {
        const loader = document.querySelector('.loader');
        if (loader) loader.style.display = 'none';
        const overlays = document.querySelectorAll('[id^="overlay-"]');
        overlays.forEach(o => o.remove());
    },

    procesarLogin(usuario, pass) {
        const baseDatos = Persistencia.cargar(this.dbSimulada) || [];
        const perfilEncontrado = baseDatos.find(u => (u.usuario === usuario || u.correo === usuario) && u.pass === pass);

        if (perfilEncontrado) {
            Persistencia.guardar(this.sesionActual, { logueado: true, perfil: perfilEncontrado });
            location.reload();
        } else {
            alert("Usuario o Contraseña incorrectos.");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Usuario.init());