import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateService } from '../services/app-state';

export const authGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const router = inject(Router);

  if (appState.session()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
