<?php

namespace App\Helpers;

use Psr\Http\Message\ResponseInterface as Response;

class ApiResponse
{
    public static function json(Response $response, array $payload, int $status = 200): Response
    {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        $response->getBody()->write($json ?: '{}');
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    public static function success(Response $response, mixed $data = null, string $message = 'Permintaan berhasil diproses', int $status = 200): Response
    {
        $payload = [
            'status' => 'success',
            'message' => $message,
            'data' => $data,
        ];
        return self::json($response, $payload, $status);
    }

    public static function error(Response $response, string $message = 'Terjadi kesalahan', array $errors = [], int $status = 400): Response
    {
        // Cegah kebocoran query SQL atau detail internal database ke user/client
        if (self::containsSqlOrDbDetails($message)) {
            error_log('[SECURITY - DB DETAIL BLOCKED] ' . $message);
            $message = 'Terjadi kesalahan pada pemrosesan database. Silakan coba kembali nanti.';
        }

        $sanitizedErrors = [];
        foreach ($errors as $key => $val) {
            if (is_string($val) && self::containsSqlOrDbDetails($val)) {
                error_log("[SECURITY - DB DETAIL BLOCKED in errors.{$key}] " . $val);
                $sanitizedErrors[$key] = 'Format data atau parameter tidak valid.';
            } else {
                $sanitizedErrors[$key] = $val;
            }
        }

        $payload = [
            'status' => 'error',
            'message' => $message,
        ];

        if (!empty($sanitizedErrors)) {
            $payload['errors'] = $sanitizedErrors;
        }

        return self::json($response, $payload, $status);
    }

    private static function containsSqlOrDbDetails(string $text): bool
    {
        $patterns = [
            'SQLSTATE',
            'PDOException',
            'syntax error',
            'relation "',
            'table "',
            'column "',
            'constraint "',
            'unique constraint',
            'foreign key constraint',
            'connection to server',
            'pg_',
            'SELECT ',
            'INSERT INTO',
            'UPDATE ',
            'DELETE FROM',
        ];

        foreach ($patterns as $pattern) {
            if (stripos($text, $pattern) !== false) {
                return true;
            }
        }

        return false;
    }

    public static function notFound(Response $response, string $message = 'Data tidak ditemukan'): Response
    {
        return self::error($response, $message, [], 404);
    }

    public static function unauthorized(Response $response, string $message = 'Akses tidak diizinkan. Silakan login terlebih dahulu.'): Response
    {
        return self::error($response, $message, [], 401);
    }

    public static function forbidden(Response $response, string $message = 'Anda tidak memiliki hak akses ke halaman/resource ini.'): Response
    {
        return self::error($response, $message, [], 403);
    }
}

