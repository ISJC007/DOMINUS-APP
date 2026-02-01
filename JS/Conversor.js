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
        if (isNaN(num) || num <= 0) return;

        const ventasHoy = Persistencia.cargar('dom_ventas') || [];
        
        // INTEGRACIÓN: Si hay ventas y la tasa es distinta, lanzamos el modal estético
        if (ventasHoy.length > 0 && num !== this.tasaActual) {
            
            const overlay = document.createElement('div');
            overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";
            
            overlay.innerHTML = `
                <div class="card glass" style="max-width:400px; text-align:center; border:1px solid var(--primary); padding:25px;">
                    <h3 style="color:var(--primary); margin-bottom:15px;">⚠️ ¿Cambiar Tasa?</h3>
                    <p style="font-size:0.9em; margin-bottom:20px; opacity:0.9;">
                        Ya registraste ventas hoy. Cambiar la tasa ahora hará que los montos en el cierre no coincidan perfectamente.
                    </p>
                    <div style="display:flex; gap:10px;">
                        <button id="btn-cancel-tasa" class="btn-main" style="background:#444; flex:1">Cancelar</button>
                        <button id="btn-conf-tasa" class="btn-main" style="flex:1">Confirmar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            document.getElementById('btn-cancel-tasa').onclick = () => {
                const inputTasa = document.getElementById('tasa-global');
                if (inputTasa) inputTasa.value = this.tasaActual;
                overlay.remove();
            };

            document.getElementById('btn-conf-tasa').onclick = () => {
                this.tasaActual = num;
                Persistencia.guardar('dom_tasa', this.tasaActual);
                if (typeof Interfaz !== 'undefined') Interfaz.actualizarDashboard();
                overlay.remove();
                if (typeof notificar === 'function') notificar("Tasa actualizada", "exito");
            };

        } else {
            // Cambio directo si no hay ventas o es la misma tasa
            this.tasaActual = num;
            Persistencia.guardar('dom_tasa', this.tasaActual);
            if (typeof Interfaz !== 'undefined') {
                Interfaz.actualizarDashboard();
            }
            console.log("Tasa actualizada con éxito: " + this.tasaActual);
        }
    }
};

// Inicialización inmediata
Conversor.init();