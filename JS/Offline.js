const Persistencia = {
    guardar(clave, datos) { //este toma un objeto y le da un nombre para luego guardarlo- funciona con inventario, ventas, creditos, etc
        localStorage.setItem(clave, JSON.stringify(datos));
    }, 
    cargar(clave) { //saca los datos que almacena la funcion guardar
        const datos = localStorage.getItem(clave);
        if (!datos || datos === "undefined") {
            return null;
        }
        return JSON.parse(datos);
    }
};