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
}

export interface StockMovement {
  id: string;
  timestamp: string;
  type: 'entrada' | 'baixa_pdv' | 'perda_quebra';
  title: string;
  docInfo: string;
  amountKg: number;
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
  price: number;
  unit: string;
  description: string;
  quantity: number;
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
