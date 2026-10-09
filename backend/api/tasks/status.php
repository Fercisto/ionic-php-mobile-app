<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../models/Task.php';
require_once __DIR__ . '/../../models/Project.php';
require_once __DIR__ . '/../../controllers/TaskController.php';

$taskModel = new Task($pdo);
$projectModel = new Project($pdo);
$taskController = new TaskController($taskModel, $projectModel);

$taskController->updateStatus();

