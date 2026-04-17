const Persistencia = {
    guardar(clave, datos) { 
        try {
            const stringified = JSON.stringify(datos);
            localStorage.setItem(clave, stringified);

            if (window.Cloud && Cloud.userId) {
                Cloud.respaldardatos(clave, datos);
            }
        } catch (e) {
            console.error("❌ Error de almacenamiento: LocalStorage lleno o corrupto.", e);
            notificar("Espacio insuficiente en el dispositivo", "error");
        }
    }, 
    
    cargar(clave) {
        try {
            const datos = localStorage.getItem(clave);
            if (!datos || datos === "undefined" || datos === "null") return null;
            return JSON.parse(datos);
        } catch (error) {
            console.error(`❌ Error al recuperar ${clave}:`, error);
            return null;
        }
    }
};