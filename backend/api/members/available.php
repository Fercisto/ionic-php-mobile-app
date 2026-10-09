<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../models/Project.php';
require_once __DIR__ . '/../../models/ProjectMember.php';
require_once __DIR__ . '/../../controllers/MemberController.php';

$projectModel = new Project($pdo);
$memberModel = new ProjectMember($pdo);
$memberController = new MemberController($memberModel, $projectModel);

$memberController->available();

