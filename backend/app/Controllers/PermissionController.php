<?php

namespace App\Controllers;

use App\Config\Database;
use App\Helpers\ApiResponse;
use App\Helpers\RequestHelper;
use App\Services\PermissionResolver;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class PermissionController
{
    private PDO $pdo;
    private PermissionResolver $resolver;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::getConnection();
        $this->resolver = new PermissionResolver($this->pdo);
    }

    public function getMatrix(Request $request, Response $response): Response
    {
        $matrix = $this->resolver->getFullMatrix();
        return ApiResponse::success($response, $matrix, 'Matriks permission berhasil diambil.');
    }

    public function getMyPermissions(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');
        $pages = $this->resolver->getUserAccessiblePages((int)$user['id']);
        return ApiResponse::success($response, $pages, 'Daftar akses halaman pengguna aktif.');
    }

    public function getLevelPermissions(Request $request, Response $response, array $args): Response
    {
        $levelId = (int)$args['id'];

        $stmt = $this->pdo->prepare("SELECT id, name FROM levels WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $levelId]);
        $level = $stmt->fetch();

        if (!$level) {
            return ApiResponse::notFound($response, 'Level tidak ditemukan.');
        }

        $permStmt = $this->pdo->prepare("SELECT page_id FROM level_permissions WHERE level_id = :level_id");
        $permStmt->execute(['level_id' => $levelId]);
        $pageIds = array_map('intval', $permStmt->fetchAll(PDO::FETCH_COLUMN));

        return ApiResponse::success($response, [
            'level' => $level,
            'page_ids' => $pageIds,
        ], 'Hak akses level berhasil diambil.');
    }

    public function updateLevelPermissions(Request $request, Response $response, array $args): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if ($level !== 'super admin') {
            return ApiResponse::forbidden($response, 'Akses ditolak. Pengaturan matriks hak akses level hanya dapat diubah oleh Super Admin.');
        }

        $levelId = (int)$args['id'];
        $data = RequestHelper::getJsonData($request);
        $pageIds = $data['page_ids'] ?? [];

        if (!is_array($pageIds)) {
            return ApiResponse::error($response, 'Format page_ids harus berupa array ID halaman.', [], 422);
        }

        $stmt = $this->pdo->prepare("SELECT id, name FROM levels WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $levelId]);
        $level = $stmt->fetch();

        if (!$level) {
            return ApiResponse::notFound($response, 'Level tidak ditemukan.');
        }

        $this->pdo->beginTransaction();
        try {
            $delStmt = $this->pdo->prepare("DELETE FROM level_permissions WHERE level_id = :level_id");
            $delStmt->execute(['level_id' => $levelId]);

            if (!empty($pageIds)) {
                $insertStmt = $this->pdo->prepare("
                    INSERT INTO level_permissions (level_id, page_id)
                    VALUES (:level_id, :page_id)
                ");

                foreach ($pageIds as $pid) {
                    $pid = (int)$pid;
                    if ($pid > 0) {
                        $insertStmt->execute([
                            'level_id' => $levelId,
                            'page_id' => $pid,
                        ]);
                    }
                }
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            error_log('[LEVEL PERMISSION ERROR] ' . $e->getMessage());
            return ApiResponse::error($response, 'Gagal memperbarui hak akses level. Silakan coba beberapa saat lagi.', [], 500);
        }

        return ApiResponse::success($response, [
            'level_id' => $levelId,
            'page_ids' => array_map('intval', $pageIds),
        ], "Hak akses untuk level '{$level['name']}' berhasil diperbarui.");
    }

    public function getUserPermissions(Request $request, Response $response, array $args): Response
    {
        $userId = (int)$args['id'];

        $stmt = $this->pdo->prepare("
            SELECT u.id, u.full_name, u.username, u.email, u.level_id, l.name AS level_name
            FROM users u
            JOIN levels l ON l.id = u.level_id
            WHERE u.id = :id
        ");
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        if (!$user) {
            return ApiResponse::notFound($response, 'User tidak ditemukan.');
        }

        $levelPermStmt = $this->pdo->prepare("SELECT page_id FROM level_permissions WHERE level_id = :level_id");
        $levelPermStmt->execute(['level_id' => $user['level_id']]);
        $levelPageIds = array_map('intval', $levelPermStmt->fetchAll(PDO::FETCH_COLUMN));

        $userPermStmt = $this->pdo->prepare("SELECT page_id, is_allowed FROM user_permissions WHERE user_id = :user_id");
        $userPermStmt->execute(['user_id' => $userId]);
        $userOverrides = [];
        foreach ($userPermStmt->fetchAll() as $row) {
            $userOverrides[(int)$row['page_id']] = in_array($row['is_allowed'], ['true', true, 1, '1'], true);
        }

        $pagesStmt = $this->pdo->query("SELECT id, name, path, sort_order, is_active FROM pages ORDER BY sort_order ASC, id ASC");
        $pages = $pagesStmt->fetchAll();

        $resolved = [];
        foreach ($pages as $p) {
            $pid = (int)$p['id'];
            $levelHas = in_array($pid, $levelPageIds, true);
            $hasOverride = array_key_exists($pid, $userOverrides);
            $userOverrideValue = $hasOverride ? $userOverrides[$pid] : null;

            $effective = $hasOverride ? $userOverrideValue : $levelHas;

            $statusText = 'Inherit dari Level';
            if ($hasOverride) {
                $statusText = $userOverrideValue ? 'Tambahan Khusus (Granted)' : 'Pengecualian (Denied)';
            }

            $resolved[] = [
                'page_id' => $pid,
                'page_name' => $p['name'],
                'path' => $p['path'],
                'level_allowed' => $levelHas,
                'override' => $userOverrideValue, // true, false, or null (inherit)
                'effective_allowed' => (bool)$effective,
                'status_label' => $statusText,
            ];
        }

        return ApiResponse::success($response, [
            'user' => [
                'id' => (int)$user['id'],
                'full_name' => $user['full_name'],
                'username' => $user['username'],
                'email' => $user['email'],
                'level_id' => (int)$user['level_id'],
                'level_name' => $user['level_name'],
            ],
            'permissions' => $resolved,
        ], 'Hak akses pengguna berhasil dimuat.');
    }

    public function updateUserPermissions(Request $request, Response $response, array $args): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if ($level !== 'super admin') {
            return ApiResponse::forbidden($response, 'Akses ditolak. Pengaturan hak akses khusus user hanya dapat diubah oleh Super Admin.');
        }

        $userId = (int)$args['id'];
        $data = RequestHelper::getJsonData($request);
        $permissions = $data['permissions'] ?? [];

        if (!is_array($permissions)) {
            return ApiResponse::error($response, "Format 'permissions' harus berupa array data.", [], 422);
        }

        $stmt = $this->pdo->prepare("SELECT id, username FROM users WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        if (!$user) {
            return ApiResponse::notFound($response, 'User tidak ditemukan.');
        }

        $this->pdo->beginTransaction();
        try {
            $delStmt = $this->pdo->prepare("DELETE FROM user_permissions WHERE user_id = :user_id");
            $delStmt->execute(['user_id' => $userId]);

            $insertStmt = $this->pdo->prepare("
                INSERT INTO user_permissions (user_id, page_id, is_allowed, created_at, updated_at)
                VALUES (:user_id, :page_id, :is_allowed, :now, :now)
            ");
            $now = date('Y-m-d H:i:s');

            foreach ($permissions as $item) {
                if (!isset($item['page_id'])) {
                    continue;
                }
                $pid = (int)$item['page_id'];
                $override = $item['override'] ?? $item['is_allowed'] ?? null;

                if ($override !== null && $override !== 'inherit') {
                    $boolVal = filter_var($override, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                    if ($boolVal !== null) {
                        $insertStmt->execute([
                            'user_id' => $userId,
                            'page_id' => $pid,
                            'is_allowed' => $boolVal ? 'true' : 'false',
                            'now' => $now,
                        ]);
                    }
                }
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            error_log('[USER PERMISSION ERROR] ' . $e->getMessage());
            return ApiResponse::error($response, 'Gagal menyimpan pengecualian/tambahan hak akses. Silakan coba beberapa saat lagi.', [], 500);
        }

        $accessiblePages = $this->resolver->getUserAccessiblePages($userId);

        return ApiResponse::success($response, [
            'user_id' => $userId,
            'accessible_pages' => $accessiblePages,
        ], "Hak akses khusus untuk user '{$user['username']}' berhasil disimpan.");
    }
}

