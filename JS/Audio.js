const DominusAudio = {
    sonidos: {
        add: new Audio('AUDIO/add.mp3'),
        db: new Audio('AUDIO/base_datos.mp3'),
        dia: new Audio('AUDIO/bienvenida_dia.mp3'),
        tarde: new Audio('AUDIO/bienvenida_tarde.mp3'),
        noche: new Audio('AUDIO/bienvenida_noche.mp3'),
        error: new Audio('AUDIO/error.mp3'),
        resumen: new Audio('AUDIO/resumen_ventas.mp3'),
        scan: new Audio('AUDIO/scanner.mp3'),
        success: new Audio('AUDIO/success.mp3')
    },

    play: function(nombre) {
        const sonido = this.sonidos[nombre];
        if (sonido) {
            sonido.currentTime = 0; // Reinicia para que pueda sonar seguido
            sonido.play().catch(e => console.log("Audio bloqueado por navegador", e));
        }
    },

    // 🧠 Lógica inteligente para saludos
    saludarSegunHora: function() {
        const ahora = new Date();
        const hora = ahora.getHours();
        const fechaHoy = ahora.toDateString(); // "Sun Apr 05 2026"
        
        // Revisamos si ya saludamos hoy
        const ultimoSaludo = localStorage.getItem('dom_ultimo_saludo');
        if (ultimoSaludo === fechaHoy) return; // Ya saludó hoy, silencio.

        if (hora >= 5 && hora < 12) {
            this.play('dia');
        } else if (hora >= 12 && hora < 18) {
            this.play('tarde');
        } else {
            this.play('noche');
        }

        // Guardamos que ya saludamos hoy
        localStorage.setItem('dom_ultimo_saludo', fechaHoy);
    }
};