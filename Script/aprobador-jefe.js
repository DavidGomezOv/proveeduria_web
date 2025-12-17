const API_ORDERS_URL = 'http://localhost:8080/api/orders/approver';
const ORDERS_HISTORY_API_URL = 'http://localhost:8080/api/orders/history';
const FINANCIAL_REPORT_API_URL = 'http://localhost:8080/api/reports/financial-report';
const STATUS_APROBADA_JEFE = 3;
const STATUS_RECHAZADA_JEFE = 5;

let modalRechazar;
let modalAceptar;
let modalDetalles;
let solicitudActual;
let chartInstance;
let userId;

let solicitudesPendientes = [];
let historialCompleto = [];

// Verificar autenticación
window.addEventListener('DOMContentLoaded', function () {
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));

    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Validar rol por NOMBRE
    if (usuario.rol !== 'Aprobador Jefe') {
        alert('No tienes permisos para acceder a esta página');
        window.location.href = 'login.html';
        return;
    }

    // **1. OBTENER ID DEL USUARIO LOGGEADO**
    // Asumimos que el objeto 'usuario' tiene un campo 'id' o 'userId'
    // Usaremos 'id' por convención, si es diferente, ajusta esta línea:
    userId = usuario.id || usuario.userId || 2; // Usamos 2 como fallback si no existe el id en la sesión
    console.log('Usuario Aprobador ID:', userId);


    // Inicializar modales
    modalRechazar = new bootstrap.Modal(document.getElementById('rechazarModal'));
    modalAceptar = new bootstrap.Modal(document.getElementById('aceptarModal'));
    modalDetalles = new bootstrap.Modal(document.getElementById('detallesModal'));

    // **2. Cargar solicitudes y historial**
    cargarSolicitudes();
    cargarHistorial();
    cargarReporteInicial();
});

function showSection(section) {
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });

    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(`${section}-section`).classList.add('active');
    event.target.classList.add('active');
}

function getStatusClass(statusString) {
    const status = statusString.toLowerCase();

    if (status.includes('aprobada')) {
        return 'aprobada';
    } else if (status.includes('rechazada') || status.includes('anulada')) {
        return 'rechazada';
    } else if (status.includes('pendiente')) {
        return 'pendiente';
    }
    return '';
}

// **3. Función para cargar solicitudes desde la API**
async function cargarSolicitudes() {
    const container = document.getElementById('solicitudesContainer');
    // Mostrar mensaje de carga mientras llega la respuesta
    container.innerHTML = '<p class="text-center">Cargando solicitudes...</p>';

    // Construir la URL con el ID del usuario
    const url = `${API_ORDERS_URL}/${userId}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error al cargar solicitudes: ${response.status}`);
        }

        const solicitudes = await response.json();

        solicitudesPendientes = solicitudes; 

        if (solicitudes.length === 0) {
            container.innerHTML = '<p class="text-center">No hay solicitudes pendientes de aprobación.</p>';
            return;
        }

        // 4. Mapear y mostrar las solicitudes en las tarjetas
        container.innerHTML = solicitudes.map(sol => {
            // Formatear el monto total
            const totalFormatted = sol.totalAmmount.toLocaleString('es-CR', {
                style: 'currency',
                currency: 'CRC',
                minimumFractionDigits: 2
            });

            const statusText = sol.status.status;
            const statusClass = getStatusClass(statusText);

            return `
                <div class="solicitud-card" data-id="${sol.orderId}">
                    <div class="solicitud-info">
                        <div class="solicitud-header">Solicitud ID: ${sol.orderId}</div>
                        <div class="solicitud-row">
                            <div class="solicitud-label">Comprador</div>
                            <div class="solicitud-value">${sol.buyerName}</div>
                        </div>
                        <div class="solicitud-row">
                            <div class="solicitud-label">Monto Total</div>
                            <div class="solicitud-value total-amount">${totalFormatted}</div>
                        </div>
                        <div class="solicitud-row">
                            <div class="solicitud-label">Estado</div>
                            <div class="historial-value ${statusClass}">${statusText}</div>
                        </div>
                    </div>
                    <div class="solicitud-buttons">
                        <button class="btn-detalles" onclick="verDetallesSolicitud(${sol.orderId}, 1)">Ver Detalles</button>
                        <button class="btn-rechazar" onclick="abrirModalRechazo(${sol.orderId}, '${sol.orderId}')">Rechazar</button>
                        <button class="btn-aceptar" onclick="abrirModalAceptar(${sol.orderId})">Aceptar</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error cargando solicitudes:', error);
        container.innerHTML = '<p class="text-center text-danger">Error al cargar las solicitudes. Intente de nuevo más tarde.</p>';
    }
}

// Ver detalles
function verDetallesSolicitud(id, source) {
    let ordenes;
    
    // Seleccionar el array correcto
    console.log(source)


    if (source === 1) {
        ordenes = solicitudesPendientes;
    } else if (source === 2) {
        ordenes = historialCompleto;
    } else {
        alert("Error de origen de datos.");
        return;
    }

    // 1. Buscar la solicitud en el historial cargado por la API
    const solicitud = ordenes.find(s => s.orderId === id);

    console.log(solicitud);

    if (!solicitud) {
        alert(`No se encontró la solicitud con ID ${id} en el historial.`);
        return;
    }

    // 2. Construir la tabla de productos
    let productosHtml = '';

    // Verificamos si el objeto 'solicitud' contiene el array de productos
    if (solicitud.products && solicitud.products.length > 0) {

        // Encabezado de la tabla
        productosHtml += `
            <h5 class="mb-3">Detalles de Productos</h5>
            <table class="table table-striped table-sm">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unitario</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Filas de la tabla, usando la nueva estructura simple
        solicitud.products.forEach(p => {
            // p ya contiene name, price y quantity directamente
            const unitPrice = p.price || 0;
            const productName = p.name || 'Producto Desconocido';
            const subtotal = p.quantity * unitPrice;

            // Función auxiliar para formato de moneda (puede ser definida globalmente)
            const currencyFormat = (num) => `₡${num.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;

            productosHtml += `
                <tr>
                    <td>${productName}</td>
                    <td>${p.quantity}</td>
                    <td>${currencyFormat(unitPrice)}</td>
                    <td>${currencyFormat(subtotal)}</td>
                </tr>
            `;
        });

        productosHtml += `</tbody></table>`;

    } else {
        productosHtml = '<p class="text-muted">No se encontraron detalles de productos para esta orden.</p>';
    }

    // 3. Montar el contenido completo del modal
    const totalFormatted = solicitud.totalAmmount.toLocaleString('es-CR', { minimumFractionDigits: 2 });

    document.getElementById('detallesTitulo').textContent = `Solicitud ID: ${solicitud.orderId}`;

    document.getElementById('detallesContenido').innerHTML = `
        <div class="row mb-4">
        
        <div class="col-12 mb-3"> 
            <div class="detalle-label">Estado:</div>
            <div class="detalle-value ${getStatusClass(solicitud.status.status)}">${solicitud.status.status}</div>
        </div>

        <div class="col-12">
            <div class="detalle-label">Comentario del Aprobador:</div>
            <div class="detalle-value text-wrap">${solicitud.comments.replace(/"/g, '') || 'N/A'}</div> 
        </div>
    </div>

        ${productosHtml}
        
        <div class="d-flex justify-content-end mt-4">
            <div class="total-final">
                <span class="detalle-label me-2" style="font-size: 1.1em; font-weight: bold;">MONTO TOTAL:</span>
                <span class="detalle-value" style="font-size: 1.2em; font-weight: bold;">₡${totalFormatted}</span>
            </div>
        </div>
    `;

    modalDetalles.show();
}

function cerrarModalDetalles() {
    modalDetalles.hide();
}

// Cargar historial de solicitudes desde la API
async function cargarHistorial() {
    const container = document.getElementById('historialContainer');
    // Mostrar mensaje de carga inicial
    container.innerHTML = '<p class="text-center">Cargando historial...</p>';

    try {
        const response = await fetch(ORDERS_HISTORY_API_URL);

        if (!response.ok) {
            throw new Error(`Error al cargar historial: ${response.status}`);
        }

        const historial = await response.json();

        historialCompleto = historial;

        if (historial.length === 0) {
            container.innerHTML = '<p class="text-center">No hay historial de solicitudes para mostrar.</p>';
            return;
        }

        // Mapear y mostrar las solicitudes históricas
        container.innerHTML = historial.map(hist => {
            // Formatear el monto total
            const totalFormatted = hist.totalAmmount.toLocaleString('es-CR', {
                style: 'currency',
                currency: 'CRC',
                minimumFractionDigits: 2
            });


            const statusText = hist.status.status;
            const statusClass = getStatusClass(statusText);

            return `
                <div class="historial-card">
                    <div class="historial-header">Solicitud ID: ${hist.orderId}</div>
                    <div class="historial-row">
                        <div class="historial-label">Comprador</div>
                        <div class="historial-value">${hist.buyerName}</div>
                    </div>
                    <div class="historial-row">
                        <div class="historial-label">Monto Total</div>
                        <div class="historial-value total-amount">${totalFormatted}</div>
                    </div>
                    <div class="historial-row">
                        <div class="historial-label">Estado</div>
                        <div class="historial-value ${statusClass}">${statusText}</div>
                    </div>
                    <div class="historial-row">
                        <div class="historial-label">Comentario</div>
                        <div class="historial-value">${hist.comments || 'Sin comentarios'}</div>
                    </div>
                    <div class="historial-row">
                        <button class="btn-detalles" onclick="verDetallesSolicitud(${hist.orderId}, 2)">Ver Detalles</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error cargando historial:', error);
        container.innerHTML = '<p class="text-center text-danger">Error al cargar el historial. Intente de nuevo más tarde.</p>';
    }
}

// Modal rechazar
function abrirModalRechazo(id, numero) {
    solicitudActual = id;
    document.getElementById('rechazarTexto').textContent = `¿Está seguro que desea rechazar la solicitud ${numero}?`;
    document.getElementById('comentarioRechazo').value = '';
    modalRechazar.show();
}

function cerrarModalRechazo() {
    modalRechazar.hide();
}

function confirmarRechazo() {
    // 1. Obtener datos
    const comentario = document.getElementById('comentarioRechazo').value;
    const orderId = solicitudActual;
    const statusId = STATUS_RECHAZADA_JEFE; // 5

    // 2. Ocultar el modal inmediatamente para dar feedback de respuesta
    modalRechazar.hide();

    // Codificar el comentario para la URL (muy importante para evitar errores de sintaxis)
    const encodedComments = encodeURIComponent(`"${comentario}"`);

    // NOTA: Usaremos la URL base ORDERS_APPROVER_API_URL, aunque la lógica es más de 'orders'
    const url = `http://localhost:8080/api/orders/${orderId}?status=${statusId}&comments=${encodedComments}`;

    fetch(url, {
        method: 'PUT',
        headers: {

        }
    })
        .then(response => {
            if (response.ok) {
                alert(`Solicitud ${orderId} rechazada exitosamente.`);

                cargarSolicitudes();
                cargarHistorial();
            } else {
                console.error('Error al rechazar solicitud:', response.status);
                alert('Error al rechazar la solicitud. Verifique la consola.');
            }
        })
        .catch(error => {
            console.error('Error de red al rechazar:', error);
            alert('Error de conexión al intentar rechazar la solicitud.');
        });
}

// Modal aceptar
function abrirModalAceptar(id) {
    solicitudActual = id;
    document.getElementById('comentarioAceptar').value = '';
    modalAceptar.show();
}

function cerrarModalAceptar() {
    modalAceptar.hide();
}

function confirmarAceptar() {
    // 1. Obtener datos
    const comentario = document.getElementById('comentarioAceptar').value;
    const orderId = solicitudActual;
    const statusId = STATUS_APROBADA_JEFE; // 3

    // 2. Ocultar el modal
    modalAceptar.hide();

    // 3. Realizar la solicitud a la API
    const encodedComments = encodeURIComponent(`"${comentario}"`);
    const url = `http://localhost:8080/api/orders/${orderId}?status=${statusId}&comments=${encodedComments}`;

    fetch(url, {
        method: 'PUT',
        headers: {
        }
    })
        .then(response => {
            if (response.ok) {
                alert(`Solicitud ${orderId} aprobada exitosamente.`);

                cargarSolicitudes();
                cargarHistorial();
            } else {
                console.error('Error al aprobar solicitud:', response.status);
                alert('Error al aprobar la solicitud. Verifique la consola.');
            }
        })
        .catch(error => {
            console.error('Error de red al aprobar:', error);
            alert('Error de conexión al intentar aprobar la solicitud.');
        });
}

function cargarReporteInicial() {
    inicializarGrafico();
    // Carga el reporte por defecto de 3 meses al iniciar la página
    filtrarReporte(3);
}

// Gráfico
function inicializarGrafico() {
    const ctx = document.getElementById('reporteChart').getContext('2d');

    // Destruye la instancia anterior si existe (importante al cambiar de reporte)
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar', // Tipo de gráfico de barras
        data: {
            labels: [], // Se llenará al cargar los datos
            datasets: [{
                label: 'Valor Financiero (CRC)',
                data: [], // Se llenará al cargar los datos
                backgroundColor: '#3d52a0',
                borderColor: '#1e2a5a',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    // Formato de moneda en el eje Y
                    ticks: {
                        callback: function (value) {
                            return '₡' + value.toLocaleString('es-CR');
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

async function filtrarReporte(meses) {
    // 1. Manejar el estado activo de los botones de filtro
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.classList.remove('active');
    });
    // Activa el botón que corresponde al filtro actual
    const activeBtn = document.querySelector(`.btn-filtro[onclick="filtrarReporte(${meses})"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    const totalValueElement = document.getElementById('reporteTotalValue');
    totalValueElement.textContent = 'Valor Total del Período: Cargando...';

    try {
        const url = `${FINANCIAL_REPORT_API_URL}?months=${meses}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error al cargar reporte: ${response.status}`);
        }

        const reportData = await response.json();

        // 2. Procesar datos para el gráfico
        // Etiqueta: Mes y Año (ej: Dic 2025)
        const labels = reportData.items.map(item => formatMonthYear(item.monthDate));
        // Valores: Monto financiero
        const dataValues = reportData.items.map(item => item.financialValue);

        // 3. Actualizar el gráfico
        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = dataValues;
            chartInstance.update();
        }

        // 4. Actualizar el valor total en el HTML
        const totalFormatted = reportData.periodFinancialValue.toLocaleString('es-CR', {
            style: 'currency',
            currency: 'CRC',
            minimumFractionDigits: 2
        });
        totalValueElement.textContent = `Valor Total del Período: ${totalFormatted}`;


    } catch (error) {
        console.error('Error cargando el reporte financiero:', error);
        totalValueElement.textContent = 'Valor Total del Período: Error al cargar.';
        alert('Error al cargar el reporte. Verifique la consola.');
    }
}

function cambiarReporte(numero) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    console.log(`Cambiar a reporte ${numero}`);
}

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        sessionStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }
}

function formatMonthYear(dateString) {
    const date = new Date(dateString); 
    
    const year = date.getUTCFullYear();
    const monthIndex = date.getUTCMonth();
    
    const monthNames = [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];
    
    const month = monthNames[monthIndex];
    
    return `${month} ${year}`;
}