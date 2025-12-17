
const API_ORDERS = 'http://localhost:8080/api/orders';
const API_ORDERS_BUYER_HISTORY = 'http://localhost:8080/api/orders/buyer';
const API_PRODUCTS = 'http://localhost:8080/api/products';

const STATUS_ANULADA_COMPRADOR = 6;

let modalConfirmarCrear;
let modalComprobante;
let modalAnular;
let modalDetalles;
let modalLoading;
let solicitudActual;
let ultimaSolicitudCreada;
let userId;

let availableProducts = [];
let productRowsCount = 0;

// Verificar autenticación
window.addEventListener('DOMContentLoaded', function () {
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));

    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Validar rol por NOMBRE
    if (usuario.rol !== 'Comprador') {
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
    modalConfirmarCrear = new bootstrap.Modal(document.getElementById('confirmarCrearModal'));
    modalComprobante = new bootstrap.Modal(document.getElementById('comprobanteModal'));
    modalAnular = new bootstrap.Modal(document.getElementById('anularModal'));
    modalDetalles = new bootstrap.Modal(document.getElementById('detallesModal'));
    modalLoading = new bootstrap.Modal(document.getElementById('loadingModal'));

    cargarProductosDisponibles();

    document.getElementById('add-product-btn').addEventListener('click', () => {
        agregarFilaProducto();
    });

    cargarHistorial();
});

// Cargar productos disponibles desde la API
async function cargarProductosDisponibles() {
    try {
        const response = await fetch(API_PRODUCTS);

        if (!response.ok) {
            throw new Error(`Error al cargar productos: ${response.status}`);
        }

        availableProducts = await response.json();

        // Cargar la primera fila del formulario
        agregarFilaProducto(true); // true para indicar que es la carga inicial

    } catch (error) {
        console.error('Error cargando productos disponibles:', error);
        alert('No se pudo cargar la lista de productos. Intente de nuevo más tarde.');
    }
}

function agregarFilaProducto(isInitial = false) {
    productRowsCount++; // Incrementar el contador para el ID único
    const rowId = `product-row-${productRowsCount}`;

    // Generar las opciones del dropdown
    const optionsHtml = availableProducts.map(product =>
        `<option value="${product.id}" data-price="${product.price}">${product.name}</option>`
    ).join('');

    // Contenedor de la lista de productos
    const container = document.getElementById('productos-list');

    // Creación del elemento de fila
    const newRow = document.createElement('div');
    newRow.className = 'product-row row mb-3 align-items-top';
    newRow.id = rowId;
    newRow.innerHTML = `
        <div class="col-md-5">
            <select class="form-select product-select" id="producto-${productRowsCount}" data-row-id="${rowId}">
                <option value="" disabled selected>Seleccione un producto</option>
                ${optionsHtml}
            </select>
        </div>
        <div class="col-md-3">
            <input type="number" class="form-control quantity-input" id="cantidad-${productRowsCount}" placeholder="Cantidad">
        </div>
        <div class="col-md-4">
            <input type="text" class="form-control price-input" id="precio-${productRowsCount}" placeholder="Precio Unitario" readonly>
        </div>
        <div class="col-md-1 d-flex justify-content-center">
            ${!isInitial ?
            `<button type="button" class="btn btn-danger btn-sm remove-product-btn" data-row-id="${rowId}">X</button>` :
            ''}
        </div>
    `;

    container.appendChild(newRow);

    // Adjuntar Event Listeners a los nuevos elementos
    const select = newRow.querySelector('.product-select');
    const quantityInput = newRow.querySelector('.quantity-input');
    const removeBtn = newRow.querySelector('.remove-product-btn');

    // Listener para cuando cambia el producto (Actualiza el precio)
    select.addEventListener('change', () => {
        actualizarPrecioUnitario(select, `precio-${productRowsCount}`);
        calcularTotal();
    });

    // Listener para cuando cambia la cantidad
    quantityInput.addEventListener('input', calcularTotal);

    // Listener para el botón de remover (si no es la fila inicial)
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            newRow.remove();
            calcularTotal(); // Recalcular total después de eliminar
        });
    }

    // Si es la fila inicial y hay productos, selecciona el primero
    if (isInitial && availableProducts.length > 0) {
        select.value = availableProducts[0].id;
        actualizarPrecioUnitario(select, `precio-${productRowsCount}`);
    }

    // Si se agrega una nueva fila después de la primera, enfocar el nuevo select
    if (!isInitial) {
        select.focus();
    }
}

// Función auxiliar para actualizar el precio en una fila
function actualizarPrecioUnitario(selectElement, priceInputId) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const price = selectedOption.dataset.price;
    const priceInput = document.getElementById(priceInputId);

    if (price) {
        // Formatear el precio para visualización (solo string)
        priceInput.value = parseFloat(price).toLocaleString('es-CR');
        priceInput.dataset.unitPrice = price; // Guardar el valor numérico sin formato
    } else {
        priceInput.value = '';
        priceInput.dataset.unitPrice = 0;
    }
}


// Calcular total de TODAS las filas
function calcularTotal() {
    let totalGlobal = 0;

    // Seleccionar todos los contenedores de fila
    const productRows = document.querySelectorAll('.product-row');

    productRows.forEach(row => {
        const select = row.querySelector('.product-select');
        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');

        // Si no hay precio (producto no seleccionado o no se pudo cargar), saltar
        if (!priceInput || !priceInput.dataset.unitPrice) return;

        const quantity = parseInt(quantityInput.value, 10) || 0;
        const unitPrice = parseFloat(priceInput.dataset.unitPrice) || 0;

        totalGlobal += quantity * unitPrice;
    });

    // Formatear y mostrar el total global
    const totalInput = document.getElementById('total');
    totalInput.value = totalGlobal.toLocaleString('es-CR', { minimumFractionDigits: 2 });
    // Guardar el valor numérico en un data attribute para el envío
    totalInput.dataset.numericValue = totalGlobal;
}

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

    if (section === 'historial') {
        cargarHistorial();
    }
}

// Manejar envío del formulario
document.getElementById('crearSolicitudForm').addEventListener('submit', function (e) {
    e.preventDefault();
    modalConfirmarCrear.show();
});

// Cancelar creación
function cancelarCreacion() {
    if (confirm('¿Está seguro que desea cancelar?')) {
        document.getElementById('crearSolicitudForm').reset();
        document.getElementById('total').value = '';
    }
}

// Confirmar crear solicitud (AHORA ASÍNCRONA)
async function confirmarCrearSolicitud() {
    modalConfirmarCrear.hide();

    // 1. Recolectar datos de todos los productos
    const productsToSend = [];

    const productRows = document.querySelectorAll('.product-row');

    productRows.forEach(row => {
        const select = row.querySelector('.product-select');
        const quantityInput = row.querySelector('.quantity-input');

        const productId = parseInt(select.value, 10);
        const quantity = parseInt(quantityInput.value, 10);

        // Solo agregamos productos si tienen ID válido y cantidad > 0
        if (productId && quantity > 0) {
            productsToSend.push({
                productId: productId,
                quantity: quantity
            });
        }
    });

    if (productsToSend.length === 0) {
        alert("Debe agregar al menos un producto válido con una cantidad mayor a cero.");
        return;
    }

    // 2. Construcción de la data según la nueva estructura
    const orderData = {
        userId: userId, // ID del usuario loggeado
        products: productsToSend // Lista de {productId, quantity}
    };

    // NOTA: El cálculo del monto total (totalAmount) se deja de lado
    // ya que ahora es responsabilidad del backend.

    document.getElementById('loadingText').textContent = "Creando Orden de Compra...";
    document.getElementById('subLoadingText').textContent = "El sistema está guardando los datos y enviando la confirmación por correo electrónico. Esto puede tardar unos segundos.";
    modalLoading.show();

    try {
        const response = await fetch(API_ORDERS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            // Manejar errores si el servidor no devuelve 2xx
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        await cargarHistorial();

        const newOrder = historialSolicitudes[0];

        if (!newOrder || !newOrder.orderId) {
            throw new Error("La orden se creó, pero no se pudo recuperar el ID/Monto del historial. Revise el ordenamiento.");
        }

        // 4. Preparar datos para el comprobante
        const totalAmount = newOrder.totalAmmount || 0;

        const selectedProductNames = productsToSend.map(p => availableProducts.find(ap => ap.id === p.productId).name);

        ultimaSolicitudCreada = {
            numero: newOrder.orderId,
            // Los datos del producto se quedan genéricos para el título del comprobante
            producto: productsToSend.length === 1 ? selectedProductNames[0] : `${productsToSend.length} productos`,
            cantidad: productsToSend.length,
            monto: totalAmount,
            fecha: new Date().toLocaleDateString(),
            usuario: JSON.parse(sessionStorage.getItem('usuario')).nombre,

            // *** NUEVA PROPIEDAD CLAVE ***
            productsDetail: productsToSend.map(item => {
                // Necesitamos el nombre y el precio unitario del producto para el PDF
                const fullProduct = availableProducts.find(p => p.id === item.productId);
                return {
                    name: fullProduct ? fullProduct.name : 'Producto Desconocido',
                    price: fullProduct ? fullProduct.price : 0,
                    quantity: item.quantity
                };
            })
        };

        document.getElementById('mensajeExito').textContent =
            `Solicitud número ${newOrder.orderId} creada con éxito`;

        modalComprobante.show(); // Abre el modal que da la opción de descargar PDF

        // 5. Limpieza y reinicio del formulario
        document.getElementById('crearSolicitudForm').reset();
        document.getElementById('total').value = '';

        document.getElementById('productos-list').innerHTML = '';
        productRowsCount = 0;
        agregarFilaProducto(true);

        descargarPDF();

    } catch (error) {
        console.error('Error al crear la solicitud:', error);
        alert(`Fallo al crear la solicitud. La orden probablemente se creó, pero no se pudo procesar la respuesta o el comprobante: ${error.message}`);
    } finally {
        modalLoading.hide();
    }
}

// Cerrar modales
function cerrarModalConfirmar() {
    modalConfirmarCrear.hide();
}

function cerrarModalComprobante() {
    modalComprobante.hide();
}

// Descargar PDF (Adaptado para mostrar la lista de productos)
function descargarPDF() {
    if (!ultimaSolicitudCreada || !ultimaSolicitudCreada.numero) {
        alert('No hay una solicitud reciente para generar el comprobante.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- ENCABEZADO ---
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Comprobante de Solicitud de Compra', 105, 20, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);

    // --- INFORMACIÓN GENERAL ---
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');

    let y = 40;
    const padding = 20;

    doc.text(`Número de Solicitud: ${ultimaSolicitudCreada.numero.toString()}`, padding, y);
    y += 8;
    doc.text(`Solicitante: ${ultimaSolicitudCreada.usuario}`, padding, y);
    y += 8;
    doc.text(`Fecha de Creación: ${ultimaSolicitudCreada.fecha}`, padding, y);
    y += 8;
    doc.text(`Estado Inicial: Pendiente`, padding, y);
    y += 15;

    // --- DETALLE DE PRODUCTOS (Tabla) ---

    // Título de la tabla
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Detalles de Productos', padding, y);
    y += 7;

    // Ajuste del formato de número
    const currencyFormat = (num) => `₡${num.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;

    const productsData = ultimaSolicitudCreada.productsDetail.map(p => {
        const subtotal = p.price * p.quantity;
        return [
            p.name,
            p.quantity,
            currencyFormat(p.price),
            currencyFormat(subtotal)
        ];
    });

    // Definición de las columnas de la tabla
    doc.autoTable({
        startY: y,
        head: [['Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
        body: productsData,
        styles: { fontSize: 10, cellPadding: 2, lineWidth: 0.1 },
        headStyles: { fillColor: [61, 82, 160], textColor: 255 }, // Color azul oscuro
        alternateRowStyles: { fillColor: [240, 240, 240] },
        didDrawPage: function (data) {
            y = data.cursor.y; // Actualizar la posición Y después de la tabla
        }
    });

    // --- TOTAL FINAL ---
    y += 10;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`MONTO TOTAL: ${currencyFormat(ultimaSolicitudCreada.monto)}`, 190, y, { align: 'right' });

    // --- FOOTER ---
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text('Sistema de Proveeduría - Documento generado automáticamente', 105, 280, { align: 'center' });

    // --- Descargar ---
    doc.save(`Solicitud_${ultimaSolicitudCreada.numero.toString()}.pdf`);
}

// Cargar historial de solicitudes desde la API
async function cargarHistorial() {
    const container = document.getElementById('historialContainer');
    container.innerHTML = '<p class="text-center">Cargando historial...</p>';

    if (!userId) {
        container.innerHTML = '<p class="text-center text-danger">Error: ID de comprador no encontrado.</p>';
        return;
    }

    const url = `${API_ORDERS_BUYER_HISTORY}/${userId}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error al cargar historial: ${response.status}`);
        }

        const historial = await response.json();

        // **GUARDAR DATOS GLOBALES**
        historialSolicitudes = historial;

        if (historial.length === 0) {
            container.innerHTML = '<p class="text-center">No hay solicitudes registradas.</p>';
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

            // Determinar si el botón Anular debe estar deshabilitado
            // Solo se puede anular si el estado es 'Pendiente'
            const isDisabled = statusText.toLowerCase() !== 'pendiente' ? 'disabled' : '';

            return `
                <div class="historial-card">
                    <div class="historial-info">
                        <div class="historial-header">Solicitud ID: ${hist.orderId}</div>
                        <div class="historial-row">
                            <div class="historial-label">Estado</div>
                            <div class="historial-value ${statusClass}">${statusText}</div>
                        </div>
                        <div class="historial-row">
                            <div class="historial-label">Monto</div>
                            <div class="historial-value total-amount">${totalFormatted}</div>
                        </div>
                        <div class="historial-row">
                            <div class="historial-label">Comentario</div>
                            <div class="historial-value">${hist.comments || 'Sin comentarios'}</div>
                        </div>
                    </div>
                    <div class="historial-buttons">
                        <button class="btn-anular" 
                            onclick="abrirModalAnular(${hist.orderId})"
                            ${isDisabled}>
                            Anular
                        </button>
                        <button class="btn-detalles" onclick="verDetalles(${hist.orderId})">
                            Ver Productos
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error cargando historial:', error);
        container.innerHTML = '<p class="text-center text-danger">Error al cargar el historial. Intente de nuevo más tarde.</p>';
    }
}

// Anular solicitud
function abrirModalAnular(id) {
    solicitudActual = id;
    modalAnular.show();
}

async function confirmarAnular() {
    // 1. Obtener datos
    const statusId = STATUS_ANULADA_COMPRADOR; // 6

    // 2. Ocultar el modal inmediatamente para dar feedback de respuesta
    modalAnular.hide();

    const encodedComments = encodeURIComponent(`"Anulada"`);

    // NOTA: Usaremos la URL base ORDERS_APPROVER_API_URL, aunque la lógica es más de 'orders'
    const url = `http://localhost:8080/api/orders/${solicitudActual}?status=${statusId}&comments=${encodedComments}`;

    document.getElementById('loadingText').textContent = "Anulando Orden de Compra...";
    document.getElementById('subLoadingText').textContent = "El sistema está actualizando el estado y notificando a los aprobadores.";
    modalLoading.show();

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
            }
        });

        if (response.ok) {
            alert(`Solicitud ${solicitudActual} anulada exitosamente.`);
            await cargarHistorial();
        } else {
            const errorText = await response.text();
            console.error('Error al anular solicitud:', response.status, errorText);
            alert(`Error al anular la solicitud. Verifique la consola. Mensaje: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error de red al anular:', error);
        alert('Error de conexión al intentar anular la solicitud.');
    } finally {
        modalLoading.hide();
    }
}

function cerrarModalAnular() {
    modalAnular.hide();
}

// Ver detalles
function verDetalles(id) {
    // 1. Buscar la solicitud en el historial cargado por la API
    const solicitud = historialSolicitudes.find(s => s.orderId === id);

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

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        sessionStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }
}

function getStatusClass(statusString) {
    const status = statusString.toLowerCase();

    if (status.includes('aprobada')) {
        return 'aprobada';
    } else if (status.includes('rechazada')) {
        return 'rechazada';
    } else if (status.includes('pendiente')) {
        return 'pendiente';
    }
    return '';
}