// Este archivo contiene datos de ejemplo para los módulos que aún no están conectados a la base de datos.
// Actualmente, se usa para el módulo de Ventas.

// --- DATOS PARA CONFIGURACIÓN DE VENTAS ---
export const mockVentasConfig = {
  requiereAprobacionCotizacion: true,
  pedidoTieneVencimiento: true,
  diasVencimientoPedido: 15,
  vencimientoEsFlexible: true,
  habilitarObras: true,
};

// --- DATOS PARAMETRIZABLES ---

export const mockProvincias = [
    { id: 1, nombre: 'Buenos Aires' },
    { id: 2, nombre: 'Santa Fe' },
    { id: 3, nombre: 'Córdoba' },
];

export const mockLocalidades = [
    { id: 1, nombre: 'CABA' },
    { id: 2, nombre: 'Rosario' },
    { id: 3, nombre: 'Córdoba' },
    { id: 4, nombre: 'Pilar' },
];

export const mockZonas = [
    { id: 1, nombre: 'Núñez' },
    { id: 2, nombre: 'Microcentro' },
    { id: 3, nombre: 'Parque Industrial' },
    { id: 4, nombre: 'Zona Portuaria' },
    { id: 5, nombre: 'Centro' },
];

export const mockTiposDeObra = [
    { id: 1, nombre: 'Edificio en Altura' },
    { id: 2, nombre: 'Nave Industrial' },
    { id: 3, nombre: 'Vivienda Unifamiliar' },
];

export const mockCondicionesIVA = [
    { id: 1, nombre: 'Responsable Inscripto' },
    { id: 2, nombre: 'Monotributista' },
    { id: 3, nombre: 'Exento' },
    { id: 4, nombre: 'Consumidor Final' },
];

export const mockAlicuotasIVA = [
    { id: 1, nombre: 'IVA 21%', valor: 21 },
    { id: 2, nombre: 'IVA 10.5%', valor: 10.5 },
    { id: 3, nombre: 'IVA 27%', valor: 27 },
    { id: 4, nombre: 'Exento', valor: 0 },
];

export const mockPercepciones = [
    { id: 1, nombre: 'Percepción IIBB CABA 3%', valor: 3 },
    { id: 2, nombre: 'Percepción IIBB GBA 2.5%', valor: 2.5 },
];

// --- DATOS PARA EL MÓDULO DE VENTAS ---

export const mockClientes = [
  { 
    id: 1, 
    codigo: 'C0001',
    razon_social: 'Constructora del Sur S.A.', 
    nombre_fantasia: 'Constructora del Sur',
    cuit: '30-11223344-5', 
    dni: null,
    domicilio: 'Av. Libertador 5000',
    localidad: { id: 1, nombre: 'CABA' },
    provincia: { id: 1, nombre: 'Buenos Aires' },
    zona: { id: 1, nombre: 'Núñez' },
    telefono1: '11-4555-1234',
    telefono2: '',
    email: 'compras@constructoradelsur.com',
    fecha_alta: '2023-01-15',
    categoria: 'Grande',
    condicion_iva: { id: 1, nombre: 'Responsable Inscripto' },
    alicuota_iva: { id: 1, nombre: 'IVA 21%', valor: 21 },
    percepciones: [{ id: 1, nombre: 'Percepción IIBB CABA 3%', valor: 3 }],
    obras: [
        { id: 10, nombre: 'Edificio Central', direccion: 'Av. Corrientes 1234, CABA', zona: { id: 2, nombre: 'Microcentro' }, responsable: 'Ing. Ramirez', telefono_responsable: '11-4555-8888', tipo_obra: { id: 1, nombre: 'Edificio en Altura' } },
        { id: 11, nombre: 'Proyecto Norte', direccion: 'Ruta 9 Km 50, Pilar', zona: { id: 3, nombre: 'Parque Industrial' }, responsable: 'Arq. Soto', telefono_responsable: '11-4555-9999', tipo_obra: { id: 2, nombre: 'Nave Industrial' } },
    ]
  },
  { 
    id: 2, 
    codigo: 'C0002',
    razon_social: 'Hormigones del Litoral S.R.L.', 
    nombre_fantasia: 'Hormigones Litoral',
    cuit: '30-55667788-9', 
    dni: null,
    domicilio: 'Ruta 11 Km 150',
    localidad: { id: 2, nombre: 'Rosario' },
    provincia: { id: 2, nombre: 'Santa Fe' },
    zona: { id: 4, nombre: 'Zona Portuaria' },
    telefono1: '341-499-5555',
    telefono2: '',
    email: 'info@hormigoneslitoral.com',
    fecha_alta: '2023-02-20',
    categoria: 'Mediano', 
    condicion_iva: { id: 1, nombre: 'Responsable Inscripto' },
    alicuota_iva: { id: 1, nombre: 'IVA 21%', valor: 21 },
    percepciones: [],
    obras: [] 
  },
  { 
    id: 3, 
    codigo: 'C0003',
    razon_social: 'Juan Pérez', 
    nombre_fantasia: 'Juan Pérez',
    cuit: '20-99887766-1', 
    dni: '99.887.766',
    domicilio: 'San Martín 345',
    localidad: { id: 3, nombre: 'Córdoba' },
    provincia: { id: 3, nombre: 'Córdoba' },
    zona: { id: 5, nombre: 'Centro' },
    telefono1: '351-433-2211',
    telefono2: '',
    email: 'juanperez@email.com',
    fecha_alta: '2023-05-10',
    categoria: 'Pequeño', 
    condicion_iva: { id: 2, nombre: 'Monotributista' },
    alicuota_iva: { id: 4, nombre: 'Exento', valor: 0 },
    percepciones: [],
    obras: [] 
  },
];
export const mockCategoriasCliente = ['Grande', 'Mediano', 'Pequeño', 'Consumidor Final'];

export const mockVendedores = [
  { id: 1, nombre: 'Ana García' },
  { id: 2, nombre: 'Carlos Rodriguez' },
];

export const mockArticulosVenta = [
  { id: 101, codigo: 'H-21', nombre: 'Hormigón H-21', precio_lista: 15000, unidad_medida: 'm³' },
  { id: 102, codigo: 'H-30', nombre: 'Hormigón H-30', precio_lista: 18500, unidad_medida: 'm³' },
  { id: 103, codigo: 'SERV-BOMB', nombre: 'Servicio de Bombeo', precio_lista: 5000, unidad_medida: 'hr' },
];

export const mockPedidosVenta = [
  {
    id: 2001,
    tipo: 'COTIZACION',
    fecha_documento: '2023-10-01',
    cliente: mockClientes[0],
    vendedor: mockVendedores[0],
    total: 45000,
    estado: 'PENDIENTE', // PENDIENTE, APROBADO, RECHAZADO
    detalle: [
      { articulo: mockArticulosVenta[0], cantidad: 3, precio_unitario: 15000 },
    ],
  },
  {
    id: 2002,
    tipo: 'COTIZACION',
    fecha_documento: '2023-10-03',
    cliente: mockClientes[1],
    vendedor: mockVendedores[1],
    total: 37000,
    estado: 'APROBADO', // PENDIENTE, APROBADO, RECHAZADO
    detalle: [
      { articulo: mockArticulosVenta[1], cantidad: 2, precio_unitario: 18500 },
    ],
  },
  {
    id: 1001,
    tipo: 'PEDIDO',
    fecha_documento: '2023-10-05',
    cliente: mockClientes[1],
    vendedor: mockVendedores[1],
    total: 275000,
    con_bomba: false,
    estado_entrega: 'PARCIAL', // PENDIENTE, PARCIAL, ENTREGADO, ANULADO
    estado_facturacion: 'PARCIAL', // PENDIENTE, PARCIAL, FACTURADO, ANULADO
    estado_pago: 'PENDIENTE',
    detalle: [
      { articulo: mockArticulosVenta[0], cantidad: 10, cantidad_entregada: 5, cantidad_facturada: 5, precio_unitario: 15000 },
      { articulo: mockArticulosVenta[1], cantidad: 5, cantidad_entregada: 0, cantidad_facturada: 0, precio_unitario: 25000 },
    ],
  },
  {
    id: 1002,
    tipo: 'PEDIDO',
    fecha_documento: '2023-10-10',
    cliente: mockClientes[2],
    vendedor: mockVendedores[0],
    total: 35000,
    con_bomba: true,
    estado_entrega: 'ENTREGADO',
    estado_facturacion: 'FACTURADO',
    estado_pago: 'PAGO PARCIAL',
    detalle: [
      { articulo: mockArticulosVenta[0], cantidad: 2, cantidad_entregada: 2, cantidad_facturada: 2, precio_unitario: 15000 },
      { articulo: mockArticulosVenta[2], cantidad: 1, cantidad_entregada: 1, cantidad_facturada: 1, precio_unitario: 5000 },
    ],
  },
  {
    id: 1003,
    tipo: 'PEDIDO',
    fecha_documento: '2023-10-12',
    cliente: mockClientes[0],
    vendedor: mockVendedores[1],
    total: 18500,
    con_bomba: false,
    estado_entrega: 'ENTREGADO',
    estado_facturacion: 'FACTURADO',
    estado_pago: 'PAGADO',
    detalle: [
      { articulo: mockArticulosVenta[1], cantidad: 1, cantidad_entregada: 1, cantidad_facturada: 1, precio_unitario: 18500 },
    ],
  },
  {
    id: 1004,
    tipo: 'PEDIDO',
    fecha_documento: '2023-09-20',
    cliente: mockClientes[1],
    vendedor: mockVendedores[0],
    total: 30000,
    con_bomba: false,
    estado_entrega: 'ANULADO',
    estado_facturacion: 'ANULADO',
    estado_pago: 'N/A',
    detalle: [
      { articulo: mockArticulosVenta[0], cantidad: 2, cantidad_entregada: 0, cantidad_facturada: 0, precio_unitario: 15000 },
    ],
  },
  {
    id: 1005,
    tipo: 'PEDIDO',
    fecha_documento: '2023-10-15',
    cliente: mockClientes[0],
    vendedor: mockVendedores[0],
    total: 92500,
    con_bomba: true,
    estado_entrega: 'PENDIENTE',
    estado_facturacion: 'PENDIENTE',
    estado_pago: 'N/A',
    detalle: [
      { articulo: mockArticulosVenta[1], cantidad: 5, cantidad_entregada: 0, cantidad_facturada: 0, precio_unitario: 18500 },
    ],
  },
];

export const mockTalonarios = [
  {
    id: 1,
    nombre: 'Factura A (AFIP)',
    letra: 'A',
    punto_venta: '0001',
    ultimo_numero: 1234,
    es_fiscal: true,
    activo: true,
  },
  {
    id: 2,
    nombre: 'Factura B (AFIP)',
    letra: 'B',
    punto_venta: '0001',
    ultimo_numero: 5678,
    es_fiscal: true,
    activo: true,
  },
  {
    id: 3,
    nombre: 'Venta Interna (No Fiscal)',
    letra: 'X',
    punto_venta: '9999',
    ultimo_numero: 100,
    es_fiscal: false,
    activo: true,
  },
];

export const mockFacturasVenta = [
    {
        id: 3001,
        pedido_id: 1002,
        talonario: mockTalonarios[1], // Factura B
        numero_factura: 5679, // El siguiente al último número
        fecha_factura: '2023-10-11',
        cliente: mockClientes[2],
        total: 35000,
        estado: 'PENDIENTE DE PAGO', // PENDIENTE DE PAGO, PAGADA, ANULADA
        detalle: mockPedidosVenta.find(p => p.id === 1002).detalle,
    },
    {
        id: 3002,
        pedido_id: 1003,
        talonario: mockTalonarios[0], // Factura A
        numero_factura: 1235, // El siguiente al último número
        fecha_factura: '2023-10-13',
        cliente: mockClientes[0],
        total: 18500,
        estado: 'PAGADA', // PENDIENTE DE PAGO, PAGADA, ANULADA
        detalle: mockPedidosVenta.find(p => p.id === 1003).detalle,
    }
];

export const mockRecibosVenta = [
    {
        id: 5001,
        factura_id: 3001, // Factura de Juan Pérez
        numero_recibo: 'RC-0001-0000123',
        fecha_recibo: '2023-10-20',
        monto: 15000,
        metodo_pago: 'Efectivo',
    },
    {
        id: 5002,
        factura_id: 3001, // Otra parte del pago de la factura de Juan Pérez
        numero_recibo: 'RC-0001-0000125',
        fecha_recibo: '2023-10-25',
        monto: 10000,
        metodo_pago: 'Transferencia',
    },
    {
        id: 5003,
        factura_id: 3002, // Factura de Constructora del Sur S.A.
        numero_recibo: 'RC-0001-0000124',
        fecha_recibo: '2023-10-15',
        monto: 18500, // Pago completo
        metodo_pago: 'Cheque',
    }
];

export const mockRemitosVenta = [
    {
        id: 7001,
        pedido_id: 1001,
        numero_remito: 'R-0001-0000055',
        fecha_remito: '2023-10-06',
        planta_origen: 'Planta Norte', // Este dato es clave para logística
        detalle: [
            { articulo: mockArticulosVenta[0], cantidad_entregada: 5 }, // Entrega parcial de este item
        ]
    },
    {
        id: 7002,
        pedido_id: 1002,
        numero_remito: 'R-0001-0000056',
        fecha_remito: '2023-10-11',
        planta_origen: 'Planta Central',
        detalle: [
            { articulo: mockArticulosVenta[0], cantidad_entregada: 2 },
            { articulo: mockArticulosVenta[2], cantidad_entregada: 1 },
        ]
    }
];

// --- DATOS PARA PRODUCCIÓN ---

// Materias Primas (simuladas dentro de los artículos de venta por ahora)
export const mockMateriasPrimas = [
    { id: 201, codigo: 'CEM-01', nombre: 'Cemento Portland', unidad_medida: 'kg' },
    { id: 202, codigo: 'ARE-01', nombre: 'Arena Fina', unidad_medida: 'kg' },
    { id: 203, codigo: 'PIE-01', nombre: 'Piedra Partida', unidad_medida: 'kg' },
    { id: 204, codigo: 'ADI-01', nombre: 'Aditivo Superplastificante', unidad_medida: 'L' },
];

// Fórmulas (BOM)
export const mockFormulas = [
    {
        id: 1,
        articulo_terminado_id: 101, // Hormigón H-21
        nombre: 'Fórmula Estándar H-21',
        version: 1,
        cantidad_base: 1, // La receta es para 1 m³
        activa: true,
        detalle: [
            { articulo: mockMateriasPrimas[0], cantidad: 300 }, // Cemento
            { articulo: mockMateriasPrimas[1], cantidad: 650 }, // Arena
            { articulo: mockMateriasPrimas[2], cantidad: 950 }, // Piedra
            { articulo: mockMateriasPrimas[3], cantidad: 5 },   // Aditivo
        ]
    },
    {
        id: 2,
        articulo_terminado_id: 102, // Hormigón H-30
        nombre: 'Fórmula Estándar H-30',
        version: 1,
        cantidad_base: 1, // La receta es para 1 m³
        activa: true,
        detalle: [
            { articulo: mockMateriasPrimas[0], cantidad: 350 }, // Cemento
            { articulo: mockMateriasPrimas[1], cantidad: 600 }, // Arena
            { articulo: mockMateriasPrimas[2], cantidad: 900 }, // Piedra
            { articulo: mockMateriasPrimas[3], cantidad: 7 },   // Aditivo
        ]
    }
];

// Órdenes de Producción
export const mockOrdenesProduccion = [
    {
        id: 8001,
        fecha_creacion: '2023-10-25',
        fecha_programada: '2023-10-26',
        articulo_terminado: mockArticulosVenta[0], // H-21
        cantidad_a_producir: 50,
        formula: mockFormulas[0],
        estado: 'PENDIENTE', // PENDIENTE, EN_PROCESO, FINALIZADA, CANCELADA
        pedido_venta_id: 1005, // Opcional: vinculada a un pedido de venta
    },
    {
        id: 8002,
        fecha_creacion: '2023-10-24',
        fecha_programada: '2023-10-25',
        articulo_terminado: mockArticulosVenta[1], // H-30
        cantidad_a_producir: 25,
        formula: mockFormulas[1],
        estado: 'EN_PROCESO',
        pedido_venta_id: null,
    },
    {
        id: 8003,
        fecha_creacion: '2023-10-23',
        fecha_programada: '2023-10-24',
        articulo_terminado: mockArticulosVenta[0], // H-21
        cantidad_a_producir: 100,
        formula: mockFormulas[0],
        estado: 'FINALIZADA',
        pedido_venta_id: 1001,
    }
];

// --- DATOS PARA LOGÍSTICA ---

export const mockLogisticaConfig = {
    tiempoCargaFijo: 5, // minutos
    ratioCarga: 1.5, // minutos por m³
    tiempoCicloPlanta: 10, // minutos para papeleo, lavado, etc.
    tiempoDescargaFijo: 15, // minutos para posicionarse en obra
    ratioDescarga: 2.5, // minutos por m³
    usaApiGoogleMaps: true, // para habilitar/deshabilitar cálculo de viaje con API
};

export const mockPlantas = [
    { id: 1, nombre: 'Planta Norte', direccion: 'Panamericana Km 50, Pilar', latitud: -34.4423, longitud: -58.9135 },
    { id: 2, nombre: 'Planta Central', direccion: 'Av. Gral Paz 1000, CABA', latitud: -34.6097, longitud: -58.5222 },
    { id: 3, nombre: 'Planta Oeste', direccion: 'Acceso Oeste Km 30, Moreno', latitud: -34.6534, longitud: -58.7918 },
];

export const mockChoferes = [
    { id: 1, nombre: 'Carlos Sanchez', legajo: 'CH-001', dni: '25.111.222', activo: true },
    { id: 2, nombre: 'Luis Gonzalez', legajo: 'CH-002', dni: '28.333.444', activo: true },
    { id: 3, nombre: 'Miguel Rodriguez', legajo: 'CH-003', dni: '30.555.666', activo: false },
];

export const mockCamiones = [
    { id: 1, patente: 'AA123BC', marca: 'Mercedes-Benz', modelo: 'Atron', capacidad_m3: 8, activo: true, chofer_asignado_id: 1 },
    { id: 2, patente: 'AB456CD', marca: 'Scania', modelo: 'P360', capacidad_m3: 10, activo: true, chofer_asignado_id: null },
    { id: 3, patente: 'AC789DE', marca: 'Iveco', modelo: 'Tector', capacidad_m3: 8, activo: false, chofer_asignado_id: null },
];

export const mockBombas = [
    { id: 1, identificacion: 'Bomba 01', tipo: 'Pluma', alcance_m: 24, activo: true },
    { id: 2, identificacion: 'Bomba 02', tipo: 'Arrastre', alcance_m: 100, activo: true },
];

// --- DATOS PARA PROGRAMACIÓN DE ENTREGAS ---

const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);
const dayAfterTomorrow = new Date();
dayAfterTomorrow.setDate(today.getDate() + 3); // A few days later
const nextMonth = new Date();
nextMonth.setMonth(today.getMonth() + 1);
nextMonth.setDate(5); // 5th of next month

const toISODateString = (d) => d.toISOString().split('T')[0];


export const mockViajesProgramados = [
    // Viajes para el Pedido 1001 (que tiene 10m3 de H-21 y 5m3 de H-30 pendientes)
    {
        id: 9001,
        pedido_id: 1001,
        articulo: mockArticulosVenta[0], // H-21
        cantidad: 8, // un viaje de 8m3
        fecha_programada: toISODateString(today), // para hoy
        hora_programada: '09:00',
        estado: 'PENDIENTE', // PENDIENTE, ASIGNADO, EN_VIAJE, ENTREGADO
        planta_id: null,
        camion_id: null,
        chofer_id: null,
        bomba_id: null,
        remito_id: null,
        // Tiempos TEÓRICOS (calculados por el algoritmo)
        hora_inicio_carga_teorica: null,
        hora_fin_carga_teorica: null,
        hora_salida_planta_teorica: null,
        hora_llegada_obra_teorica: null,
        hora_inicio_descarga_teorica: null,
        hora_fin_descarga_teorica: null,
        hora_llegada_planta_teorica: null,
        // Tiempos REALES (recibidos desde la app del chofer)
        hora_inicio_carga_real: null,
        hora_fin_carga_real: null,
        hora_salida_planta_real: null,
        hora_llegada_obra_real: null,
        hora_inicio_descarga_real: null,
        hora_fin_descarga_real: null,
        hora_llegada_planta_real: null,
    },
    {
        id: 9002,
        pedido_id: 1001,
        articulo: mockArticulosVenta[0], // H-21
        cantidad: 2, // el resto de H-21
        fecha_programada: toISODateString(today), // para hoy
        hora_programada: '11:00',
        estado: 'PENDIENTE',
        planta_id: null,
        camion_id: null,
        chofer_id: null,
        bomba_id: null,
        remito_id: null,
        // Tiempos TEÓRICOS
        hora_inicio_carga_teorica: null,
        hora_fin_carga_teorica: null,
        hora_salida_planta_teorica: null,
        hora_llegada_obra_teorica: null,
        hora_inicio_descarga_teorica: null,
        hora_fin_descarga_teorica: null,
        hora_llegada_planta_teorica: null,
        // Tiempos REALES
        hora_inicio_carga_real: null,
        hora_fin_carga_real: null,
        hora_salida_planta_real: null,
        hora_llegada_obra_real: null,
        hora_inicio_descarga_real: null,
        hora_fin_descarga_real: null,
        hora_llegada_planta_real: null,
    },
    // Viaje para el Pedido 1005 (que tiene 5m3 de H-30 pendientes)
    {
        id: 9003,
        pedido_id: 1005,
        articulo: mockArticulosVenta[1], // H-30
        cantidad: 5,
        fecha_programada: toISODateString(today), // para hoy
        hora_programada: '14:00',
        estado: 'ASIGNADO',
        planta_id: 1, // Planta Norte
        camion_id: 1, // AA123BC
        chofer_id: 1, // Carlos Sanchez
        bomba_id: 1,
        remito_id: null,
        // Tiempos TEÓRICOS
        hora_inicio_carga_teorica: '14:00',
        hora_fin_carga_teorica: '14:18',
        hora_salida_planta_teorica: '14:28',
        hora_llegada_obra_teorica: '15:03',
        hora_inicio_descarga_teorica: '15:18',
        hora_fin_descarga_teorica: '15:31',
        hora_llegada_planta_teorica: '16:11',
        // Tiempos REALES
        hora_inicio_carga_real: '14:05', // 5 min de demora
        hora_fin_carga_real: '14:28', // 10 min de demora
        hora_salida_planta_real: null,
        hora_llegada_obra_real: null,
        hora_inicio_descarga_real: null,
        hora_fin_descarga_real: null,
        hora_llegada_planta_real: null,
    },
    // --- NUEVOS DATOS ---
    {
        id: 9004,
        pedido_id: 1001,
        articulo: mockArticulosVenta[1], // H-30
        cantidad: 5,
        fecha_programada: toISODateString(tomorrow), // para mañana
        hora_programada: '08:30',
        estado: 'PENDIENTE',
        planta_id: null, camion_id: null, chofer_id: null, bomba_id: null, remito_id: null,
        hora_inicio_carga_teorica: null, hora_fin_carga_teorica: null,
        hora_salida_planta_teorica: null, hora_llegada_obra_teorica: null,
        hora_inicio_descarga_teorica: null, hora_fin_descarga_teorica: null,
        hora_llegada_planta_teorica: null, hora_inicio_carga_real: null,
        hora_fin_carga_real: null, hora_salida_planta_real: null,
        hora_llegada_obra_real: null, hora_inicio_descarga_real: null,
        hora_fin_descarga_real: null, hora_llegada_planta_real: null,
    },
    {
        id: 9005,
        pedido_id: 1005,
        articulo: mockArticulosVenta[1], // H-30
        cantidad: 8,
        fecha_programada: toISODateString(tomorrow), // para mañana
        hora_programada: '10:00',
        estado: 'PENDIENTE',
        planta_id: null, camion_id: null, chofer_id: null, bomba_id: null, remito_id: null,
        hora_inicio_carga_teorica: null, hora_fin_carga_teorica: null,
        hora_salida_planta_teorica: null, hora_llegada_obra_teorica: null,
        hora_inicio_descarga_teorica: null, hora_fin_descarga_teorica: null,
        hora_llegada_planta_teorica: null, hora_inicio_carga_real: null,
        hora_fin_carga_real: null, hora_salida_planta_real: null,
        hora_llegada_obra_real: null, hora_inicio_descarga_real: null,
        hora_fin_descarga_real: null, hora_llegada_planta_real: null,
    },
    {
        id: 9006,
        pedido_id: 1001,
        articulo: mockArticulosVenta[0], // H-21
        cantidad: 6,
        fecha_programada: toISODateString(dayAfterTomorrow), // para pasado mañana
        hora_programada: '09:00',
        estado: 'PENDIENTE',
        planta_id: null, camion_id: null, chofer_id: null, bomba_id: null, remito_id: null,
        hora_inicio_carga_teorica: null, hora_fin_carga_teorica: null,
        hora_salida_planta_teorica: null, hora_llegada_obra_teorica: null,
        hora_inicio_descarga_teorica: null, hora_fin_descarga_teorica: null,
        hora_llegada_planta_teorica: null, hora_inicio_carga_real: null,
        hora_fin_carga_real: null, hora_salida_planta_real: null,
        hora_llegada_obra_real: null, hora_inicio_descarga_real: null,
        hora_fin_descarga_real: null, hora_llegada_planta_real: null,
    },
    {
        id: 9007,
        pedido_id: 1005,
        articulo: mockArticulosVenta[1], // H-30
        cantidad: 7,
        fecha_programada: toISODateString(nextMonth), // para el mes que viene
        hora_programada: '11:30',
        estado: 'PENDIENTE',
        planta_id: null, camion_id: null, chofer_id: null, bomba_id: null, remito_id: null,
        hora_inicio_carga_teorica: null, hora_fin_carga_teorica: null,
        hora_salida_planta_teorica: null, hora_llegada_obra_teorica: null,
        hora_inicio_descarga_teorica: null, hora_fin_descarga_teorica: null,
        hora_llegada_planta_teorica: null, hora_inicio_carga_real: null,
        hora_fin_carga_real: null, hora_salida_planta_real: null,
        hora_llegada_obra_real: null, hora_inicio_descarga_real: null,
        hora_fin_descarga_real: null, hora_llegada_planta_real: null,
    },
];
