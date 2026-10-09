<?php

class ProjectMember {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Listar todos los miembros pertenecientes a un proyecto.
     */
    public function getByProject(int $projectId): array {
        $stmt = $this->pdo->prepare("
            SELECT 
                pm.id AS member_id,
                pm.project_id,
                pm.user_id,
                pm.role,
                pm.joined_at,
                u.username,
                u.email
            FROM project_members pm
            INNER JOIN users u ON u.id = pm.user_id
            WHERE pm.project_id = :project_id
            ORDER BY (pm.role = 'owner') DESC, u.username ASC
        ");
        $stmt->execute(['project_id' => $projectId]);

        return $stmt->fetchAll() ?: [];
    }

    /**
     * Agregar un usuario como miembro del proyecto.
     */
    public function addMember(int $projectId, int $userId, string $role = 'member'): bool {
        // Verificar si ya es miembro
        $check = $this->pdo->prepare("
            SELECT id FROM project_members 
            WHERE project_id = :project_id AND user_id = :user_id
            LIMIT 1
        ");
        $check->execute(['project_id' => $projectId, 'user_id' => $userId]);
        if ($check->fetch()) {
            return false; // Ya es miembro
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO project_members (project_id, user_id, role)
            VALUES (:project_id, :user_id, :role)
        ");
        return $stmt->execute([
            'project_id' => $projectId,
            'user_id'    => $userId,
            'role'       => $role
        ]);
    }

    /**
     * Remover un miembro del proyecto (no permite remover al owner).
     */
    public function removeMember(int $projectId, int $userId): bool {
        // Comprobar que no sea el propietario del proyecto
        $check = $this->pdo->prepare("
            SELECT owner_id FROM projects WHERE id = :id LIMIT 1
        ");
        $check->execute(['id' => $projectId]);
        $project = $check->fetch();
        if ($project && (int)$project['owner_id'] === $userId) {
            return false; // No se puede remover al creador
        }

        // Si el usuario tenía tareas asignadas en este proyecto, se desasignan (assigned_to = NULL)
        $unassignStmt = $this->pdo->prepare("
            UPDATE tasks 
            SET assigned_to = NULL 
            WHERE project_id = :project_id AND assigned_to = :user_id
        ");
        $unassignStmt->execute([
            'project_id' => $projectId,
            'user_id'    => $userId
        ]);

        $stmt = $this->pdo->prepare("
            DELETE FROM project_members 
            WHERE project_id = :project_id AND user_id = :user_id
        ");
        return $stmt->execute([
            'project_id' => $projectId,
            'user_id'    => $userId
        ]);
    }

    /**
     * Obtener usuarios registrados en el sistema que NO son miembros del proyecto todavía,
     * para permitir agregarlos/invitarlos.
     */
    public function getAvailableUsers(int $projectId, ?string $search = null): array {
        $sql = "
            SELECT u.id, u.username, u.email 
            FROM users u
            WHERE u.id NOT IN (
                SELECT user_id FROM project_members WHERE project_id = :project_id
            )
        ";
        $params = ['project_id' => $projectId];

        if (!empty($search)) {
            $sql .= " AND (u.username LIKE :search OR u.email LIKE :search)";
            $params['search'] = "%{$search}%";
        }

        $sql .= " ORDER BY u.username ASC LIMIT 30";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll() ?: [];
    }
}

