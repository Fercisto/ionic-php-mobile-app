<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../controllers/AuthController.php';

// Instanciar Modelo y Controlador
$userModel = new User($pdo);
$authController = new AuthController($userModel);

// Ejecutar la acción de registro
$authController->register();
