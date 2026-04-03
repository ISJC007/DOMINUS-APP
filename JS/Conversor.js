// JS/Conversor.js

const Conversor = {
    tasaActual: 405.35,

    async init() { 
        // 1. Carga inmediata del teléfono (Seguridad Offline)
        const guardada = Persistencia.cargar('dom_tasa');
        if (guardada) {
            this.tasaActual = parseFloat(guardada);
        }

        // 2. Intentamos buscar la tasa en internet usando nuestro Servicio
        const tasaInternet = await Servicios.obtenerTasaBCV();

        if (tasaInternet) {
            if (tasaInternet !== this.tasaActual) {
                notificar(`Tasa BCV detectada: ${tasaInternet}`, 'exito');
                this.setTasa(tasaInternet);
            } else {
                console.log("✅ La tasa ya está actualizada con el BCV.");
            }
        } else {
            notificar("Modo Offline: Usando tasa guardada", "stock");
        }
    },

    setTasa(valor) { 
        const num = Number(parseFloat(valor).toFixed(2)); 
        
        if (isNaN(num) || num <= 0) return;

        const ventasHoy = Persistencia.cargar('dom_ventas') || [];
        
        // 💡 Lógica de negocio: Verificar si hay ventas y si la tasa cambia
        if (ventasHoy.length > 0 && num !== this.tasaActual) {
            
            // 🚀 INTEGRACIÓN: Usando confirmarAccion personalizado
            // Asumimos que esta función está en Controlador o Interfaz
            const ejecutor = (typeof Controlador !== 'undefined' && Controlador.confirmarAccion) ? Controlador : Interfaz;

            ejecutor.confirmarAccion(
                "⚠️ ¿Cambiar Tasa?",
                `Ya registraste ${ventasHoy.length} ventas hoy. Cambiar la tasa ahora hará que los montos en el cierre no coincidan perfectamente.`,
                () => {
                    // --- ACCIÓN SI CONFIRMAN ---
                    this.finalizarActualizacionTasa(num);
                },
                () => {
                    // --- ACCIÓN SI CANCELAN ---
                    // 🚨 CORRECCIÓN: Revertimos el valor del input visualmente
                    const inputTasa = document.getElementById('tasa-global');
                    if (inputTasa) inputTasa.value = this.tasaActual;
                    console.log("🚫 Cambio de tasa abortado por el usuario.");
                },
                "Sí, cambiar",  // Texto confirmar
                "Cancelar",     // Texto cancelar
                true            // esPeligroso = true (Rojo)
            );

        } else {
            // --- ACCIÓN DIRECTA (si no hay ventas o es la misma tasa) ---
            this.finalizarActualizacionTasa(num);
        }
    },

    // 🛠️ Función interna para persistir y actualizar la vista
    finalizarActualizacionTasa(nuevoValor) {
        this.tasaActual = nuevoValor;
        Persistencia.guardar('dom_tasa', this.tasaActual);
        
        if (typeof Interfaz !== 'undefined') {
            Interfaz.actualizarDashboard();
        }
        
        console.log("✅ Tasa actualizada con éxito: " + this.tasaActual);
        if (typeof notificar === 'function') notificar("Tasa actualizada", "exito");
    }
};

// 🕒 Asegurar que el DOM exista antes de iniciar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Conversor.init());
} else {
    
    Conversor.init();
}