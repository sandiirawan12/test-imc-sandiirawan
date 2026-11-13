import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PageService } from '../../core/services/page.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PageMenu } from '../../core/models/app.models';

@Component({
  selector: 'app-page-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="card mb-4">
      <div class="card-header bg-white d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h5 class="fw-bold mb-1 text-dark">Data Halaman & Menu Aplikasi (Pages)</h5>
          <p class="text-muted small mb-0">Kelola rute navigasi, urutan tampil menu di sidebar, dan status modul aplikasi.</p>
        </div>
        <button *ngIf="canModify()" type="button" class="btn btn-primary d-flex align-items-center gap-2" (click)="openCreateModal()">
          <i class="bi bi-plus-circle"></i>
          <span>Tambah Halaman</span>
        </button>
        <span *ngIf="!canModify()" class="badge bg-secondary-subtle text-secondary border px-3 py-2">
          <i class="bi bi-eye me-1"></i> Mode Read-Only
        </span>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th scope="col" style="width: 130px;">Urutan</th>
              <th scope="col">Nama Halaman</th>
              <th scope="col">Route / Path URL</th>
              <th scope="col">Deskripsi</th>
              <th scope="col">Status</th>
              <th scope="col" class="text-end" style="width: 140px;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td colspan="6" class="text-center py-4 text-muted">
                <span class="spinner-border spinner-border-sm me-2"></span> Memuat daftar halaman...
              </td>
            </tr>

            <tr *ngIf="!loading && pages.length === 0">
              <td colspan="6" class="text-center py-5 text-muted">
                <i class="bi bi-layers fs-1 d-block mb-2 text-secondary opacity-50"></i>
                Belum ada data halaman/menu.
              </td>
            </tr>

            <tr *ngFor="let p of pages; let i = index">
              <td>
                <div class="d-inline-flex align-items-center gap-1">
                  <span class="badge bg-secondary-subtle text-secondary border font-monospace me-1">#{{ p.sort_order }}</span>
                  <div *ngIf="canModify()" class="btn-group btn-group-sm">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary py-0 px-1"
                      title="Pindah ke Atas"
                      [disabled]="i === 0 || reordering"
                      (click)="movePage(i, 'up')">
                      <i class="bi bi-chevron-up"></i>
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary py-0 px-1"
                      title="Pindah ke Bawah"
                      [disabled]="i === pages.length - 1 || reordering"
                      (click)="movePage(i, 'down')">
                      <i class="bi bi-chevron-down"></i>
                    </button>
                  </div>
                </div>
              </td>
              <td>
                <div class="fw-bold text-dark d-flex align-items-center gap-2">
                  <span>{{ p.name }}</span>
                </div>
              </td>
              <td>
                <code class="text-primary bg-light px-2 py-1 rounded border small">{{ p.path }}</code>
              </td>
              <td class="text-muted small">
                {{ p.description || '-' }}
              </td>
              <td>
                <span *ngIf="p.is_active" class="badge badge-active">
                  <i class="bi bi-check-circle-fill me-1"></i> Aktif
                </span>
                <span *ngIf="!p.is_active" class="badge badge-inactive">
                  <i class="bi bi-x-circle-fill me-1"></i> Nonaktif
                </span>
              </td>
              <td class="text-end">
                <div *ngIf="canModify()" class="btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-primary" title="Ubah halaman" (click)="openEditModal(p)">
                    <i class="bi bi-pencil-square"></i>
                  </button>
                  <button type="button" class="btn btn-outline-danger" title="Hapus halaman" (click)="promptDelete(p)">
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
        Terdapat {{ pages.length }} rute halaman terdaftar.
      </div>
    </div>

    <div class="modal fade" [class.show]="isModalOpen" [style.display]="isModalOpen ? 'block' : 'none'" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">
              <i class="bi" [ngClass]="isEditMode ? 'bi-pencil-square text-primary' : 'bi-plus-circle text-primary'"></i>
              {{ isEditMode ? 'Ubah Halaman' : 'Tambah Halaman Baru' }}
            </h5>
            <button type="button" class="btn-close" (click)="closeModal()"></button>
          </div>

          <form [formGroup]="pageForm" (ngSubmit)="savePage()">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label small fw-semibold">Nama Halaman (Menu) <span class="text-danger">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="name"
                  placeholder="Contoh: Laporan Operasional"
                  [ngClass]="{ 'is-invalid': isFieldInvalid('name') }"
                />
                <div class="invalid-feedback small">Nama halaman wajib diisi.</div>
              </div>

              <div class="row g-2 mb-3">
                <div class="col-8">
                  <label class="form-label small fw-semibold">Route / Path URL <span class="text-danger">*</span></label>
                  <input
                    type="text"
                    class="form-control"
                    formControlName="path"
                    placeholder="/reports"
                    [ngClass]="{ 'is-invalid': isFieldInvalid('path') }"
                  />
                  <div class="invalid-feedback small">Route/path wajib diisi (contoh: /reports).</div>
                </div>

                <div class="col-4">
                  <label class="form-label small fw-semibold">Urutan Menu <span class="text-danger">*</span></label>
                  <input
                    type="number"
                    class="form-control"
                    formControlName="sort_order"
                    placeholder="10"
                    [ngClass]="{ 'is-invalid': isFieldInvalid('sort_order') }"
                  />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Deskripsi</label>
                <textarea
                  class="form-control"
                  rows="2"
                  formControlName="description"
                  placeholder="Ringkasan fungsi halaman ini..."
                ></textarea>
              </div>

              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="pageActiveSwitch" formControlName="is_active" />
                <label class="form-check-label small fw-semibold" for="pageActiveSwitch">
                  Status Halaman Aktif
                </label>
              </div>
            </div>

            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-outline-secondary" (click)="closeModal()">Batal</button>
              <button type="submit" [disabled]="saving || pageForm.invalid" class="btn btn-primary d-flex align-items-center gap-1">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                <span>{{ saving ? 'Menyimpan...' : 'Simpan Halaman' }}</span>
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
            <h5 class="fw-bold">Hapus Halaman?</h5>
            <p class="text-muted small mb-3">
              Apakah Anda yakin ingin menghapus halaman <strong>{{ selectedPage?.name }}</strong>?
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
export class PageListComponent implements OnInit {
  pages: PageMenu[] = [];
  loading = false;
  saving = false;
  deleting = false;
  reordering = false;

  isModalOpen = false;
  isEditMode = false;
  selectedPage: PageMenu | null = null;
  isDeleteModalOpen = false;

  pageForm: FormGroup;
  canModify = inject(AuthService).canModify;
  private authService = inject(AuthService);

  constructor(
    private pageService: PageService,
    private toast: ToastService,
    private fb: FormBuilder
  ) {
    this.pageForm = this.fb.group({
      name: ['', [Validators.required]],
      path: ['', [Validators.required]],
      sort_order: [10, [Validators.required]],
      description: [''],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    this.loadPages();
  }

  loadPages(): void {
    this.loading = true;
    this.pageService.getPages().subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status === 'success') {
          this.pages = res.data || [];
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Gagal memuat data halaman.');
      }
    });
  }

  movePage(index: number, direction: 'up' | 'down'): void {
    if (!this.canModify() || this.reordering) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this.pages.length) return;

    const updated = [...this.pages];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    updated.forEach((p, idx) => {
      p.sort_order = (idx + 1) * 10;
    });

    this.pages = updated;

    // Langsung perbarui urutan navigasi menu di sidebar secara realtime
    this.authService.updateAccessiblePagesOrder(this.pages);

    this.reordering = true;
    const orders = this.pages.map(p => ({ id: p.id, sort_order: p.sort_order }));
    this.pageService.reorderPages(orders).subscribe({
      next: (res) => {
        this.reordering = false;
        if (res.status === 'success') {
          this.toast.success('Urutan menu berhasil diubah.');
          this.authService.refreshAccessiblePages();
        }
      },
      error: (err) => {
        this.reordering = false;
        this.toast.error(err.error?.message || 'Gagal mengubah urutan menu.');
        this.loadPages();
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.pageForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  openCreateModal(): void {
    if (!this.canModify()) return;
    this.isEditMode = false;
    this.selectedPage = null;
    const nextOrder = (this.pages.length + 1) * 10;
    this.pageForm.reset({
      name: '',
      path: '',
      sort_order: nextOrder,
      description: '',
      is_active: true
    });
    this.isModalOpen = true;
  }

  openEditModal(page: PageMenu): void {
    if (!this.canModify()) return;
    this.isEditMode = true;
    this.selectedPage = page;
    this.pageForm.patchValue({
      name: page.name,
      path: page.path,
      sort_order: page.sort_order,
      description: page.description,
      is_active: page.is_active ?? true
    });
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  savePage(): void {
    if (!this.canModify()) return;
    if (this.pageForm.invalid) {
      this.pageForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const formVal = this.pageForm.value;

    if (this.isEditMode && this.selectedPage) {
      this.pageService.updatePage(this.selectedPage.id, formVal).subscribe({
        next: (res) => {
          this.saving = false;
          if (res.status === 'success') {
            this.toast.success('Halaman berhasil diperbarui.');
            this.closeModal();
            this.loadPages();
            this.authService.refreshAccessiblePages();
          }
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err.error?.message || 'Gagal memperbarui halaman.');
        }
      });
    } else {
      this.pageService.createPage(formVal).subscribe({
        next: (res) => {
          this.saving = false;
          if (res.status === 'success') {
            this.toast.success('Halaman baru berhasil ditambahkan.');
            this.closeModal();
            this.loadPages();
            this.authService.refreshAccessiblePages();
          }
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err.error?.message || 'Gagal menambahkan halaman.');
        }
      });
    }
  }

  promptDelete(page: PageMenu): void {
    if (!this.canModify()) return;
    this.selectedPage = page;
    this.isDeleteModalOpen = true;
  }

  executeDelete(): void {
    if (!this.canModify() || !this.selectedPage) return;

    this.deleting = true;
    this.pageService.deletePage(this.selectedPage.id).subscribe({
      next: (res) => {
        this.deleting = false;
        this.isDeleteModalOpen = false;
        if (res.status === 'success') {
          this.toast.success(res.message || 'Halaman berhasil dihapus.');
          this.loadPages();
          this.authService.refreshAccessiblePages();
        }
      },
      error: (err) => {
        this.deleting = false;
        this.toast.error(err.error?.message || 'Gagal menghapus halaman.');
      }
    });
  }
}

