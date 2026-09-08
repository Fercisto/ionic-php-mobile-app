<?php

class AuthController {
    private User $userModel;

    public function __construct(User $userModel) {
        $this->userModel = $userModel;
    }

    /**
     * Procesar la solicitud de registro de usuarios
     */
    public function register(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $username = trim($input['username'] ?? '');
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($username) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Todos los campos son obligatorios.']);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El formato del correo electrónico no es válido.']);
            return;
        }

        try {
            if ($this->userModel->exists($username, $email)) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'El nombre de usuario o correo ya está registrado.']);
                return;
            }

            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $userId = $this->userModel->create($username, $email, $hashedPassword);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Usuario registrado exitosamente.',
                'user' => [
                    'id' => $userId,
                    'username' => $username,
                    'email' => $email
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al procesar el registro: ' . $e->getMessage()]);
        }
    }

    /**
     * Procesar la solicitud de inicio de sesión
     */
    public function login(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ingresa tu usuario y contraseña.']);
            return;
        }

        try {
            $user = $this->userModel->findByUsernameOrEmail($username);

            if (!$user || !password_verify($password, $user['password'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Usuario o contraseña incorrectos.']);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Inicio de sesión exitoso.',
                'user' => [
                    'id' => (int)$user['id'],
                    'username' => $user['username'],
                    'email' => $user['email']
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al procesar el login: ' . $e->getMessage()]);
        }
    }
}
