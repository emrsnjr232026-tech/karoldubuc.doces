# Publicar o site gratuitamente

## Opcao mais simples: Netlify Drop

1. Acesse `https://app.netlify.com/drop`.
2. Arraste a pasta `Site Karol Dubuc Pedidos` para a tela.
3. O Netlify gera um link publico gratuito.
4. Depois voce pode trocar o nome do link nas configuracoes do site.

## Antes de divulgar

- A senha do admin e `Deus.Deus@26`.
- O admin fica em `/admin.html`.
- A pagina admin esta marcada como `noindex`, para nao aparecer no Google.
- Para receber pedidos de celulares diferentes em uma planilha unica, configure o Google Apps Script usando `google-apps-script-comandas.gs` e cole a URL em `integrations-config.js`.

## Importante sobre pedidos

O banco local salva no navegador usado. Isso funciona para testar e controlar em um computador, mas clientes reais acessando de celulares diferentes precisam enviar os pedidos para um destino online.

Para isso, use a integracao com Google Sheets:

1. Crie uma planilha no Google Sheets.
2. Abra `Extensoes > Apps Script`.
3. Cole o conteudo de `google-apps-script-comandas.gs`.
4. Publique como `App da Web`.
5. Copie a URL gerada.
6. Cole a URL em `integrations-config.js`, no campo `googleSheetsWebhookUrl`.

Depois disso, a planilha passa a ter duas abas:

- `Cardapio`: itens que aparecem no site para os clientes.
- `Comandas`: pedidos recebidos.

Quando voce cadastrar, editar ou excluir produto no admin, o site envia a mudanca para a aba `Cardapio`. Quando o cliente abrir o `index.html`, ele busca essa aba para mostrar o cardapio da semana.
