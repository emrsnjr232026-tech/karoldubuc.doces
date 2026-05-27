const ORDERS_SHEET_NAME = "Pedidos";
const PRODUCTS_SHEET_NAME = "Cardapio";

const DEFAULT_PRODUCTS = [
  ["brownie", "Brownie", "Quadrado intenso de chocolate, casquinha fina e massa molhadinha.", 8, "", "SIM"],
  ["pudim", "Pudim", "Pudim artesanal com calda de caramelo, sob encomenda.", 35, "", "SIM"],
  ["brigadeiro", "Brigadeiro", "Brigadeiro tradicional enrolado, ideal para presentear ou dividir.", 3, "", "SIM"],
  ["bolo-pote", "Bolo de pote", "Camadas cremosas com massa de chocolate e recheio generoso.", 12, "", "SIM"]
];

function doGet(event) {
  const action = event.parameter.action || "";

  if (action === "products") {
    return jsonpResponse(event, {
      ok: true,
      products: getProducts()
    });
  }

  if (action === "orders") {
    return jsonpResponse(event, {
      ok: true,
      orders: getOrders()
    });
  }

  return jsonpResponse(event, {
    ok: true,
    message: "Karol Dubuc pedidos online"
  });
}

function doPost(event) {
  const data = JSON.parse(event.postData.contents || "{}");
  const action = data.action || "saveOrder";

  if (action === "saveProduct") {
    saveProduct(data.product || {});
    return jsonResponse({ ok: true });
  }

  if (action === "deleteProduct") {
    deleteProduct(data.productId || "");
    return jsonResponse({ ok: true });
  }

  if (action === "replaceProducts") {
    replaceProducts(data.products || []);
    return jsonResponse({ ok: true });
  }

  if (action === "updateOrderStatus") {
    updateOrderStatus(data.orderId || "", data.status || "Recebido");
    return jsonResponse({ ok: true });
  }

  if (action === "deleteOrder") {
    deleteOrder(data.orderId || "");
    return jsonResponse({ ok: true });
  }

  saveOrder(data.order || data);
  return jsonResponse({ ok: true });
}

function getProducts() {
  const sheet = getProductsSheet();
  const values = sheet.getDataRange().getValues();

  return values
    .slice(1)
    .filter((row) => row[0] && String(row[5] || "SIM").toUpperCase() !== "NAO")
    .map((row) => ({
      id: String(row[0]),
      name: String(row[1] || ""),
      description: String(row[2] || ""),
      price: Number(row[3]) || 0,
      image: String(row[4] || "")
    }));
}

function getOrders() {
  const sheet = getOrdersSheet();
  const values = sheet.getDataRange().getValues();

  return values
    .map((row, index) => ({ row, rowNumber: index + 1 }))
    .filter((item) => item.rowNumber > 1 && (item.row[0] || item.row[2] || item.row[7]))
    .map((item, index) => ({
      id: String(item.rowNumber),
      queueNumber: index + 1,
      createdAt: item.row[0],
      commandNumber: item.row[1] || "",
      customerName: String(item.row[2] || ""),
      customerPhone: String(item.row[3] || ""),
      orderDay: String(item.row[4] || ""),
      deliveryMethod: String(item.row[5] || ""),
      address: String(item.row[6] || ""),
      itemsText: String(item.row[7] || ""),
      notes: String(item.row[8] || ""),
      total: Number(item.row[9]) || 0,
      status: String(item.row[10] || "Recebido")
    }));
}

function saveProduct(product) {
  const sheet = getProductsSheet();
  const id = product.id || createId(product.name || "produto");
  const values = sheet.getDataRange().getValues();
  const rowIndex = values.findIndex((row, index) => index > 0 && String(row[0]) === String(id));
  const row = [
    id,
    product.name || "",
    product.description || "",
    Number(product.price) || 0,
    product.image || "",
    "SIM",
    new Date()
  ];

  if (rowIndex >= 0) {
    sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
    return;
  }

  sheet.appendRow(row);
}

function deleteProduct(productId) {
  const sheet = getProductsSheet();
  const values = sheet.getDataRange().getValues();

  for (let index = values.length - 1; index >= 1; index -= 1) {
    if (String(values[index][0]) === String(productId)) {
      sheet.deleteRow(index + 1);
      return;
    }
  }
}

function replaceProducts(products) {
  const sheet = getProductsSheet();

  sheet.clear();
  writeProductHeader(sheet);

  products.forEach((product) => {
    sheet.appendRow([
      product.id || createId(product.name || "produto"),
      product.name || "",
      product.description || "",
      Number(product.price) || 0,
      product.image || "",
      "SIM",
      new Date()
    ]);
  });
}

function saveOrder(order) {
  const sheet = getOrdersSheet();
  const normalizedOrder = normalizeOrder(order);

  sheet.appendRow([
    new Date(),
    normalizedOrder.commandNumber || "",
    normalizedOrder.customerName || "",
    normalizedOrder.customerPhone || "",
    normalizedOrder.orderDay || "",
    normalizedOrder.deliveryMethod || "",
    normalizedOrder.address || "",
    normalizedOrder.itemsText || "",
    normalizedOrder.notes || "",
    normalizedOrder.total || 0,
    normalizedOrder.status || "Recebido"
  ]);
}

function updateOrderStatus(orderId, status) {
  const sheet = getOrdersSheet();
  const rowNumber = Number(orderId);

  if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) return;

  sheet.getRange(rowNumber, 11).setValue(status || "Recebido");
}

function deleteOrder(orderId) {
  const sheet = getOrdersSheet();
  const rowNumber = Number(orderId);

  if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) return;

  sheet.deleteRow(rowNumber);
}

function normalizeOrder(order) {
  order = order || {};

  if (order && order.customerName) return order;

  return {
    commandNumber: order.commandNumber || "",
    customerName: order.nome || order.cliente || "",
    customerPhone: order.telefone || "",
    orderDay: order.dia || "",
    deliveryMethod: order.entrega || "",
    address: order.endereco || "",
    itemsText: order.pedido || order.itens || "",
    notes: order.observacao || "",
    total: order.total || 0,
    status: order.status || "Recebido"
  };
}

function getProductsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(PRODUCTS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(PRODUCTS_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    writeProductHeader(sheet);
    DEFAULT_PRODUCTS.forEach((row) => sheet.appendRow([...row, new Date()]));
  }

  return sheet;
}

function getOrdersSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(ORDERS_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Data e hora",
      "Comanda",
      "Cliente",
      "Telefone",
      "Dia desejado",
      "Entrega ou retirada",
      "Endereco",
      "Itens",
      "Observacao",
      "Total",
      "Status"
    ]);
  }

  return sheet;
}

function writeProductHeader(sheet) {
  sheet.appendRow([
    "ID",
    "Nome",
    "Descricao",
    "Preco",
    "Imagem",
    "Ativo",
    "Atualizado em"
  ]);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse(event, data) {
  const callback = event.parameter.callback;

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(data)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return jsonResponse(data);
}

function createId(value) {
  return String(value || "item")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") + "-" + Date.now();
}
