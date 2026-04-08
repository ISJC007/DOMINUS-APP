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
            // 1. Crear el usuario en Firebase Auth (Solo correo y pass)
            const userCredential = await this.auth.createUserWithEmailAndPassword(datos.correo, datos.pass);
            this.userId = userCredential.user.uid;
            const uid = this.userId;

            let urlFoto = "";

            // 2. Si el usuario seleccionó una foto, la subimos al Storage
            if (datos.foto) {
                notificar("Subiendo imagen de perfil...", "alerta");
                const storageRef = this.storage.ref(`perfiles/${uid}/${datos.foto.name}`);
                const uploadTask = await storageRef.put(datos.foto);
                urlFoto = await uploadTask.ref.getDownloadURL();
            }

            // 3. Crear el Perfil Extendido en la Realtime Database
            const perfilFinal = {
                uid: uid,
                nombre: datos.nombre,
                apellido: datos.apellido || "",
                negocio: datos.negocio,
                usuario: datos.usuario,
                correo: datos.correo,
                fotoPerfil: urlFoto, // Link público de la imagen
                fechaRegistro: new Date().toISOString()
            };

            // Guardamos en la ruta: usuarios / UID / perfil
            await this.db.ref(`usuarios/${uid}/perfil`).set(perfilFinal);
            
            console.log("🆕 Ecosistema DOMINUS creado para:", datos.negocio);
            return perfilFinal;

        } catch (error) {
            console.error("❌ Error al registrar en la nube:", error.message);
            
            // Manejo de errores amigable
            let mensaje = "Error al crear cuenta";
            if (error.code === 'auth/email-already-in-use') mensaje = "Este correo ya está registrado";
            if (error.code === 'auth/invalid-email') mensaje = "El formato del correo es inválido";
            if (error.code === 'auth/weak-password') mensaje = "La contraseña es muy débil";
            
            notificar(mensaje, "error");
            return null;
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
    }
};

// Encendemos el motor inmediatamente al cargar el script
Cloud.init();