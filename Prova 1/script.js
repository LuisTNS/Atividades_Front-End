function revelar() {

    // Trocar imagem
    const img = document.getElementById("foto-jogador");
    img.src = "img/_vinicius_junior.png";

    // Nome
    const nome = document.getElementById("nome");
    nome.textContent = "Vinícius José Paixão de Oliveira Júnior";

    // Data de nascimento
    const nascimento = document.getElementById("nascimento");
    nascimento.textContent = "12/07/2000 (25 anos)";

    // Altura
    const altura = document.getElementById("altura");
    altura.textContent = "1,76 m";

    // Posição
    const posicao = document.getElementById("posicao");
    posicao.textContent = "Ponta-esquerda / Atacante";

    // Rank
    const rank = document.getElementById("rank");
    rank.textContent = "9,5";

    // Remover placeholder e aplicar card-text
    const elementos = document.querySelectorAll(".placeholder-text");

    elementos.forEach(el => {
        el.classList.remove("placeholder-text");
        el.classList.add("card-text");
    });
}