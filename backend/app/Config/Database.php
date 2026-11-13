<?php

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $pdo = null;

    public static function getConnection(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $connection = $_ENV['DB_CONNECTION'] ?? getenv('DB_CONNECTION') ?: 'pgsql';

        if ($connection === 'sqlite') {
            $rawDb = $_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: '';
            if (!empty($rawDb) && (str_contains($rawDb, '.sqlite') || str_contains($rawDb, '/') || str_contains($rawDb, '\\'))) {
                $dbPath = $rawDb;
            } else {
                $dbPath = dirname(__DIR__, 2) . '/database/app.sqlite';
            }

            if (!str_starts_with($dbPath, '/') && !preg_match('/^[a-zA-Z]:/', $dbPath)) {
                $dbPath = dirname(__DIR__, 2) . '/' . ltrim($dbPath, '/\\');
            }

            $dsn = "sqlite:" . $dbPath;

            try {
                self::$pdo = new PDO($dsn);
                self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                self::$pdo->exec('PRAGMA foreign_keys = ON;');
                return self::$pdo;
            } catch (PDOException $e) {
                throw new PDOException("Gagal koneksi SQLite: " . $e->getMessage(), (int)$e->getCode());
            }
        }

        // Dukungan DATABASE_URL connection string (Railway, Supabase, Render, dll)
        $databaseUrl = $_ENV['DATABASE_URL'] ?? getenv('DATABASE_URL');
        if (!empty($databaseUrl)) {
            $parsed = parse_url($databaseUrl);
            $host = $parsed['host'] ?? '127.0.0.1';
            $port = $parsed['port'] ?? 5432;
            $user = isset($parsed['user']) ? urldecode($parsed['user']) : 'postgres';
            $password = isset($parsed['pass']) ? urldecode($parsed['pass']) : '';
            $dbname = isset($parsed['path']) ? ltrim($parsed['path'], '/') : 'postgres';

            $sslMode = $_ENV['DB_SSLMODE'] ?? getenv('DB_SSLMODE') ?: null;
            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";
            if ($sslMode) {
                $dsn .= ";sslmode={$sslMode}";
            }

            try {
                self::$pdo = new PDO($dsn, $user, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
                return self::$pdo;
            } catch (PDOException $e) {
                throw new PDOException("Gagal koneksi ke database cloud ({$host}:{$port}/{$dbname}): " . $e->getMessage(), (int)$e->getCode());
            }
        }

        $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1';
        $port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '5432';
        $dbname = $_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: 'imc_user_mgmt';
        $user = $_ENV['DB_USERNAME'] ?? getenv('DB_USERNAME') ?: 'postgres';
        $password = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: 'postgres';
        $sslMode = $_ENV['DB_SSLMODE'] ?? getenv('DB_SSLMODE') ?: null;

        $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";
        if ($sslMode) {
            $dsn .= ";sslmode={$sslMode}";
        }

        try {
            self::$pdo = new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            return self::$pdo;
        } catch (PDOException $e) {
            throw new PDOException("Gagal koneksi ke database PostgreSQL ({$host}:{$port}/{$dbname}): " . $e->getMessage(), (int)$e->getCode());
        }
    }
}
