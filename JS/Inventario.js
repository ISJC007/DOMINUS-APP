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
    // 1. Búsqueda y Validación
    const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombre.toLowerCase());
    if (!p) return notificar("❌ Producto no encontrado", "error");

    const numCantidad = parseFloat(cantidad) || 0;
    if (numCantidad <= 0) return;

    // 2. GESTIÓN DE CARGA (Tallas vs Global)
    if (tallaElegida && p.tallas && p.tallas[tallaElegida] !== undefined) {
        // --- FLUJO CON TALLAS ---
        const stockTallaActual = parseFloat(p.tallas[tallaElegida]) || 0;
        p.tallas[tallaElegida] = Number((stockTallaActual + numCantidad).toFixed(2));

        // 🔥 RECALCULO TOTAL: El total SIEMPRE se redefine sumando las tallas
        p.cantidad = Object.values(p.tallas).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    } else {
        // --- FLUJO SIN TALLAS ---
        const stockGlobalActual = parseFloat(p.cantidad) || 0;
        p.cantidad = stockGlobalActual + numCantidad;
    }

    // 3. REDONDEO DE PRECISIÓN SEGÚN UNIDAD
    p.cantidad = (p.unidad === 'Kg' || p.unidad === 'Lts') 
        ? Number(p.cantidad.toFixed(3)) 
        : Math.round(p.cantidad);

    // 4. PERSISTENCIA Y SALUD
    this.sincronizar();
    this.chequearSaludStock(p); 
    
    notificar(`➕ Stock añadido: ${p.nombre} (+${numCantidad})`, "exito");
},

// Añadimos 'nCodigo' al final de los parámetros
actualizar(nOriginal, nNuevo, nCant, nPrecio, nUnidad, nTallas, nMin, nCodigo) {
    let p = null;
    if (this.idEdicion) {
        p = this.productos.find(prod => prod.id === this.idEdicion);
    } else {
        p = this.productos.find(prod => prod.nombre === nOriginal);
    }

    if (!p) {
        console.error("DOMINUS: No se encontró el producto para actualizar.");
        return;
    }

    p.nombre = nNuevo;
    p.cantidad = parseFloat(nCant) || 0;
    p.precio = parseFloat(nPrecio) || 0;
    p.unidad = nUnidad;
    p.tallas = nTallas ? { ...nTallas } : {};
    
    if (nCodigo !== undefined) p.codigo = nCodigo.trim();

    if (nMin !== undefined && nMin !== "" && nMin !== null) {
        p.stockMinimo = parseFloat(nMin);
    }

    this.sincronizar();
    
    // 🚀 INYECCIÓN CENTINELA:
    if (typeof Notificaciones !== 'undefined') {
        // Marcamos el inventario como "No Leído" para que, si el cambio
        // puso el producto en alerta, la burbuja aparezca de inmediato.
        Notificaciones.resetVisto('inventario');
        Notificaciones.revisarTodo();
    }

    if (typeof this.chequearSaludStock === 'function') {
        this.chequearSaludStock(p);
    }
},

    // 🚀 NUEVO: Esta función arregla tu base de datos vieja sin borrar nada
  migrarEstructura() {
    let modificado = false;
    this.productos = this.productos.map(p => {
        let cambio = false;
        // ID más robusto para evitar colisiones
        if (!p.id) { p.id = `prod-${crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random()}`; cambio = true; }
        if (!p.unidad) { p.unidad = 'Und'; cambio = true; }
        if (!p.codigo) { p.codigo = ""; cambio = true; }
        if (!p.tallas) { p.tallas = {}; cambio = true; } // 👈 CRÍTICO: Evita errores en el modal de tallas
        if (!p.stockMinimo) { 
            p.stockMinimo = (p.unidad === 'Kg' || p.unidad === 'Lts') ? 1.5 : 3; 
            cambio = true; 
        }
        if (cambio) modificado = true;
        return p;
    });
    if (modificado) Persistencia.guardar('dom_inventario', this.productos);
},

devolver(nombre, cantidad, tallaElegida = null) {
    if (!this.activo || !nombre) return;

    // 1. Limpieza de Identificador
    const nombreLimpio = nombre.split('(')[0].trim().replace("PUNTO: ", "");
    const cant = parseFloat(cantidad) || 0;
    if (cant <= 0) return;

    // 2. Búsqueda
    let p = this.productos.find(prod => prod.nombre.toLowerCase() === nombreLimpio.toLowerCase());

    if (p) {
        // --- CASO A: TIENE TALLAS ---
        if (p.tallas && tallaElegida) {
            const stockTallaActual = parseFloat(p.tallas[tallaElegida]) || 0;
            // Sumamos a la talla específica y redondeamos
            p.tallas[tallaElegida] = Number((stockTallaActual + cant).toFixed(2));
            
            // 🔥 RECALCULO TOTAL (Composición): El total es la suma de sus tallas
            p.cantidad = Object.values(p.tallas).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        } else {
            // --- CASO B: SIN TALLAS ---
            p.cantidad = (parseFloat(p.cantidad) || 0) + cant;
        }

        // 3. REDONDEO DE PRECISIÓN SEGÚN UNIDAD
        p.cantidad = (p.unidad === 'Kg' || p.unidad === 'Lts') 
            ? Number(p.cantidad.toFixed(3)) 
            : Math.round(p.cantidad);

        // 4. PERSISTENCIA Y NOTIFICACIÓN
        this.sincronizar(); 
        
        // Al devolver stock, el centinela quita el "silencio" si el producto sale de alerta
        this.chequearSaludStock(p); 
        
        notificar(`🔄 Stock devuelto: ${p.nombre} +${cant}`, "exito");
    }
},

// Método para chequear salud del stock
chequearSaludStock(producto, cantidadASumarAlCalculo = 0, esSilencioso = false) {
    if (!producto || !producto.nombre) return "ok";
    
    const nombreKey = producto.nombre.toLowerCase().trim();
    const stockReal = parseFloat(producto.cantidad) || 0;
    const stockProyectado = stockReal - cantidadASumarAlCalculo;
    
    const unidad = producto.unidad || 'Und';
    // 🛡️ Blindaje: Si no hay stock mínimo definido, usamos valores lógicos por unidad
    const min = parseFloat(producto.stockMinimo) || (unidad === 'Kg' || unidad === 'Lts' ? 1.5 : 3);

    // 1. AGOTADO
    if (stockProyectado <= 0) {
        if (!esSilencioso && registrosSilencio[nombreKey] !== 'agotado_avisado') {
            notificar(`🚨 AGOTADO: ${producto.nombre}`, "error");
            registrosSilencio[nombreKey] = 'agotado_avisado';
        }
        return "agotado";
    } 

    // 2. STOCK BAJO
    if (stockProyectado <= min) {
        if (esSilencioso || registrosSilencio[nombreKey] === 'bajo_avisado' || registrosSilencio[nombreKey] === 'agotado_avisado') {
            return "bajo"; 
        }
        
        const cantFormato = (unidad === 'Kg' || unidad === 'Lts') ? stockProyectado.toFixed(2) : Math.round(stockProyectado);
        notificar(`⚠️ QUEDARÁ POCO: ${producto.nombre} (${cantFormato} ${unidad})`, "stock");
        
        registrosSilencio[nombreKey] = 'bajo_avisado';
        return "bajo";
    }

    // 3. REPOSICIÓN / OK
    if (stockProyectado > min) {
        registrosSilencio[nombreKey] = false;
    }
    return "ok";
},
    // 🛠️ MEJORADO: Ahora suma decimales correctamente y actualiza sin romper
guardar(nombre, cantidad, precio, unidad = 'Und', tallas = null, codigo = "", minManual = null, esEdicion = false) {
    if (!nombre) return false; 
    
    const nombreLimpio = nombre.trim();
    let codFinal = codigo ? String(codigo).trim() : "";
    
    if (!codFinal) {
        codFinal = `DOM-${Date.now()}`; 
    }
    
    let index = this.productos.findIndex(p => String(p.codigo) === codFinal);
    if (index === -1) {
        index = this.productos.findIndex(p => p.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    }

    const precioFinal = (precio === "" || precio === null) ? 0 : parseFloat(precio);
    const nuevaCant = parseFloat(cantidad) || 0;

    if (index !== -1) {
        const p = this.productos[index];

        if (esEdicion) {
            p.cantidad = nuevaCant; 
            if (tallas) p.tallas = {...tallas}; 
        } else {
            // Lógica de reposición: Sumamos a lo que ya hay
            p.cantidad = Number((p.cantidad + nuevaCant).toFixed(3)); 
            if (tallas) {
                if (!p.tallas || typeof p.tallas !== 'object') p.tallas = {};
                Object.keys(tallas).forEach(t => {
                    p.tallas[t] = Number(((p.tallas[t] || 0) + (parseFloat(tallas[t]) || 0)).toFixed(3));
                });
            }
        }

        if (precioFinal > 0) p.precio = precioFinal;
        p.nombre = nombreLimpio;
        p.unidad = unidad;
        p.codigo = codFinal; 
        if (minManual !== null) p.stockMinimo = parseFloat(minManual);
        
        const minActual = p.stockMinimo || (p.unidad === 'Kg' || p.unidad === 'Lts' ? 1.5 : 3);
        if (p.cantidad > minActual) {
            notificar(`✅ "${p.nombre}" actualizado correctamente`, "exito");
        } else {
            if (typeof this.chequearSaludStock === 'function') this.chequearSaludStock(p);
        }

    } else {
        // Registro de producto nuevo
        this.productos.push({
            id: Date.now(),
            nombre: nombreLimpio,
            cantidad: nuevaCant,
            precio: precioFinal,
            unidad: unidad,
            codigo: codFinal,
            stockMinimo: minManual !== null ? parseFloat(minManual) : (unidad === 'Kg' || unidad === 'Lts' ? 1.5 : 3),
            tallas: tallas || {}
        });
        notificar(`📦 Registrado: ${nombreLimpio}`, "stock");
    }
    
    try {
        // 🚀 INYECCIÓN CENTINELA:
        // Antes de sincronizar, reseteamos el estado de "visto" porque la data cambió.
        if (typeof Notificaciones !== 'undefined') {
            Notificaciones.resetVisto('inventario');
            Notificaciones.revisarTodo();
        }

        this.sincronizar(); 
        return true; 
    } catch (e) {
        console.error("Error en sincronización DOMINUS:", e);
        return false;
    }
},

// 🚀 NUEVO: Conecta el Escáner con la lógica de Inventario
gestionarEscaneo: function(codigo) {
    // 0. Detenemos cualquier lectura activa para evitar bucles
    if (typeof Scanner !== 'undefined' && Scanner.detener) Scanner.detener();

    const producto = this.buscarPorCodigo(codigo);

    if (producto) {
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
        // Caso B: Registrar nuevo
        notificar(`⚠️ Código nuevo: ${codigo}`, "info");
        
        const inputCod = document.getElementById('inv-codigo');
        const inputNom = document.getElementById('inv-nombre');

        if (inputCod) {
            inputCod.value = codigo;
            // Disparamos eventos para que cualquier listener se entere del cambio
            inputCod.dispatchEvent(new Event('input', { bubbles: true }));
            inputCod.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Subimos al inicio para que el usuario vea el formulario
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (inputNom) {
            // Bajamos el tiempo a 300ms para que se sienta más "instantáneo"
            setTimeout(() => {
                inputNom.focus();
                // Tip: esto ayuda a que el cursor se ponga al final del texto si hubiera algo
                inputNom.setSelectionRange(inputNom.value.length, inputNom.value.length);
            }, 300);
        }
    }
},

eliminar(id) {
    if (!id) return;

    const totalAntes = this.productos.length;
    
    // 1. Buscamos el producto antes de borrarlo para poder usar su nombre en la notificación
    const productoABorrar = this.productos.find(p => p.id == id);
    if (!productoABorrar) return;

    // 2. Filtrado con coerción de tipos segura (==)
    this.productos = this.productos.filter(p => p.id != id);
    
    // 3. Verificación de éxito
    if (this.productos.length < totalAntes) {
        
        // 🚀 MEJORA: Limpiar el ID de edición si era el producto que se estaba editando
        if (this.idEdicion == id) {
            this.idEdicion = null;
            if (typeof Controlador !== 'undefined') {
                Controlador.limpiarFormularioInventario();
            }
        }

        // 🚀 MEJORA: Limpiar el silencio del centinela para que no ocupe memoria
        const nombreKey = productoABorrar.nombre.toLowerCase().trim();
        if (typeof registrosSilencio !== 'undefined') {
            delete registrosSilencio[nombreKey];
        }

        this.sincronizar();
        
        // Notificación personalizada para que el usuario sepa QUÉ borró
        notificar(`🗑️ "${productoABorrar.nombre}" eliminado con éxito`, "error");
    }
},

    // --- LÓGICA DE CONTROL Y SINCRONIZACIÓN ---
sincronizar() {
    // 1. FILTRO DE INTEGRIDAD: Eliminamos basura y duplicados accidentales
    this.productos = this.productos.filter((p, index, self) => 
        p && p.nombre && p.id && self.findIndex(t => t.id === p.id) === index
    );

    // 🚀 ORDENAMIENTO: Mantenemos los productos en alerta arriba
    this.productos.sort((a, b) => {
        const minA = a.stockMinimo || (a.unidad === 'Kg' ? 1.5 : 3);
        const minB = b.stockMinimo || (b.unidad === 'Kg' ? 1.5 : 3);
        return (a.cantidad <= minA ? -1 : 1) - (b.cantidad <= minB ? -1 : 1);
    });

    // 2. GUARDADO EN DISCO (Delegamos el try/catch a Persistencia que ya lo tiene)
    Persistencia.guardar('dom_inventario', this.productos);

    // 3. ACTUALIZACIÓN DINÁMICA
    if (typeof this.actualizarDatalist === 'function') {
        this.actualizarDatalist(); // 🚀 Importante: para que el buscador de ventas se actualice
    }

    if (typeof Interfaz !== 'undefined' && Interfaz.renderInventario) {
        Interfaz.renderInventario();
    }
},

buscarPorCodigo: function(codigo) {
    // 1. Validación de entrada: Si el escáner mandó algo vacío, salimos rápido
    if (codigo === undefined || codigo === null || codigo === "") return null;
    
    // 2. Normalización: Aseguramos que sea texto y sin espacios laterales
    const codLimpio = String(codigo).trim();

    // 3. Verificación de Integridad: ¿Hay productos cargados?
    if (!this.productos || this.productos.length === 0) {
        console.warn("DOMINUS: Intento de búsqueda en inventario vacío o no inicializado.");
        return null;
    }

    // 4. Búsqueda con Protección: 
    // Usamos prod.codigo?. para que si un producto no tiene código, simplemente pase al siguiente
    return this.productos.find(prod => {
        if (!prod.codigo) return false;
        return String(prod.codigo).trim() === codLimpio;
    });
},

descontar(nombre, cantARestar, tallaElegida = null) {
    if (!this.activo) return true; 

    const nombreLimpio = nombre.split('(')[0].trim().replace("PUNTO: ", "");
    const p = this.productos.find(prod => prod.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    
    if (!p) return true;

    // 🛡️ BLINDAJE: Si tiene tallas, restamos de la talla y recalculamos el total
    if (p.tallas && Object.keys(p.tallas).length > 0) {
        if (tallaElegida && p.tallas[tallaElegida] !== undefined) {
            const stockTallaAnterior = parseFloat(p.tallas[tallaElegida]) || 0;
            
            // Restamos la cantidad que ya viene procesada (sea peso o unidad)
            p.tallas[tallaElegida] = Number((stockTallaAnterior - cantARestar).toFixed(3));
            
            // 🔄 RECALCULO TOTAL: El global es la suma de sus partes
            p.cantidad = Object.values(p.tallas).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        }
    } else {
        // Si no tiene tallas, resta directa al global
        const stockGlobalAnterior = parseFloat(p.cantidad) || 0;
        p.cantidad = stockGlobalAnterior - cantARestar;
    }

    // Redondeo final según unidad
    if (p.unidad === 'Kg' || p.unidad === 'Lts') {
        p.cantidad = Number(parseFloat(p.cantidad).toFixed(3));
    } else {
        p.cantidad = Number(parseFloat(p.cantidad).toFixed(2)); 
    }

    // 💾 Persistencia de datos
    this.sincronizar();

    // 🚀 INYECCIÓN CENTINELA:
    // Al descontar, avisamos al sistema para que actualice las burbujas de notificación del menú
    if (typeof Notificaciones !== 'undefined') {
        Notificaciones.revisarTodo();
    }

    return true; 
},
    // --- CEREBRO DE AUTO-APRENDIZAJE (PUNTO #5) ---
    
  aprenderDeVenta(nombre, precio) {
    // 1. Filtro de Entrada: Ignoramos nombres vacíos o muy cortos
    if (!nombre || nombre.trim().length < 2) return;
    
    // 2. Carga y Limpieza
    let dic = Persistencia.cargar('dom_diccionario_ventas') || [];
    const nombreLimpio = nombre.trim();
    const precioDecimal = parseFloat(precio) || 0;
    
    // Buscamos si ya lo conocemos (ignorando mayúsculas/minúsculas)
    const index = dic.findIndex(d => d.nombre.toLowerCase() === nombreLimpio.toLowerCase());

    if (index !== -1) {
        // 🚀 Si el precio cambió, lo actualizamos en memoria
        if (dic[index].price !== precioDecimal) {
            dic[index].precio = precioDecimal;
        }
        // Opcional: Podrías actualizar el nombre para respetar las mayúsculas actuales
        dic[index].nombre = nombreLimpio; 
    } else {
        // 🚀 Nuevo aprendizaje
        dic.push({ 
            nombre: nombreLimpio, 
            precio: precioDecimal,
            fecha: new Date().getTime() // Para saber qué tan viejo es el dato
        });
        
        // 🛡️ PROTECCIÓN DE MEMORIA: 
        // Si el diccionario supera los 300 productos, borramos el más viejo
        // para que el teléfono de tu papá siempre vuele.
        if (dic.length > 300) {
            dic.shift(); 
        }
        
        console.log(`🧠 DOMINUS: Nuevo conocimiento adquirido -> ${nombreLimpio}`);
    }

    // 3. Persistencia y Actualización de Interfaz
    Persistencia.guardar('dom_diccionario_ventas', dic);
    
    if (typeof this.actualizarDatalist === 'function') {
        this.actualizarDatalist();
    }
},

  buscarPrecioMemoria(nombre) {
    // 1. Validación de entrada: Si no hay nombre válido, no buscamos nada
    if (!nombre || typeof nombre !== 'string') return null;

    // 2. Carga segura del diccionario
    const dic = Persistencia.cargar('dom_diccionario_ventas') || [];
    if (dic.length === 0) return null;

    // 3. Búsqueda con normalización total
    // Limpiamos una sola vez antes del bucle para ahorrar procesador
    const nombreBusqueda = nombre.trim().toLowerCase();
    
    const p = dic.find(d => {
        // Verificamos que el elemento tenga nombre antes de comparar (blindaje)
        return d.nombre && d.nombre.trim().toLowerCase() === nombreBusqueda;
    });

    // 4. Retorno limpio
    // Si lo encuentra, asegura que el precio sea un número; si no, null.
    return p ? (parseFloat(p.precio) || 0) : null;
},

 actualizarDatalist() {
    const dl = document.getElementById('sugerencias-ventas'); 
    if (!dl) return;

    // Usamos el inventario real para que las sugerencias sean siempre de lo que HAY en stock
    const dic = this.productos; 
    
    // Construimos todo el HTML en memoria primero
    const html = dic.map(prod => 
        `<option value="${prod.nombre}" label="Sugerido: ${prod.precio}$"></option>`
    ).join('');
    
    dl.innerHTML = html; // Una sola operación de escritura al DOM (Mucho más rápido)
}
};
