const Inventario = {
    activo: true,
    productos: [],

    init() {
        this.productos = Persistencia.cargar('dom_inventario') || [];
        const config = Persistencia.cargar('dom_config') || { invActivo: false };
        this.activo = config.invActivo;
    },

    guardar(nombre, cantidad, precio, unidad = 'Und', tallas = null) {
        const nombreMin = nombre.trim().toLowerCase();
        const index = this.productos.findIndex(p => p.nombre.toLowerCase() === nombreMin);
        const precioFinal = precio === "" || precio === null ? 0 : parseFloat(precio);

        if (index !== -1) {
            this.productos[index].cantidad = parseFloat(cantidad);
            this.productos[index].precio = precioFinal;
            this.productos[index].unidad = unidad;
            this.productos[index].tallas = tallas; // Se actualizan las tallas si existen
        } else {
            this.productos.push({
                id: Date.now(),
                nombre: nombre.trim(),
                cantidad: parseFloat(cantidad),
                precio: precioFinal,
                unidad: unidad,
                tallas: tallas // Se guardan las tallas iniciales
            });
        }
        Persistencia.guardar('dom_inventario', this.productos);
    },

  descontar(nombre, cant, tallaElegida = null) {
        if (!this.activo) return true; 

        const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombre.trim().toLowerCase());
        
        if (p) {
            // --- LOGICA DE TALLAS / PESOS / LÍQUIDOS ---
            if (p.tallas && tallaElegida) {
                
                // 1. Manejo de Peso, Líquidos y Pacas (Tu lógica de flexibilidad)
                if (p.tallas['Manual'] !== undefined) {
                    if (p.tallas['Manual'] < cant) {
                        alert(`⚠️ Cantidad insuficiente. Disponible: ${p.tallas['Manual']} ${p.unidad}`);
                        return false;
                    }
                    p.tallas['Manual'] -= cant;
                } 
                
                // 2. Manejo de Calzado y Ropa (Incluyendo tallas especiales como la 32)
                else {
                    // Mantenemos tu validación original exacta:
                    if (!p.tallas[tallaElegida] || p.tallas[tallaElegida] < cant) {
                        alert(`⚠️ No hay stock de la Talla ${tallaElegida}`);
                        return false;
                    }
                    p.tallas[tallaElegida] -= cant; // Descuenta de la talla específica
                }
            }
            
            // --- VALIDACIÓN DE STOCK GENERAL (Tu código original intacto) ---
            if (p.cantidad < cant) {
                alert(`⚠️ Stock insuficiente de "${p.nombre}". Quedan: ${p.cantidad} ${p.unidad || 'Und'}`);
                return false; 
            }
            
            p.cantidad -= cant; // Descuenta del total general
            Persistencia.guardar('dom_inventario', this.productos);
            return true; 
        }
        
        // Si no encuentra el producto en el inventario, permite la venta (Funcionalidad sobre optimización)
        return true; 
    },

    eliminar(id) {
        this.productos = this.productos.filter(p => p.id !== Number(id));
        Persistencia.guardar('dom_inventario', this.productos);
    }
};