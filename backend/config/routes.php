<?php

use App\Controllers\AuthController;
use App\Controllers\LevelController;
use App\Controllers\PageController;
use App\Controllers\PermissionController;
use App\Controllers\ReportController;
use App\Controllers\UserController;
use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;
use App\Middleware\PermissionMiddleware;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

return function (App $app) {
    $app->get('/api/health', function ($request, $response) {
        return ApiResponse::success($response, [
            'status' => 'UP',
            'timestamp' => date('Y-m-d H:i:s'),
            'app' => 'IMC User Access Management API',
        ], 'API berjalan normal.');
    });

    $app->get('/api/system/migrate', function ($request, $response) {
        $params = $request->getQueryParams();
        if (($params['secret'] ?? '') !== 'imc2026migrate') {
            return ApiResponse::error($response, 'Unauthorized migration trigger.', [], 401);
        }

        try {
            $pdo = \App\Config\Database::getConnection();
            $schemaFile = dirname(__DIR__) . '/database/schema.sql';
            $seedsFile = dirname(__DIR__) . '/database/seeds.sql';

            $schemaSql = file_get_contents($schemaFile);
            $pdo->exec($schemaSql);

            $seedsSql = file_get_contents($seedsFile);
            $pdo->exec($seedsSql);

            return ApiResponse::success($response, [
                'tables_created' => true,
                'seeds_inserted' => true,
            ], 'Migrasi database dan seeding data awal berhasil dijalankan.');
        } catch (\Throwable $e) {
            error_log('[MIGRATE ERROR] ' . $e->getMessage());
            return ApiResponse::error($response, 'Gagal menjalankan migrasi database. Silakan periksa log server.', [], 500);
        }
    });

    $app->group('/api/auth', function (RouteCollectorProxy $group) {
        $group->post('/login', [AuthController::class, 'login']);
    });

    $app->group('/api', function (RouteCollectorProxy $group) {
        $group->get('/auth/me', [AuthController::class, 'me']);
        $group->post('/auth/refresh', [AuthController::class, 'refreshToken']);
        $group->post('/auth/logout', [AuthController::class, 'logout']);
        $group->get('/permissions/my-permissions', [PermissionController::class, 'getMyPermissions']);

        $group->get('/options/levels', [LevelController::class, 'index']);
        $group->get('/options/pages', [PageController::class, 'index']);

        $group->group('/users', function (RouteCollectorProxy $userGroup) {
            $userGroup->get('', [UserController::class, 'index']);
            $userGroup->post('', [UserController::class, 'store']);
            $userGroup->get('/{id:[0-9]+}', [UserController::class, 'show']);
            $userGroup->put('/{id:[0-9]+}', [UserController::class, 'update']);
            $userGroup->delete('/{id:[0-9]+}', [UserController::class, 'destroy']);
        })->add(new PermissionMiddleware('/users'));

        $group->group('/levels', function (RouteCollectorProxy $levelGroup) {
            $levelGroup->get('', [LevelController::class, 'index']);
            $levelGroup->post('', [LevelController::class, 'store']);
            $levelGroup->get('/{id:[0-9]+}', [LevelController::class, 'show']);
            $levelGroup->put('/{id:[0-9]+}', [LevelController::class, 'update']);
            $levelGroup->delete('/{id:[0-9]+}', [LevelController::class, 'destroy']);
        })->add(new PermissionMiddleware('/levels'));

        $group->group('/pages', function (RouteCollectorProxy $pageGroup) {
            $pageGroup->get('', [PageController::class, 'index']);
            $pageGroup->post('', [PageController::class, 'store']);
            $pageGroup->put('/reorder', [PageController::class, 'reorder']);
            $pageGroup->get('/{id:[0-9]+}', [PageController::class, 'show']);
            $pageGroup->put('/{id:[0-9]+}', [PageController::class, 'update']);
            $pageGroup->delete('/{id:[0-9]+}', [PageController::class, 'destroy']);
        })->add(new PermissionMiddleware('/pages'));

        $group->group('/permissions', function (RouteCollectorProxy $permGroup) {
            $permGroup->get('/matrix', [PermissionController::class, 'getMatrix']);
            $permGroup->get('/levels/{id:[0-9]+}', [PermissionController::class, 'getLevelPermissions']);
            $permGroup->post('/levels/{id:[0-9]+}', [PermissionController::class, 'updateLevelPermissions']);
            $permGroup->get('/users/{id:[0-9]+}', [PermissionController::class, 'getUserPermissions']);
            $permGroup->post('/users/{id:[0-9]+}', [PermissionController::class, 'updateUserPermissions']);
        })->add(new PermissionMiddleware('/permissions'));

        $group->group('/reports', function (RouteCollectorProxy $reportGroup) {
            $reportGroup->get('', [ReportController::class, 'index']);
        })->add(new PermissionMiddleware('/reports'));

    })->add(new AuthMiddleware());
};
