<?php

namespace App\Middleware;

use App\Config\Database;
use App\Helpers\ApiResponse;
use App\Helpers\JwtHelper;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Response as SlimResponse;

class AuthMiddleware implements MiddlewareInterface
{
    private JwtHelper $jwtHelper;
    private PDO $pdo;

    public function __construct(?JwtHelper $jwtHelper = null, ?PDO $pdo = null)
    {
        $this->jwtHelper = $jwtHelper ?? new JwtHelper();
        $this->pdo = $pdo ?? Database::getConnection();
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        $authHeader = $request->getHeaderLine('Authorization');

        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $res = new SlimResponse();
            return ApiResponse::unauthorized($res, 'Token autentikasi tidak ditemukan. Silakan login.');
        }

        $token = $matches[1];
        $decoded = $this->jwtHelper->validateToken($token);

        if (!$decoded || empty($decoded['sub'])) {
            $res = new SlimResponse();
            return ApiResponse::unauthorized($res, 'Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.');
        }

        $userId = (int) $decoded['sub'];

        $stmt = $this->pdo->prepare("
            SELECT u.id, u.full_name, u.username, u.email, u.level_id, u.is_active,
                   l.name AS level_name, l.is_active AS level_active, l.deleted_at AS level_deleted_at
            FROM users u
            JOIN levels l ON l.id = u.level_id
            WHERE u.id = :id
        ");
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        if (!$user) {
            $res = new SlimResponse();
            return ApiResponse::unauthorized($res, 'Pengguna tidak ditemukan dalam sistem.');
        }

        if (!in_array($user['is_active'], ['true', true, 1, '1'], true)) {
            $res = new SlimResponse();
            return ApiResponse::unauthorized($res, 'Akun Anda sedang dinonaktifkan. Silakan hubungi administrator.');
        }

        if (!in_array($user['level_active'], ['true', true, 1, '1'], true) || !empty($user['level_deleted_at'])) {
            $res = new SlimResponse();
            return ApiResponse::forbidden($res, 'Level jabatan Anda saat ini tidak aktif.');
        }

        $request = $request->withAttribute('user', $user);
        return $handler->handle($request);
    }
}

