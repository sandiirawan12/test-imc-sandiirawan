import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageMenu } from '../models/app.models';

@Injectable({
  providedIn: 'root'
})
export class PageService {
  private readonly baseUrl = `${environment.apiUrl}/pages`;

  constructor(private http: HttpClient) {}

  getPages(): Observable<ApiResponse<PageMenu[]>> {
    return this.http.get<ApiResponse<PageMenu[]>>(this.baseUrl);
  }

  getPage(id: number): Observable<ApiResponse<PageMenu>> {
    return this.http.get<ApiResponse<PageMenu>>(`${this.baseUrl}/${id}`);
  }

  createPage(page: Partial<PageMenu>): Observable<ApiResponse<PageMenu>> {
    return this.http.post<ApiResponse<PageMenu>>(this.baseUrl, page);
  }

  reorderPages(orders: { id: number; sort_order: number }[]): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/reorder`, { orders });
  }

  updatePage(id: number, page: Partial<PageMenu>): Observable<ApiResponse<PageMenu>> {
    return this.http.put<ApiResponse<PageMenu>>(`${this.baseUrl}/${id}`, page);
  }

  deletePage(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}

