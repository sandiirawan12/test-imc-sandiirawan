INSERT INTO levels (id, name, description, is_active) VALUES
(1, 'Super Admin', 'Akses penuh ke seluruh menu dan konfigurasi sistem', 'true'),
(2, 'Manager', 'Akses manajemen pengguna, halaman, dan laporan operasional', 'true'),
(3, 'Staff', 'Akses operasional dasar dan pelaporan', 'true'),
(4, 'Viewer', 'Akses lihat data (read-only) untuk pemantauan', 'true');

SELECT setval('levels_id_seq', (SELECT MAX(id) FROM levels));

INSERT INTO pages (id, name, path, icon, description, sort_order, is_active) VALUES
(1, 'Dashboard', '/dashboard', 'dashboard', 'Ringkasan statistik data, status akun, dan navigasi cepat ke modul yang dapat diakses.', 10, 'true'),
(2, 'Data User', '/users', 'users', 'Manajemen data pengguna: tambah user, ubah profil, reset password, dan status aktif/nonaktif.', 20, 'true'),
(3, 'Data Level', '/levels', 'shield', 'Manajemen tingkatan jabatan (Super Admin, Manager, Staff, Viewer) dan kontrol soft delete.', 30, 'true'),
(4, 'Data Page & Menu', '/pages', 'layers', 'Pengaturan rute menu aplikasi: penamaan modul, path URL unik, urutan tampilan, dan status.', 40, 'true'),
(5, 'User Permissions', '/permissions', 'lock', 'Konfigurasi matriks izin akses per level jabatan dan override khusus (grant/deny) per pengguna.', 50, 'true'),
(6, 'Laporan Aktivitas', '/reports', 'activity', 'Log riwayat aktivitas pengguna, audit sistem, dan rekapitulasi akses modul secara berkala.', 60, 'true');

SELECT setval('pages_id_seq', (SELECT MAX(id) FROM pages));

INSERT INTO users (id, full_name, username, email, password, level_id, is_active) VALUES
(1, 'Administrator Utama', 'admin', 'admin@imc.co.id', '$2y$12$Tg83CPMsl2R8Y8W9EsijFOw8TSce2EOJL8N2dxw95.AHsz23ukR0W', 1, 'true'),
(2, 'Budi Santoso', 'budi', 'budi.santoso@imc.co.id', '$2y$12$Tg83CPMsl2R8Y8W9EsijFOw8TSce2EOJL8N2dxw95.AHsz23ukR0W', 2, 'true'),
(3, 'Siti Rahmawati', 'siti', 'siti.rahma@imc.co.id', '$2y$12$Tg83CPMsl2R8Y8W9EsijFOw8TSce2EOJL8N2dxw95.AHsz23ukR0W', 3, 'true'),
(4, 'Eko Prasetyo', 'eko', 'eko.prasetyo@imc.co.id', '$2y$12$Tg83CPMsl2R8Y8W9EsijFOw8TSce2EOJL8N2dxw95.AHsz23ukR0W', 4, 'true'),
(5, 'Donny Irawan (Nonaktif)', 'donny', 'donny.irawan@imc.co.id', '$2y$12$Tg83CPMsl2R8Y8W9EsijFOw8TSce2EOJL8N2dxw95.AHsz23ukR0W', 3, 'false');

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

INSERT INTO level_permissions (level_id, page_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
(2, 1), (2, 2), (2, 4), (2, 6),
(3, 1), (3, 6),
(4, 1);

INSERT INTO user_permissions (user_id, page_id, is_allowed) VALUES
(3, 3, 'true'),
(2, 6, 'false');
