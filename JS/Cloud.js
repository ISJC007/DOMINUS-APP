// JS/Cloud.js - El motor de sincronización de DOMINUS (Versión 1.1)
const firebaseConfig = {
    apiKey: "AIzaSyCeFdSmYQp1LWotNMmOXwcBB_LBFffwUyI",
    authDomain: "dominus-app-85008.firebaseapp.com",
    databaseURL: "https://dominus-app-85008-default-rtdb.firebaseio.com",
    projectId: "dominus-app-85008",
    storageBucket: "dominus-app-85008.firebasestorage.app",
    messagingSenderId: "489505850623",
    appId: "1:489505850623:web:8a9ae4d1bc04f066bdb8ca"
};

const Cloud = {
    db: null,
    auth: null,
    storage: null, // 🖼️ Añadido para manejar fotos de perfil
    userId: null,

    init() {
        // 1. Inicializamos Firebase con tu configuración de Google
        firebase.initializeApp(firebaseConfig);
        this.db = firebase.database();
        this.auth = firebase.auth();
        this.storage = firebase.storage(); // 👈 Inicializamos el motor de archivos
        
        console.log("🚀 DOMINUS Cloud: Conectado al servidor de Google.");

        // 2. OBSERVADOR DE SESIÓN (Punto 9: Multiusuario)
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.userId = user.uid;
                console.log("💎 DOMINUS Cloud: Sesión restaurada para", user.email);
                console.log("📦 Tu ID de Almacén es:", this.userId);
            } else {
                this.userId = null;
                console.warn("☁️ DOMINUS Cloud: Sin sesión activa. Los datos solo se guardarán localmente.");
            }
        });
    },

    /**
     * Inicia sesión en la "Caja Fuerte" de la nube
     */
    async conectarACaja(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            this.userId = userCredential.user.uid;
            console.log("🔑 Acceso concedido. UID:", this.userId);
            return this.userId;
        } catch (error) {
            console.error("❌ Error de acceso a la nube:", error.message);
            return null;
        }
    },

    /**
     * REGISTRO DE NUEVO USUARIO (Mundo Real - Firebase Auth)
     * Crea la cuenta en Google con correo y contraseña.
     */
 /**
     * REGISTRO INTEGRAL (Versión 2.0)
     * Crea Auth, sube Foto a Storage y guarda Perfil en Database.
     */
async registrarNuevoUsuario(datos) {
    try {
        // 1. Crear el usuario en Firebase Auth (Mantenemos el login por correo/pass)
        const userCredential = await this.auth.createUserWithEmailAndPassword(datos.correo, datos.pass);
        
        // 🔑 CAMBIO MAESTRO: En lugar de usar el UID de Firebase, usamos TU idFinal
        // 'datos.idFinal' debe venir desde Usuario.js (es tu UUID físico)
        const uidMaestro = datos.idFinal; 
        this.userId = uidMaestro;

        // 🖼️ LÓGICA DE AVATAR (Por defecto)
        let urlFoto = "https://cdn-icons-png.flaticon.com/512/6522/6522516.png"; 

        // 2. Crear el Perfil Extendido usando el UUID Físico
        const perfilFinal = {
            uid: uidMaestro, // Identidad vinculada al hardware
            authUid: userCredential.user.uid, // Guardamos el de Firebase solo como referencia
            nombre: datos.nombre,
            apellido: datos.apellido || "",
            negocio: datos.negocio,
            usuario: datos.usuario,
            correo: datos.correo,
            telefono: datos.telefono || "Sin número",
            fotoPerfil: urlFoto, 
            fechaRegistro: new Date().toISOString(),
            estado: 'pendiente' 
        };

        // 3. Guardar en Realtime Database usando el UUID como Llave
        // Ahora el Centinela SÍ encontrará esta ruta
        await this.db.ref(`usuarios/${uidMaestro}/perfil`).set(perfilFinal);
        
        // 4. NOTIFICAR AL ADMIN usando el UUID como Llave
        // Así, cuando tú apruebes en el Admin, escribirás en la carpeta correcta
        await this.db.ref(`solicitudes_pendientes/${uidMaestro}`).set({
            nombre: perfilFinal.nombre,
            negocio: perfilFinal.negocio,
            email: perfilFinal.correo,
            telefono: perfilFinal.telefono,
            uid: uidMaestro, // Tu UUID físico
            fecha: perfilFinal.fechaRegistro
        });

        console.log("🆕 Ecosistema DOMINUS vinculado al Hardware:", uidMaestro);
        return perfilFinal;

    } catch (error) {
        console.error("❌ Error crítico en registro:", error.message);
        let mensaje = "Error al crear cuenta";
        if (error.code === 'auth/email-already-in-use') mensaje = "Este correo ya está registrado";
        
        if (typeof notificar === "function") notificar(mensaje, "error");
        return null;
    }
},

async aprobarUsuarioManualmente(uid) {
    try {
        const hoy = new Date();
        const fechaCorte = new Date();
        fechaCorte.setDate(hoy.getDate() + 15); // Le damos 15 días de prueba

        await this.db.ref(`usuarios/${uid}/perfil`).update({
            estado: 'aprobado',
            fechaCorte: fechaCorte.toISOString()
        });

        console.log("🔓 Usuario aprobado con éxito. Ya puede entrar.");
    } catch (error) {
        console.error("Error al aprobar:", error);
    }
},

    /**
     * CERRAR SESIÓN (Opcional, para cuando quieras salir)
     */
    async cerrarSesion() {
        try {
            await this.auth.signOut();
            this.userId = null;
            console.log("🔌 Sesión de nube cerrada.");
        } catch (error) {
            console.error("❌ Error al cerrar sesión:", error.message);
        }
    },

    /**
     * RESPALDO AUTOMÁTICO (Punto 7: Base de Datos)
     * Envía los datos a la ruta privada del usuario actual
     */
    respaldardatos(clave, datos) {
        // Verificación de seguridad básica
        if (!navigator.onLine) {
            console.warn("🌐 Sin conexión: El respaldo de '" + clave + "' queda pendiente.");
            return;
        }

        if (!this.userId) {
            console.warn("⚠️ No se puede respaldar '" + clave + "': No hay un usuario identificado.");
            return;
        }

        // El envío real a Firebase: usuarios / ID_UNICO / datos / nombre_del_dato
        this.db.ref(`usuarios/${this.userId}/datos/${clave}`).set(datos)
            .then(() => {
                console.log(`✅ Nube sincronizada: '${clave}' actualizado.`);
            })
            .catch(error => {
                console.error(`❌ Fallo crítico en el respaldo de ${clave}:`, error.message);
            });
    },

    /**
     * Consulta el estado de aprobación del usuario (Usado por el Centinela)
     */
    async obtenerEstadoUsuario(uid) {
        try {
            const snapshot = await this.db.ref(`usuarios/${uid}/perfil`).once('value');
            return snapshot.val(); // Retornará el objeto perfil con el campo .estado
        } catch (error) {
            console.error("❌ Error al consultar estado:", error.message);
            throw error;
        }
    },

    /**
     * Manda los datos a una zona de espera para que el Admin los apruebe
     */
    async solicitarAccesoAdmin(perfil) {
        try {
            // Añadimos el estado inicial como pendiente
            perfil.estado = 'pendiente';
            perfil.fechaSolicitud = new Date().toISOString();

            // Lo guardamos en su perfil de la base de datos
            await this.db.ref(`usuarios/${perfil.uid}/perfil`).set(perfil);
            
            // También lo guardamos en una lista global para el Administrador (Tú)
            await this.db.ref(`solicitudes_pendientes/${perfil.uid}`).set({
                nombre: perfil.nombre,
                negocio: perfil.negocio,
                uid: perfil.uid,
                fecha: perfil.fechaSolicitud
            });

            return true;
        } catch (error) {
            console.error("❌ Error al enviar solicitud:", error.message);
            return false;
        }
    }
};

// Encendemos el motor inmediatamente al cargar el script
Cloud.init();