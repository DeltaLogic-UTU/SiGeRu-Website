# SiGeRU - Sistema de Gestión de Residuos Urbanos

El sistema integra herramientas para vecinos, personal operativo y supervisores, permitiendo administrar contenedores, reclamos, incidencias, camiones, cuadrillas, instalaciones y tareas relacionadas con la recolección.
Las funciones y la estructura visual están establecidas en la maqueta digital del sistema, que organiza de manera adaptable,
coherente y práctica lo que busca solucionar el sistema en base a las metas del proyecto.
Se toman de referencia mapas logísticos e información formal  para maquetar el prototipo, planificando todos los componentes que requiere
el sistema real, además de implementar aspectos de experiencia de usuario propios que permiten que sea más dinámico.

## Estado del proyecto

Actualmente funciona como un prototipo web desarrollado con:

- HTML5
- CSS3
- JavaScript
- Bootstrap 5.3
- PHP

La información del sistema se obtiene mediante APIs desarrolladas con Laravel y se almacena en una base de datos MariaDB/MySQL.

SiGeRu está dividido en cuatro repositorios:

- `SiGeRu-Website`: frontend del sistema.
- `SiGeRu-API-Usuarios`: autenticación y gestión de usuarios.
- `SiGeRu-API-Gestion`: gestión operativa del sistema.
- `SiGeRu-DumpSQL`: estructura y datos de la base de datos.

## Estructura de la página

```text
SiGeRU/
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
│   ├── perfil.html
│   └── assets/
│
├── resources/
├── .gitignore
└── README.md
```

## Módulos principales

### Landing Page

Página pública del sistema.

Incluye:

- información general;
- inicio de sesión;
- solicitud de acceso;
- recuperación de contraseña;
- contacto;
- modo claro y oscuro.

El CAPTCHA utilizado actualmente es una validación local del prototipo.

### Frontend de Usuarios

Contiene las interfaces correspondientes a los distintos tipos de usuario.

Perfiles disponibles:

- Vecino
- Cuadrilla
- Operario
- Chofer

Se valida el perfil autenticado antes de permitir el acceso.

El vecino puede además:

- realizar reportes;
- consultar su espacio;
- editar los datos de su usuario.

### Frontend de Gestión

Interfaz utilizada por el administrador o supervisor.

Permite trabajar con:

- mapa operativo;
- camiones;
- contenedores;
- cuadrillas;
- personal;
- reclamos;
- incidencias;
- instalaciones;
- inventario;
- rutas;
- solicitudes de acceso;
- perfil del administrador.

## Contenedores y circuitos

Cada contenedor mantiene información como:

- código;
- modelo;
- tipo de residuo;
- capacidad;
- estado;
- ubicación;
- circuito;
- tiempo desde la última recolección.

Los contenedores indican cuánto tiempo llevan sin ser recolectados:

- Verde: entre 2 días.
- Amarillo: 4 días.
- Rojo: 6 días o más.

A partir del estado de sus contenedores se calcula el estado general del circuito.

Esta información se utiliza al:

- consultar contenedores;
- crear una ruta;
- asignar un circuito a una cuadrilla.

Los circuitos con mayor cantidad de contenedores atrasados reciben una prioridad superior.

## Gestión de reclamos

Los reclamos pueden encontrarse en los estados:

- Sin asignar
- Asignado
- Completado

El flujo permite:

1. consultar el reclamo;
2. asignarlo a una cuadrilla;
3. marcarlo como completado;
4. quitar una asignación;
5. reabrirlo;
6. registrar el resultado.

## Gestión de incidencias

Las incidencias pueden corresponder a:

- contenedores;
- camiones.

Desde Gestión se administra principalmente su seguimiento.

Estados utilizados:

- Abierta
- En curso
- Resuelta

## Gestión de camiones

El módulo de camiones permite consultar:

- matrícula;
- estado;
- chofer;
- acompañante;
- ubicación;
- información operacional;
- historial;
- incidencias;
- circuito asignado.

## Cuadrillas

El módulo permite administrar:

- cuadrillas;
- responsables;
- integrantes;
- turnos;
- ubicación;
- historial de limpieza;
- reclamos;
- incidencias creadas;
- circuitos asignados.

## Cuentas de demostración

Para probar los diferentes perfiles:

```text
Vecino
vecino@sigeru.uy

Cuadrilla
cuadrilla@sigeru.uy

Operario
operario@sigeru.uy

Chofer
chofer@sigeru.uy

Administrador
admin@sigeru.uy
```

Contraseña utilizada en las cuentas de demostración:

```text
Sigeru123
```

## Ejecutar el proyecto 

Para ejecutar el sistema completo se necesitan:

- Apache;
- MariaDB/MySQL;
- PHP;
- Composer;
- Laravel.

Se pueden encontrar las dos APIs en sus repositorios correspondientes.

### 1. Base de datos

Iniciar MySQL desde XAMPP.

Crear una base de datos llamada:

```text
sigeru
```

Importar el archivo:

```text
SQL_SiGeRU.sql
```

### 2. API de Usuarios

Dentro del repositorio:

```text
SiGeRu-API-Usuarios
```

ejecutar:

```powershell
composer install
copy .env.example .env
php artisan key:generate
php artisan serve --port=8000
```

La API funciona en:

```text
http://127.0.0.1:8000
```

### 3. API de Gestión

Dentro del repositorio:

```text
SiGeRu-API-Gestion
```

ejecutar:

```powershell
composer install
copy .env.example .env
php artisan key:generate
php artisan serve --port=8001
```

La API funciona en:

```text
http://127.0.0.1:8001
```

### 4. Frontend

Colocar el repositorio:

```text
SiGeRu-Website
```

dentro de:

```text
C:\xampp\htdocs\
```

Iniciar Apache desde XAMPP y abrir:

```text
http://localhost/SiGeRu-Website/landing-page/index.html
```

## Bootstrap

1. Bootstrap Icons.

2. El CSS propio se carga después de Bootstrap para mantener la identidad visual del sistema.

## Próximos pasos

- Completar los módulos pendientes de estadísticas.
- Completar las funciones de rutas.
- Continuar mejorando la representación de mapas y geolocalización.
- Continuar las pruebas de integración entre frontend, APIs y base de datos.
- Mejorar las validaciones y controles de acceso según los distintos perfiles.
- Continuar optimizando la interfaz responsive.

## Proyecto académico 2026

Equipo:

**Delta-Logic**
