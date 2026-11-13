<?php

namespace App\Controllers;

use App\Config\Database;
use App\Helpers\ApiResponse;
use App\Helpers\RequestHelper;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserController
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::getConnection();
    }

    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $search = trim($params['search'] ?? '');
        $levelId = isset($params['level_id']) && $params['level_id'] !== '' ? (int)$params['level_id'] : null;
        $isActive = isset($params['is_active']) && $params['is_active'] !== '' ? filter_var($params['is_active'], FILTER_VALIDATE_BOOLEAN) : null;

        $sql = "
            SELECT u.id, u.full_name, u.username, u.email, u.level_id, u.is_active,
                   u.created_at, u.updated_at, l.name AS level_name
            FROM users u
            JOIN levels l ON l.id = u.level_id
            WHERE 1=1
        ";
        $bindings = [];

        if ($search !== '') {
            $sql .= " AND (LOWER(u.full_name) LIKE :search OR LOWER(u.username) LIKE :search OR LOWER(u.email) LIKE :search)";
            $bindings['search'] = '%' . strtolower($search) . '%';
        }

        if ($levelId !== null) {
            $sql .= " AND u.level_id = :level_id";
            $bindings['level_id'] = $levelId;
        }

        if ($isActive !== null) {
            $sql .= " AND u.is_active = :is_active";
            $bindings['is_active'] = $isActive ? 'true' : 'false';
        }

        $sql .= " ORDER BY u.id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($bindings);
        $users = $stmt->fetchAll();

        $formatted = array_map(fn($u) => [
            'id' => (int)$u['id'],
            'full_name' => $u['full_name'],
            'username' => $u['username'],
            'email' => $u['email'],
            'level_id' => (int)$u['level_id'],
            'level_name' => $u['level_name'],
            'is_active' => in_array($u['is_active'], ['true', true, 1, '1'], true),
            'created_at' => $u['created_at'],
            'updated_at' => $u['updated_at'],
        ], $users);

        return ApiResponse::success($response, $formatted, 'Data user berhasil diambil.');
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $id = (int)$args['id'];
        $stmt = $this->pdo->prepare("
            SELECT u.id, u.full_name, u.username, u.email, u.level_id, u.is_active,
                   u.created_at, u.updated_at, l.name AS level_name
            FROM users u
            JOIN levels l ON l.id = u.level_id
            WHERE u.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        if (!$user) {
            return ApiResponse::notFound($response, 'Data user tidak ditemukan.');
        }

        $user['id'] = (int)$user['id'];
        $user['level_id'] = (int)$user['level_id'];
        $user['is_active'] = in_array($user['is_active'], ['true', true, 1, '1'], true);

        return ApiResponse::success($response, $user, 'Detail user berhasil diambil.');
    }

    public function store(Request $request, Response $response): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if (!in_array($level, ['super admin', 'manager'], true)) {
            return ApiResponse::forbidden($response, 'Akses ditolak. Peran Anda bersifat Read-Only (hanya lihat) dan tidak dapat menambah data user.');
        }

        $data = RequestHelper::getJsonData($request);
        $fullName = trim($data['full_name'] ?? '');
        $username = trim($data['username'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');
        $levelId = isset($data['level_id']) ? (int)$data['level_id'] : null;
        $isActive = isset($data['is_active']) ? filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN) : true;

        $errors = [];
        if (empty($fullName)) {
            $errors['full_name'] = 'Nama lengkap wajib diisi.';
        }
        if (empty($username)) {
            $errors['username'] = 'Username wajib diisi.';
        } elseif (!preg_match('/^[a-zA-Z0-9_.-]{3,30}$/', $username)) {
            $errors['username'] = 'Username minimal 3 karakter (huruf, angka, _, -, .).';
        }
        if (empty($email)) {
            $errors['email'] = 'Email wajib diisi.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Format email tidak valid.';
        }
        if (empty($password)) {
            $errors['password'] = 'Password wajib diisi.';
        } elseif (strlen($password) < 6) {
            $errors['password'] = 'Password minimal 6 karakter.';
        }
        if (empty($levelId)) {
            $errors['level_id'] = 'Level jabatan wajib dipilih.';
        }

        if (empty($errors['username'])) {
            $stmt = $this->pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(:username)");
            $stmt->execute(['username' => $username]);
            if ($stmt->fetch()) {
                $errors['username'] = 'Username sudah digunakan oleh user lain.';
            }
        }

        if (empty($errors['email'])) {
            $stmt = $this->pdo->prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(:email)");
            $stmt->execute(['email' => $email]);
            if ($stmt->fetch()) {
                $errors['email'] = 'Email sudah digunakan oleh user lain.';
            }
        }

        if (empty($errors['level_id'])) {
            $stmt = $this->pdo->prepare("SELECT id FROM levels WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $levelId]);
            if (!$stmt->fetch()) {
                $errors['level_id'] = 'Level yang dipilih tidak valid.';
            }
        }

        if (!empty($errors)) {
            return ApiResponse::error($response, 'Validasi gagal. Periksa data yang dimasukkan.', $errors, 422);
        }

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $now = date('Y-m-d H:i:s');

        $stmt = $this->pdo->prepare("
            INSERT INTO users (full_name, username, email, password, level_id, is_active, created_at, updated_at)
            VALUES (:full_name, :username, :email, :password, :level_id, :is_active, :created_at, :updated_at)
        ");
        $stmt->execute([
            'full_name' => $fullName,
            'username' => $username,
            'email' => $email,
            'password' => $hashedPassword,
            'level_id' => $levelId,
            'is_active' => $isActive ? 'true' : 'false',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $newId = (int)$this->pdo->lastInsertId();

        return ApiResponse::success($response, [
            'id' => $newId,
            'full_name' => $fullName,
            'username' => $username,
            'email' => $email,
            'level_id' => $levelId,
            'is_active' => $isActive,
        ], 'User baru berhasil ditambahkan.', 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if (!in_array($level, ['super admin', 'manager'], true)) {
            return ApiResponse::forbidden($response, 'Akses ditolak. Peran Anda bersifat Read-Only (hanya lihat) dan tidak dapat mengubah data user.');
        }

        $id = (int)$args['id'];
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            return ApiResponse::notFound($response, 'Data user tidak ditemukan.');
        }

        $data = RequestHelper::getJsonData($request);
        $fullName = trim($data['full_name'] ?? $existing['full_name']);
        $username = trim($data['username'] ?? $existing['username']);
        $email = trim($data['email'] ?? $existing['email']);
        $password = trim($data['password'] ?? '');
        $levelId = isset($data['level_id']) ? (int)$data['level_id'] : (int)$existing['level_id'];
        $isActive = isset($data['is_active']) ? filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN) : in_array($existing['is_active'], ['true', true, 1, '1'], true);

        $errors = [];
        if (empty($fullName)) {
            $errors['full_name'] = 'Nama lengkap wajib diisi.';
        }
        if (empty($username)) {
            $errors['username'] = 'Username wajib diisi.';
        } elseif (!preg_match('/^[a-zA-Z0-9_.-]{3,30}$/', $username)) {
            $errors['username'] = 'Username minimal 3 karakter (huruf, angka, _, -, .).';
        }
        if (empty($email)) {
            $errors['email'] = 'Email wajib diisi.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Format email tidak valid.';
        }
        if (!empty($password) && strlen($password) < 6) {
            $errors['password'] = 'Password minimal 6 karakter.';
        }

        if (empty($errors['username'])) {
            $stmt = $this->pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(:username) AND id != :id");
            $stmt->execute(['username' => $username, 'id' => $id]);
            if ($stmt->fetch()) {
                $errors['username'] = 'Username sudah digunakan oleh user lain.';
            }
        }

        if (empty($errors['email'])) {
            $stmt = $this->pdo->prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(:email) AND id != :id");
            $stmt->execute(['email' => $email, 'id' => $id]);
            if ($stmt->fetch()) {
                $errors['email'] = 'Email sudah digunakan oleh user lain.';
            }
        }

        $stmt = $this->pdo->prepare("SELECT id FROM levels WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $levelId]);
        if (!$stmt->fetch()) {
            $errors['level_id'] = 'Level yang dipilih tidak valid.';
        }

        if (!empty($errors)) {
            return ApiResponse::error($response, 'Validasi gagal. Periksa data yang dimasukkan.', $errors, 422);
        }

        $now = date('Y-m-d H:i:s');
        $params = [
            'id' => $id,
            'full_name' => $fullName,
            'username' => $username,
            'email' => $email,
            'level_id' => $levelId,
            'is_active' => $isActive ? 'true' : 'false',
            'updated_at' => $now,
        ];

        if (!empty($password)) {
            $params['password'] = password_hash($password, PASSWORD_BCRYPT);
            $sql = "
                UPDATE users
                SET full_name = :full_name, username = :username, email = :email,
                    password = :password, level_id = :level_id, is_active = :is_active,
                    updated_at = :updated_at
                WHERE id = :id
            ";
        } else {
            $sql = "
                UPDATE users
                SET full_name = :full_name, username = :username, email = :email,
                    level_id = :level_id, is_active = :is_active, updated_at = :updated_at
                WHERE id = :id
            ";
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return ApiResponse::success($response, [
            'id' => $id,
            'full_name' => $fullName,
            'username' => $username,
            'email' => $email,
            'level_id' => $levelId,
            'is_active' => $isActive,
            'updated_at' => $now,
        ], 'Data user berhasil diperbarui.');
    }

    public function destroy(Request $request, Response $response, array $args): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if (!in_array($level, ['super admin', 'manager'], true)) {
            return ApiResponse::forbidden($response, 'Akses ditolak. Peran Anda bersifat Read-Only (hanya lihat) dan tidak dapat menghapus data user.');
        }

        $id = (int)$args['id'];
        $currentUser = $request->getAttribute('user');

        if ($currentUser && (int)$currentUser['id'] === $id) {
            return ApiResponse::error($response, 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.', [], 400);
        }

        $stmt = $this->pdo->prepare("SELECT id, username FROM users WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        if (!$user) {
            return ApiResponse::notFound($response, 'Data user tidak ditemukan.');
        }

        $delPermStmt = $this->pdo->prepare("DELETE FROM user_permissions WHERE user_id = :user_id");
        $delPermStmt->execute(['user_id' => $id]);

        $delUserStmt = $this->pdo->prepare("DELETE FROM users WHERE id = :id");
        $delUserStmt->execute(['id' => $id]);

        return ApiResponse::success($response, null, "User '{$user['username']}' berhasil dihapus.");
    }
}

