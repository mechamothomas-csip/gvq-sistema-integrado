# Diligência técnica — GVQ Sistema Integrado

**Data:** 02/10/2026
**Escopo:** todo o código do repositório (`index.html`, `pages/`, `css/`, `js/`, `assets/`), já na estrutura nova de pastas. Inclui o histórico do git onde ajudou a entender uma decisão.
**Fora do escopo (não estão no repositório):** regras de segurança do Firestore/Storage, configuração do Firebase Auth e dados reais. Vários achados dependem dessas regras. Elas devem ser conferidas no console do Firebase antes de qualquer conclusão final.

## Legenda

| Severidade | Significado |
|---|---|
| 🔴 Crítico | Risco de vazamento/adulteração de dados ou acesso indevido. Resolver antes de evoluir o sistema. |
| 🟠 Alto | Bug que perde dados ou gera informação errada para o negócio. |
| 🟡 Médio | Bug pontual, dívida técnica que atrapalha evoluir, ou risco moderado. |
| 🟢 Baixo | Melhoria de qualidade, UX ou performance. |

## Visão geral

O sistema é um front-end estático (HTML + CSS + JS puro) que fala direto com o Firebase (Auth + Firestore) e com a API de localidades do IBGE. Funciona e é simples de hospedar. Os maiores problemas são:

1. **Todo o controle de acesso está no navegador.** Perfil, aprovação e "quem é o comprador" são decididos por código que o próprio usuário controla.
2. **Os anexos não são salvos.** Só o nome do arquivo vai para o banco.
3. **Dados financeiros gravados como texto formatado** (`"R$ 1.234,56"`), o que impede somar ou gerar relatórios.
4. **Esta cópia usa o mesmo banco de produção do original.** Qualquer teste local mexe em dados reais.

---

## Etapa 0 — Organização em pastas ✅ (concluída)

- [x] HTML, CSS e JS separados em `pages/`, `css/` e `js/`, e imagens em `assets/img/`.
- [x] Configuração do Firebase centralizada em `js/firebase.js`. Antes estava copiada nas 3 páginas.
- [x] CSS repetido entre as páginas extraído para `css/base.css`.
- [x] Logo renomeada de `LOGO 1.png` para `assets/img/logo-gvq.png` (sem espaço no nome).
- [x] `index.html` mantido na raiz: é a URL de entrada no GitHub Pages / hosting.
- [x] Verificado: o estilo computado de todos os elementos é idêntico ao original em desktop (1280px) e mobile (375px), nas 3 páginas. Também foram confirmados os módulos JS carregando sem erros e os redirecionamentos (`pages/*` → `../index.html`).

> Mudança de comportamento: agora é preciso um servidor local para abrir o sistema (ver README). Abrir o `.html` com duplo clique não funciona mais, porque módulos JS externos não carregam via `file://`.

---

## Etapa 0.5 — Identidade visual ✅ (concluída)

- [x] Design system em `css/base.css`: cores do logo (índigo `#12004F`, verde `#00A651`; botões em `#00843F` para contraste AA), Montserrat nos títulos e Inter no texto, botões, campos, cards, tabelas, etiquetas, avisos e indicadores.
- [x] Estrutura única dos painéis: barra lateral índigo com logo negativo, menu com item ativo, usuário e sair. No celular vira barra superior com abas.
- [x] Login redesenhado (painel da marca + formulário), painel do comprador e painel do escritório no mesmo padrão.
- [x] Ícones SVG (`assets/img/icones.svg`) no lugar dos emojis. Favicon. Logo otimizado.
- [x] Nenhuma mudança de lógica: o JS mudou só em markup de templates, rótulos de botão e destaque do menu ativo.
- [x] `scripts/dev-server.mjs`: servidor local com recarga automática.

---

## Etapa 1 — Ambiente seguro de desenvolvimento

Objetivo: poder desenvolver e testar sem tocar nos dados reais, e decidir onde a sua versão vai ficar no ar.

- [ ] 🔴 **Separar desenvolvimento de produção.** `js/firebase.js` aponta para o projeto `gvq-sistema-compras`, o mesmo do repositório original. Criar uma conta de teste, um pecuarista ou um romaneio localmente grava em produção.
  **Como resolver:** criar um projeto Firebase de desenvolvimento ou usar o **Firebase Emulator Suite** (Auth + Firestore locais), e escolher a configuração conforme o host (`localhost` → dev).
- [ ] 🔴 **Versionar as regras de segurança no repositório.** Hoje não há `firestore.rules`, `storage.rules` nem `firebase.json` aqui, então não dá para revisar nem auditar quem pode ler e escrever o quê. Trazer as regras atuais do console para o repo (`firebase init firestore`) é pré-requisito da Etapa 2.
- [ ] 🟡 **Decidir a hospedagem da sua cópia.** O original publica pelo GitHub Pages (branch `main`, raiz). O seu repositório é **privado**, e GitHub Pages em repo privado exige plano pago (Pro/Team). A alternativa natural é o **Firebase Hosting**, no mesmo projeto e gratuito no plano Spark.
- [ ] 🟢 Restringir a API key do Firebase por *HTTP referrer* no Google Cloud Console e avaliar **App Check**. A chave ser pública é normal no Firebase, mas sem restrição qualquer site pode usá-la contra o seu projeto.

---

## Etapa 2 — Segurança e controle de acesso 🔴

Objetivo: o servidor (regras do Firestore) decide o que cada usuário pode fazer, e não o JavaScript da página.

- [ ] 🔴 **As páginas não checam o perfil.** `js/escritorio.js:18` e `js/painel.js:13` só verificam *se há um usuário logado*. Um comprador, ou alguém com conta de escritório ainda **não aprovada**, abre `pages/escritorio.html` direto pela URL e vê todos os romaneios e os dados bancários de todos os pecuaristas.
  **Como resolver:** (1) nas regras do Firestore, permitir leitura de `romaneios`/`pecuaristas`/`destinos` conforme `usuarios/{uid}.perfil` e `aprovado`; (2) no front, criar um `js/auth-guard.js` que lê o perfil no Firestore e redireciona quem não tiver permissão.
- [ ] 🔴 **A aprovação é gravada pelo próprio usuário.** `js/login.js:48-52` grava `aprovado: (perfil === 'comprador')` a partir do navegador. Sem uma regra que proíba, qualquer pessoa pode se cadastrar com `perfil: 'escritorio', aprovado: true` pelo console do navegador.
  **Como resolver:** a regra de `create` em `usuarios/{uid}` deve exigir `aprovado == false` para escritório e impedir que o usuário altere `perfil`/`aprovado` depois. A aprovação passa a ser feita só por admin (console, Cloud Function ou tela de admin).
- [ ] 🔴 **A sessão continua ativa depois do cadastro.** `createUserWithEmailAndPassword` (`js/login.js:45`) já deixa o usuário logado. Uma conta de escritório "em análise" fica autenticada e, por causa do item anterior, consegue entrar no painel do escritório. Fazer `signOut` logo após o cadastro de contas pendentes.
- [ ] 🔴 **XSS (injeção de HTML/JS) nas tabelas.** Dados do banco entram direto em `innerHTML`: `js/escritorio.js:112`, `:130`, `:155`, `:169` e seguintes, `js/painel.js:166`, `:362`. Um comprador pode cadastrar um romaneio com, por exemplo, o campo *Corretor* = `<img src=x onerror="...">`. O código roda no navegador do usuário do escritório e pode ler ou alterar tudo o que o escritório acessa.
  **Como resolver:** montar as linhas com `document.createElement` + `textContent`, ou passar todo valor por uma função `escapeHtml()`. Em links (`urlDownload`), aceitar só `https://`.
- [ ] 🔴 **A identidade do comprador vem do `localStorage`.** `js/painel.js:15` lê o nome do `localStorage`, que é editável pelo usuário, e esse nome é gravado no romaneio (`comprador`) e usado como filtro do histórico (`js/painel.js:347`). Consequências:
  - quem editar o `localStorage` cria romaneios em nome de outra pessoa e vê o histórico dela;
  - dois compradores com o mesmo nome veem o histórico um do outro;
  - se o `localStorage` estiver vazio e a sessão do Firebase ativa, o romaneio é gravado como `"Comprador"`.

  **Como resolver:** gravar `compradorUid: auth.currentUser.uid` e filtrar por ele. O nome de exibição vem de `usuarios/{uid}` no Firestore. A regra deve exigir `request.resource.data.compradorUid == request.auth.uid`.
- [ ] 🟠 **Dados bancários e CPF/CNPJ (LGPD).** Qualquer usuário logado lê a coleção `pecuaristas` inteira, com documento, banco, agência e conta. Avaliar se o comprador precisa mesmo ver esses dados e restringir nas regras. Registrar quem cadastrou (`criadoPor`).
- [ ] 🟡 **Injeção de fórmulas no CSV.** `js/escritorio.js:285` e `:305` exportam texto livre sem tratamento. Um valor começando com `=`, `+`, `-` ou `@` vira fórmula ao abrir no Excel, e um `;` no texto quebra as colunas. Colocar cada campo entre aspas, escapar aspas internas e prefixar `'` nos valores perigosos.
- [ ] 🟡 **`localStorage.clear()` no logout** (`js/escritorio.js:95`, `js/painel.js:173`). No GitHub Pages, o *origin* (`usuario.github.io`) é compartilhado por **todos** os repositórios da conta. O `clear()` apaga dados de outros sites da mesma conta, e eles podem ler as chaves `gvq_*`. Remover só as chaves próprias, ou deixar de depender do `localStorage` (item acima).

<details>
<summary>Esboço de regras do Firestore (ponto de partida, a ajustar)</summary>

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function perfil() { return get(/databases/$(db)/documents/usuarios/$(request.auth.uid)).data; }
    function logado() { return request.auth != null; }
    function escritorio() { return logado() && perfil().perfil == 'escritorio' && perfil().aprovado == true; }
    function comprador() { return logado() && perfil().perfil == 'comprador' && perfil().aprovado == true; }

    match /usuarios/{uid} {
      allow read: if logado() && (request.auth.uid == uid || escritorio());
      allow create: if logado() && request.auth.uid == uid
                    && request.resource.data.aprovado == (request.resource.data.perfil == 'comprador');
      allow update, delete: if false; // aprovação só por admin
    }
    match /romaneios/{id} {
      allow read: if escritorio() || (comprador() && resource.data.compradorUid == request.auth.uid);
      allow create: if comprador() && request.resource.data.compradorUid == request.auth.uid;
      allow update, delete: if escritorio();
    }
    match /pecuaristas/{id} { allow read: if comprador() || escritorio(); allow write: if escritorio(); }
    match /destinos/{id}    { allow read: if comprador() || escritorio(); allow write: if escritorio(); }
  }
}
```
</details>

---

## Etapa 3 — Bugs funcionais 🟠

Objetivo: o sistema faz o que a tela promete.

- [ ] 🟠 **Os anexos não são enviados.** A tela pede "Notas Fiscais, GTA, Romaneios", mas `js/painel.js:291-293` e `:323` gravam **só o nome** dos arquivos. O envio ao Firebase Storage existia e foi removido no commit `8de64b5` (01/10/2026), provavelmente porque buckets novos (`*.firebasestorage.app`) exigem o plano Blaze. O comprador acha que anexou, e o documento se perde.
  **Opções:** reativar o Storage (plano Blaze, custo baixo nesse volume), usar outro armazenamento (Google Drive/S3), ou, enquanto isso, **avisar na tela** que os arquivos não são salvos.
- [ ] 🟠 **A ordem do histórico do escritório é aleatória.** `js/escritorio.js:135` busca `romaneios` sem `orderBy`, e o Firestore devolve na ordem do ID do documento, que é aleatório. O `.reverse()` da linha 150 então não mostra "os mais recentes primeiro". Usar `orderBy("timestamp", "desc")`.
- [ ] 🟡 **Salvar um pecuarista apaga o formulário de destino.** `js/escritorio.js:212` limpa `.form-grid-3 input`, e o formulário de *destino* também usa `.form-grid-3`. Limpar pelos IDs do formulário de pecuarista.
- [ ] 🟡 **A grade de pesos não é limpa depois de registrar.** Depois do envio (`js/painel.js:329-331`), o array de pesos é zerado, mas os campos da tela de pesagem continuam preenchidos. No próximo romaneio, ao clicar em "Confirmar", os pesos antigos voltam. Também não volta o campo "Outra raça" e a grade não é reduzida a 50 campos.
- [ ] 🟡 **Pesos e totais podem divergir.** Se o comprador confirmar os pesos e depois editar *Cabeças* ou *Peso Total* manualmente, o romaneio é salvo com `pesosIndividuais` que não batem com os totais. Bloquear a edição manual quando houver pesos, ou validar no envio.
- [ ] 🟡 **Erros silenciosos nos listeners.** Nenhum `onSnapshot` (`js/painel.js:104`, `:125`, `:348`, `js/escritorio.js:100`, `:118`, `:136`) tem callback de erro. Se a regra negar acesso ou a rede cair, a tela fica em "Sincronizando..." para sempre.
- [ ] 🟡 **O login esconde a causa real do erro.** `js/login.js:115-116` mostra "Login ou senha incorretos!" para *qualquer* falha, inclusive falta de internet ou permissão negada no Firestore. Diferenciar por `error.code`.
- [ ] 🟡 **Login gerado a partir do nome:**
  - nome sem sobrenome ("Maria") gera `maria.maria` (`js/login.js:41`), e a dica nem aparece;
  - dois "João Silva" geram o mesmo login, e o segundo não consegue se cadastrar;
  - a dica usa `onkeyup` e não atualiza ao colar com o mouse (usar o evento `input`);
  - se a conta for criada no Auth e o `setDoc` falhar, fica um usuário "órfão", sem perfil.
- [ ] 🟢 Escolher "Selecione..." na UF chama `.../estados//municipios` (`js/painel.js:89-95`). Não buscar quando a UF está vazia.
- [ ] 🟢 O checkbox "Selecionar todos" (`pages/escritorio.html`) não é desmarcado quando a tabela é redesenhada por uma atualização em tempo real.

---

## Etapa 4 — Modelo de dados 🟠

Objetivo: dados que permitam somar, filtrar, relacionar e auditar. Requer migrar os registros existentes.

- [ ] 🟠 **Números gravados como texto.** `cabecas`, `pesoTotal`, `precoUnitario`, `valorComissao` vão como string (`js/painel.js:308-320`). Pior: `valorTotalGado` e `totalComissao` vão como **texto formatado** (`"R$ 12.345,67"`). Isso impede somas, médias, filtros por faixa e relatórios no banco.
  **Como resolver:** gravar `Number` (e centavos como inteiro para dinheiro) e formatar só na exibição.
- [ ] 🟠 **Relacionamentos pelo nome, não pelo ID.** O romaneio guarda `pecuarista` e `fazendaDestino` como **nome**, e a busca usa `find(p => p.nome === ...)`. Se o nome do pecuarista mudar, ou houver dois com o mesmo nome, o vínculo quebra ou fica ambíguo. Guardar `pecuaristaId`/`destinoId` (mantendo o nome como "foto" do momento da compra).
- [ ] 🟡 **Sem validação de duplicidade nem de formato.** É possível cadastrar o mesmo pecuarista (mesmo CPF/CNPJ) várias vezes, e CPF/CNPJ não é validado. Usar o documento normalizado como ID do pecuarista, ou checar antes de inserir.
- [ ] 🟡 **Sem trilha de auditoria.** Registrar `criadoPor` (uid) e `atualizadoEm` em todas as coleções.
- [ ] 🟡 **Regra de negócio fixa no código: 1 arroba = 30 kg.** Isso aparece em `js/painel.js:194` e `:224`. É a convenção para peso vivo (com 50% de rendimento). A arroba de carcaça é 15 kg. Confirmar com o negócio e transformar em constante nomeada e documentada.
- [ ] 🟢 Script de migração único para converter os romaneios atuais (strings → números, nome → ID), rodando no ambiente de dev antes (Etapa 1).

---

## Etapa 5 — Refatoração do código 🟡

Objetivo: código que dá para evoluir sem quebrar. Fazer **depois** das Etapas 2–4 ou junto com elas, tela por tela.

- [ ] 🟡 **Módulos compartilhados para lógica repetida:**
  - `js/lib/auth-guard.js`: checagem de login e perfil (hoje copiada em 2 páginas);
  - `js/lib/ibge.js`: estados e cidades (copiado em 2 páginas, com cache);
  - `js/lib/formatos.js`: data `AAAA-MM-DD → DD/MM/AAAA` (repetida 5 vezes) e moeda BRL;
  - `js/lib/calculos.js`: valor total e comissão. Hoje `calcularComissao` **recalcula** o valor total copiando a fórmula de `calcularValorTotal` (`js/painel.js:182-233`).
- [ ] 🟡 **Tirar os eventos do HTML.** Há 37 atributos `onclick`/`onchange`/`oninput`/`onkeyup` nas páginas, e por isso as funções precisam ser globais (`window.xxx`). Usar `addEventListener` no JS. Isso também é pré-requisito para uma Content-Security-Policy.
- [x] 🟡 **Tirar os estilos do HTML.** Há 46 atributos `style="..."` (25 no painel, 19 no escritório, 2 no login), e vários se repetem (`h4` cinza, caixa de formulário `#f9f9f9`, campos de total). Transformar em classes no CSS. ✅ *Feito no redesign: restam só os `display:none` que o JS controla.*
- [ ] 🟡 **Renderização das tabelas.** `innerHTML +=` dentro de laços (`js/escritorio.js:40-41`, `:49`, `:64`, `:112`, `:130`, `:169`, `js/painel.js:29`, `:163`, `:362`) recria a tabela inteira a cada linha: fica lento com muitos registros e, junto com a Etapa 2, é a origem do XSS. Montar com `DocumentFragment`/`createElement`.
- [ ] 🟢 Estado global solto (`pecuaristasGlobais`, `romaneiosGlobais`, etc.) → um objeto de estado por página.
- [ ] 🟢 Firebase SDK fixo em `10.12.2` via CDN em 4 arquivos. Centralizar a versão (re-exportar pelo `js/firebase.js`) e atualizar.
- [ ] 🟢 (Opcional, mais à frente) Adotar o **Vite** como bundler: dev server com recarga automática, variáveis de ambiente para dev/prod, SDK via npm e build otimizado.

---

## Etapa 6 — UX e acessibilidade 🟢

- [ ] 🟡 **Funcionalidades que faltam:** não dá para **editar nem excluir** romaneios, pecuaristas ou destinos. Também não existe tela para **aprovar contas do escritório**: hoje é preciso editar o Firestore à mão.
- [ ] 🟡 Escritório: busca e filtros (data, comprador, pecuarista, destino) no histórico geral, além de totais (cabeças, peso, valor) dos filtrados.
- [ ] 🟢 Trocar `alert()` por mensagens na própria tela (toasts e erros ao lado do campo). Em especial o `alert` disparado no `blur` do autocomplete (`js/painel.js:76-81`), que interrompe a digitação.
- [x] 🟢 `<label>` sem `for`/`id` em todos os formulários: o leitor de tela não associa label e campo, e clicar no texto não foca o campo. ✅ *Feito no redesign.*
- [x] 🟢 As abas do login são `<div onclick>` (`index.html:18-19`): não funcionam pelo teclado. Usar `<button>` com `role="tab"`. ✅ *Feito: viraram `<button role="tab">`.*
- [x] 🟢 O botão "ROMANEIO INDIVIDUAL" abre a tela de **pesagem**. Revisar os nomes do menu do comprador. ✅ *Feito: menu com "Novo romaneio", "Pesagem individual" e "Meu histórico", com item ativo destacado.*
- [ ] 🟢 Estados de carregando, vazio e erro consistentes em todas as listas. 🟡 *Parcial: carregando/vazio padronizados; estados de erro dependem da Etapa 3 (callbacks de erro do `onSnapshot`).*
- [x] 🟢 Favicon e `<meta name="description">`. ✅ *Feito.*

---

## Etapa 7 — Performance e custo 🟢

- [ ] 🟡 **Listeners em coleções inteiras sem limite.** O escritório escuta todos os `romaneios` e o comprador escuta todos os `pecuaristas`. O Firestore cobra cada documento lido, e cada alteração reenvia dados para todos os painéis abertos. Paginar (`limit` + "carregar mais") ou filtrar por período.
- [x] 🟢 **Logo grande demais.** `assets/img/logo-gvq.png` tem 1465 px de largura e 73 KB, mas é exibida com 35–180 px. Gerar versões menores ou SVG/WebP. ✅ *Feito: logo de 720 px, versão negativa para fundo escuro, símbolo e favicon em `assets/img/`.*
- [ ] 🟢 Estados e cidades do IBGE são baixados a cada acesso. Cachear (`sessionStorage`) ou guardar os estados num JSON local em `assets/data/`.
- [ ] 🟢 Lista de bancos fixa e com nomes imprecisos (`js/escritorio.js:9-16`, ex.: "NUBANK", "BANCO SICOOB S.A."). Usar a lista oficial (BrasilAPI `/banks/v1` ou um JSON em `assets/data/`).

---

## Etapa 8 — Qualidade e processo 🟢

- [ ] 🟡 **Testes** para as funções puras extraídas na Etapa 5 (cálculos de valor/comissão, geração de login, formatação, CSV), com `node --test` ou Vitest.
- [ ] 🟢 **Padronização:** `.editorconfig`, `.gitattributes` (o repo hoje mistura CRLF/LF conforme a máquina), Prettier e ESLint.
- [ ] 🟢 **CI no GitHub Actions:** lint + testes a cada PR. Deploy automático (Firebase Hosting) ao fazer merge na `main`.
- [ ] 🟢 **Fluxo de trabalho:** branch por tarefa + Pull Request. Proteger a `main`.
- [ ] 🟢 Documentar no README as coleções do Firestore e seus campos (o "contrato" de dados).

---

## Ordem sugerida

| # | Etapa | Por quê nesta ordem |
|---|---|---|
| 0 | Organização em pastas | ✅ Feita |
| 0.5 | Identidade visual | ✅ Feita |
| 1 | Ambiente de dev | Sem isso, qualquer teste das próximas etapas mexe em produção |
| 2 | Segurança | Riscos reais hoje; as regras exigem decidir o modelo de perfis |
| 3 | Bugs funcionais | Perda de anexos e dados errados afetam a operação |
| 4 | Modelo de dados | Fazer junto com a Etapa 2 (as regras usam `compradorUid`) e antes de os dados crescerem |
| 5 | Refatoração | Facilita 6–8; pode ser feita aos poucos, tela por tela |
| 6–8 | UX, performance, processo | Incrementais |
