export type NavigationTab =
  | 'dashboard'
  | 'produtos'
  | 'kits'
  | 'estoque'
  | 'compras'
  | 'vendas'
  | 'financeiro'
  | 'contas-pagar'
  | 'clientes-receber'
  | 'clientes'
  | 'relatorios'
  | 'configuracoes';

export interface ProductItem {
  id: string;
  sku: string;
  code: string;
  ean: string;
  name: string;
  category: string;
  unit: 'kg' | 'un' | 'pct' | 'cx';
  stock: number;
  minStock: number;
  costPrice: number;
  sellingPrice: number;
  isPerishable: boolean;
  alertDays: number;
  storageTemp: string;
  nearestExpiry: string;
  expiryDaysRemaining: number;
  expiryStatus: 'vencido' | 'critico' | 'normal' | 'longo';
  lotNumber: string;
  supplier: string;
  imageUrl: string;
  subLocation?: string;
  isPromo?: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

export interface KitComponent {
  productId: string;
  name: string;
  code: string;
  lotNumber: string;
  quantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
  availableStock: number;
}

export interface BarbecueKit {
  id: string;
  code: string;
  name: string;
  tag: string;
  serveLabel: string;
  description: string;
  suggestedPrice: number;
  costPrice: number;
  marginPercent: number;
  totalWeightKg: number;
  imageUrl: string;
  componentsSummary: string;
  components: KitComponent[];
  stockAvailable: number;
  stockStatus: 'amplo' | 'disponivel' | 'alerta';
  barcodeEan: string;
}

export interface StockBatch {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  lotNumber: string;
  availableKg: number;
  entryDate: string;
  expiryDate: string;
  daysRemaining: number;
  fiscalDoc: string;
  supplier: string;
  status: 'urgente' | 'regular' | 'novo' | 'vencido';
  /** Unidade do produto (kg, pct, un...); availableKg está nessa unidade. */
  unit: string;
}

export interface StockMovement {
  id: string;
  timestamp: string;
  type: 'entrada' | 'baixa_pdv' | 'perda_quebra';
  title: string;
  docInfo: string;
  /** Quantidade na unidade em `unit` (o nome é histórico). Negativo = saída. */
  amountKg: number;
  unit: string;
  description: string;
  badgeLabel: string;
  auditLink: string;
}

export interface PurchaseItem {
  id: string;
  /** Produto do catálogo ao qual esta entrada soma estoque automaticamente. Sem isso, o item não baixa/soma estoque. */
  productId?: string;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
  /** Nulo quando o item não tem validade informada (ex.: produto não perecível). */
  expiryDate: string | null;
  lotNumber: string;
  isPerishable: boolean;
}

export interface PurchaseEntry {
  id: string;
  orderCode: string;
  nfeNumber: string;
  nfeSeries: string;
  entryDate: string;
  entryTime: string;
  supplierName: string;
  supplierCnpj: string;
  supplierCity: string;
  supplierSif: string;
  itemsCount: number;
  totalWeightKg: number;
  totalAmount: number;
  shippingCost: number;
  paymentCondition: string;
  paymentStatus: 'pago' | 'pendente';
  paymentMode: 'pix' | 'dinheiro' | 'cartao' | 'a_prazo';
  items: PurchaseItem[];
}

/** Corpo de POST/PUT de compras: igual a PurchaseEntry, mas os itens não levam `id` (gerado pela API). */
export type SavePurchasePayload = Omit<Partial<PurchaseEntry>, 'items'> & {
  items: Omit<PurchaseItem, 'id'>[];
};

export interface AccountsPayableTitle {
  id: string;
  supplier: string;
  description: string;
  nfeReference: string;
  issueDate: string;
  dueDate: string;
  dueLabel: string;
  amount: number;
  paymentMethod: string;
  origin: string;
  status: 'vencido' | 'a_vencer' | 'pago';
  paidDate?: string;
  receiptAttached?: boolean;
  /** "compras" (automática, do Módulo Compras) | "equipamento" | "investimento" | "outros". */
  category: 'compras' | 'equipamento' | 'investimento' | 'outros';
}

export interface AccountsReceivableTitle {
  id: string;
  clientOrOrigin: string;
  subCategory: string;
  reference: string;
  dueDate: string;
  dueLabel: string;
  grossAmount: number;
  feeRetention: number;
  netAmount: number;
  status: 'vencido' | 'a_vencer' | 'recebido';
  type: 'b2b' | 'adquirente' | 'evento';
  paymentModeDesc: string;
  receivedDate?: string;
}

export interface PaymentFeeSetting {
  id: string;
  method: string;
  subtitle: string;
  channel: string;
  feePercent: number;
  fixedFee?: number;
  settlementTerm: string;
  active: boolean;
  icon: string;
  /** Posição na lista de Configurações e nos cards do PDV (definida pelo backend). */
  sortOrder?: number;
}

export interface GlobalAlertSetting {
  alertLeadDays: number;
  morningSummaryTime: string;
  notifyTopbar: boolean;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
  recipients: string[];
}

export interface CartItem {
  id: string;
  kind: 'produto' | 'kit';
  name: string;
  /** Preço unitário cobrado nesta venda (pode ser alterado na tela por quem tem permissão). */
  price: number;
  /** Preço do cadastro (produto: preço de venda; kit: preço sugerido), para destacar quando foi alterado. */
  catalogPrice: number;
  unit: string;
  description: string;
  quantity: number;
}

/** Item de uma venda do PDV. priceKnown=false em vendas antigas (preço por item não foi guardado). */
export interface SaleHistoryItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  priceKnown: boolean;
  /** Custo médio unitário do estoque no momento da venda. */
  unitCost: number;
  totalCost: number;
  /** true em vendas antigas: custo estimado pelo custo médio atual do produto. */
  costEstimated: boolean;
}

/** Venda do PDV no histórico (inclui as canceladas). */
export interface SaleHistory {
  id: string;
  saleId: string;
  receiptNumber: string;
  timestamp: string;
  total: number;
  netAmount: number;
  feeAmount: number;
  discountAmount: number;
  paymentMode: string;
  cardFlag?: string | null;
  clientName?: string | null;
  soldBy: string;
  status: 'concluida' | 'cancelada';
  canceledAt?: string | null;
  canceledBy?: string | null;
  cancelReason?: string | null;
  /** Custo das mercadorias vendidas. */
  costTotal: number;
  /** Lucro bruto da venda: líquido recebido − custo. */
  profit: number;
  items: SaleHistoryItem[];
}

export interface SupplierSpend {
  supplier: string;
  orders: number;
  amount: number;
}

export interface ProductProfit {
  name: string;
  unit: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
  hasEstimatedCost: boolean;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
}

/** Situação financeira de um período: entradas (compras), vendas, custo, lucro, despesas e resultado. */
export interface FinancialSummary {
  from: string;
  to: string;
  purchaseCount: number;
  purchasesTotal: number;
  purchasesPaid: number;
  purchasesPending: number;
  purchasesShipping: number;
  topSuppliers: SupplierSpend[];
  salesCount: number;
  canceledSalesCount: number;
  grossRevenue: number;
  discounts: number;
  fees: number;
  netRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  payroll: number;
  netResult: number;
  capitalExpenses: number;
  expenses: ExpenseCategory[];
  stockValue: number;
  productProfits: ProductProfit[];
  estimatedCostItems: number;
}

export interface CancelSaleResult {
  sale: SaleHistory;
  /** Aviso quando algo não pôde ser desfeito (ex.: item antigo sem vínculo com o cadastro). */
  notice?: string | null;
}

export interface TenantBranch {
  id: string;
  name: string;
  location: string;
  cnpj: string;
  operatorsCount: number;
  active: boolean;
  type: 'matriz' | 'filial' | 'cd';
}

export interface ApiLog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  statusCode: number;
  durationMs: number;
  requestPayload?: any;
  responsePayload?: any;
}

export interface Client {
  id: string;
  name: string;
  document: string;
  phone: string;
  email?: string;
  type: 'pf' | 'pj';
  fidelityPoints: number;
  creditLimit: number;
  totalSpent: number;
  favoriteCuts: string;
  notes?: string;
}

export interface CardSettlementTitle {
  id: string;
  acquirer: string;
  cardBrand: string;
  saleDate: string;
  settlementDate: string;
  grossAmount: number;
  mdrFeeAmount: number;
  netAmount: number;
  status: 'a_liquidar' | 'liquidado' | 'antecipado';
  anticipatedFee?: number;
}

export interface CompanyTenant {
  id: string;
  corporateName: string; // Razão Social
  tradeName: string; // Nome Fantasia
  document: string; // CNPJ / CPF
  ownerId: string; // vincula ao Administrator dono desta empresa
  ownerName: string; // Responsável / Administrador (denormalizado para exibição)
  phone: string;
  segment: string;
  city: string;
  state: string;
  createdAt: string;
  active: boolean;
  branchesCount: number;
  plan: 'free_trial' | 'pro' | 'enterprise';
}

/**
 * Dono/administrador do grupo. Um Administrator pode ter N empresas
 * (CompanyTenant.ownerId); toda empresa precisa de exatamente um dono.
 */
export interface Administrator {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: string;
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'gerente' | 'operador';
    employeeId?: string;
    /** Permissões do usuário (dono: todas). Use AppStateService.can(). */
    permissions: string[];
  };
  company: CompanyTenant;
  token: string;
  loggedInAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'gerente' | 'operador';
  active: boolean;
  createdAt: string;
  /** Salário mensal — somado automaticamente ao fechamento mensal (Financeiro &amp; DRE &gt; Visão Mensal). */
  salary: number;
  /** Permissões granulares do funcionário (ver PERMISSION). Só o dono as define. */
  permissions: string[];
}

/** Permissão configurável por funcionário, vinda do catálogo da API. */
export interface PermissionInfo {
  key: string;
  label: string;
  description: string;
  /** Tela/módulo a que a permissão pertence (agrupa a lista no cadastro de funcionários). */
  group: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'gerente' | 'operador';
  companyId: string;
  action: 'criou' | 'editou' | 'excluiu' | 'vendeu' | 'baixou' | 'recebeu' | 'antecipou' | 'liquidou';
  entityType: string;
  entityLabel: string;
  details?: string;
}

export interface SaleRecord {
  id: string;
  saleId: string;
  timestamp: string;
  total: number;
  netAmount: number;
  feeAmount: number;
  paymentMode: string;
  clientName?: string;
  soldBy: string;
}

/** Arquivo enviado ao storage (Cloudflare R2) via POST /arquivos. `url` é a URL pública para gravar em imageUrl etc. */
export interface UploadedFile {
  key: string;
  url: string;
  contentType: string;
  size: number;
}
