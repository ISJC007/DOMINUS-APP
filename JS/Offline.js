const Persistencia = {
    guardar(clave, datos) { //este toma un objeto y le da un nombre para luego guardarlo- funciona con inventario, ventas, creditos, etc
        localStorage.setItem(clave, JSON.stringify(datos));
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