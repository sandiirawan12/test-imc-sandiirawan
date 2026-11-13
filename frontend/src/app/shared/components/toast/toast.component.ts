import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;">
      <div
        *ngFor="let toast of toastService.toasts()"
        class="toast show shadow-sm border-0 mb-2"
        [ngClass]="{
          'text-bg-success': toast.type === 'success',
          'text-bg-danger': toast.type === 'error',
          'text-bg-warning': toast.type === 'warning',
          'text-bg-info': toast.type === 'info'
        }"
        role="alert"
        aria-live="assertive"
        aria-atomic="true">
        <div class="toast-header border-bottom-0" [ngClass]="{
          'bg-success text-white': toast.type === 'success',
          'bg-danger text-white': toast.type === 'error',
          'bg-warning text-dark': toast.type === 'warning',
          'bg-info text-white': toast.type === 'info'
        }">
          <i class="bi me-2" [ngClass]="{
            'bi-check-circle-fill': toast.type === 'success',
            'bi-exclamation-triangle-fill': toast.type === 'error' || toast.type === 'warning',
            'bi-info-circle-fill': toast.type === 'info'
          }"></i>
          <strong class="me-auto">{{ toast.title || 'Pemberitahuan' }}</strong>
          <button type="button" class="btn-close" [class.btn-close-white]="toast.type !== 'warning'" (click)="toastService.remove(toast.id)"></button>
        </div>
        <div class="toast-body bg-white text-dark py-2 px-3 border border-top-0 rounded-bottom">
          {{ toast.message }}
        </div>
      </div>
    </div>
  `
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}

