<?php

namespace App\Controllers;

use App\Config\Database;
use App\Helpers\ApiResponse;
use App\Helpers\RequestHelper;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class PageController
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::getConnection();
    }

    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $isActive = isset($params['is_active']) && $params['is_active'] !== '' ? filter_var($params['is_active'], FILTER_VALIDATE_BOOLEAN) : null;

        $sql = "SELECT id, name, path, icon, description, sort_order, is_active, created_at, updated_at FROM pages WHERE 1=1";
        $bindings = [];

        if ($isActive !== null) {
            $sql .= " AND is_active = :is_active";
            $bindings['is_active'] = $isActive ? 'true' : 'false';
        }

        $sql .= " ORDER BY sort_order ASC, id ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($bindings);
        $pages = $stmt->fetchAll();

        $formatted = array_map(fn($p) => [
            'id' => (int)$p['id'],
            'name' => $p['name'],
            'path' => $p['path'],
            'icon' => $p['icon'] ?? 'layers',
            'description' => $p['description'],
            'sort_order' => (int)$p['sort_order'],
            'is_active' => in_array($p['is_active'], ['true', true, 1, '1'], true),
            'created_at' => $p['created_at'],
            'updated_at' => $p['updated_at'],
        ], $pages);

        return ApiResponse::success($response, $formatted, 'Data page berhasil diambil.');
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $id = (int)$args['id'];
        $stmt = $this->pdo->prepare("SELECT id, name, path, icon, description, sort_order, is_active, created_at, updated_at FROM pages WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $page = $stmt->fetch();

        if (!$page) {
            return ApiResponse::notFound($response, 'Data page tidak ditemukan.');
        }

        $page['id'] = (int)$page['id'];
        $page['sort_order'] = (int)$page['sort_order'];
        $page['is_active'] = in_array($page['is_active'], ['true', true, 1, '1'], true);

        return ApiResponse::success($response, $page, 'Detail page berhasil diambil.');
    }

    public function store(Request $request, Response $response): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if (!in_array($level, ['super admin', 'manager'], true)) {
            return ApiResponse::forbidden($response, 'Akses ditolak. Peran Anda bersifat Read-Only (hanya lihat) dan tidak dapat menambah data page.');
        }

        $data = RequestHelper::getJsonData($request);
        $name = trim($data['name'] ?? '');
        $path = trim($data['path'] ?? '');
        $icon = trim($data['icon'] ?? 'layers');
        $description = trim($data['description'] ?? '');
        $sortOrder = isset($data['sort_order']) ? (int)$data['sort_order'] : 10;
        $isActive = isset($data['is_active']) ? filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN) : true;

        $errors = [];
        if (empty($name)) {
            $errors['name'] = 'Nama page wajib diisi.';
        }
        if (empty($path)) {
            $errors['path'] = 'Route/path wajib diisi.';
        } elseif (!str_starts_with($path, '/')) {
            $path = '/' . $path;
        }

        if (empty($errors['path'])) {
            $stmt = $this->pdo->prepare("SELECT id FROM pages WHERE LOWER(path) = LOWER(:path)");
            $stmt->execute(['path' => $path]);
            if ($stmt->fetch()) {
                $errors['path'] = 'Route/path sudah terdaftar untuk page lain.';
            }
        }

        if (!empty($errors)) {
            return ApiResponse::error($response, 'Validasi gagal.', $errors, 422);
        }

        $now = date('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare("
            INSERT INTO pages (name, path, icon, description, sort_order, is_active, created_at, updated_at)
            VALUES (:name, :path, :icon, :description, :sort_order, :is_active, :created_at, :updated_at)
        ");
        $stmt->execute([
            'name' => $name,
            'path' => $path,
            'icon' => $icon,
            'description' => $description,
            'sort_order' => $sortOrder,
            'is_active' => $isActive ? 'true' : 'false',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $newId = (int)$this->pdo->lastInsertId();

        return ApiResponse::success($response, [
            'id' => $newId,
            'name' => $name,
            'path' => $path,
            'icon' => $icon,
            'description' => $description,
            'sort_order' => $sortOrder,
            'is_active' => $isActive,
        ], 'Page baru berhasil ditambahkan.', 201);
    }

    public function reorder(Request $request, Response $response): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if (!in_array($level, ['super admin', 'manager'], true)) {
            return ApiResponse::forbidden($response, 'Akses ditolak. Peran Anda bersifat Read-Only (hanya lihat) dan tidak dapat mengubah urutan menu.');
        }

        $data = RequestHelper::getJsonData($request);
        $items = $data['orders'] ?? $data;

        if (!is_array($items) || empty($items)) {
            return ApiResponse::error($response, 'Data urutan menu tidak valid.', [], 422);
        }

        $now = date('Y-m-d H:i:s');
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("UPDATE pages SET sort_order = :sort_order, updated_at = :updated_at WHERE id = :id");
            foreach ($items as $item) {
                if (isset($item['id'], $item['sort_order'])) {
                    $stmt->execute([
                        'id' => (int)$item['id'],
                        'sort_order' => (int)$item['sort_order'],
                        'updated_at' => $now,
                    ]);
                }
            }
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            error_log('[REORDER ERROR] ' . $e->getMessage());
            return ApiResponse::error($response, 'Gagal memperbarui urutan menu. Silakan coba beberapa saat lagi.', [], 500);
        }

        return ApiResponse::success($response, null, 'Urutan menu berhasil diperbarui.');
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if (!in_array($level, ['super admin', 'manager'], true)) {
            return ApiResponse::forbidden($response, 'Akses ditolak. Peran Anda bersifat Read-Only (hanya lihat) dan tidak dapat mengubah data page.');
        }

        $id = (int)$args['id'];
        $stmt = $this->pdo->prepare("SELECT * FROM pages WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            return ApiResponse::notFound($response, 'Data page tidak ditemukan.');
        }

        $data = RequestHelper::getJsonData($request);
        $name = trim($data['name'] ?? $existing['name']);
        $path = trim($data['path'] ?? $existing['path']);
        $icon = trim($data['icon'] ?? ($existing['icon'] ?? 'layers'));
        $description = trim($data['description'] ?? ($existing['description'] ?? ''));
        $sortOrder = isset($data['sort_order']) ? (int)$data['sort_order'] : (int)$existing['sort_order'];
        $isActive = isset($data['is_active']) ? filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN) : in_array($existing['is_active'], ['true', true, 1, '1'], true);

        $errors = [];
        if (empty($name)) {
            $errors['name'] = 'Nama page wajib diisi.';
        }
        if (empty($path)) {
            $errors['path'] = 'Route/path wajib diisi.';
        } elseif (!str_starts_with($path, '/')) {
            $path = '/' . $path;
        }

        if (empty($errors['path'])) {
            $stmt = $this->pdo->prepare("SELECT id FROM pages WHERE LOWER(path) = LOWER(:path) AND id != :id");
            $stmt->execute(['path' => $path, 'id' => $id]);
            if ($stmt->fetch()) {
                $errors['path'] = 'Route/path sudah terdaftar untuk page lain.';
            }
        }

        if (!empty($errors)) {
            return ApiResponse::error($response, 'Validasi gagal.', $errors, 422);
        }

        $now = date('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare("
            UPDATE pages
            SET name = :name, path = :path, icon = :icon, description = :description,
                sort_order = :sort_order, is_active = :is_active, updated_at = :updated_at
            WHERE id = :id
        ");
        $stmt->execute([
            'id' => $id,
            'name' => $name,
            'path' => $path,
            'icon' => $icon,
            'description' => $description,
            'sort_order' => $sortOrder,
            'is_active' => $isActive ? 'true' : 'false',
            'updated_at' => $now,
        ]);

        return ApiResponse::success($response, [
            'id' => $id,
            'name' => $name,
            'path' => $path,
            'icon' => $icon,
            'description' => $description,
            'sort_order' => $sortOrder,
            'is_active' => $isActive,
        ], 'Data page berhasil diperbarui.');
    }

    public function destroy(Request $request, Response $response, array $args): Response
    {
        $currentUser = $request->getAttribute('user');
        $level = strtolower($currentUser['level_name'] ?? '');
        if (!in_array($level, ['super admin', 'manager'], true)) {
            return ApiResponse::forbidden($response, 'Akses ditolak. Peran Anda bersifat Read-Only (hanya lihat) dan tidak dapat menghapus data page.');
        }

        $id = (int)$args['id'];
        $stmt = $this->pdo->prepare("SELECT id, name FROM pages WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $page = $stmt->fetch();

        if (!$page) {
            return ApiResponse::notFound($response, 'Data page tidak ditemukan.');
        }

        $this->pdo->prepare("DELETE FROM level_permissions WHERE page_id = :id")->execute(['id' => $id]);
        $this->pdo->prepare("DELETE FROM user_permissions WHERE page_id = :id")->execute(['id' => $id]);
        $this->pdo->prepare("DELETE FROM pages WHERE id = :id")->execute(['id' => $id]);

        return ApiResponse::success($response, null, "Page '{$page['name']}' berhasil dihapus.");
    }
}

