import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (!req.url.includes('/auth/login')) {
          authService.clearSession();
          toastService.error('Sesi Anda telah kedaluwarsa. Silakan login kembali.');
          router.navigate(['/login']);
        }
      } else if (error.status === 403) {
        const message = error.error?.message || 'Anda tidak memiliki hak akses untuk aksi ini.';
        toastService.error(message, 'Akses Ditolak');
      } else if (error.status >= 500) {
        const message = error.error?.message || 'Terjadi kendala pada sistem server. Silakan coba beberapa saat lagi.';
        toastService.error(message, 'Kendala Server');
      }

      return throwError(() => error);
    })
  );
};

