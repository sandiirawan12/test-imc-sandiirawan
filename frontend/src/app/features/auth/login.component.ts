import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastComponent],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light py-4 px-3">
      <div class="card shadow-sm border-0 w-100" style="max-width: 440px;">
        <div class="card-body p-4 p-sm-5">
          <div class="text-center mb-4">
            <div class="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-3" style="width: 56px; height: 56px;">
              <i class="bi bi-shield-check fs-2"></i>
            </div>
            <h4 class="fw-bold mb-1 text-dark">User Access Management</h4>
            <p class="text-muted small mb-0">PT. Integral Mulia Cipta</p>
          </div>

          <div *ngIf="errorMessage" class="alert alert-danger alert-dismissible fade show d-flex align-items-center py-2 px-3 small" role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2 fs-6"></i>
            <div>{{ errorMessage }}</div>
            <button type="button" class="btn-close py-2" (click)="errorMessage = ''"></button>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <div class="mb-3">
              <label for="username" class="form-label small fw-semibold text-secondary">Username atau Email</label>
              <div class="input-group">
                <span class="input-group-text bg-light text-muted"><i class="bi bi-person"></i></span>
                <input
                  id="username"
                  type="text"
                  formControlName="username"
                  class="form-control"
                  placeholder="admin atau admin@imc.co.id"
                  [ngClass]="{ 'is-invalid': isFieldInvalid('username') }"
                  autocomplete="username"
                />
              </div>
              <div *ngIf="isFieldInvalid('username')" class="invalid-feedback d-block small">
                Username atau email wajib diisi.
              </div>
            </div>

            <div class="mb-4">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label for="password" class="form-label small fw-semibold text-secondary mb-0">Password</label>
              </div>
              <div class="input-group">
                <span class="input-group-text bg-light text-muted"><i class="bi bi-lock"></i></span>
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  formControlName="password"
                  class="form-control"
                  placeholder="••••••••"
                  [ngClass]="{ 'is-invalid': isFieldInvalid('password') }"
                  autocomplete="current-password"
                />
                <button type="button" class="btn btn-outline-secondary" (click)="showPassword = !showPassword">
                  <i class="bi" [ngClass]="showPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
                </button>
              </div>
              <div *ngIf="isFieldInvalid('password')" class="invalid-feedback d-block small">
                Password wajib diisi (minimal 6 karakter).
              </div>
            </div>

            <button
              type="submit"
              [disabled]="loading || loginForm.invalid"
              class="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2">
              <span *ngIf="loading" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ loading ? 'Memproses...' : 'Masuk ke Aplikasi' }}</span>
              <i *ngIf="!loading" class="bi bi-arrow-right"></i>
            </button>
          </form>

          <div class="mt-4 pt-3 border-top">
            <div class="small fw-semibold text-muted mb-2 text-center">Akun Uji Coba Cepat (Evaluasi):</div>
            <div class="d-flex flex-wrap gap-1 justify-content-center">
              <button type="button" (click)="quickFill('admin')" class="btn btn-xs btn-outline-primary py-1 px-2 text-nowrap" style="font-size: 0.75rem;">
                <i class="bi bi-person-fill-gear me-1"></i>Admin
              </button>
              <button type="button" (click)="quickFill('budi')" class="btn btn-xs btn-outline-secondary py-1 px-2 text-nowrap" style="font-size: 0.75rem;">
                <i class="bi bi-briefcase me-1"></i>Manager
              </button>
              <button type="button" (click)="quickFill('siti')" class="btn btn-xs btn-outline-success py-1 px-2 text-nowrap" style="font-size: 0.75rem;">
                <i class="bi bi-person-badge me-1"></i>Staff
              </button>
              <button type="button" (click)="quickFill('eko')" class="btn btn-xs btn-outline-info py-1 px-2 text-nowrap" style="font-size: 0.75rem;">
                <i class="bi bi-eye me-1"></i>Viewer
              </button>
              <button type="button" (click)="quickFill('donny')" class="btn btn-xs btn-outline-danger py-1 px-2 text-nowrap" style="font-size: 0.75rem;">
                <i class="bi bi-slash-circle me-1"></i>Nonaktif
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <app-toast></app-toast>
  `
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  showPassword = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  quickFill(username: string): void {
    this.loginForm.patchValue({
      username: username,
      password: 'password123'
    });
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status === 'success') {
          this.toast.success(`Selamat datang kembali, ${res.data?.user.full_name}!`);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = res.message || 'Login gagal.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Gagal login. Periksa username dan password Anda.';
      }
    });
  }
}

