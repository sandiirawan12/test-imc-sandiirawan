<?php

namespace App\Middleware;

use App\Helpers\ApiResponse;
use App\Services\PermissionResolver;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Response as SlimResponse;

class PermissionMiddleware implements MiddlewareInterface
{
    private string $requiredRoute;
    private PermissionResolver $permissionResolver;

    public function __construct(string $requiredRoute, ?PermissionResolver $permissionResolver = null)
    {
        $this->requiredRoute = $requiredRoute;
        $this->permissionResolver = $permissionResolver ?? new PermissionResolver();
    }

    public function process(Request $request, RequestHandler $handler): Response
    {
        $user = $request->getAttribute('user');

        if (!$user) {
            $res = new SlimResponse();
            return ApiResponse::unauthorized($res);
        }

        $userId = (int) $user['id'];

        if (!$this->permissionResolver->canUserAccessRoute($userId, $this->requiredRoute)) {
            $res = new SlimResponse();
            return ApiResponse::forbidden($res, "Akses ditolak. Anda tidak memiliki izin untuk halaman/modul '{$this->requiredRoute}'.");
        }

        return $handler->handle($request);
    }
}

