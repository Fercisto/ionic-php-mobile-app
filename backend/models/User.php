<?php

class User {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Obtener la lista completa de usuarios
     */
    public function all(): array {
        $stmt = $this->pdo->query("
            SELECT id, username, email, created_at 
            FROM users 
            ORDER BY id DESC
        ");
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Buscar un usuario por su ID
     */
    public function findById(int $id): ?array {
        $stmt = $this->pdo->prepare("
            SELECT id, username, email, created_at 
            FROM users 
            WHERE id = :id 
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    /**
     * Buscar un usuario por su nombre de usuario o por correo electrónico
     */
    public function findByUsernameOrEmail(string $identifier): ?array {
        $stmt = $this->pdo->prepare("
            SELECT id, username, email, password, created_at 
            FROM users 
            WHERE username = :username OR email = :email 
            LIMIT 1
        ");
        $stmt->execute([
            'username' => $identifier,
            'email'    => $identifier
        ]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    /**
     * Verificar si ya existe un usuario con el mismo username o email (excluyendo un ID si se edita)
     */
    public function exists(string $username, string $email, ?int $excludeId = null): bool {
        $sql = "SELECT id FROM users WHERE (username = :username OR email = :email)";
        $params = ['username' => $username, 'email' => $email];

        if ($excludeId !== null) {
            $sql .= " AND id != :excludeId";
            $params['excludeId'] = $excludeId;
        }
        $sql .= " LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return (bool)$stmt->fetch();
    }

    /**
     * Crear un nuevo usuario en la base de datos
     */
    public function create(string $username, string $email, string $hashedPassword): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO users (username, email, password) 
            VALUES (:username, :email, :password)
        ");
        $stmt->execute([
            'username' => $username,
            'email' => $email,
            'password' => $hashedPassword
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Actualizar los datos de un usuario existente
     */
    public function update(int $id, string $username, string $email, ?string $hashedPassword = null): bool {
        if ($hashedPassword !== null && !empty($hashedPassword)) {
            $stmt = $this->pdo->prepare("
                UPDATE users 
                SET username = :username, email = :email, password = :password 
                WHERE id = :id
            ");
            return $stmt->execute([
                'id' => $id,
                'username' => $username,
                'email' => $email,
                'password' => $hashedPassword
            ]);
        }

        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET username = :username, email = :email 
            WHERE id = :id
        ");
        return $stmt->execute([
            'id' => $id,
            'username' => $username,
            'email' => $email
        ]);
    }

    /**
     * Eliminar un usuario por su ID
     */
    public function delete(int $id): bool {
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
}
