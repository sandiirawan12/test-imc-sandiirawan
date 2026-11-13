<?php

namespace App\Controllers;

use App\Config\Database;
use App\Helpers\ApiResponse;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ReportController
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::getConnection();
    }

    public function index(Request $request, Response $response): Response
    {
        $user = $request->getAttribute('user');

        $userCount = (int)$this->pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $activeUserCount = (int)$this->pdo->query("SELECT COUNT(*) FROM users WHERE is_active = 'true'")->fetchColumn();
        $levelCount = (int)$this->pdo->query("SELECT COUNT(*) FROM levels WHERE deleted_at IS NULL")->fetchColumn();
        $pageCount = (int)$this->pdo->query("SELECT COUNT(*) FROM pages WHERE is_active = 'true'")->fetchColumn();

        $stats = [
            'total_users' => $userCount,
            'active_users' => $activeUserCount,
            'inactive_users' => $userCount - $activeUserCount,
            'total_levels' => $levelCount,
            'total_pages' => $pageCount,
            'accessed_by' => [
                'user_id' => (int)$user['id'],
                'username' => $user['username'],
                'level' => $user['level_name'],
            ],
            'generated_at' => date('Y-m-d H:i:s'),
        ];

        return ApiResponse::success($response, $stats, 'Laporan ringkasan aktivitas sistem.');
    }
}

