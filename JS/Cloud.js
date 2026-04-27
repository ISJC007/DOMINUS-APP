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
    firebase.initializeApp(firebaseConfig);
    this.db = firebase.database();
    this.auth = firebase.auth();
    this.storage = firebase.storage();
    
    console.log("🚀 DOMINUS Cloud: Núcleo conectado.");

    this.auth.onAuthStateChanged(async (user) => {
        if (user) {
            this.userId = user.uid;
            console.log("💎 Sesión detectada en segundo plano:", user.email);

            // 🚩 ELIMINAMOS: purgarInterfaz() e iniciarCargaSistemas()
            // 🚩 ELIMINAMOS: Usuario.configurarSesion()
            
            // ¿Por qué? Porque iniciarDominus() ya hace esto de forma ordenada 
            // respetando los tiempos de la frase de bienvenida.
            
        } else {
            this.userId = null;
            // Solo mandamos a login si NO estamos ya en el proceso de inicio
            console.warn("☁️ Sin sesión activa.");
        }
    });
},

    /**
     * Inicia sesión en la "Caja Fuerte" de la nube
     */
async conectarACaja(email, password) {
    try {
        // 1. INTENTO DE AUTENTICACIÓN
        const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
        
        // 2. EXTRACCIÓN DEL UID ÚNICO
        this.userId = userCredential.user.uid;
        
        console.log("🔑 Acceso concedido al núcleo. UID:", this.userId);

        // 3. ACTUALIZACIÓN DE PRESENCIA (Opcional pero recomendado)
        // Al conectar, ya podemos dejar el primer rastro de que el usuario entró
        this.db.ref(`usuarios/${this.userId}/administracion/ultimaConexion`).set(new Date().toISOString());

        return this.userId;

    } catch (error) {
        // Manejo de errores amigable para el usuario
        let mensajeError = "Error de conexión";
        
        if (error.code === 'auth/wrong-password') mensajeError = "Contraseña incorrecta";
        if (error.code === 'auth/user-not-found') mensajeError = "Usuario no registrado";

        console.error("❌ Error de acceso a la nube:", mensajeError);
        notificar(mensajeError, 'error'); // Usando tu función de notificar
        
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
        // 1. Crear el usuario en Firebase Auth (Google genera un UID único)
        const userCredential = await this.auth.createUserWithEmailAndPassword(datos.correo, datos.pass);
        
        // 🔑 EL CAMBIO CLAVE: Usamos el UID de Firebase como Identidad Maestra
        // Esto asegura que Cloud.userId siempre coincida con la base de datos.
        const uidGoogle = userCredential.user.uid; 
        const idHardware = datos.idFinal; // Conservamos tu ID de hardware para seguridad
        
        this.userId = uidGoogle; 

        const ahora = new Date();
        const fechaCorte = new Date();
        fechaCorte.setDate(ahora.getDate() + 16); // 15 días + 1 de margen

        // 🛰️ CAPTURA DE METADATOS TÉCNICOS
        const metadatosEnriquecidos = {
            dispositivo: navigator.userAgent.includes("Android") ? "Android" : "PC/Browser",
            plataforma: navigator.platform,
            modelo: navigator.userAgentData?.brands[0]?.brand || "Dispositivo Estándar",
            idioma: navigator.language,
            resolucion: `${window.screen.width}x${window.screen.height}`,
            versionApp: "1.0.5",
            zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // 📦 ESTRUCTURA ORGANIZADA (El ID de Google manda, el Hardware acompaña)
        const perfilEstructurado = {
            perfil: {
                nombre: datos.nombre,
                apellido: datos.apellido || "",
                negocio: datos.negocio,
                usuario: datos.usuario,
                correo: datos.correo,
                telefono: datos.telefono || "Sin número",
                fotoPerfil: "https://cdn-icons-png.flaticon.com/512/6522/6522516.png",
                uid: uidGoogle,          // ID para la nube
                idHardware: idHardware   // ID para seguridad física
            },
            administracion: {
                estado: 'pendiente',
                licenciaActiva: true,
                fechaRegistro: ahora.toISOString(),
                fechaCorte: fechaCorte.toISOString(),
                fechaAprobacion: "" 
            },
            seguridad: {
                ultimaConexion: ahora.toISOString(),
                metadatos: metadatosEnriquecidos,
                centinela: {
                    alertaHora: false,
                    intentosPIN: 0
                }
            }
        };

        // 2. Guardar el Perfil Completo usando el UID de Google
        // Ahora la carpeta se llama igual que el usuario que Firebase reconoce
        await this.db.ref(`usuarios/${uidGoogle}`).set(perfilEstructurado);
        
        // 3. Crear acceso para el Admin (Mando Central)
        await this.db.ref(`solicitudes_pendientes/${uidGoogle}`).set({
            nombre: perfilEstructurado.perfil.nombre,
            negocio: perfilEstructurado.perfil.negocio,
            email: perfilEstructurado.perfil.correo,
            uid: uidGoogle,
            idHardware: idHardware,
            modelo: metadatosEnriquecidos.modelo,
            fecha: perfilEstructurado.administracion.fechaRegistro
        });

        console.log("🆕 Guerrero registrado en Firebase:", uidGoogle);
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
        
        // Configuración de prueba: 15 días de acceso total
        fechaCorte.setDate(hoy.getDate() + 15); 

        // 🛡️ ACTUALIZACIÓN DE ADMINISTRACIÓN
        // Usamos update para no tocar 'fechaRegistro' que ya existía
        await this.db.ref(`usuarios/${uid}/administracion`).update({
            estado: 'aprobado',
            fechaAprobacion: hoy.toISOString(),
            fechaCorte: fechaCorte.toISOString(),
            licenciaActiva: true,
            tipoCuenta: 'trial' // Para saber que es un usuario en prueba
        });

        // 🧹 LIMPIEZA DEL MANDO CENTRAL
        // Eliminamos la solicitud de la lista de espera para mantener el orden
        await this.db.ref(`solicitudes_pendientes/${uid}`).remove();

        // ✉️ OPCIONAL: Dejar un mensaje de bienvenida en la nube
        await this.db.ref(`usuarios/${uid}/comunicacion/mensajeDirecto`).set({
            texto: "¡Bienvenido a DOMINUS! Tu ecosistema ha sido activado. Tienes 15 días de prueba total.",
            fecha: hoy.toISOString(),
            leido: false
        });

        console.log(`🔓 Acceso concedido al UID: ${uid}. Ecosistema en marcha.`);
        return true;
    } catch (error) {
        console.error("❌ Error crítico en aprobación manual:", error.message);
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
 /**
 * Sincroniza datos operativos (Inventario, Ventas, Clientes) con la nube.
 */
respaldarDatos(clave, datos) {
    // 1. Verificación de conexión (Silenciosa para no saturar la consola)
    if (!navigator.onLine) return;

    // 2. Verificación de identidad
    const uid = this.userId || (typeof Usuario !== 'undefined' && Usuario.datos?.perfil?.uid);
    if (!uid) {
        console.warn(`⚠️ Error de respaldo: Sin UID para '${clave}'.`);
        return;
    }

    // 3. Envío organizado a la Nube
    // RUTA: usuarios / UID / operatividad / nombre_del_dato
    // USAMOS update() en lugar de set() para las carpetas raíz si es posible, 
    // pero para arrays de datos completos, set() está bien.
    this.db.ref(`usuarios/${uid}/operatividad/${clave}`).set(datos)
        .then(() => {
            // Guardamos la fecha de la última sincronización exitosa localmente
            Persistencia.guardar(`last_sync_${clave}`, new Date().toISOString());
            console.log(`💎 DOMINUS Cloud: '${clave}' sincronizado.`);
        })
        .catch(error => {
            if (error.message.includes("permission_denied")) {
                console.error("🚫 Bloqueo de escritura: Licencia o permisos inválidos.");
                if (typeof notificar === "function") {
                    notificar("Sincronización bloqueada: Verifica tu suscripción", "error");
                }
            } else {
                console.error(`❌ Error en ${clave}:`, error.message);
            }
        });
},

/**
 * Recupera datos específicos desde la nube para restaurar el ecosistema local.
 * @param {string} clave - La categoría a descargar (ej: 'inventario', 'ventas')
 * @returns {Promise<any|null>} - Los datos recuperados o null si no hay nada.
 */
async descargarRespaldo(clave) {
    // 1. Verificación de seguridad básica
    if (!navigator.onLine) {
        console.warn("🌐 No puedes descargar respaldos sin conexión.");
        return null;
    }

    const uid = this.userId || (typeof Usuario !== 'undefined' && Usuario.datos?.perfil?.uid);
    if (!uid) {
        console.error("⚠️ Error de descarga: Identidad del guerrero no encontrada.");
        return null;
    }

    try {
        console.log(`📡 DOMINUS Cloud: Solicitando '${clave}' al servidor...`);
        
        // 2. Consulta a la ruta de operatividad
        const snapshot = await this.db.ref(`usuarios/${uid}/operatividad/${clave}`).once('value');
        const datos = snapshot.val();

        if (datos) {
            console.log(`✅ '${clave}' recuperado con éxito.`);
            
            // 3. Persistencia Inmediata
            // Al bajarlo de la nube, lo guardamos en el teléfono para que ya esté disponible offline
            const prefijoLocal = (clave === 'ventas') ? 'dom_ventas' : 
                                 (clave === 'inventario') ? 'dom_inventario' : 
                                 `dom_${clave}`;
                                 
            Persistencia.guardar(prefijoLocal, datos);
            return datos;
        } else {
            console.info(`ℹ️ No se encontraron respaldos para '${clave}' en la nube.`);
            return null;
        }

    } catch (error) {
        console.error(`❌ Fallo al descargar ${clave}:`, error.message);
        return null;
    }
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
        // Aseguramos la ruta del UID según la nueva estructura
        const uid = perfilCompleto.perfil?.uid || perfilCompleto.uid;
        const fecha = new Date().toISOString();

        if (!uid) throw new Error("UID no encontrado en el perfil");

        // 1. Actualizamos la carpeta de administración del usuario
        // Usamos update para no borrar otros datos que puedan existir
        await this.db.ref(`usuarios/${uid}/administracion`).update({
            estado: 'pendiente',
            fechaRegistro: fecha,
            rol: 'vendedor_junior' // Ejemplo: asignas un rol base por defecto
        });

        // 2. Notificamos al Mando Central
        // Aquí guardamos solo lo necesario para que tu panel de Admin vuele
        await this.db.ref(`solicitudes_pendientes/${uid}`).set({
            nombre: perfilCompleto.perfil?.nombre || "Sin nombre",
            negocio: perfilCompleto.perfil?.negocio || "Sin negocio",
            email: perfilCompleto.perfil?.correo || "Sin correo",
            uid: uid,
            fecha: fecha,
            modelo: perfilCompleto.metadatos?.modelo || "Desconocido" // Para saber qué teléfono usan
        });

        console.log("🛰️ Solicitud enviada al Mando Central. Esperando aprobación.");
        return true;
    } catch (error) {
        console.error("❌ Error en el salto al Mando Central:", error.message);
        return false;
    }
}
}

// Encendemos el motor inmediatamente al cargar el script
Cloud.init();