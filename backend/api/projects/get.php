<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../models/Project.php';
require_once __DIR__ . '/../../models/ProjectMember.php';
require_once __DIR__ . '/../../models/Task.php';
require_once __DIR__ . '/../../controllers/ProjectController.php';

$projectModel = new Project($pdo);
$memberModel = new ProjectMember($pdo);
$taskModel = new Task($pdo);
$projectController = new ProjectController($projectModel, $memberModel, $taskModel);

$projectController->show();

