import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, LoginResponseData, PageMenu, User } from '../models/app.models';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'imc_auth_token';
  private readonly USER_KEY = 'imc_auth_user';
  private readonly PAGES_KEY = 'imc_auth_pages';

  private currentUserSignal = signal<User | null>(null);
  private accessiblePagesSignal = signal<PageMenu[]>([]);
  private tokenSignal = signal<string | null>(null);

  public currentUser = this.currentUserSignal.asReadonly();
  public accessiblePages = this.accessiblePagesSignal.asReadonly();
  public isAuthenticated = computed(() => !!this.tokenSignal() && !!this.currentUserSignal());
  
  // Super Admin dan Manager memiliki hak CUD data master (User & Page)
  public canModify = computed(() => {
    const level = this.currentUserSignal()?.level_name?.toLowerCase() || '';
    return level === 'super admin' || level === 'manager';
  });

  // Hanya Super Admin yang berhak mengubah level dan matriks permission
  public canModifyLevels = computed(() => {
    const level = this.currentUserSignal()?.level_name?.toLowerCase() || '';
    return level === 'super admin';
  });

  public canModifyPermissions = computed(() => {
    const level = this.currentUserSignal()?.level_name?.toLowerCase() || '';
    return level === 'super admin';
  });

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: ToastService
  ) {
    this.restoreSession();
  }

  private restoreSession(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);
    const pagesJson = localStorage.getItem(this.PAGES_KEY);

    if (token && userJson) {
      try {
        this.tokenSignal.set(token);
        this.currentUserSignal.set(JSON.parse(userJson));
        if (pagesJson) {
          const pages: PageMenu[] = JSON.parse(pagesJson);
          pages.sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
          this.accessiblePagesSignal.set(pages);
        }
        // Sinkronisasi data terkini dan urutan menu dari server
        this.refreshAccessiblePages();
      } catch (e) {
        this.clearSession();
      }
    }
  }

  login(credentials: { username?: string; email?: string; password: string }): Observable<ApiResponse<LoginResponseData>> {
    return this.http.post<ApiResponse<LoginResponseData>>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(res => {
        if (res.status === 'success' && res.data) {
          this.saveSession(res.data.token, res.data.user, res.data.accessible_pages);
        }
      })
    );
  }

  fetchCurrentUser(): Observable<ApiResponse<{ user: User; accessible_pages: PageMenu[] }>> {
    return this.http.get<ApiResponse<{ user: User; accessible_pages: PageMenu[] }>>(`${environment.apiUrl}/auth/me`).pipe(
      tap(res => {
        if (res.status === 'success' && res.data) {
          const sorted = [...(res.data.accessible_pages || [])].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
          this.currentUserSignal.set(res.data.user);
          this.accessiblePagesSignal.set(sorted);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.data.user));
          localStorage.setItem(this.PAGES_KEY, JSON.stringify(sorted));
        }
      })
    );
  }

  refreshAccessiblePages(): void {
    if (!this.getToken()) return;
    this.fetchCurrentUser().subscribe({
      next: () => {},
      error: () => {}
    });
  }

  updateAccessiblePagesOrder(allPages: PageMenu[]): void {
    const orderMap = new Map<number, PageMenu>();
    for (const p of allPages) {
      orderMap.set(p.id, p);
    }

    const currentAccessible = this.accessiblePagesSignal();
    const updated = currentAccessible
      .filter(p => {
        const matching = orderMap.get(p.id);
        return matching ? (matching.is_active !== false) : true;
      })
      .map(p => {
        const matching = orderMap.get(p.id);
        if (matching) {
          return {
            ...p,
            name: matching.name,
            path: matching.path,
            icon: matching.icon || p.icon,
            sort_order: matching.sort_order
          };
        }
        return p;
      });

    updated.sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));

    this.accessiblePagesSignal.set(updated);
    localStorage.setItem(this.PAGES_KEY, JSON.stringify(updated));
  }

  refreshSession(): Observable<ApiResponse<LoginResponseData>> {
    return this.http.post<ApiResponse<LoginResponseData>>(`${environment.apiUrl}/auth/refresh`, {}).pipe(
      tap(res => {
        if (res.status === 'success' && res.data) {
          this.saveSession(res.data.token, res.data.user, res.data.accessible_pages);
        }
      }),
      catchError(err => {
        this.logout();
        return of(err);
      })
    );
  }

  private saveSession(token: string, user: User, pages: PageMenu[]): void {
    const sorted = [...(pages || [])].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
    this.tokenSignal.set(token);
    this.currentUserSignal.set(user);
    this.accessiblePagesSignal.set(sorted);

    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.PAGES_KEY, JSON.stringify(sorted));
  }

  clearSession(): void {
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    this.accessiblePagesSignal.set([]);

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.PAGES_KEY);
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
        next: () => {},
        error: () => {}
      });
    }
    this.clearSession();
    this.toast.info('Anda telah keluar dari aplikasi.');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal() || localStorage.getItem(this.TOKEN_KEY);
  }

  hasAccessToRoute(routePath: string): boolean {
    const pages = this.accessiblePagesSignal();
    const cleanPath = '/' + routePath.replace(/^\/+|\/+$/g, '');

    if (cleanPath === '/dashboard') {
      return true;
    }

    return pages.some(page => {
      const pagePath = '/' + page.path.replace(/^\/+|\/+$/g, '');
      return cleanPath === pagePath || cleanPath.startsWith(pagePath + '/');
    });
  }
}

