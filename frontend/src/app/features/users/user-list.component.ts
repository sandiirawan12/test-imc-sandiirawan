import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { LevelService } from '../../core/services/level.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { User, Level } from '../../core/models/app.models';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="card mb-4">
      <div class="card-header bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h5 class="fw-bold mb-1 text-dark">Data Pengguna (User Management)</h5>
          <p class="text-muted small mb-0">Kelola akun, peran jabatan (level), dan status aktif pengguna sistem.</p>
        </div>
        <button *ngIf="canModify()" type="button" class="btn btn-primary d-flex align-items-center gap-2" (click)="openCreateModal()">
          <i class="bi bi-person-plus-fill"></i>
          <span>Tambah User</span>
        </button>
        <span *ngIf="!canModify()" class="badge bg-secondary-subtle text-secondary border px-3 py-2">
          <i class="bi bi-eye me-1"></i> Mode Read-Only
        </span>
      </div>

      <div class="card-body border-bottom bg-light py-3">
        <div class="row g-2 align-items-center">
          <div class="col-12 col-md-5">
            <div class="input-group">
              <span class="input-group-text bg-white text-muted"><i class="bi bi-search"></i></span>
              <input
                type="text"
                class="form-control"
                placeholder="Cari nama, username, atau email..."
                [(ngModel)]="searchQuery"
                (input)="applyFilters()"
              />
              <button *ngIf="searchQuery" class="btn btn-outline-secondary" type="button" (click)="searchQuery = ''; applyFilters()">
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>

          <div class="col-6 col-md-4">
            <select class="form-select" [(ngModel)]="selectedLevelId" (change)="applyFilters()">
              <option [ngValue]="null">Semua Level Jabatan</option>
              <option *ngFor="let lvl of levels" [ngValue]="lvl.id">{{ lvl.name }}</option>
            </select>
          </div>

          <div class="col-6 col-md-3">
            <select class="form-select" [(ngModel)]="selectedStatus" (change)="applyFilters()">
              <option [ngValue]="null">Semua Status</option>
              <option [ngValue]="true">Aktif</option>
              <option [ngValue]="false">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th scope="col" style="width: 60px;">No</th>
              <th scope="col">Nama Lengkap</th>
              <th scope="col">Username</th>
              <th scope="col">Email</th>
              <th scope="col">Level Jabatan</th>
              <th scope="col">Status</th>
              <th scope="col" class="text-end" style="width: 140px;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td colspan="7" class="text-center py-4 text-muted">
                <span class="spinner-border spinner-border-sm me-2"></span> Memuat data user...
              </td>
            </tr>

            <tr *ngIf="!loading && users.length === 0">
              <td colspan="7" class="text-center py-5 text-muted">
                <i class="bi bi-people fs-1 d-block mb-2 text-secondary opacity-50"></i>
                Tidak ada data user yang sesuai dengan pencarian atau filter.
              </td>
            </tr>

            <tr *ngFor="let u of users; let i = index">
              <td class="text-muted small">{{ i + 1 }}</td>
              <td>
                <div class="fw-semibold text-dark">{{ u.full_name }}</div>
              </td>
              <td>
                <span class="badge bg-light text-dark font-monospace border">{{ u.username }}</span>
              </td>
              <td class="text-muted small">{{ u.email }}</td>
              <td>
                <span class="badge badge-role">{{ u.level_name || 'Level ' + u.level_id }}</span>
              </td>
              <td>
                <span *ngIf="u.is_active" class="badge badge-active">
                  <i class="bi bi-check-circle-fill me-1"></i> Aktif
                </span>
                <span *ngIf="!u.is_active" class="badge badge-inactive">
                  <i class="bi bi-x-circle-fill me-1"></i> Nonaktif
                </span>
              </td>
              <td class="text-end">
                <div *ngIf="canModify()" class="btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-primary" title="Ubah data" (click)="openEditModal(u)">
                    <i class="bi bi-pencil-square"></i>
                  </button>
                  <button type="button" class="btn btn-outline-danger" title="Hapus user" (click)="confirmDelete(u)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                <span *ngIf="!canModify()" class="badge bg-secondary-subtle text-secondary border">
                  <i class="bi bi-eye"></i> Lihat Saja
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-footer bg-white py-3 d-flex justify-content-between align-items-center text-muted small">
        <div>Menampilkan {{ users.length }} akun pengguna</div>
      </div>
    </div>

    <div class="modal fade" [class.show]="isModalOpen" [style.display]="isModalOpen ? 'block' : 'none'" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi" [ngClass]="isEditMode ? 'bi-pencil-square text-primary' : 'bi-person-plus text-primary'"></i>
              {{ isEditMode ? 'Ubah Data User' : 'Tambah User Baru' }}
            </h5>
            <button type="button" class="btn-close" (click)="closeModal()"></button>
          </div>

          <form [formGroup]="userForm" (ngSubmit)="saveUser()">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label small fw-semibold">Nama Lengkap <span class="text-danger">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="full_name"
                  placeholder="Contoh: Budi Santoso"
                  [ngClass]="{ 'is-invalid': isFieldInvalid('full_name') }"
                />
                <div class="invalid-feedback small">Nama lengkap wajib diisi.</div>
              </div>

              <div class="row g-2 mb-3">
                <div class="col-12 col-sm-6">
                  <label class="form-label small fw-semibold">Username <span class="text-danger">*</span></label>
                  <input
                    type="text"
                    class="form-control"
                    formControlName="username"
                    placeholder="budisantoso"
                    [ngClass]="{ 'is-invalid': isFieldInvalid('username') }"
                  />
                  <div class="invalid-feedback small">Username wajib diisi (min 3 karakter).</div>
                </div>

                <div class="col-12 col-sm-6">
                  <label class="form-label small fw-semibold">Email <span class="text-danger">*</span></label>
                  <input
                    type="email"
                    class="form-control"
                    formControlName="email"
                    placeholder="budi@imc.co.id"
                    [ngClass]="{ 'is-invalid': isFieldInvalid('email') }"
                  />
                  <div class="invalid-feedback small">Email valid wajib diisi.</div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">
                  Password
                  <span *ngIf="isEditMode" class="text-muted fw-normal small">(Kosongkan jika tidak ingin diubah)</span>
                  <span *ngIf="!isEditMode" class="text-danger">*</span>
                </label>
                <input
                  type="password"
                  class="form-control"
                  formControlName="password"
                  placeholder="Minimal 6 karakter"
                  [ngClass]="{ 'is-invalid': isFieldInvalid('password') }"
                />
                <div class="invalid-feedback small">Password minimal 6 karakter.</div>
              </div>

              <div class="row g-2 mb-2">
                <div class="col-12 col-sm-7">
                  <label class="form-label small fw-semibold">Level Jabatan <span class="text-danger">*</span></label>
                  <select class="form-select" formControlName="level_id" [ngClass]="{ 'is-invalid': isFieldInvalid('level_id') }">
                    <option [ngValue]="null" disabled>Pilih Level Jabatan</option>
                    <option *ngFor="let lvl of levels" [ngValue]="lvl.id">{{ lvl.name }}</option>
                  </select>
                  <div class="invalid-feedback small">Level jabatan wajib dipilih.</div>
                </div>

                <div class="col-12 col-sm-5 d-flex align-items-center pt-3">
                  <div class="form-check form-switch mt-2">
                    <input class="form-check-input" type="checkbox" id="userActiveSwitch" formControlName="is_active" />
                    <label class="form-check-label small fw-semibold" for="userActiveSwitch">
                      Status Aktif
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-outline-secondary" (click)="closeModal()">Batal</button>
              <button type="submit" [disabled]="saving || userForm.invalid" class="btn btn-primary d-flex align-items-center gap-1">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                <span>{{ saving ? 'Menyimpan...' : 'Simpan User' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" *ngIf="isModalOpen"></div>

    <div class="modal fade" [class.show]="isDeleteModalOpen" [style.display]="isDeleteModalOpen ? 'block' : 'none'" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content shadow">
          <div class="modal-body text-center p-4">
            <i class="bi bi-exclamation-circle text-danger fs-1 mb-2 d-block"></i>
            <h5 class="fw-bold">Hapus User?</h5>
            <p class="text-muted small mb-3">
              Apakah Anda yakin ingin menghapus akun <strong>{{ selectedUser?.username }}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div class="d-flex justify-content-center gap-2">
              <button type="button" class="btn btn-outline-secondary btn-sm" (click)="isDeleteModalOpen = false">Batal</button>
              <button type="button" class="btn btn-danger btn-sm" [disabled]="deleting" (click)="executeDelete()">
                <span *ngIf="deleting" class="spinner-border spinner-border-sm me-1"></span>
                <span>Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" *ngIf="isDeleteModalOpen"></div>
  `
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  levels: Level[] = [];
  loading = false;
  saving = false;
  deleting = false;

  searchQuery = '';
  selectedLevelId: number | null = null;
  selectedStatus: boolean | null = null;

  isModalOpen = false;
  isEditMode = false;
  selectedUser: User | null = null;
  isDeleteModalOpen = false;

  userForm: FormGroup;
  canModify = inject(AuthService).canModify;

  constructor(
    private userService: UserService,
    private levelService: LevelService,
    private toast: ToastService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      full_name: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      level_id: [null, [Validators.required]],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    this.loadLevels();
    this.loadUsers();
  }

  loadLevels(): void {
    this.levelService.getLevels().subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.levels = res.data || [];
        }
      }
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers({
      search: this.searchQuery,
      level_id: this.selectedLevelId,
      is_active: this.selectedStatus
    }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status === 'success') {
          this.users = res.data || [];
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Gagal memuat data user.');
      }
    });
  }

  applyFilters(): void {
    this.loadUsers();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  openCreateModal(): void {
    if (!this.canModify()) return;
    this.isEditMode = false;
    this.selectedUser = null;
    this.userForm.reset({
      full_name: '',
      username: '',
      email: '',
      password: '',
      level_id: this.levels.length > 0 ? this.levels[0].id : null,
      is_active: true
    });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.isModalOpen = true;
  }

  openEditModal(user: User): void {
    if (!this.canModify()) return;
    this.isEditMode = true;
    this.selectedUser = user;
    this.userForm.patchValue({
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      password: '',
      level_id: user.level_id,
      is_active: user.is_active
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.setValidators([Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveUser(): void {
    if (!this.canModify()) return;
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const formVal = this.userForm.value;

    if (this.isEditMode && this.selectedUser) {
      this.userService.updateUser(this.selectedUser.id, formVal).subscribe({
        next: (res) => {
          this.saving = false;
          if (res.status === 'success') {
            this.toast.success('Data user berhasil diperbarui.');
            this.closeModal();
            this.loadUsers();
          }
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err.error?.message || 'Gagal memperbarui user.');
        }
      });
    } else {
      this.userService.createUser(formVal).subscribe({
        next: (res) => {
          this.saving = false;
          if (res.status === 'success') {
            this.toast.success('User baru berhasil ditambahkan.');
            this.closeModal();
            this.loadUsers();
          }
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err.error?.message || 'Gagal menambahkan user.');
        }
      });
    }
  }

  confirmDelete(user: User): void {
    if (!this.canModify()) return;
    this.selectedUser = user;
    this.isDeleteModalOpen = true;
  }

  executeDelete(): void {
    if (!this.canModify() || !this.selectedUser) return;

    this.deleting = true;
    this.userService.deleteUser(this.selectedUser.id).subscribe({
      next: (res) => {
        this.deleting = false;
        this.isDeleteModalOpen = false;
        if (res.status === 'success') {
          this.toast.success(res.message || 'User berhasil dihapus.');
          this.loadUsers();
        }
      },
      error: (err) => {
        this.deleting = false;
        this.toast.error(err.error?.message || 'Gagal menghapus user.');
      }
    });
  }
}
