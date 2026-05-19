const menuStorageKey = "karolDubucProducts";
const adminPassword = "karol123";
const adminSessionKey = "karolDubucAdminUnlocked";

// Padrão sem imagens iniciais (pode adicionar URLs da internet aqui se quiser)
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

const adminForm = document.querySelector("#admin-form");
const adminList = document.querySelector("#admin-list");
const resetButton = document.querySelector("#reset-menu");
const lock = document.querySelector("#admin-lock");
const lockForm = document.querySelector("#lock-form");
const lockError = document.querySelector("#lock-error");
const passwordInput = document.querySelector("#admin-password");

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
    return Array.isArray(parsed) ? parsed : defaultProducts;
  } catch {
    return defaultProducts;
  }
}

function saveProducts() {
  localStorage.setItem(menuStorageKey, JSON.stringify(products));
}

function updateLockState() {
  const unlocked = sessionStorage.getItem(adminSessionKey) === "true";
  lock.hidden = unlocked;
  document.body.classList.toggle("is-locked", !unlocked);

  if (!unlocked) {
    passwordInput.focus();
  }
}

function createId(name) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base || "item"}-${Date.now()}`;
}

// Função auxiliar para converter arquivo de imagem para Texto (Base64)
function convertImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function renderAdminList() {
  if (!products.length) {
    adminList.innerHTML = '<p class="empty">Nenhum item cadastrado.</p>';
    return;
  }

  adminList.innerHTML = products
    .map(
      (product) => `
        <article class="admin-item" style="display: flex; gap: 15px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
          ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />` : `<div style="width: 80px; height: 80px; background: #eee; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #aaa;">Sem foto</div>`}
          <div style="flex: 1;">
            <div class="admin-item-header">
              <h3>${product.name}</h3>
              <strong>${money.format(product.price)}</strong>
            </div>
            <p>${product.description}</p>
            <div class="admin-actions" style="margin-top: 10px;">
              <button class="small-button" type="button" data-action="edit" data-id="${product.id}">Editar</button>
              <button class="danger-button" type="button" data-action="remove" data-id="${product.id}">Remover</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.querySelector("#admin-name").value.trim();
  const description = document.querySelector("#admin-description").value.trim();
  const price = Number(document.querySelector("#admin-price").value);
  const imageFile = document.querySelector("#admin-image").files[0];

  if (!name || !description || Number.isNaN(price)) {
    return;
  }

  let base64Image = "";
  if (imageFile) {
    try {
      base64Image = await convertImageToBase64(imageFile);
    } catch (err) {
      alert("Erro ao processar a imagem do produto.");
      return;
    }
  }

  products.push({
    id: createId(name),
    name,
    description,
    price,
    image: base64Image
  });

  saveProducts();
  renderAdminList();
  adminForm.reset();
});

adminList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const product = products.find((item) => item.id === button.dataset.id);
  if (!product) return;

  if (button.dataset.action === "remove") {
    products = products.filter((item) => item.id !== product.id);
    saveProducts();
    renderAdminList();
    return;
  }

  const newName = prompt("Nome do doce:", product.name);
  if (newName === null) return;

  const newDescription = prompt("Descricao:", product.description);
  if (newDescription === null) return;

  const newPrice = prompt("Preco:", String(product.price).replace(".", ","));
  if (newPrice === null) return;

  const newImage = prompt("Para alterar a imagem, cole a URL/Base64 ou deixe como está para manter:", product.image);
  if (newImage === null) return;

  const parsedPrice = Number(newPrice.replace(",", "."));
  if (!newName.trim() || !newDescription.trim() || Number.isNaN(parsedPrice)) {
    alert("Preencha nome, descricao e preco corretamente.");
    return;
  }

  product.name = newName.trim();
  product.description = newDescription.trim();
  product.price = parsedPrice;
  product.image = newImage.trim();
  
  saveProducts();
  renderAdminList();
});

resetButton.addEventListener("click", () => {
  products = [...defaultProducts];
  saveProducts();
  renderAdminList();
});

lockForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (passwordInput.value === adminPassword) {
    sessionStorage.setItem(adminSessionKey, "true");
    lockError.hidden = true;
    updateLockState();
    return;
  }

  lockError.hidden = false;
  passwordInput.select();
});

updateLockState();
renderAdminList();
