<?php

class TaskController {
    private Task $taskModel;
    private Project $projectModel;

    public function __construct(Task $taskModel, Project $projectModel) {
        $this->taskModel = $taskModel;
        $this->projectModel = $projectModel;
    }

    /**
     * Listar tareas:
     * - Por proyecto: GET /api/tasks/list.php?project_id=1
     * - Por usuario (Mis Tareas): GET /api/tasks/list.php?user_id=1
     */
    public function index(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa GET.']);
            return;
        }

        $projectId = (int)($_GET['project_id'] ?? 0);
        $userId = (int)($_GET['user_id'] ?? 0);

        if ($projectId <= 0 && $userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Se requiere project_id o user_id.']);
            return;
        }

        try {
            if ($projectId > 0) {
                $tasks = $this->taskModel->getByProject($projectId);
            } else {
                $tasks = $this->taskModel->getByUser($userId);
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data'    => $tasks
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener tareas: ' . $e->getMessage()]);
        }
    }

    /**
     * Crear una nueva tarea
     * POST /api/tasks/create.php
     */
    public function store(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $projectId   = (int)($input['project_id'] ?? 0);
        $title       = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $status      = trim($input['status'] ?? 'pending');
        $priority    = trim($input['priority'] ?? 'medium');
        $assignedTo  = !empty($input['assigned_to']) ? (int)$input['assigned_to'] : null;
        $dueDate     = trim($input['due_date'] ?? '');

        if ($projectId <= 0 || empty($title)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'project_id y title son campos requeridos.']);
            return;
        }

        if (!in_array($status, ['pending', 'in_progress', 'completed'])) {
            $status = 'pending';
        }
        if (!in_array($priority, ['low', 'medium', 'high'])) {
            $priority = 'medium';
        }

        try {
            $taskId = $this->taskModel->create(
                $projectId,
                $title,
                $description ?: null,
                $status,
                $priority,
                $assignedTo,
                $dueDate ?: null
            );

            $task = $this->taskModel->findById($taskId);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Tarea creada exitosamente.',
                'task'    => $task
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al crear la tarea: ' . $e->getMessage()]);
        }
    }

    /**
     * Actualizar una tarea existente
     * POST o PUT /api/tasks/update.php
     */
    public function update(): void {
        if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT'])) {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST o PUT.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $id          = (int)($input['id'] ?? 0);
        $title       = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $status      = trim($input['status'] ?? 'pending');
        $priority    = trim($input['priority'] ?? 'medium');
        $assignedTo  = !empty($input['assigned_to']) ? (int)$input['assigned_to'] : null;
        $dueDate     = trim($input['due_date'] ?? '');

        if ($id <= 0 || empty($title)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id y title son campos obligatorios.']);
            return;
        }

        if (!in_array($status, ['pending', 'in_progress', 'completed'])) {
            $status = 'pending';
        }
        if (!in_array($priority, ['low', 'medium', 'high'])) {
            $priority = 'medium';
        }

        try {
            $existing = $this->taskModel->findById($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Tarea no encontrada.']);
                return;
            }

            $this->taskModel->update(
                $id,
                $title,
                $description ?: null,
                $status,
                $priority,
                $assignedTo,
                $dueDate ?: null
            );

            $updated = $this->taskModel->findById($id);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Tarea actualizada exitosamente.',
                'task'    => $updated
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar tarea: ' . $e->getMessage()]);
        }
    }

    /**
     * Actualizar rápidamente el estado de una tarea
     * POST o PUT /api/tasks/status.php
     */
    public function updateStatus(): void {
        if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT'])) {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST o PUT.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $id = (int)($input['id'] ?? 0);
        $status = trim($input['status'] ?? '');

        if ($id <= 0 || !in_array($status, ['pending', 'in_progress', 'completed'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID y estado válido (pending, in_progress, completed) son requeridos.']);
            return;
        }

        try {
            $existing = $this->taskModel->findById($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Tarea no encontrada.']);
                return;
            }

            $this->taskModel->updateStatus($id, $status);
            $updated = $this->taskModel->findById($id);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Estado de la tarea actualizado.',
                'task'    => $updated
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar estado: ' . $e->getMessage()]);
        }
    }

    /**
     * Eliminar una tarea
     * POST o DELETE /api/tasks/delete.php
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
            echo json_encode(['success' => false, 'message' => 'ID de tarea no válido.']);
            return;
        }

        try {
            $existing = $this->taskModel->findById($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Tarea no encontrada.']);
                return;
            }

            $this->taskModel->delete($id);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Tarea eliminada correctamente.'
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar tarea: ' . $e->getMessage()]);
        }
    }
}

