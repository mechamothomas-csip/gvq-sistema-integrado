import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase.js";

let pecuaristasGlobais = [];
let destinosGlobais = [];
let cidadesEstadoGlobais = [];
let pesosAdicionadosGlobais = []; 
let totalCamposPeso = 50; 
let nomeCompradorLogado = "";
let arquivosFilaGlobais = [];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        nomeCompradorLogado = localStorage.getItem('gvq_sistema_logado') || 'Comprador';
        document.getElementById('nome-usuario').innerText = 'Olá, ' + nomeCompradorLogado.split(' ')[0];
        
        gerarGrelhaPesosInit();
        
        // INICIALIZA OS AUTOCOMPLETES VERTICAIS
        configurarAutocomplete('rom_cidade', 'lista_cidades_ui', () => cidadesEstadoGlobais, () => {});
        configurarAutocomplete('rom_fazenda_destino', 'lista_destinos_ui', () => destinosGlobais.map(d => d.nome), window.preencherDestino);
        configurarAutocomplete('rom_busca_pec', 'lista_pecuaristas_ui', () => pecuaristasGlobais.map(p => p.nome), window.preencherPecuarista);

        try {
            let res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
            let estados = await res.json();
            let ufSelect = document.getElementById('rom_uf');
            estados.forEach(e => ufSelect.innerHTML += `<option value="${e.sigla}">${e.nome}</option>`);
        } catch(e) { console.log('Erro IBGE'); }

        puxarPecuaristasDaNuvem();
        puxarDestinosDaNuvem(); 
        puxarHistoricoDaNuvem();
    } else {
        window.location.href = '../index.html';
    }
});

// ===============================================
// SISTEMA DE AUTOCOMPLETE VERTICAL
// ===============================================
function configurarAutocomplete(inputId, listDivId, getOpcoesArray, onSelectCallback) {
    const input = document.getElementById(inputId);
    const listDiv = document.getElementById(listDivId);

    function renderizarLista(filtro = '') {
        let opcoes = getOpcoesArray();
        listDiv.innerHTML = '';
        
        let filtrados = opcoes.filter(o => o.toLowerCase().includes(filtro.toLowerCase()));
        
        if(filtrados.length === 0) {
            listDiv.style.display = 'none';
            return;
        }

        filtrados.forEach(opc => {
            let div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerText = opc;
            div.onmousedown = function(e) { 
                e.preventDefault(); 
                input.value = opc;
                listDiv.style.display = 'none';
                if(onSelectCallback) onSelectCallback();
            };
            listDiv.appendChild(div);
        });
        listDiv.style.display = 'block';
    }

    input.addEventListener('input', () => renderizarLista(input.value));
    input.addEventListener('focus', () => renderizarLista(input.value));
    
    input.addEventListener('blur', () => {
        listDiv.style.display = 'none';
        setTimeout(() => {
            let opcoes = getOpcoesArray();
            if(input.value && !opcoes.includes(input.value)) {
                alert("Atenção: Selecione uma opção válida da lista.");
                input.value = '';
                if(onSelectCallback) onSelectCallback();
            }
        }, 150);
    });
}

window.carregarCidades = async function() {
    let uf = document.getElementById('rom_uf').value;
    let inputCidade = document.getElementById('rom_cidade');
    inputCidade.value = ''; inputCidade.placeholder = 'Carregando cidades...';
    cidadesEstadoGlobais = [];
    try {
        let res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
        let cidades = await res.json();
        inputCidade.placeholder = 'Digite a cidade da compra...';
        cidadesEstadoGlobais = cidades.map(c => c.nome);
    } catch(e) { inputCidade.placeholder = 'Erro ao carregar'; }
}

function puxarDestinosDaNuvem() {
    const qDest = query(collection(db, "destinos"), orderBy("nome", "asc"));
    onSnapshot(qDest, (snapshot) => {
        destinosGlobais = [];
        snapshot.forEach((doc) => { destinosGlobais.push(doc.data()); });
        document.getElementById('rom_fazenda_destino').placeholder = "Digite o nome da fazenda...";
    });
}

window.preencherDestino = function() {
    let nomeDestino = document.getElementById('rom_fazenda_destino').value;
    let f = destinosGlobais.find(dest => dest.nome === nomeDestino);
    if(f) {
        document.getElementById('rom_cidade_destino').value = f.cidade || '';
        document.getElementById('rom_uf_destino').value = f.estado || '';
    } else {
        document.getElementById('rom_cidade_destino').value = ''; 
        document.getElementById('rom_uf_destino').value = '';
    }
}

function puxarPecuaristasDaNuvem() {
    const qPec = query(collection(db, "pecuaristas"), orderBy("nome", "asc"));
    onSnapshot(qPec, (snapshot) => {
        pecuaristasGlobais = [];
        snapshot.forEach((doc) => { pecuaristasGlobais.push(doc.data()); });
        document.getElementById('rom_busca_pec').placeholder = "Digite o nome do pecuarista...";
    });
}

window.preencherPecuarista = function() {
    let nomeBuscado = document.getElementById('rom_busca_pec').value;
    let p = pecuaristasGlobais.find(pec => pec.nome === nomeBuscado);
    if(p) {
        document.getElementById('pec_nome').value = p.nome || ''; document.getElementById('pec_doc').value = p.documento || '';
        document.getElementById('pec_banco').value = p.banco || ''; document.getElementById('pec_agencia').value = p.agencia || '';
        document.getElementById('pec_conta').value = p.conta || '';
    } else {
        document.getElementById('pec_nome').value = ''; document.getElementById('pec_doc').value = '';
        document.getElementById('pec_banco').value = ''; document.getElementById('pec_agencia').value = '';
        document.getElementById('pec_conta').value = '';
    }
}

window.adicionarAnexosFila = function(event) {
    let files = event.target.files;
    for(let i = 0; i < files.length; i++) { arquivosFilaGlobais.push(files[i]); }
    event.target.value = ''; 
    renderizarFilaArquivos();
}

window.removerAnexoFila = function(index) {
    arquivosFilaGlobais.splice(index, 1);
    renderizarFilaArquivos();
}

function renderizarFilaArquivos() {
    let divUi = document.getElementById('lista-arquivos-ui');
    divUi.innerHTML = '';
    arquivosFilaGlobais.forEach((file, index) => {
        let tamanhoMB = (file.size / (1024 * 1024)).toFixed(2);
        divUi.innerHTML += `
            <div class="item-anexo">
                <span>📎 <strong>${file.name}</strong> <span style="color:#888;">(${tamanhoMB} MB)</span></span>
                <button type="button" class="btn-remover-anexo" onclick="removerAnexoFila(${index})" title="Remover Arquivo">X</button>
            </div>
        `;
    });
}

window.sair = function() { signOut(auth).then(() => { localStorage.clear(); window.location.href = '../index.html'; }); }

window.verificarRacaOutra = function() {
    let select = document.getElementById('rom_raca');
    let inputOutro = document.getElementById('rom_raca_outra');
    if(select.value === 'outro') { inputOutro.style.display = 'block'; inputOutro.required = true; } 
    else { inputOutro.style.display = 'none'; inputOutro.required = false; inputOutro.value = ''; }
}

window.calcularComissao = function() {
    let tipo = document.getElementById('rom_tipo_comissao').value;
    let base = parseFloat(document.getElementById('rom_valor_comissao').value) || 0;
    let cabecas = parseInt(document.getElementById('rom_cabecas').value) || 0;
    
    let preco = parseFloat(document.getElementById('rom_preco').value) || 0;
    let unidade = document.getElementById('rom_unidade_preco').value;
    let pesoTotal = parseFloat(document.getElementById('rom_peso_total').value) || 0;
    let valorTotalGado = 0;
    
    if (preco > 0) {
        if (unidade === 'Por Kg') valorTotalGado = preco * pesoTotal;
        else if (unidade === 'Por Arroba') valorTotalGado = (pesoTotal / 30) * preco;
        else if (unidade === 'Por Cabeça') valorTotalGado = preco * cabecas;
    }

    let totalComissao = 0;
    if(tipo === 'Fixo') {
        totalComissao = base;
    } else if (tipo === 'Por Cabeça') {
        totalComissao = base * cabecas;
    } else if (tipo === '% do Romaneio') {
        totalComissao = valorTotalGado * (base / 100);
    }

    let campoTotal = document.getElementById('rom_total_comissao');
    if (totalComissao > 0) {
        campoTotal.value = totalComissao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else {
        campoTotal.value = '';
    }
}

window.calcularValorTotal = function() {
    let preco = parseFloat(document.getElementById('rom_preco').value) || 0;
    let unidade = document.getElementById('rom_unidade_preco').value;
    let pesoTotal = parseFloat(document.getElementById('rom_peso_total').value) || 0;
    let cabecas = parseInt(document.getElementById('rom_cabecas').value) || 0;
    let valorTotal = 0;

    if (preco > 0) {
        if (unidade === 'Por Kg') valorTotal = preco * pesoTotal;
        else if (unidade === 'Por Arroba') valorTotal = (pesoTotal / 30) * preco;
        else if (unidade === 'Por Cabeça') valorTotal = preco * cabecas;
    }

    let campoValor = document.getElementById('rom_valor_total');
    if (valorTotal > 0) campoValor.value = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    else campoValor.value = '';

    window.calcularComissao();
}

window.mostrarTelaPesagem = function() { document.getElementById('tela-principal').style.display = 'none'; document.getElementById('tela-historico').style.display = 'none'; document.getElementById('tela-pesagem').style.display = 'block'; window.scrollTo(0, 0); }
window.mostrarTelaHistorico = function() { document.getElementById('tela-principal').style.display = 'none'; document.getElementById('tela-pesagem').style.display = 'none'; document.getElementById('tela-historico').style.display = 'block'; window.scrollTo(0, 0); }
window.voltarTelaPrincipal = function() { document.getElementById('tela-pesagem').style.display = 'none'; document.getElementById('tela-historico').style.display = 'none'; document.getElementById('tela-principal').style.display = 'block'; window.scrollTo(0, 0); }

function gerarGrelhaPesosInit() {
    let grid = document.getElementById('grid-inputs');
    grid.innerHTML = ''; totalCamposPeso = 50; let html = '';
    for(let i=1; i<=totalCamposPeso; i++) { html += `<div class="peso-box"><div class="peso-num">${i}</div><input type="number" step="0.01" class="peso-input" id="peso_ind_${i}" oninput="calcularTotaisGrid()"></div>`; }
    grid.insertAdjacentHTML('beforeend', html);
}

window.adicionarMais50 = function() {
    let inicio = totalCamposPeso + 1; totalCamposPeso += 50; 
    let grid = document.getElementById('grid-inputs'); let html = '';
    for(let i = inicio; i <= totalCamposPeso; i++) { html += `<div class="peso-box"><div class="peso-num">${i}</div><input type="number" step="0.01" class="peso-input" id="peso_ind_${i}" oninput="calcularTotaisGrid()"></div>`; }
    grid.insertAdjacentHTML('beforeend', html);
}

window.calcularTotaisGrid = function() {
    let totalPeso = 0; let totalCabecas = 0;
    for(let i=1; i<=totalCamposPeso; i++) {
        let input = document.getElementById(`peso_ind_${i}`);
        if(input && input.value && parseFloat(input.value) > 0) { totalPeso += parseFloat(input.value); totalCabecas++; }
    }
    document.getElementById('grid_lbl_cab').innerText = totalCabecas; document.getElementById('grid_lbl_peso').innerText = totalPeso.toFixed(2);
}

window.salvarPesosGrid = function() {
    let cabecas = 0; let peso = 0; pesosAdicionadosGlobais = []; 
    for(let i=1; i<=totalCamposPeso; i++) {
        let input = document.getElementById(`peso_ind_${i}`);
        if(input && input.value) {
            let val = parseFloat(input.value);
            if(val > 0) { peso += val; cabecas++; pesosAdicionadosGlobais.push(val); }
        }
    }
    document.getElementById('grid_lbl_cab').innerText = cabecas; document.getElementById('grid_lbl_peso').innerText = peso.toFixed(2);
    if(cabecas > 0) { document.getElementById('rom_cabecas').value = cabecas; document.getElementById('rom_peso_total').value = peso.toFixed(2); window.calcularValorTotal(); }
    window.voltarTelaPrincipal();
}

document.getElementById('form-romaneio').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let btn = document.getElementById('btn-registrar');
    btn.innerText = "Salvando registro no banco...";
    btn.disabled = true;

    let racaFinal = document.getElementById('rom_raca').value;
    if(racaFinal === 'outro') racaFinal = document.getElementById('rom_raca_outra').value;
    let nomeDestino = document.getElementById('rom_fazenda_destino').value;

    try {
        let nomesArquivos = [];
        for (let i = 0; i < arquivosFilaGlobais.length; i++) {
            nomesArquivos.push(arquivosFilaGlobais[i].name);
        }

        await addDoc(collection(db, "romaneios"), {
            comprador: nomeCompradorLogado,
            estado: document.getElementById('rom_uf').value,
            cidade: document.getElementById('rom_cidade').value,
            fazendaDestino: nomeDestino,
            cidadeDestino: document.getElementById('rom_cidade_destino').value,
            ufDestino: document.getElementById('rom_uf_destino').value,
            pecuarista: document.getElementById('pec_nome').value,
            
            dataCompra: document.getElementById('rom_data_compra').value,
            dataPagamento: document.getElementById('rom_data_pag').value,
            
            cabecas: document.getElementById('rom_cabecas').value,
            pesoTotal: document.getElementById('rom_peso_total').value,
            sexo: document.getElementById('rom_sexo').value,
            
            precoUnitario: document.getElementById('rom_preco').value,
            unidadePreco: document.getElementById('rom_unidade_preco').value,
            valorTotalGado: document.getElementById('rom_valor_total').value,
            raca: racaFinal,
            
            corretor: document.getElementById('rom_corretor').value,
            tipoComissao: document.getElementById('rom_tipo_comissao').value,
            valorComissao: document.getElementById('rom_valor_comissao').value,
            totalComissao: document.getElementById('rom_total_comissao').value,
            
            observacoes: document.getElementById('rom_obs').value,
            anexos: nomesArquivos, 
            pesosIndividuais: pesosAdicionadosGlobais,
            timestamp: serverTimestamp() 
        });

        alert('Embarque registrado com sucesso!');
        document.getElementById('form-romaneio').reset();
        
        pesosAdicionadosGlobais = [];
        arquivosFilaGlobais = [];
        renderizarFilaArquivos(); 
        document.getElementById('rom_total_comissao').value = ''; 
        window.scrollTo(0, 0);

    } catch(error) {
        alert("Erro ao salvar: " + error.message);
    } finally {
        btn.innerText = "🚀 Registrar Embarque";
        btn.disabled = false;
    }
});

let historicoDesteComprador = [];
function puxarHistoricoDaNuvem() {
    const q = query(collection(db, "romaneios"), where("comprador", "==", nomeCompradorLogado));
    onSnapshot(q, (snapshot) => {
        historicoDesteComprador = [];
        snapshot.forEach((doc) => { historicoDesteComprador.push(doc.data()); });
        historicoDesteComprador.sort((a, b) => { let dA = a.dataCompra || ""; let dB = b.dataCompra || ""; return dB.localeCompare(dA); });
        renderizarHistorico(historicoDesteComprador);
    });
}

function renderizarHistorico(lista) {
    let tbody = document.getElementById('tbody-historico');
    tbody.innerHTML = '';
    if (lista.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Nenhuma compra encontrada.</td></tr>'; return; }
    lista.forEach(r => {
        let dataF = r.dataCompra ? r.dataCompra.split('-').reverse().join('/') : '-';
        tbody.innerHTML += `<tr><td><strong>${dataF}</strong></td><td>${r.pecuarista}</td><td>${r.cidade}-${r.estado}</td><td>${r.fazendaDestino || '-'}</td><td>${r.cabecas} cbç / ${r.pesoTotal} kg</td></tr>`;
    });
}

window.filtrarHistorico = function() {
    let dataExata = document.getElementById('filtro_data').value;
    let mesAno = document.getElementById('filtro_mes').value;
    let listaFiltrada = historicoDesteComprador;
    if(dataExata) { document.getElementById('filtro_mes').value = ''; listaFiltrada = historicoDesteComprador.filter(r => r.dataCompra === dataExata); } 
    else if(mesAno) { listaFiltrada = historicoDesteComprador.filter(r => r.dataCompra && r.dataCompra.startsWith(mesAno)); }
    renderizarHistorico(listaFiltrada);
}
window.limparFiltrosHistorico = function() { document.getElementById('filtro_data').value = ''; document.getElementById('filtro_mes').value = ''; renderizarHistorico(historicoDesteComprador); }
