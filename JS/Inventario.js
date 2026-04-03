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

    // 💡 EL CAMBIO: Forzar que sea número antes de sumar
    const numCantidad = parseFloat(cantidad) || 0;

    p.cantidad += numCantidad;

    if (tallaElegida && p.tallas && p.tallas[tallaElegida] !== undefined) {
        p.tallas[tallaElegida] += numCantidad;
    }

    this.sincronizar();
    if (typeof Interfaz !== 'undefined') Interfaz.renderInventario();
    notificar(`✅ Stock de "${nombre}" actualizado.`);
},

actualizar(nombreOriginal, nuevoNombre, nuevaCantidad, nuevoPrecio, nuevaUnidad, nuevasTallas, nuevoMinimo) {
    const index = this.productos.findIndex(p => p.nombre === nombreOriginal);
    if (index === -1) return;

    const p = this.productos[index];
    p.nombre = nuevoNombre;
    p.cantidad = parseFloat(nuevaCantidad) || 0;
    p.precio = parseFloat(nuevoPrecio) || 0;
    p.unidad = nuevaUnidad;
    p.tallas = nuevasTallas;
    
    // 💡 NUEVO: Guardar el mínimo personalizado
    if (nuevoMinimo !== undefined) p.stockMinimo = parseFloat(nuevoMinimo);

    this.sincronizar();

    // 💡 ALERTA INMEDIATA:
    if (p.cantidad <= (p.stockMinimo || 0)) {
        notificar(`⚠️ Stock bajo: ${p.nombre} (${p.cantidad} ${p.unidad})`, "error");
    }
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

 devolver: function(nombre, cantidad, tallaElegida = null) {
    if (!this.activo) return;
    if (!nombre || parseFloat(cantidad) <= 0) return;

    // 🚀 MEJORA: Limpiamos el nombre por si trae la talla "(40)" o prefijos
    const nombreLimpio = nombre.split('(')[0].trim().replace("PUNTO: ", "");
    
    // 1. Buscamos el producto con mayor flexibilidad
    let producto = this.productos.find(p => 
        p.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );

    if (producto) {
        const cantADevolver = parseFloat(cantidad) || 0;
        console.log(`🔍 DOMINUS: Devolviendo ${cantADevolver} de ${producto.nombre}`);

        // 2. Devolver al STOCK GENERAL
        let stockActual = parseFloat(producto.stock || producto.cantidad || 0);
        let nuevoStock = stockActual + cantADevolver;

        // Redondear según unidad
        if (producto.unidad === 'Kg' || producto.unidad === 'Lts') {
            nuevoStock = parseFloat(nuevoStock.toFixed(3)); // Tres decimales para peso/volumen
        } else {
            nuevoStock = Math.round(nuevoStock); // Enteros para unidades
        }
        
        // 🚀 MEJORA: Actualizamos propiedades explícitamente
        producto.stock = nuevoStock;
        producto.cantidad = nuevoStock;

        // 3. Devolver a la TALLA ESPECÍFICA (si aplica)
        if (tallaElegida && producto.tallas) {
            // Asegurarse de que producto.tallas sea un objeto válido
            if (typeof producto.tallas !== 'object') producto.tallas = {};
            
            // Si la talla existe en el objeto, le sumamos
            if (producto.tallas[tallaElegida] !== undefined) {
                producto.tallas[tallaElegida] = (parseFloat(producto.tallas[tallaElegida]) || 0) + cantADevolver;
            } else {
                // Si la talla no existía, la creamos
                producto.tallas[tallaElegida] = cantADevolver;
            }
            console.log(`📏 DOMINUS: Talla ${tallaElegida} actualizada.`);
        }

        // 4. PERSISTENCIA Y VISTA
        this.guardar(); // Guarda en LocalStorage
        
        // 🚀 MEJORA: Forzar actualización de vista inmediatamente
        if (typeof Interfaz !== 'undefined') Interfaz.renderInventario(); 
        
        this.sincronizar(); // Nube
        
        notificar(`🔄 Stock devuelto: ${producto.nombre} +${cantADevolver} ${producto.unidad || 'Unid.'}`, "exito");
        console.log(`✅ DOMINUS: Devolución exitosa. Nuevo stock total: ${nuevoStock}`);
    } else {
        notificar(`⚠️ Producto "${nombre}" no encontrado en inventario. No se devolvió stock.`, "error");
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

    // 🚀 MEJORA 1: Limpiamos el nombre por si trae la talla "(40)" o prefijos
    const nombreLimpio = nombre.split('(')[0].trim().replace("PUNTO: ", "");
    
    // parseFloat para asegurar decimales correctos
    const cantidadARestar = parseFloat(cant) || 0; 
    
    // 🚀 MEJORA 2: Buscar con el nombre limpio
    const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    
    if (p) {
        // Lógica de Tallas y desglose Kg/Lts
        if (p.tallas && tallaElegida) {
            // Tallas normales
            if (p.tallas[tallaElegida] !== undefined) {
                if (parseFloat(p.tallas[tallaElegida]) < cantidadARestar) {
                    notificar(`⚠️ Stock insuficiente en ${tallaElegida}`, "error");
                    return false;
                }
                // Restar de la talla específica
                p.tallas[tallaElegida] = parseFloat(p.tallas[tallaElegida]) - cantidadARestar;
            }
        }
        
        // 🚀 MEJORA 3: Recalcular STOCK TOTAL sumando todas las tallas o restando normal
        if (p.tallas && Object.keys(p.tallas).length > 0) {
            let totalTallas = 0;
            for (let talla in p.tallas) {
                totalTallas += parseFloat(p.tallas[talla]) || 0;
            }
            p.cantidad = totalTallas; // Actualizamos el total real sumando las tallas
        } else {
            // Si no tiene tallas, restar normal
            if (parseFloat(p.cantidad) < cantidadARestar) {
                notificar(`⚠️ Stock insuficiente de "${p.nombre}"`, "error");
                return false; 
            }
            p.cantidad = parseFloat(p.cantidad) - cantidadARestar;
        }
        
        // Redondeo para evitar errores de punto flotante (.3000000004)
        if (p.unidad === 'Kg' || p.unidad === 'Lts') {
            p.cantidad = parseFloat(p.cantidad.toFixed(3));
        } else {
            p.cantidad = Math.round(p.cantidad); // Asegurar enteros
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
    // 1. Buscamos el datalist usando el ID real de tu HTML
    const dl = document.getElementById('sugerencias-ventas'); 
    if (!dl) return;

    const dic = Persistencia.cargar('dom_diccionario_ventas') || [];
    
    // 2. Limpiamos y llenamos
    dl.innerHTML = '';
    dic.forEach(prod => {
        const opt = document.createElement('option');
        opt.value = prod.nombre;
        // Opcional: mostrar el precio sugerido en el label
        opt.label = `Sugerido: ${prod.precio}$`; 
        dl.appendChild(opt);
        });
    }
};
