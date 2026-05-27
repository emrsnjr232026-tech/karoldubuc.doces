import {
  deleteProduct,
  getProducts,
  onDatabaseChange,
  replaceProducts,
  restoreDefaultProducts,
  saveProduct,
  setupDatabase
} from "./database.js";
import { googleSheetsWebhookUrl } from "./integrations-config.js";

const adminPassword = "Deus.Deus@26";
const adminSessionKey = "karolDubucAdminUnlocked";

const adminForm = document.querySelector("#admin-form");
const adminList = document.querySelector("#admin-list");
const resetButton = document.querySelector("#reset-menu");
const lock = document.querySelector("#admin-lock");
const lockForm = document.querySelector("#lock-form");
const lockError = document.querySelector("#lock-error");
const passwordInput = document.querySelector("#admin-password");
const ordersList = document.querySelector("#orders-list");
const exportOrdersButton = document.querySelector("#export-orders");
const productFormMode = document.querySelector("#product-form-mode");
const productFormTitle = document.querySelector("#product-form-title");
const editingProductId = document.querySelector("#editing-product-id");
const productSubmit = document.querySelector("#product-submit");
const cancelEditButton = document.querySelector("#cancel-edit");
const productNameInput = document.querySelector("#admin-name");
const productPriceInput = document.querySelector("#admin-price");
const productImageInput = document.querySelector("#admin-image");
const productDescriptionInput = document.querySelector("#admin-description");
const statProducts = document.querySelector("#stat-products");
const statOrders = document.querySelector("#stat-orders");
const statPending = document.querySelector("#stat-pending");
const statRevenue = document.querySelector("#stat-revenue");
const saveStatus = document.querySelector("#save-status");

let products = [];
let orders = [];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

setupDatabase();
refreshAdmin();
updateLockState();
syncOnlineData();

onDatabaseChange(refreshAdmin);

function refreshAdmin() {
  products = getProducts();
  renderAdminList();
  renderOrders();
  renderAdminStats();
}

async function syncOnlineData() {
  if (!googleSheetsWebhookUrl) {
    showSaveStatus("Configure a URL do Google Apps Script para sincronizar cardapio e pedidos.", "warning");
    return;
  }

  try {
    const [onlineProducts, onlineOrders] = await Promise.all([
      loadFromGoogleSheets("products", "karolAdminCatalogCallback"),
      loadFromGoogleSheets("orders", "karolAdminOrdersCallback")
    ]);

    if (onlineProducts.length) {
      replaceProducts(onlineProducts);
    }

    orders = onlineOrders;
    refreshAdmin();
  } catch (error) {
    console.warn("Nao foi possivel sincronizar com a planilha.", error);
    showSaveStatus("Nao foi possivel carregar dados da planilha agora.", "warning");
  }
}

function updateLockState() {
  const unlocked = sessionStorage.getItem(adminSessionKey) === "true";
  lock.hidden = unlocked;
  document.body.classList.toggle("is-locked", !unlocked);

  if (!unlocked) {
    passwordInput.focus();
  }
}

function convertImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function renderAdminList() {
  if (!adminList) return;

  if (!products.length) {
    adminList.innerHTML = '<p class="empty">Nenhum item cadastrado. Use o formulario ao lado para adicionar um produto.</p>';
    return;
  }

  adminList.innerHTML = products
    .map((product) => `
      <article class="admin-item">
        ${product.image ? `<img src="${product.image}" alt="${product.name}" class="admin-product-image" />` : `<div class="admin-product-placeholder">Sem foto</div>`}
        <div class="admin-item-body">
          <div class="admin-item-header">
            <h3>${product.name}</h3>
            <strong>${money.format(Number(product.price) || 0)}</strong>
          </div>
          <p>${product.description || ""}</p>
          <div class="admin-actions">
            <button class="small-button" type="button" data-action="edit-product" data-id="${product.id}">Editar</button>
            <button class="danger-button" type="button" data-action="remove-product" data-id="${product.id}">Remover</button>
          </div>
        </div>
      </article>
    `)
    .join("");
}

function renderOrders() {
  if (!ordersList) return;

  if (!googleSheetsWebhookUrl) {
    ordersList.innerHTML = '<p class="empty">Configure a URL do Google Apps Script para acompanhar os pedidos da planilha.</p>';
    return;
  }

  if (!orders.length) {
    ordersList.innerHTML = '<p class="empty">Nenhum pedido recebido ainda.</p>';
    return;
  }

  ordersList.innerHTML = orders
    .map((order) => `
      <article class="order-card">
        <div class="order-card-header">
          <div>
            <p class="eyebrow">Comanda ${order.queueNumber || ""}</p>
            <h3>${order.customerName || "Cliente sem nome"}</h3>
          </div>
          <strong>${money.format(Number(order.total) || 0)}</strong>
        </div>

        <p><strong>Recebido:</strong> ${formatDate(order.createdAt)}</p>
        <p><strong>Telefone:</strong> ${order.customerPhone || ""}</p>
        <p><strong>Dia:</strong> ${order.orderDay || ""}</p>
        <p><strong>Entrega/retirada:</strong> ${order.deliveryMethod || ""}</p>
        ${order.address ? `<p><strong>Endereco:</strong> ${order.address}</p>` : ""}
        <p><strong>Pedido:</strong> ${order.itemsText || ""}</p>
        ${order.notes ? `<p><strong>Observacao:</strong> ${order.notes}</p>` : ""}

        <div class="order-actions">
          <label>
            Status
            <select data-action="order-status" data-id="${order.id}">
              ${["Recebido", "Em preparo", "Pronto", "Entregue"].map((status) => `
                <option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>
              `).join("")}
            </select>
          </label>
          <button class="danger-button" type="button" data-action="remove-order" data-id="${order.id}">Excluir</button>
        </div>
      </article>
    `)
    .join("");
}

function renderAdminStats() {
  const pendingOrders = orders.filter((order) => !["Pronto", "Entregue"].includes(order.status || "Recebido"));
  const revenue = orders.reduce((total, order) => total + (Number(order.total) || 0), 0);

  if (statProducts) statProducts.textContent = String(products.length);
  if (statOrders) statOrders.textContent = String(orders.length);
  if (statPending) statPending.textContent = String(pendingOrders.length);
  if (statRevenue) statRevenue.textContent = money.format(revenue);
}

adminForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = productNameInput.value.trim();
  const description = productDescriptionInput.value.trim();
  const price = Number(productPriceInput.value);
  const imageFile = productImageInput.files[0];
  const currentProduct = products.find((product) => product.id === editingProductId.value);

  if (!name || !description || Number.isNaN(price)) {
    alert("Preencha nome, descricao e preco corretamente.");
    return;
  }

  let image = currentProduct?.image || "";

  if (imageFile) {
    try {
      image = await convertImageToBase64(imageFile);
    } catch {
      alert("Erro ao processar a imagem do produto.");
      return;
    }
  }

  const savedProduct = saveProduct({
    id: currentProduct?.id,
    name,
    description,
    price,
    image
  });

  try {
    await sendAdminAction({
      action: "saveProduct",
      product: savedProduct
    });
    resetProductForm();
    showSaveStatus("Produto salvo na planilha.", "success");
    syncOnlineData();
  } catch (error) {
    console.warn("Produto salvo no navegador, mas nao enviado para a planilha.", error);
    showSaveStatus("Produto salvo neste navegador. Configure a planilha para aparecer para todos.", "warning");
  }
});

adminList?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const product = products.find((item) => item.id === button.dataset.id);
  if (!product) return;

  if (button.dataset.action === "remove-product") {
    if (!confirm(`Remover "${product.name}" do cardapio?`)) return;
    deleteProduct(product.id);

    try {
      await sendAdminAction({
        action: "deleteProduct",
        productId: product.id
      });
      showSaveStatus("Produto removido da planilha.", "success");
      syncOnlineData();
    } catch {
      showSaveStatus("Produto removido deste navegador, mas a planilha nao foi atualizada.", "warning");
    }
    return;
  }

  if (button.dataset.action === "edit-product") {
    startProductEdit(product);
  }
});

resetButton?.addEventListener("click", async () => {
  if (!confirm("Isso vai restaurar o cardapio inicial. Continuar?")) return;
  restoreDefaultProducts();

  try {
    await sendAdminAction({
      action: "replaceProducts",
      products: getProducts()
    });
    resetProductForm();
    showSaveStatus("Cardapio inicial restaurado na planilha.", "success");
    syncOnlineData();
  } catch {
    resetProductForm();
    showSaveStatus("Cardapio restaurado neste navegador, mas a planilha nao foi atualizada.", "warning");
  }
});

cancelEditButton?.addEventListener("click", resetProductForm);

ordersList?.addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-action='order-status']");
  if (!select) return;

  const order = orders.find((item) => String(item.id) === String(select.dataset.id));
  const previousStatus = order?.status || "Recebido";

  if (order) {
    order.status = select.value;
    renderAdminStats();
  }

  try {
    await sendAdminAction({
      action: "updateOrderStatus",
      orderId: select.dataset.id,
      status: select.value
    });
    showSaveStatus("Status atualizado na planilha.", "success");
  } catch {
    if (order) order.status = previousStatus;
    select.value = previousStatus;
    renderAdminStats();
    showSaveStatus("Nao foi possivel atualizar o status na planilha.", "warning");
  }
});

ordersList?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='remove-order']");
  if (!button) return;

  if (!confirm("Excluir este pedido da planilha?")) return;

  const previousOrders = [...orders];
  orders = orders.filter((order) => String(order.id) !== String(button.dataset.id));
  refreshAdmin();

  try {
    await sendAdminAction({
      action: "deleteOrder",
      orderId: button.dataset.id
    });
    showSaveStatus("Comanda excluida da planilha.", "success");
  } catch {
    orders = previousOrders;
    refreshAdmin();
    showSaveStatus("Nao foi possivel excluir a comanda da planilha.", "warning");
  }
});

exportOrdersButton?.addEventListener("click", () => {
  if (!orders.length) {
    alert("Ainda nao ha pedidos para exportar.");
    return;
  }

  const headers = [
    "Comanda",
    "Data e hora",
    "Cliente",
    "Telefone",
    "Dia desejado",
    "Entrega ou retirada",
    "Endereco",
    "Itens",
    "Observacao",
    "Total",
    "Status"
  ];

  const rows = orders.map((order) => [
    order.queueNumber,
    formatDate(order.createdAt),
    order.customerName || "",
    order.customerPhone || "",
    order.orderDay || "",
    order.deliveryMethod || "",
    order.address || "",
    order.itemsText || "",
    order.notes || "",
    Number(order.total) || 0,
    order.status || "Recebido"
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(";"))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `comandas-karol-dubuc-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

lockForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (passwordInput.value.trim() === adminPassword) {
    sessionStorage.setItem(adminSessionKey, "true");
    lockError.hidden = true;
    updateLockState();
    return;
  }

  lockError.hidden = false;
  passwordInput.select();
});

function startProductEdit(product) {
  editingProductId.value = product.id;
  productNameInput.value = product.name || "";
  productPriceInput.value = Number(product.price) || 0;
  productDescriptionInput.value = product.description || "";
  productImageInput.value = "";
  productFormMode.textContent = "Editando item";
  productFormTitle.textContent = `Editar ${product.name}`;
  productSubmit.textContent = "Salvar alteracoes";
  cancelEditButton.hidden = false;
  productNameInput.focus();
}

function resetProductForm() {
  adminForm.reset();
  editingProductId.value = "";
  productFormMode.textContent = "Novo item";
  productFormTitle.textContent = "Adicionar doce";
  productSubmit.textContent = "Adicionar ao cardapio";
  cancelEditButton.hidden = true;
}

function showSaveStatus(message, type = "success") {
  if (!saveStatus) return;

  saveStatus.hidden = false;
  saveStatus.textContent = message;
  saveStatus.dataset.type = type;

  window.clearTimeout(showSaveStatus.timeoutId);
  showSaveStatus.timeoutId = window.setTimeout(() => {
    saveStatus.hidden = true;
  }, 5000);
}

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function sendAdminAction(payload) {
  if (!googleSheetsWebhookUrl) {
    throw new Error("Google Apps Script nao configurado.");
  }

  await fetch(googleSheetsWebhookUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });
}

function loadFromGoogleSheets(action, callbackPrefix) {
  const callbackName = `${callbackPrefix}_${Date.now()}`;
  const url = new URL(googleSheetsWebhookUrl);

  url.searchParams.set("action", action);
  url.searchParams.set("callback", callbackName);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado ao carregar dados online."));
    }, 8000);

    window[callbackName] = (data) => {
      cleanup();

      if (action === "orders") {
        resolve(Array.isArray(data?.orders) ? data.orders : []);
        return;
      }

      resolve(Array.isArray(data?.products) ? data.products : []);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Erro ao carregar dados online."));
    };

    script.src = url.toString();
    document.body.appendChild(script);

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    }
  });
}
