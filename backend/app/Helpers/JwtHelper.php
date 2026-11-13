<?php

namespace App\Helpers;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class JwtHelper
{
    private string $secretKey;
    private string $algorithm;
    private int $expiration;

    public function __construct(?string $secretKey = null, string $algorithm = 'HS256', int $expiration = 86400)
    {
        $this->secretKey = $secretKey ?? ($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: 'TestIMC_Secret_Token_Key_2026!#');
        $this->algorithm = $algorithm;
        $this->expiration = $expiration; // 24 hours default
    }

    public function generateToken(array $user): string
    {
        $issuedAt = time();
        $expireAt = $issuedAt + $this->expiration;

        $payload = [
            'iss' => 'imc-user-management-api',
            'iat' => $issuedAt,
            'exp' => $expireAt,
            'sub' => $user['id'],
            'user' => [
                'id' => (int) $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'full_name' => $user['full_name'],
                'level_id' => (int) $user['level_id'],
                'level_name' => $user['level_name'] ?? null,
                'is_active' => (bool) $user['is_active'],
            ]
        ];

        return JWT::encode($payload, $this->secretKey, $this->algorithm);
    }

    public function validateToken(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secretKey, $this->algorithm));
            return (array) $decoded;
        } catch (Exception $e) {
            return null;
        }
    }
}
