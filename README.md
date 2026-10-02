# gvq-sistema-integrado
Sistema unificado de Romaneio e Compras - GVQ

## Estrutura

```
index.html              Login e cadastro (fica na raiz: é a entrada do site)
pages/
  painel.html           Painel do Comprador (lançamento de romaneios)
  escritorio.html       Painel do Escritório (histórico, pecuaristas, destinos)
css/
  base.css              Variáveis, reset e componentes comuns (navbar, tabelas)
  login.css             Estilos do index.html
  painel.css            Estilos do painel do comprador
  escritorio.css        Estilos do painel do escritório
js/
  firebase.js           Configuração e inicialização única do Firebase (app, auth, db)
  login.js              Lógica do index.html
  painel.js             Lógica do painel do comprador
  escritorio.js         Lógica do painel do escritório
assets/
  img/logo-gvq.png      Logo
docs/
  DILIGENCIA.md         Diagnóstico do código e plano de melhorias por etapas
```

Cada página carrega `css/base.css` + o seu CSS, e um único módulo JS que importa `js/firebase.js`.

## Rodando localmente

Os scripts são módulos ES (`type="module"`), que o navegador **não** carrega abrindo o arquivo direto (`file://`). É preciso um servidor local, por exemplo:

```bash
python -m http.server 5500
```

e abrir http://localhost:5500. (A extensão *Live Server* do VS Code também funciona.)

> ⚠️ A configuração em `js/firebase.js` aponta para o projeto Firebase de **produção** (`gvq-sistema-compras`). Tudo o que for feito localmente grava nos dados reais. Ver Etapa 1 em [docs/DILIGENCIA.md](docs/DILIGENCIA.md).
