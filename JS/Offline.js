const Persistencia = {
    guardar(clave, datos) { 
        // 1. Prioridad: Guardado Local (Inmediato y sin fallos)
        localStorage.setItem(clave, JSON.stringify(datos));

        // 2. Extensión: Respaldo en la Nube (Solo si hay sesión activa)
        // Usamos una verificación de seguridad para no romper el código
        if (window.Cloud && Cloud.userId) {
            Cloud.respaldardatos(clave, datos);
        }
    }, 
    
    cargar(clave) {
        try {
            const datos = localStorage.getItem(clave);
            if (!datos || datos === "undefined") return null;
            return JSON.parse(datos);
        } catch (error) {
            console.error(`❌ Error al recuperar ${clave}:`, error);
            return null;
        }
    }
};