import { Service } from '@angular/core';

const TOKEN_KEY = 'gcstock_token';

/** Acesso ao JWT emitido pela GC Stock API, persistido no localStorage do navegador. */
@Service()
export class TokenStorageService {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}
