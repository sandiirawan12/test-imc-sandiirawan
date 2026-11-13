import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Level } from '../models/app.models';

@Injectable({
  providedIn: 'root'
})
export class LevelService {
  private readonly baseUrl = `${environment.apiUrl}/levels`;

  constructor(private http: HttpClient) {}

  getLevels(includeDeleted = false): Observable<ApiResponse<Level[]>> {
    let params = new HttpParams();
    if (includeDeleted) {
      params = params.set('include_deleted', '1');
    }
    return this.http.get<ApiResponse<Level[]>>(this.baseUrl, { params });
  }

  getLevel(id: number): Observable<ApiResponse<Level>> {
    return this.http.get<ApiResponse<Level>>(`${this.baseUrl}/${id}`);
  }

  createLevel(level: Partial<Level>): Observable<ApiResponse<Level>> {
    return this.http.post<ApiResponse<Level>>(this.baseUrl, level);
  }

  updateLevel(id: number, level: Partial<Level>): Observable<ApiResponse<Level>> {
    return this.http.put<ApiResponse<Level>>(`${this.baseUrl}/${id}`, level);
  }

  deleteLevel(id: number, soft = false): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (soft) {
      params = params.set('soft', 'true');
    }
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`, { params });
  }
}

