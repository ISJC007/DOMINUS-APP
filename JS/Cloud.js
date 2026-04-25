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
        // 1. Crear el usuario en Firebase Auth
        const userCredential = await this.auth.createUserWithEmailAndPassword(datos.correo, datos.pass);
        
        // 🔑 IDENTIDAD MAESTRA (Hardware Binding)
        const uidMaestro = datos.idFinal; 
        this.userId = uidMaestro;

        const ahora = new Date();
        const fechaCorte = new Date();
        fechaCorte.setDate(ahora.getDate() + 16); // 15 días + 1 de margen

        // 🛰️ CAPTURA DE METADATOS TÉCNICOS (Alineado con lo nuevo solicitado)
        const metadatosEnriquecidos = {
            dispositivo: navigator.userAgent.includes("Android") ? "Android" : "PC/Browser",
            plataforma: navigator.platform,
            // Captura de marca/modelo si está disponible, sino "Genérico"
            modelo: navigator.userAgentData?.brands[0]?.brand || "Dispositivo Estándar",
            idioma: navigator.language,
            resolucion: `${window.screen.width}x${window.screen.height}`,
            versionApp: "1.0.5",
            zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // 📦 ESTRUCTURA ORGANIZADA (POR COMPOSICIÓN)
        const perfilEstructurado = {
            perfil: {
                nombre: datos.nombre,
                apellido: datos.apellido || "",
                negocio: datos.negocio,
                usuario: datos.usuario,
                correo: datos.correo,
                telefono: datos.telefono || "Sin número",
                fotoPerfil: "https://cdn-icons-png.flaticon.com/512/6522/6522516.png",
                uid: uidMaestro,
                authUid: userCredential.user.uid // Referencia de Firebase
            },
            administracion: {
                estado: 'pendiente',
                licenciaActiva: true,
                fechaRegistro: ahora.toISOString(),
                fechaCorte: fechaCorte.toISOString(),
                fechaAprobacion: "" // Se llenará desde el Admin
            },
            seguridad: {
                idFinal: uidMaestro,
                ultimaConexion: ahora.toISOString(),
                metadatos: metadatosEnriquecidos,
                centinela: {
                    alertaHora: false,
                    intentosPIN: 0
                }
            }
        };

        // 2. Guardar el Perfil Completo en 'usuarios'
        // Usamos la ruta completa para que Firebase cree las "carpetas"
        await this.db.ref(`usuarios/${uidMaestro}`).set(perfilEstructurado);
        
        // 3. Crear el acceso rápido para el Admin en 'solicitudes_pendientes'
        // Solo mandamos lo necesario para que tu Admin lo vea rápido
        await this.db.ref(`solicitudes_pendientes/${uidMaestro}`).set({
            nombre: perfilEstructurado.perfil.nombre,
            negocio: perfilEstructurado.perfil.negocio,
            email: perfilEstructurado.perfil.correo,
            uid: uidMaestro,
            modelo: metadatosEnriquecidos.modelo,
            fecha: perfilEstructurado.administracion.fechaRegistro
        });

        console.log("🆕 Guerrero registrado y organizado:", uidMaestro);
        return perfilEstructurado;

    } catch (error) {
        console.error("❌ Error crítico en registro:", error.message);
        let mensaje = "Error al crear cuenta";
        if (error.code === 'auth/email-already-in-use') mensaje = "Este correo ya está en uso";
        
        if (typeof notificar === "function") notificar(mensaje, "error");
        return null;
    }
},

async aprobarUsuarioManualmente(uid) {
    try {
        const hoy = new Date();
        const fechaCorte = new Date();
        fechaCorte.setDate(hoy.getDate() + 15); // Le damos 15 días de prueba

        // 🛡️ CAMBIO DE RUTA: Ahora escribimos en 'administracion'
        await this.db.ref(`usuarios/${uid}/administracion`).update({
            estado: 'aprobado',
            fechaAprobacion: hoy.toISOString(),
            fechaCorte: fechaCorte.toISOString(),
            licenciaActiva: true
        });

        // 🧹 LIMPIEZA: Una vez aprobado, lo quitamos de la lista de espera
        await this.db.ref(`solicitudes_pendientes/${uid}`).remove();

        console.log("🔓 Guerrero aprobado y movido al ecosistema activo.");
        return true;
    } catch (error) {
        console.error("❌ Error al aprobar desde el Mando Central:", error);
        return false;
    }
},

    /**
     * CERRAR SESIÓN (Opcional, para cuando quieras salir)
     */
 

    /**
     * RESPALDO AUTOMÁTICO (Punto 7: Base de Datos)
     * Envía los datos a la ruta privada del usuario actual
     */
/**
 * Sincroniza datos específicos del negocio (Inventario, Ventas, Clientes) con la nube.
 * @param {string} clave - El nombre de la categoría (ej: 'inventario', 'ventas')
 * @param {object} datos - El objeto o array con la información
 */
respaldarDatos(clave, datos) { // ✅ Corregido: CamelCase (Mayúscula en la D)
    // 1. Verificación de conexión
    if (!navigator.onLine) {
        console.warn(`🌐 Sin conexión: Sincronización de '${clave}' en espera.`);
        return;
    }

    // 2. Verificación de identidad
    if (!this.userId) {
        console.warn(`⚠️ Error de respaldo: No hay un ID de hardware vinculado para '${clave}'.`);
        return;
    }

    // 3. Envío organizado a la Nube
    // RUTA: usuarios / ID_FISICO / operatividad / nombre_del_dato
    this.db.ref(`usuarios/${this.userId}/operatividad/${clave}`).set(datos)
        .then(() => {
            console.log(`💎 DOMINUS Cloud: '${clave}' sincronizado correctamente.`);
        })
        .catch(error => {
            console.error(`❌ Error en sincronización de ${clave}:`, error.message);
            
            // Si el error es de permisos, podrías avisar que la licencia expiró
            if (error.message.includes("permission_denied")) {
                if (typeof notificar === "function") {
                    notificar("Error de acceso: Verifica tu suscripción", "error");
                }
            }
        });
},
    /**
     * Consulta el estado de aprobación del usuario (Usado por el Centinela)
     */
   /**
 * Consulta el estatus legal y de aprobación del usuario (Usado por el Centinela)
 * Ahora busca en la carpeta de administración para mayor seguridad.
 */
async obtenerEstadoUsuario(uid) {
    try {
        // 🛡️ CAMBIO DE RUTA: Apuntamos a 'administracion' en lugar de 'perfil'
        const snapshot = await this.db.ref(`usuarios/${uid}/administracion`).once('value');
        
        const data = snapshot.val();

        if (!data) {
            console.warn("⚠️ Usuario no encontrado en los registros de administración.");
            return null;
        }

        // Retornamos el objeto de administración que contiene:
        // .estado (aprobado/pendiente/bloqueado)
        // .licenciaActiva (true/false)
        // .fechaCorte (ISO String)
        return data; 

    } catch (error) {
        console.error("❌ Error al consultar estado en la nube:", error.message);
        throw error;
    }
},

    /**
     * Manda los datos a una zona de espera para que el Admin los apruebe
     */
   /**
 * Envía o re-envía una solicitud de acceso al Mando Central.
 * Útil para registros nuevos o usuarios que necesitan re-aprobación.
 */
async solicitarAccesoAdmin(perfilCompleto) {
    try {
        const uid = perfilCompleto.perfil.uid;
        const fecha = new Date().toISOString();

        // 1. Actualizamos solo la carpeta de administración
        await this.db.ref(`usuarios/${uid}/administracion`).update({
            estado: 'pendiente',
            fechaRegistro: fecha
        });

        // 2. Notificamos al Mando Central (lo que tú ves en tu panel)
        await this.db.ref(`solicitudes_pendientes/${uid}`).set({
            nombre: perfilCompleto.perfil.nombre,
            negocio: perfilCompleto.perfil.negocio,
            email: perfilCompleto.perfil.correo,
            uid: uid,
            fecha: fecha
        });

        console.log("🛰️ Solicitud enviada al Mando Central con éxito.");
        return true;
    } catch (error) {
        console.error("❌ Error al enviar solicitud:", error.message);
        return false;
        }
    }
}

// Encendemos el motor inmediatamente al cargar el script
Cloud.init();