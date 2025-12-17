const API_URL = 'http://localhost:8080/api/users';
const ROLES_API_URL = 'http://localhost:8080/api/roles';
const RANGES_API_URL = 'http://localhost:8080/api/ranges';
let modalInstance;
let rangesData = []; // Variable para almacenar los datos de rangos globales

// 1. Verificar autenticación y cargar datos al cargar la página
window.addEventListener('DOMContentLoaded', function () {
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));

    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Validar rol por NOMBRE
    if (usuario.rol !== 'Administrador') {
        alert('No tienes permisos para acceder a esta página');
        window.location.href = 'login.html';
        return;
    }

    // Cargar los datos de la API
    cargarRoles();
    cargarRangos();

    // Inicializar modal
    const modalElement = document.getElementById('cancelModal');
    modalInstance = new bootstrap.Modal(modalElement);

    // Escuchar cambios en el formulario
    const form = document.getElementById('createUserForm');
    if (form) {
        form.addEventListener('input', updateAcceptButton);
        form.addEventListener('change', updateAcceptButton);

        // Manejar el envío del formulario (LÓGICA DE CREACIÓN ACTUALIZADA)
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const cedula = document.getElementById('cedula').value;
            const rol = document.getElementById('rol').value;
            const idRango = document.getElementById('monto').value;

            // Construir el body del POST con todos los campos requeridos
            const nuevoUsuario = {
                cedula: parseInt(cedula),
                nombre: document.getElementById('nombre').value,
                apellidos: document.getElementById('apellidos').value,
                correo: document.getElementById('correo').value,
                contrasena: document.getElementById('contrasena').value,
                rolId: parseInt(rol)
            };

            // Validar que la contraseña cumpla con la longitud mínima (por seguridad adicional)
            if (contrasena.length < 4) {
                alert('La contraseña debe tener al menos 4 caracteres.');
                return;
            }

            // Si es Aprobador Financiero (rolId 3), incluye el idRango
            if (rol === '3') {
                nuevoUsuario.idRango = parseInt(idRango);
            }

            // Si no se selecciona un rango para el rol 3, detenemos el envío.
            if (rol === '3' && !nuevoUsuario.idRango) {
                alert('Debe seleccionar un Monto para el Aprobador Financiero.');
                return;
            }

            // Realizar la solicitud POST
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(nuevoUsuario)
                });

                if (response.status === 201) {
                    alert('Usuario creado exitosamente.');

                    // Limpiar formulario
                    form.reset();
                    document.getElementById('montoContainer').style.display = 'none';
                    updateAcceptButton();

                    // Recargar la lista de usuarios para mostrar el nuevo registro
                    cargarUsuarios();

                } else if (response.status === 400) {
                    // Si el servidor envía un error 400 (Bad Request)
                    const errorData = await response.json();
                    alert(`Error de validación: ${errorData.message || 'Verifique los datos ingresados.'}`);
                    console.error('Error 400:', errorData);

                } else {
                    // Manejo de otros errores del servidor (500, etc.)
                    alert('Error al crear el usuario. Por favor, revise la consola.');
                    console.error('Error del servidor:', response.status, await response.text());
                }

            } catch (error) {
                console.error('Error de red al crear usuario:', error);
                alert('Ocurrió un error de conexión con la API.');
            }
        });
    }

    cargarUsuarios();
});

// 3. Función para cargar Roles desde la API
async function cargarRoles() {
    try {
        const response = await fetch(ROLES_API_URL);
        if (!response.ok) throw new Error('Error al cargar roles');

        const roles = await response.json();
        const selectRol = document.getElementById('rol');

        // Limpiar opciones preexistentes (si las hubiera, dejando la primera "Rol")
        selectRol.innerHTML = '<option value="">Rol</option>';

        roles.forEach(rol => {
            const option = document.createElement('option');
            option.value = rol.idRol;
            option.textContent = rol.nombreRol;
            selectRol.appendChild(option);
        });

    } catch (error) {
        console.error('Error cargando roles:', error);
        // Mostrar error en el select o un mensaje de alerta
    }
}

// 4. Función para cargar Rangos desde la API
async function cargarRangos() {
    try {
        const response = await fetch(RANGES_API_URL);
        if (!response.ok) throw new Error('Error al cargar rangos');

        const ranges = await response.json();
        rangesData = ranges; // Guardar los datos de los rangos globalmente

        const selectMonto = document.getElementById('monto');

        // Limpiar opciones preexistentes (dejando la primera "Monto")
        selectMonto.innerHTML = '<option value="">Monto</option>';

        ranges.forEach(range => {
            const option = document.createElement('option');
            // Usamos el ID del rango como valor (es lo que necesita el backend)
            option.value = range.id;
            // Formateamos el texto para que sea legible
            const minFormatted = range.min.toLocaleString('es-CR', { minimumFractionDigits: 0 });
            const maxFormatted = range.max.toLocaleString('es-CR', { minimumFractionDigits: 0 });
            option.textContent = `${minFormatted} - ${maxFormatted}`;
            selectMonto.appendChild(option);
        });

    } catch (error) {
        console.error('Error cargando rangos:', error);
        // Mostrar error en el select o un mensaje de alerta
    }
}

// Función para cambiar de sección
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });

    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(`${section}-section`).classList.add('active');
    event.target.classList.add('active');

    if (section === 'gestion') {
        cargarUsuarios();
    } else if (section === 'crear') {
        document.getElementById('createUserForm').reset();
        document.getElementById('montoContainer').style.display = 'none';
        updateAcceptButton();
    }
}

// Función para cargar usuarios
async function cargarUsuarios() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error('Error al cargar usuarios');
        }

        const usuarios = await response.json();
        mostrarUsuariosCards(usuarios);

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('usersCardsContainer').innerHTML = `
            <p class="text-center text-danger">Error al cargar los usuarios</p>
        `;
    }
}

// Función para mostrar usuarios en tarjetas
function mostrarUsuariosCards(usuarios) {
    const container = document.getElementById('usersCardsContainer');

    if (usuarios.length === 0) {
        container.innerHTML = '<p class="text-center">No hay usuarios registrados</p>';
        return;
    }

    container.innerHTML = usuarios.map((user, index) => `
        <div class="user-card">
            <div class="user-card-left">
                <div class="user-card-header">Usuario ID: ${String(index + 1).padStart(2, '0')}</div>
                
                <div class="user-info-row">
                    <div class="user-info-label">Cédula</div>
                    <div class="user-info-value">${user.cedula}</div>
                </div>
                
                <div class="user-info-row">
                    <div class="user-info-label">Correo</div>
                    <div class="user-info-value">${user.correo}</div>
                </div>
                
                <div class="user-info-row">
                    <div class="user-info-label">Nombre</div>
                    <div class="user-info-value">${user.nombre}</div>
                </div>
                
                <div class="user-info-row">
                    <div class="user-info-label">Rol</div>
                    <div class="user-info-value">${user.rol.nombreRol}</div>
                </div>
                
                <div class="user-info-row">
                    <div class="user-info-label">Estado</div>
                    <div class="user-info-value">${user.sesion.sessionStatus === 'Activa' ? 'Activo' : 'Inactivo'}</div>
                </div>
            </div>
            
            <div class="user-card-right">
                ${user.sesion.sessionStatus === 'Activa'
            ? `<button class="btn-inactivar active" onclick="cambiarEstadoUsuario(${user.id}, 'Inactiva')">Inactivar</button>`
            : `<button class="btn-inactivar" 'Activa')">Inactivar</button>`
        }
                ${user.sesion.sessionStatus === 'Activa'
            ? `<button class="btn-activar">Activar</button>`
            : `<button class="btn-activar active" onclick="cambiarEstadoUsuario(${user.id}, 'Activa')">Activar</button>`
        }
            </div>
        </div>
    `).join('');
}

// Función para cambiar estado de usuario
async function cambiarEstadoUsuario(id, nuevoEstado) {
    // Definir la URL de la API con los parámetros
    const url = `${API_URL}/${id}/session?status=${nuevoEstado}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (response.ok) {
            alert(`Estado del usuario ${id} cambiado a ${nuevoEstado} exitosamente.`);

            // Después de cambiar el estado, recargar la lista de usuarios para actualizar la vista
            cargarUsuarios();
        } else {
            // Manejo de errores de respuesta (ej: 404, 500)
            const errorText = await response.text();
            console.error(`Error al cambiar estado del usuario ${id}:`, response.status, errorText);
            alert(`Error (${response.status}) al cambiar el estado del usuario ${id}.`);
        }

    } catch (error) {
        // Manejo de errores de red o del fetch
        console.error('Error de red al cambiar estado:', error);
        alert('Error de conexión con la API.');
    }
}

// Verificar si el rol es Aprobador Financiero
function checkRolFinanciero() {
    const rol = document.getElementById('rol').value;
    const montoContainer = document.getElementById('montoContainer');

    if (rol === '3') {
        montoContainer.style.display = 'block';
    } else {
        montoContainer.style.display = 'none';
        document.getElementById('monto').value = '';
    }

    updateAcceptButton();
}

// Actualizar botón de aceptar
function updateAcceptButton() {
    const form = document.getElementById('createUserForm');
    if (!form) return;

    const btnAccept = form.querySelector('.btn-accept');
    if (!btnAccept) return;

    const cedula = document.getElementById('cedula').value;
    const nombre = document.getElementById('nombre').value;
    const apellidos = document.getElementById('apellidos').value;
    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;

    const rol = document.getElementById('rol').value;
    const monto = document.getElementById('monto').value;

    const allFieldsFilled = cedula && nombre && apellidos && correo && contrasena && rol;

    const contrasenaLengthValid = contrasena.length >= 4;

    const montoValid = rol !== '3' || (rol === '3' && monto !== '');

    if (allFieldsFilled && montoValid && contrasenaLengthValid) {
        btnAccept.classList.add('ready');
    } else {
        btnAccept.classList.remove('ready');
    }
}

// Función para cancelar creación
function cancelarCreacion() {
    modalInstance.show();
}
// Función para cerrar modal sin limpiar
function cerrarModalSinLimpiar() {
    modalInstance.hide();
}

// Función para confirmar cancelación (actualizada)
function confirmarCancelacion() {
    modalInstance.hide();
    const form = document.getElementById('createUserForm');
    form.reset();
    document.getElementById('montoContainer').style.display = 'none';
    updateAcceptButton();
}
// Función para cerrar sesión
function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        sessionStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }
}