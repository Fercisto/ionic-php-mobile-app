<?php

class Project {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Listar todos los proyectos en los que el usuario es propietario o miembro.
     * Incluye conteo de tareas y miembros.
     */
    public function listByUser(int $userId): array {
        $stmt = $this->pdo->prepare("
            SELECT 
                p.id,
                p.title,
                p.description,
                p.owner_id,
                p.status,
                p.created_at,
                p.updated_at,
                u.username AS owner_username,
                pm.role AS current_user_role,
                (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS members_count,
                (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) AS tasks_count,
                (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') AS completed_tasks_count
            FROM projects p
            INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = :user_id
            INNER JOIN users u ON u.id = p.owner_id
            ORDER BY p.updated_at DESC
        ");
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll() ?: [];
    }

    /**
     * Buscar un proyecto por su ID con datos del creador.
     */
    public function findById(int $projectId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT 
                p.id,
                p.title,
                p.description,
                p.owner_id,
                p.status,
                p.created_at,
                p.updated_at,
                u.username AS owner_username,
                u.email AS owner_email
            FROM projects p
            INNER JOIN users u ON u.id = p.owner_id
            WHERE p.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $projectId]);
        $project = $stmt->fetch();

        return $project ?: null;
    }

    /**
     * Crear un nuevo proyecto e inscribir automáticamente al usuario como owner en project_members.
     */
    public function create(string $title, ?string $description, int $ownerId): int {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO projects (title, description, owner_id, status)
                VALUES (:title, :description, :owner_id, 'active')
            ");
            $stmt->execute([
                'title'       => $title,
                'description' => $description,
                'owner_id'    => $ownerId
            ]);
            $projectId = (int)$this->pdo->lastInsertId();

            $memberStmt = $this->pdo->prepare("
                INSERT INTO project_members (project_id, user_id, role)
                VALUES (:project_id, :user_id, 'owner')
            ");
            $memberStmt->execute([
                'project_id' => $projectId,
                'user_id'    => $ownerId
            ]);

            $this->pdo->commit();
            return $projectId;
        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Actualizar los datos de un proyecto.
     */
    public function update(int $projectId, string $title, ?string $description, string $status = 'active'): bool {
        $stmt = $this->pdo->prepare("
            UPDATE projects
            SET title = :title, description = :description, status = :status
            WHERE id = :id
        ");
        return $stmt->execute([
            'id'          => $projectId,
            'title'       => $title,
            'description' => $description,
            'status'      => $status
        ]);
    }

    /**
     * Eliminar un proyecto por su ID.
     */
    public function delete(int $projectId): bool {
        $stmt = $this->pdo->prepare("DELETE FROM projects WHERE id = :id");
        return $stmt->execute(['id' => $projectId]);
    }

    /**
     * Comprobar si un usuario es miembro de un proyecto.
     */
    public function isMember(int $projectId, int $userId): bool {
        $stmt = $this->pdo->prepare("
            SELECT id FROM project_members 
            WHERE project_id = :project_id AND user_id = :user_id 
            LIMIT 1
        ");
        $stmt->execute([
            'project_id' => $projectId,
            'user_id'    => $userId
        ]);
        return (bool)$stmt->fetch();
    }

    /**
     * Comprobar si un usuario es el dueño de un proyecto.
     */
    public function isOwner(int $projectId, int $userId): bool {
        $stmt = $this->pdo->prepare("
            SELECT id FROM projects 
            WHERE id = :id AND owner_id = :owner_id 
            LIMIT 1
        ");
        $stmt->execute([
            'id'       => $projectId,
            'owner_id' => $userId
        ]);
        return (bool)$stmt->fetch();
    }
}

