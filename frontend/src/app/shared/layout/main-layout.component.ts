import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../components/toast/toast.component';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ToastComponent],
  template: `
    <div class="d-flex vh-100 overflow-hidden bg-light">
      <aside class="d-flex flex-column flex-shrink-0 text-white bg-dark shadow-sm" style="width: 260px;">
        <div class="d-flex align-items-center p-3 border-bottom border-secondary border-opacity-25 bg-black bg-opacity-25">
          <div class="bg-primary text-white rounded-3 p-2 me-2 d-flex align-items-center justify-content-center" style="width: 38px; height: 38px;">
            <i class="bi bi-shield-lock-fill fs-5"></i>
          </div>
          <div>
            <div class="fw-bold fs-6 lh-sm text-white">Access Management</div>
          </div>
        </div>

        <div class="px-3 pt-3 pb-2 text-uppercase text-secondary small fw-semibold" style="font-size: 0.7rem; letter-spacing: 0.05em;">
          Menu Navigasi
        </div>
        <nav class="nav nav-pills flex-column mb-auto px-2 overflow-y-auto">
          <ng-container *ngFor="let page of accessiblePages()">
            <a
              [routerLink]="page.path"
              routerLinkActive="active bg-primary text-white"
              [routerLinkActiveOptions]="{ exact: false }"
              class="nav-link text-white-50 d-flex align-items-center py-2 px-3 mb-1 rounded-2 text-decoration-none">
              <i class="bi me-2 fs-5" [ngClass]="getIconClass(page.icon || page.path)"></i>
              <span class="fs-6 text-white">{{ page.name }}</span>
            </a>
          </ng-container>

          <div *ngIf="accessiblePages().length === 0" class="p-3 text-secondary small text-center">
            <i class="bi bi-info-circle d-block fs-4 mb-1"></i>
            Tidak ada menu yang diizinkan untuk akun Anda.
          </div>
        </nav>

        <div class="p-3 border-top border-secondary border-opacity-25 bg-black bg-opacity-25">
          <div class="d-flex align-items-center">
            <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2 fw-bold" style="width: 36px; height: 36px;">
              {{ (currentUser()?.full_name?.charAt(0) || 'U').toUpperCase() }}
            </div>
            <div class="overflow-hidden me-auto">
              <div class="text-truncate fw-semibold text-white small">{{ currentUser()?.full_name }}</div>
              <div class="badge bg-secondary text-white font-monospace" style="font-size: 0.68rem;">{{ currentUser()?.level_name }}</div>
            </div>
          </div>
        </div>
      </aside>

      <div class="d-flex flex-column flex-grow-1 overflow-hidden">
        <header class="navbar navbar-expand bg-white border-bottom px-4 py-2 shadow-sm">
          <div class="container-fluid p-0">
            <div class="d-flex align-items-center text-muted small">

            </div>

            <div class="d-flex align-items-center gap-2">
              <button
                type="button"
                (click)="logout()"
                class="btn btn-sm btn-outline-danger d-flex align-items-center gap-1">
                <i class="bi bi-box-arrow-right"></i>
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </header>

        <main class="flex-grow-1 overflow-y-auto p-4 bg-light">
          <div class="container-fluid p-0">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>

    <app-toast></app-toast>
  `,
  styles: [`
    .nav-link {
      transition: all 0.2s ease;
    }
    .nav-link:hover:not(.active) {
      background-color: rgba(255, 255, 255, 0.08);
      color: #fff !important;
    }
    .nav-link.active {
      font-weight: 500;
    }
  `]
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  accessiblePages = this.authService.accessiblePages;

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

  logout(): void {
    this.authService.logout();
  }
}

