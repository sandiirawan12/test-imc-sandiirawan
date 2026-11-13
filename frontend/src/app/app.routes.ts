import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { LoginComponent } from './features/auth/login.component';
import { MainLayoutComponent } from './shared/layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UserListComponent } from './features/users/user-list.component';
import { LevelListComponent } from './features/levels/level-list.component';
import { PageListComponent } from './features/pages/page-list.component';
import { PermissionMatrixComponent } from './features/permissions/permission-matrix.component';
import { ReportComponent } from './features/reports/report.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [permissionGuard]
      },
      {
        path: 'users',
        component: UserListComponent,
        canActivate: [permissionGuard]
      },
      {
        path: 'levels',
        component: LevelListComponent,
        canActivate: [permissionGuard]
      },
      {
        path: 'pages',
        component: PageListComponent,
        canActivate: [permissionGuard]
      },
      {
        path: 'permissions',
        component: PermissionMatrixComponent,
        canActivate: [permissionGuard]
      },
      {
        path: 'reports',
        component: ReportComponent,
        canActivate: [permissionGuard]
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
