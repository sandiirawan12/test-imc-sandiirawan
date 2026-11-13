import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, User } from '../models/app.models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsers(filters?: { search?: string; level_id?: number | null; is_active?: boolean | null }): Observable<ApiResponse<User[]>> {
    let params = new HttpParams();
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.level_id !== undefined && filters.level_id !== null) {
      params = params.set('level_id', filters.level_id.toString());
    }
    if (filters?.is_active !== undefined && filters.is_active !== null) {
      params = params.set('is_active', filters.is_active.toString());
    }

    return this.http.get<ApiResponse<User[]>>(this.baseUrl, { params });
  }

  getUser(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/${id}`);
  }

  createUser(user: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.baseUrl, user);
  }

  updateUser(id: number, user: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.baseUrl}/${id}`, user);
  }

  deleteUser(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}

