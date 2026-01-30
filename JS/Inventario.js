const Inventario = {
    activo: true,
    productos: [],

    init() {
        this.productos = Persistencia.cargar('dom_inventario') || [];
        const config = Persistencia.cargar('dom_config');
        if (config === null) {
            this.activo = true;
            Persistencia.guardar('dom_config', { invActivo: true });
        } else {
            this.activo = config.invActivo;
        }
    },

    guardar(nombre, cantidad, precio, unidad = 'Und', tallas = null) {
        const nombreMin = nombre.trim().toLowerCase();
        const index = this.productos.findIndex(p => p.nombre.toLowerCase() === nombreMin);
        const precioFinal = precio === "" || precio === null ? 0 : parseFloat(precio);

        if (index !== -1) {
            this.productos[index].cantidad = parseFloat(cantidad);
            this.productos[index].precio = precioFinal;
            this.productos[index].unidad = unidad;
            this.productos[index].tallas = tallas;
        } else {
            this.productos.push({
                id: Date.now(),
                nombre: nombre.trim(),
                cantidad: parseFloat(cantidad),
                precio: precioFinal,
                unidad: unidad,
                tallas: tallas
            });
        }
        Persistencia.guardar('dom_inventario', this.productos);
        // CAMBIO: Notificación estética al guardar
        notificar("📦 Producto guardado en stock", "stock");
    },

    descontar(nombre, cant, tallaElegida = null) {
        if (!this.activo) return true; 

        const cantidadARestar = Number(cant);
        const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombre.trim().toLowerCase());
        
        if (p) {
            if (p.tallas && tallaElegida) {
                if (p.tallas['Manual'] !== undefined) {
                    if (Number(p.tallas['Manual']) < cantidadARestar) {
                        // CAMBIO: Notificación en lugar de alert
                        notificar(`⚠️ Cantidad insuficiente: ${p.tallas['Manual']} ${p.unidad}`, "error");
                        return false;
                    }
                    p.tallas['Manual'] = Number(p.tallas['Manual']) - cantidadARestar;
                } 
                else {
                    if (!p.tallas[tallaElegida] || Number(p.tallas[tallaElegida]) < cantidadARestar) {
                        // CAMBIO: Notificación en lugar de alert
                        notificar(`⚠️ No hay stock de Talla ${tallaElegida}`, "error");
                        return false;
                    }
                    p.tallas[tallaElegida] = Number(p.tallas[tallaElegida]) - cantidadARestar;
                }
            }
            
            if (Number(p.cantidad) < cantidadARestar) {
                // CAMBIO: Notificación en lugar de alert
                notificar(`⚠️ Stock insuficiente de "${p.nombre}"`, "error");
                return false; 
            }
            
            p.cantidad = Number(p.cantidad) - cantidadARestar; 
            
            Persistencia.guardar('dom_inventario', this.productos);
            
            if (typeof Interfaz !== 'undefined') {
                Interfaz.renderInventario();
            }
            
            return true; 
        }
        
        return true; 
    },

    eliminar(id) {
        this.productos = this.productos.filter(p => p.id !== Number(id));
        Persistencia.guardar('dom_inventario', this.productos);
        notificar("Producto eliminado del inventario", "error");
    }
};