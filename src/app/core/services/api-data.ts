import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccountsPayableTitle,
  AccountsReceivableTitle,
  AuditLogEntry,
  AuthSession,
  BarbecueKit,
  CancelSaleResult,
  CapitalContribution,
  CashSummary,
  CreateStockLossRequest,
  LotProfit,
  MonthlyBalance,
  FinancialSummary,
  CardSettlementTitle,
  Client,
  CompanyTenant,
  Employee,
  GlobalAlertSetting,
  PaymentFeeSetting,
  PermissionInfo,
  ProductCategory,
  ProductItem,
  PurchaseEntry,
  SavePurchasePayload,
  SaleHistory,
  SaleRecord,
  StockBatch,
  StockLoss,
  StockMovement,
  TenantBranch,
  UploadedFile,
} from '../models/models';
import { TokenStorageService } from './token-storage';

const BASE = environment.apiUrl;

/**
 * Cliente HTTP da GC Stock API. Substitui o antigo MockDataService (localStorage) mantendo,
 * onde possível, os mesmos nomes/formas de método — a diferença é que cada chamada agora
 * retorna um Observable (requisição de rede real) em vez de um valor síncrono.
 */
@Service()
export class ApiDataService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);

  // ---------------------------------------------------------------------
  // Auth & Tenants
  // ---------------------------------------------------------------------

  registerCompany(data: {
    corporateName: string;
    tradeName: string;
    document: string;
    ownerName: string;
    email: string;
    password?: string;
    phone: string;
    segment: string;
    city: string;
    state: string;
    employees?: { name: string; email: string; password?: string; role: Employee['role'] }[];
  }): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${BASE}/auth/register-company`, data);
  }

  /** Credenciais inválidas (401/400) viram `null`; qualquer outro erro (rede, servidor fora do ar) é propagado. */
  login(email: string, password?: string): Observable<AuthSession | null> {
    return this.http.post<AuthSession>(`${BASE}/auth/login`, { email, password }).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 400) return of(null);
        return throwError(() => err);
      }),
    );
  }

  /** Reidrata a sessão a partir do token salvo (chamado no boot do app). */
  getCurrentSession(): Observable<AuthSession> {
    return this.http
      .get<AuthSession>(`${BASE}/auth/me`)
      .pipe(map((session) => ({ ...session, token: this.tokenStorage.getToken() ?? session.token })));
  }

  /** Emite um novo token para a sessão atual (aviso de inatividade "você está online?"). */
  renewToken(): Observable<AuthSession | null> {
    return this.http.post<AuthSession>(`${BASE}/auth/renew`, {}).pipe(
      catchError((err: HttpErrorResponse) => (err.status === 401 ? of(null) : throwError(() => err))),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${BASE}/auth/logout`, {}).pipe(catchError(() => of(undefined)));
  }

  getMyCompanies(): Observable<CompanyTenant[]> {
    return this.http.get<CompanyTenant[]>(`${BASE}/tenants/my-companies`);
  }

  switchCompany(companyId: string): Observable<AuthSession | null> {
    return this.http
      .post<AuthSession>(`${BASE}/tenants/switch`, { companyId })
      .pipe(catchError(() => of(null)));
  }

  getBranches(): Observable<TenantBranch[]> {
    return this.http.get<TenantBranch[]>(`${BASE}/tenants/filiais`);
  }

  // ---------------------------------------------------------------------
  // Funcionários
  // ---------------------------------------------------------------------

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${BASE}/funcionarios`);
  }

  saveEmployee(employee: Partial<Employee> & { name: string; email: string }): Observable<Employee> {
    return employee.id
      ? this.http.put<Employee>(`${BASE}/funcionarios/${employee.id}`, employee)
      : this.http.post<Employee>(`${BASE}/funcionarios`, employee);
  }

  deleteEmployee(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/funcionarios/${id}`);
  }

  transferEmployee(employeeId: string, targetCompanyId: string): Observable<Employee | null> {
    return this.http
      .post<Employee>(`${BASE}/funcionarios/${employeeId}/transferir`, { targetCompanyId })
      .pipe(catchError(() => of(null)));
  }

  /** Catálogo de permissões que podem ser atribuídas a funcionários. */
  getPermissions(): Observable<PermissionInfo[]> {
    return this.http.get<PermissionInfo[]>(`${BASE}/permissoes`);
  }

  // ---------------------------------------------------------------------
  // Arquivos (Cloudflare R2)
  // ---------------------------------------------------------------------

  /** Envia um arquivo ao storage pela API e devolve a URL pública. `folder` agrupa por tipo (ex.: "produtos", "kits"). */
  uploadFile(file: File, folder: string): Observable<UploadedFile> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<UploadedFile>(`${BASE}/arquivos`, body, { params: { pasta: folder } });
  }

  // ---------------------------------------------------------------------
  // Produtos & Kits
  // ---------------------------------------------------------------------

  getProducts(): Observable<ProductItem[]> {
    return this.http.get<ProductItem[]>(`${BASE}/produtos`);
  }

  saveProduct(product: Partial<ProductItem>): Observable<ProductItem> {
    return product.id
      ? this.http.put<ProductItem>(`${BASE}/produtos/${product.id}`, product)
      : this.http.post<ProductItem>(`${BASE}/produtos`, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/produtos/${id}`);
  }

  getCategories(): Observable<ProductCategory[]> {
    return this.http.get<ProductCategory[]>(`${BASE}/categorias-produto`);
  }

  createCategory(category: { name: string; icon?: string }): Observable<ProductCategory> {
    return this.http.post<ProductCategory>(`${BASE}/categorias-produto`, category);
  }

  /** Renomear também atualiza a categoria dos produtos que usavam o nome antigo (feito no backend). */
  updateCategory(id: string, category: { name: string; icon?: string }): Observable<ProductCategory> {
    return this.http.put<ProductCategory>(`${BASE}/categorias-produto/${id}`, category);
  }

  reorderCategories(ids: string[]): Observable<ProductCategory[]> {
    return this.http.put<ProductCategory[]>(`${BASE}/categorias-produto/ordem`, { ids });
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/categorias-produto/${id}`);
  }

  getKits(): Observable<BarbecueKit[]> {
    return this.http.get<BarbecueKit[]>(`${BASE}/kits-churrasco`);
  }

  saveKit(kit: Partial<BarbecueKit>): Observable<BarbecueKit> {
    return kit.id
      ? this.http.put<BarbecueKit>(`${BASE}/kits-churrasco/${kit.id}`, kit)
      : this.http.post<BarbecueKit>(`${BASE}/kits-churrasco`, kit);
  }

  deleteKit(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/kits-churrasco/${id}`);
  }

  // ---------------------------------------------------------------------
  // Estoque
  // ---------------------------------------------------------------------

  /** Caixa da empresa no período (yyyy-MM-dd): saldo, entradas, saídas e extrato. */
  getCash(from: string, to: string): Observable<CashSummary> {
    return this.http.get<CashSummary>(`${BASE}/financeiro/caixa?de=${from}&ate=${to}`);
  }

  getContributions(): Observable<CapitalContribution[]> {
    return this.http.get<CapitalContribution[]>(`${BASE}/financeiro/aportes`);
  }

  addContribution(request: { description: string; source?: string; amount: number; date?: string }): Observable<CapitalContribution> {
    return this.http.post<CapitalContribution>(`${BASE}/financeiro/aportes`, request);
  }

  deleteContribution(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/financeiro/aportes/${id}`);
  }

  /** Balanço mês a mês de um ano. */
  getMonthlyBalance(year: number): Observable<MonthlyBalance[]> {
    return this.http.get<MonthlyBalance[]>(`${BASE}/financeiro/balanco-mensal?ano=${year}`);
  }

  /** Lucro por lote no período (yyyy-MM-dd). */
  getLotProfits(from: string, to: string): Observable<LotProfit[]> {
    return this.http.get<LotProfit[]>(`${BASE}/financeiro/lucro-por-lote?de=${from}&ate=${to}`);
  }

  /** Perdas de estoque lançadas (inclui as desfeitas). */
  getLosses(): Observable<StockLoss[]> {
    return this.http.get<StockLoss[]>(`${BASE}/estoque/perdas`);
  }

  /** Registra uma perda: abate do estoque e grava o prejuízo (quantidade × custo informado). */
  createLoss(request: CreateStockLossRequest): Observable<StockLoss> {
    return this.http.post<StockLoss>(`${BASE}/estoque/perdas`, request);
  }

  /** Desfaz uma perda lançada por engano (devolve a quantidade ao estoque). */
  undoLoss(id: string): Observable<StockLoss> {
    return this.http.delete<StockLoss>(`${BASE}/estoque/perdas/${id}`);
  }

  getBatches(): Observable<StockBatch[]> {
    return this.http.get<StockBatch[]>(`${BASE}/estoque/lotes`);
  }

  getMovements(): Observable<StockMovement[]> {
    return this.http.get<StockMovement[]>(`${BASE}/estoque/movimentacoes`);
  }

  // ---------------------------------------------------------------------
  // Compras
  // ---------------------------------------------------------------------

  getPurchases(): Observable<PurchaseEntry[]> {
    return this.http.get<PurchaseEntry[]>(`${BASE}/compras`);
  }

  savePurchase(purchase: SavePurchasePayload): Observable<PurchaseEntry> {
    return this.http.post<PurchaseEntry>(`${BASE}/compras/entrada`, purchase);
  }

  /** Apaga uma entrada lançada por engano (estorna estoque e custo; 409 se parte já foi vendida/perdida). */
  deletePurchase(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/compras/${id}`);
  }

  updatePurchase(id: string, purchase: SavePurchasePayload): Observable<PurchaseEntry> {
    return this.http.put<PurchaseEntry>(`${BASE}/compras/${id}`, purchase);
  }

  // ---------------------------------------------------------------------
  // Financeiro
  // ---------------------------------------------------------------------

  getPayables(): Observable<AccountsPayableTitle[]> {
    return this.http.get<AccountsPayableTitle[]>(`${BASE}/financeiro/contas-a-pagar`);
  }

  addPayable(item: Partial<AccountsPayableTitle>): Observable<AccountsPayableTitle> {
    return this.http.post<AccountsPayableTitle>(`${BASE}/financeiro/contas-a-pagar`, item);
  }

  /** Corrige uma despesa/equipamento lançado (descrição, fornecedor, valor, vencimento, categoria). */
  updatePayable(
    id: string,
    changes: {
      supplier?: string;
      description?: string;
      amount?: number;
      dueDate?: string;
      issueDate?: string;
      category?: 'equipamento' | 'outros';
      /** Só para conta já paga: corrige a data em que foi paga. */
      paidDate?: string;
    },
  ): Observable<AccountsPayableTitle> {
    return this.http.put<AccountsPayableTitle>(`${BASE}/financeiro/contas-a-pagar/${id}`, changes);
  }

  /** Corrige um título a receber em aberto (título de venda só muda o vencimento). */
  updateReceivable(
    id: string,
    changes: { clientOrOrigin?: string; subCategory?: string; grossAmount?: number; dueDate?: string },
  ): Observable<AccountsReceivableTitle> {
    return this.http.put<AccountsReceivableTitle>(`${BASE}/financeiro/clientes-a-receber/${id}`, changes);
  }

  deleteReceivable(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/financeiro/clientes-a-receber/${id}`);
  }

  updateContribution(id: string, request: { description: string; source?: string; amount: number; date?: string }): Observable<CapitalContribution> {
    return this.http.put<CapitalContribution>(`${BASE}/financeiro/aportes/${id}`, request);
  }

  /** Apaga uma despesa/equipamento lançado por engano (compras de mercadoria não). */
  deletePayable(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/financeiro/contas-a-pagar/${id}`);
  }

  /** Reclassifica um lançamento: 'equipamento' (fora do resultado) ou 'outros' (despesa geral). */
  changePayableCategory(id: string, category: 'equipamento' | 'outros'): Observable<AccountsPayableTitle> {
    return this.http.put<AccountsPayableTitle>(`${BASE}/financeiro/contas-a-pagar/${id}/categoria`, { category });
  }

  settlePayable(id: string, bankAccount: string, paymentMode: string): Observable<AccountsPayableTitle | null> {
    return this.http
      .post<AccountsPayableTitle>(`${BASE}/financeiro/contas-a-pagar/${id}/baixar`, { bankAccount, paymentMode })
      .pipe(catchError(() => of(null)));
  }

  getReceivables(): Observable<AccountsReceivableTitle[]> {
    return this.http.get<AccountsReceivableTitle[]>(`${BASE}/financeiro/clientes-a-receber`);
  }

  addReceivable(item: Partial<AccountsReceivableTitle>): Observable<AccountsReceivableTitle> {
    return this.http.post<AccountsReceivableTitle>(`${BASE}/financeiro/clientes-a-receber`, item);
  }

  settleReceivable(id: string): Observable<AccountsReceivableTitle | null> {
    return this.http
      .post<AccountsReceivableTitle>(`${BASE}/financeiro/clientes-a-receber/${id}/liquidar`, {})
      .pipe(catchError(() => of(null)));
  }

  getCardSettlements(): Observable<CardSettlementTitle[]> {
    return this.http.get<CardSettlementTitle[]>(`${BASE}/financeiro/liquidacoes-cartao`);
  }

  anticipateCardTitle(id: string): Observable<void> {
    return this.http.post<void>(`${BASE}/financeiro/liquidacoes-cartao/${id}/antecipar`, {});
  }

  /** Situação financeira do período (entradas, vendas, custo, lucro, despesas). Sem datas: mês atual. */
  getFinancialSummary(from?: string, to?: string): Observable<FinancialSummary> {
    const params: Record<string, string> = {};
    if (from) params['de'] = from;
    if (to) params['ate'] = to;
    return this.http.get<FinancialSummary>(`${BASE}/financeiro/resultado`, { params });
  }

  /** Histórico de vendas do PDV com itens e preços (inclui canceladas). */
  getSalesHistory(): Observable<SaleHistory[]> {
    return this.http.get<SaleHistory[]>(`${BASE}/vendas`);
  }

  /** Cancela (estorna) uma venda: devolve o estoque e remove o título a receber. */
  cancelSale(saleId: string, reason: string): Observable<CancelSaleResult> {
    return this.http.post<CancelSaleResult>(`${BASE}/vendas/${saleId}/cancelar`, { reason });
  }

  getSales(): Observable<SaleRecord[]> {
    return this.http.get<SaleRecord[]>(`${BASE}/financeiro/vendas`);
  }

  // ---------------------------------------------------------------------
  // Configurações
  // ---------------------------------------------------------------------

  getFees(): Observable<PaymentFeeSetting[]> {
    return this.http.get<PaymentFeeSetting[]>(`${BASE}/configuracoes/taxas`);
  }

  updateFee(id: string, feePercent: number, active: boolean): Observable<PaymentFeeSetting> {
    return this.http.patch<PaymentFeeSetting>(`${BASE}/configuracoes/taxas/${id}`, { feePercent, active });
  }

  saveFee(fee: Partial<PaymentFeeSetting> & { id: string }): Observable<PaymentFeeSetting> {
    return this.http.patch<PaymentFeeSetting>(`${BASE}/configuracoes/taxas/${fee.id}`, fee);
  }

  deleteFee(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/configuracoes/taxas/${id}`);
  }

  addFee(fee: Omit<PaymentFeeSetting, 'id'>): Observable<PaymentFeeSetting> {
    return this.http.post<PaymentFeeSetting>(`${BASE}/configuracoes/taxas`, fee);
  }

  /** Salva a ordem das taxas; o backend devolve a lista já ordenada. */
  reorderFees(ids: string[]): Observable<PaymentFeeSetting[]> {
    return this.http.put<PaymentFeeSetting[]>(`${BASE}/configuracoes/taxas/ordem`, { ids });
  }

  getAlertConfig(): Observable<GlobalAlertSetting> {
    return this.http.get<GlobalAlertSetting>(`${BASE}/configuracoes/alertas-sanitarios`);
  }

  updateAlertConfig(config: GlobalAlertSetting): Observable<void> {
    return this.http.put<void>(`${BASE}/configuracoes/alertas-sanitarios`, config);
  }

  // ---------------------------------------------------------------------
  // PDV
  // ---------------------------------------------------------------------

  processPosSale(sale: {
    total: number;
    paymentMode: string;
    cardFlag?: string;
    clientId?: string;
    clientName?: string;
    dueDate?: string;
    feeAmount: number;
    netAmount: number;
    items: { name: string; qty: number; unit: string; price: number; productId?: string; kitId?: string; stockBatchId?: string }[];
  }): Observable<{ saleId: string; receiptNumber: string }> {
    return this.http.post<{ saleId: string; receiptNumber: string }>(`${BASE}/pdv/finalizar-venda`, sale);
  }

  // ---------------------------------------------------------------------
  // Clientes
  // ---------------------------------------------------------------------

  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(`${BASE}/clientes`);
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/clientes/${id}`);
  }

  saveClient(client: Partial<Client>): Observable<Client> {
    return client.id
      ? this.http.put<Client>(`${BASE}/clientes/${client.id}`, client)
      : this.http.post<Client>(`${BASE}/clientes`, client);
  }

  // ---------------------------------------------------------------------
  // Auditoria
  // ---------------------------------------------------------------------

  getAuditLog(): Observable<AuditLogEntry[]> {
    return this.http.get<AuditLogEntry[]>(`${BASE}/auditoria`);
  }
}
