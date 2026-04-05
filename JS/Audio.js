const DominusAudio = {
    rutas: {
        // Efectos de sonido
        add: 'AUDIO/add.mp3',
        exito: 'AUDIO/success.mp3', // El "Cash"
        error: 'AUDIO/error.mp3',
        scan: 'AUDIO/scanner.mp3',

        // Saludos de Bella (Horario)
        dia: 'AUDIO/bienvenida_dia.mp3',
        tarde: 'AUDIO/bienvenida_tarde.mp3',
        noche: 'AUDIO/bienvenida_noche.mp3',

        // Notificaciones Especiales de Bella
        resumen: 'AUDIO/resumen_ventas.mp3',
        stockBajo: 'AUDIO/stock_bajo.mp3',
        sync: 'AUDIO/base_datos.mp3'
    },

    // Función inteligente para el saludo inicial
    saludarSegunHora: function() {
        const hora = new Date().getHours();
        let clave = 'dia'; // Por defecto

        if (hora >= 12 && hora < 18) clave = 'tarde';
        if (hora >= 18 || hora < 5) clave = 'noche';

        this.play(clave);
    },

    play: function(tipo) {
        const ruta = this.rutas[tipo];
        if (!ruta) return;
        const sonido = new Audio(ruta);
        sonido.play().catch(err => console.log("Audio en espera de interacción."));
    }
};