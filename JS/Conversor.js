// JS/Conversor.js

const Conversor = {
    tasaActual: 405.35,

    async init() { 
        // 1. Carga inmediata (Seguridad Offline)
        const guardada = Persistencia.cargar('dom_tasa');
        if (guardada) {
            this.tasaActual = parseFloat(guardada) || 405.35;
        }

        // 2. Intento de actualización silenciosa
        try {
            const tasaInternet = await Servicios.obtenerTasaBCV();

            if (tasaInternet && tasaInternet !== this.tasaActual) {
                // Solo notificamos si el cambio es significativo (evita spam)
                this.finalizarActualizacionTasa(tasaInternet, true);
            } else {
                console.log("✅ Tasa sincronizada.");
            }
        } catch (e) {
            console.warn("⚠️ No se pudo conectar al BCV, usando caché.");
            if (typeof notificar === 'function') notificar("Modo Offline: Tasa guardada", "stock");
        }
    },

   setTasa(valor) { 
    const num = Number(parseFloat(valor).toFixed(2)); 
    
    // Si el valor no es válido, restauramos el input para no dejar datos erróneos
    if (isNaN(num) || num <= 0) {
        const inputTasa = document.getElementById('tasa-global');
        if (inputTasa) inputTasa.value = this.tasaActual;
        return;
    }

    const ventasHoy = Persistencia.cargar('dom_ventas') || [];
    
    // Si hay ventas, pedimos confirmación para no descuadrar el cierre
    if (ventasHoy.length > 0 && num !== this.tasaActual) {
        const ejecutor = (typeof Controlador !== 'undefined' && Controlador.confirmarAccion) ? Controlador : Interfaz;

        if (ejecutor && ejecutor.confirmarAccion) {
            ejecutor.confirmarAccion(
                "⚠️ ¿Cambiar Tasa?",
                `Ya registraste ${ventasHoy.length} ventas hoy. El cierre podría variar.`,
                () => {
                    this.finalizarActualizacionTasa(num);
                    // Quitamos el foco del input tras confirmar para que el atajo quede libre
                    document.activeElement.blur(); 
                },
                () => {
                    const inputTasa = document.getElementById('tasa-global');
                    if (inputTasa) {
                        inputTasa.value = this.tasaActual;
                        inputTasa.blur();
                    }
                },
                "Sí, cambiar", 
                "Cancelar", 
                true 
            );
        } else {
            this.finalizarActualizacionTasa(num);
            document.activeElement.blur();
        }
    } else {
        this.finalizarActualizacionTasa(num);
        // Feedback visual rápido de éxito
        if (typeof notificar === 'function') {
            notificar(`Tasa actualizada: ${num} Bs`, 'add');
        }
        document.activeElement.blur();
    }
},

    finalizarActualizacionTasa(nuevoValor, silencioso = false) {
        this.tasaActual = nuevoValor;
        Persistencia.guardar('dom_tasa', this.tasaActual);
        
        // 🛡️ BLINDAJE: Solo actualizamos el Dashboard si la Interfaz está lista
        // Esto evita el error de renderizado si el DOM aún no carga los colores
        if (typeof Interfaz !== 'undefined' && typeof Interfaz.actualizarDashboard === 'function') {
            try {
                Interfaz.actualizarDashboard();
            } catch (err) {
                console.error("❌ Error al refrescar Dashboard tras cambio de tasa:", err);
            }
        }
        
        if (!silencioso && typeof notificar === 'function') {
            notificar(`Tasa: ${this.tasaActual} Bs`, "add");
        }
    }
};

// 🕒 Inicialización segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Conversor.init());
} else {
    Conversor.init();
}