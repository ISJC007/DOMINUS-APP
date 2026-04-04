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
    // 1. Buscamos el producto (Usa toLowerCase para evitar fallos por una mayúscula)
    const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombre.toLowerCase());
    if (!p) return notificar("❌ Producto no encontrado", "error");

    // 2. Forzar número y limpiar entrada
    const numCantidad = parseFloat(cantidad) || 0;

    // 3. SUMA CON PRECISIÓN (Máximo 3 decimales para Kg/Lts)
    p.cantidad = Number((p.cantidad + numCantidad).toFixed(3));

    // 4. ACTUALIZACIÓN DE TALLA (Si aplica)
    if (tallaElegida && p.tallas) {
        // Usamos (|| 0) por si la talla existe en el objeto pero es null/undefined
        const cantidadPreviaTalla = parseFloat(p.tallas[tallaElegida]) || 0;
        p.tallas[tallaElegida] = Number((cantidadPreviaTalla + numCantidad).toFixed(2));
    }

    // 5. PERSISTENCIA Y RENDER
    // Como sincronizar() ya llama a Interfaz.renderInventario(), ahorramos líneas
    this.sincronizar();
    
    notificar(`✅ Stock de "${p.nombre}" actualizado (+${numCantidad})`);
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

// Método para chequear salud del stock
chequearSaludStock(producto) {
    const stock = producto.cantidad;
    const min = producto.stockMinimo || 3;

    if (stock <= 0) {
        notificar(`🚨 AGOTADO: ${producto.nombre}`, "error");
        return "agotado";
    } 
    if (stock <= min) {
        notificar(`⚠️ STOCK BAJO: ${producto.nombre} (${stock})`, "stock");
        return "bajo";
    }
    return "ok";
},

    // 🛠️ MEJORADO: Ahora suma decimales correctamente y actualiza sin romper
guardar(nombre, cantidad, precio, unidad = 'Und', tallas = null, codigo = "") {
    if (!nombre) return; 
    
    const nombreLimpio = nombre.trim();
    // 1. Escudo de Identidad: Buscamos si ya existe (sin importar mayúsculas)
    const index = this.productos.findIndex(p => p.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    
    // Normalización de números
    const precioFinal = (precio === "" || precio === null) ? 0 : parseFloat(precio);
    const nuevaCant = parseFloat(cantidad) || 0;

    if (index !== -1) {
        // --- PRODUCTO EXISTENTE: Actualizar ---
        const p = this.productos[index];

        // Suma de stock con redondeo de precisión
        p.cantidad = Number((p.cantidad + nuevaCant).toFixed(3));

        // Actualización selectiva de metadatos
        if (precioFinal > 0) p.precio = precioFinal;
        p.unidad = unidad;
        if (codigo) p.codigo = codigo; // Solo actualiza si viene un código
        
        // Fusión inteligente de tallas
        if (tallas) {
            if (!p.tallas) p.tallas = {};
            Object.keys(tallas).forEach(t => {
                const cantRecarga = parseFloat(tallas[t]) || 0;
                p.tallas[t] = Number(((p.tallas[t] || 0) + cantRecarga).toFixed(2));
            });
        }
        notificar(`Stock actualizado: +${nuevaCant} ${unidad}`, "stock");
    } else {
        // --- PRODUCTO NUEVO ---
        const nuevoId = Date.now() + Math.random(); // ID único robusto
        
        this.productos.push({
            id: nuevoId,
            nombre: nombreLimpio,
            cantidad: nuevaCant,
            precio: precioFinal,
            unidad: unidad,
            codigo: codigo,
            // Alerta automática: 1.5 para pesados, 3 para unidades
            stockMinimo: (unidad === 'Kg' || unidad === 'Lts') ? 1.5 : 3,
            tallas: tallas || {}
        });
        notificar("📦 Nuevo producto registrado", "stock");
    }
    
    // Guardar en persistencia
    this.sincronizar(); 
},

   eliminar(id) {
    // Usamos != para que compare sin importar si es string o número
    // pero manteniendo la seguridad del filtro
    const totalAntes = this.productos.length;
    this.productos = this.productos.filter(p => p.id != id);
    
    if (this.productos.length < totalAntes) {
        this.sincronizar();
        notificar("🗑️ Producto eliminado permanentemente", "error");
    }
},

    // --- LÓGICA DE CONTROL Y SINCRONIZACIÓN ---

  sincronizar() {
    // 1. FILTRO DE INTEGRIDAD
    // Eliminamos cualquier registro corrupto (que no tenga nombre o sea null)
    // Esto evita que el 1.40 MB de tu archivo crezca con datos vacíos.
    this.productos = this.productos.filter(p => p && p.nombre && p.id);

    // 2. GUARDADO EN DISCO (LocalStorage)
    // Usamos el nombre de la llave que definiste para el inventario
    try {
        Persistencia.guardar('dom_inventario', this.productos);
    } catch (error) {
        console.error("Error al persistir el inventario:", error);
        notificar("❌ Error de memoria al guardar inventario", "error");
        return;
    }

    // 3. ACTUALIZACIÓN DE VISTA
    // Si la Interfaz está cargada, redibujamos la lista automáticamente
    if (typeof Interfaz !== 'undefined' && Interfaz.renderInventario) {
        Interfaz.renderInventario();
    }
    
    // NOTA PARA JOHANDER:
    // Las alertas de "Stock Bajo" no las ponemos aquí para no 
    // interrumpir el flujo cuando estás cargando mercancía nueva.
    // Esas alertas saltarán solo cuando se reste stock en las ventas.
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
