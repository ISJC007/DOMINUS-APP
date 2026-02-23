// JS/Servicios.js
const Servicios = {
    urlTasa: "https://ve.dolarapi.com/v1/dolares/oficial",

    async obtenerTasaBCV() {
        try {
            const respuesta = await fetch(this.urlTasa);
            const datos = await respuesta.json();
            
            if (datos && datos.promedio) {
                // Redondeamos a 2 decimales antes de enviarlo
                const tasaLimpia = Number(datos.promedio.toFixed(2));
                return tasaLimpia;
            }
            return null;
        } catch (error) {
            console.error("❌ Error API:", error);
            return null;
        }
    }
};