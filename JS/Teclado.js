const Teclado = {
    init() {
        document.addEventListener('keydown', (e) => this.manejadorGlobal(e));
        console.log("⌨️ Sistema de Teclado Vinculado a DOMINUS");
    },

manejadorGlobal(e) {
    // 0. BLOQUEO SI HAY MODALES O ESCRITURA
    const modalActivo = document.getElementById('modal-dinamico');
    const estaEscribiendo = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

    // 1. NAVEGACIÓN GLOBAL (Alt + 1...5 y Flechas)
    if (e.altKey) {
        const pestañas = ['dashboard', 'ventas', 'gastos', 'fiaos-list', 'inventario'];
        const seccionesNum = { 
            '1': 'dashboard', '2': 'ventas', '3': 'gastos', 
            '4': 'fiaos-list', '5': 'inventario' 
        };

        // --- NAVEGACIÓN CON FLECHAS (Alt + Flechas) ---
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            let actualIdx = pestañas.findIndex(p => {
                const el = document.getElementById(`view-${p}`);
                return el && !el.classList.contains('hidden');
            });

            if (actualIdx !== -1) {
                if (e.key === 'ArrowRight') {
                    actualIdx = (actualIdx + 1) % pestañas.length;
                } else {
                    actualIdx = (actualIdx - 1 + pestañas.length) % pestañas.length;
                }
                
                const nuevaSeccion = pestañas[actualIdx];
                if (typeof Interfaz !== 'undefined') Interfaz.show(nuevaSeccion);
                this.aplicarFocoAutomatico(nuevaSeccion); 
            }
            return;
        }

        // --- NAVEGACIÓN POR NÚMERO (Alt + 1...5) ---
        const destino = seccionesNum[e.key];
        if (destino) {
            e.preventDefault();
            if (typeof Interfaz !== 'undefined') Interfaz.show(destino);
            this.aplicarFocoAutomatico(destino); 
            return;
        }
    }

    // --- 🚀 ATAJOS MAESTROS (Solo si no está escribiendo) ---
    if (!estaEscribiendo && !modalActivo) {
        // C - CIERRE DE CAJA
        if (e.key.toLowerCase() === 'c') {
            e.preventDefault();
            if (typeof Controlador !== 'undefined' && Controlador.generarCierre) {
                Controlador.generarCierre();
            }
        }
        
        // F - ACTIVAR/DESACTIVAR FIAO
        if (e.key.toLowerCase() === 'f') {
            e.preventDefault();
            const checkFiao = document.getElementById('v-fiao-switch');
            if (checkFiao) {
                checkFiao.checked = !checkFiao.checked;
                checkFiao.dispatchEvent(new Event('change'));
                if (typeof notificar === 'function') {
                    notificar(checkFiao.checked ? "Modo Fiao: ACTIVADO" : "Modo Fiao: DESACTIVADO", "info");
                }
            }
        }
    }

    // 2. DETECCIÓN DE CONTEXTO
    if (this.visible('view-ventas')) {
        this.atajosVentas(e);
    } else if (this.visible('view-gastos')) {
        this.atajosGastos(e);
    } else if (this.visible('view-inventario')) {
        this.atajosInventario(e);
    }

    // 3. ATAJOS UNIVERSALES
    if (e.key === 'F2') {
        e.preventDefault();
        if (typeof Controlador !== 'undefined') {
            Controlador.ejecutarCobroFinal?.();
        }
    }
},

    // Función auxiliar para centralizar el foco en todas las entradas
    aplicarFocoAutomatico(seccion) {
        setTimeout(() => {
            switch (seccion) {
                case 'ventas':
                    this.enfocarYScroll('v-producto');
                    break;
                case 'gastos':
                    this.enfocarYScroll('g-desc');
                    break;
                case 'inventario':
                    this.enfocarYScroll('inv-nombre');
                    break;
                case 'fiaos-list':
                    // Si tienes un buscador de fiaos, podrías enfocarlo aquí
                    break;
            }
        }, 150);
    },
    // --- ATAJOS POR SECCIÓN ---

  // --- ATAJOS POR SECCIÓN ---

    atajosVentas(e) {
        const activo = document.activeElement.id;
        if (e.key === 'Tab') e.preventDefault();

        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) { // Retroceder con Shift + Enter
                if (activo === 'v-cliente') this.enfocarYScroll('v-metodo');
                else if (activo === 'v-metodo') this.enfocarYScroll('v-monto');
                else if (activo === 'v-monto') this.enfocarYScroll('v-cantidad');
                else if (activo === 'v-cantidad') this.enfocarYScroll('v-producto');
                return;
            }

            if (!this.validarInputActual()) return;

            switch (activo) {
                case 'v-producto': 
                    // Si el producto existe, procesarEscaneoVentaRapida ya disparó el sonido 'scan'
                    this.enfocarYScroll('v-cantidad'); 
                    break;
                case 'v-cantidad': this.enfocarYScroll('v-monto'); break;
                case 'v-monto':    this.enfocarYScroll('v-metodo'); break;
                case 'v-metodo':
                    const wrap = document.getElementById('wrapper-cliente');
                    if (wrap && !wrap.classList.contains('hidden')) {
                        this.enfocarYScroll('v-cliente');
                    } else {
                        this.intentarEjecutarVenta();
                    }
                    break;
                case 'v-cliente': this.intentarEjecutarVenta(); break;
            }
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            if (typeof Controlador !== 'undefined') Controlador.limpiarSeleccionVenta?.();
            this.enfocarYScroll('v-producto');
        }
    },

    atajosGastos(e) {
        const activo = document.activeElement.id;
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!this.validarInputActual()) return;

            if (activo === 'g-desc') this.enfocarYScroll('g-monto');
            else if (activo === 'g-monto') this.enfocarYScroll('g-moneda');
            else if (activo === 'g-moneda') {
                if (typeof Controlador !== 'undefined') {
                    Controlador.ejecutarGasto?.();
                    if (typeof notificar === 'function') notificar("Gasto registrado", "exito");
                }
                setTimeout(() => this.enfocarYScroll('g-desc'), 200);
            }
        }
    },

    atajosInventario(e) {
        const activo = document.activeElement.id;
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!this.validarInputActual()) return;

            if (activo === 'inv-nombre') this.enfocarYScroll('inv-cant');
            else if (activo === 'inv-cant') this.enfocarYScroll('inv-precio');
            else if (activo === 'inv-precio') this.enfocarYScroll('inv-unidad');
            else if (activo === 'inv-unidad') {
                if (typeof Controlador !== 'undefined') {
                    Controlador.guardarEnInventario?.();
                    // El audio de éxito se dispara dentro del controlador o aquí
                    if (typeof notificar === 'function') notificar("Inventario actualizado", "exito");
                }
                setTimeout(() => this.enfocarYScroll('inv-nombre'), 200);
            }
        }
    },

    // --- UTILIDADES ---

    visible(id) {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
    },

    validarInputActual() {
        const el = document.activeElement;
        if (el.tagName === 'INPUT' && !el.value.trim()) {
            this.errorVisual(el);
            return false;
        }
        return true;
    },

    intentarEjecutarVenta() {
        if (typeof Controlador !== 'undefined' && Controlador.ejecutarVenta) {
            Controlador.ejecutarVenta();
            setTimeout(() => {
                this.enfocarYScroll('v-producto');
                const p = document.getElementById('v-producto');
                if (p) p.value = "";
            }, 150);
        }
    },

    errorVisual(elemento) {
        elemento.style.border = "2px solid #ff4444";
        setTimeout(() => { elemento.style.border = "1px solid var(--primary)"; }, 1000);
        elemento.animate([
            { transform: 'translateX(0)' }, { transform: 'translateX(5px)' },
            { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }
        ], { duration: 200 });
    },

    enfocarYScroll(id) {
        const el = document.getElementById(id);
        if (el) {
            el.focus();
            if (el.tagName === 'INPUT') el.select();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};

window.addEventListener('load', () => Teclado.init());