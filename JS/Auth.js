const Auth = {
    // Cargamos los usuarios del almacenamiento local
    usuarios: Persistencia.cargar('dom_users') || {},

    /**
     * Registra un nuevo usuario con estatus "No Pagado" por defecto
     */
    procesarRegistro() {
        const nombre = document.getElementById('r-name').value;
        const apellido = document.getElementById('r-last').value;
        const email = document.getElementById('r-email').value;
        const telefono = document.getElementById('r-tel').value;
        const usuario = document.getElementById('r-user').value;
        const clave = document.getElementById('r-pass').value;

        // Validación básica de campos vacíos
        if (!nombre || !apellido || !email || !usuario || !clave) {
            alert("Por favor, completa todos los campos obligatorios.");
            return;
        }

        // Verificar si el usuario ya existe
        if (this.usuarios[usuario]) {
            alert("El nombre de usuario ya existe. Intenta con otro.");
            return;
        }

        // Guardar nuevo usuario
        this.usuarios[usuario] = {
            nombre: nombre,
            apellido: apellido,
            correo: email,
            telefono: telefono,
            clave: clave,
            pagado: false, // Por defecto entra bloqueado hasta que el admin pague
            fechaRegistro: new Date().toLocaleDateString()
        };

        Persistencia.guardar('dom_users', this.usuarios);
        
        alert("¡Registro exitoso! Por favor, contacta al administrador para activar tu acceso.");
        toggleAuth(); // Regresa al formulario de login
    },

    /**
     * Valida credenciales y estatus de pago
     */
    procesarLogin() {
        const u = document.getElementById('l-user').value;
        const p = document.getElementById('l-pass').value;

        const userFound = this.usuarios[u];

        if (userFound && userFound.clave === p) {
            
            // Verificación de Pago (El admin siempre tiene acceso)
            if (!userFound.pagado && u !== 'admin') {
                alert("Acceso denegado: Tu suscripción no está activa. Contacta a soporte Dominus.");
                return;
            }

            // Guardar sesión activa (incluimos nombre para el saludo)
            localStorage.setItem('dominus_session', JSON.stringify({
                user: u,
                nombre: userFound.nombre
            }));

            window.location.href = 'index.html';
        } else {
            alert("Usuario o contraseña incorrectos.");
        }
    },

    /**
     * Verifica si hay una sesión activa al cargar la página
     */
    check() {
        const session = localStorage.getItem('dominus_session');
        
        // Si no hay sesión y no estamos en login, redirigir
        if (!session && !window.location.href.includes('login.html')) {
            window.location.href = 'login.html';
            return null;
        }

        return session ? JSON.parse(session) : null;
    },

    /**
     * Borra la sesión y redirige al login
     */
    logout() {
        localStorage.removeItem('dominus_session');
        window.location.href = 'login.html';
    }
};

/**
 * Función auxiliar para cambiar entre Login y Registro en el HTML
 */
function toggleAuth() {
    const l = document.getElementById('login-form');
    const r = document.getElementById('register-form');
    
    if (l.style.display === 'none') {
        l.style.display = 'block';
        r.style.display = 'none';
    } else {
        l.style.display = 'none';
        r.style.display = 'block';
    }
}