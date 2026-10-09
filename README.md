# TeamFlow

## About the Project

TeamFlow is a mobile application for students who need to organize school teams and academic projects. It is developed as a university project for the Mobile Programming II course.

The application brings together users, teams, school projects, and task organization in one mobile workspace.

## Project Objective

The objective of TeamFlow is to help students organize their academic work from a mobile device. The application includes team management, school project organization, task assignment, responsible users, deadlines, and project status information.

## Current Features

The current implementation includes:

- **Autenticación y Sesión:**
  - Registro de usuarios con usuario, correo y contraseña.
  - Inicio de sesión con usuario o correo.
  - Sesión persistente local mediante `@capacitor/preferences` y `localStorage`.
  - Hashing seguro de contraseñas con `password_hash` (`PASSWORD_BCRYPT`).
- **CRUD de Proyectos:**
  - Creación de proyectos escolares con título, descripción y asignación automática del creador como líder (`owner`).
  - Listado de proyectos en los que participa el usuario, con progreso porcentual de tareas y conteo de miembros.
  - Edición de información y cambio de estado (`active`, `completed`, `archived`).
  - Eliminación de proyectos en cascada (con confirmación previa).
- **Gestión de Tareas (Tasks):**
  - Creación de tareas dentro de un proyecto con título, descripción, prioridad (`low`, `medium`, `high`) y fecha límite.
  - Asignación de tareas a cualquier miembro integrante del equipo del proyecto.
  - Actualización rápida de estados (`pending`, `in_progress`, `completed`).
  - Pestaña "Mis Tareas" (Tab 2) con resumen y filtros de todas las responsabilidades asignadas al usuario activo en todos sus proyectos.
- **Equipo e Invitación de Usuarios (Members):**
  - Consulta de miembros del proyecto con distinción de roles (`Líder / Creador` vs `Colaborador`).
  - Modal de invitación con búsqueda reactiva de usuarios registrados en la base de datos que aún no forman parte del proyecto.
  - Adición instantánea de miembros al equipo y opción para removerlos.
- **Perfil de Usuario (Tab 3):**
  - Visualización de datos de sesión activa y botón de cierre de sesión.

## Technologies

### Frontend

- Ionic Angular 9.
- Angular 22.
- TypeScript 6.
- Angular Router and Angular Forms.
- RxJS.
- SCSS.
- Ionicons.
- Capacitor 8 for the mobile application integration.

### Backend

- PHP without Laravel or another PHP framework.
- PDO for the MySQL connection.
- MySQL.
- JSON responses over HTTP.

### Development Tools

- Node.js and npm.
- Angular CLI 22.
- Ionic Angular Toolkit.
- ESLint and Angular ESLint.
- Jasmine and Karma for frontend tests.

## Project Structure

```text
TeamFlow/
├── backend/
│   ├── api/
│   │   ├── auth/              # Login and registration entry points
│   │   └── users/             # User CRUD entry points
│   ├── config/                # Database and CORS configuration
│   ├── controllers/           # Authentication and user request handling
│   ├── models/                # Database access logic
│   ├── .env.example           # Backend configuration template
│   └── .env                   # Local backend configuration
├── frontend/
│   ├── src/app/
│   │   ├── login/             # Login and registration page
│   │   ├── services/          # Authentication and user services
│   │   ├── tab1/              # User management page
│   │   ├── tab3/              # User profile and logout page
│   │   └── tabs/              # Tab navigation
│   ├── src/environments/      # Frontend API URL configuration
│   ├── android/               # Capacitor Android project
│   ├── ios/                   # Capacitor iOS project
│   ├── angular.json           # Angular project configuration
│   ├── capacitor.config.ts   # Capacitor configuration
│   └── package.json           # Scripts and dependencies
└── README.md
```

The backend follows a simple MVC-inspired organization with separate API entry points, controllers, models, and configuration files. It is not a full PHP MVC framework.

## Requirements

- Node.js compatible with the version declared in `frontend/package.json`: `^22.22.3`, `^24.15.0`, or `>=26.0.0`.
- npm.
- PHP with the PDO MySQL extension enabled.
- MySQL Server.
- A web browser for frontend development.
- Android Studio or Xcode only when building the native Capacitor projects.

## Installation

Clone the repository and install the frontend dependencies:

```bash
git clone <repository-url>
cd ionic-php-mobile-app/frontend
npm install
```

Create the backend environment file from the provided template. On Windows PowerShell:

```powershell
cd ..\backend
Copy-Item .env.example .env
```

On macOS or Linux:

```bash
cd ../backend
cp .env.example .env
```

Update `backend/.env` with the values for the local MySQL installation before starting the backend.

## Frontend Setup

From the `frontend` directory, start the Angular development server:

```bash
npm start
```

The frontend is normally available at `http://localhost:4200`.

Other available npm scripts are:

```bash
npm run build
npm run watch
npm test
npm run lint
```

The API URL is currently configured as `http://localhost:8000/api/auth` in both frontend environment files. The user service derives the user API base URL as `http://localhost:8000/api/users`.

## Backend Setup

The backend reads configuration from `backend/.env`. The provided example contains:

```dotenv
DB_HOST=localhost
DB_NAME=ionic_db
DB_USER=root
DB_PASS=
DB_PORT=3306
APP_ENV=development
```

Start the PHP development server from the `backend` directory:

```bash
php -S localhost:8000 -t .
```

The API uses CORS headers from `backend/config/cors.php` so that the local Ionic frontend can send HTTP requests to the PHP server.

## Database Setup

The repository does not currently include a database migration or SQL dump. Create the database configured in `backend/.env` and the `users` table expected by the PHP model:

```sql
CREATE DATABASE ionic_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ionic_db;

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Change the database name, user, password, host, or port in `backend/.env` if the local MySQL configuration is different.

## API

The API returns JSON responses with a `success` property. The current endpoints are:

### Authentication

| Method | Endpoint | Purpose | Request body |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register.php` | Register a user | `username`, `email`, `password` |
| `POST` | `/api/auth/login.php` | Log in a user | `username`, `password` |

The login value can be either the username or the email address.

### Projects

| Method | Endpoint | Purpose | Parameters / Body |
| --- | --- | --- | --- |
| `GET` | `/api/projects/list.php` | List projects of a user | Query param: `user_id` |
| `GET` | `/api/projects/get.php` | Get project detail (with tasks & members) | Query param: `id` |
| `POST` | `/api/projects/create.php` | Create a new project | Body: `title`, `description`, `owner_id` |
| `POST` or `PUT` | `/api/projects/update.php` | Update project | Body: `id`, `title`, `description`, `status` |
| `POST` or `DELETE` | `/api/projects/delete.php` | Delete project | Body or Query: `id` |

### Members & Invitations

| Method | Endpoint | Purpose | Parameters / Body |
| --- | --- | --- | --- |
| `GET` | `/api/members/list.php` | List members of a project | Query param: `project_id` |
| `GET` | `/api/members/available.php` | Search registered users to invite | Query params: `project_id`, `search` |
| `POST` | `/api/members/add.php` | Add registered user to project team | Body: `project_id`, `user_id`, `role` |
| `POST` or `DELETE` | `/api/members/remove.php` | Remove member from project | Body or Query: `project_id`, `user_id` |

### Tasks

| Method | Endpoint | Purpose | Parameters / Body |
| --- | --- | --- | --- |
| `GET` | `/api/tasks/list.php` | List tasks by project or by user | Query param: `project_id` or `user_id` |
| `POST` | `/api/tasks/create.php` | Create task inside project | Body: `project_id`, `title`, `description`, `priority`, `assigned_to`, `due_date` |
| `POST` or `PUT` | `/api/tasks/update.php` | Update task details | Body: `id`, `title`, `description`, `status`, `priority`, `assigned_to`, `due_date` |
| `POST` or `PUT` | `/api/tasks/status.php` | Quick update task status | Body: `id`, `status` (`pending`, `in_progress`, `completed`) |
| `POST` or `DELETE` | `/api/tasks/delete.php` | Delete task | Body or Query: `id` |

## Development

The frontend uses Angular standalone application configuration and provides Angular's `HttpClient` for communication with the PHP API. The backend uses a small MVC-inspired separation and PDO prepared statements for database operations.

The frontend contains unit-test files and the project provides `npm test` and `npm run lint` scripts. The environment files currently use a local API URL, so that URL must be changed before connecting to a deployed backend.

## Academic Project

TeamFlow is developed as a university project for the Mobile Programming II course. The application demonstrates the connection between an Ionic + Angular mobile frontend, a PHP API, and a MySQL database. The user CRUD provides the technical foundation for team, project, and task organization.