const Persistencia = {
    guardar(clave, datos) { localStorage.setItem(clave, JSON.stringify(datos)); },
    cargar(clave) { return JSON.parse(localStorage.getItem(clave)) || null; }
};