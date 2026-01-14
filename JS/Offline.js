const Persistencia = {
    guardar(clave, datos) {
        localStorage.setItem(clave, JSON.stringify(datos));
    },
    cargar(clave) {
        const datos = localStorage.getItem(clave);
        return datos ? JSON.parse(datos) : null;
    }
};