const API_URL = 'http://localhost:8080/api/auth/login';

// Función para mostrar alertas
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Función para realizar el login usando el API de autenticación
async function login(usuario, contrasena) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                correo: usuario,
                contrasena: contrasena
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                showAlert("Usuario o contraseña incorrectos", "danger");
            } else if (response.status === 403) {
                showAlert("Tu sesión está inactiva. Contacta al administrador.", "warning");
            } else {
                showAlert("Error al autenticar", "danger");
            }
            return;
        }

        const usuarioLogueado = await response.json();
        console.log("Usuario logueado:", usuarioLogueado);

        // Guardar sesión
        sessionStorage.setItem("usuario", JSON.stringify(usuarioLogueado));

        showAlert("Inicio de sesión exitoso. Redirigiendo...", "success");

        setTimeout(() => {
            switch (usuarioLogueado.rol) {
                case "Comprador":
                    window.location.href = "comprador.html";
                    break;

                case "Aprobador Jefe":
                    window.location.href = "aprobador-jefe.html";
                    break;

                case "Aprobador Financiero":
                    window.location.href = "aprobador-financiero.html";
                    break;

                case "Administrador":
                    window.location.href = "administrador.html";
                    break;

                default:
                    console.error("Rol no reconocido:", usuarioLogueado.rol);
                    showAlert("Rol no reconocido", "danger");
            }
        }, 1500);

    } catch (error) {
        console.error("Error:", error);
        showAlert(
            "Error al conectar con el servidor. Verifica que el API esté activo.",
            "danger"
        );
    }
}

// Manejar el envío del formulario
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const usuario = document.getElementById('usuario').value.trim();
    const contrasena = document.getElementById('contrasena').value;

    if (!usuario || !contrasena) {
        showAlert('Por favor, completa todos los campos', 'warning');
        return;
    }

    login(usuario, contrasena);
});

// Limpiar sessionStorage al cargar la página de login
sessionStorage.removeItem('usuario');
