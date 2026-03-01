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
        
        // 🚀 NUEVO: Asegura que todos los productos viejos tengan la estructura correcta
        this.migrarEstructura(); 
        
        this.actualizarDatalist();
    },

    // ... dentro de objeto Inventario ...
recargarRapido(nombre, cantidad, tallaElegida) {
        const p = this.productos.find(prod => prod.nombre === nombre);
        if (!p) return;

        // Sumar al total
        p.cantidad += cantidad;

        // Sumar a la talla si aplica
        if (tallaElegida && p.tallas && p.tallas[tallaElegida] !== undefined) {
            p.tallas[tallaElegida] += cantidad;
        }

        this.sincronizar();
        Interfaz.renderInventario(); // Actualizar tabla
        notificar(`✅ Stock de "${nombre}" actualizado.`);
    },

    actualizar(nombreOriginal, nuevoNombre, nuevaCantidad, nuevoPrecio, nuevaUnidad, nuevasTallas) {
    const index = this.productos.findIndex(p => p.nombre === nombreOriginal);
    if (index === -1) return notificar("Error al actualizar", "error");

    const p = this.productos[index];
    
    // Actualizar propiedades
    p.nombre = nuevoNombre;
    p.cantidad = parseFloat(nuevaCantidad);
    p.precio = parseFloat(nuevoPrecio);
    p.unidad = nuevaUnidad;
    p.tallas = nuevasTallas;

    this.sincronizar(); // Guarda en localStorage
},
    // 🚀 NUEVO: Esta función arregla tu base de datos vieja sin borrar nada
   migrarEstructura() {
        let modificado = false;
        this.productos = this.productos.map(p => {
            if (!p.id) { p.id = Date.now() + Math.random(); modificado = true; }
            if (!p.unidad) { p.unidad = 'Und'; modificado = true; }
            if (!p.codigo) { p.codigo = ""; modificado = true; } // 👈 NUEVO: Campo código
            if (!p.stockMinimo) { 
                p.stockMinimo = (p.unidad === 'Kg' || p.unidad === 'Lts') ? 1.5 : 3; 
                modificado = true; 
            }
            return p;
        });
        if (modificado) Persistencia.guardar('dom_inventario', this.productos);
    },

   devolver(nombre, cantidad, tallaElegida = null) {
    if (!this.activo) return;
    if (!nombre) return;

    const nombreLimpio = nombre.trim();
    // Buscar índice del producto
    const index = this.productos.findIndex(p => p.nombre.toLowerCase() === nombreLimpio.toLowerCase());

    if (index !== -1) {
        // --- PRODUCTO ENCONTRADO: Proceder con la devolución ---
        const cantADevolver = parseFloat(cantidad) || 0;
        const p = this.productos[index];

        // 1. Devolver cantidad total
        p.cantidad += cantADevolver;
        
        // Redondear para evitar errores de punto flotante en Kg/Lts
        if (p.unidad === 'Kg' || p.unidad === 'Lts') {
            p.cantidad = parseFloat(p.cantidad.toFixed(3));
        }

        // 2. Devolver talla específica si existe
        if (tallaElegida && p.tallas && p.tallas[tallaElegida] !== undefined) {
            p.tallas[tallaElegida] = parseFloat(p.tallas[tallaElegida]) + cantADevolver;
        }

        notificar(`🔄 Stock devuelto: +${cantidad} ${p.unidad}`);
        this.sincronizar(); // Guarda y actualiza la vista
    } else {
        // --- ✅ CORRECCIÓN: Manejo seguro si el producto no existe ---
        notificar(`⚠️ No se pudo devolver "${nombre}" porque ya no existe en el inventario.`, "error");
        console.warn(`DOMINUS: Intento de devolución de producto inexistente: ${nombre}`);
    }
},

    // 🛠️ MEJORADO: Ahora suma decimales correctamente y actualiza sin romper
 guardar(nombre, cantidad, precio, unidad = 'Und', tallas = null, codigo = "") { // 👈 NUEVO: Parámetro codigo
        if (!nombre) return; 
        
        const nombreLimpio = nombre.trim();
        // Buscar por nombre para ver si ya existe
        const index = this.productos.findIndex(p => p.nombre.toLowerCase() === nombreLimpio.toLowerCase());
        const precioFinal = (precio === "" || precio === null) ? 0 : parseFloat(precio);
        const nuevaCant = parseFloat(cantidad) || 0;

        if (index !== -1) {
            // --- PRODUCTO EXISTENTE: Actualizar ---
            
            // 1. SUMAR LA CANTIDAD (Evitando errores de decimales largos)
            this.productos[index].cantidad += nuevaCant;
            if (unidad === 'Kg' || unidad === 'Lts') {
                this.productos[index].cantidad = parseFloat(this.productos[index].cantidad.toFixed(3));
            }

            // 2. Solo actualiza el precio si le pusiste uno nuevo mayor a 0
            if (precioFinal > 0) {
                this.productos[index].precio = precioFinal;
            }
            this.productos[index].unidad = unidad;
            this.productos[index].codigo = codigo; // 👈 NUEVO: Actualizar código
            
            // 3. Sumar tallas si existen
            if (tallas) {
                if (!this.productos[index].tallas) this.productos[index].tallas = {};
                Object.keys(tallas).forEach(t => {
                    const cantTallaRecarga = parseFloat(tallas[t]) || 0;
                    this.productos[index].tallas[t] = (this.productos[index].tallas[t] || 0) + cantTallaRecarga;
                });
            }
            notificar(`Stock actualizado: +${nuevaCant} ${unidad}`, "stock");
        } else {
            // --- PRODUCTO NUEVO ---
            
            // Generar ID ÚNICO para asegurar integridad de datos
            const nuevoId = Date.now() + Math.random();
            
            this.productos.push({
                id: nuevoId,
                nombre: nombreLimpio,
                cantidad: nuevaCant,
                precio: precioFinal,
                unidad: unidad,
                codigo: codigo, // 👈 NUEVO: Guardar código
                // Definir stock mínimo automático según unidad
                stockMinimo: (unidad === 'Kg' || unidad === 'Lts') ? 1.5 : 3,
                tallas: tallas || {}
            });
            notificar("📦 Nuevo producto registrado", "stock");
        }
        
        // Guardar cambios en localStorage
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
        // Guardar antes de renderizar para asegurar persistencia
        Persistencia.guardar('dom_inventario', this.productos);

        if (typeof Interfaz !== 'undefined' && Interfaz.renderInventario) {
            Interfaz.renderInventario();
        }
        
        // 💡 NOTA: Eliminamos la lógica de alertas de aquí 
        // porque se repiten mucho al guardar. 
        // Las alertas ahora están en registrarVenta().
    },

   buscarPorCodigo: function(codigo) {
        return this.productos.find(prod => prod.codigo === codigo);
    },

    descontar(nombre, cant, tallaElegida = null) {
        if (!this.activo) return true; 

        // parseFloat para asegurar decimales correctos
        const cantidadARestar = parseFloat(cant) || 0; 
        const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombre.trim().toLowerCase());
        
        if (p) {
            // Lógica de Tallas y desglose Kg/Lts
            if (p.tallas && tallaElegida) {
                // Tallas normales
                if (p.tallas[tallaElegida] !== undefined) {
                    if (parseFloat(p.tallas[tallaElegida]) < cantidadARestar) {
                        notificar(`⚠️ Stock insuficiente en ${tallaElegida}`, "error");
                        return false;
                    }
                    p.tallas[tallaElegida] = parseFloat(p.tallas[tallaElegida]) - cantidadARestar;
                }
            }
            
            // Validación de cantidad total con decimales
            if (parseFloat(p.cantidad) < cantidadARestar) {
                notificar(`⚠️ Stock insuficiente de "${p.nombre}"`, "error");
                return false; 
            }
            
            // Resta y redondeo para evitar errores de punto flotante (.3000000004)
            p.cantidad = parseFloat(p.cantidad) - cantidadARestar;
            if (p.unidad === 'Kg' || p.unidad === 'Lts') {
                p.cantidad = parseFloat(p.cantidad.toFixed(3));
            }
            
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

        // ✅ CORRECCIÓN: Asegurar que el precio sea un float decimal
        const precioDecimal = parseFloat(precio) || 0;

        if (index !== -1) {
            dic[index].precio = precioDecimal;
        } else {
            dic.push({ nombre: nombreLimpio, precio: precioDecimal });
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

