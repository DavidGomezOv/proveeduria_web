const API_ORDERS_URL = 'http://localhost:8080/api/orders/approver';
const FINANCIAL_REPORT_API_URL = 'http://localhost:8080/api/reports/financial-report';


const STATUS_APROBADA_FINANCIERO = 2;
const STATUS_RECHAZADA_FINANCIERO = 4;

let chartInstance;
// Verificar autenticación y rol
window.addEventListener('DOMContentLoaded', function () {
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));

    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Validar rol por NOMBRE
    if (usuario.rol !== 'Aprobador Financiero') {
        alert('No tienes permisos para acceder a esta página');
        window.location.href = 'login.html';
        return;
    }

    // Inicializar modales
    modalRechazar = new bootstrap.Modal(document.getElementById('rechazarModal'));
    modalAceptar = new bootstrap.Modal(document.getElementById('aceptarModal'));

    cargarSolicitudes();
    cargarHistorial();
    cargarReporteInicial();
});

// Cambiar sección
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

// Gestión Solicitudes
async function cargarSolicitudes() {
    const container = document.getElementById('solicitudesContainer');
    container.innerHTML = '<p>Cargando solicitudes...</p>';

    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    const idApprover = usuario.id || usuario.idUsuario;

    console.log('ID Approver:', idApprover);

    try {
        const url = `${API_ORDERS_URL}/${idApprover}`;

        const response = await fetch(url);

        console.log('HTTP status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        const solicitudes = await response.json();
        console.log('Total de Solicitudes recibidas:', solicitudes.length);

        // =========================================================
        // === NUEVO: FILTRADO DE SOLICITUDES PENDIENTES ===
        // Los estados 2 (Aprobada por Financiero) y 4 (Rechazada por Financiero)
        // ya están gestionados y no deben aparecer en la gestión activa.
        const solicitudesPendientes = solicitudes.filter(sol =>
            sol.status.id !== STATUS_APROBADA_FINANCIERO && sol.status.id !== STATUS_RECHAZADA_FINANCIERO
        );
        // =========================================================

        console.log('Solicitudes Pendientes (para gestión):', solicitudesPendientes.length);

        if (solicitudesPendientes.length === 0) {
            container.innerHTML = '<p>No hay solicitudes pendientes de su aprobación.</p>';
            return;
        }

        container.innerHTML = solicitudesPendientes.map(sol => `
            <div class="solicitud-card">
                <div class="solicitud-info">
                    <div class="solicitud-header">
                        Orden #${sol.orderId}
                    </div>

                    <div class="solicitud-row">
                        <div class="solicitud-label">Comprador</div>
                        <div class="solicitud-value">${sol.buyerName}</div>
                    </div>

                    <div class="solicitud-row">
                        <div class="solicitud-label">Monto</div>
                        <div class="solicitud-value">
                            ₡${Number(sol.totalAmmount).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div class="solicitud-buttons">
                    <button class="btn-rechazar"
                        onclick="abrirModalRechazo(${sol.orderId})">
                        Rechazar
                    </button>

                    <button class="btn-aceptar"
                        onclick="abrirModalAceptar(${sol.orderId})">
                        Aprobar
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('ERROR REAL:', error.message);
        container.innerHTML = `<p>Error al cargar las solicitudes: ${error.message}</p>`;
    }
}

// Cargar historial
async function cargarHistorial() {
    const container = document.getElementById('historialContainer');
    container.innerHTML = '<p>Cargando historial...</p>';

    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    const idApprover = usuario.id || usuario.idUsuario;

    try {
        const url = `${API_ORDERS_URL}/${idApprover}`; // Mismo endpoint que gestión

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        const solicitudes = await response.json();

        // =========================================================
        // === NUEVO: FILTRADO DE SOLICITUDES HISTÓRICAS ===
        // Incluir solo estados 2 (Aprobada por Financiero) y 4 (Rechazada por Financiero).
        const historialFiltrado = solicitudes.filter(sol =>
            sol.status.id === STATUS_APROBADA_FINANCIERO || sol.status.id === STATUS_RECHAZADA_FINANCIERO
        );
        // =========================================================

        // Función auxiliar para clasificar el color del estado
        const getStatusClass = (statusId) => {
            if (statusId === 2) return 'aprobada'; // Debes tener esta clase definida en tu CSS
            if (statusId === 4) return 'rechazada'; // Debes tener esta clase definida en tu CSS
            return '';
        };


        if (historialFiltrado.length === 0) {
            container.innerHTML = '<p>No hay solicitudes en el historial de gestión.</p>';
            return;
        }

        container.innerHTML = historialFiltrado.map(hist => `
            <div class="historial-card">
                <div class="historial-header">Solicitud #${hist.orderId}</div>
                <div class="historial-row">
                    <div class="historial-label">Comprador</div>
                    <div class="historial-value">${hist.buyerName}</div>
                </div>
                <div class="historial-row">
                    <div class="historial-label">Estado</div>
                    <div class="historial-value ${getStatusClass(hist.status.id)}">
                        ${hist.status.status}
                    </div>
                </div>
                <div class="historial-row">
                    <div class="historial-label">Monto</div>
                    <div class="historial-value">
                        ₡${Number(hist.totalAmmount).toLocaleString()}
                    </div>
                </div>
                <div class="historial-row">
                    <div class="historial-label">Comentario</div>
                    <div class="historial-value">${hist.comments || 'Sin comentarios'}</div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('ERROR cargando historial:', error.message);
        container.innerHTML = `<p>Error al cargar el historial: ${error.message}</p>`;
    }
}

// Nota: Debes eliminar la antigua variable 'historialPrueba' si ya no se usa.

// Modal rechazar
function abrirModalRechazo(id) {
    solicitudActual = id;
    document.getElementById('rechazarTexto').textContent = `¿Está seguro que desea rechazar la solicitud #${id}?`;
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
    const statusId = STATUS_RECHAZADA_FINANCIERO; // 4

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

    const modalBody = document.querySelector('#aceptarModal .modal-body');

    let textP = modalBody.querySelector('#aceptarTexto');
    if (!textP) {
        textP = document.createElement('p');
        textP.id = 'aceptarTexto';
        modalBody.insertBefore(textP, modalBody.querySelector('p'));
    }

    textP.textContent = `Está a punto de aprobar la solicitud #${id}.`;

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
    const statusId = STATUS_APROBADA_FINANCIERO; // 2

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

// Gráfico
function cargarReporteInicial() {
    inicializarGrafico();
    // Carga el reporte por defecto de 3 meses al iniciar la página
    filtrarReporte(3);
}

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

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        sessionStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }
}