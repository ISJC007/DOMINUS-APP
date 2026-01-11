const Ventas = {
    historial: [],
    deudas: [],

    init() {
        this.historial = Persistencia.cargar('dom_ventas') || [];
        this.deudas = Persistencia.cargar('dom_deudas') || [];
    },

    registrarVenta(nombre, montoOriginal, monedaOriginal, metodo) {
        let montoBs = 0;
        const montoNum = parseFloat(montoOriginal) || 0;

        // Convertimos todo a Bolívares para el registro base (lo que entró a caja)
        if (monedaOriginal === 'USD') {
            montoBs = montoNum * Conversor.tasaActual;
        } else {
            montoBs = montoNum;
        }

        const venta = {
            id: Date.now(),
            fecha: new Date().toLocaleString(),
            producto: nombre || "Producto",
            bs: montoBs, // Guardamos la base en Bs
            metodo: metodo
        };

        this.historial.push(venta);
        Persistencia.guardar('dom_ventas', this.historial);
        return venta;
    },

    registrarDeuda(cliente, montoOriginal, monedaOriginal, concepto) {
        const montoNum = parseFloat(montoOriginal) || 0;
        // El fiao es lo único que se guarda en $ porque es una promesa de valor
        let montoUsd = (monedaOriginal === 'Bs') ? montoNum / Conversor.tasaActual : montoNum;
        
        this.deudas.push({
            id: Date.now(),
            cliente: cliente,
            montoUsd: montoUsd,
            concepto: concepto,
            fecha: new Date().toLocaleDateString()
        });
        Persistencia.guardar('dom_deudas', this.deudas);
    },

    pagarDeuda(id, metodo) {
        const index = this.deudas.findIndex(d => d.id === id);
        if (index !== -1) {
            const d = this.deudas[index];
            // Al pagar, se registra como venta usando la tasa del momento del pago
            this.registrarVenta(`Pago Deuda: ${d.cliente}`, d.montoUsd, 'USD', metodo);
            this.deudas.splice(index, 1);
            Persistencia.guardar('dom_deudas', this.deudas);
        }
    }
};