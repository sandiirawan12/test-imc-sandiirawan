<?php

use App\Helpers\ApiResponse;
use App\Middleware\CorsMiddleware;
use App\Middleware\JsonBodyParserMiddleware;
use Dotenv\Dotenv;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use Slim\Psr7\Response;

require __DIR__ . '/../vendor/autoload.php';

$dotenvPath = dirname(__DIR__);
if (file_exists($dotenvPath . '/.env')) {
    $dotenv = Dotenv::createImmutable($dotenvPath);
    $dotenv->safeLoad();
}

$app = AppFactory::create();

$app->options('/{routes:.+}', function (Request $request, Response $response) {
    return $response;
});

$app->addRoutingMiddleware();
$app->add(new JsonBodyParserMiddleware());
$app->add(new CorsMiddleware());

$errorMiddleware = $app->addErrorMiddleware(false, true, true);
$errorMiddleware->setDefaultErrorHandler(function (
    Request $request,
    Throwable $exception,
    bool $displayErrorDetails,
    bool $logErrors,
    bool $logErrorDetails
) {
    $response = new Response();
    $statusCode = 500;
    $rawMessage = $exception->getMessage();

    // Selalu catat error detail di log server untuk debugging developer
    error_log('[SERVER ERROR] ' . $rawMessage . ' in ' . $exception->getFile() . ':' . $exception->getLine());

    if ($exception instanceof \Slim\Exception\HttpNotFoundException) {
        $statusCode = 404;
        $message = 'Endpoint API tidak ditemukan.';
    } elseif ($exception instanceof \Slim\Exception\HttpMethodNotAllowedException) {
        $statusCode = 405;
        $message = 'Metode HTTP tidak diizinkan untuk endpoint ini.';
    } else {
        $message = 'Terjadi kesalahan pada sistem server. Silakan coba beberapa saat lagi.';
    }

    $res = ApiResponse::error($response, $message, [], $statusCode);
    $origin = $request->getHeaderLine('Origin');
    $allowedOrigins = ['http://localhost:4200', 'http://localhost:3000', 'http://127.0.0.1:4200'];
    $allowOrigin = in_array($origin, $allowedOrigins) ? $origin : '*';
    $res = $res
        ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if ($allowOrigin !== '*') {
        $res = $res->withHeader('Access-Control-Allow-Credentials', 'true');
    }
    return $res;
});

$routes = require __DIR__ . '/../config/routes.php';
$routes($app);

$app->run();
