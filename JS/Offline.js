const Persistencia = {
    guardar(clave, datos) {
        localStorage.setItem(clave, JSON.stringify(datos));
    },
    cargar(clave) {
        const datos = localStorage.getItem(clave);
        // Filtramos si es null O si es el string "undefined" por error de guardado previo
        if (!datos || datos === "undefined") {
            return null;
        }
        return JSON.parse(datos);
    }
};