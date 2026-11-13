# Soal Tes Programming — PT. Integral Mulia Cipta
## User Access Management System

> Dibuat oleh: **Sandi**  
> Tanggal: 12 November 2026

---

## Cara Menjalankan Aplikasi

### Prasyarat
- PHP 8.2+ dengan ekstensi `pdo_pgsql` atau `pdo_sqlite` aktif (misal dari Laragon/XAMPP/sistem)
- Composer 2.x
- Node.js 18+ & npm
- PostgreSQL 16 (port 5432) — *atau gunakan opsi SQLite tanpa install database server*

---

### Opsi Cepat (One-Command Setup)
Jika Anda sudah berada di root folder project, Anda dapat langsung menginstal dependencies backend & frontend serta menjalankan migrasi database dengan satu perintah:
```bash
npm run setup
```
*(Script ini otomatis menjalankan `composer install`, menyalin `.env`, membuat database jika belum ada, migrasi & seeding data, serta `npm install` untuk frontend).*

---

### Opsi Setup Langkah demi Langkah (Manual)

#### 1. Setup Backend API (PHP Slim 4) & Database

Buka terminal di folder `backend`:
```bash
cd backend

# A. Install dependencies PHP
composer install

# B. Konfigurasi Environment
# Jika belum ada file .env, salin dari .env.example:
cp .env.example .env
# (Di Windows PowerShell jika cp tidak tersedia: copy .env.example .env)
```

Konfigurasi database default di `backend/.env`:
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=imc_user_mgmt
DB_USERNAME=postgres
DB_PASSWORD=postgres
```
*(Sesuaikan `DB_PASSWORD` dengan password server PostgreSQL lokal Anda jika berbeda).*

> 💡 **Opsi Alternatif Tanpa Install PostgreSQL (SQLite)**:  
> Jika Anda ingin langsung mencoba tanpa menyalakan server PostgreSQL, cukup ganti baris pertama di `backend/.env`:
> ```env
> DB_CONNECTION=sqlite
> ```

Jalankan script migrasi dan seeder (*database PostgreSQL `imc_user_mgmt` akan otomatis dibuatkan jika belum ada*):
```bash
php database/migrate.php
```

Jalankan server Backend:
```bash
composer start
# atau: php -S 0.0.0.0:8080 public/index.php
# atau dari root folder: npm run backend
```
Backend API akan berjalan di: **`http://localhost:8080`**

---

#### 2. Setup Frontend Web (Angular 20)

Buka terminal baru di folder `frontend`:
```bash
cd frontend

# Install dependencies Angular
npm install

# Jalankan server Frontend
npm start
# atau dari root folder: npm run frontend
```
Frontend web akan berjalan di: **`http://localhost:4200`**

---

## Akun Login Untuk Pengujian

| Username | Password    | Level       | Status       |
|----------|-------------|-------------|--------------|
| admin    | password123 | Super Admin | Aktif        |
| budi     | password123 | Manager     | Aktif        |
| siti     | password123 | Staff       | Aktif        |
| eko      | password123 | Viewer      | Aktif        |
| donny    | password123 | Staff       | **Nonaktif** |

---

## Fitur yang Diimplementasikan

### Requirement Utama

| No | Requirement | Status | Keterangan |
|----|------------|--------|------------|
| 1 | CRUD Data User | Selesai | Full CRUD dengan validasi input |
| 2 | CRUD Data Level | Selesai | Soft delete untuk level yang sedang dipakai |
| 3 | CRUD Data Page/Menu | Selesai | Kelola rute navigasi dan icon |
| 4 | Level Permissions (Matriks) | Selesai | Checkbox matrix per level jabatan |
| 5 | User Permissions (Override) | Selesai | Tambahan (+) dan Pengecualian (-) per user |
| 6 | Login dengan JWT | Selesai | Token expires 24 jam |
| 7 | Blokir user nonaktif login | Selesai | Error 403 Forbidden |
| 8 | Sidebar menu dinamis | Selesai | Menu tampil otomatis sesuai hak akses |
| 9 | Permission Guard (Frontend) | Selesai | Redirect jika tidak memiliki izin halaman |
| 10 | Permission Middleware (Backend) | Selesai | Validasi JWT + route permission di setiap endpoint |

### Mekanisme Kalkulasi Permission

```
Prioritas 1: User Permission Override (is_allowed = 1 -> Grant, 0 -> Deny)
     | Jika tidak ada override
Prioritas 2: Level Permission (apakah level user memiliki akses ke halaman ini?)
     | Jika tidak ada di level
Default: Ditolak (Deny)
```

**Skenario Override pada Seed Data:**
- **Siti** (Staff): Level Staff aslinya hanya memiliki `/dashboard` & `/reports`, namun memiliki override `+` ke `/levels` -> Siti dapat mengakses `/levels`.
- **Budi** (Manager): Level Manager memiliki izin `/reports`, namun memiliki override `-` pada `/reports` -> Budi tidak bisa mengakses `/reports`.

---

## Struktur Folder

```
TestIMC-Sandi/
├── backend/                    # PHP Slim 4 REST API
│   ├── app/
│   │   ├── Config/
│   │   │   └── Database.php    # Koneksi PDO (PostgreSQL / SQLite)
│   │   ├── Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── UserController.php
│   │   │   ├── LevelController.php
│   │   │   ├── PageController.php
│   │   │   ├── PermissionController.php
│   │   │   └── ReportController.php
│   │   ├── Helpers/
│   │   │   ├── ApiResponse.php  # Standar JSON response
│   │   │   └── JwtHelper.php    # Generate & verifikasi JWT
│   │   ├── Middleware/
│   │   │   ├── AuthMiddleware.php       # Verifikasi JWT Bearer token
│   │   │   ├── PermissionMiddleware.php # Verifikasi izin route endpoint
│   │   │   ├── CorsMiddleware.php
│   │   │   └── JsonBodyParserMiddleware.php
│   │   └── Services/
│   │       └── PermissionResolver.php   # Kalkulasi logika permission
│   ├── config/
│   │   └── routes.php          # Definisi rute API
│   ├── database/
│   │   ├── migrate.php         # Script migrasi & seeder
│   │   ├── schema.sql          # DDL PostgreSQL
│   │   └── seeds.sql           # Data awal PostgreSQL
│   ├── public/
│   │   └── index.php           # Entry point Slim 4
│   ├── vendor/                 # Dependencies Composer
│   ├── composer.json
│   └── .env                    # Konfigurasi environment
│
├── frontend/                   # Angular 20 SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts         # Proteksi login
│   │   │   │   │   └── permission.guard.ts   # Proteksi rute halaman
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── auth.interceptor.ts   # Auto-attach token JWT
│   │   │   │   │   └── error.interceptor.ts  # Penanganan response 401/403
│   │   │   │   ├── models/
│   │   │   │   │   └── app.models.ts         # Interface data
│   │   │   │   └── services/
│   │   │   │       ├── auth.service.ts
│   │   │   │       ├── user.service.ts
│   │   │   │       ├── level.service.ts
│   │   │   │       ├── page.service.ts
│   │   │   │       ├── permission.service.ts
│   │   │   │       └── toast.service.ts
│   │   │   ├── features/
│   │   │   │   ├── auth/login.component.ts
│   │   │   │   ├── dashboard/dashboard.component.ts
│   │   │   │   ├── users/user-list.component.ts
│   │   │   │   ├── levels/level-list.component.ts
│   │   │   │   ├── pages/page-list.component.ts
│   │   │   │   ├── permissions/permission-matrix.component.ts
│   │   │   │   └── reports/report.component.ts
│   │   │   └── shared/
│   │   │       ├── components/toast/toast.component.ts
│   │   │       └── layout/main-layout.component.ts
│   │   ├── environments/
│   │   │   └── environment.ts
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── angular.json
│   └── package.json
```

---

## Endpoint API

### Auth
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| POST | `/api/auth/login` | Tidak | Login user, return JWT & accessible_pages |
| GET | `/api/auth/me` | Ya | Profile user aktif & accessible_pages |
| POST | `/api/auth/refresh` | Ya | Refresh token JWT |
| POST | `/api/auth/logout` | Ya | Logout user |
| GET | `/api/health` | Tidak | Cek status server API |

### Users
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/users` | List user (support filter pencarian, level, status) |
| POST | `/api/users` | Tambah user baru |
| GET | `/api/users/{id}` | Detail user |
| PUT | `/api/users/{id}` | Update data user |
| DELETE | `/api/users/{id}` | Hapus user |

### Levels
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/levels` | List level jabatan |
| POST | `/api/levels` | Tambah level baru |
| GET | `/api/levels/{id}` | Detail level |
| PUT | `/api/levels/{id}` | Update level |
| DELETE | `/api/levels/{id}?soft=true` | Hapus level (soft / hard delete) |

### Pages
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/pages` | List halaman dan menu navigasi |
| POST | `/api/pages` | Tambah halaman baru |
| PUT | `/api/pages/{id}` | Update halaman |
| DELETE | `/api/pages/{id}` | Hapus halaman |

### Permissions
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/permissions/matrix` | Matriks lengkap level dan user override |
| GET | `/api/permissions/my-permissions` | Daftar rute yang diizinkan untuk user aktif |
| GET | `/api/permissions/levels/{id}` | Hak akses per level |
| POST | `/api/permissions/levels/{id}` | Simpan hak akses level |
| GET | `/api/permissions/users/{id}` | Hak akses user dan override |
| POST | `/api/permissions/users/{id}` | Simpan override permission user |

### Reports
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/reports` | Statistik dan ringkasan data |

---

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Backend Framework | PHP Slim 4 |
| Autentikasi | Firebase JWT (HS256) |
| Database | PostgreSQL 16 |
| Driver Database | PHP PDO PostgreSQL |
| Frontend Framework | Angular 20 |
| Desain & UI | Bootstrap 5.3 + Bootstrap Icons |
| State Management | Angular Signals |
