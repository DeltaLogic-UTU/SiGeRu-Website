# SiGeRU — Sistema de Gestión de Residuos Urbanos

**Proyecto académico 2026 | Delta-Logic**

SiGeRU es un sistema web para la gestión y el seguimiento de los residuos urbanos. Su objetivo es facilitar la administración de contenedores, circuitos, rutas de recolección, camiones, cuadrillas, instalaciones, reclamos e incidencias.

La plataforma integra diferentes perfiles de usuario y permite que vecinos, personal operativo y administración trabajen sobre información centralizada mediante aplicaciones web y APIs desarrolladas con Laravel.

El proyecto incorpora herramientas de visualización geográfica, seguimiento de recorridos, estadísticas operativas, comunicación interna y gestión de solicitudes de acceso.

## 1. Estado del proyecto

SiGeRU cuenta con módulos funcionales conectados a APIs y una base de datos relacional.

**Tecnologías utilizadas:**

- **Frontend:** HTML5, CSS3 y JavaScript.
- **Interfaz:** Bootstrap 5.3 y Bootstrap Icons.
- **Mapas:** Leaflet.
- **Gráficos:** Chart.js.
- **Backend:** PHP y Laravel.
- **Base de datos:** MariaDB/MySQL.
- **Autenticación:** JWT.
- **Entorno de desarrollo:** XAMPP, Composer y Git.

El sistema incorpora diseño adaptable a distintos dispositivos y compatibilidad con temas claro y oscuro.

Las funcionalidades deben utilizarse con las APIs y la base de datos configuradas. La disponibilidad de cada servicio depende del entorno de ejecución.

## 2. Repositorios del proyecto

SiGeRU está organizado en cinco repositorios:

| Repositorio | Función |
|---|---|
| [SiGeRu-Website](https://github.com/DeltaLogic-UTU/SiGeRu-Website) | Interfaces web para los diferentes perfiles |
| [SiGeRu-API-Usuarios](https://github.com/DeltaLogic-UTU/SiGeRu-API-Usuarios) | Autenticación, perfiles, registro y recuperación de contraseñas |
| [SiGeRu-API-Gestion](https://github.com/DeltaLogic-UTU/SiGeRu-API-Gestion) | Administración de recursos y operaciones |
| [SiGeRu-API-Recoleccion](https://github.com/DeltaLogic-UTU/SiGeRu-API-Recoleccion) | Procesos de recolección y seguimiento de recorridos |
| [SiGeRu-DumpSQL](https://github.com/DeltaLogic-UTU/SiGeRu-DumpSQL) | Estructura y datos de referencia de MySQL |

Los repositorios trabajan sobre una base de datos compartida durante el desarrollo local.

## 3. Estructura del frontend

```text
SiGeRu-Website/
├── landing-page/
│   ├── index.html
│   ├── login.html
│   ├── registro.html
│   ├── recuperar-password.html
│   └── assets/
│
├── frontend-usuarios/
│   ├── vecino.html
│   ├── reporte-vecino.html
│   ├── cuadrilla.html
│   ├── operario.html
│   ├── chofer.html
│   ├── perfil.html
│   └── assets/
│
├── frontend-gestion/
│   ├── administrador.html
│   ├── camiones.html
│   ├── contenedores.html
│   ├── cuadrillas.html
│   ├── incidencias.html
│   ├── instalaciones.html
│   ├── personal.html
│   ├── reclamos.html
│   ├── rutas.html
│   ├── estadisticas.html
│   ├── perfil.html
│   └── assets/
│
├── resources/
├── .gitignore
└── README.md
```

Cada interfaz utiliza sus propios archivos JavaScript y CSS, además de los estilos y funciones compartidos del sistema.

## 4. Perfiles de usuario

SiGeRU dispone de los siguientes perfiles:

- **Vecino:** realiza reportes y consulta sus reclamos.
- **Cuadrilla:** gestiona tareas, circuitos y recorridos asignados.
- **Operario:** consulta instalaciones, capacidad e inventario de insumos.
- **Chofer:** consulta rutas asignadas, recorridos y datos del camión.
- **Administrador:** supervisa los módulos operativos y administra el sistema.
- **Supervisor:** participa en las funciones administrativas autorizadas, como la revisión de solicitudes de acceso.

El sistema utiliza autenticación JWT y controles de acceso según el perfil.

## 5. Landing Page

La página pública presenta el proyecto y permite acceder a las principales funciones de usuarios.

Incluye:

- Información general de SiGeRU.
- Inicio de sesión.
- Solicitud de acceso.
- Recuperación de contraseña.
- Formulario de contacto.
- Información de cobertura y recolección.
- Preguntas frecuentes.
- Tema claro y oscuro.
- Interfaz adaptable a dispositivos móviles.

El CAPTCHA utilizado en el prototipo corresponde a una validación local, no a un servicio externo de verificación.

### Registro y aprobación de solicitudes

El registro permite enviar una solicitud de acceso que permanece pendiente de revisión.

El proceso general es:

1. El solicitante completa el formulario.
2. La API de Usuarios registra la solicitud pendiente.
3. Administración o Supervisión revisa la información.
4. La solicitud puede aprobarse o rechazarse.
5. Al aprobarse, se crea y habilita la cuenta correspondiente.
6. El solicitante recibe un correo de confirmación en la dirección registrada.

Los correos electrónicos también se utilizan para el formulario de contacto y el proceso de recuperación de contraseña, de acuerdo con la configuración SMTP del servidor.

## 6. Módulo de Vecinos

La interfaz de vecinos permite:

- Acceder a su espacio personal.
- Consultar información relacionada con la recolección.
- Buscar contenedores cercanos mediante el mapa.
- Registrar reclamos y reportes.
- Adjuntar fotografías a los reportes cuando corresponda.
- Consultar estados de sus solicitudes.
- Recibir notificaciones cuando cambia el estado de un reclamo.
- Administrar los datos de su perfil.

Las notificaciones se presentan desde la interfaz del vecino y permiten consultar los cambios registrados.

## 7. Gestión de contenedores

El módulo permite consultar y administrar los contenedores del sistema.

Cada contenedor puede contener información sobre:

- Identificador.
- Modelo y tipo.
- Estado.
- Tipo de residuo.
- Capacidad.
- Fotografía.
- Ubicación geográfica.
- Municipio y circuito.
- Última recolección.
- Días transcurridos sin recolección.

### Prioridad de recolección

Los contenedores utilizan indicadores de color para facilitar el seguimiento:

| Indicador | Días sin recolección |
|---|---|
| Verde | Hasta 2 días |
| Amarillo | 3 a 4 días |
| Rojo | 6 días o más |

La clasificación de los valores intermedios debe mantenerse acorde con la configuración de prioridades aplicada en el módulo.

La prioridad permite identificar contenedores que requieren atención y contribuye a la planificación de recorridos.

### Mapa de contenedores

Desde el mapa administrativo es posible consultar ubicaciones, revisar información y trabajar con la edición de contenedores y sus circuitos.

El módulo incorpora filtros para facilitar la consulta por características operativas y ubicación.

## 8. Circuitos y rutas

SiGeRU permite administrar los circuitos vinculados a los contenedores y organizar los recorridos de recolección.

El módulo incluye:

- Consulta de circuitos.
- Visualización geográfica.
- Configuración de frecuencias de recolección.
- Planificación de rutas.
- Asignación de recorridos.
- Seguimiento de estados.
- Consulta del historial de rutas.
- Información de recolecciones realizadas.

### Planificación y despacho

La planificación utiliza la frecuencia de las rutas y la disponibilidad de recursos operativos.

El sistema contempla la asignación de recorridos a camiones y choferes disponibles, respetando las condiciones definidas para la planificación.

Los datos de las recolecciones se utilizan también para actualizar información operativa y alimentar las estadísticas correspondientes.

## 9. Gestión de camiones

El módulo permite administrar la información de los vehículos utilizados para la recolección.

Incluye:

- Matrícula.
- Estado del camión.
- Fotografía.
- Chofer asignado.
- Acompañante.
- Circuitos y rutas.
- Posición GPS.
- Seguimiento de recorridos.
- Registro de incidencias.
- Historial operativo.

El mapa permite visualizar información geográfica relacionada con los camiones y las rutas.

Las funciones de seguimiento dependen de los datos y servicios de ubicación disponibles.

## 10. Gestión de cuadrillas

El módulo administrativo permite consultar y organizar:

- Cuadrillas registradas.
- Responsables.
- Integrantes.
- Turnos.
- Circuitos asignados.
- Tareas.
- Reclamos.
- Incidencias.
- Historial de actividades.

### Espacio de Cuadrilla

Los integrantes acceden a una interfaz operativa para trabajar con sus asignaciones.

Incluye:

- Consulta de reclamos e incidencias asignados.
- Visualización de tareas en el mapa.
- Consulta de circuitos y recorridos.
- Inicio de recorridos.
- Listado de contenedores asignados.
- Registro de contenedores recolectados.
- Seguimiento del progreso.
- Finalización de recorridos.
- Consulta del historial.
- Comunicación con Administración.

El objetivo es registrar las actividades realizadas y mantener sincronizada la información entre Cuadrillas, Gestión y Recolección.

## 11. Gestión de instalaciones

El sistema administra las instalaciones relacionadas con la gestión de residuos.

Tipos contemplados:

- Depósitos.
- Centros de acopio.
- Vertederos.

La información de las instalaciones incluye:

- Identificador.
- Nombre.
- Tipo.
- Ubicación.
- Estado operativo.
- Tipo de residuo.
- Capacidad.
- Estado de capacidad.
- Operarios asignados.

### Inventario

Los depósitos disponen de funciones para consultar y administrar insumos y artículos registrados.

Los artículos incluyen:

- Nombre.
- Categoría o tipo.
- Estado.
- Cantidad disponible.

### Espacio del Operario

El operario puede consultar la instalación que tiene asignada mediante su cuenta autenticada.

La interfaz muestra la información operativa registrada en la base de datos y permite actualizar la consulta.

Cuando corresponde, también puede consultar el inventario de insumos de su instalación.

## 12. Gestión de reclamos

Los reclamos permiten registrar y administrar situaciones reportadas por los vecinos.

Estados principales:

- Sin asignar.
- Asignado.
- Completado.

Las funciones incluyen:

1. Consultar reclamos.
2. Revisar detalles y fotografías.
3. Asignar tareas a cuadrillas.
4. Registrar soluciones.
5. Completar reclamos.
6. Reabrir reclamos cuando corresponda.
7. Consultar el historial y estado de atención.

Los cambios de estado pueden generar notificaciones para el vecino relacionado con el reclamo.

## 13. Gestión de incidencias

Las incidencias permiten registrar situaciones relacionadas con los recursos y operaciones de recolección.

Pueden estar vinculadas, entre otros elementos, a:

- Contenedores.
- Camiones.
- Actividades operativas.

Estados principales:

- Abierta.
- En curso.
- Resuelta.

El módulo permite consultar incidencias, realizar seguimiento y registrar su resolución según las funciones autorizadas para cada perfil.

## 14. Estadísticas del sistema

SiGeRU incorpora un panel de estadísticas conectado a los datos registrados en el sistema.

Entre sus indicadores se encuentran:

- Reclamos recibidos.
- Reclamos pendientes.
- Reclamos resueltos.
- Tasa de resolución.
- Evolución de reclamos por período.
- Distribución de reclamos por estado.
- Reclamos por tipo.
- Ranking de contenedores con reportes de desbordamiento.
- Cantidad de contenedores activos.
- Cantidad de camiones activos.
- Cantidad de cuadrillas.
- Incidencias del período.
- Distribución de usuarios por rol.

El panel incluye gráficos y tablas, además de un selector de mes para consultar los indicadores asociados a un período.

Los indicadores que representan el estado actual del sistema se distinguen de los indicadores históricos.

## 15. Mensajería interna

La plataforma incorpora comunicación interna entre Administración y personal operativo.

La mensajería contempla:

- Cuadrillas.
- Barrenderos.
- Operarios.
- Administradores.

Funciones principales:

- Selección de contactos autorizados.
- Envío y recepción de mensajes.
- Consulta del historial de conversaciones.
- Identificación del remitente.
- Registro de fecha de envío.
- Control de mensajes leídos.
- Indicadores de mensajes pendientes.

En la interfaz administrativa, los contactos con mensajes sin leer pueden destacarse con un indicador verde y un contador.

La comunicación se realiza mediante los endpoints de mensajería de la API de Gestión.

## 16. Autenticación y seguridad

SiGeRU utiliza JWT para identificar a los usuarios y controlar el acceso a sus funcionalidades.

Entre los mecanismos implementados o contemplados se encuentran:

- Inicio de sesión autenticado.
- Protección de interfaces por perfil.
- Validaciones en las APIs.
- Restricciones de acceso a funciones administrativas.
- Configuración de CORS.
- Recuperación de contraseñas.
- Control de solicitudes de registro.
- Validación de permisos para mensajería y operaciones.

Las comprobaciones realizadas en el frontend no sustituyen las validaciones y autorizaciones que deben aplicarse en el backend.

Las contraseñas, secretos JWT y credenciales de correo deben mantenerse fuera de los repositorios públicos.

## 17. Instalación y ejecución local

### Requisitos

Se necesita contar con:

- XAMPP o un entorno equivalente con Apache y MySQL/MariaDB.
- PHP compatible con las versiones de Laravel utilizadas.
- Composer.
- Git.
- Navegador web actualizado.

Las dependencias específicas de PHP y Laravel se encuentran definidas en los archivos `composer.json` de cada API.

### Paso 1. Descargar los repositorios

Clonar los repositorios del proyecto:

```powershell
git clone https://github.com/DeltaLogic-UTU/SiGeRu-Website.git
git clone https://github.com/DeltaLogic-UTU/SiGeRu-API-Usuarios.git
git clone https://github.com/DeltaLogic-UTU/SiGeRu-API-Gestion.git
git clone https://github.com/DeltaLogic-UTU/SiGeRu-API-Recoleccion.git
git clone https://github.com/DeltaLogic-UTU/SiGeRu-DumpSQL.git
```

### Paso 2. Preparar la base de datos

1. Iniciar MySQL desde XAMPP.
2. Crear la base de datos `sigeru` si todavía no existe.
3. Importar el archivo SQL correspondiente desde `SiGeRu-DumpSQL`.
4. Comprobar que se hayan creado las tablas y relaciones necesarias.

Desde MySQL:

```sql
CREATE DATABASE IF NOT EXISTS sigeru
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

El procedimiento de importación dependerá del archivo SQL disponible en el repositorio y de si incluye o no la creación de la base de datos.

No se debe importar un respaldo sobre una base existente sin verificar previamente sus instrucciones SQL, ya que podría reemplazar información.

### Paso 3. Configurar API Usuarios

Ingresar a `SiGeRu-API-Usuarios`:

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Configurar el archivo `.env` con los datos locales de MySQL:

```dotenv
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sigeru
DB_USERNAME=root
DB_PASSWORD=
```

La configuración anterior corresponde a un ejemplo habitual de XAMPP local sin contraseña para `root`. Debe adaptarse al entorno real.

Configurar también los parámetros JWT, correo SMTP y demás variables requeridas por el proyecto.

Iniciar:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

**Dirección:** `http://127.0.0.1:8000`

### Paso 4. Configurar API Gestión

Ingresar a `SiGeRu-API-Gestion`:

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Configurar:

```dotenv
APP_URL=http://127.0.0.1:8001

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sigeru
DB_USERNAME=root
DB_PASSWORD=
```

Completar las demás variables necesarias según la configuración de autenticación e integración de la API.

Iniciar:

```powershell
php artisan serve --host=127.0.0.1 --port=8001
```

**Dirección:** `http://127.0.0.1:8001`

### Paso 5. Configurar API Recolección

Ingresar a `SiGeRu-API-Recoleccion`:

```powershell
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Configurar:

```dotenv
APP_URL=http://127.0.0.1:8002

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sigeru
DB_USERNAME=root
DB_PASSWORD=
```

Completar las demás variables de entorno requeridas para la comunicación con los otros componentes.

Iniciar:

```powershell
php artisan serve --host=127.0.0.1 --port=8002
```

**Dirección:** `http://127.0.0.1:8002`

### Paso 6. Ejecutar el frontend

Colocar `SiGeRu-Website` dentro de la carpeta `htdocs` de XAMPP.

En el entorno de desarrollo del proyecto se utiliza:

```text
D:\xampp\htdocs\SiGeRu-Website\
```

Iniciar Apache desde XAMPP y acceder a:

```text
http://localhost/SiGeRu-Website/landing-page/index.html
```

Comprobar que las tres APIs estén ejecutándose y que las direcciones configuradas en el frontend coincidan con sus respectivos puertos.

## 18. Configuración del correo electrónico

El sistema utiliza el servicio de correo configurado en Laravel para sus funciones de contacto, aprobación de solicitudes y recuperación de contraseñas.

Se deben configurar las variables SMTP correspondientes en el `.env` de la API responsable de cada envío.

Ejemplo de variables:

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=
MAIL_PORT=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME="SiGeRu"
```

Los valores deben corresponder al proveedor de correo utilizado.

**Importante:** no publicar archivos `.env` con datos reales ni incorporar claves o contraseñas SMTP al código fuente.

## 19. Verificación del entorno

Para comprobar el funcionamiento general:

1. Verificar que Apache y MySQL estén iniciados.
2. Comprobar que las tres APIs respondan en sus respectivos puertos.
3. Abrir la Landing Page.
4. Iniciar sesión con un usuario de prueba autorizado.
5. Comprobar el acceso a las interfaces según el rol.
6. Revisar que las consultas de Gestión obtengan datos desde MySQL.
7. Probar las operaciones principales de los módulos.
8. Verificar el envío de correos en un entorno de pruebas.
9. Comprobar la comunicación entre el frontend y las APIs.
10. Revisar la consola del navegador y los registros de Laravel ante posibles errores.

## 20. Pruebas y mantenimiento

El proyecto contempla pruebas funcionales y de integración para comprobar sus procesos principales.

Áreas de verificación:

- Autenticación y autorización.
- Registro y aprobación de usuarios.
- Recuperación de contraseñas.
- CRUD de recursos operativos.
- Asignación de cuadrillas y operarios.
- Reclamos e incidencias.
- Rutas y recolecciones.
- Actualización de estados.
- Mensajería interna.
- Estadísticas.
- Notificaciones.
- Compatibilidad visual y responsive.

Los resultados de pruebas deben documentarse por separado antes de considerar una versión validada para producción.

## 21. Consideraciones de seguridad

Este repositorio es parte de un proyecto académico.

Antes de publicar versiones o respaldos:

- No incluir archivos `.env` reales.
- No compartir contraseñas ni tokens de acceso.
- No publicar bases de datos con información personal.
- Utilizar datos de prueba para demostraciones públicas.
- Mantener las credenciales fuera del README.
- Revisar los permisos de acceso de cada endpoint.

---

## Equipo de desarrollo

**Delta-Logic**

Proyecto académico 2026.

**SiGeRU — Sistema de Gestión de Residuos Urbanos.**
