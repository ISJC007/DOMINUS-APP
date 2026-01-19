const Inventario = {
    activo: true,
    productos: [],

    init() {
        this.productos = Persistencia.cargar('dom_inventario') || [];
        const config = Persistencia.cargar('dom_config');
        if (config === null) {
        this.activo = true;
        // Guardamos de una vez para que 'dom_config' ya no sea null
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

    const cantidadARestar = Number(cant);
    // [QUIRÚRGICO] Usamos trim() y aseguramos que buscamos en la lista cargada
    const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombre.trim().toLowerCase());
    
    if (p) {
        // --- LOGICA DE TALLAS / PESOS / LÍQUIDOS ---
        if (p.tallas && tallaElegida) {
            
            // 1. Manejo de Peso, Líquidos y Pacas
            if (p.tallas['Manual'] !== undefined) {
                if (Number(p.tallas['Manual']) < cantidadARestar) {
                    alert(`⚠️ Cantidad insuficiente. Disponible: ${p.tallas['Manual']} ${p.unidad}`);
                    return false;
                }
                p.tallas['Manual'] = Number(p.tallas['Manual']) - cantidadARestar;
            } 
            
            // 2. Manejo de Calzado y Ropa
            else {
                if (!p.tallas[tallaElegida] || Number(p.tallas[tallaElegida]) < cantidadARestar) {
                    alert(`⚠️ No hay stock de la Talla ${tallaElegida}`);
                    return false;
                }
                p.tallas[tallaElegida] = Number(p.tallas[tallaElegida]) - cantidadARestar;
            }
        }
        
        // --- VALIDACIÓN DE STOCK GENERAL ---
        if (Number(p.cantidad) < cantidadARestar) {
            alert(`⚠️ Stock insuficiente de "${p.nombre}". Quedan: ${p.cantidad} ${p.unidad || 'Und'}`);
            return false; 
        }
        
        p.cantidad = Number(p.cantidad) - cantidadARestar; 
        
        // [QUIRÚRGICO] Guardamos y forzamos el renderizado para que tu papá lo vea bajar
        Persistencia.guardar('dom_inventario', this.productos);
        
        if (typeof Interfaz !== 'undefined') {
            Interfaz.renderInventario(); // Actualiza la tabla de inventario
        }
        
        return true; 
    }
    
    return true; 
},

    eliminar(id) {
        this.productos = this.productos.filter(p => p.id !== Number(id));
        Persistencia.guardar('dom_inventario', this.productos);
    }
};