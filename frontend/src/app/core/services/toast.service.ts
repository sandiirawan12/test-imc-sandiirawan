import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSignal = signal<ToastMessage[]>([]);
  public toasts = this.toastsSignal.asReadonly();
  private counter = 0;

  show(type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string, duration = 4000): void {
    const cleanMessage = this.sanitizeMessage(message);
    const id = ++this.counter;
    const toast: ToastMessage = { id, type, message: cleanMessage, title };
    this.toastsSignal.update(list => [...list, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  private sanitizeMessage(msg: string): string {
    if (!msg) return 'Terjadi kendala pada sistem.';
    const sqlKeywords = [
      'sqlstate', 'select ', 'insert into', 'update ', 'delete from',
      'pdoexception', 'relation "', 'table "', 'column "',
      'syntax error', 'constraint "', 'pg_'
    ];
    const lower = msg.toLowerCase();
    for (const kw of sqlKeywords) {
      if (lower.includes(kw)) {
        return 'Terjadi kendala pada pemrosesan database. Silakan coba beberapa saat lagi.';
      }
    }
    return msg;
  }

  success(message: string, title: string = 'Berhasil'): void {
    this.show('success', message, title);
  }

  error(message: string, title: string = 'Terjadi Kesalahan'): void {
    this.show('error', message, title, 5000);
  }

  warning(message: string, title: string = 'Peringatan'): void {
    this.show('warning', message, title);
  }

  info(message: string, title: string = 'Informasi'): void {
    this.show('info', message, title);
  }

  remove(id: number): void {
    this.toastsSignal.update(list => list.filter(t => t.id !== id));
  }
}

