/**
 * DOMINUS - Herramientas de Interfaz
 * Modo Inmersivo Global (Cualquier parte de la pantalla)
 */
const Herramientas = {
    tiempoPresion: null,
    header: null,
    bloqueado: false,

    init: function() {
        this.header = document.querySelector('.main-header');
        
        // Configuramos el evento en el documento completo
        this.configurarModoInmersivo();
        this.forzarModoOscuro();
    },

    forzarModoOscuro: function() {
        if (typeof Controlador !== 'undefined' && Controlador.toggleDarkMode) {
            Controlador.toggleDarkMode(true);
        }
    },

    configurarModoInmersivo: function() {
        // Al usar 'document', escuchamos en TODA la pantalla
        const iniciar = (e) => {
            // Evitamos que se active si estás presionando un botón o un input
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'A') {
                return;
            }

            this.tiempoPresion = setTimeout(() => {
                this.bloqueado = !this.bloqueado;

                if (this.bloqueado) {
                    this.header.classList.add('hidden');
                    console.log("DOMINUS - Modo Inmersivo: ON");
                } else {
                    this.header.classList.remove('hidden');
                    console.log("DOMINUS - Modo Inmersivo: OFF");
                }

                if (navigator.vibrate) navigator.vibrate(50);
            }, 800);
        };

        const cancelar = () => clearTimeout(this.tiempoPresion);

        // Eventos Globales
        document.addEventListener('touchstart', iniciar, { passive: true });
        document.addEventListener('touchend', cancelar);
        document.addEventListener('mousedown', iniciar);
        document.addEventListener('mouseup', cancelar);
    }
};

document.addEventListener("DOMContentLoaded", () => Herramientas.init());