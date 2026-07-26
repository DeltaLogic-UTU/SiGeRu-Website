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
- Bootstrap Icons
- PHP

El proyecto utiliza datos locales y estructuras PHP para simular el funcionamiento del sistema.

Todavía no utiliza una base de datos MySQL de forma definitiva, pero la estructura está preparada para realizar esa integración posteriormente.

## Estructura del proyecto

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
├── api-usuarios/
│   ├── index.php
│   └── validations.php
│
├── api-gestion/
│   ├── index.php
│   ├── camiones.php
│   ├── contenedores.php
│   ├── cuadrillas.php
│   ├── incidencias_camiones.php
│   ├── incidencias_contenedores.php
│   ├── instalaciones.php
│   ├── inventario.php
│   ├── personal.php
│   ├── reclamos.php
│   ├── rutas.php
│   ├── solicitudes.php
│   └── trabajadores.php
│
├── resources/
├── .gitignore
├── .gitattributes
├── gitflow.md
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

Cada página valida el perfil autenticado antes de permitir el acceso.

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

Cada circuito del prototipo representa un conjunto de 10 contenedores.

Los contenedores indican cuánto tiempo llevan sin ser recolectados:

- Verde: entre 0 y 2 días.
- Amarillo: entre 3 y 4 días.
- Rojo: 5 días o más.

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

## APIs

El proyecto se divide principalmente en dos grupos de APIs.

### API de Usuarios

Responsable de:

- login;
- validación de usuarios;
- solicitudes de acceso;
- perfiles.

### API de Gestión

Responsable de la información operacional:

- contenedores;
- camiones;
- cuadrillas;
- instalaciones;
- inventario;
- rutas;
- reclamos;
- incidencias;
- personal.

Actualmente las APIs funcionan como prototipo mediante estructuras PHP y datos locales.

La persistencia definitiva se realizará posteriormente mediante MySQL.

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

## Ejecutar el proyecto localmente

Para utilizar también las APIs PHP se recomienda ejecutar el proyecto mediante Apache.

Con XAMPP:

1. Copiar la carpeta del proyecto dentro de:

```text
C:\xampp\htdocs\
```

Por ejemplo:

```text
C:\xampp\htdocs\SiGeRU
```

2. Iniciar Apache desde XAMPP.

3. Abrir en el navegador:

```text
http://localhost/SiGeRU/landing-page/index.html
```

Para la versión actual no es obligatorio iniciar MySQL.

## Bootstrap

1. Bootstrap Icons.

2. El CSS propio se carga después de Bootstrap para mantener la identidad visual del sistema.

## Persistencia local

Algunas funciones del prototipo utilizan:

- `localStorage`
- `sessionStorage`

Esto permite simular cambios y sesiones mientras no exista una base de datos definitiva.

## Próximos pasos

- Integración con MySQL.
- Persistencia real de usuarios.
- Persistencia de contenedores y circuitos.
- CAPTCHA real.
- Integración definitiva entre APIs.
- Reportes y estadísticas.
- Adaptación del sistema de mapas y geolocalización.

## Proyecto académico 2026

Equipo:

**Delta-Logic**
