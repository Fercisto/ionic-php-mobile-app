<?php

class ProjectController {
    private Project $projectModel;
    private ProjectMember $memberModel;
    private Task $taskModel;

    public function __construct(Project $projectModel, ProjectMember $memberModel, Task $taskModel) {
        $this->projectModel = $projectModel;
        $this->memberModel = $memberModel;
        $this->taskModel = $taskModel;
    }

    /**
     * Listar proyectos del usuario (donde es creador o miembro)
     * GET /api/projects/list.php?user_id=1
     */
    public function index(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa GET.']);
            return;
        }

        $userId = (int)($_GET['user_id'] ?? 0);
        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El parámetro user_id es obligatorio.']);
            return;
        }

        try {
            $projects = $this->projectModel->listByUser($userId);
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data'    => $projects
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al listar proyectos: ' . $e->getMessage()]);
        }
    }

    /**
     * Obtener detalle completo de un proyecto (incluye sus tareas y miembros)
     * GET /api/projects/get.php?id=1
     */
    public function show(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa GET.']);
            return;
        }

        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de proyecto no válido.']);
            return;
        }

        try {
            $project = $this->projectModel->findById($id);
            if (!$project) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado.']);
                return;
            }

            $members = $this->memberModel->getByProject($id);
            $tasks = $this->taskModel->getByProject($id);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data'    => [
                    'project' => $project,
                    'members' => $members,
                    'tasks'   => $tasks
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener proyecto: ' . $e->getMessage()]);
        }
    }

    /**
     * Crear un nuevo proyecto
     * POST /api/projects/create.php
     */
    public function store(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $ownerId = (int)($input['owner_id'] ?? 0);

        if (empty($title) || $ownerId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El título y el owner_id son obligatorios.']);
            return;
        }

        try {
            $projectId = $this->projectModel->create($title, $description ?: null, $ownerId);
            $newProject = $this->projectModel->findById($projectId);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Proyecto creado exitosamente.',
                'project' => $newProject
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al crear proyecto: ' . $e->getMessage()]);
        }
    }

    /**
     * Actualizar datos de un proyecto
     * POST o PUT /api/projects/update.php
     */
    public function update(): void {
        if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT'])) {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST o PUT.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $id = (int)($input['id'] ?? 0);
        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $status = trim($input['status'] ?? 'active');

        if ($id <= 0 || empty($title)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El ID y el título del proyecto son obligatorios.']);
            return;
        }

        if (!in_array($status, ['active', 'completed', 'archived'])) {
            $status = 'active';
        }

        try {
            $existing = $this->projectModel->findById($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado.']);
                return;
            }

            $this->projectModel->update($id, $title, $description ?: null, $status);
            $updated = $this->projectModel->findById($id);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Proyecto actualizado correctamente.',
                'project' => $updated
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar proyecto: ' . $e->getMessage()]);
        }
    }

    /**
     * Eliminar un proyecto
     * POST o DELETE /api/projects/delete.php
     */
    public function destroy(): void {
        if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'])) {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST o DELETE.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de proyecto no válido.']);
            return;
        }

        try {
            $existing = $this->projectModel->findById($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado.']);
                return;
            }

            $this->projectModel->delete($id);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Proyecto eliminado correctamente.'
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar proyecto: ' . $e->getMessage()]);
        }
    }
}

