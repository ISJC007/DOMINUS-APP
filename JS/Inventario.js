const registrosSilencio = {}; 
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
    const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombre.toLowerCase());
    if (!p) return notificar("❌ Producto no encontrado", "error");

    const numCantidad = parseFloat(cantidad) || 0;
    p.cantidad = Number((p.cantidad + numCantidad).toFixed(3));

    // Cambié esto para que sea más robusto:
    if (tallaElegida && p.tallas && p.tallas[tallaElegida] !== undefined) {
        p.tallas[tallaElegida] = Number((parseFloat(p.tallas[tallaElegida]) + numCantidad).toFixed(2));
    }

    this.sincronizar();
    this.chequearSaludStock(p); // El centinela valida si ya salió de alerta
},

// Añadimos 'nCodigo' al final de los parámetros
actualizar(nOriginal, nNuevo, nCant, nPrecio, nUnidad, nTallas, nMin, nCodigo) {
    const p = this.productos.find(prod => prod.nombre === nOriginal);
    if (!p) return;

    p.nombre = nNuevo;
    p.cantidad = parseFloat(nCant) || 0;
    p.precio = parseFloat(nPrecio) || 0;
    p.unidad = nUnidad;
    p.tallas = nTallas;
    
    // 🚀 NUEVO: Actualizamos el código de barras también
    if (nCodigo !== undefined) p.codigo = nCodigo.trim();

    if (nMin !== undefined && nMin !== "") p.stockMinimo = parseFloat(nMin);

    this.sincronizar();
    this.chequearSaludStock(p);
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
    if (!this.activo || !nombre) return;
    const nombreLimpio = nombre.split('(')[0].trim().replace("PUNTO: ", "");
    let p = this.productos.find(prod => prod.nombre.toLowerCase() === nombreLimpio.toLowerCase());

    if (p) {
        const cant = parseFloat(cantidad) || 0;
        // Solo usamos .cantidad para evitar descuadres
        p.cantidad = (p.unidad === 'Kg' || p.unidad === 'Lts') 
            ? parseFloat((p.cantidad + cant).toFixed(3)) 
            : Math.round(p.cantidad + cant);

        if (tallaElegida && p.tallas) {
            p.tallas[tallaElegida] = (parseFloat(p.tallas[tallaElegida]) || 0) + cant;
        }
        this.sincronizar(); // Esto ya guarda y renderiza la interfaz
        notificar(`🔄 Stock devuelto: ${p.nombre} +${cant}`, "exito");
    }
},

// Método para chequear salud del stock
chequearSaludStock(producto) {
    const nombreKey = producto.nombre.toLowerCase().trim();
    const stock = parseFloat(producto.cantidad) || 0;
    const unidad = producto.unidad || 'Und';
    const min = parseFloat(producto.stockMinimo) || (unidad === 'Kg' || unidad === 'Lts' ? 1.5 : 3);

    // 1. Si el stock sube (reposición), quitamos el bozal al centinela
    if (stock > min) {
        registrosSilencio[nombreKey] = false;
        return "ok";
    }

    // 2. ESTADO: AGOTADO (Prioridad 1)
    if (stock <= 0) {
        // Solo avisar si no hemos avisado que está agotado ya
        if (registrosSilencio[nombreKey] !== 'agotado_avisado') {
            notificar(`🚨 AGOTADO: ${producto.nombre}`, "error");
            registrosSilencio[nombreKey] = 'agotado_avisado';
        }
        return "agotado";
    } 

    // 3. ESTADO: STOCK BAJO (Prioridad 2)
    if (stock <= min) {
        // 🔥 LA CLAVE: Si ya avisamos que está "bajo", no digas nada más
        if (registrosSilencio[nombreKey] === 'bajo_avisado' || registrosSilencio[nombreKey] === 'agotado_avisado') {
            return "bajo"; 
        }

        const mensaje = (unidad === 'Kg' || unidad === 'Lts') 
            ? `⚠️ STOCK BAJO: ${producto.nombre} (${stock.toFixed(3)} ${unidad})`
            : `⚠️ STOCK BAJO: ${producto.nombre} (${Math.round(stock)} ${unidad})`;
            
        notificar(mensaje, "stock");
        
        // Bloqueamos futuros gritos para este producto
        registrosSilencio[nombreKey] = 'bajo_avisado';
        return "bajo";
    }

    return "ok";
},
    // 🛠️ MEJORADO: Ahora suma decimales correctamente y actualiza sin romper
guardar(nombre, cantidad, precio, unidad = 'Und', tallas = null, codigo = "", minManual = null) {
    if (!nombre) return; 
    
    const nombreLimpio = nombre.trim();
    // 1. Buscamos si ya existe
    const index = this.productos.findIndex(p => p.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    
    const precioFinal = (precio === "" || precio === null) ? 0 : parseFloat(precio);
    const nuevaCant = parseFloat(cantidad) || 0;

    if (index !== -1) {
        // --- PRODUCTO EXISTENTE: Actualizar ---
        const p = this.productos[index];

        // Suma de stock con redondeo de precisión (3 decimales para Kg/Lts)
        p.cantidad = Number((p.cantidad + nuevaCant).toFixed(3));

        // Actualización de metadatos
        if (precioFinal > 0) p.precio = precioFinal;
        p.unidad = unidad;
        if (codigo) p.codigo = codigo; 
        
        // 🚀 NUEVO: Permitir actualizar el mínimo si se pasa por parámetro
        if (minManual !== null) p.stockMinimo = parseFloat(minManual);
        
        // Fusión de tallas
        if (tallas) {
            if (!p.tallas) p.tallas = {};
            Object.keys(tallas).forEach(t => {
                const cantRecarga = parseFloat(tallas[t]) || 0;
                p.tallas[t] = Number(((p.tallas[t] || 0) + cantRecarga).toFixed(2));
            });
        }

        // Si la cantidad ahora es positiva y mayor al mínimo, notificamos éxito normal
        const minActual = p.stockMinimo || (p.unidad === 'Kg' ? 1.5 : 3);
        if (p.cantidad > minActual) {
            notificar(`✅ Stock de "${p.nombre}" repuesto: +${nuevaCant}`, "exito");
        } else {
            // Si aún con la recarga sigue bajo, el centinela avisará
            this.chequearSaludStock(p);
        }

    } else {
        // --- PRODUCTO NUEVO ---
        const nuevoId = Date.now() + Math.random();
        
        this.productos.push({
            id: nuevoId,
            nombre: nombreLimpio,
            cantidad: nuevaCant,
            precio: precioFinal,
            unidad: unidad,
            codigo: codigo,
            // 🚀 NUEVO: Usa el mínimo manual o la lógica inteligente de DOMINUS
            stockMinimo: minManual !== null ? parseFloat(minManual) : (unidad === 'Kg' || unidad === 'Lts' ? 1.5 : 3),
            tallas: tallas || {}
        });
        notificar("📦 Nuevo producto registrado", "stock");
    }
    
    // Persistencia y actualización de interfaz
    this.sincronizar(); 
},

// 🚀 NUEVO: Conecta el Escáner con la lógica de Inventario
   gestionarEscaneo: function(codigo) {
    const producto = this.buscarPorCodigo(codigo);

    if (producto) {
        // Caso A: El producto ya existe -> Recarga rápida
        if (typeof DominusAudio !== 'undefined') DominusAudio.play('scan');
        
        modalEleccion.abrir({
            titulo: "Reponer Stock",
            mensaje: `Vas a recargar stock de: <b>${producto.nombre}</b><br>Stock actual: ${producto.cantidad} ${producto.unidad}`,
            botones: [
                {
                    texto: "➕ Recargar",
                    clase: "btn-si",
                    accion: () => {
                        const cant = prompt(`¿Cuánto vas a sumar a ${producto.nombre}?`);
                        if (cant && !isNaN(cant)) {
                            this.recargarRapido(producto.nombre, cant);
                        }
                    }
                },
                {
                    texto: "📝 Editar Todo",
                    clase: "btn-si",
                    accion: () => {
                        if (typeof Interfaz !== 'undefined' && Interfaz.abrirEditorProducto) {
                            Interfaz.abrirEditorProducto(producto);
                        }
                    }
                }
            ]
        });
    } else {
        // Caso B: Producto no existe -> Registrar nuevo
        notificar(`⚠️ Código nuevo detectado: ${codigo}`, "info");
        
        // 1. Buscamos el input del código
        const inputCod = document.getElementById('inv-codigo');
        if (inputCod) {
            inputCod.value = codigo;
            
            // 🔥 FORZAMOS AL NAVEGADOR A RECONOCER EL CAMBIO
            inputCod.dispatchEvent(new Event('input', { bubbles: true }));
            inputCod.dispatchEvent(new Event('change', { bubbles: true }));
            
            notificar(`✅ ID ${codigo} pegado`, "success");
        }

        // 2. Movilizamos el foco al nombre para empezar a escribir
        const inputNom = document.getElementById('inv-nombre');
        if (inputNom) {
            setTimeout(() => {
                inputNom.focus();
                // En Android esto suele disparar el teclado automáticamente
            }, 500);
        }

        // 3. Scroll suave al formulario por si estamos abajo en la lista
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
},

 eliminar(id) {
    const totalAntes = this.productos.length;
    // Forzamos que el ID sea tratado igual (string/number)
    this.productos = this.productos.filter(p => p.id != id);
    
    if (this.productos.length < totalAntes) {
        this.sincronizar();
        // Cambiamos a tipo 'error' para que el toast sea rojo y resalte la eliminación
        notificar("🗑️ Producto eliminado permanentemente", "error");
    }
},

    // --- LÓGICA DE CONTROL Y SINCRONIZACIÓN ---

sincronizar() {
    // 1. FILTRO DE INTEGRIDAD (Mantiene el archivo ligero)
    this.productos = this.productos.filter(p => p && p.nombre && p.id);

    // 🚀 OPCIONAL: Ordenar antes de guardar para que persista el orden de importancia
    this.productos.sort((a, b) => {
        const minA = a.stockMinimo || (a.unidad === 'Kg' ? 1.5 : 3);
        const minB = b.stockMinimo || (b.unidad === 'Kg' ? 1.5 : 3);
        const alertaA = a.cantidad <= minA ? 1 : 0;
        const alertaB = b.cantidad <= minB ? 1 : 0;
        return alertaB - alertaA;
    });

    // 2. GUARDADO EN DISCO
    try {
        Persistencia.guardar('dom_inventario', this.productos);
    } catch (error) {
        console.error("Error al persistir:", error);
        notificar("❌ Error de memoria en el dispositivo", "error");
        return;
    }

    // 3. ACTUALIZACIÓN DE VISTA
    if (typeof Interfaz !== 'undefined' && Interfaz.renderInventario) {
        Interfaz.renderInventario();
    }
},

  buscarPorCodigo: function(codigo) {
    if (!codigo) return null;
    const codLimpio = codigo.toString().trim();
return this.productos.find(prod => String(prod.codigo).trim() === String(codLimpio).trim());},

 descontar(nombre, cant, tallaElegida = null) {
    if (!this.activo) return true; 

    // 🚀 MEJORA 1: Limpiamos el nombre (Tallas o prefijos)
    const nombreLimpio = nombre.split('(')[0].trim().replace("PUNTO: ", "");
    
    const cantidadARestar = parseFloat(cant) || 0; 
    
    // 🚀 MEJORA 2: Buscar con el nombre limpio
    const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    
    if (p) {
        // Lógica de Tallas
        if (p.tallas && tallaElegida) {
            if (p.tallas[tallaElegida] !== undefined) {
                if (parseFloat(p.tallas[tallaElegida]) < cantidadARestar) {
                    notificar(`⚠️ Stock insuficiente en ${tallaElegida}`, "error");
                    return false;
                }
                p.tallas[tallaElegida] = parseFloat(p.tallas[tallaElegida]) - cantidadARestar;
            }
        }
        
        // 🚀 MEJORA 3: Recalcular STOCK TOTAL
        if (p.tallas && Object.keys(p.tallas).length > 0) {
            let totalTallas = 0;
            for (let talla in p.tallas) {
                totalTallas += parseFloat(p.tallas[talla]) || 0;
            }
            p.cantidad = totalTallas; 
        } else {
            if (parseFloat(p.cantidad) < cantidadARestar) {
                notificar(`⚠️ Stock insuficiente de "${p.nombre}"`, "error");
                return false; 
            }
            p.cantidad = parseFloat(p.cantidad) - cantidadARestar;
        }
        
        // Redondeo de precisión según unidad
        if (p.unidad === 'Kg' || p.unidad === 'Lts') {
            p.cantidad = parseFloat(p.cantidad.toFixed(3));
        } else {
            p.cantidad = Math.round(p.cantidad); 
        }
        
        // Persistencia
        this.sincronizar();

        // 🚀 EL TOQUE MAESTRO: Llamada al Centinela
        // Se ejecuta después de sincronizar para que la alerta refleje la realidad en disco
        this.chequearSaludStock(p);
        
        return true; 
    }
    // Si no existe en inventario, DOMINUS asume que es un producto genérico y permite la venta
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
