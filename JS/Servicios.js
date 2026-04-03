// JS/Servicios.js
const Servicios = {
    urlTasa: "https://ve.dolarapi.com/v1/dolares/oficial",

    async obtenerTasaBCV() {
        try {
            console.log("📡 Intentando actualizar tasa desde el BCV...");
            const respuesta = await fetch(this.urlTasa);
            const datos = await respuesta.json();
            
            if (datos && datos.promedio) {
                const tasaLimpia = Number(datos.promedio.toFixed(2));
                
                // --- GUARDAR RESPALDO ---
                // Guardamos la tasa fresca para que esté disponible offline después
                localStorage.setItem('dom_tasa_respaldo', tasaLimpia);
                
                return tasaLimpia;
            }
        } catch (error) {
            console.warn("⚠️ Sin conexión al BCV. Buscando respaldo local...");
            
            // --- RECUPERAR RESPALDO ---
            // Intentamos sacar la última tasa guardada
            const tasaGuardada = localStorage.getItem('dom_tasa_respaldo');
            
            if (tasaGuardada) {
                console.log("📦 Usando tasa de respaldo: " + tasaGuardada);
                return Number(tasaGuardada);
            }
            
            // Si es la primera vez y no hay nada guardado, usamos un valor base
            // para que la app no se detenga (puedes ajustarlo según el día)
            return 50.00; 
        }
    }
};