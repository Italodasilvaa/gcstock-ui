import { Service } from '@angular/core';
import { BarbecueKit } from '../models/models';

/**
 * Ponte entre KitsComponent (botão "Vender este Kit") e VendasPdvComponent.
 * Substitui o prop-drilling de `selectedKitForSale` que hoje passa pelo App.tsx.
 */
@Service()
export class CartBridgeService {
  private pendingKit: BarbecueKit | null = null;

  setKitForSale(kit: BarbecueKit): void {
    this.pendingKit = kit;
  }

  consumeKitForSale(): BarbecueKit | null {
    const kit = this.pendingKit;
    this.pendingKit = null;
    return kit;
  }
}
