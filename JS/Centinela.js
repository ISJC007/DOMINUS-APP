const Centinela = {
    async verificarIntegridad() {
        const ahora = Date.now();
        const ultimaConexion = Persistencia.cargar('dom_last_sync') || ahora;
        const uid = Persistencia.cargar('dom_id_unico');

        // 1. TRAMPA DE HORA (Hacia atrás)
        if (ahora < ultimaConexion - 120000) { // Si el reloj retrocedió más de 2 min
            console.error("🚨 Manipulación de tiempo detectada.");
            this.reportarFraude(uid, "alertaHora");
            return false;
        }

        // 2. TRAMPA DE OFFLINE (Más de 3 días)
        const tresDias = 3 * 24 * 60 * 60 * 1000;
        if (ahora - ultimaConexion > tresDias && !navigator.onLine) {
            alert("Sincronización requerida. Conéctate a internet para seguir usando DOMINUS.");
            return false;
        }

        // 3. TRAMPA MULTICUENTA
        // Al conectar, verificamos si el UUID del tlf coincide con el de la nube
        if (navigator.onLine) {
            const perfilNube = await Cloud.obtenerPerfil(uid);
            if (perfilNube && perfilNube.idFinal !== uid) {
                this.reportarFraude(uid, "multicuenta");
                alert("Este usuario ya está activo en otro dispositivo.");
                return false;
            }
            Persistencia.guardar('dom_last_sync', ahora);
        }

        return true;
    },

    async reportarFraude(uid, tipo) {
        if (!navigator.onLine) return;
        // Escribimos en la rama de seguridad del usuario en Firebase
        await firebase.database().ref(`usuarios/${uid}/seguridad/${tipo}`).set(true);
        console.log("🚩 Fraude reportado al Maestro Dominus.");
    }
};