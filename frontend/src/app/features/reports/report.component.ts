import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/app.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card mb-4">
      <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <div>
          <h5 class="fw-bold mb-1 text-dark">Laporan Ringkasan Sistem</h5>
          <p class="text-muted small mb-0">Statistik data pengguna, jabatan, dan modul aplikasi.</p>
        </div>
        <button class="btn btn-sm btn-outline-primary" (click)="loadReport()">
          <i class="bi bi-arrow-clockwise me-1"></i> Perbarui Data
        </button>
      </div>

      <div class="card-body p-4">
        <div *ngIf="loading" class="text-center py-5">
          <span class="spinner-border spinner-border-sm me-2 text-primary"></span>
          <span class="text-muted">Memuat data laporan...</span>
        </div>

        <div *ngIf="!loading && reportData">
          <div class="row g-3 mb-4">
            <div class="col-md-3">
              <div class="p-3 bg-light rounded-3 border">
                <div class="text-muted small">Total Pengguna</div>
                <h3 class="fw-bold mb-0 text-primary">{{ reportData.total_users }}</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="p-3 bg-light rounded-3 border">
                <div class="text-muted small">Pengguna Aktif</div>
                <h3 class="fw-bold mb-0 text-success">{{ reportData.active_users }}</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="p-3 bg-light rounded-3 border">
                <div class="text-muted small">Pengguna Nonaktif</div>
                <h3 class="fw-bold mb-0 text-danger">{{ reportData.inactive_users }}</h3>
              </div>
            </div>
            <div class="col-md-3">
              <div class="p-3 bg-light rounded-3 border">
                <div class="text-muted small">Total Level Jabatan</div>
                <h3 class="fw-bold mb-0 text-dark">{{ reportData.total_levels }}</h3>
              </div>
            </div>
          </div>

          <div class="card border bg-light">
            <div class="card-body">
              <h6 class="fw-bold mb-2">Informasi Laporan</h6>
              <div class="row small text-muted">
                <div class="col-sm-4">Dibuat oleh: <strong class="text-dark">{{ reportData.accessed_by?.username }} ({{ reportData.accessed_by?.level }})</strong></div>
                <div class="col-sm-4">Waktu Generate: <strong class="text-dark">{{ reportData.generated_at }}</strong></div>
                <div class="col-sm-4">Status: <strong class="text-success">Aktif</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ReportComponent implements OnInit {
  loading = false;
  reportData: any = null;

  constructor(
    private http: HttpClient,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.http.get<ApiResponse<any>>(`${environment.apiUrl}/reports`).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status === 'success') {
          this.reportData = res.data;
        }
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err.error?.message || 'Gagal memuat data laporan.');
      }
    });
  }
}

