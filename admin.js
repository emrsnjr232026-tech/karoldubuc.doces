import { googleSheetsWebhookUrl } from "./integrations-config.js";

const adminPassword = "Deus.Deus@26";
const adminSessionKey = "karolDubucAdminUnlocked";

const adminForm = document.querySelector("#admin-form");
const adminList = document.querySelector("#admin-list");
const resetButton = document.querySelector("#reset-menu");
const clearButton = document.querySelector("#clear-menu");
const lock = document.querySelector("#admin-lock");
const lockForm = document.querySelector("#lock-form");
const lockError = document.querySelector("#lock-error");
const passwordInput = document.querySelector("#admin-password");
const ordersList = document.querySelector("#orders-list");
const exportOrdersButton = document.querySelector("#export-orders");
const refreshOrdersButton = document.querySelector("#refresh-orders");
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

updateLockState();

loadProducts();
loadOrders();

window.setInterval(() => {
  loadProducts();
  loadOrders();
}, 5000);

function updateLockState() {

  const unlocked =
    sessionStorage.getItem(
      adminSessionKey
    ) === "true";

  lock.hidden = unlocked;

  document.body.classList.toggle(
    "is-locked",
    !unlocked
  );

  if (!unlocked) {
    passwordInput.focus();
  }
}

function convertImageToBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.readAsDataURL(file);

      reader.onload = () =>
        resolve(reader.result);

      reader.onerror = (error) =>
        reject(error);
    }
  );
}

function formatDate(value) {

  if (!value) return "";

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  ).format(new Date(value));
}

function renderAdminList() {

  if (!adminList) return;

  if (!products.length) {

    adminList.innerHTML = `
      <p class="empty">
        Nenhum item cadastrado.
      </p>
    `;

    return;
  }

  adminList.innerHTML = products

    .map(
      (product) => `

      <article class="admin-item">

        ${
          product.image

            ? `
              <img
                src="${product.image}"
                alt="${product.name}"
                class="admin-product-image"
              />
            `

            : `
              <div class="admin-product-placeholder">
                Sem foto
              </div>
            `
        }

        <div class="admin-item-body">

          <div class="admin-item-header">

            <h3>
              ${product.name}
            </h3>

            <strong>
              ${money.format(
                Number(product.price) || 0
              )}
            </strong>

          </div>

          <p>
            ${product.description || ""}
          </p>

          <div class="admin-actions">

            <button
              class="small-button"
              type="button"
              data-action="edit-product"
              data-id="${product.id}"
            >
              Editar
            </button>

            <button
              class="danger-button"
              type="button"
              data-action="remove-product"
              data-id="${product.id}"
            >
              Remover
            </button>

          </div>

        </div>

      </article>
    `
    )

    .join("");
}

function renderOrders() {

  if (!ordersList) return;

  if (!orders.length) {

    ordersList.innerHTML = `
      <p class="empty">
        Nenhum pedido recebido.
      </p>
    `;

    return;
  }

  ordersList.innerHTML = orders

    .map(
      (order) => `

      <article class="order-card">

        <div class="order-card-header">

          <div>

            <p class="eyebrow">
              Comanda ${order.commandNumber}
            </p>

            <h3>
              ${order.customerName || ""}
            </h3>

          </div>

          <strong>
            ${money.format(
              Number(order.total) || 0
            )}
          </strong>

        </div>

        <p>
          <strong>Telefone:</strong>
          ${order.customerPhone || ""}
        </p>

        <p>
          <strong>Pedido:</strong>
          ${order.itemsText || ""}
        </p>

        <p>
          <strong>Status:</strong>
        </p>

        <select
          data-action="order-status"
          data-id="${order.id}"
        >

          ${
            [
              "Recebido",
              "Em preparo",
              "Pronto",
              "Entregue"
            ]

              .map(
                (status) => `

                <option
                  value="${status}"

                  ${
                    order.status === status
                      ? "selected"
                      : ""
                  }
                >
                  ${status}
                </option>
              `
              )

              .join("")
          }

        </select>

        <br /><br />

        <button
          class="danger-button"
          type="button"
          data-action="remove-order"
          data-id="${order.id}"
        >
          Excluir
        </button>

      </article>
    `
    )

    .join("");
}

function renderAdminStats() {

  const pendingOrders = orders.filter(
    (order) =>
      ![
        "Pronto",
        "Entregue"
      ].includes(
        order.status || "Recebido"
      )
  );

  const revenue = orders.reduce(
    (total, order) =>
      total +
      (Number(order.total) || 0),
    0
  );

  if (statProducts) {
    statProducts.textContent =
      String(products.length);
  }

  if (statOrders) {
    statOrders.textContent =
      String(orders.length);
  }

  if (statPending) {
    statPending.textContent =
      String(pendingOrders.length);
  }

  if (statRevenue) {
    statRevenue.textContent =
      money.format(revenue);
  }
}

adminForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const name =
      productNameInput.value.trim();

    const description =
      productDescriptionInput.value.trim();

    const price =
      Number(productPriceInput.value);

    const imageFile =
      productImageInput.files[0];

    const currentProduct =
      products.find(
        (product) =>
          product.id ===
          editingProductId.value
      );

    if (
      !name ||
      !description ||
      Number.isNaN(price)
    ) {

      alert(
        "Preencha os campos corretamente."
      );

      return;
    }

    let image =
      currentProduct?.image || "";

   let image =
  currentProduct?.image || "";

if (imageFile) {

  try {

    const base64 =
      await convertImageToBase64(
        imageFile
      );

    const response =
      await fetch(
        googleSheetsWebhookUrl,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body: JSON.stringify({

            action:
              "uploadImage",

            image:
              base64,

            fileName:
              name
          })
        }
      );

    const data =
      await response.json();

    if (!data.ok) {

      throw new Error(
        "Erro upload"
      );
    }

    image = data.url;

  } catch (error) {

    console.error(error);

    alert(
      "Erro ao enviar imagem."
    );

    return;
  }
}
    const savedProduct = {

      id:
        currentProduct?.id ||
        Date.now().toString(),

      name,

      description,

      price,

      image,

      active: "SIM"
    };

    await saveProductOnline(
      savedProduct
    );

    await loadProducts();

    resetProductForm();

    showSaveStatus(
      "Produto salvo.",
      "success"
    );
  }
);

adminList?.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "button[data-action]"
      );

    if (!button) return;

    const product =
      products.find(
        (item) =>
          item.id ===
          button.dataset.id
      );

    if (!product) return;

    if (
      button.dataset.action ===
      "remove-product"
    ) {

      if (
        !confirm(
          `Remover "${product.name}"?`
        )
      ) {
        return;
      }

      await deleteProductOnline(
        product.id
      );

      await loadProducts();

      showSaveStatus(
        "Produto removido.",
        "success"
      );

      return;
    }

    if (
      button.dataset.action ===
      "edit-product"
    ) {

      startProductEdit(product);
    }
  }
);

ordersList?.addEventListener(
  "change",
  async (event) => {

    const select =
      event.target.closest(
        "select[data-action='order-status']"
      );

    if (!select) return;

    await updateOrderStatusOnline(
      select.dataset.id,
      select.value
    );

    await loadOrders();

    showSaveStatus(
      "Status atualizado.",
      "success"
    );
  }
);

ordersList?.addEventListener(
  "click",
  async (event) => {

    const button =
      event.target.closest(
        "button[data-action='remove-order']"
      );

    if (!button) return;

    if (
      !confirm(
        "Excluir pedido?"
      )
    ) {
      return;
    }

    await deleteOrderOnline(
      button.dataset.id
    );

    await loadOrders();

    showSaveStatus(
      "Pedido removido.",
      "success"
    );
  }
);

refreshOrdersButton?.addEventListener(
  "click",
  async () => {

    await loadOrders();

    showSaveStatus(
      "Pedidos atualizados.",
      "success"
    );
  }
);

lockForm?.addEventListener(
  "submit",
  (event) => {

    event.preventDefault();

    if (
      passwordInput.value.trim() ===
      adminPassword
    ) {

      sessionStorage.setItem(
        adminSessionKey,
        "true"
      );

      lockError.hidden = true;

      updateLockState();

      return;
    }

    lockError.hidden = false;

    passwordInput.select();
  }
);

function startProductEdit(product) {

  editingProductId.value =
    product.id;

  productNameInput.value =
    product.name || "";

  productPriceInput.value =
    Number(product.price) || 0;

  productDescriptionInput.value =
    product.description || "";

  productImageInput.value = "";

  productFormMode.textContent =
    "Editando item";

  productFormTitle.textContent =
    `Editar ${product.name}`;

  productSubmit.textContent =
    "Salvar alterações";

  cancelEditButton.hidden =
    false;

  productNameInput.focus();
}

cancelEditButton?.addEventListener(
  "click",
  resetProductForm
);

function resetProductForm() {

  adminForm.reset();

  editingProductId.value = "";

  productFormMode.textContent =
    "Novo item";

  productFormTitle.textContent =
    "Adicionar doce";

  productSubmit.textContent =
    "Adicionar ao cardápio";

  cancelEditButton.hidden =
    true;
}

function showSaveStatus(
  message,
  type = "success"
) {

  if (!saveStatus) return;

  saveStatus.hidden = false;

  saveStatus.textContent =
    message;

  saveStatus.dataset.type =
    type;

  clearTimeout(
    showSaveStatus.timeoutId
  );

  showSaveStatus.timeoutId =
    setTimeout(() => {

      saveStatus.hidden = true;

    }, 4000);
}

async function loadProducts() {

  try {

    const response =
      await fetch(
        `${googleSheetsWebhookUrl}?action=products`
      );

    const data =
      await response.json();

    products =
      data.products || [];

    renderAdminList();

    renderAdminStats();

  } catch (error) {

    console.error(
      "Erro ao carregar produtos",
      error
    );
  }
}

async function loadOrders() {

  try {

    const response =
      await fetch(
        `${googleSheetsWebhookUrl}?action=orders`
      );

    const data =
      await response.json();

    orders =
      data.orders || [];

    renderOrders();

    renderAdminStats();

  } catch (error) {

    console.error(
      "Erro ao carregar pedidos",
      error
    );
  }
}

async function saveProductOnline(
  product
) {

  await fetch(
    googleSheetsWebhookUrl,
    {

      method: "POST",

      mode: "no-cors",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      },

      body: JSON.stringify({

        action:
          "saveProduct",

        product
      })
    }
  );
}

async function deleteProductOnline(
  productId
) {

  await fetch(
    googleSheetsWebhookUrl,
    {

      method: "POST",

      mode: "no-cors",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      },

      body: JSON.stringify({

        action:
          "deleteProduct",

        productId
      })
    }
  );
}

async function updateOrderStatusOnline(
  orderId,
  status
) {

  await fetch(
    googleSheetsWebhookUrl,
    {

      method: "POST",

      mode: "no-cors",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      },

      body: JSON.stringify({

        action:
          "updateOrderStatus",

        orderId,

        status
      })
    }
  );
}

async function deleteOrderOnline(
  orderId
) {

  await fetch(
    googleSheetsWebhookUrl,
    {

      method: "POST",

      mode: "no-cors",

      headers: {
        "Content-Type":
          "text/plain;charset=utf-8"
      },

      body: JSON.stringify({

        action:
          "deleteOrder",

        orderId
      })
    }
  );
}
