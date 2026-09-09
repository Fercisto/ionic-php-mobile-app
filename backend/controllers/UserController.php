<?php

class UserController {
    private User $userModel;

    public function __construct(User $userModel) {
        $this->userModel = $userModel;
    }

    /**
     * Listar todos los usuarios
     */
    public function index(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa GET.']);
            return;
        }

        try {
            $users = $this->userModel->all();
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data'    => $users
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener usuarios: ' . $e->getMessage()]);
        }
    }

    /**
     * Crear un nuevo usuario desde el panel de gestión
     */
    public function store(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $username = trim($input['username'] ?? '');
        $email    = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($username) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Todos los campos (usuario, correo y contraseña) son obligatorios.']);
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
                'message' => 'Usuario creado exitosamente.',
                'user'    => [
                    'id'       => $userId,
                    'username' => $username,
                    'email'    => $email
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al crear el usuario: ' . $e->getMessage()]);
        }
    }

    /**
     * Actualizar los datos de un usuario existente
     */
    public function update(): void {
        if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT'])) {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST o PUT.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $id       = (int)($input['id'] ?? 0);
        $username = trim($input['username'] ?? '');
        $email    = trim($input['email'] ?? '');
        $password = $input['password'] ?? null;

        if ($id <= 0 || empty($username) || empty($email)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID, usuario y correo electrónico son requeridos.']);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El formato del correo electrónico no es válido.']);
            return;
        }

        try {
            $user = $this->userModel->findById($id);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
                return;
            }

            if ($this->userModel->exists($username, $email, $id)) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'El nombre de usuario o correo ya está en uso por otro registro.']);
                return;
            }

            $hashedPassword = (!empty($password)) ? password_hash($password, PASSWORD_BCRYPT) : null;
            $this->userModel->update($id, $username, $email, $hashedPassword);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Usuario actualizado exitosamente.',
                'user'    => [
                    'id'       => $id,
                    'username' => $username,
                    'email'    => $email
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar el usuario: ' . $e->getMessage()]);
        }
    }

    /**
     * Eliminar un usuario
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
            echo json_encode(['success' => false, 'message' => 'ID de usuario no válido.']);
            return;
        }

        try {
            $user = $this->userModel->findById($id);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
                return;
            }

            $this->userModel->delete($id);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Usuario eliminado correctamente.'
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el usuario: ' . $e->getMessage()]);
        }
    }
}
