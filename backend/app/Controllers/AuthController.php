<?php

namespace App\Controllers;

use App\Config\Database;
use App\Helpers\ApiResponse;
use App\Helpers\JwtHelper;
use App\Helpers\RequestHelper;
use App\Services\PermissionResolver;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class AuthController
{
    private PDO $pdo;
    private JwtHelper $jwtHelper;
    private PermissionResolver $permissionResolver;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::getConnection();
        $this->jwtHelper = new JwtHelper();
        $this->permissionResolver = new PermissionResolver($this->pdo);
    }

    public function login(Request $request, Response $response): Response
    {
        $data = RequestHelper::getJsonData($request);
        $loginId = trim($data['username'] ?? $data['email'] ?? '');
        $password = trim($data['password'] ?? '');

        if (empty($loginId) || empty($password)) {
            return ApiResponse::error($response, 'Username/Email dan password wajib diisi.', [
                'login' => empty($loginId) ? 'Username atau email wajib diisi.' : null,
                'password' => empty($password) ? 'Password wajib diisi.' : null,
            ], 422);
        }

        $stmt = $this->pdo->prepare("
            SELECT u.*, l.name AS level_name, l.is_active AS level_active, l.deleted_at AS level_deleted_at
            FROM users u
            JOIN levels l ON l.id = u.level_id
            WHERE LOWER(u.username) = LOWER(:login_user) OR LOWER(u.email) = LOWER(:login_email)
            LIMIT 1
        ");
        $stmt->execute([
            'login_user' => $loginId,
            'login_email' => $loginId,
        ]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            return ApiResponse::error($response, 'Kredensial login tidak cocok. Periksa kembali username/email dan password.', [], 401);
        }

        $isUserActive = in_array($user['is_active'], ['true', true, 1, '1'], true);
        if (!$isUserActive) {
            return ApiResponse::error($response, 'Akun Anda berstatus nonaktif. Silakan hubungi administrator.', [], 403);
        }

        $isLevelActive = in_array($user['level_active'], ['true', true, 1, '1'], true);
        if (!$isLevelActive || !empty($user['level_deleted_at'])) {
            return ApiResponse::error($response, 'Level jabatan Anda saat ini tidak aktif.', [], 403);
        }

        $token = $this->jwtHelper->generateToken($user);
        $accessiblePages = $this->permissionResolver->getUserAccessiblePages((int)$user['id']);

        unset($user['password']);

        return ApiResponse::success($response, [
            'token' => $token,
            'user' => [
                'id' => (int)$user['id'],
                'full_name' => $user['full_name'],
                'username' => $user['username'],
                'email' => $user['email'],
                'level_id' => (int)$user['level_id'],
                'level_name' => $user['level_name'],
                'is_active' => $isUserActive,
            ],
            'accessible_pages' => $accessiblePages,
        ], 'Login berhasil.');
    }

    public function me(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $accessiblePages = $this->permissionResolver->getUserAccessiblePages((int)$user['id']);

        return ApiResponse::success($response, [
            'user' => [
                'id' => (int)$user['id'],
                'full_name' => $user['full_name'],
                'username' => $user['username'],
                'email' => $user['email'],
                'level_id' => (int)$user['level_id'],
                'level_name' => $user['level_name'],
                'is_active' => in_array($user['is_active'], ['true', true, 1, '1'], true),
            ],
            'accessible_pages' => $accessiblePages,
        ], 'Profil pengguna berhasil dimuat.');
    }

    public function refreshToken(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $token = $this->jwtHelper->generateToken($user);
        $accessiblePages = $this->permissionResolver->getUserAccessiblePages((int)$user['id']);

        return ApiResponse::success($response, [
            'token' => $token,
            'user' => [
                'id' => (int)$user['id'],
                'full_name' => $user['full_name'],
                'username' => $user['username'],
                'email' => $user['email'],
                'level_id' => (int)$user['level_id'],
                'level_name' => $user['level_name'],
                'is_active' => in_array($user['is_active'], ['true', true, 1, '1'], true),
            ],
            'accessible_pages' => $accessiblePages,
        ], 'Token berhasil diperbarui.');
    }

    public function logout(Request $request, Response $response): Response
    {
        return ApiResponse::success($response, null, 'Logout berhasil.');
    }
}

