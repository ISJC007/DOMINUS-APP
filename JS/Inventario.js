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

guardar(nombre, cantidad, precio, unidad = 'Und', tallas = null) { //recibe los datos del formulario
    if (!nombre) return; 
    
    const nombreMin = nombre.trim().toLowerCase();
    const index = this.productos.findIndex(p => p.nombre.toLowerCase() === nombreMin);
    const precioFinal = (precio === "" || precio === null) ? 0 : parseFloat(precio);
    const nuevaCant = parseFloat(cantidad) || 0;

    if (index !== -1) {
        this.productos[index].cantidad += nuevaCant;
        this.productos[index].precio = precioFinal;
        this.productos[index].unidad = unidad;
        
        if (tallas) {
            if (!this.productos[index].tallas) this.productos[index].tallas = {};
            Object.keys(tallas).forEach(t => {
                const cantTallaRecarga = parseFloat(tallas[t]) || 0;
                this.productos[index].tallas[t] = (this.productos[index].tallas[t] || 0) + cantTallaRecarga;
            });
        }
        notificar(`📦 Stock recargado: +${nuevaCant} ${unidad}`, "stock");
    } else {
        this.productos.push({
            id: Date.now(),
            nombre: nombre.trim(),
            cantidad: nuevaCant,
            precio: precioFinal,
            unidad: unidad,
            tallas: tallas || {}
        });
        notificar("📦 Nuevo producto en stock", "stock");
    }
    
    this.sincronizar(); 
},

sincronizar() {
    this.productos = this.productos.filter(p => p && p.nombre);

    this.productos.forEach(p => {
        const umbral = (p.unidad === 'Kg' || p.unidad === 'Lts') ? 1.5 : 2;
        
        if (p.cantidad <= 0) {
            notificar(`🚫 ${p.nombre} AGOTADO`, "error");
        } else if (p.cantidad <= umbral) {
            notificar(`⚠️ Poco stock de ${p.nombre}: ${p.cantidad}${p.unidad}`, "error");
        }
    });

    Persistencia.guardar('dom_inventario', this.productos);

    if (typeof Interfaz !== 'undefined' && Interfaz.renderInventario) {
        Interfaz.renderInventario();
    }
},

    descontar(nombre, cant, tallaElegida = null) { //Es el guardián de las ventas. Cuando vendes algo, esta función busca el producto y baja el número. Si es calzado, busca la talla específica y le resta a ese número.
        //Conexión: * Ventas.js: Es llamada cada vez que se registra una venta.

//Función notificar(): Si intentas vender más de lo que hay, dispara el error "Stock insuficiente".
        if (!this.activo) return true; 

        const cantidadARestar = Number(cant);
        const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombre.trim().toLowerCase());
        
        if (p) {
            if (p.tallas && tallaElegida) {
                if (p.tallas['Manual'] !== undefined) {
                    if (Number(p.tallas['Manual']) < cantidadARestar) {
                        notificar(`⚠️ Cantidad insuficiente: ${p.tallas['Manual']} ${p.unidad}`, "error");
                        return false;
                    }
                    p.tallas['Manual'] = Number(p.tallas['Manual']) - cantidadARestar;
                } 
                else {
                    if (!p.tallas[tallaElegida] || Number(p.tallas[tallaElegida]) < cantidadARestar) {
                        notificar(`⚠️ No hay stock de Talla ${tallaElegida}`, "error");
                        return false;
                    }
                    p.tallas[tallaElegida] = Number(p.tallas[tallaElegida]) - cantidadARestar;
                }
            }
            
            if (Number(p.cantidad) < cantidadARestar) {
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