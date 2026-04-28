const Centinela = {
    async verificarIntegridad() {
        const ahora = Date.now();
        const datosLocales = Persistencia.cargar('dom_usuario_local') || {};
        const uid = datosLocales.uid || Persistencia.cargar('dom_id_unico');
        const ultimaConexion = Persistencia.cargar('dom_last_sync') || ahora;

        // 0. VERIFICACIÓN DE CUARENTENA (Si ya fue marcado, no entra)
        if (Persistencia.cargar('dom_bloqueo_seguridad')) {
            this.ejecutarBloqueoCritico("Acceso restringido por seguridad.");
            return false;
        }

        // 1. TRAMPA DE HORA (Anti-manipulación de cuotas o fechas)
        if (ahora < ultimaConexion - 60000) { // Margen de 1 min por si acaso
            console.error("🚨 Manipulación de tiempo detectada.");
            await this.reportarFraude(uid, "alertaHora");
            this.ejecutarBloqueoCritico("Error de sincronización de tiempo.");
            return false;
        }

        // 2. TRAMPA DE OFFLINE EXTENDIDO
        const limiteOffline = 3 * 24 * 60 * 60 * 1000; // 3 días
        if (ahora - ultimaConexion > limiteOffline) {
            if (!navigator.onLine) {
                alert("DOMINUS requiere conexión para validar licencia (Máximo 3 días offline).");
                return false;
            }
        }

        // 3. TRAMPA DE IDENTIDAD Y DISPOSITIVO (Multicuenta)
        if (navigator.onLine && uid) {
            try {
                // Consultamos directamente la rama de seguridad en la nube
                const snap = await Cloud.db.ref(`usuarios/${uid}/seguridad`).once('value');
                const seguridadNube = snap.val() || {};

                // A) ¿El administrador lo bloqueó desde la nube?
                if (seguridadNube.bloqueado) {
                    this.ejecutarBloqueoCritico("Tu cuenta ha sido inhabilitada por el administrador.");
                    return false;
                }

                // B) ¿El ID del dispositivo cambió? (Vinculación estricta)
                // Aquí comparamos contra un 'idHardware' que podrías guardar al registrar
                if (seguridadNube.dispositivoActual && seguridadNube.dispositivoActual !== uid) {
                    await this.reportarFraude(uid, "intentoMultidispositivo");
                    alert("Esta cuenta está vinculada a otro terminal.");
                    return false;
                }

                // Si todo está bien, actualizamos el marcador de tiempo
                Persistencia.guardar('dom_last_sync', ahora);
                
            } catch (e) {
                console.warn("Centinela: No se pudo validar con la nube, operando en modo preventivo.");
            }
        }

        return true;
    },

    async reportarFraude(uid, tipo) {
        if (!uid || !navigator.onLine) return;
        const reporte = {
            tipo: tipo,
            fecha: new Date().toISOString(),
            dispositivo: navigator.userAgent
        };
        // Grabamos el rastro en la nube
        await Cloud.db.ref(`usuarios/${uid}/historial_seguridad`).push(reporte);
        // Marcamos bloqueo local inmediato
        Persistencia.guardar('dom_bloqueo_seguridad', true);
    },

    ejecutarBloqueoCritico(mensaje) {
        notificar(mensaje, "error");
        Persistencia.guardar('dom_bloqueo_seguridad', true);
        
        // UI de bloqueo: tapamos todo el sistema
        setTimeout(() => {
            document.body.innerHTML = `
                <div style="height:100vh; background:#000; color:red; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:20px; font-family:monospace;">
                    <h1 style="font-size:3rem;">🚫 SISTEMA BLOQUEADO</h1>
                    <p style="color:#eee;">${mensaje}</p>
                    <p style="margin-top:20px; color:#555;">Contacta al Maestro Dominus para restaurar el acceso.</p>
                </div>
            `;
        }, 1000);
    },

    async verificarOrdenesRemotas(uid) {
        if (!navigator.onLine) return;

        const snap = await Cloud.db.ref(`usuarios/${uid}/seguridad/orden_remota`).once('value');
        const orden = snap.val();

        if (orden === 'ELIMINAR_TODO') {
            this.ejecutarAutodestruccion();
        }
    },

    ejecutarAutodestruccion() {
        console.warn("🧨 Orden de limpieza remota ejecutada.");
        // Borramos TODO el rastro local
        Persistencia.limpiarTodo(); 
        localStorage.clear();
        
        document.body.innerHTML = `
            <div style="height:100vh; background:#111; color:#ff4444; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:sans-serif;">
                <h2>⚠️ LICENCIA EXPIRADA O DISPOSITIVO BLOQUEADO</h2>
                <p>Los datos locales han sido protegidos y eliminados.</p>
                <button onclick="location.reload()" style="margin-top:20px; padding:10px 20px; background:#ff4444; color:white; border:none; border-radius:5px;">Reintentar Conexión</button>
            </div>
        `;
    },

    // 5. NUEVO: Anti-Inspección (Detección de Eruda/DevTools abierto)
    vigilarConsola() {
        // Un pequeño truco para detectar si intentan depurar el código
        const start = Date.now();
        debugger; 
        const end = Date.now();
        if (end - start > 100) {
            console.warn("🕵️ Depuración detectada. El Centinela te está observando.");
        }
    }

};