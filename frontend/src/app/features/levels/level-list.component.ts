import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LevelService } from '../../core/services/level.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Level } from '../../core/models/app.models';

@Component({
  selector: 'app-level-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="card mb-4">
      <div class="card-header bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h5 class="fw-bold mb-1 text-dark">Data Level Jabatan (Role Management)</h5>
          <p class="text-muted small mb-0">Kelola tingkatan hak akses, deskripsi wewenang, dan status jabatan pengguna.</p>
        </div>
        <button *ngIf="canModify()" type="button" class="btn btn-primary d-flex align-items-center gap-2" (click)="openCreateModal()">
          <i class="bi bi-shield-plus"></i>
          <span>Tambah Level</span>
        </button>
        <span *ngIf="!canModify()" class="badge bg-secondary-subtle text-secondary border px-3 py-2">
          <i class="bi bi-eye me-1"></i> Mode Read-Only
        </span>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th scope="col" style="width: 60px;">No</th>
              <th scope="col">Nama Level Jabatan</th>
              <th scope="col">Deskripsi Wewenang</th>
              <th scope="col" class="text-center">Jumlah Pengguna</th>
              <th scope="col">Status</th>
              <th scope="col" class="text-end" style="width: 140px;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td colspan="6" class="text-center py-4 text-muted">
                <span class="spinner-border spinner-border-sm me-2"></span> Memuat data level...
              </td>
            </tr>

            <tr *ngIf="!loading && levels.length === 0">
              <td colspan="6" class="text-center py-5 text-muted">
                <i class="bi bi-shield fs-1 d-block mb-2 text-secondary opacity-50"></i>
                Belum ada data level jabatan.
              </td>
            </tr>

            <tr *ngFor="let lvl of levels; let i = index">
              <td class="text-muted small">{{ i + 1 }}</td>
              <td>
                <div class="fw-bold text-dark d-flex align-items-center gap-2">
                  <span>{{ lvl.name }}</span>
                </div>
              </td>
              <td>
                <span class="text-muted small">{{ lvl.description || '-' }}</span>
              </td>
              <td class="text-center">
                <span class="badge" [ngClass]="lvl.user_count && lvl.user_count > 0 ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-light text-muted border'">
                  <i class="bi bi-person me-1"></i> {{ lvl.user_count || 0 }} User
                </span>
              </td>
              <td>
                <span *ngIf="lvl.is_active" class="badge badge-active">
                  <i class="bi bi-check-circle-fill me-1"></i> Aktif
                </span>
                <span *ngIf="!lvl.is_active" class="badge badge-inactive">
                  <i class="bi bi-x-circle-fill me-1"></i> Nonaktif
                </span>
              </td>
              <td class="text-end">
                <div *ngIf="canModify()" class="btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-primary" title="Ubah data level" (click)="openEditModal(lvl)">
                    <i class="bi bi-pencil-square"></i>
                  </button>
                  <button type="button" class="btn btn-outline-danger" title="Hapus level" (click)="promptDelete(lvl)">
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

      <div class="card-footer bg-white py-3 text-muted small">
        Total {{ levels.length }} level jabatan terdaftar dalam sistem.
      </div>
    </div>

    <div class="modal fade" [class.show]="isModalOpen" [style.display]="isModalOpen ? 'block' : 'none'" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi" [ngClass]="isEditMode ? 'bi-pencil-square text-primary' : 'bi-shield-plus text-primary'"></i>
              {{ isEditMode ? 'Ubah Data Level' : 'Tambah Level Baru' }}
            </h5>
            <button type="button" class="btn-close" (click)="closeModal()"></button>
          </div>

          <form [formGroup]="levelForm" (ngSubmit)="saveLevel()">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label small fw-semibold">Nama Level Jabatan <span class="text-danger">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="name"
                  placeholder="Contoh: Super Admin, Manager, Staff, Viewer"
                  [ngClass]="{ 'is-invalid': isFieldInvalid('name') }"
                />
                <div class="invalid-feedback small">Nama level jabatan wajib diisi.</div>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Deskripsi Wewenang</label>
                <textarea
                  class="form-control"
                  rows="3"
                  formControlName="description"
                  placeholder="Jelaskan ruang lingkup hak akses level jabatan ini..."
                ></textarea>
              </div>

              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="levelActiveSwitch" formControlName="is_active" />
                <label class="form-check-label small fw-semibold" for="levelActiveSwitch">
                  Status Level Aktif
                </label>
              </div>
            </div>

            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-outline-secondary" (click)="closeModal()">Batal</button>
              <button type="submit" [disabled]="saving || levelForm.invalid" class="btn btn-primary d-flex align-items-center gap-1">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                <span>{{ saving ? 'Menyimpan...' : 'Simpan Level' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" *ngIf="isModalOpen"></div>

    <div class="modal fade" [class.show]="isDeleteModalOpen" [style.display]="isDeleteModalOpen ? 'block' : 'none'" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow">
          <div class="modal-body p-4">
            <div class="text-center mb-3">
              <i class="bi bi-exclamation-triangle-fill text-warning fs-1"></i>
              <h5 class="fw-bold mt-2">Hapus Level Jabatan</h5>
            </div>

            <div *ngIf="selectedLevel && (selectedLevel.user_count || 0) > 0" class="alert alert-warning small">
              <strong>Perhatian:</strong> Level <strong>{{ selectedLevel.name }}</strong> saat ini masih digunakan oleh
              <strong>{{ selectedLevel.user_count }} pengguna aktif</strong>.
              Sesuai ketentuan integritas data, sistem menyediakan mekanisme <strong>Soft Delete</strong> agar relasi user tetap terjaga.
            </div>

            <p class="text-muted small text-center mb-4">
              Apakah Anda yakin ingin menghapus / mengarsipkan level <strong>{{ selectedLevel?.name }}</strong>?
            </p>

            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-outline-secondary" (click)="isDeleteModalOpen = false">Batal</button>
              <button
                *ngIf="selectedLevel && (selectedLevel.user_count || 0) > 0"
                type="button"
                class="btn btn-warning d-flex align-items-center gap-1"
                [disabled]="deleting"
                (click)="executeDelete(true)">
                <i class="bi bi-archive-fill"></i>
                <span>Soft Delete (Arsipkan)</span>
              </button>
              <button
                *ngIf="selectedLevel && (selectedLevel.user_count || 0) === 0"
                type="button"
                class="btn btn-danger d-flex align-items-center gap-1"
                [disabled]="deleting"
                (click)="executeDelete(false)">
                <i class="bi bi-trash-fill"></i>
                <span>Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" *ngIf="isDeleteModalOpen"></div>
  `
})
export class LevelListComponent implements OnInit {
  levels: Level[] = [];
  loading = false;
  saving = false;
  deleting = false;

  isModalOpen = false;
  isEditMode = false;
  selectedLevel: Level | null = null;
  isDeleteModalOpen = false;

  levelForm: FormGroup;
  canModify = inject(AuthService).canModifyLevels;

  constructor(
    private levelService: LevelService,
    private toast: ToastService,
    private fb: FormBuilder
  ) {
    this.levelForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      description: [''],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    this.loadLevels();
  }

  loadLevels(): void {
    this.loading = true;
    this.levelService.getLevels().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status === 'success') {
          this.levels = res.data || [];
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Gagal memuat data level jabatan.');
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.levelForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  openCreateModal(): void {
    if (!this.canModify()) return;
    this.isEditMode = false;
    this.selectedLevel = null;
    this.levelForm.reset({
      name: '',
      description: '',
      is_active: true
    });
    this.isModalOpen = true;
  }

  openEditModal(level: Level): void {
    if (!this.canModify()) return;
    this.isEditMode = true;
    this.selectedLevel = level;
    this.levelForm.patchValue({
      name: level.name,
      description: level.description,
      is_active: level.is_active
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveLevel(): void {
    if (!this.canModify()) return;
    if (this.levelForm.invalid) {
      this.levelForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const formVal = this.levelForm.value;

    if (this.isEditMode && this.selectedLevel) {
      this.levelService.updateLevel(this.selectedLevel.id, formVal).subscribe({
        next: (res) => {
          this.saving = false;
          if (res.status === 'success') {
            this.toast.success('Data level berhasil diperbarui.');
            this.closeModal();
            this.loadLevels();
          }
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err.error?.message || 'Gagal memperbarui level.');
        }
      });
    } else {
      this.levelService.createLevel(formVal).subscribe({
        next: (res) => {
          this.saving = false;
          if (res.status === 'success') {
            this.toast.success('Level baru berhasil ditambahkan.');
            this.closeModal();
            this.loadLevels();
          }
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err.error?.message || 'Gagal menambahkan level.');
        }
      });
    }
  }

  promptDelete(level: Level): void {
    if (!this.canModify()) return;
    this.selectedLevel = level;
    this.isDeleteModalOpen = true;
  }

  executeDelete(soft: boolean): void {
    if (!this.canModify() || !this.selectedLevel) return;

    this.deleting = true;
    this.levelService.deleteLevel(this.selectedLevel.id, soft).subscribe({
      next: (res) => {
        this.deleting = false;
        this.isDeleteModalOpen = false;
        if (res.status === 'success') {
          this.toast.success(res.message || 'Level berhasil diproses.');
          this.loadLevels();
        }
      },
      error: (err) => {
        this.deleting = false;
        this.toast.error(err.error?.message || 'Gagal menghapus level.');
      }
    });
  }
}
