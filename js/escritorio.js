import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase.js";

let pecuaristasGlobais = [];
let destinosGlobais = [];
let romaneiosGlobais = [];

const bancosBrasileiros = [
    "BANCO DO BRASIL S.A. - 001", "CAIXA ECONOMICA FEDERAL - 104", "BANCO BRADESCO S.A. - 237",
    "ITAÚ UNIBANCO S.A. - 341", "BANCO SANTANDER (BRASIL) S.A. - 033", "BANCO SICOOB S.A. - 756",
    "BANCO SICREDI S.A. - 748", "NUBANK - 260", "BANCO INTER S.A. - 077", "C6 BANK - 336",
    "BANCO BTG PACTUAL S.A. - 208", "BANCO SAFRA S.A. - 422", "BANCO ORIGINAL S.A. - 212",
    "BANCO PAN S.A. - 623", "BANCO MERCANTIL DO BRASIL S.A. - 389", "BANCO NORDESTE DO BRASIL S.A. - 004",
    "BANCO DA AMAZONIA S.A. - 003", "BRB - BANCO DE BRASILIA S.A. - 070"
];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        let logado = localStorage.getItem('gvq_sistema_logado') || 'Escritório';
        document.getElementById('nome-usuario').innerText = 'Olá, ' + logado.split(' ')[0];
        
        carregarEstadosIniciais();
        preencherListaBancos();
        iniciarSincronizacaoEmTempoReal();
    } else {
        window.location.href = '../index.html';
    }
});

async function carregarEstadosIniciais() {
    try {
        let res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        let estados = await res.json();
        let ufSelectPec = document.getElementById('novo_pec_uf');
        let ufSelectDest = document.getElementById('novo_dest_uf');
        
        estados.forEach(e => {
            let option = `<option value="${e.sigla}">${e.nome}</option>`;
            ufSelectPec.innerHTML += option;
            ufSelectDest.innerHTML += option;
        });
    } catch(e) { console.log('Erro ao carregar IBGE'); }
}

function preencherListaBancos() {
    let dataList = document.getElementById('lista_bancos');
    bancosBrasileiros.forEach(banco => {
        dataList.innerHTML += `<option value="${banco}">`;
    });
}

window.carregarCidades = async function(idUf, idDataList, idInputCidade) {
    let uf = document.getElementById(idUf).value;
    let inputCidade = document.getElementById(idInputCidade);
    let dataList = document.getElementById(idDataList);
    
    inputCidade.value = ''; inputCidade.placeholder = 'Carregando cidades...'; dataList.innerHTML = '';
    
    try {
        let res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
        let cidades = await res.json();
        inputCidade.placeholder = 'Digite e selecione a cidade...';
        cidades.forEach(c => dataList.innerHTML += `<option value="${c.nome}">`);
    } catch(e) { inputCidade.placeholder = 'Erro ao carregar cidades'; }
}

window.validarSelecaoDaLista = function(inputElement, dataListId) {
    if (!inputElement.value) return; 
    let dataList = document.getElementById(dataListId);
    let options = dataList.options;
    let valorValido = false;
    for (let i = 0; i < options.length; i++) {
        if (inputElement.value === options[i].value) { valorValido = true; break; }
    }
    if (!valorValido) {
        alert("Atenção: Selecione uma opção válida da lista fornecida.");
        inputElement.value = ''; inputElement.focus();
    }
}

window.mostrarTela = function(telaId) {
    document.getElementById('tela-romaneios').style.display = 'none';
    document.getElementById('tela-pecuaristas').style.display = 'none';
    document.getElementById('tela-destinos').style.display = 'none';
    
    document.querySelectorAll('.aba-menu').forEach(b => b.classList.remove('ativa'));

    document.getElementById(`tela-${telaId}`).style.display = 'block';
    document.getElementById(`btn-tab-${telaId}`).classList.add('ativa');
}

window.sair = function() {
    signOut(auth).then(() => { localStorage.clear(); window.location.href = '../index.html'; });
}

function iniciarSincronizacaoEmTempoReal() {
    const qPec = query(collection(db, "pecuaristas"), orderBy("nome", "asc"));
    onSnapshot(qPec, (snapshot) => {
        pecuaristasGlobais = [];
        let tbody = document.getElementById('tbody-pecuaristas');
        tbody.innerHTML = '';
        
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">Nenhum pecuarista no banco de dados.</td></tr>';
        } else {
            snapshot.forEach((doc) => {
                let p = doc.data();
                pecuaristasGlobais.push(p);
                let localF = (p.cidade && p.estado) ? `${p.cidade} - ${p.estado}` : '-';
                tbody.innerHTML += `<tr><td><strong>${p.nome}</strong></td><td>${p.documento || '-'}</td><td>${localF}</td><td>${p.banco || '-'}</td><td>${p.agencia || '-'}</td><td>${p.conta || '-'}</td></tr>`;
            });
        }
    });

    const qDest = query(collection(db, "destinos"), orderBy("nome", "asc"));
    onSnapshot(qDest, (snapshot) => {
        destinosGlobais = [];
        let tbody = document.getElementById('tbody-destinos');
        tbody.innerHTML = '';
        
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888;">Nenhuma fazenda destino cadastrada.</td></tr>';
        } else {
            snapshot.forEach((doc) => {
                let d = doc.data();
                destinosGlobais.push(d);
                let localF = (d.cidade && d.estado) ? `${d.cidade} - ${d.estado}` : '-';
                tbody.innerHTML += `<tr><td><strong>${d.nome}</strong></td><td>${localF}</td></tr>`;
            });
        }
    });

    const qRom = query(collection(db, "romaneios")); 
    onSnapshot(qRom, (snapshot) => {
        romaneiosGlobais = [];
        let tbody = document.getElementById('tbody-romaneios');
        tbody.innerHTML = '';

        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; color:#888; font-style: italic; padding: 20px;">Nenhum romaneio registrado ainda.</td></tr>';
        } else {
            snapshot.forEach((docSnap) => {
                let r = docSnap.data();
                r.id = docSnap.id; 
                romaneiosGlobais.push(r);
            });

            romaneiosGlobais.reverse().forEach(r => {
                let dataF = r.dataCompra ? r.dataCompra.split('-').reverse().join('/') : '-';
                
                let anexosVisual = '-';
                if (r.anexosLinks && r.anexosLinks.length > 0) {
                    anexosVisual = r.anexosLinks.map(a => `<a href="${a.urlDownload}" target="_blank" class="tag-anexo">📎 ${a.nomeArquivo}</a>`).join('<br>');
                } else if (r.anexos && r.anexos.length > 0) {
                    anexosVisual = r.anexos.map(n => `<span class="tag-anexo">📎 ${n}</span>`).join('<br>');
                }

                let valorGado = r.valorTotalGado ? `<span style="color:var(--verde-gvq); font-weight:bold;">${r.valorTotalGado}</span>` : '-';
                let precoStr = r.precoUnitario ? `R$ ${r.precoUnitario} (${r.unidadePreco})` : '-';
                
                let comissaoStr = '-';
                if (r.tipoComissao && r.tipoComissao !== 'Nenhuma') {
                    let totalVal = r.totalComissao ? r.totalComissao : `R$ ${r.valorComissao}`;
                    comissaoStr = `<strong>${totalVal}</strong><br><span style="font-size:11px;color:#555;">(${r.tipoComissao})</span>`;
                }
                
                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: center;"><input type="checkbox" class="chk-export" value="${r.id}"></td>
                        <td><strong>${dataF}</strong></td>
                        <td>${(r.comprador || '').split(' ')[0]}</td>
                        <td>${r.pecuarista}</td>
                        <td>${r.cidade}-${r.estado}</td>
                        <td>${r.fazendaDestino || '-'}</td>
                        <td><strong>${r.cabecas}</strong></td>
                        <td>${r.pesoTotal}</td>
                        <td>${r.raca || '-'}</td>
                        <td>${precoStr}</td>
                        <td>${valorGado}</td>
                        <td>${comissaoStr}</td>
                        <td>${anexosVisual}</td>
                    </tr>
                `;
            });
        }
    });
}

window.adicionarPecuarista = async function() {
    let nomeInput = document.getElementById('novo_pec_nome');
    let nome = nomeInput.value.trim();
    if(!nome) return alert('Digite o nome do pecuarista.');
    
    let btn = document.getElementById('btn-salvar-pec');
    btn.innerText = "Salvando no banco...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "pecuaristas"), {
            nome: nome.toUpperCase(),
            documento: document.getElementById('novo_pec_doc').value.trim(),
            estado: document.getElementById('novo_pec_uf').value,
            cidade: document.getElementById('novo_pec_cidade').value.trim(),
            banco: document.getElementById('novo_pec_banco').value.trim(),
            agencia: document.getElementById('novo_pec_agencia').value.trim(),
            conta: document.getElementById('novo_pec_conta').value.trim(),
            timestamp: serverTimestamp()
        });
        
        document.querySelectorAll('.form-grid-4 input, .form-grid-4 select, .form-grid-3 input').forEach(i => i.value = '');
        document.getElementById('lista_cidades_pec').innerHTML = ''; 
        alert('Pecuarista cadastrado com sucesso!');
        
    } catch (error) {
        alert("Ocorreu um erro ao salvar: " + error.message);
    } finally {
        btn.innerText = "+ Salvar Pecuarista no Banco";
        btn.disabled = false;
    }
}

window.adicionarDestino = async function() {
    let nomeInput = document.getElementById('novo_dest_nome');
    let nome = nomeInput.value.trim();
    let uf = document.getElementById('novo_dest_uf').value;
    let cidade = document.getElementById('novo_dest_cidade').value.trim();

    if(!nome || !uf || !cidade) return alert('Preencha o Nome, Estado e Cidade do destino.');
    
    let btn = document.getElementById('btn-salvar-dest');
    btn.innerText = "Salvando no banco...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "destinos"), {
            nome: nome.toUpperCase(),
            estado: uf,
            cidade: cidade,
            timestamp: serverTimestamp()
        });
        
        document.getElementById('novo_dest_nome').value = '';
        document.getElementById('novo_dest_uf').value = '';
        document.getElementById('novo_dest_cidade').value = '';
        document.getElementById('lista_cidades_dest').innerHTML = ''; 
        alert('Fazenda Destino cadastrada com sucesso!');
        
    } catch (error) {
        alert("Ocorreu um erro ao salvar: " + error.message);
    } finally {
        btn.innerText = "+ Salvar Destino no Banco";
        btn.disabled = false;
    }
}

function baixarCSV(conteudoCSV, nomeArquivo) {
    let blob = new Blob(["\uFEFF" + conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a");
    let url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", nomeArquivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.exportarExcelGeral = function() {
    if(romaneiosGlobais.length === 0) return alert('Nenhum romaneio para exportar.');
    
    let selecionados = Array.from(document.querySelectorAll('.chk-export:checked')).map(cb => cb.value);
    if(selecionados.length === 0) return alert('Por favor, marque as caixinhas na primeira coluna da tabela para escolher quais compras exportar.');

    let romaneiosExport = romaneiosGlobais.filter(r => selecionados.includes(r.id));

    let csv = "ID Registro;Data Compra;Data Pagamento;Comprador;Pecuarista;UF Origem;Cidade Origem;Fazenda Destino;Cidade Destino;UF Destino;Raça;Sexo;Cabeças;Peso Total (kg);Preço Unitário;Unidade Preço;Valor Total Gado;Corretor;Tipo Comissão;Base Comissão;Total Comissão;Observações\n";
    
    romaneiosExport.forEach(r => {
        let dataF = r.dataCompra ? r.dataCompra.split('-').reverse().join('/') : '-';
        let dataP = r.dataPagamento ? r.dataPagamento.split('-').reverse().join('/') : '-';
        let obs = r.observacoes ? r.observacoes.replace(/\n/g, " ") : "-";
        
        csv += `${r.id};${dataF};${dataP};${r.comprador};${r.pecuarista};${r.estado};${r.cidade};${r.fazendaDestino || '-'};${r.cidadeDestino || '-'};${r.ufDestino || '-'};${r.raca || '-'};${r.sexo || '-'};${r.cabecas};${r.pesoTotal};${r.precoUnitario || '-'};${r.unidadePreco || '-'};${r.valorTotalGado || '-'};${r.corretor || '-'};${r.tipoComissao || '-'};${r.valorComissao || '-'};${r.totalComissao || '-'};${obs}\n`;
    });
    baixarCSV(csv, "GVQ_Relatorio_Compras.csv");
}

window.exportarExcelPesos = function() {
    if(romaneiosGlobais.length === 0) return alert('Nenhum romaneio para exportar.');
    
    let selecionados = Array.from(document.querySelectorAll('.chk-export:checked')).map(cb => cb.value);
    if(selecionados.length === 0) return alert('Por favor, marque as caixinhas na primeira coluna da tabela para escolher de quais compras deseja exportar os pesos.');

    let romaneiosExport = romaneiosGlobais.filter(r => selecionados.includes(r.id));

    let csv = "ID Romaneio;Data Compra;Pecuarista;Comprador;Número do Animal;Peso (kg)\n";
    let temPesos = false;
    romaneiosExport.forEach(r => {
        let dataF = r.dataCompra ? r.dataCompra.split('-').reverse().join('/') : '-';
        if(r.pesosIndividuais && r.pesosIndividuais.length > 0) {
            temPesos = true;
            r.pesosIndividuais.forEach((peso, index) => {
                csv += `${r.id};${dataF};${r.pecuarista};${r.comprador};Animal ${index + 1};${peso}\n`;
            });
        }
    });
    if(!temPesos) return alert('Nenhum peso individual registrado nas compras selecionadas.');
    baixarCSV(csv, "GVQ_Relatorio_Pesos.csv");
}
