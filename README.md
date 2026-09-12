# TeamFlow

## About the Project

TeamFlow is a mobile application for students who need to organize school teams and academic projects. It is developed as a university project for the Mobile Programming II course.

The application brings together users, teams, school projects, and task organization in one mobile workspace.

## Project Objective

The objective of TeamFlow is to help students organize their academic work from a mobile device. The application includes team management, school project organization, task assignment, responsible users, deadlines, and project status information.

## Current Features

The current implementation includes:

- User registration with username, email, and password.
- User login with a username or email and password.
- Local session storage using `localStorage`.
- User consultation and listing from the MySQL database.
- User creation.
- User information update, with an optional password change.
- User deletion after confirmation.
- A basic profile view with the logged-in user's information.
- Logout and local session removal.
- HTTP communication between the Ionic frontend and the PHP API.
- Password hashing in the backend using PHP's `password_hash` function.

The user CRUD provides the user-management foundation for the team, project, and task organization modules.

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

### Users

| Method | Endpoint | Purpose | Request body |
| --- | --- | --- | --- |
| `GET` | `/api/users/list.php` | List all users | None |
| `POST` | `/api/users/create.php` | Create a user | `username`, `email`, `password` |
| `POST` or `PUT` | `/api/users/update.php` | Update a user | `id`, `username`, `email`, optional `password` |
| `POST` or `DELETE` | `/api/users/delete.php` | Delete a user | `id` |

The current frontend sends `POST` requests for user creation, update, and deletion. The PHP controllers also accept `PUT` for updates and `DELETE` for deletions.

The current backend does not implement token-based authentication or access-control middleware for the user CRUD endpoints.

## Development

The frontend uses Angular standalone application configuration and provides Angular's `HttpClient` for communication with the PHP API. The backend uses a small MVC-inspired separation and PDO prepared statements for database operations.

The frontend contains unit-test files and the project provides `npm test` and `npm run lint` scripts. The environment files currently use a local API URL, so that URL must be changed before connecting to a deployed backend.

## Academic Project

TeamFlow is developed as a university project for the Mobile Programming II course. The application demonstrates the connection between an Ionic + Angular mobile frontend, a PHP API, and a MySQL database. The user CRUD provides the technical foundation for team, project, and task organization.