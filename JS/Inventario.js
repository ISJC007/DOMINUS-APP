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
        // Inicializamos la lista de autocompletado al cargar
        this.actualizarDatalist();
    },

    // --- GESTIÓN DE STOCK (GUARDAR Y ELIMINAR) ---

    guardar(nombre, cantidad, precio, unidad = 'Und', tallas = null) {
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

    eliminar(id) {
        this.productos = this.productos.filter(p => p.id !== Number(id));
        this.sincronizar();
        notificar("Producto eliminado del inventario", "error");
    },

    // --- LÓGICA DE CONTROL Y SINCRONIZACIÓN ---

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

    descontar(nombre, cant, tallaElegida = null) {
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
            this.sincronizar();
            return true; 
        }
        return true; 
    },

    // --- CEREBRO DE AUTO-APRENDIZAJE (PUNTO #5) ---
    
    aprenderDeVenta(nombre, precio) {
        if (!nombre || nombre.trim() === "") return;
        
        let dic = Persistencia.cargar('dom_diccionario_ventas') || [];
        const nombreLimpio = nombre.trim();
        const index = dic.findIndex(d => d.nombre.toLowerCase() === nombreLimpio.toLowerCase());

        if (index !== -1) {
            dic[index].precio = parseFloat(precio);
        } else {
            dic.push({ nombre: nombreLimpio, precio: parseFloat(precio) });
            console.log(`🧠 DOMINUS aprendió un nuevo producto: ${nombreLimpio}`);
        }

        Persistencia.guardar('dom_diccionario_ventas', dic);
        this.actualizarDatalist();
    },

    buscarPrecioMemoria(nombre) {
        let dic = Persistencia.cargar('dom_diccionario_ventas') || [];
        const p = dic.find(d => d.nombre.toLowerCase() === nombre.trim().toLowerCase());
        return p ? p.precio : null;
    },

    actualizarDatalist() {
        let dic = Persistencia.cargar('dom_diccionario_ventas') || [];
        const lista = document.getElementById('sugerencias-ventas');
        if (lista) {
            lista.innerHTML = dic.map(d => `<option value="${d.nombre}">`).join('');
        }
    }
};