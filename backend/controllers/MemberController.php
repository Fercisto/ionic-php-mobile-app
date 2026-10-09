<?php

class MemberController {
    private ProjectMember $memberModel;
    private Project $projectModel;

    public function __construct(ProjectMember $memberModel, Project $projectModel) {
        $this->memberModel = $memberModel;
        $this->projectModel = $projectModel;
    }

    /**
     * Listar miembros de un proyecto
     * GET /api/members/list.php?project_id=1
     */
    public function index(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa GET.']);
            return;
        }

        $projectId = (int)($_GET['project_id'] ?? 0);
        if ($projectId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El project_id es obligatorio.']);
            return;
        }

        try {
            $members = $this->memberModel->getByProject($projectId);
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data'    => $members
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener miembros: ' . $e->getMessage()]);
        }
    }

    /**
     * Agregar / Invitar a un usuario como miembro del proyecto
     * POST /api/members/add.php
     */
    public function store(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $projectId = (int)($input['project_id'] ?? 0);
        $userId = (int)($input['user_id'] ?? 0);
        $role = trim($input['role'] ?? 'member');

        if ($projectId <= 0 || $userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El project_id y user_id son obligatorios.']);
            return;
        }

        try {
            $project = $this->projectModel->findById($projectId);
            if (!$project) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Proyecto no encontrado.']);
                return;
            }

            $added = $this->memberModel->addMember($projectId, $userId, $role);
            if (!$added) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'El usuario ya forma parte del proyecto.']);
                return;
            }

            $members = $this->memberModel->getByProject($projectId);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Usuario añadido al proyecto con éxito.',
                'data'    => $members
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al agregar miembro: ' . $e->getMessage()]);
        }
    }

    /**
     * Remover un miembro del proyecto
     * POST o DELETE /api/members/remove.php
     */
    public function destroy(): void {
        if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'])) {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST o DELETE.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $projectId = (int)($input['project_id'] ?? ($_GET['project_id'] ?? 0));
        $userId = (int)($input['user_id'] ?? ($_GET['user_id'] ?? 0));

        if ($projectId <= 0 || $userId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'project_id y user_id son obligatorios.']);
            return;
        }

        try {
            $removed = $this->memberModel->removeMember($projectId, $userId);
            if (!$removed) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No se puede remover al creador principal del proyecto.']);
                return;
            }

            $members = $this->memberModel->getByProject($projectId);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Miembro removido correctamente del proyecto.',
                'data'    => $members
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al remover miembro: ' . $e->getMessage()]);
        }
    }

    /**
     * Buscar usuarios disponibles en el sistema que no son miembros del proyecto todavía
     * GET /api/members/available.php?project_id=1&search=ana
     */
    public function available(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa GET.']);
            return;
        }

        $projectId = (int)($_GET['project_id'] ?? 0);
        $search = trim($_GET['search'] ?? '');

        if ($projectId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El project_id es obligatorio.']);
            return;
        }

        try {
            $users = $this->memberModel->getAvailableUsers($projectId, $search ?: null);
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data'    => $users
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al buscar usuarios: ' . $e->getMessage()]);
        }
    }
}

