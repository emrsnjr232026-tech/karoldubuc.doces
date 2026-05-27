import { googleSheetsWebhookUrl } from "./integrations-config.js";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const productGrid =
  document.getElementById("product-grid");

const summaryList =
  document.getElementById("summary-list");

const summaryTotalElement =
  document.getElementById("summary-total");

const orderForm =
  document.getElementById("order-form");

const sendOrderButton =
  document.getElementById("send-order");

let products = [];

const cart = {};

loadProductsFromOnline();

function getSelectedProducts() {

  return products

    .filter(
      (product) =>
        (cart[product.id] || 0) > 0
    )

    .map((product) => {

      const quantity =
        cart[product.id];

      const unitPrice =
        Number(product.price) || 0;

      return {

        id: product.id,

        name: product.name,

        quantity,

        unitPrice,

        total:
          quantity * unitPrice
      };
    });
}

function getOrderTotal(items) {

  return items.reduce(
    (total, item) =>
      total + item.total,
    0
  );
}

async function loadProductsFromOnline() {

  try {

    const response =
      await fetch(
        `${googleSheetsWebhookUrl}?action=products`
      );

    const data =
      await response.json();

    products =
      data.products || [];

    renderProducts();

    renderSummary();

  } catch (error) {

    console.error(
      "Erro ao carregar cardapio:",
      error
    );

    productGrid.innerHTML = `
      <p class="empty">
        Não foi possível carregar o cardápio.
      </p>
    `;
  }
}

function renderProducts() {

  if (!productGrid) return;

  productGrid.innerHTML = "";

  if (!products.length) {

    productGrid.innerHTML = `
      <p class="empty">
        Nenhum produto disponível.
      </p>
    `;

    return;
  }

  products.slice(0, 1).forEach((product) => {

    const quantity =
      cart[product.id] || 0;

    const image =
      product.image ||
      "assets/post-agenda.png";

    const card =
      document.createElement("article");

    card.className =
      "product-card";

    card.innerHTML = `

      <div>

        <img
          src="${image}"
          alt="${product.name}"
          class="product-image"
        />

        <h3>
          ${product.name}
        </h3>

        <p>
          ${product.description || ""}
        </p>

        <span class="price">
          ${currencyFormatter.format(
            Number(product.price) || 0
          )}
        </span>

      </div>

      <div class="quantity">

        <button
          type="button"
          data-action="decrease"
          data-id="${product.id}"
        >
          -
        </button>

        <span>
          ${quantity}
        </span>

        <button
          type="button"
          data-action="increase"
          data-id="${product.id}"
        >
          +
        </button>

      </div>
    `;

    productGrid.appendChild(card);
  });
}

productGrid?.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "button[data-action]"
      );

    if (!button) return;

    const productId =
      button.dataset.id;

    const currentQuantity =
      cart[productId] || 0;

    if (
      button.dataset.action ===
      "increase"
    ) {

      cart[productId] =
        currentQuantity + 1;
    }

    if (
      button.dataset.action ===
      "decrease"
    ) {

      cart[productId] =
        Math.max(
          0,
          currentQuantity - 1
        );
    }

    renderProducts();

    renderSummary();
  }
);

function renderSummary() {

  if (!summaryList) return;

  const selectedProducts =
    getSelectedProducts();

  summaryList.innerHTML = "";

  if (!selectedProducts.length) {

    summaryList.innerHTML = `
      <p class="empty">
        Escolha pelo menos um doce.
      </p>
    `;
  }

  selectedProducts.forEach((item) => {

    const row =
      document.createElement("div");

    row.className =
      "summary-item";

    row.innerHTML = `
      <span>
        <strong>
          ${item.quantity}x
        </strong>

        ${item.name}
      </span>

      <strong>
        ${currencyFormatter.format(
          item.total
        )}
      </strong>
    `;

    summaryList.appendChild(row);
  });

  if (summaryTotalElement) {

    summaryTotalElement.textContent =
      currencyFormatter.format(
        getOrderTotal(
          selectedProducts
        )
      );
  }
}

sendOrderButton?.addEventListener(
  "click",
  handleSubmitOrder
);

async function handleSubmitOrder() {

  const customerName =
    document
      .getElementById(
        "customer-name"
      )
      .value
      .trim();

  const customerPhone =
    document
      .getElementById(
        "customer-phone"
      )
      .value
      .trim();

  const orderDay =
    document.getElementById(
      "order-day"
    ).value;

  const deliveryMethod =
    document.getElementById(
      "delivery-method"
    ).value;

  const address =
    document
      .getElementById(
        "address"
      )
      .value
      .trim();

  const notes =
    document
      .getElementById(
        "notes"
      )
      .value
      .trim();

  const selectedProducts =
    getSelectedProducts();

  if (!orderForm.reportValidity()) {
    return;
  }

  if (!selectedProducts.length) {

    alert(
      "Escolha pelo menos um produto."
    );

    return;
  }

  sendOrderButton.disabled = true;

  sendOrderButton.textContent =
    "Enviando pedido...";

  try {

    const order = {

      id:
        Date.now().toString(),

      customerName,

      customerPhone,

      orderDay,

      deliveryMethod,

      address,

      notes,

      itemsText:
        selectedProducts

          .map(
            (item) =>
              `${item.quantity}x ${item.name}`
          )

          .join(" | "),

      total:
        getOrderTotal(
          selectedProducts
        ),

      status: "Recebido"
    };

    await sendOrderToGoogleSheets(
      order
    );

    Object.keys(cart).forEach(
      (key) => {
        delete cart[key];
      }
    );

    orderForm.reset();

    renderProducts();

    renderSummary();

    alert(
      "Pedido enviado com sucesso!"
    );

  } catch (error) {

    console.error(error);

    alert(
      "Erro ao enviar pedido."
    );

  } finally {

    sendOrderButton.disabled =
      false;

    sendOrderButton.textContent =
      "Finalizar pedido";
  }
}

async function sendOrderToGoogleSheets(
  order
) {

  if (!googleSheetsWebhookUrl)
    return;

  try {

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
            "saveOrder",

          order
        })
      }
    );

  } catch (error) {

    console.warn(
      "Erro ao enviar pedido",
      error
    );
  }
}
