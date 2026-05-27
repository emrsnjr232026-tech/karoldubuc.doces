const PRODUCTS_KEY = "karolDubucProducts";
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
  return [];
}

export function saveOrder(order) {
  return {
    ...order,
    status: order.status || "Recebido"
  };
}

export function updateOrderStatus(orderId, status) {
  return { orderId, status };
}

export function deleteOrder(orderId) {
  return orderId;
}

export function onDatabaseChange(callback) {
  window.addEventListener(DATABASE_EVENT, callback);
  window.addEventListener("storage", (event) => {
    if (event.key === PRODUCTS_KEY) {
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

function createId(value) {
  const slug = String(value || "item")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug || "item"}-${Date.now()}`;
}
