const Inventario = {
    productos: [],

    init() {
        this.productos = Persistencia.cargar('dom_inventario') || [];
    },

    guardar(nombre, cantidad, precio) {
        const nombreMin = nombre.trim().toLowerCase();
        const index = this.productos.findIndex(p => p.nombre.toLowerCase() === nombreMin);
        
        if (index !== -1) {
            this.productos[index].cantidad = parseFloat(cantidad);
            this.productos[index].precio = parseFloat(precio);
        } else {
            this.productos.push({
                id: Date.now(),
                nombre: nombre.trim(),
                cantidad: parseFloat(cantidad),
                precio: parseFloat(precio)
            });
        }
        Persistencia.guardar('dom_inventario', this.productos);
    },

  // En Inventario.js
descontar(nombre, cant) {
    const config = Persistencia.cargar('dom_config') || { invActivo: false };
    if (!config.invActivo) return true; // Si el inv está apagado, la venta sigue

    const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombre.trim().toLowerCase());
    
    if (p) {
        if (p.cantidad < cant) {
            alert(`⚠️ Stock insuficiente de "${p.nombre}". Quedan: ${p.cantidad}`);
            return false; // No hay suficiente
        }
        p.cantidad -= cant;
        Persistencia.guardar('dom_inventario', this.productos);
        return true; // Descuento exitoso
    }
    return true; // Si el producto no está en inventario, permitimos la venta (uso general)
},

    eliminar(id) {
        this.productos = this.productos.filter(p => p.id !== Number(id));
        Persistencia.guardar('dom_inventario', this.productos);
    }
};