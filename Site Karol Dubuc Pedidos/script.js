const phoneNumber = "5544999323257";
const menuStorageKey = "karolDubucProducts";
const deliveryFee = 3;

const defaultProducts = [
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
  },
];

let products = loadProducts();
const quantities = Object.fromEntries(products.map((product) => [product.id, 0]));

const productGrid = document.querySelector("#product-grid");
const summaryList = document.querySelector("#summary-list");
const summaryTotal = document.querySelector("#summary-total");
const sendButton = document.querySelector("#send-order");
const deliveryMethod = document.querySelector("#delivery-method");
const deliveryFeeRow = document.querySelector("#delivery-fee-row");
const address = document.querySelector("#address");

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function loadProducts() {
  const saved = localStorage.getItem(menuStorageKey);

  if (!saved) {
    return defaultProducts;
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultProducts;
  } catch {
    return defaultProducts;
  }
}

function subtotalProducts(selected = selectedProducts()) {
  return selected.reduce((sum, product) => sum + product.price * product.quantity, 0);
}

function isDelivery() {
  return deliveryMethod.value === "Entrega";
}

function orderTotal(selected = selectedProducts()) {
  const subtotal = subtotalProducts(selected);
  return subtotal + (subtotal > 0 && isDelivery() ? deliveryFee : 0);
}

function renderProducts() {
  if (!products.length) {
    productGrid.innerHTML = '<p class="empty">Nenhum doce cadastrado no momento.</p>';
    return;
  }

  productGrid.innerHTML = products
    .map(
      (product) => `
        <article class="product-card" style="display: flex; flex-direction: column; overflow: hidden; border-radius: 12px; border: 1px solid #eee; margin-bottom: 15px; background: #fff;">
          
          <!-- Renderização Condicional da Imagem -->
          ${
            product.image 
              ? `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 180px; object-fit: cover;" />`
              : `<div style="width: 100%; height: 180px; background: #fff5f7; display: flex; align-items: center; justify-content: center; font-size: 32px;">🍬</div>`
          }
          
          <div style="padding: 15px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h3 style="margin: 0 0 5px 0; font-size: 18px;">${product.name}</h3>
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #666; line-height: 1.4;">${product.description}</p>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: auto;">
              <span class="price" style="font-weight: bold; font-size: 18px;">${money.format(product.price)}</span>
              
              <div class="quantity" aria-label="Quantidade de ${product.name}" style="display: flex; align-items: center; gap: 10px;">
                <button type="button" data-action="decrease" data-id="${product.id}" aria-label="Diminuir ${product.name}">-</button>
                <span id="qty-${product.id}">0</span>
                <button type="button" data-action="increase" data-id="${product.id}" aria-label="Aumentar ${product.name}">+</button>
              </div>
            </div>
          </div>
          
        </article>
      `
    )
    .join("");
}

function selectedProducts() {
  return products
    .map((product) => ({ ...product, quantity: quantities[product.id] || 0 }))
    .filter((product) => product.quantity > 0);
}

function renderSummary() {
  const selected = selectedProducts();
  const total = orderTotal(selected);

  for (const product of products) {
    const quantityElement = document.querySelector(`#qty-${product.id}`);
    if (quantityElement) {
      quantityElement.textContent = quantities[product.id] || 0;
    }
  }

  if (!selected.length) {
    summaryList.innerHTML = '<p class="empty">Escolha pelo menos um doce para montar seu pedido.</p>';
  } else {
    summaryList.innerHTML = selected
      .map(
        (product) => `
          <div class="summary-item">
            <span>${product.quantity}x ${product.name}</span>
            <strong>${money.format(product.price * product.quantity)}</strong>
          </div>
        `
      )
      .join("");
  }

  deliveryFeeRow.hidden = !(selected.length && isDelivery());
  address.required = isDelivery();
  summaryTotal.textContent = money.format(total);
}

function buildMessage() {
  const selected = selectedProducts();
  const subtotal = subtotalProducts(selected);
  const total = orderTotal(selected);
  const customerName = document.querySelector("#customer-name").value.trim();
  const customerPhone = document.querySelector("#customer-phone").value.trim();
  const orderDay = document.querySelector("#order-day").value;
  const deliveryChoice = deliveryMethod.value;
  const addressValue = address.value.trim();
  const notes = document.querySelector("#notes").value.trim();

  const items = selected
    .map((product) => `- ${product.quantity}x ${product.name} (${money.format(product.price * product.quantity)})`)
    .join("\n");

  return [
    "Oi! Quero fazer um pedido na Karol Dubuc Doces Artesanais.",
    "",
    `Nome: ${customerName}`,
    `Telefone: ${customerPhone}`,
    `Dia desejado: ${orderDay}`,
    `Tipo: ${deliveryChoice}`,
    addressValue ? `Endereco/referencia: ${addressValue}` : "",
    "",
    "Pedido:",
    items,
    "",
    `Subtotal: ${money.format(subtotal)}`,
    isDelivery() ? `Frete: ${money.format(deliveryFee)}` : "",
    `Total estimado: ${money.format(total)}`,
    notes ? `Observacao: ${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  quantities[id] = action === "increase" ? (quantities[id] || 0) + 1 : Math.max(0, (quantities[id] || 0) - 1);
  renderSummary();
});

deliveryMethod.addEventListener("change", renderSummary);

sendButton.addEventListener("click", () => {
  const form = document.querySelector("#order-form");

  if (!selectedProducts().length) {
    alert("Escolha pelo menos um doce antes de enviar o pedido.");
    return;
  }

  if (!form.reportValidity()) {
    return;
  }

  const message = encodeURIComponent(buildMessage());
  window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
});

renderProducts();
renderSummary();
