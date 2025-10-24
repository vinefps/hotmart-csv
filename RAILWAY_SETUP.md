# 🚂 Configuração do Railway para Deploy

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no seu projeto Railway:

### 1. Banco de Dados
```
DB_USER=postgres
DB_HOST=<host-do-banco-railway>
DB_NAME=railway
DB_PASSWORD=<senha-gerada-pelo-railway>
DB_PORT=5432
```

### 2. Aplicação
```
NODE_ENV=production
JWT_SECRET=<gere-uma-string-aleatoria-segura>
PORT=5000
```

### 3. CORS (IMPORTANTE!)
```
FRONTEND_URL=https://hotmart-csv.vercel.app
```

## Como Configurar no Railway

1. Acesse seu projeto no Railway
2. Clique na aba **"Variables"**
3. Adicione cada variável acima clicando em **"New Variable"**
4. Salve as mudanças
5. O Railway fará o redeploy automaticamente

## ⚠️ IMPORTANTE

Se você alterar a URL do Vercel, você DEVE atualizar a variável `FRONTEND_URL` no Railway!

## Verificação

Após o deploy, acesse:
```
https://hotmart-csv-production.up.railway.app/api
```

Você deve ver uma resposta JSON com a lista de endpoints disponíveis.

## Logs para Debug

Para verificar se o CORS está funcionando, cheque os logs do Railway. Você verá mensagens como:

```
🔍 CORS Request from origin: https://hotmart-csv.vercel.app
✅ Allowing Vercel origin: https://hotmart-csv.vercel.app
```

Se aparecer:
```
❌ Blocking origin: https://hotmart-csv.vercel.app
```

Significa que você precisa verificar a variável `FRONTEND_URL` ou o código do CORS.
