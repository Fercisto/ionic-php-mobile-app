<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../controllers/UserController.php';

$userModel = new User($pdo);
$userController = new UserController($userModel);

$userController->update();
