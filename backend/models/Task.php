<?php

class Task {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Obtener todas las tareas de un proyecto con los datos del usuario asignado.
     */
    public function getByProject(int $projectId): array {
        $stmt = $this->pdo->prepare("
            SELECT 
                t.id,
                t.project_id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.assigned_to,
                t.due_date,
                t.created_at,
                t.updated_at,
                u.username AS assigned_username,
                u.email AS assigned_email
            FROM tasks t
            LEFT JOIN users u ON u.id = t.assigned_to
            WHERE t.project_id = :project_id
            ORDER BY 
                CASE t.status
                    WHEN 'pending' THEN 1
                    WHEN 'in_progress' THEN 2
                    WHEN 'completed' THEN 3
                    ELSE 4
                END,
                t.due_date ASC,
                t.id DESC
        ");
        $stmt->execute(['project_id' => $projectId]);

        return $stmt->fetchAll() ?: [];
    }

    /**
     * Obtener todas las tareas asignadas a un usuario en todos sus proyectos (para "Mis Tareas").
     */
    public function getByUser(int $userId): array {
        $stmt = $this->pdo->prepare("
            SELECT 
                t.id,
                t.project_id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.assigned_to,
                t.due_date,
                t.created_at,
                t.updated_at,
                p.title AS project_title,
                u.username AS assigned_username
            FROM tasks t
            INNER JOIN projects p ON p.id = t.project_id
            LEFT JOIN users u ON u.id = t.assigned_to
            WHERE t.assigned_to = :user_id
            ORDER BY 
                CASE t.status
                    WHEN 'pending' THEN 1
                    WHEN 'in_progress' THEN 2
                    WHEN 'completed' THEN 3
                    ELSE 4
                END,
                t.due_date ASC,
                t.id DESC
        ");
        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll() ?: [];
    }

    /**
     * Buscar una tarea por su ID.
     */
    public function findById(int $taskId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT 
                t.*,
                p.title AS project_title,
                u.username AS assigned_username
            FROM tasks t
            INNER JOIN projects p ON p.id = t.project_id
            LEFT JOIN users u ON u.id = t.assigned_to
            WHERE t.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $taskId]);
        $task = $stmt->fetch();

        return $task ?: null;
    }

    /**
     * Crear una nueva tarea dentro de un proyecto.
     */
    public function create(
        int $projectId,
        string $title,
        ?string $description,
        string $status = 'pending',
        string $priority = 'medium',
        ?int $assignedTo = null,
        ?string $dueDate = null
    ): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date)
            VALUES (:project_id, :title, :description, :status, :priority, :assigned_to, :due_date)
        ");
        $stmt->execute([
            'project_id'  => $projectId,
            'title'       => $title,
            'description' => $description,
            'status'      => $status,
            'priority'    => $priority,
            'assigned_to' => $assignedTo ?: null,
            'due_date'    => !empty($dueDate) ? $dueDate : null
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Actualizar una tarea existente.
     */
    public function update(
        int $taskId,
        string $title,
        ?string $description,
        string $status,
        string $priority,
        ?int $assignedTo = null,
        ?string $dueDate = null
    ): bool {
        $stmt = $this->pdo->prepare("
            UPDATE tasks
            SET 
                title = :title,
                description = :description,
                status = :status,
                priority = :priority,
                assigned_to = :assigned_to,
                due_date = :due_date
            WHERE id = :id
        ");
        return $stmt->execute([
            'id'          => $taskId,
            'title'       => $title,
            'description' => $description,
            'status'      => $status,
            'priority'    => $priority,
            'assigned_to' => $assignedTo ?: null,
            'due_date'    => !empty($dueDate) ? $dueDate : null
        ]);
    }

    /**
     * Actualizar únicamente el estado de una tarea (p. ej. marcar como completada).
     */
    public function updateStatus(int $taskId, string $status): bool {
        $stmt = $this->pdo->prepare("
            UPDATE tasks
            SET status = :status
            WHERE id = :id
        ");
        return $stmt->execute([
            'id'     => $taskId,
            'status' => $status
        ]);
    }

    /**
     * Eliminar una tarea por su ID.
     */
    public function delete(int $taskId): bool {
        $stmt = $this->pdo->prepare("DELETE FROM tasks WHERE id = :id");
        return $stmt->execute(['id' => $taskId]);
    }
}

