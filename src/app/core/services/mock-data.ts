import { Service } from '@angular/core';
import { Subject } from 'rxjs';
import {
  ProductItem,
  BarbecueKit,
  StockBatch,
  StockMovement,
  PurchaseEntry,
  AccountsPayableTitle,
  AccountsReceivableTitle,
  PaymentFeeSetting,
  GlobalAlertSetting,
  TenantBranch,
  ApiLog,
  Client,
  CardSettlementTitle,
  CompanyTenant,
  AuthSession,
} from '../models/models';

const STORAGE_PREFIX = 'girus_';

// Multi-Tenant Companies for GIRUS ERP
const INITIAL_COMPANIES: CompanyTenant[] = [
  {
    id: 'comp-001',
    corporateName: 'M&C Frig Distribuição de Carnes Ltda',
    tradeName: 'M&C Frig Carnes Nobres',
    document: '12.345.678/0001-90',
    ownerName: 'Ítalo Silva',
    email: 'italodasilvaa@gmail.com',
    password: '123',
    phone: '(11) 98765-4321',
    segment: 'Açougue Boutique & Kits de Churrasco',
    city: 'São Paulo',
    state: 'SP',
    createdAt: '2025-01-10',
    active: true,
    branchesCount: 3,
    plan: 'enterprise',
  },
  {
    id: 'comp-002',
    corporateName: 'Angus Prime Cortes Especiais EIRELI',
    tradeName: 'Angus Prime Steakhouse & Boutique',
    document: '28.910.441/0001-30',
    ownerName: 'Roberto Mendonça',
    email: 'contato@angusprime.com.br',
    password: '123',
    phone: '(19) 99122-3344',
    segment: 'Casa de Carnes & Cortes Nobres',
    city: 'Campinas',
    state: 'SP',
    createdAt: '2025-03-15',
    active: true,
    branchesCount: 1,
    plan: 'pro',
  },
  {
    id: 'comp-003',
    corporateName: 'Frigorífico e Abatedouro Braseiro do Sul S/A',
    tradeName: 'Frigorífico Braseiro do Sul',
    document: '45.890.112/0001-88',
    ownerName: 'Mariana Duarte',
    email: 'diretoria@braseirodosul.com.br',
    password: '123',
    phone: '(16) 98111-2233',
    segment: 'Frigorífico & Distribuidora B2B',
    city: 'Ribeirão Preto',
    state: 'SP',
    createdAt: '2025-05-20',
    active: true,
    branchesCount: 2,
    plan: 'enterprise',
  },
];

const INITIAL_BRANCHES: TenantBranch[] = [
  {
    id: '0001',
    name: 'M&C Frig - Matriz São Paulo (Moema)',
    location: 'Moema - São Paulo / SP',
    cnpj: '12.345.678/0001-90',
    operatorsCount: 14,
    active: true,
    type: 'matriz',
  },
  {
    id: '0002',
    name: 'M&C Frig - Filial Campinas (Cambuí)',
    location: 'Cambuí - Campinas / SP',
    cnpj: '12.345.678/0002-71',
    operatorsCount: 8,
    active: true,
    type: 'filial',
  },
  {
    id: '0003',
    name: 'M&C Frig - CD & Desossa (Jundiaí)',
    location: 'Distrito Industrial - Jundiaí / SP',
    cnpj: '12.345.678/0003-52',
    operatorsCount: 22,
    active: true,
    type: 'cd',
  },
];

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-008',
    sku: 'CAR-008',
    code: '#CAR-008',
    ean: '7898912300084',
    name: 'Fraldinha Grill Especial',
    category: 'Carnes Bovinas',
    unit: 'kg',
    stock: 8.2,
    minStock: 15.0,
    costPrice: 38.9,
    sellingPrice: 59.9,
    isPerishable: true,
    alertDays: 3,
    storageTemp: '-2°C a 2°C',
    nearestExpiry: '2025-11-10',
    expiryDaysRemaining: -2,
    expiryStatus: 'vencido',
    lotNumber: 'LT-402',
    supplier: 'Minerva Foods S.A.',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCzVJBkspj_E3viY93r9g-z8TV9pUomu7sxDQBSr89QgwikYr6obynP4ifkt6r-XOtqzKWbpWC5kxldrlXi41cSTZNm8AzUpFhO6d0eudNYYOqajS3Dl55_1tGoIdlwvkPGb2d4dfzNcRysC91UYZNX_VNZnVGNRr1wOruS4SQkXTSsHOoqIlOd-DHKTxUiIOqASxPBoy6RjHB-zzejWByEKLuT38O_8UImJ7af07v-9TexUa_h8jncXw',
    subLocation: 'Câmara #1',
  },
  {
    id: 'prod-001',
    sku: 'CAR-001',
    code: '#CAR-001',
    ean: '7898912300015',
    name: 'Picanha Angus Certificada',
    category: 'Carnes Bovinas',
    unit: 'kg',
    stock: 42.5,
    minStock: 25.0,
    costPrice: 74.5,
    sellingPrice: 119.9,
    isPerishable: true,
    alertDays: 3,
    storageTemp: '-2°C a 2°C',
    nearestExpiry: '2025-11-14',
    expiryDaysRemaining: 2,
    expiryStatus: 'critico',
    lotNumber: 'L-4429',
    supplier: 'Minerva Foods S.A.',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDA0RoBt_ZvZiaLFEHt0t-f2S0nOY52TolIqsFQdEZ_Rt9_bPxbLR0uyMWA2ss3knlG22hEykPPROlgAS0QTox1irct30fR2Z2fXxopKPl22Wl3OIsN2Ik8s4N5qH4QDMiRcyyFHrE2GTRYgcH27Wc0vOfKRQY3TfCjEH5MDbcKIs7QIG7RxIltA1XU8F9MHnMAgykQCTiFysVCUeeRnyGjy4RxjYCOdPUfAZVvwIBUiOCSRb8exe1oUg',
    subLocation: 'Câmara #1',
  },
  {
    id: 'prod-014',
    sku: 'CAR-014',
    code: '#CAR-014',
    ean: '7898912300145',
    name: 'Costela Gaúcha em Tiras',
    category: 'Carnes Bovinas',
    unit: 'kg',
    stock: 68.4,
    minStock: 30.0,
    costPrice: 29.2,
    sellingPrice: 44.9,
    isPerishable: true,
    alertDays: 4,
    storageTemp: '-2°C a 2°C',
    nearestExpiry: '2025-12-10',
    expiryDaysRemaining: 28,
    expiryStatus: 'normal',
    lotNumber: 'LT-882',
    supplier: 'JBS Carnes / Friboi',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCdeypULPa2nhwq_Ejlap5a6N0lfPjvJzkCEuKOhouzr3TlXB-umgxLezUM8NntxR2ld0Cklp7V6GEs1iI8tWXN8qDPkb3MkkJE1BBzItetMDOtVvnGZnEGUuZM0Yd6QyfoLU-b-cqzpdhyWnHQLz3ZtDUkDiaoyaeTOqGvFqLRc56jlOMWhbyNhj4il2jtAEpWy7kzwWjPrkBOhhZhTCd5O9mHey2gTJKp6mmHKmwQg4Act45LDcpwkQ',
    subLocation: 'Câmara #2',
  },
  {
    id: 'prod-022',
    sku: 'CAR-022',
    code: '#CAR-022',
    ean: '7898912300220',
    name: 'Alcatra com Maminha Bovina',
    category: 'Carnes Bovinas',
    unit: 'kg',
    stock: 34.1,
    minStock: 20.0,
    costPrice: 36.4,
    sellingPrice: 54.9,
    isPerishable: true,
    alertDays: 3,
    storageTemp: '-2°C a 2°C',
    nearestExpiry: '2025-12-01',
    expiryDaysRemaining: 19,
    expiryStatus: 'normal',
    lotNumber: 'LT-511',
    supplier: 'Minerva Foods S.A.',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuChnK6Ibx7UqzNhKau51s70qjAu22031l4ArXhLgKix8oranho-tg9hzoAT2nlPYxeJQDN_sfhH7MoWvUAWoJrCPa6-JXzCv5Flf9OoqNTYzlM4ubvov6fhg1kqjm_ZMDgqmofaZUurmzOMd_65X90fX0fjfbrZfz_N6YX-7EAcv788Jpyg_jwODFUFVJUqHle-PIKh0e0y1-bWQsqPjTYQcjN9nY-3k9hcR4WTuXJEC2fIGYpQo17rMQ',
    subLocation: 'Câmara #1',
  },
  {
    id: 'prod-003',
    sku: 'ACO-003',
    code: '#ACO-003',
    ean: '7898912300039',
    name: 'Pão de Alho Especial Cremoso 400g',
    category: 'Acompanhamentos',
    unit: 'pct',
    stock: 120,
    minStock: 40,
    costPrice: 9.8,
    sellingPrice: 17.9,
    isPerishable: true,
    alertDays: 5,
    storageTemp: '2°C a 6°C',
    nearestExpiry: '2025-12-27',
    expiryDaysRemaining: 45,
    expiryStatus: 'normal',
    lotNumber: 'PA-901',
    supplier: 'Produtor Artesanal',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCR7yQGx-CDY18ZyYiu0hldUJM5_Niz_jYZDJWxK6d6vubLXa00sSjpvcqXo9XdmTREPkfhejtf1Hhq_YMt0PUzJH_LTcHRIFAZCHPyqvtbsPIZR8jtZPmHlnkTPycJUhCRqQNg1YmGMcWoWzsiNI82GW5blgFA3H65AW3a0-3Q3XscK7JEHLtCNRDVcMjVMMRCXbBkuvvVLjHHqkeLNzMDXbjipww7x8OGtuFYkY2wpL0QijKi7KSkrw',
  },
  {
    id: 'prod-002',
    sku: 'TEM-002',
    code: '#TEM-002',
    ean: '7898912300992',
    name: 'Sal de Parrilla com Alho Frito 500g',
    category: 'Temperos & Sal',
    unit: 'un',
    stock: 85,
    minStock: 30,
    costPrice: 8.5,
    sellingPrice: 16.5,
    isPerishable: false,
    alertDays: 0,
    storageTemp: 'Ambiente Seco',
    nearestExpiry: '2026-11-12',
    expiryDaysRemaining: 365,
    expiryStatus: 'longo',
    lotNumber: 'SP-104',
    supplier: 'Distribuidora Santa Rita',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDfFKijOD3w8_Gkcova_zW2r2FAr93w3tTetR84_LpoNrhmjM6jITPSy5RkAsMdxOP-V0oeP8PfRzPNwYHm-GfvAtxRUgBegopfTxXdnWMqN06k61U08TgypJskUnxkQmlZj-ovxEwOvI26QWKwerhHzoaOpiWY7GcBC9IN9sfPGL8ovvCZviFlLL8jVCkNP6DAlhiO9m8U7AUNQnm21IJZ8R01uK_Khw6aZHaeoz28DGY0lHh5-Jk4QA',
  },
  {
    id: 'prod-009',
    sku: 'BV-8812',
    code: '#CAR-031',
    ean: '7898912300459',
    name: 'Bife Ancho Prime Maturado',
    category: 'Carnes Bovinas',
    unit: 'kg',
    stock: 12.2,
    minStock: 20.0,
    costPrice: 54.0,
    sellingPrice: 89.9,
    isPerishable: true,
    alertDays: 3,
    storageTemp: '-2°C a 2°C',
    nearestExpiry: '2025-11-18',
    expiryDaysRemaining: 6,
    expiryStatus: 'critico',
    lotNumber: 'LOT-9921',
    supplier: 'Minerva Foods S.A.',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBMKK9DVP4soglifZ5AmzsVn_rggEuE9Mgwv_uG7y6NUiZiA7rEL6PwJnpCPIqLToELN1KV6HWwXsBU7x6lJNIpgk8JxK42uEN_eBIFawHSxMDReb8baM9ZDc0GkDUaKTWCpOswcdAmUp35uK68tOvYxgRbfLtr4x0up25uj3YRJUQosS_fs-6juZ9BCkHo5sCEEhwM43wlztaYU-FQgrPzPtPX3X-mx7-EgXbjEEz-lrRaCX7EXhX7Ow',
    subLocation: 'Câmara #1',
  },
  {
    id: 'prod-010',
    sku: 'EMB-301',
    code: '#EMB-301',
    ean: '7898912300301',
    name: 'Linguiça Artesanal c/ Coalho',
    category: 'Linguiças & Embutidos',
    unit: 'kg',
    stock: 36.8,
    minStock: 15.0,
    costPrice: 18.0,
    sellingPrice: 34.9,
    isPerishable: true,
    alertDays: 4,
    storageTemp: '0°C a 4°C',
    nearestExpiry: '2025-11-22',
    expiryDaysRemaining: 10,
    expiryStatus: 'normal',
    lotNumber: 'L-55',
    supplier: 'Produção Própria Matriz',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBVL3mAdOo7wmPzuoekRS5BKoxSre0UC5LJfxqfM0gmL_VEWkQGzS_pTfg3CIO8DgLm8_flWr0NZWTDx885ukRWOKYENLQI899DFGVPBgs5J2RAi8aPrrO0Zs23ITRu3ZUkodT9mzPsr_-UYjgeYM7WfO32bautsMDwHA2cj9IgSQ7mmKa9B0maYM4fnq24zocYl-FpSSH8RL2LMi-orjGIsJJ86MaDJqBo3CZmgc0L4bE4LTv0NYa_Bw',
  },
  {
    id: 'prod-011',
    sku: 'SU-419',
    code: '#SU-419',
    ean: '7898912300419',
    name: 'Costelinha Suína Resfriada',
    category: 'Carnes Suínas',
    unit: 'kg',
    stock: 28.4,
    minStock: 20.0,
    costPrice: 16.5,
    sellingPrice: 29.9,
    isPerishable: true,
    alertDays: 3,
    storageTemp: '0°C a 2°C',
    nearestExpiry: '2025-11-15',
    expiryDaysRemaining: 3,
    expiryStatus: 'critico',
    lotNumber: 'LOT-9922',
    supplier: 'Frigorífico Aurora',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC54YeCBlcGt0s5zr-2Dpft05iloRV3REFml9w04d-68ZAC8r8rRBRzPQjgmrJXzSxWR3fwwlKpCXOi-NZ_g0sLzZDwuaFa81yuUe1ngJAZTkktzy7t6IVIRofIOedvlON0BCKhz2JpUbR0meKn1R9u29cZtzicKZlGM3EFfugT3uFipVR9ualHak17pznZuP-3kJvxxgWYAyvaiBYj0fIYEM_-PWJLQcVjmYYRWyh0swC_gGGWNnNwCQ',
  },
  {
    id: 'prod-012',
    sku: 'ACC-0021',
    code: '#ACC-0021',
    ean: '7898912300021',
    name: 'Carvão Ecológico 10kg',
    category: 'Acompanhamentos',
    unit: 'un',
    stock: 4,
    minStock: 20,
    costPrice: 14.0,
    sellingPrice: 28.0,
    isPerishable: false,
    alertDays: 0,
    storageTemp: 'Ambiente Seco',
    nearestExpiry: 'Indeterminado',
    expiryDaysRemaining: 999,
    expiryStatus: 'longo',
    lotNumber: 'SEM-LOTE',
    supplier: 'Distribuidora de Carvão e Lenha',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBC4QwGQ2rsybdaGSspqUbg2_e9YERnz-IO3TM0kduRNhtXn0vOb0bJTalLv5oBTiDEajeU3ILMspDdA8ELyBm4ZgFs6dxzOhNQmlohJRUB_a7WqBjRwzhkVo8Ho6umR7a2iKI12ykjz3TW2cyVThLHB--JE65IYT9aFmJxDyJxSL7rxg8bkFp3SHjEJHWOwAOLo1d6EreCJes1RYjtmY7pIhTK7LdN7GCrPsPbdj9yZYqI-Vj1sbWKbg',
  },
  {
    id: 'prod-013',
    sku: 'BEB-011',
    code: '#BEB-011',
    ean: '7898912300111',
    name: 'Cerveja Artesanal IPA 500ml',
    category: 'Acompanhamentos',
    unit: 'un',
    stock: 52,
    minStock: 24,
    costPrice: 8.2,
    sellingPrice: 14.5,
    isPerishable: true,
    alertDays: 15,
    storageTemp: '2°C a 6°C',
    nearestExpiry: '2026-03-20',
    expiryDaysRemaining: 120,
    expiryStatus: 'normal',
    lotNumber: 'IPA-88',
    supplier: 'Cervejaria Colorado / Artesanal',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCGsdvrVj93nh8BURKQDATt60SVZEw6kSPE0rAeli8b6cNtLhnYBSQX77CvL1qjZCmHUx0BclgKfoEJUusyPqpujPx8-ic0C5iyu6uOwkHeDspqqFmaf_9Wp4FVCZWf79LgM9M2W7bVMZIyaH5HqxWP9OBZEe_VQTweEGRuPgePkipVzGmNIpH8YKczKrNRT4XhtbYT1Cw8EJi6FCNrQvK-FZUjsFBlBaSx1RlYa5wWjzOHjb4Me-ylbQ',
  },
];

const INITIAL_KITS: BarbecueKit[] = [
  {
    id: 'kit-001',
    code: 'KIT-001',
    name: 'Kit Churrasco Premium Master',
    tag: 'Linha Reserva Master',
    serveLabel: 'Serve 10 a 12 pessoas',
    description: 'Seleção nobre com foco em cortes marmorizados e acompanhamentos completos.',
    suggestedPrice: 389.9,
    costPrice: 224.5,
    marginPercent: 42.4,
    totalWeightKg: 5.8,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDGBokc77SBjjjrjjrETTDfFEvztil4ouBgf7alpWUSoA6ORjtUexnbVTNM15nrO9zY00UrqjQ0fNSEyzG9TCT3j0u4--ucT-eKhuIl894nQLcXuQ6tLHQq6dYZMwzxR9T3PqC5pxhU2QrjDrzfZSdQ2pdsSRG67hFxutlZxii2ioK3WqCbVwCz2h_l4WkO38RZt0UHCMJIlvDX0CJQsx4tvwK2efJaG2GOAmGCZmya6ynu1oZCkqdh1w',
    componentsSummary:
      'Picanha Angus (1.5kg), Bife Ancho (1.2kg), Linguiça Artesanal (800g), Coração de Frango (500g), Pão de Alho 400g (1un), Queijo Coalho Espeto (1un), Farofa Artesanal 300g (1un), Sal Parrilla 500g (1un).',
    components: [
      {
        productId: 'prod-001',
        name: 'Picanha Angus Certificada',
        code: 'CAR-0104',
        lotNumber: '#4429',
        quantity: 1.5,
        unit: 'kg',
        unitCost: 82.0,
        subtotal: 123.0,
        availableStock: 42.5,
      },
      {
        productId: 'prod-009',
        name: 'Bife Ancho Prime Maturado',
        code: 'CAR-0219',
        lotNumber: '#4388',
        quantity: 1.2,
        unit: 'kg',
        unitCost: 39.5,
        subtotal: 47.4,
        availableStock: 28.0,
      },
      {
        productId: 'prod-010',
        name: 'Linguiça Artesanal c/ Coalho',
        code: 'EMB-0052',
        lotNumber: '#4501',
        quantity: 0.8,
        unit: 'kg',
        unitCost: 22.5,
        subtotal: 18.0,
        availableStock: 36.8,
      },
      {
        productId: 'prod-003',
        name: 'Pão de Alho Especial Cremoso',
        code: 'ACOM-0012',
        lotNumber: 'PA-901',
        quantity: 1.0,
        unit: 'un',
        unitCost: 8.0,
        subtotal: 8.0,
        availableStock: 120,
      },
    ],
    stockAvailable: 8,
    stockStatus: 'disponivel',
    barcodeEan: '7899458200019',
  },
  {
    id: 'kit-002',
    code: 'KIT-002',
    name: 'Kit Resenha dos Amigos',
    tag: 'Mais Vendido',
    serveLabel: 'Serve 6 a 8 pessoas',
    description: 'Excelente rendimento e custo-benefício para encontros descontraídos de fim de semana.',
    suggestedPrice: 249.0,
    costPrice: 142.3,
    marginPercent: 42.8,
    totalWeightKg: 3.8,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDwxhEle1N50W7dN6YWsZ-7XnClMK1SO9QbYzK-VlHJt-zOrdawJJJMg1jpuXC-ElXyf8r4UZqa0QTJMbpKloWVp9HvqjpnwEP-XomwKX2ZvnqXN1RL6nPHyMuEvtCw49JKsBU5DQLwaMZxgwO5FXS5yOiYWVOGLSFt7eL4EjkHjtBB_tJVgfW8ijOwPaR8g4ns12eQxDoH2BTv964PrZIsZorwGtnLhfH7mPpr_93YywqudACN9BNXYg',
    componentsSummary:
      'Fraldinha Grill (1.2kg), Costelinha Suína BBQ (1.0kg), Linguiça Toscana Especial (1.0kg), Pão de Alho Tradicional (400g), Farofa da Casa (250g).',
    components: [
      {
        productId: 'prod-008',
        name: 'Fraldinha Grill Especial',
        code: 'CAR-008',
        lotNumber: 'LT-402',
        quantity: 1.2,
        unit: 'kg',
        unitCost: 38.9,
        subtotal: 46.68,
        availableStock: 3.2,
      },
      {
        productId: 'prod-011',
        name: 'Costelinha Suína Resfriada',
        code: 'SU-419',
        lotNumber: 'LOT-9922',
        quantity: 1.0,
        unit: 'kg',
        unitCost: 16.5,
        subtotal: 16.5,
        availableStock: 28.4,
      },
      {
        productId: 'prod-010',
        name: 'Linguiça Artesanal c/ Coalho',
        code: 'EMB-301',
        lotNumber: 'L-55',
        quantity: 1.0,
        unit: 'kg',
        unitCost: 18.0,
        subtotal: 18.0,
        availableStock: 36.8,
      },
      {
        productId: 'prod-003',
        name: 'Pão de Alho Especial Cremoso',
        code: 'ACO-003',
        lotNumber: 'PA-901',
        quantity: 1.0,
        unit: 'un',
        unitCost: 9.8,
        subtotal: 9.8,
        availableStock: 120,
      },
    ],
    stockAvailable: 14,
    stockStatus: 'alerta',
    barcodeEan: '7899458200026',
  },
  {
    id: 'kit-003',
    code: 'KIT-003',
    name: 'Kit Família Picanha & Cia',
    tag: 'Mais Pedido Almoço',
    serveLabel: 'Serve 4 a 6 pessoas',
    description: 'Porcionamento ideal para almoço de domingo com foco na rainha do churrasco.',
    suggestedPrice: 199.9,
    costPrice: 112.0,
    marginPercent: 43.9,
    totalWeightKg: 2.3,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCQPlCBCox6ThEYlmOLviy6D8TsvtFyaL2NzxoD2VKDiKK_nN8AWw5digMIVsTnVxbDG1kImfYLdoYiUHzCAMM1plD2TZZOr8tru-dVD_HoIMbvHAx0zemXvkeC3bLjU-bx9MJFPZ_BY8NRubhbnLHjfQIYV1OuYOvra218vEdIeVcAWh6o_aRo44syCvADOoL_RpVG3_qfymPp_TSefbd_-0yEh3EEyqiS18NvUDGyu584HWpFN9DS3Q',
    componentsSummary:
      'Picanha Prime (1.0kg), Linguiça Cuiabana com Queijo (600g), Pão de Alho Especial (400g), Farofa Crocante de Cebola (300g).',
    components: [
      {
        productId: 'prod-001',
        name: 'Picanha Angus Certificada',
        code: 'CAR-001',
        lotNumber: 'L-4429',
        quantity: 1.0,
        unit: 'kg',
        unitCost: 74.5,
        subtotal: 74.5,
        availableStock: 42.5,
      },
      {
        productId: 'prod-010',
        name: 'Linguiça Artesanal c/ Coalho',
        code: 'EMB-301',
        lotNumber: 'L-55',
        quantity: 0.6,
        unit: 'kg',
        unitCost: 18.0,
        subtotal: 10.8,
        availableStock: 36.8,
      },
      {
        productId: 'prod-003',
        name: 'Pão de Alho Especial Cremoso',
        code: 'ACO-003',
        lotNumber: 'PA-901',
        quantity: 1.0,
        unit: 'un',
        unitCost: 9.8,
        subtotal: 9.8,
        availableStock: 120,
      },
    ],
    stockAvailable: 14,
    stockStatus: 'amplo',
    barcodeEan: '7899458200033',
  },
  {
    id: 'kit-004',
    code: 'KIT-004',
    name: 'Kit Ancho & Chorizo Gran Reserva',
    tag: 'Parrilla Gourmet',
    serveLabel: 'Serve 6 a 8 pessoas',
    description: 'Estilo porteño com cortes do contrafilé de altíssima maciez e chimichurri fresco.',
    suggestedPrice: 289.9,
    costPrice: 168.0,
    marginPercent: 42.0,
    totalWeightKg: 2.6,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAoQfZGxdB2Z0hQGvWHorZ667QqmuCCxdE4xkaTd8uEXHkc27G3zrVw88bw_Grk-lGLwOcQ-mfdDwR05-80cNSFQ4EchTe2clHCSk-TlgADpJygvhG4bWbjZtibsdV6xoN1SQ4Rtl46Si_pobwJfvQ1L8SRLGqdE23woxQkLpBEqOwXvrVVhdAJt5mBLAWafMIvMJNflb--JGe6cyZWmEtQH9-p5WvkFCmjrh4PQO-BmWxjBHpMOzoWSQ',
    componentsSummary:
      'Bife de Chorizo Angus (1.2kg), Ojo de Bife Ancho (1.0kg), Molho Chimichurri Fresco (200g), Sal Defumado de Parrilla (200g).',
    components: [
      {
        productId: 'prod-009',
        name: 'Bife Ancho Prime Maturado',
        code: 'BV-8812',
        lotNumber: 'LOT-9921',
        quantity: 1.2,
        unit: 'kg',
        unitCost: 54.0,
        subtotal: 64.8,
        availableStock: 12.2,
      },
      {
        productId: 'prod-022',
        name: 'Alcatra com Maminha Bovina',
        code: 'CAR-022',
        lotNumber: 'LT-511',
        quantity: 1.0,
        unit: 'kg',
        unitCost: 36.4,
        subtotal: 36.4,
        availableStock: 34.1,
      },
    ],
    stockAvailable: 9,
    stockStatus: 'amplo',
    barcodeEan: '7899458200040',
  },
];

const INITIAL_BATCHES: StockBatch[] = [
  {
    id: 'batch-1',
    productId: 'prod-001',
    productName: 'Picanha Angus Certificada',
    sku: 'BV-9942',
    lotNumber: 'L-4429',
    availableKg: 14.5,
    entryDate: '28/10/2025',
    expiryDate: '14/11/2025',
    daysRemaining: 2,
    fiscalDoc: 'NF #44892',
    supplier: 'Minerva Foods S/A',
    status: 'urgente',
  },
  {
    id: 'batch-2',
    productId: 'prod-001',
    productName: 'Picanha Angus Certificada',
    sku: 'BV-9942',
    lotNumber: 'L-4480',
    availableKg: 18.0,
    entryDate: '05/11/2025',
    expiryDate: '25/11/2025',
    daysRemaining: 13,
    fiscalDoc: 'NF #45012',
    supplier: 'Minerva Foods S/A',
    status: 'regular',
  },
  {
    id: 'batch-3',
    productId: 'prod-001',
    productName: 'Picanha Angus Certificada',
    sku: 'BV-9942',
    lotNumber: 'L-4510',
    availableKg: 10.0,
    entryDate: '10/11/2025',
    expiryDate: '10/12/2025',
    daysRemaining: 28,
    fiscalDoc: 'NF #45290',
    supplier: 'JBS Carnes & Derivados',
    status: 'novo',
  },
];

const INITIAL_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    timestamp: 'Hoje 08:15',
    type: 'entrada',
    title: 'Entrada de Matéria-Prima',
    docInfo: 'NF-e #44892 • Minerva Foods',
    amountKg: 150.0,
    description: 'Recebimento de carnes diversas resfriadas. Inspeção de temperatura: 1.4°C (Aprovado SISP).',
    badgeLabel: 'Doc: Danfe Concluído',
    auditLink: 'Auditar',
  },
  {
    id: 'mov-2',
    timestamp: 'Hoje 11:34',
    type: 'baixa_pdv',
    title: 'Baixa de Kit Churrasco Master',
    docInfo: 'Venda PDV #1094 • Caixa 02',
    amountKg: -3.5,
    description: 'Baixa fracionada via FEFO: -1.5kg Picanha Angus (#L-4429), -1.2kg Bife Ancho e -800g Linguiça Artesanal.',
    badgeLabel: 'PDV Integrado',
    auditLink: 'Ver Cupom',
  },
  {
    id: 'mov-3',
    timestamp: 'Ontem 18:20',
    type: 'perda_quebra',
    title: 'Perda por Vencimento (Descarte)',
    docInfo: 'Laudo Quebra #Q-0089',
    amountKg: -18.5,
    description: 'Lote #C-204 (Contrafilé Grill) descartado por expiração da data-limite de consumo. Termo de inutilização assinado.',
    badgeLabel: 'Quebra Registrada',
    auditLink: 'Laudo Técnico',
  },
];

const INITIAL_PURCHASES: PurchaseEntry[] = [
  {
    id: 'pur-089',
    orderCode: 'PED-2025-089',
    nfeNumber: 'NF-e 44892',
    nfeSeries: 'Série 1',
    entryDate: '12/11/2025',
    entryTime: '08:42',
    supplierName: 'Minerva Foods S.A.',
    supplierCnpj: '67.620.377/0001-47',
    supplierCity: 'Barretos / SP',
    supplierSif: 'SIF 421',
    itemsCount: 6,
    totalWeightKg: 420,
    totalAmount: 18940.0,
    shippingCost: 120.0,
    paymentCondition: 'Boleto 28 dias',
    paymentStatus: 'pendente',
    paymentMode: 'a_prazo',
    items: [
      {
        id: 'pi-1',
        name: 'Picanha Bovina Angus',
        code: 'CAR-0102',
        quantity: 50,
        unit: 'kg',
        unitCost: 58.9,
        subtotal: 2945.0,
        expiryDate: '2025-12-15',
        lotNumber: 'LOT-9921',
        isPerishable: true,
      },
      {
        id: 'pi-2',
        name: 'Costela Bovina Janela',
        code: 'CAR-0144',
        quantity: 80,
        unit: 'kg',
        unitCost: 28.5,
        subtotal: 2280.0,
        expiryDate: '2025-12-10',
        lotNumber: 'LOT-9922',
        isPerishable: true,
      },
      {
        id: 'pi-3',
        name: 'Carvão Vegetal 10kg',
        code: 'ACC-0021',
        quantity: 30,
        unit: 'sacos',
        unitCost: 14.0,
        subtotal: 420.0,
        expiryDate: '',
        lotNumber: 'Sem lote',
        isPerishable: false,
      },
    ],
  },
  {
    id: 'pur-084',
    orderCode: 'PED-2025-084',
    nfeNumber: 'NF-e 10294',
    nfeSeries: 'Série 2',
    entryDate: '10/11/2025',
    entryTime: '14:15',
    supplierName: 'Distribuidora Santa Rita',
    supplierCnpj: '03.184.992/0001-19',
    supplierCity: 'Campinas / SP',
    supplierSif: 'SIF 890',
    itemsCount: 12,
    totalWeightKg: 180,
    totalAmount: 6420.0,
    shippingCost: 60.0,
    paymentCondition: 'Pix à vista',
    paymentStatus: 'pago',
    paymentMode: 'pix',
    items: [],
  },
  {
    id: 'pur-079',
    orderCode: 'PED-2025-079',
    nfeNumber: 'NF-e 88123',
    nfeSeries: 'Série 1',
    entryDate: '06/11/2025',
    entryTime: '11:00',
    supplierName: 'Copagaz Distribuidora',
    supplierCnpj: '61.584.098/0002-88',
    supplierCity: 'São Paulo / SP',
    supplierSif: 'Não aplicável',
    itemsCount: 4,
    totalWeightKg: 0,
    totalAmount: 1850.0,
    shippingCost: 0,
    paymentCondition: '3x Parcelado',
    paymentStatus: 'pendente',
    paymentMode: 'a_prazo',
    items: [],
  },
];

const INITIAL_PAYABLES: AccountsPayableTitle[] = [
  {
    id: 'pay-1',
    supplier: 'Minerva Foods S.A.',
    description: 'Carga Bovina Frigorificada • NF-e 44892',
    nfeReference: 'NF-e 44892',
    issueDate: '08/10/2024',
    dueDate: '2024-10-16',
    dueLabel: 'Amanhã (16/10)',
    amount: 14500.0,
    paymentMethod: 'Boleto Bancário',
    origin: 'Módulo Compras',
    status: 'a_vencer',
  },
  {
    id: 'pay-2',
    supplier: 'Copagaz Distribuidora',
    description: 'Recarga Tanque GLP • Desossa Industrial',
    nfeReference: 'NF-e 88123',
    issueDate: '29/09/2024',
    dueDate: '2024-10-13',
    dueLabel: '13/10/2024',
    amount: 2450.0,
    paymentMethod: 'Boleto Bancário',
    origin: 'Despesa Fixa',
    status: 'vencido',
  },
  {
    id: 'pay-3',
    supplier: 'Enel Distribuidora',
    description: 'Energia Elétrica Câmaras Frias • Matriz',
    nfeReference: 'Conta 99210-4',
    issueDate: '01/10/2024',
    dueDate: '2024-10-27',
    dueLabel: '27/10/2024',
    amount: 8920.0,
    paymentMethod: 'Débito em Conta',
    origin: 'Despesa Fixa',
    status: 'a_vencer',
  },
  {
    id: 'pay-4',
    supplier: 'Distribuidora Santa Rita',
    description: 'Embalagens, Selagem e Sacos Vácuo • NF 1104',
    nfeReference: 'NF 1104',
    issueDate: '04/10/2024',
    dueDate: '2024-10-20',
    dueLabel: '20/10/2024',
    amount: 4440.0,
    paymentMethod: 'Pix Agendado',
    origin: 'Módulo Compras',
    status: 'a_vencer',
  },
  {
    id: 'pay-5',
    supplier: 'JBS Carnes',
    description: 'Picanha & Cortes Nobres Bife de Ancho • NF 98231',
    nfeReference: 'NF 98231',
    issueDate: '25/09/2024',
    dueDate: '2024-10-10',
    dueLabel: '10/10/2024',
    amount: 38600.0,
    paymentMethod: 'Transferência TED',
    origin: 'Módulo Compras',
    status: 'pago',
    paidDate: '10/10/2024',
    receiptAttached: true,
  },
];

const INITIAL_RECEIVABLES: AccountsReceivableTitle[] = [
  {
    id: 'rec-1',
    clientOrOrigin: 'Restaurante Fogo de Chão Moema',
    subCategory: 'B2B Food Service • Boleto 14 DDL',
    reference: 'Venda #1088',
    dueDate: '2024-11-08',
    dueLabel: 'Vencido há 4 dias',
    grossAmount: 1850.0,
    feeRetention: 0.0,
    netAmount: 1850.0,
    status: 'vencido',
    type: 'b2b',
    paymentModeDesc: 'Boleto Bancário (Itaú)',
  },
  {
    id: 'rec-2',
    clientOrOrigin: 'Cielo Adquirente - Lote Cartões PDV Balcão',
    subCategory: 'Crédito Rotativo à Vista & Parcelado',
    reference: 'Fechamento PDV 11/11',
    dueDate: '2024-11-15',
    dueLabel: 'Em 3 dias úteis',
    grossAmount: 14850.0,
    feeRetention: 386.1,
    netAmount: 14463.9,
    status: 'a_vencer',
    type: 'adquirente',
    paymentModeDesc: 'Cielo TED Automático',
  },
  {
    id: 'rec-3',
    clientOrOrigin: 'Churrasco Corporativo Stone Inc (Evento)',
    subCategory: 'Kit Prime 80 pessoas + Mão de Obra Mestre',
    reference: 'Contrato Buffet #44',
    dueDate: '2024-11-10',
    dueLabel: 'Liquidado via Pix',
    grossAmount: 9400.0,
    feeRetention: 0.0,
    netAmount: 9400.0,
    status: 'recebido',
    type: 'evento',
    paymentModeDesc: 'Pix Direto CNPJ',
  },
  {
    id: 'rec-4',
    clientOrOrigin: 'Steakhouse Prime 88 (B2B Quinzenal)',
    subCategory: 'Fornecimento Cortes Wagyu & Tomahawk',
    reference: 'Venda #1094',
    dueDate: '2024-11-19',
    dueLabel: 'Em 7 dias',
    grossAmount: 11956.0,
    feeRetention: 0.0,
    netAmount: 11956.0,
    status: 'a_vencer',
    type: 'b2b',
    paymentModeDesc: 'Boleto 21 DDL',
  },
  {
    id: 'rec-5',
    clientOrOrigin: 'Rede Cartão Master/Visa Balcão',
    subCategory: 'Lote Débito e Voucher Refeição',
    reference: 'Remessa #8921',
    dueDate: '2024-11-13',
    dueLabel: 'Amanhã (D+1)',
    grossAmount: 11956.1,
    feeRetention: 84.2,
    netAmount: 11871.9,
    status: 'a_vencer',
    type: 'adquirente',
    paymentModeDesc: 'Rede Conciliação',
  },
];

const INITIAL_FEES: PaymentFeeSetting[] = [
  {
    id: 'fee-pix',
    method: 'Pix / Transferência',
    subtitle: 'Chave Dinâmica & QR Code no PDV',
    channel: 'Banco Itaú S.A. (API Direta)',
    feePercent: 0.0,
    settlementTerm: 'Imediato (0 dias)',
    active: true,
    icon: 'qr_code_2',
  },
  {
    id: 'fee-cash',
    method: 'Dinheiro em Espécie',
    subtitle: 'Gaveta Balcão / Sangria Automática',
    channel: 'Físico (Caixa Interno)',
    feePercent: 0.0,
    settlementTerm: 'Imediato',
    active: true,
    icon: 'payments',
  },
  {
    id: 'fee-debito-vm',
    method: 'Cartão de Débito (Visa/Master)',
    subtitle: 'Balança PDV & Pinpad Integrado',
    channel: 'Rede Stone Pagamentos',
    feePercent: 1.2,
    settlementTerm: '1 dia útil (D+1)',
    active: true,
    icon: 'credit_card',
  },
  {
    id: 'fee-debito-elo',
    method: 'Cartão de Débito (Elo)',
    subtitle: 'TEF Multiloja Balcão',
    channel: 'Rede Stone Pagamentos',
    feePercent: 1.45,
    settlementTerm: '1 dia útil (D+1)',
    active: true,
    icon: 'credit_card',
  },
  {
    id: 'fee-credito-vista',
    method: 'Cartão de Crédito à Vista (Visa/Master)',
    subtitle: 'Rotativo sem parcelamento',
    channel: 'Cielo Soluções',
    feePercent: 2.8,
    settlementTerm: '30 dias (D+30)',
    active: true,
    icon: 'credit_card_heart',
  },
  {
    id: 'fee-credito-2-6',
    method: 'Cartão de Crédito 2x a 6x',
    subtitle: 'Parcelado Lojista (Kits & Grandes Pedidos)',
    channel: 'Cielo Soluções',
    feePercent: 3.9,
    settlementTerm: 'Fluxo 30 dias (Parcelado)',
    active: true,
    icon: 'receipt_long',
  },
  {
    id: 'fee-credito-7-12',
    method: 'Cartão de Crédito 7x a 12x',
    subtitle: 'Eventos corporativos e churrascos buffet',
    channel: 'Cielo Soluções',
    feePercent: 5.4,
    settlementTerm: 'Fluxo 30 dias (Parcelado)',
    active: true,
    icon: 'savings',
  },
  {
    id: 'fee-boleto-b2b',
    method: 'Faturamento B2B Boleto 28d',
    subtitle: 'Restaurantes, Hamburguerias & Casas de Carnes',
    channel: 'Itaú Cobrança Registrada',
    feePercent: 0.0,
    fixedFee: 2.5,
    settlementTerm: '28 dias (Faturamento)',
    active: true,
    icon: 'barcode_scanner',
  },
];

const INITIAL_ALERT_CONFIG: GlobalAlertSetting = {
  alertLeadDays: 3,
  morningSummaryTime: '07:30',
  notifyTopbar: true,
  notifyEmail: true,
  notifyWhatsapp: true,
  recipients: ['carlos.gerencia@mcfrig.com.br', '+55 (11) 98844-2190 (Comprador Frigorífico)'],
};

const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-001',
    name: 'Bruno Silva (Churrasqueiro VIP)',
    document: '329.112.448-12',
    phone: '(11) 98765-4321',
    email: 'bruno.churras@gmail.com',
    type: 'pf',
    fidelityPoints: 480,
    creditLimit: 0,
    totalSpent: 3420.5,
    favoriteCuts: 'Picanha Angus, Fraldinha Red',
    notes: 'Cliente de todo sábado, ponto da carne malpassado',
  },
  {
    id: 'cli-002',
    name: 'Restaurante & Espeto Braseiro',
    document: '12.456.789/0001-33',
    phone: '(11) 97123-8899',
    email: 'compras@braseiroespetos.com.br',
    type: 'pj',
    fidelityPoints: 1200,
    creditLimit: 25000,
    totalSpent: 42800.0,
    favoriteCuts: 'Contrafilé Porcionado, Fraldinha Grill',
    notes: 'Faturamento semanal toda terça-feira',
  },
  {
    id: 'cli-003',
    name: 'Churrascaria Fogo Nobre EIRELI',
    document: '24.891.002/0001-77',
    phone: '(11) 99234-5511',
    email: 'suprimentos@fogonobre.com.br',
    type: 'pj',
    fidelityPoints: 2850,
    creditLimit: 35000,
    totalSpent: 58900.0,
    favoriteCuts: 'Costela Janela, Cupim Grill, Alcatra Inteira',
    notes: 'Corte padronizado em peças de 2kg',
  },
  {
    id: 'cli-004',
    name: 'Dra. Patrícia Mendes',
    document: '218.455.901-09',
    phone: '(11) 99877-2211',
    email: 'patricia.mendes@uol.com.br',
    type: 'pf',
    fidelityPoints: 620,
    creditLimit: 0,
    totalSpent: 4150.0,
    favoriteCuts: 'Filé Mignon, Bife Ancho, Prime Rib Resfriado',
    notes: 'Embalagem a vácuo individual por bife',
  },
];

const INITIAL_CARD_SETTLEMENTS: CardSettlementTitle[] = [
  {
    id: 'card-001',
    acquirer: 'Stone Pagamentos',
    cardBrand: 'Mastercard Crédito à Vista',
    saleDate: '01/12/2025',
    settlementDate: '31/12/2025',
    grossAmount: 12840.0,
    mdrFeeAmount: 385.2,
    netAmount: 12454.8,
    status: 'a_liquidar',
    anticipatedFee: 0,
  },
  {
    id: 'card-002',
    acquirer: 'Rede / Itaú',
    cardBrand: 'Visa Crédito Parcelado (3x)',
    saleDate: '28/11/2025',
    settlementDate: '28/12/2025',
    grossAmount: 8920.0,
    mdrFeeAmount: 338.96,
    netAmount: 8581.04,
    status: 'a_liquidar',
    anticipatedFee: 0,
  },
  {
    id: 'card-003',
    acquirer: 'Cielo Soluções',
    cardBrand: 'Elo Crédito à Vista',
    saleDate: '15/11/2025',
    settlementDate: '15/12/2025',
    grossAmount: 4250.0,
    mdrFeeAmount: 178.5,
    netAmount: 4071.5,
    status: 'liquidado',
    anticipatedFee: 0,
  },
];

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
}

/**
 * Backend simulado (100% client-side): persiste em localStorage e registra
 * um log de "chamadas de API" simulado, consumido pelo console API do app.
 * Nenhuma requisição de rede real é feita aqui.
 */
@Service()
export class MockDataService {
  private inMemoryLogs: ApiLog[] = [];
  private simulatedLatencyMs = 35;

  private readonly changeSubject = new Subject<void>();
  readonly change$ = this.changeSubject.asObservable();

  private notifySubscribers(): void {
    this.changeSubject.next();
  }

  private recordApiLog(
    method: ApiLog['method'],
    endpoint: string,
    statusCode = 200,
    durationMs = 45,
    requestPayload?: any,
    responsePayload?: any,
  ): void {
    const log: ApiLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      method,
      endpoint,
      statusCode,
      durationMs: this.simulatedLatencyMs + Math.floor(Math.random() * 20),
      requestPayload,
      responsePayload,
    };
    this.inMemoryLogs = [log, ...this.inMemoryLogs.slice(0, 99)];
    this.notifySubscribers();
  }

  private addDays(from: Date, days: number): string {
    const d = new Date(from);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  /** Rótulo relativo em pt-BR para uma data de vencimento (ex: "Vence hoje", "Em 5 dias", "Vencido há 2 dias"). */
  private dueLabelFor(dueDateIso: string): string {
    const due = new Date(dueDateIso + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Vencido há ${Math.abs(diffDays)} dia${Math.abs(diffDays) === 1 ? '' : 's'}`;
    if (diffDays === 0) return 'Vence hoje';
    if (diffDays === 1) return 'Amanhã';
    return `Em ${diffDays} dias`;
  }

  // Products
  getProducts(): ProductItem[] {
    const items = loadFromStorage('products', INITIAL_PRODUCTS);
    this.recordApiLog('GET', '/api/v1/produtos', 200, 32, null, { count: items.length });
    return items;
  }

  saveProduct(product: Partial<ProductItem>): ProductItem {
    let list = this.getProducts();
    let saved: ProductItem;
    if (product.id && list.some((p) => p.id === product.id)) {
      list = list.map((p) => {
        if (p.id === product.id) {
          saved = { ...p, ...product } as ProductItem;
          return saved;
        }
        return p;
      });
      this.recordApiLog('PUT', `/api/v1/produtos/${product.id}`, 200, 48, product, saved!);
    } else {
      saved = {
        id: 'prod_' + Date.now(),
        sku: product.sku || 'CAR-' + Math.floor(100 + Math.random() * 900),
        code: '#' + (product.sku || 'CAR-' + Math.floor(100 + Math.random() * 900)),
        ean: product.ean || '7898912' + Math.floor(100000 + Math.random() * 900000),
        name: product.name || 'Novo Produto Frigorífico',
        category: product.category || 'Carnes Bovinas',
        unit: product.unit || 'kg',
        stock: product.stock || 0,
        minStock: product.minStock || 15,
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice || 0,
        isPerishable: product.isPerishable ?? true,
        alertDays: product.alertDays ?? 3,
        storageTemp: product.storageTemp || '-2°C a 2°C',
        nearestExpiry: product.nearestExpiry || '2025-12-15',
        expiryDaysRemaining: product.expiryDaysRemaining ?? 30,
        expiryStatus: product.expiryStatus || 'normal',
        lotNumber: product.lotNumber || 'LT-' + Math.floor(100 + Math.random() * 900),
        supplier: product.supplier || 'Minerva Foods S.A.',
        imageUrl:
          product.imageUrl ||
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDA0RoBt_ZvZiaLFEHt0t-f2S0nOY52TolIqsFQdEZ_Rt9_bPxbLR0uyMWA2ss3knlG22hEykPPROlgAS0QTox1irct30fR2Z2fXxopKPl22Wl3OIsN2Ik8s4N5qH4QDMiRcyyFHrE2GTRYgcH27Wc0vOfKRQY3TfCjEH5MDbcKIs7QIG7RxIltA1XU8F9MHnMAgykQCTiFysVCUeeRnyGjy4RxjYCOdPUfAZVvwIBUiOCSRb8exe1oUg',
      };
      list.unshift(saved);
      this.recordApiLog('POST', '/api/v1/produtos', 201, 55, product, saved);
    }
    saveToStorage('products', list);
    return saved!;
  }

  deleteProduct(id: string): void {
    const list = this.getProducts().filter((p) => p.id !== id);
    saveToStorage('products', list);
    this.recordApiLog('DELETE', `/api/v1/produtos/${id}`, 200, 28);
  }

  // Kits
  getKits(): BarbecueKit[] {
    const kits = loadFromStorage('kits', INITIAL_KITS);
    this.recordApiLog('GET', '/api/v1/kits-churrasco', 200, 30, null, { count: kits.length });
    return kits;
  }

  saveKit(kit: Partial<BarbecueKit>): BarbecueKit {
    let list = this.getKits();
    let saved: BarbecueKit;
    if (kit.id && list.some((k) => k.id === kit.id)) {
      list = list.map((k) => {
        if (k.id === kit.id) {
          saved = { ...k, ...kit } as BarbecueKit;
          return saved;
        }
        return k;
      });
      this.recordApiLog('PUT', `/api/v1/kits-churrasco/${kit.id}`, 200, 42, kit, saved!);
    } else {
      saved = {
        id: 'kit_' + Date.now(),
        code: 'KIT-00' + (list.length + 1),
        name: kit.name || 'Novo Kit de Churrasco',
        tag: kit.tag || 'Combo Especial',
        serveLabel: kit.serveLabel || 'Serve 6 a 8 pessoas',
        description: kit.description || 'Cortes selecionados para churrasco.',
        suggestedPrice: kit.suggestedPrice || 299.0,
        costPrice: kit.costPrice || 170.0,
        marginPercent: kit.marginPercent || 43.1,
        totalWeightKg: kit.totalWeightKg || 3.5,
        imageUrl:
          kit.imageUrl ||
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDGBokc77SBjjjrjjrETTDfFEvztil4ouBgf7alpWUSoA6ORjtUexnbVTNM15nrO9zY00UrqjQ0fNSEyzG9TCT3j0u4--ucT-eKhuIl894nQLcXuQ6tLHQq6dYZMwzxR9T3PqC5pxhU2QrjDrzfZSdQ2pdsSRG67hFxutlZxii2ioK3WqCbVwCz2h_l4WkO38RZt0UHCMJIlvDX0CJQsx4tvwK2efJaG2GOAmGCZmya6ynu1oZCkqdh1w',
        componentsSummary: kit.componentsSummary || 'Picanha Angus, Ancho, Pão de Alho.',
        components: kit.components || [],
        stockAvailable: kit.stockAvailable || 10,
        stockStatus: 'disponivel',
        barcodeEan: '78994582000' + Math.floor(10 + Math.random() * 90),
      };
      list.unshift(saved);
      this.recordApiLog('POST', '/api/v1/kits-churrasco', 201, 60, kit, saved);
    }
    saveToStorage('kits', list);
    return saved!;
  }

  // Stock Batches & Movements
  getBatches(): StockBatch[] {
    return loadFromStorage('batches', INITIAL_BATCHES);
  }

  getMovements(): StockMovement[] {
    return loadFromStorage('movements', INITIAL_MOVEMENTS);
  }

  // Purchases
  getPurchases(): PurchaseEntry[] {
    const items = loadFromStorage('purchases', INITIAL_PURCHASES);
    this.recordApiLog('GET', '/api/v1/compras', 200, 35, null, { count: items.length });
    return items;
  }

  savePurchase(purchase: Partial<PurchaseEntry>): PurchaseEntry {
    const list = this.getPurchases();
    const saved: PurchaseEntry = {
      id: 'pur_' + Date.now(),
      orderCode: 'PED-2025-0' + (90 + list.length),
      nfeNumber: purchase.nfeNumber || 'NF-e 000.' + Math.floor(10000 + Math.random() * 90000),
      nfeSeries: purchase.nfeSeries || 'Série 1',
      entryDate: purchase.entryDate || new Date().toLocaleDateString('pt-BR'),
      entryTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      supplierName: purchase.supplierName || 'Minerva Foods S.A.',
      supplierCnpj: purchase.supplierCnpj || '67.620.377/0001-47',
      supplierCity: purchase.supplierCity || 'Barretos / SP',
      supplierSif: purchase.supplierSif || 'SIF 421',
      itemsCount: purchase.itemsCount || 3,
      totalWeightKg: purchase.totalWeightKg || 160,
      totalAmount: purchase.totalAmount || 5765.0,
      shippingCost: purchase.shippingCost || 120.0,
      paymentCondition: purchase.paymentCondition || 'Boleto 30 dias',
      paymentStatus: 'pendente',
      paymentMode: purchase.paymentMode || 'a_prazo',
      items: purchase.items || [],
    };
    list.unshift(saved);
    saveToStorage('purchases', list);

    // Also automatically create a Contas a Pagar entry
    const payables = this.getPayables();
    const newPayable: AccountsPayableTitle = {
      id: 'pay_' + Date.now(),
      supplier: saved.supplierName,
      description: `Entrada NF-e ${saved.nfeNumber} (${saved.itemsCount} itens)`,
      nfeReference: saved.nfeNumber,
      issueDate: saved.entryDate,
      dueDate: '2025-12-12',
      dueLabel: 'Em 30 dias',
      amount: saved.totalAmount,
      paymentMethod: saved.paymentCondition,
      origin: 'Módulo Compras',
      status: 'a_vencer',
    };
    payables.unshift(newPayable);
    saveToStorage('payables', payables);

    this.recordApiLog('POST', '/api/v1/compras/entrada', 201, 75, purchase, {
      purchaseId: saved.id,
      payableId: newPayable.id,
    });
    return saved;
  }

  // Accounts Payable
  getPayables(): AccountsPayableTitle[] {
    const items = loadFromStorage('payables', INITIAL_PAYABLES);
    this.recordApiLog('GET', '/api/v1/financeiro/contas-a-pagar', 200, 25, null, { count: items.length });
    return items;
  }

  settlePayable(id: string, bankAccount: string, paymentMode: string): AccountsPayableTitle | null {
    let list = this.getPayables();
    let settled: AccountsPayableTitle | null = null;
    list = list.map((item) => {
      if (item.id === id) {
        settled = {
          ...item,
          status: 'pago',
          paidDate: new Date().toLocaleDateString('pt-BR'),
          dueLabel: `Pago em ${new Date().toLocaleDateString('pt-BR')}`,
          receiptAttached: true,
        };
        return settled;
      }
      return item;
    });
    if (settled) {
      saveToStorage('payables', list);
      this.recordApiLog('POST', `/api/v1/financeiro/contas-a-pagar/${id}/baixar`, 200, 45, { bankAccount, paymentMode }, settled);
    }
    return settled;
  }

  addPayable(item: Partial<AccountsPayableTitle>): AccountsPayableTitle {
    const list = this.getPayables();
    const newItem: AccountsPayableTitle = {
      id: 'pay_' + Date.now(),
      supplier: item.supplier || 'Fornecedor Avulso',
      description: item.description || 'Despesa Operacional',
      nfeReference: item.nfeReference || 'Doc ' + Math.floor(100 + Math.random() * 900),
      issueDate: item.issueDate || new Date().toLocaleDateString('pt-BR'),
      dueDate: item.dueDate || '2025-11-30',
      dueLabel: item.dueLabel || 'No Vencimento',
      amount: item.amount || 100,
      paymentMethod: item.paymentMethod || 'Boleto Bancário',
      origin: item.origin || 'Despesa Manual',
      status: 'a_vencer',
    };
    list.unshift(newItem);
    saveToStorage('payables', list);
    this.recordApiLog('POST', '/api/v1/financeiro/contas-a-pagar', 201, 50, item, newItem);
    return newItem;
  }

  // Accounts Receivable
  getReceivables(): AccountsReceivableTitle[] {
    const items = loadFromStorage('receivables', INITIAL_RECEIVABLES);
    this.recordApiLog('GET', '/api/v1/financeiro/clientes-a-receber', 200, 28, null, { count: items.length });
    return items;
  }

  settleReceivable(id: string): AccountsReceivableTitle | null {
    let list = this.getReceivables();
    let settled: AccountsReceivableTitle | null = null;
    list = list.map((item) => {
      if (item.id === id) {
        settled = {
          ...item,
          status: 'recebido',
          dueLabel: 'Recebido / Conciliado',
        };
        return settled;
      }
      return item;
    });
    if (settled) {
      saveToStorage('receivables', list);
      this.recordApiLog('POST', `/api/v1/financeiro/clientes-a-receber/${id}/liquidar`, 200, 40, null, settled);
    }
    return settled;
  }

  addReceivable(item: Partial<AccountsReceivableTitle>): AccountsReceivableTitle {
    const list = this.getReceivables();
    const gross = item.grossAmount || 0;
    const fee = item.feeRetention || 0;
    const net = gross - fee;

    const newItem: AccountsReceivableTitle = {
      id: 'rec_' + Date.now(),
      clientOrOrigin: item.clientOrOrigin || 'Cliente Avulso',
      subCategory: item.subCategory || 'Venda a Prazo',
      reference: item.reference || 'Ped #' + Math.floor(1000 + Math.random() * 9000),
      dueDate: item.dueDate || '2025-11-20',
      dueLabel: item.dueLabel || 'A Vencer',
      grossAmount: gross,
      feeRetention: fee,
      netAmount: net,
      status: item.status || 'a_vencer',
      type: item.type || 'b2b',
      paymentModeDesc: item.paymentModeDesc || 'Boleto / Pix',
    };
    list.unshift(newItem);
    saveToStorage('receivables', list);
    this.recordApiLog('POST', '/api/v1/financeiro/clientes-a-receber', 201, 48, item, newItem);
    return newItem;
  }

  // Fees & Settings
  getFees(): PaymentFeeSetting[] {
    return loadFromStorage('fees', INITIAL_FEES);
  }

  updateFee(id: string, feePercent: number, active: boolean): void {
    this.saveFee({ id, feePercent, active });
  }

  /** Atualiza qualquer combinação de campos de uma taxa de pagamento já existente (nome, canal, prazos, etc). */
  saveFee(fee: Partial<PaymentFeeSetting> & { id: string }): PaymentFeeSetting {
    let saved: PaymentFeeSetting | undefined;
    const list = this.getFees().map((f) => {
      if (f.id === fee.id) {
        saved = { ...f, ...fee };
        return saved;
      }
      return f;
    });
    saveToStorage('fees', list);
    this.recordApiLog('PATCH', `/api/v1/configuracoes/taxas/${fee.id}`, 200, 30, fee, saved);
    return saved!;
  }

  getAlertConfig(): GlobalAlertSetting {
    return loadFromStorage('alert_config', INITIAL_ALERT_CONFIG);
  }

  updateAlertConfig(config: GlobalAlertSetting): void {
    saveToStorage('alert_config', config);
    this.recordApiLog('PUT', '/api/v1/configuracoes/alertas-sanitarios', 200, 40, config);
  }

  // Finalize Sale (POS execution)
  processPosSale(sale: {
    total: number;
    paymentMode: string;
    cardFlag?: string;
    clientId?: string;
    clientName?: string;
    dueDate?: string;
    feeAmount: number;
    netAmount: number;
    items: { name: string; qty: number; unit: string; price: number }[];
  }): { saleId: string; receiptNumber: string } {
    const saleId = 'SALE-' + Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = 'NFCe-' + Math.floor(100000 + Math.random() * 900000);

    // Register movement
    const movements = this.getMovements();
    movements.unshift({
      id: 'mov_' + Date.now(),
      timestamp: 'Hoje ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'baixa_pdv',
      title: `Venda ${saleId} (${sale.paymentMode})`,
      docInfo: `Tíquete Balcão 01 • R$ ${sale.total.toFixed(2)}`,
      amountKg: -sale.items.reduce((acc, i) => acc + (i.unit === 'kg' ? i.qty : 0.5 * i.qty), 0),
      description: `Baixa realizada no PDV: ${sale.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}`,
      badgeLabel: 'PDV Finalizado',
      auditLink: 'Cupom SAT',
    });
    saveToStorage('movements', movements);

    // If payment was credit, create a receivable entry for D+30
    if (sale.paymentMode === 'credito_vista' || sale.paymentMode === 'parcelado') {
      const receivables = this.getReceivables();
      receivables.unshift({
        id: 'rec_' + Date.now(),
        clientOrOrigin: `Adquirente ${sale.cardFlag || 'Mastercard'} - PDV Balcão 01`,
        subCategory: 'Venda Crédito à Vista (TEF Balcão)',
        reference: saleId,
        dueDate: '2025-12-15',
        dueLabel: 'Em 30 dias',
        grossAmount: sale.total,
        feeRetention: sale.feeAmount,
        netAmount: sale.netAmount,
        status: 'a_vencer',
        type: 'adquirente',
        paymentModeDesc: `${sale.cardFlag || 'Mastercard'} D+30`,
      });
      saveToStorage('receivables', receivables);
    }

    // Venda a prazo: gera um título a receber vinculado ao cliente escolhido, para cobrança posterior
    if (sale.paymentMode === 'a_prazo') {
      const dueDate = sale.dueDate || this.addDays(new Date(), 30);
      const receivables = this.getReceivables();
      receivables.unshift({
        id: 'rec_' + Date.now(),
        clientOrOrigin: sale.clientName || 'Cliente Avulso (A Prazo)',
        subCategory: 'Venda a Prazo • PDV Balcão 01',
        reference: saleId,
        dueDate,
        dueLabel: this.dueLabelFor(dueDate),
        grossAmount: sale.total,
        feeRetention: 0,
        netAmount: sale.total,
        status: 'a_vencer',
        type: 'b2b',
        paymentModeDesc: 'Fiado / A Prazo (D+30)',
      });
      saveToStorage('receivables', receivables);

      if (sale.clientId) {
        const client = this.getClients().find((c) => c.id === sale.clientId);
        if (client) {
          this.saveClient({ id: client.id, totalSpent: client.totalSpent + sale.total });
        }
      }
    }

    this.recordApiLog('POST', '/api/v1/pdv/finalizar-venda', 200, 68, sale, { saleId, receiptNumber });
    return { saleId, receiptNumber };
  }

  // Clients
  getClients(): Client[] {
    const items = loadFromStorage('clients', INITIAL_CLIENTS);
    this.recordApiLog('GET', '/api/v1/clientes', 200, 25, null, { count: items.length });
    return items;
  }

  saveClient(client: Partial<Client>): Client {
    let list = this.getClients();
    let saved: Client;
    if (client.id && list.some((c) => c.id === client.id)) {
      list = list.map((c) => {
        if (c.id === client.id) {
          saved = { ...c, ...client } as Client;
          return saved;
        }
        return c;
      });
      this.recordApiLog('PUT', `/api/v1/clientes/${client.id}`, 200, 35, client, saved!);
    } else {
      saved = {
        id: 'cli_' + Date.now(),
        name: client.name || 'Novo Cliente',
        document: client.document || '000.000.000-00',
        phone: client.phone || '(11) 90000-0000',
        email: client.email || '',
        type: client.type || 'pf',
        fidelityPoints: client.fidelityPoints || 0,
        creditLimit: client.creditLimit || 0,
        totalSpent: client.totalSpent || 0,
        favoriteCuts: client.favoriteCuts || 'Cortes Variados',
        notes: client.notes || '',
      };
      list.unshift(saved);
      this.recordApiLog('POST', '/api/v1/clientes', 201, 40, client, saved);
    }
    saveToStorage('clients', list);
    return saved!;
  }

  // Card Settlements
  getCardSettlements(): CardSettlementTitle[] {
    const items = loadFromStorage('card_settlements', INITIAL_CARD_SETTLEMENTS);
    this.recordApiLog('GET', '/api/v1/financeiro/liquidacoes-cartao', 200, 30, null, { count: items.length });
    return items;
  }

  anticipateCardTitle(id: string): void {
    let list = this.getCardSettlements();
    list = list.map((item) => {
      if (item.id === id) {
        const fee = item.grossAmount * 0.025; // 2.5% adiantamento
        return {
          ...item,
          status: 'antecipado' as const,
          anticipatedFee: fee,
          netAmount: item.netAmount - fee,
          settlementDate: 'Hoje (Antecipado)',
        };
      }
      return item;
    });
    saveToStorage('card_settlements', list);
    this.recordApiLog('POST', `/api/v1/financeiro/liquidacoes-cartao/${id}/antecipar`, 200, 50, { fee: '2.5%' });
  }

  // Aliases for payables used in views
  markPayableAsPaid(id: string): void {
    this.settlePayable(id, 'Itaú Conta Movimento', 'Boleto / DDA');
  }

  createPayable(payable: any): any {
    return this.addPayable({
      supplier: payable.supplier || payable.supplierName || 'Fornecedor Operacional',
      description: payable.description || 'Despesa Lançada',
      nfeReference: payable.nfeReference || payable.docNumber || 'DOC-MANUAL',
      dueDate: payable.dueDate || new Date().toISOString().split('T')[0],
      amount: Number(payable.amount || payable.netAmount || payable.originalAmount || 0),
      paymentMethod: payable.paymentMethod || payable.category || 'Boleto / Transferência',
      origin: payable.origin || 'Despesa Fixa / Operação',
    });
  }

  // Latency & System Sync
  getLatency(): number {
    return this.simulatedLatencyMs;
  }

  setLatency(ms: number): void {
    this.simulatedLatencyMs = ms;
    this.recordApiLog('PATCH', '/api/v1/system/simulated-latency', 200, 10, { latencyMs: ms });
    this.notifySubscribers();
  }

  resetToDefaults(): void {
    localStorage.removeItem(STORAGE_PREFIX + 'products');
    localStorage.removeItem(STORAGE_PREFIX + 'kits');
    localStorage.removeItem(STORAGE_PREFIX + 'batches');
    localStorage.removeItem(STORAGE_PREFIX + 'movements');
    localStorage.removeItem(STORAGE_PREFIX + 'purchases');
    localStorage.removeItem(STORAGE_PREFIX + 'payables');
    localStorage.removeItem(STORAGE_PREFIX + 'receivables');
    localStorage.removeItem(STORAGE_PREFIX + 'clients');
    localStorage.removeItem(STORAGE_PREFIX + 'card_settlements');
    localStorage.removeItem(STORAGE_PREFIX + 'fees');
    localStorage.removeItem(STORAGE_PREFIX + 'alert_config');
    this.inMemoryLogs = [];
    this.recordApiLog('POST', '/api/v1/system/reset-demo-database', 200, 15);
    this.notifySubscribers();
  }

  // API logs
  getApiLogs(): ApiLog[] {
    return this.inMemoryLogs;
  }

  clearApiLogs(): void {
    this.inMemoryLogs = [];
    this.notifySubscribers();
  }

  getBranches(): TenantBranch[] {
    return INITIAL_BRANCHES;
  }

  // Multi-Tenant Companies & Authentication (Girus ERP)
  getCompanies(): CompanyTenant[] {
    return loadFromStorage<CompanyTenant[]>('companies', INITIAL_COMPANIES);
  }

  saveCompanies(companies: CompanyTenant[]): void {
    saveToStorage('companies', companies);
    this.notifySubscribers();
  }

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
  }): AuthSession {
    const companies = this.getCompanies();
    const newId = 'comp-' + String(Date.now()).slice(-6);
    const newCompany: CompanyTenant = {
      id: newId,
      corporateName: data.corporateName,
      tradeName: data.tradeName || data.corporateName,
      document: data.document,
      ownerName: data.ownerName,
      email: data.email,
      password: data.password || '123',
      phone: data.phone,
      segment: data.segment || 'Açougue Boutique',
      city: data.city || 'São Paulo',
      state: data.state || 'SP',
      createdAt: new Date().toISOString().split('T')[0],
      active: true,
      branchesCount: 1,
      plan: 'free_trial',
    };

    companies.unshift(newCompany);
    this.saveCompanies(companies);

    const session: AuthSession = {
      user: {
        id: 'usr-' + newId,
        name: data.ownerName,
        email: data.email,
        role: 'admin',
      },
      company: newCompany,
      token: 'girus_jwt_' + Math.random().toString(36).substring(2),
      loggedInAt: new Date().toISOString(),
    };

    this.setCurrentSession(session);
    this.recordApiLog('POST', '/api/v1/auth/register-company', 201, 35, { companyId: newId, email: data.email });
    return session;
  }

  login(email: string, password?: string): AuthSession | null {
    const companies = this.getCompanies();
    const cleanEmail = email.trim().toLowerCase();

    // Find matching company or first demo company if testing
    const found = companies.find((c) => c.email.toLowerCase() === cleanEmail) || companies[0];

    if (!found) return null;

    const session: AuthSession = {
      user: {
        id: 'usr-' + found.id,
        name: found.ownerName,
        email: found.email,
        role: 'admin',
      },
      company: found,
      token: 'girus_jwt_' + Math.random().toString(36).substring(2),
      loggedInAt: new Date().toISOString(),
    };

    this.setCurrentSession(session);
    this.recordApiLog('POST', '/api/v1/auth/login', 200, 25, { email: found.email, companyId: found.id });
    return session;
  }

  getCurrentSession(): AuthSession | null {
    const session = loadFromStorage<AuthSession | null>('current_session', null);
    if (session) return session;
    // Default initial session for immediate access with M&C Frig
    const defaultComp = INITIAL_COMPANIES[0];
    const initialSession: AuthSession = {
      user: {
        id: 'usr-001',
        name: defaultComp.ownerName,
        email: defaultComp.email,
        role: 'admin',
      },
      company: defaultComp,
      token: 'girus_jwt_default',
      loggedInAt: new Date().toISOString(),
    };
    return initialSession;
  }

  setCurrentSession(session: AuthSession | null): void {
    if (session) {
      saveToStorage('current_session', session);
    } else {
      localStorage.removeItem(STORAGE_PREFIX + 'current_session');
    }
    this.notifySubscribers();
  }

  switchCompany(companyId: string): AuthSession | null {
    const companies = this.getCompanies();
    const target = companies.find((c) => c.id === companyId);
    if (!target) return null;

    const current = this.getCurrentSession();
    const updatedSession: AuthSession = {
      user: {
        id: current?.user.id || 'usr-' + target.id,
        name: target.ownerName,
        email: target.email,
        role: 'admin',
      },
      company: target,
      token: 'girus_jwt_' + Math.random().toString(36).substring(2),
      loggedInAt: new Date().toISOString(),
    };

    this.setCurrentSession(updatedSession);
    this.recordApiLog('POST', '/api/v1/tenants/switch', 200, 15, { companyId: target.id });
    return updatedSession;
  }

  logout(): void {
    localStorage.removeItem(STORAGE_PREFIX + 'current_session');
    this.recordApiLog('POST', '/api/v1/auth/logout', 200, 10);
    this.notifySubscribers();
  }
}
