<?php

namespace App\Services;

use App\Config\Database;
use PDO;

class PermissionResolver
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::getConnection();
    }

    public function getUserAccessiblePages(int $userId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT u.id, u.username, u.is_active AS user_active, u.level_id,
                   l.name AS level_name, l.is_active AS level_active, l.deleted_at AS level_deleted_at
            FROM users u
            JOIN levels l ON l.id = u.level_id
            WHERE u.id = :user_id
        ");
        $stmt->execute(['user_id' => $userId]);
        $user = $stmt->fetch();

        $isUserActive = $user && in_array($user['user_active'], ['true', true, 1, '1'], true);
        $isLevelActive = $user && in_array($user['level_active'], ['true', true, 1, '1'], true);

        if (!$user || !$isUserActive || !$isLevelActive || !empty($user['level_deleted_at'])) {
            return [];
        }

        $stmtPages = $this->pdo->prepare("
            SELECT id, name, path, icon, description, sort_order
            FROM pages
            WHERE is_active = 'true'
            ORDER BY sort_order ASC, id ASC
        ");
        $stmtPages->execute();
        $pages = $stmtPages->fetchAll();

        $stmtLevel = $this->pdo->prepare("
            SELECT page_id FROM level_permissions WHERE level_id = :level_id
        ");
        $stmtLevel->execute(['level_id' => $user['level_id']]);
        $levelPageIds = $stmtLevel->fetchAll(PDO::FETCH_COLUMN);
        $levelPageMap = array_fill_keys($levelPageIds, true);

        $stmtUser = $this->pdo->prepare("
            SELECT page_id, is_allowed FROM user_permissions WHERE user_id = :user_id
        ");
        $stmtUser->execute(['user_id' => $userId]);
        $userOverrides = [];
        foreach ($stmtUser->fetchAll() as $row) {
            $userOverrides[(int)$row['page_id']] = in_array($row['is_allowed'], ['true', true, 1, '1'], true);
        }

        $accessiblePages = [];
        foreach ($pages as $page) {
            $pageId = (int)$page['id'];
            $isAllowed = $userOverrides[$pageId] ?? isset($levelPageMap[$pageId]);

            if ($isAllowed) {
                $accessiblePages[] = [
                    'id' => (int)$page['id'],
                    'name' => $page['name'],
                    'path' => $page['path'],
                    'icon' => $page['icon'] ?? 'layers',
                    'description' => $page['description'],
                    'sort_order' => (int)$page['sort_order'],
                ];
            }
        }

        return $accessiblePages;
    }

    public function canUserAccessRoute(int $userId, string $routePath): bool
    {
        $accessiblePages = $this->getUserAccessiblePages($userId);
        $cleanPath = '/' . ltrim(trim($routePath), '/');

        foreach ($accessiblePages as $page) {
            $pagePath = '/' . ltrim(trim($page['path']), '/');
            if ($cleanPath === $pagePath || str_starts_with($cleanPath, $pagePath . '/')) {
                return true;
            }
        }

        return false;
    }

    public function getFullMatrix(): array
    {
        $levelsStmt = $this->pdo->query("SELECT id, name, description, is_active FROM levels WHERE deleted_at IS NULL ORDER BY id ASC");
        $levels = $levelsStmt->fetchAll();

        $pagesStmt = $this->pdo->query("SELECT id, name, path, icon, description, sort_order, is_active FROM pages ORDER BY sort_order ASC, id ASC");
        $pages = $pagesStmt->fetchAll();

        $usersStmt = $this->pdo->query("
            SELECT u.id, u.full_name, u.username, u.email, u.level_id, u.is_active, l.name AS level_name
            FROM users u
            JOIN levels l ON l.id = u.level_id
            WHERE l.deleted_at IS NULL
            ORDER BY u.id ASC
        ");
        $users = $usersStmt->fetchAll();

        $levelPermsStmt = $this->pdo->query("SELECT level_id, page_id FROM level_permissions");
        $levelPerms = $levelPermsStmt->fetchAll();

        $userPermsStmt = $this->pdo->query("SELECT user_id, page_id, is_allowed FROM user_permissions");
        $userPerms = $userPermsStmt->fetchAll();

        return [
            'levels' => array_map(fn($l) => [
                'id' => (int)$l['id'],
                'name' => $l['name'],
                'description' => $l['description'],
                'is_active' => in_array($l['is_active'], ['true', true, 1, '1'], true),
            ], $levels),
            'pages' => array_map(fn($p) => [
                'id' => (int)$p['id'],
                'name' => $p['name'],
                'path' => $p['path'],
                'icon' => $p['icon'],
                'description' => $p['description'],
                'sort_order' => (int)$p['sort_order'],
                'is_active' => in_array($p['is_active'], ['true', true, 1, '1'], true),
            ], $pages),
            'users' => array_map(fn($u) => [
                'id' => (int)$u['id'],
                'full_name' => $u['full_name'],
                'username' => $u['username'],
                'email' => $u['email'],
                'level_id' => (int)$u['level_id'],
                'level_name' => $u['level_name'],
                'is_active' => in_array($u['is_active'], ['true', true, 1, '1'], true),
            ], $users),
            'level_permissions' => array_map(fn($lp) => [
                'level_id' => (int)$lp['level_id'],
                'page_id' => (int)$lp['page_id'],
            ], $levelPerms),
            'user_permissions' => array_map(fn($up) => [
                'user_id' => (int)$up['user_id'],
                'page_id' => (int)$up['page_id'],
                'is_allowed' => in_array($up['is_allowed'], ['true', true, 1, '1'], true),
            ], $userPerms),
        ];
    }
}
