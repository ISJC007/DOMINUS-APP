const Conversor = {
    tasaActual: 600,

    init() {
        const guardada = Persistencia.cargar('dom_tasa');
        if (guardada) {
            this.tasaActual = parseFloat(guardada);
        }
    },

    setTasa(valor) {
        const num = parseFloat(valor);
        if (!isNaN(num) && num > 0) {
            this.tasaActual = num;
            Persistencia.guardar('dom_tasa', this.tasaActual);
            // Esto asegura que el dashboard se actualice apenas cambies la tasa
            if (typeof Interfaz !== 'undefined') {
                Interfaz.actualizarDashboard();
            }
        }
    }
};
// Inicialización inmediata
Conversor.init();