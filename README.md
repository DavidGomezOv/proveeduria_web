# Proveeduría Web

Proyecto estático de interfaz web para gestión de roles (administrador, aprobador, comprador y login). Está organizado en carpetas separadas para HTML, CSS y JavaScript.

**Descripción**
- Proyecto cliente (frontend) sin backend incluido: páginas HTML, estilos CSS y scripts JS.

**Estructura del proyecto (resumen)**
- HTML/: páginas de interfaz de usuario.
- CSS/: estilos por página.
- Script/: lógica cliente en JavaScript.

**Árbol de archivos**

```
proveeduria_web/
├─ HTML/
│  ├─ administrador.html
│  ├─ aprobador-financiero.html
│  ├─ aprobador-jefe.html
│  ├─ comprador.html
│  └─ login.html
├─ CSS/
│  ├─ administrador.css
│  ├─ aprobador-financiero.css
│  ├─ aprobador-jefe.css
│  ├─ comprador.css
│  └─ Login.css
├─ Script/
│  ├─ administrador.js
│  ├─ aprobador-financiero.js
│  ├─ aprobador-jefe.js
│  ├─ comprador.js
│  └─ login.js
└─ README.md
```

**Cómo usar (rápido)**
1. Abrir `HTML/login.html` en un navegador moderno.
2. Navegar a las páginas de cada rol según la lógica de `Script/login.js`.
3. También puedes abrir directamente cualquiera de las páginas en `HTML/` para revisar la interfaz.

**Requerimientos**
- Navegador web moderno (Chrome, Edge, Firefox, Safari).
- Opcional para desarrollo/local preview:
  - Node.js y `npm` (opcional, para usar `http-server`).
  - Python 3 (opcional, para servir archivos con `http.server`).
  - Visual Studio Code con la extensión Live Server (opcional).

**Instalación / Servir localmente**

Opciones rápidas para servir el proyecto en localhost:

- Con Python 3 (desde la raíz del proyecto):

```bash
python -m http.server 8000
```

- Con Node.js y `http-server` (instalar globalmente primero):

```bash
npm install -g http-server
http-server -c-1
```

- Con la extensión Live Server en Visual Studio Code:
  - Instala la extensión "Live Server" de Ritwick Dey y haz clic en "Go Live".

Después de servir, abre `http://localhost:8000/HTML/login.html` (o la ruta adecuada) en tu navegador.

**Notas de desarrollo**
- Los archivos de estilo están en `CSS/` y los scripts en `Script/`.
- Revisar `Script/login.js` para la lógica de inicio de sesión/redirects.

**Sugerencias / próximos pasos**
- Añadir un `LICENSE` si quieres formalizar la licencia (por ejemplo MIT).
- Añadir un pequeño backend o API si se necesita autenticación real o persistencia.

**Contribución**
- Para mejoras: crear un branch, aplicar cambios y abrir un pull request con una descripción clara.

---

Archivo actualizado: [README.md](README.md)