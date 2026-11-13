import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PermissionMatrix, PageMenu } from '../models/app.models';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly baseUrl = `${environment.apiUrl}/permissions`;

  constructor(private http: HttpClient) {}

  getMatrix(): Observable<ApiResponse<PermissionMatrix>> {
    return this.http.get<ApiResponse<PermissionMatrix>>(`${this.baseUrl}/matrix`);
  }

  getMyPermissions(): Observable<ApiResponse<PageMenu[]>> {
    return this.http.get<ApiResponse<PageMenu[]>>(`${this.baseUrl}/my-permissions`);
  }

  getLevelPermissions(levelId: number): Observable<ApiResponse<{ level: any; page_ids: number[] }>> {
    return this.http.get<ApiResponse<{ level: any; page_ids: number[] }>>(`${this.baseUrl}/levels/${levelId}`);
  }

  updateLevelPermissions(levelId: number, pageIds: number[]): Observable<ApiResponse<{ level_id: number; page_ids: number[] }>> {
    return this.http.post<ApiResponse<{ level_id: number; page_ids: number[] }>>(`${this.baseUrl}/levels/${levelId}`, {
      page_ids: pageIds
    });
  }

  getUserPermissions(userId: number): Observable<ApiResponse<{ user: any; permissions: any[] }>> {
    return this.http.get<ApiResponse<{ user: any; permissions: any[] }>>(`${this.baseUrl}/users/${userId}`);
  }

  updateUserPermissions(userId: number, permissions: { page_id: number; override: boolean | null }[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/users/${userId}`, {
      permissions
    });
  }
}

