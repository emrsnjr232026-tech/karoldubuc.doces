const PRODUCTS_KEY = "karolDubucProducts";
const ORDERS_KEY = "karolDubucOrders";
const DATABASE_EVENT = "karolDubucDatabaseChanged";

export const defaultProducts = [
  {
    id: "brownie",
    name: "Brownie",
    description: "Quadrado intenso de chocolate, casquinha fina e massa molhadinha.",
    price: 8,
    image: ""
  },
  {
    id: "pudim",
    name: "Pudim",
    description: "Pudim artesanal com calda de caramelo, sob encomenda.",
    price: 35,
    image: ""
  },
  {
    id: "brigadeiro",
    name: "Brigadeiro",
    description: "Brigadeiro tradicional enrolado, ideal para presentear ou dividir.",
    price: 3,
    image: ""
  },
  {
    id: "bolo-pote",
    name: "Bolo de pote",
    description: "Camadas cremosas com massa de chocolate e recheio generoso.",
    price: 12,
    image: ""
  }
];

export function setupDatabase() {
  if (!readList(PRODUCTS_KEY).length) {
    saveList(PRODUCTS_KEY, defaultProducts);
  }

  if (!localStorage.getItem(ORDERS_KEY)) {
    saveList(ORDERS_KEY, []);
  }
}

export function getProducts() {
  setupDatabase();
  return readList(PRODUCTS_KEY).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function saveProduct(product) {
  const products = getProducts();
  const payload = {
    ...product,
    id: product.id || createId(product.name),
    price: Number(product.price) || 0,
    updatedAt: new Date().toISOString()
  };

  const index = products.findIndex((item) => item.id === payload.id);

  if (index >= 0) {
    products[index] = payload;
  } else {
    payload.createdAt = new Date().toISOString();
    products.push(payload);
  }

  saveList(PRODUCTS_KEY, products);
  notifyDatabaseChanged();
  return payload;
}

export function deleteProduct(productId) {
  saveList(PRODUCTS_KEY, getProducts().filter((product) => product.id !== productId));
  notifyDatabaseChanged();
}

export function restoreDefaultProducts() {
  saveList(PRODUCTS_KEY, defaultProducts);
  notifyDatabaseChanged();
}

export function replaceProducts(products) {
  if (!Array.isArray(products)) return;

  saveList(PRODUCTS_KEY, products.filter((product) => product && product.name));
  notifyDatabaseChanged();
}

export function getOrders() {
  setupDatabase();
  return readList(ORDERS_KEY)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((order, index) => ({
      ...order,
      queueNumber: index + 1
    }));
}

export function saveOrder(order) {
  const orders = getOrders();
  const payload = {
    ...order,
    id: order.id || createId("pedido"),
    commandNumber: order.commandNumber || getNextCommandNumber(orders),
    status: order.status || "Recebido",
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const index = orders.findIndex((item) => item.id === payload.id);

  if (index >= 0) {
    orders[index] = payload;
  } else {
    orders.push(payload);
  }

  saveList(ORDERS_KEY, orders);
  notifyDatabaseChanged();
  return payload;
}

export function updateOrderStatus(orderId, status) {
  const orders = getOrders().map((order) => (
    order.id === orderId
      ? { ...order, status, updatedAt: new Date().toISOString() }
      : order
  ));

  saveList(ORDERS_KEY, orders);
  notifyDatabaseChanged();
}

export function deleteOrder(orderId) {
  saveList(ORDERS_KEY, getOrders().filter((order) => order.id !== orderId));
  notifyDatabaseChanged();
}

export function onDatabaseChange(callback) {
  window.addEventListener(DATABASE_EVENT, callback);
  window.addEventListener("storage", (event) => {
    if ([PRODUCTS_KEY, ORDERS_KEY].includes(event.key)) {
      callback();
    }
  });
}

function readList(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function notifyDatabaseChanged() {
  window.dispatchEvent(new CustomEvent(DATABASE_EVENT));
}

function getNextCommandNumber(orders) {
  return orders.reduce((max, order) => Math.max(max, Number(order.commandNumber) || 0), 0) + 1;
}

function createId(value) {
  const slug = String(value || "item")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug || "item"}-${Date.now()}`;
}
