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
  name: string;
  code: string;
  quantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
  expiryDate: string;
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
  ownerName: string; // Responsável / Administrador
  email: string;
  password?: string;
  phone: string;
  segment: string;
  city: string;
  state: string;
  createdAt: string;
  active: boolean;
  branchesCount: number;
  plan: 'free_trial' | 'pro' | 'enterprise';
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'gerente' | 'operador';
  };
  company: CompanyTenant;
  token: string;
  loggedInAt: string;
}
