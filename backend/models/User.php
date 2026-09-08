<?php

class User {
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
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
            'email' => $identifier
        ]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    /**
     * Verificar si ya existe un usuario con el mismo username o email
     */
    public function exists(string $username, string $email): bool {
        $stmt = $this->pdo->prepare("
            SELECT id 
            FROM users 
            WHERE username = :username OR email = :email 
            LIMIT 1
        ");
        $stmt->execute(['username' => $username, 'email' => $email]);
        
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
            'email'    => $email,
            'password' => $hashedPassword
        ]);

        return (int)$this->pdo->lastInsertId();
    }
}
