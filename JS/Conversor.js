const Conversor = {
    tasaActual: 600,
    actualizarTasa(valor) { 
        this.tasaActual = parseFloat(valor) || 1; 
        actualizarDashboard(); // Esto hará que todo el historial cambie visualmente
    }
};