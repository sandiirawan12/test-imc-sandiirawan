import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PageMenu } from '../../core/models/app.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div>
      <div class="card border-0 bg-primary text-white shadow-sm mb-4">
        <div class="card-body p-4">
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <span class="badge bg-white text-primary mb-2 px-3 py-1 fw-semibold">
                <i class="bi bi-shield-check me-1"></i> Level: {{ currentUser()?.level_name }}
              </span>
              <h3 class="fw-bold mb-1">Selamat Datang, {{ currentUser()?.full_name }}!</h3>
              <p class="mb-0 text-white-50 small">
                Sistem Pengaturan Akses Pengguna & Matriks Hak Akses &bull; PT. Integral Mulia Cipta
              </p>
            </div>
            <div class="text-md-end">
              <div class="small text-white-50">Username</div>
              <div class="fw-semibold font-monospace">{{ currentUser()?.username }}</div>
              <div class="small text-white-50 mt-1">{{ currentUser()?.email }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="card h-100">
            <div class="card-body d-flex align-items-center">
              <div class="bg-primary-subtle text-primary rounded-3 p-3 me-3 fs-3">
                <i class="bi bi-layers-fill"></i>
              </div>
              <div>
                <div class="text-muted small fw-medium">Menu Terbuka</div>
                <h4 class="fw-bold mb-0 text-dark">{{ accessiblePages().length }} Menu</h4>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-sm-6 col-lg-4">
          <div class="card h-100">
            <div class="card-body d-flex align-items-center">
              <div class="bg-success-subtle text-success rounded-3 p-3 me-3 fs-3">
                <i class="bi bi-check-circle-fill"></i>
              </div>
              <div>
                <div class="text-muted small fw-medium">Status Akun</div>
                <h4 class="fw-bold mb-0 text-success">Aktif</h4>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-sm-6 col-lg-4">
          <div class="card h-100">
            <div class="card-body d-flex align-items-center">
              <div class="bg-info-subtle text-info rounded-3 p-3 me-3 fs-3">
                <i class="bi bi-shield-shaded"></i>
              </div>
              <div>
                <div class="text-muted small fw-medium">Hak Jabatan</div>
                <h5 class="fw-bold mb-0 text-dark">{{ currentUser()?.level_name }}</h5>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mb-4 shadow-sm">
        <div class="card-header bg-white py-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <div>
            <span class="fw-bold text-dark fs-6">Modul & Halaman yang Dapat Anda Akses</span>
            <div class="text-muted small">Daftar fitur dan modul sesuai otorisasi level serta hak khusus akun Anda</div>
          </div>
          <span class="badge bg-primary-subtle text-primary border px-3 py-2">
            <i class="bi bi-shield-check me-1"></i> {{ accessiblePages().length }} Modul Diizinkan
          </span>
        </div>
        <div class="card-body p-4">
          <div class="row g-3">
            <div *ngFor="let page of accessiblePages()" class="col-12 col-md-6 col-lg-4">
              <div class="card h-100 border p-3 hover-shadow transition d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex align-items-start gap-3 mb-2">
                    <div class="bg-primary-subtle text-primary rounded-3 p-2 fs-4 d-flex align-items-center justify-content-center" style="width: 44px; height: 44px;">
                      <i class="bi" [ngClass]="getIconClass(page.icon || page.path)"></i>
                    </div>
                    <div>
                      <h6 class="fw-bold mb-0 text-dark">{{ page.name }}</h6>
                      <code class="text-muted small" style="font-size: 0.75rem;">{{ page.path }}</code>
                    </div>
                  </div>
                  <p class="text-secondary small mb-3">
                    {{ getPageDescription(page) }}
                  </p>
                </div>
                <div>
                  <a [routerLink]="page.path" class="btn btn-sm btn-outline-primary w-100 d-inline-flex align-items-center justify-content-center gap-1">
                    <span>Buka Halaman</span>
                    <i class="bi bi-arrow-right"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hover-shadow:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }
    .transition {
      transition: all 0.2s ease-in-out;
    }
  `]
})
export class DashboardComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  accessiblePages = this.authService.accessiblePages;

  getPageDescription(page: PageMenu): string {
    if (page.description && page.description.trim().length > 0) {
      return page.description;
    }
    const path = (page.path || '').toLowerCase();
    if (path.includes('dashboard')) return 'Ringkasan statistik data, status akun, dan navigasi cepat ke modul yang dapat diakses.';
    if (path.includes('user')) return 'Manajemen data pengguna: tambah user, ubah profil, reset password, dan status aktif/nonaktif.';
    if (path.includes('level')) return 'Manajemen tingkatan jabatan (Super Admin, Manager, Staff, Viewer) dan kontrol soft delete.';
    if (path.includes('page')) return 'Pengaturan rute menu aplikasi: penamaan modul, path URL unik, urutan tampilan, dan status.';
    if (path.includes('perm')) return 'Konfigurasi matriks izin akses per level jabatan dan override khusus (grant/deny) per pengguna.';
    if (path.includes('report')) return 'Log riwayat aktivitas pengguna, audit sistem, dan rekapitulasi akses modul secara berkala.';
    return 'Modul operasional sistem informasi manajemen hak akses pengguna.';
  }

  getIconClass(iconOrPath: string): string {
    const icon = iconOrPath.toLowerCase();
    if (icon.includes('dashboard')) return 'bi-speedometer2';
    if (icon.includes('user')) return 'bi-people-fill';
    if (icon.includes('level') || icon.includes('shield')) return 'bi-shield-shaded';
    if (icon.includes('page') || icon.includes('layer') || icon.includes('menu')) return 'bi-layers-fill';
    if (icon.includes('perm') || icon.includes('lock') || icon.includes('key')) return 'bi-key-fill';
    if (icon.includes('report') || icon.includes('activity') || icon.includes('chart')) return 'bi-bar-chart-fill';
    return 'bi-app-indicator';
  }
}

