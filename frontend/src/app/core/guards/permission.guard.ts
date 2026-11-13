import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  const targetPath = '/' + route.routeConfig?.path;

  if (authService.hasAccessToRoute(targetPath)) {
    return true;
  }

  toastService.error(`Anda tidak memiliki izin untuk mengakses halaman '${targetPath}'.`, 'Akses Ditolak');
  router.navigate(['/dashboard']);
  return false;
};

