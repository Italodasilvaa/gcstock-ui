/**
 * Chaves de permissão (iguais às do catálogo da API, GET /permissoes). O dono da empresa possui todas.
 * Consultar dados é liberado a qualquer usuário; as permissões cobrem criar, editar e excluir em cada tela.
 */
export const PERMISSION = {
  // Produtos
  ProductsCreate: 'produtos.criar',
  ProductsEdit: 'produtos.editar',
  ProductsDelete: 'produtos.excluir',
  // Categorias de produto
  CategoriesCreate: 'categorias.criar',
  CategoriesEdit: 'categorias.editar',
  CategoriesDelete: 'categorias.excluir',
  // Kits de churrasco
  KitsCreate: 'kits.criar',
  KitsEdit: 'kits.editar',
  KitsDelete: 'kits.excluir',
  // Compras
  PurchasesCreate: 'compras.criar',
  PurchasesDelete: 'compras.excluir',
  PurchasesEdit: 'compras.editar',
  // Vendas (PDV)
  SalesCreate: 'vendas.criar',
  /** Alterar o preço de um item no carrinho do PDV. */
  SalesEditPrice: 'vendas.alterar-preco',
  /** Cancelar (estornar) vendas já finalizadas. */
  SalesCancel: 'vendas.cancelar',
  // Clientes
  ClientsCreate: 'clientes.criar',
  ClientsEdit: 'clientes.editar',
  ClientsDelete: 'clientes.excluir',
  // Funcionários (a atribuição de permissões é exclusiva do dono)
  EmployeesCreate: 'funcionarios.criar',
  EmployeesEdit: 'funcionarios.editar',
  EmployeesDelete: 'funcionarios.excluir',
  // Perdas de estoque
  LossesCreate: 'perdas.registrar',
  LossesUndo: 'perdas.desfazer',
  // Caixa da empresa
  CapitalManage: 'aportes.gerenciar',
  // Financeiro
  PayablesCreate: 'contas-pagar.criar',
  PayablesSettle: 'contas-pagar.baixar',
  PayablesDelete: 'contas-pagar.excluir',
  PayablesEdit: 'contas-pagar.editar',
  ReceivablesCreate: 'contas-receber.criar',
  ReceivablesSettle: 'contas-receber.liquidar',
  ReceivablesEdit: 'contas-receber.editar',
  ReceivablesDelete: 'contas-receber.excluir',
  CardsAnticipate: 'cartoes.antecipar',
  // Configurações
  FeesCreate: 'taxas.criar',
  FeesEdit: 'taxas.editar',
  FeesDelete: 'taxas.excluir',
  AlertsEdit: 'alertas.editar',
} as const;
