const canvas = document.getElementById('canvas-jogo');
const ctx = canvas.getContext('2d');

// UI do Jogo
const menuInicial = document.getElementById('menu-inicial');
const hud = document.getElementById('hud');
const leaderboard = document.getElementById('leaderboard');
const listaLideres = document.getElementById('lista-lideres');
const btnIniciar = document.getElementById('btn-iniciar');
const btnSair = document.getElementById('btn-sair');
const scoreMassa = document.getElementById('massa-score');
const inputNome = document.getElementById('nome-jogador');

// ---- CONFIGURAÇÕES DA ARENA DO JOGO ----
const LARGURA_MAPA = 3000;
const ALTURA_MAPA = 3000;
const MAX_COMIDAS = 600;
const TOTAL_BOTS = 25;

const CORES = ['#ff1744', '#00e676', '#2979ff', '#ffea00', '#d500f9', '#ff9100', '#00e5ff', '#ff4081'];
const NOMES_BOTS = ['Poli', 'Alpha', 'WunWun', 'SplitMe', 'Blob', 'Doge', 'Sirius', 'Snape', 'Mars', 'Zeus', 'Titan', 'Apex', 'Shadow', 'Ghost'];

let jogoAtivo = false;
let idAnimacao;

// ---- ESTADOS E ENTIDADES ----
let jogador;
let comidas = [];
let bots = [];
let mouse = { x: 0, y: 0 };
let camera = { x: 0, y: 0 };

function ajustarTela() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', ajustarTela);
ajustarTela();

// ---- GERADORES DE ENTIDADES ----
function gerarCor() {
    return CORES[Math.floor(Math.random() * CORES.length)];
}

function gerarComida() {
    return {
        x: Math.random() * LARGURA_MAPA,
        y: Math.random() * ALTURA_MAPA,
        raio: 5,
        cor: gerarCor()
    };
}

function criarBot() {
    return {
        id: Math.random(),
        x: Math.random() * LARGURA_MAPA,
        y: Math.random() * ALTURA_MAPA,
        raio: Math.floor(Math.random() * 25) + 15, // Massa inicial aleatória para os bots
        cor: gerarCor(),
        nome: NOMES_BOTS[Math.floor(Math.random() * NOMES_BOTS.length)],
        alvoX: Math.random() * LARGURA_MAPA,
        alvoY: Math.random() * ALTURA_MAPA,
        tempoDecisao: 0
    };
}

// ---- INICIALIZADORES ----
function iniciarEstruturas() {
    comidas = Array.from({ length: MAX_COMIDAS }, gerarComida);
    bots = Array.from({ length: TOTAL_BOTS }, criarBot);
    
    jogador = {
        x: LARGURA_MAPA / 2,
        y: ALTURA_MAPA / 2,
        raio: 20,
        cor: '#00e5ff',
        nome: inputNome.value.trim() || 'Célula',
        morto: false
    };
}

// ---- MOVIMENTAÇÃO DE ACORDO COM A MASSA ----
function calcularVelocidade(raio) {
    // Regra oficial do Agar.io: Células maiores movem-se mais devagar
    return Math.max(1.0, 7 - (raio * 0.025));
}

// ---- LOGICA DOS BOTS (IA) ----
function atualizarIA(bot) {
    bot.tempoDecisao--;

    // A cada período, o bot decide um novo comportamento
    if (bot.tempoDecisao <= 0) {
        bot.tempoDecisao = Math.floor(Math.random() * 60) + 30; // Atualiza a cada 1 ou 2 segundos

        // 1. Verificar se há ameaças próximas (células maiores)
        let ameaca = null;
        let menorDistanciaAmeaca = 300;

        // Verificar o jogador como ameaça
        if (!jogador.morto && jogador.raio > bot.raio * 1.1) {
            let dist = Math.hypot(jogador.x - bot.x, jogador.y - bot.y);
            if (dist < menorDistanciaAmeaca) { ameaca = jogador; menorDistanciaAmeaca = dist; }
        }
        // Verificar outros bots como ameaça
        bots.forEach(outro => {
            if (outro.id !== bot.id && outro.raio > bot.raio * 1.1) {
                let dist = Math.hypot(outro.x - bot.x, outro.y - bot.y);
                if (dist < menorDistanciaAmeaca) { ameaca = outro; menorDistanciaAmeaca = dist; }
            }
        });

        // Se houver ameaça, correr para o lado oposto
        if (ameaca) {
            let dx = bot.x - ameaca.x;
            let dy = bot.y - ameaca.y;
            bot.alvoX = Math.max(0, Math.min(LARGURA_MAPA, bot.x + dx * 2));
            bot.alvoY = Math.max(0, Math.min(ALTURA_MAPA, bot.y + dy * 2));
            return;
        }

        // 2. Procurar por células menores próximas para caçar
        let presa = null;
        let menorDistanciaPresa = 250;

        if (!jogador.morto && bot.raio > jogador.raio * 1.1) {
            let dist = Math.hypot(jogador.x - bot.x, jogador.y - bot.y);
            if (dist < menorDistanciaPresa) { presa = jogador; menorDistanciaPresa = dist; }
        }
        bots.forEach(outro => {
            if (outro.id !== bot.id && bot.raio > outro.raio * 1.1) {
                let dist = Math.hypot(outro.x - bot.x, outro.y - bot.y);
                if (dist < menorDistanciaPresa) { presa = outro; menorDistanciaPresa = dist; }
            }
        });

        if (presa) {
            bot.alvoX = presa.x;
            bot.alvoY = presa.y;
            return;
        }

        // 3. Caso contrário, ir na direção da comida mais próxima
        if (comidas.length > 0) {
            let comidaProxima = comidas[0];
            let minDistComida = Math.hypot(comidaProxima.x - bot.x, comidaProxima.y - bot.y);
            
            // Amostragem aleatória de 15 comidas para não pesar o processador
            for (let i = 0; i < 15; i++) {
                let c = comidas[Math.floor(Math.random() * comidas.length)];
                let d = Math.hypot(c.x - bot.x, c.y - bot.y);
                if (d < minDistComida) {
                    minDistComida = d;
                    comidaProxima = c;
                }
            }
            bot.alvoX = comidaProxima.x;
            bot.alvoY = comidaProxima.y;
        }
    }

    // Mover o bot em direção ao alvo definido
    let dx = bot.alvoX - bot.x;
    let dy = bot.alvoY - bot.y;
    let dist = Math.hypot(dx, dy);

    if (dist > 5) {
        let vel = calcularVelocidade(bot.raio);
        bot.x += (dx / dist) * vel;
        bot.y += (dy / dist) * vel;
    }
}

// ---- LOOP PRINCIPAL DA SIMULAÇÃO ----
function loopDoJogo() {
    if (!jogoAtivo) return;

    // 1. Atualizar Física do Jogador (se estiver vivo)
    if (!jogador.morto) {
        // Conversão das coordenadas do mouse da tela para o Mundo Absoluto
        let mundoMouseX = mouse.x + camera.x;
        let mundoMouseY = mouse.y + camera.y;

        let dx = mundoMouseX - jogador.x;
        let dy = mundoMouseY - jogador.y;
        let dist = Math.hypot(dx, dy);

        if (dist > 5) {
            let vel = calcularVelocidade(jogador.raio);
            jogador.x += (dx / dist) * vel;
            jogador.y += (dy / dist) * vel;
        }

        // Restrição Física: Impedir o jogador de sair das bordas do quadrado do mapa
        jogador.x = Math.max(jogador.raio, Math.min(LARGURA_MAPA - jogador.raio, jogador.x));
        jogador.y = Math.max(jogador.raio, Math.min(ALTURA_MAPA - jogador.raio, jogador.y));

        scoreMassa.textContent = Math.floor(jogador.raio);

        // A Câmera se centraliza no Jogador
        camera.x = jogador.x - canvas.width / 2;
        camera.y = jogador.y - canvas.height / 2;
    } else {
        // Se morreu, a câmera foca no centro da arena ou vaga devagar
        camera.x += (LARGURA_MAPA / 2 - canvas.width / 2 - camera.x) * 0.02;
        camera.y += (ALTURA_MAPA / 2 - canvas.height / 2 - camera.y) * 0.02;
    }

    // 2. Atualizar Bots e colisão de bordas
    bots.forEach(bot => {
        atualizarIA(bot);
        bot.x = Math.max(bot.raio, Math.min(LARGURA_MAPA - bot.raio, bot.x));
        bot.y = Math.max(bot.raio, Math.min(ALTURA_MAPA - bot.raio, bot.y));
    });

    // 3. Sistema de Alimentação (Comidas vs Células)
    comidas = comidas.filter(comida => {
        // Jogador comendo nutriente
        if (!jogador.morto && Math.hypot(comida.x - jogador.x, comida.y - jogador.y) < jogador.raio) {
            jogador.raio += 0.25; // Crescimento gradual equilibrado
            return false;
        }
        // Bots comendo nutriente
        for (let bot of bots) {
            if (Math.hypot(comida.x - bot.x, comida.y - bot.y) < bot.raio) {
                bot.raio += 0.25;
                return false;
            }
        }
        return true;
    });

    // Repovoamento automático das comidas coletadas
    while (comidas.length < MAX_COMIDAS) comidas.push(gerarComida());

    // 4. Sistema de Combate e Abates (Célula vs Célula)
    // Combates entre os próprios bots
    for (let i = 0; i < bots.length; i++) {
        for (let j = i + 1; j < bots.length; j++) {
            let b1 = bots[i];
            let b2 = bots[j];
            let dist = Math.hypot(b1.x - b2.x, b1.y - b2.y);

            // Condição original: Uma célula precisa ser pelo menos 10% maior para absorver
            if (dist < b1.raio && b1.raio > b2.raio * 1.1) {
                b1.raio += b2.raio * 0.3; // Transfere fração de massa
                bots.splice(j, 1);
                j--;
            } else if (dist < b2.raio && b2.raio > b1.raio * 1.1) {
                b2.raio += b1.raio * 0.3;
                bots.splice(i, 1);
                i--;
                break;
            }
        }
    }

    // Combates envolvendo o Jogador Humano
    if (!jogador.morto) {
        bots = bots.filter(bot => {
            let dist = Math.hypot(jogador.x - bot.x, jogador.y - bot.y);

            // Jogador devora o bot
            if (dist < jogador.raio && jogador.raio > bot.raio * 1.1) {
                jogador.raio += bot.raio * 0.3;
                return false;
            }
            // Bot devora o jogador
            if (dist < bot.raio && bot.raio > jogador.raio * 1.1) {
                jogador.morto = true;
                alert("Você foi absorvido! Clique em Sair para voltar ao menu.");
            }
            return true;
        });
    }

    // Repovoar bots mortos na arena para manter a ação ativa
    while (bots.length < TOTAL_BOTS) bots.push(criarBot());


    // ---- PROCESSAMENTO GRÁFICO (RENDERIZAÇÃO COM CÂMERA) ----
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Salvar o estado para translação
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Desenhar a Linha de Fronteira (Quadrado Limite da Arena)
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, LARGURA_MAPA, ALTURA_MAPA);

    // Desenhar a Malha de Grade Dinâmica
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    const tamanhoGrade = 50;
    for (let x = 0; x < LARGURA_MAPA; x += tamanhoGrade) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ALTURA_MAPA); ctx.stroke();
    }
    for (let y = 0; y < ALTURA_MAPA; y += tamanhoGrade) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(LARGURA_MAPA, y); ctx.stroke();
    }

    // Renderizar Nutrientes
    comidas.forEach(comida => {
        ctx.beginPath();
        ctx.arc(comida.x, comida.y, comida.raio, 0, Math.PI * 2);
        ctx.fillStyle = comida.cor;
        ctx.fill();
    });

    // Renderizar Bots
    bots.forEach(bot => {
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.raio, 0, Math.PI * 2);
        ctx.fillStyle = bot.cor;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#424242';
        ctx.stroke();

        // Nome do Bot
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.max(12, bot.raio * 0.35)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bot.nome, bot.x, bot.y);
    });

    // Renderizar o Jogador Humano (Se estiver vivo)
    if (!jogador.morto) {
        ctx.beginPath();
        ctx.arc(jogador.x, jogador.y, jogador.raio, 0, Math.PI * 2);
        ctx.fillStyle = jogador.cor;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#00acc1';
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.max(12, jogador.raio * 0.35)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(jogador.nome, jogador.x, jogador.y);
    }

    ctx.restore(); // Restaura matriz para desenhos fixos na tela

    // 5. Atualizar Painel de Líderes (Classificação em Tempo Real)
    atualizarLeaderboard();

    idAnimacao = requestAnimationFrame(loopDoJogo);
}

// ---- ATUALIZAR LEADERBOARD ----
function atualizarLeaderboard() {
    let todos = [...bots];
    if (!jogador.morto) todos.push(jogador);

    // Ordena de forma decrescente pela massa/raio
    todos.sort((a, b) => b.raio - a.raio);

    listaLideres.innerHTML = '';
    // Pega as 10 maiores massas da rodada
    todos.slice(0, 10).forEach(célula => {
        const li = document.createElement('li');
        li.textContent = `${célula.nome}: ${Math.floor(célula.raio)}`;
        if (!jogador.morto && célula.nome === jogador.nome) li.style.color = '#00b0ff';
        listaLideres.appendChild(li);
    });
}

// ---- INTERFACES E EVENTOS ----
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

btnIniciar.addEventListener('click', () => {
    iniciarEstruturas();
    menuInicial.classList.add('escondido');
    hud.classList.remove('escondido');
    leaderboard.classList.remove('escondido');
    
    jogoAtivo = true;
    loopDoJogo();
});

btnSair.addEventListener('click', () => {
    jogoAtivo = false;
    cancelAnimationFrame(idAnimacao);
    hud.classList.add('escondido');
    leaderboard.classList.add('escondido');
    menuInicial.classList.remove('escondido');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function movePlayer(){

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const dx = mouse.x - centerX;
  const dy = mouse.y - centerY;

  const distance = Math.sqrt(dx * dx + dy * dy);

  const angle = Math.atan2(dy, dx);

  const maxSpeed = Math.max(
    0.4,
    2.2 - player.radius / 70
  );

  const speedFactor = Math.min(
    distance / 250,
    1
  );

  player.x += Math.cos(angle) * maxSpeed * speedFactor;
  player.y += Math.sin(angle) * maxSpeed * speedFactor;

}