import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Level, PageMenu, User, PermissionMatrix, UserPermissionItem } from '../../core/models/app.models';

@Component({
  selector: 'app-permission-matrix',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card mb-4">
      <div class="card-header bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h5 class="fw-bold mb-1 text-dark">Manajemen Hak Akses & Permission Matrix</h5>
          <p class="text-muted small mb-0">
            Atur page yang boleh diakses berdasarkan level jabatan, serta tetapkan page tambahan atau pengecualian khusus user.
          </p>
        </div>
      </div>

      <div class="card-body border-bottom bg-light py-2">
        <ul class="nav nav-pills gap-2">
          <li class="nav-item">
            <button
              class="nav-link py-2 px-3 fw-semibold"
              [class.active]="activeTab === 'level'"
              (click)="activeTab = 'level'">
              <i class="bi bi-grid-3x3-gap-fill me-1"></i> 1. Matriks Akses Level Jabatan
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link py-2 px-3 fw-semibold"
              [class.active]="activeTab === 'user'"
              (click)="activeTab = 'user'">
              <i class="bi bi-person-fill-lock me-1"></i> 2. Pengecualian & Akses Khusus User
            </button>
          </li>
        </ul>
      </div>

      <div *ngIf="loading" class="card-body text-center py-5">
        <span class="spinner-border spinner-border-sm me-2 text-primary"></span>
        <span class="text-muted">Memuat matriks permission...</span>
      </div>

      <div *ngIf="!loading && activeTab === 'level'" class="card-body p-0">
        <div class="p-3 bg-white border-bottom d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
          <div class="small text-muted">
            <i class="bi bi-info-circle text-primary me-1"></i>
            Centang checkbox untuk memberikan izin akses halaman ke level jabatan tertentu, lalu klik <strong>Simpan</strong>.
            <span *ngIf="!canModify()" class="badge bg-secondary-subtle text-secondary border ms-2">
              <i class="bi bi-eye"></i> Mode Read-Only (Hanya Lihat)
            </span>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="loadMatrix()">
              <i class="bi bi-arrow-clockwise me-1"></i> Muat Ulang
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-bordered table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th scope="col" style="min-width: 180px; width: 220px;" class="bg-light">
                  Level Jabatan
                </th>
                <th
                  *ngFor="let page of pages"
                  scope="col"
                  class="text-center"
                  style="min-width: 130px;">
                  <div class="fw-bold text-dark">{{ page.name }}</div>
                  <code class="text-muted small" style="font-size: 0.72rem;">{{ page.path }}</code>
                </th>
                <th scope="col" class="text-center" style="width: 140px;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let lvl of levels">
                <td class="bg-white">
                  <div class="fw-bold text-dark d-flex align-items-center gap-2">
                    <span>{{ lvl.name }}</span>
                  </div>
                  <div class="text-muted small" style="font-size: 0.75rem;">
                    {{ getSelectedPagesCountForLevel(lvl.id) }} dari {{ pages.length }} modul aktif
                  </div>
                </td>

                <td
                  *ngFor="let page of pages"
                  class="text-center matrix-cell"
                  [class.table-primary-subtle]="isLevelPageChecked(lvl.id, page.id)">
                  <div class="form-check d-flex justify-content-center m-0">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      [id]="'perm_' + lvl.id + '_' + page.id"
                      [checked]="isLevelPageChecked(lvl.id, page.id)"
                      [disabled]="!canModify()"
                      (change)="toggleLevelPage(lvl.id, page.id)"
                    />
                  </div>
                </td>

                <td class="text-center">
                  <button
                    type="button"
                    class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                    [disabled]="savingLevelId === lvl.id || !canModify()"
                    (click)="saveLevelPermission(lvl)">
                    <span *ngIf="savingLevelId === lvl.id" class="spinner-border spinner-border-sm me-1"></span>
                    <i *ngIf="savingLevelId !== lvl.id" class="bi bi-check2"></i>
                    <span>Simpan</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="!loading && activeTab === 'user'" class="card-body p-4">
        <div class="row g-4">
          <div class="col-12 col-lg-4">
            <div class="card h-100 border">
              <div class="card-header bg-light">
                <span class="fw-bold text-dark small text-uppercase">Pilih Pengguna</span>
              </div>
              <div class="card-body p-3">
                <label class="form-label small fw-semibold text-muted">Pengguna Target:</label>
                <select class="form-select mb-3" [(ngModel)]="selectedUserId" (ngModelChange)="loadUserPermissions($event)">
                  <option *ngFor="let u of users" [ngValue]="u.id">
                    {{ u.full_name }} ({{ u.username }}) - {{ u.level_name }}
                  </option>
                </select>

                <div *ngIf="selectedUser" class="p-3 bg-light rounded-3 border">
                  <div class="fw-bold text-dark fs-6">{{ selectedUser.full_name }}</div>
                  <div class="text-muted small font-monospace">{{ selectedUser.username }} &bull; {{ selectedUser.email }}</div>
                  <div class="mt-2">
                    <span class="badge badge-role me-2">Level: {{ selectedUser.level_name }}</span>
                    <span *ngIf="selectedUser.is_active" class="badge badge-active">Aktif</span>
                    <span *ngIf="!selectedUser.is_active" class="badge badge-inactive">Nonaktif</span>
                  </div>
                </div>

                <div class="alert alert-info small mt-3 mb-0">
                  <i class="bi bi-info-circle-fill me-1"></i>
                  <strong>Mekanisme Override:</strong>
                  <ul class="mb-0 ps-3 mt-1">
                    <li><strong>Inherit:</strong> Mengikuti aturan default level pengguna.</li>
                    <li><strong>Tambahan (+):</strong> Izin khusus diberikan ke user meskipun levelnya tidak memiliki izin.</li>
                    <li><strong>Pengecualian (-):</strong> Akses dicabut khusus user ini meskipun levelnya memiliki izin.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-lg-8">
            <div class="card h-100 border">
              <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <span class="fw-bold text-dark small text-uppercase">
                  Daftar Hak Akses Halaman untuk {{ selectedUser?.full_name || 'User' }}
                </span>
                <button
                  type="button"
                  class="btn btn-sm btn-primary d-flex align-items-center gap-1"
                  [disabled]="savingUserPerm || userPermissions.length === 0 || !canModify()"
                  (click)="saveUserPermissions()">
                  <span *ngIf="savingUserPerm" class="spinner-border spinner-border-sm me-1"></span>
                  <i *ngIf="savingUserPerm === false" class="bi bi-save"></i>
                  <span>Simpan Hak Akses User</span>
                </button>
              </div>

              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th scope="col">Nama Halaman</th>
                      <th scope="col" class="text-center" style="width: 120px;">Hak Level</th>
                      <th scope="col" style="width: 220px;">Override Khusus</th>
                      <th scope="col" class="text-center" style="width: 140px;">Status Akhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngIf="loadingUserPerm">
                      <td colspan="4" class="text-center py-4 text-muted">
                        <span class="spinner-border spinner-border-sm me-2"></span> Memuat izin pengguna...
                      </td>
                    </tr>

                    <tr *ngFor="let item of userPermissions">
                      <td>
                        <div class="fw-semibold text-dark">{{ item.page_name }}</div>
                        <code class="text-muted small">{{ item.path }}</code>
                      </td>

                      <td class="text-center">
                        <span *ngIf="item.level_allowed" class="badge bg-success-subtle text-success border border-success-subtle">
                          <i class="bi bi-check-lg"></i> Diizinkan
                        </span>
                        <span *ngIf="!item.level_allowed" class="badge bg-danger-subtle text-danger border border-danger-subtle">
                          <i class="bi bi-x-lg"></i> Ditolak
                        </span>
                      </td>

                      <td>
                        <select
                          class="form-select form-select-sm"
                          [ngModel]="item.override"
                          [disabled]="!canModify()"
                          (ngModelChange)="onUserOverrideChange(item, $event)"
                          [ngClass]="{
                            'border-success bg-success-subtle text-success fw-bold': item.override === true,
                            'border-danger bg-danger-subtle text-danger fw-bold': item.override === false
                          }">
                          <option [ngValue]="null">Inherit dari Level</option>
                          <option [ngValue]="true">+ Tambahan Khusus (Grant)</option>
                          <option [ngValue]="false">- Pengecualian (Deny)</option>
                        </select>
                      </td>

                      <td class="text-center">
                        <span *ngIf="item.effective_allowed" class="badge badge-active">
                          <i class="bi bi-unlock-fill me-1"></i> Boleh Akses
                        </span>
                        <span *ngIf="!item.effective_allowed" class="badge badge-inactive">
                          <i class="bi bi-lock-fill me-1"></i> Tidak Boleh
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card-footer bg-white py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 text-muted small">
        <div>
          <i class="bi bi-shield-check text-success me-1"></i>
          Perubahan hak akses langsung memengaruhi navigasi dan akses API setelah user me-refresh sesi atau login kembali.
        </div>
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="refreshCurrentAppSession()">
          <i class="bi bi-arrow-repeat me-1"></i> Sinkronkan Sesi Saya Sekarang
        </button>
      </div>
    </div>
  `
})
export class PermissionMatrixComponent implements OnInit {
  activeTab: 'level' | 'user' = 'level';
  loading = false;
  savingLevelId: number | null = null;
  savingUserPerm = false;
  loadingUserPerm = false;

  levels: Level[] = [];
  pages: PageMenu[] = [];
  users: User[] = [];
  levelPermissionsMap = new Map<number, Set<number>>();

  selectedUserId: number | null = null;
  selectedUser: User | null = null;
  userPermissions: UserPermissionItem[] = [];
  canModify = inject(AuthService).canModifyPermissions;
  private authService = inject(AuthService);

  constructor(
    private permissionService: PermissionService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    this.loadMatrix();
  }

  loadMatrix(): void {
    this.loading = true;
    this.permissionService.getMatrix().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status === 'success' && res.data) {
          const matrix = res.data;
          this.levels = matrix.levels || [];
          this.pages = matrix.pages || [];
          this.users = matrix.users || [];

          this.levelPermissionsMap.clear();
          for (const lvl of this.levels) {
            this.levelPermissionsMap.set(lvl.id, new Set<number>());
          }

          for (const lp of matrix.level_permissions || []) {
            const set = this.levelPermissionsMap.get(lp.level_id);
            if (set) {
              set.add(lp.page_id);
            }
          }

          if (this.users.length > 0 && !this.selectedUserId) {
            this.selectedUserId = this.users[0].id;
            this.loadUserPermissions(this.selectedUserId);
          }
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Gagal memuat matriks hak akses.');
      }
    });
  }

  isLevelPageChecked(levelId: number, pageId: number): boolean {
    return this.levelPermissionsMap.get(levelId)?.has(pageId) ?? false;
  }

  toggleLevelPage(levelId: number, pageId: number): void {
    if (!this.canModify()) return;
    const set = this.levelPermissionsMap.get(levelId);
    if (!set) return;

    if (set.has(pageId)) {
      set.delete(pageId);
    } else {
      set.add(pageId);
    }
  }

  getSelectedPagesCountForLevel(levelId: number): number {
    return this.levelPermissionsMap.get(levelId)?.size ?? 0;
  }

  saveLevelPermission(level: Level): void {
    if (!this.canModify()) return;
    const set = this.levelPermissionsMap.get(level.id);
    const pageIds = set ? Array.from(set) : [];

    this.savingLevelId = level.id;
    this.permissionService.updateLevelPermissions(level.id, pageIds).subscribe({
      next: (res) => {
        this.savingLevelId = null;
        if (res.status === 'success') {
          this.toast.success(`Hak akses untuk level '${level.name}' berhasil disimpan.`);
          if (this.selectedUser && this.selectedUser.level_id === level.id) {
            this.loadUserPermissions(this.selectedUser.id);
          }
          if (this.authService.currentUser()?.level_id === level.id) {
            this.authService.refreshSession().subscribe();
          }
        }
      },
      error: (err) => {
        this.savingLevelId = null;
        this.toast.error(err.error?.message || 'Gagal menyimpan hak akses level.');
      }
    });
  }

  loadUserPermissions(userId: number): void {
    this.selectedUserId = userId;
    this.selectedUser = this.users.find(u => u.id === userId) || null;
    this.loadingUserPerm = true;

    this.permissionService.getUserPermissions(userId).subscribe({
      next: (res) => {
        this.loadingUserPerm = false;
        if (res.status === 'success' && res.data) {
          this.userPermissions = res.data.permissions || [];
        }
      },
      error: () => {
        this.loadingUserPerm = false;
        this.toast.error('Gagal memuat hak akses user.');
      }
    });
  }

  onUserOverrideChange(item: UserPermissionItem, newValue: boolean | null): void {
    if (!this.canModify()) return;
    item.override = newValue;
    if (newValue === null) {
      item.effective_allowed = item.level_allowed;
      item.status_label = 'Inherit dari Level';
    } else if (newValue === true) {
      item.effective_allowed = true;
      item.status_label = 'Tambahan Khusus (Granted)';
    } else {
      item.effective_allowed = false;
      item.status_label = 'Pengecualian (Denied)';
    }
  }

  saveUserPermissions(): void {
    if (!this.canModify() || !this.selectedUserId) return;

    this.savingUserPerm = true;
    const payload = this.userPermissions.map(p => ({
      page_id: p.page_id,
      override: p.override
    }));

    this.permissionService.updateUserPermissions(this.selectedUserId, payload).subscribe({
      next: (res) => {
        this.savingUserPerm = false;
        if (res.status === 'success') {
          this.toast.success(`Hak akses khusus untuk ${this.selectedUser?.full_name} berhasil disimpan.`);
          this.loadUserPermissions(this.selectedUserId!);
          if (this.authService.currentUser()?.id === this.selectedUserId) {
            this.authService.refreshSession().subscribe();
          }
        }
      },
      error: (err) => {
        this.savingUserPerm = false;
        this.toast.error(err.error?.message || 'Gagal menyimpan hak akses khusus user.');
      }
    });
  }

  refreshCurrentAppSession(): void {
    this.authService.refreshSession().subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.toast.success('Daftar menu dan izin sesi Anda berhasil disinkronkan!');
        }
      }
    });
  }
}

