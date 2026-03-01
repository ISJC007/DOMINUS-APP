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
            // Si la tasa de internet es diferente a la que tenemos...
            if (tasaInternet !== this.tasaActual) {
                // Notificamos al usuario con tu función
                notificar(`Tasa BCV detectada: ${tasaInternet}`, 'exito');
                
                // Llamamos a setTasa. 
                // Si hay ventas, esta función abrirá el modal de confirmación.
                // Si NO hay ventas, la actualizará directamente.
                this.setTasa(tasaInternet);
            } else {
                // Si son iguales, solo avisamos que estamos al día
                console.log("✅ La tasa ya está actualizada con el BCV.");
            }
        } else {
            // Si la API falló (sin internet), avisamos que usamos la guardada
            notificar("Modo Offline: Usando tasa guardada", "stock");
        }
    },


setTasa(valor) { // actualiza la tasa del dia
    const num = Number(parseFloat(valor).toFixed(2)); 
    
    if (isNaN(num) || num <= 0) return;

    const ventasHoy = Persistencia.cargar('dom_ventas') || [];
    
    // 💡 Lógica de negocio: Verificar si hay ventas y si la tasa cambia
    if (ventasHoy.length > 0 && num !== this.tasaActual) {
        
        // 🚀 INTEGRACIÓN: Usando confirmarAccion personalizado
        Interfaz.confirmarAccion(
            "⚠️ ¿Cambiar Tasa?",
            `Ya registraste ${ventasHoy.length} ventas hoy. Cambiar la tasa ahora hará que los montos en el cierre no coincidan perfectamente.`,
            () => {
                // --- ACCIÓN SI CONFIRMAN ---
                this.tasaActual = num;
                Persistencia.guardar('dom_tasa', this.tasaActual);
                if (typeof Interfaz !== 'undefined') Interfaz.actualizarDashboard();
                if (typeof notificar === 'function') notificar("Tasa actualizada", "exito");
            },
            "Sí, cambiar",  // 👈 Texto confirmar
            "Cancelar",     // 👈 Texto cancelar
            true            // 👈 esPeligroso = true (Rojo, ya que afecta el cierre)
        );

        // 💡 Lógica extra: Si cancelan, revertir el input visualmente
        // Como confirmarAccion elimina el overlay automáticamente, necesitamos
        // asegurar que el input de tasa muestre el valor correcto si cancelan.
        document.getElementById('btn-abortar-' + Date.now()).onclick = () => {
             const inputTasa = document.getElementById('tasa-global');
             if (inputTasa) inputTasa.value = this.tasaActual;
        };

    } else {
        // --- ACCIÓN DIRECTA (si no hay ventas o es la misma tasa) ---
        this.tasaActual = num;
        Persistencia.guardar('dom_tasa', this.tasaActual);
        if (typeof Interfaz !== 'undefined') {
            Interfaz.actualizarDashboard();
        }
        console.log("Tasa actualizada con éxito: " + this.tasaActual);
        if (typeof notificar === 'function') notificar("Tasa actualizada", "exito");
    }
},

};

Conversor.init();