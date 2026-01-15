const Ventas = {
    historial: Persistencia.cargar('dom_ventas') || [],
    deudas: Persistencia.cargar('dom_fiaos') || [],
    gastos: Persistencia.cargar('dom_gastos') || [], // Agrega esto aquí arriba

    init() {
        // Asegúrate de recargar los tres al iniciar
        this.historial = Persistencia.cargar('dom_ventas') || [];
        this.deudas = Persistencia.cargar('dom_fiaos') || [];
        this.gastos = Persistencia.cargar('dom_gastos') || [];
        if (typeof Inventario !== 'undefined') Inventario.init();
    },
  // Busca la función registrarVenta y reemplázala por esta:
registrarVenta(p, m, mon, met, cli) {
    const tasa = Conversor.tasaActual;
    const montoBs = (mon === 'USD') ? m * tasa : m;
    
    // EXTERMINADOR DE 1.66: 
    // Si la moneda es BS, el montoUSD ES CERO. PUNTO. 
    // No importa lo que diga el método o la tasa.
    let montoUSD = 0;
    if (mon === 'USD') {
        montoUSD = Number(m);
    }

    console.log(`DEBUG DOMINUS: Moneda=${mon}, Monto=${m}, CalculadoUSD=${montoUSD}`);

    const ahora = new Date();
    const datosVenta = {
        id: ahora.getTime(),
        fecha: ahora.toLocaleDateString('es-VE'),
        hora: ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
        producto: p,
        montoBs: Number(montoBs),
        montoUSD: Number(montoUSD), // Si aquí entra un 0, el PDF TIENE que mostrar 0
        moneda: mon,
        metodo: met
    };

    if (met === 'Fiao') {
        this.deudas.push({ ...datosVenta, cliente: cli || "Anónimo" });
        Persistencia.guardar('dom_fiaos', this.deudas);
    } else {
        this.historial.push(datosVenta);
        Persistencia.guardar('dom_ventas', this.historial);
    }
},
  registrarGasto(desc, m, mon) {
    const ahora = new Date();
    const montoBs = (mon === 'USD') ? m * Conversor.tasaActual : m;
    this.gastos.push({
        id: ahora.getTime(),
        descripcion: desc,
        montoBs: montoBs,
        fecha: ahora.toLocaleDateString('es-VE'),
        hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    Persistencia.guardar('dom_gastos', this.gastos);
},
    abonarDeuda(id, monto, mon, metodoPago) {
    const index = this.deudas.findIndex(d => d.id === Number(id));
    if (index !== -1) {
        const ahora = new Date();
        const abonoBs = (mon === 'USD') ? monto * Conversor.tasaActual : monto;
        
        // Restamos de la deuda
        this.deudas[index].montoBs -= abonoBs;
        
        // Registramos en el historial con fecha, hora y el método de pago elegido
        this.historial.push({
            id: ahora.getTime(),
            producto: `Abono: ${this.deudas[index].cliente}`,
            montoBs: abonoBs,
            metodo: metodoPago || `Abono ${mon}`, // Guardamos si fue Punto, Pago Móvil, etc.
            fecha: ahora.toLocaleDateString('es-VE'),
            hora: ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // Si la deuda llega a cero, la eliminamos
        if (this.deudas[index].montoBs <= 1) this.deudas.splice(index, 1);
        
        Persistencia.guardar('dom_fiaos', this.deudas);
        Persistencia.guardar('dom_ventas', this.historial);
        return true;
    }
    return false;
},

    eliminarDeuda(id) {
        this.deudas = this.deudas.filter(d => d.id !== Number(id));
        Persistencia.guardar('dom_fiaos', this.deudas);
    },

    // Dentro de Ventas = { ...
    getSugerencias() {
        // Extraemos solo los nombres de los productos del historial
        const nombres = this.historial.map(v => v.producto);
        // También sumamos los nombres de los productos en el inventario
        const nombresInv = Inventario.productos.map(p => p.nombre);
        
        // Unimos ambos, eliminamos duplicados y ordenamos por los más frecuentes
        const unicos = [...new Set([...nombres, ...nombresInv])];
        return unicos.slice(0, 10); // Retornamos las 10 mejores sugerencias
    },

finalizarJornada() {
        const ventas = Persistencia.cargar('dom_ventas') || [];
        const gastos = Persistencia.cargar('dom_gastos') || [];
        const hoy = new Date().toLocaleDateString('es-VE');
        const vHoy = ventas.filter(v => v.fecha === hoy);
        
        let efecBS = 0;
        let efecUSD = 0;
        let digital = 0;

        vHoy.forEach(v => {
            const mBs = Number(v.montoBs) || 0;
            const mUsd = Number(v.montoUSD) || 0;
            if (mUsd > 0) {
                efecUSD += mUsd;
            } else if (v.metodo.includes('Pago') || v.metodo.includes('Punto')) {
                digital += mBs;
            } else if (v.metodo !== 'Fiao') {
                efecBS += mBs;
            }
        });

        const totalGastos = gastos.filter(g => g.fecha === hoy)
                                  .reduce((acc, g) => acc + (Number(g.montoBs) || 0), 0);

        return {
            efectivoBS: efecBS,
            efectivoUSD: efecUSD,
            digital: digital,
            gastos: totalGastos
        };
    },

    limpiarJornada() {
        this.historial = [];
        Persistencia.guardar('dom_ventas', []);
        Persistencia.guardar('dom_gastos', []);
        console.log("DOMINUS: Jornada limpiada.");
    }
};
