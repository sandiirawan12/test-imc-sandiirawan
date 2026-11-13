<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Config\Database;
use Dotenv\Dotenv;

$dotenvPath = dirname(__DIR__);

// 1. Auto-create .env jika belum ada dari .env.example
if (!file_exists($dotenvPath . '/.env') && file_exists($dotenvPath . '/.env.example')) {
    echo "[i] File .env tidak ditemukan. Menyalin otomatis dari .env.example...\n";
    copy($dotenvPath . '/.env.example', $dotenvPath . '/.env');
}

if (file_exists($dotenvPath . '/.env')) {
    $dotenv = Dotenv::createImmutable($dotenvPath);
    $dotenv->safeLoad();
}

$connType = $_ENV['DB_CONNECTION'] ?? getenv('DB_CONNECTION') ?: 'pgsql';
echo "=========================================================\n";
echo "IMC User Access Management - Database Migration & Seeder\n";
echo "Target Connection: {$connType}\n";
echo "=========================================================\n";

// 2. Jika menggunakan PostgreSQL lokal, pastikan database sudah terbuat
if ($connType === 'pgsql' && empty($_ENV['DATABASE_URL'] ?? getenv('DATABASE_URL'))) {
    $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1';
    $port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '5432';
    $dbname = $_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: 'imc_user_mgmt';
    $user = $_ENV['DB_USERNAME'] ?? getenv('DB_USERNAME') ?: 'postgres';
    $password = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: 'postgres';
    $sslMode = $_ENV['DB_SSLMODE'] ?? getenv('DB_SSLMODE') ?: null;

    try {
        $maintenanceDsn = "pgsql:host={$host};port={$port};dbname=postgres";
        if ($sslMode) {
            $maintenanceDsn .= ";sslmode={$sslMode}";
        }
        $adminPdo = new PDO($maintenanceDsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);

        $checkStmt = $adminPdo->prepare("SELECT 1 FROM pg_database WHERE datname = :dbname");
        $checkStmt->execute([':dbname' => $dbname]);
        if (!$checkStmt->fetchColumn()) {
            echo "[*] Database '{$dbname}' belum ada di server PostgreSQL. Membuat database otomatis...\n";
            $adminPdo->exec("CREATE DATABASE \"{$dbname}\"");
            echo "[✔] Database '{$dbname}' berhasil dibuat secara otomatis.\n";
        }
        unset($adminPdo);
    } catch (\Throwable $e) {
        // Abaikan jika tidak bisa connect ke default 'postgres', lanjutkan ke Database::getConnection()
    }
}

try {
    $pdo = Database::getConnection();
    echo "[✔] Koneksi database berhasil terhubung.\n";

    if ($connType === 'sqlite') {
        echo "[*] Menjalankan inisialisasi skema SQLite...\n";
        $pdo->exec("PRAGMA foreign_keys = OFF;");
        $pdo->exec("DROP TABLE IF EXISTS user_permissions;");
        $pdo->exec("DROP TABLE IF EXISTS level_permissions;");
        $pdo->exec("DROP TABLE IF EXISTS users;");
        $pdo->exec("DROP TABLE IF EXISTS pages;");
        $pdo->exec("DROP TABLE IF EXISTS levels;");

        $pdo->exec("
            CREATE TABLE levels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                is_active VARCHAR(10) NOT NULL DEFAULT 'true',
                deleted_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name VARCHAR(100) NOT NULL,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                level_id INTEGER NOT NULL REFERENCES levels(id),
                is_active VARCHAR(10) NOT NULL DEFAULT 'true',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE pages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                path VARCHAR(100) NOT NULL UNIQUE,
                icon VARCHAR(50) DEFAULT 'layers',
                description TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_active VARCHAR(10) NOT NULL DEFAULT 'true',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE level_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
                page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (level_id, page_id)
            );
            CREATE TABLE user_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
                is_allowed VARCHAR(10) NOT NULL DEFAULT 'true',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, page_id)
            );
            PRAGMA foreign_keys = ON;
        ");
        echo "[✔] Skema tabel berhasil dibuat.\n";

        $hash = '$2y$12$Tg83CPMsl2R8Y8W9EsijFOw8TSce2EOJL8N2dxw95.AHsz23ukR0W'; // password123

        $pdo->exec("
            INSERT INTO levels (id, name, description, is_active) VALUES
            (1, 'Super Admin', 'Akses penuh ke seluruh menu dan konfigurasi sistem', 'true'),
            (2, 'Manager', 'Akses manajemen pengguna, halaman, dan laporan operasional', 'true'),
            (3, 'Staff', 'Akses operasional dasar dan pelaporan', 'true'),
            (4, 'Viewer', 'Akses lihat data (read-only) untuk pemantauan', 'true');

            INSERT INTO pages (id, name, path, icon, description, sort_order, is_active) VALUES
            (1, 'Dashboard', '/dashboard', 'dashboard', 'Ringkasan data dan analitik sistem', 10, 'true'),
            (2, 'Data User', '/users', 'users', 'Manajemen data akun pengguna dan status', 20, 'true'),
            (3, 'Data Level', '/levels', 'shield', 'Manajemen level jabatan dan hak akses', 30, 'true'),
            (4, 'Data Page & Menu', '/pages', 'layers', 'Manajemen rute halaman dan menu aplikasi', 40, 'true'),
            (5, 'User Permissions', '/permissions', 'lock', 'Pengaturan matriks hak akses level & user', 50, 'true'),
            (6, 'Laporan Aktivitas', '/reports', 'activity', 'Log dan pelaporan aktivitas aplikasi', 60, 'true');

            INSERT INTO users (id, full_name, username, email, password, level_id, is_active) VALUES
            (1, 'Administrator Utama', 'admin', 'admin@imc.co.id', '{$hash}', 1, 'true'),
            (2, 'Budi Santoso', 'budi', 'budi.santoso@imc.co.id', '{$hash}', 2, 'true'),
            (3, 'Siti Rahmawati', 'siti', 'siti.rahma@imc.co.id', '{$hash}', 3, 'true'),
            (4, 'Eko Prasetyo', 'eko', 'eko.prasetyo@imc.co.id', '{$hash}', 4, 'true'),
            (5, 'Donny Irawan (Nonaktif)', 'donny', 'donny.irawan@imc.co.id', '{$hash}', 3, 'false');

            INSERT INTO level_permissions (level_id, page_id) VALUES
            (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
            (2, 1), (2, 2), (2, 4), (2, 6),
            (3, 1), (3, 6),
            (4, 1);

            INSERT INTO user_permissions (user_id, page_id, is_allowed) VALUES
            (3, 3, 'true'),
            (2, 6, 'false');
        ");
        echo "[✔] Seed data awal berhasil dimasukkan.\n";
    } else {
        echo "[*] Mengeksekusi file schema.sql ke PostgreSQL...\n";
        $schemaSql = file_get_contents(__DIR__ . '/schema.sql');
        $pdo->exec($schemaSql);
        echo "[✔] Skema tabel PostgreSQL berhasil dibuat.\n";

        echo "[*] Mengeksekusi file seeds.sql ke PostgreSQL...\n";
        $seedsSql = file_get_contents(__DIR__ . '/seeds.sql');
        $pdo->exec($seedsSql);
        echo "[✔] Seed data PostgreSQL berhasil dimasukkan.\n";
    }

    echo "=========================================================\n";
    echo "PROSES MIGRASI DAN SEEDING SELESAI DENGAN SUKSES!\n";
    echo "=========================================================\n";
} catch (\Throwable $e) {
    echo "\n[ERROR] " . $e->getMessage() . "\n";
    if ($connType === 'pgsql') {
        echo "\n[TIPS TROUBLESHOOTING POSTGRESQL]:\n";
        echo " 1. Pastikan server PostgreSQL sudah running di port 5432.\n";
        echo " 2. Cek username dan password di file backend/.env (sesuaikan dengan setup Postgres Anda).\n";
        echo " 3. Atau gunakan opsi instan SQLite tanpa install database:\n";
        echo "    Buka backend/.env lalu ubah:\n";
        echo "    DB_CONNECTION=sqlite\n";
        echo "    Lalu jalankan kembali: php database/migrate.php\n\n";
    }
    exit(1);
}
