<?php

namespace App\Controllers;

use App\Config\Database;
use App\Helpers\ApiResponse;
use App\Helpers\RequestHelper;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class LevelController
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::getConnection();
    }

    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $includeDeleted = !empty($params['include_deleted']);

        $sql = "
            SELECT l.id, l.name, l.description, l.is_active, l.deleted_at, l.created_at, l.updated_at,
                   COUNT(u.id) AS user_count
            FROM levels l
            LEFT JOIN users u ON u.level_id = l.id
            WHERE " . ($includeDeleted ? "1=1" : "l.deleted_at IS NULL") . "
            GROUP BY l.id, l.name, l.description, l.is_active, l.deleted_at, l.created_at, l.updated_at
            ORDER BY l.id ASC
        ";

        $stmt = $this->pdo->query($sql);
        $levels = $stmt->fetchAll();

        $formatted = array_map(fn($l) => [
            'id' => (int)$l['id'],
            'name' => $l['name'],
            'description' => $l['description'],
            'is_active' => in_array($l['is_active'], ['true', true, 1, '1'], true),
            'user_count' => (int)$l['user_count'],
            'deleted_at' => $l['deleted_at'],
            'created_at' => $l['created_at'],
            'updated_at' => $l['updated_at'],
        ], $levels);

        return ApiResponse::success($response, $formatted, 'Data level berhasil diambil.');
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $id = (int)$args['id'];
        $stmt = $this->pdo->prepare("
            SELECT l.id, l.name, l.description, l.is_active, l.deleted_at, l.created_at, l.updated_at,
                   COUNT(u.id) AS user_count
            FROM levels l
            LEFT JOIN users u ON u.level_id = l.id
            WHERE l.id = :id AND l.deleted_at IS NULL
            GROUP BY l.id, l.name, l.description, l.is_active, l.deleted_at, l.created_at, l.updated_at
        ");
        $stmt->execute(['id' => $id]);
        $level = $stmt->fetch();

        if (!$level) {
            return ApiResponse::notFound($response, 'Data level tidak ditemukan.');
        }

        $level['id'] = (int)$level['id'];
        $level['is_active'] = in_array($level['is_active'], ['true', true, 1, '1'], true);
        $level['user_count'] = (int)$level['user_count'];

        return ApiResponse::success($response, $level, 'Detail level berhasil diambil.');
    }

    public function store(Request $request, Response $response): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if ($level !== 'super admin') {
            return ApiResponse::forbidden($response, 'Akses ditolak. Pengaturan data level hanya dapat dilakukan oleh Super Admin.');
        }

        $data = RequestHelper::getJsonData($request);
        $name = trim($data['name'] ?? '');
        $description = trim($data['description'] ?? '');
        $isActive = isset($data['is_active']) ? filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN) : true;

        $errors = [];
        if (empty($name)) {
            $errors['name'] = 'Nama level wajib diisi.';
        } elseif (strlen($name) < 2 || strlen($name) > 50) {
            $errors['name'] = 'Nama level harus antara 2 hingga 50 karakter.';
        }

        if (empty($errors['name'])) {
            $stmt = $this->pdo->prepare("SELECT id FROM levels WHERE LOWER(name) = LOWER(:name) AND deleted_at IS NULL");
            $stmt->execute(['name' => $name]);
            if ($stmt->fetch()) {
                $errors['name'] = 'Nama level sudah digunakan.';
            }
        }

        if (!empty($errors)) {
            return ApiResponse::error($response, 'Validasi gagal.', $errors, 422);
        }

        $now = date('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare("
            INSERT INTO levels (name, description, is_active, created_at, updated_at)
            VALUES (:name, :description, :is_active, :created_at, :updated_at)
        ");
        $stmt->execute([
            'name' => $name,
            'description' => $description,
            'is_active' => $isActive ? 'true' : 'false',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $newId = (int)$this->pdo->lastInsertId();

        return ApiResponse::success($response, [
            'id' => $newId,
            'name' => $name,
            'description' => $description,
            'is_active' => $isActive,
        ], 'Level baru berhasil ditambahkan.', 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if ($level !== 'super admin') {
            return ApiResponse::forbidden($response, 'Akses ditolak. Pengaturan data level hanya dapat dilakukan oleh Super Admin.');
        }

        $id = (int)$args['id'];
        $stmt = $this->pdo->prepare("SELECT * FROM levels WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            return ApiResponse::notFound($response, 'Data level tidak ditemukan.');
        }

        $data = RequestHelper::getJsonData($request);
        $name = trim($data['name'] ?? $existing['name']);
        $description = trim($data['description'] ?? $existing['description']);
        $isActive = isset($data['is_active']) ? filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN) : in_array($existing['is_active'], ['true', true, 1, '1'], true);

        $errors = [];
        if (empty($name)) {
            $errors['name'] = 'Nama level wajib diisi.';
        }

        if (empty($errors['name'])) {
            $stmt = $this->pdo->prepare("SELECT id FROM levels WHERE LOWER(name) = LOWER(:name) AND id != :id AND deleted_at IS NULL");
            $stmt->execute(['name' => $name, 'id' => $id]);
            if ($stmt->fetch()) {
                $errors['name'] = 'Nama level sudah digunakan.';
            }
        }

        if (!empty($errors)) {
            return ApiResponse::error($response, 'Validasi gagal.', $errors, 422);
        }

        $now = date('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare("
            UPDATE levels
            SET name = :name, description = :description, is_active = :is_active, updated_at = :updated_at
            WHERE id = :id
        ");
        $stmt->execute([
            'id' => $id,
            'name' => $name,
            'description' => $description,
            'is_active' => $isActive ? 'true' : 'false',
            'updated_at' => $now,
        ]);

        return ApiResponse::success($response, [
            'id' => $id,
            'name' => $name,
            'description' => $description,
            'is_active' => $isActive,
        ], 'Data level berhasil diperbarui.');
    }

    public function destroy(Request $request, Response $response, array $args): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if ($level !== 'super admin') {
            return ApiResponse::forbidden($response, 'Akses ditolak. Pengaturan data level hanya dapat dilakukan oleh Super Admin.');
        }

        $id = (int)$args['id'];
        $params = $request->getQueryParams();
        $useSoftDelete = isset($params['soft']) && filter_var($params['soft'], FILTER_VALIDATE_BOOLEAN);

        $stmt = $this->pdo->prepare("SELECT id, name FROM levels WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);
        $level = $stmt->fetch();

        if (!$level) {
            return ApiResponse::notFound($response, 'Data level tidak ditemukan.');
        }

        $userCountStmt = $this->pdo->prepare("SELECT COUNT(*) FROM users WHERE level_id = :id");
        $userCountStmt->execute(['id' => $id]);
        $userCount = (int)$userCountStmt->fetchColumn();

        if ($userCount > 0 && !$useSoftDelete) {
            return ApiResponse::error($response, "Level '{$level['name']}' masih digunakan oleh {$userCount} user. Gunakan opsi soft delete atau pindahkan user terlebih dahulu.", [
                'user_count' => $userCount,
                'suggestion' => 'Kirim parameter ?soft=true untuk melakukan soft delete.'
            ], 409);
        }

        $now = date('Y-m-d H:i:s');
        if ($useSoftDelete || $userCount > 0) {
            $softStmt = $this->pdo->prepare("UPDATE levels SET deleted_at = :now, is_active = 'false' WHERE id = :id");
            $softStmt->execute(['now' => $now, 'id' => $id]);
            return ApiResponse::success($response, ['soft_deleted' => true], "Level '{$level['name']}' berhasil diarsipkan (soft delete).");
        }

        $delPermStmt = $this->pdo->prepare("DELETE FROM level_permissions WHERE level_id = :id");
        $delPermStmt->execute(['id' => $id]);

        $delStmt = $this->pdo->prepare("DELETE FROM levels WHERE id = :id");
        $delStmt->execute(['id' => $id]);

        return ApiResponse::success($response, ['hard_deleted' => true], "Level '{$level['name']}' berhasil dihapus permanen.");
    }
}

