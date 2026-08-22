# 🕹️ Neon Pong

> Releitura do Pong clássico com estética neon synthwave dos anos 80 — construída do zero em JavaScript puro, sem engine, sem frameworks e sem etapa de build.

### **[▶️ Jogar agora](https://tiagoholanda31.github.io/neon-pong/)**

*Roda direto no navegador, sem instalação. Funciona no desktop e no celular.*

---

## Sobre o projeto

O objetivo não era recriar o Pong, e sim usá-lo como base para explorar três coisas que um clone simples não exige: **sensação de impacto** (game feel), **áudio sintetizado em tempo real** e **controles que funcionam igualmente bem no teclado, no mouse e no toque**.

Tudo roda em três arquivos — `index.html`, `style.css` e `main.js` — sem nenhuma dependência externa além de uma fonte do Google Fonts. Basta abrir o HTML no navegador.

## Funcionalidades

- **Dois modos de jogo:** 1 jogador contra a IA ou 2 jogadores no mesmo dispositivo
- **Sistema de saque com cara ou coroa:** um sorteio animado define quem inicia; a cada ponto, quem sofreu passa a sacar
- **Partida cronometrada:** 3 minutos, com alerta sonoro nos 10 segundos finais e cronômetro piscando em vermelho nos últimos 30
- **Game feel:** partículas em cada colisão, screen shake proporcional ao evento, rastro luminoso na bola e flash de tela ao pontuar
- **Áudio sintetizado:** todos os efeitos sonoros são gerados em tempo real pela Web Audio API, sem nenhum arquivo de áudio
- **Trilha synthwave** em loop, com botão de mudo
- **Multiplataforma:** teclado, mouse e toque, incluindo multi-touch para dois jogadores no celular
- **Menu de pausa** e detecção de orientação, com aviso para girar o aparelho no modo retrato

## Controles

| Ação | Jogador 1 | Jogador 2 |
|---|---|---|
| Mover | `W` / `S` ou mouse | `P` / `Ç` |
| Sacar | `W` ou `Espaço` | `P` |
| Toque | Metade esquerda da tela | Metade direita da tela |
| Pausar | Botão `MENU` | — |

## Stack

| Camada | Tecnologia |
|---|---|
| Renderização | Canvas 2D API |
| Lógica | JavaScript ES6+ (classes, herança, módulos de estado) |
| Áudio | Web Audio API (`OscillatorNode`, `GainNode`) + elemento `<audio>` |
| Interface | HTML5 e CSS3 (Grid, animações, `backdrop-filter`) |
| Tipografia | Orbitron (Google Fonts) |

**Sem dependências, sem bundler, sem build.**

---

## Decisões técnicas

### Arquitetura

O código segue uma hierarquia de classes simples: `Entity` concentra posição, velocidade e desenho, e `Paddle` e `Ball` a estendem com comportamento próprio. `Vector` e `Particle` completam o conjunto.

Duas estruturas centrais organizam o resto:

- **`CONFIG`** — todos os parâmetros de balanceamento (dimensões, velocidades, duração, paleta) em um único objeto, para ajustar o jogo sem caçar valores mágicos espalhados pelo código
- **`state`** — toda a máquina de estados da partida (rodando, pausado, sacando, sorteando, fim de jogo) em um só lugar

### Física da rebatida

A bola não simplesmente inverte a direção ao bater na raquete. O ponto de contato é normalizado entre `-1` e `1` em relação ao centro da raquete e convertido em um ângulo de saída de até 45°:

```js
const normalizedHit = hitPoint / (paddle.size.y / 2);
const angle = normalizedHit * (Math.PI / 4);
ball.vel.x = Math.cos(angle) * speed;
ball.vel.y = Math.sin(angle) * speed;
```

Isso dá controle real ao jogador: bater com a ponta da raquete manda a bola em diagonal aberta. A velocidade sobe 5% a cada rebatida, com teto de 2,5× a velocidade inicial, para o rali ganhar tensão sem ficar injogável.

### Colisão e correção de posição

Como a bola se move em passos discretos por quadro, ela pode terminar o quadro *dentro* da raquete e ficar presa em rebatidas sucessivas. A correção é reposicionar a bola exatamente na borda da raquete no momento do impacto, antes de aplicar a nova velocidade — mesma lógica usada nas paredes superior e inferior.

Um flag `scoringPause` impede que um único ponto seja contabilizado mais de uma vez enquanto a bola sai da área jogável.

### Áudio sintetizado

Nenhum efeito sonoro é um arquivo. Cada som é construído na hora com um oscilador e um envelope de ganho — a rebatida é uma onda quadrada subindo de 440 Hz a 880 Hz em 100 ms, o ponto é uma triangular descendo de 880 Hz a 220 Hz, e assim por diante.

A escolha resolve dois problemas de uma vez: **peso zero** (nenhum asset de áudio para carregar) e coerência com a estética chiptune/synthwave. O `AudioContext` é retomado sob demanda para respeitar a política de autoplay dos navegadores, e uma tela de entrada garante a interação do usuário antes de qualquer som tocar.

### Sistema de partículas

Cada partícula tem velocidade aleatória, tamanho decrescente e um valor de `life` que decai por quadro. Partículas mortas são removidas com iteração reversa sobre o array, evitando o deslocamento de índice que aconteceria numa iteração normal. Cor e quantidade variam conforme o evento — 15 na cor do jogador ao rebater, 30 brancas ao pontuar.

### Efeito neon

O brilho não usa pós-processamento nem shader. É `shadowBlur` combinado com `shadowColor` na mesma cor do preenchimento, aplicado a cada elemento desenhado. O grid de fundo é feito com `linear-gradient` em CSS, e as animações de pulso ficam por conta de `@keyframes`.

### Controles por toque

O multi-touch mapeia coordenadas de tela para o espaço do canvas aplicando a razão entre a resolução interna e o tamanho renderizado:

```js
const scaleX = canvas.width / rect.width;
const touchY = (touch.clientY - rect.top) * scaleY;
```

Toques na metade esquerda controlam o jogador 1 e na metade direita o jogador 2, o que permite partida local de dois jogadores em um único celular. `preventDefault` é aplicado apenas sobre o canvas, para que os botões da interface continuem respondendo normalmente.

---

## Como rodar

```bash
git clone https://github.com/tiagoholanda31/neon-pong.git
cd neon-pong
```

Abra o `index.html` no navegador. Não há instalação nem build.

Para evitar restrições de origem no carregamento do áudio, prefira servir por HTTP:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

## Estrutura

```
neon-pong/
├── index.html      # marcação, overlays de interface e elemento de áudio
├── style.css       # estética neon, animações e responsividade
├── main.js         # game loop, física, IA, áudio e controles
└── Sound/          # trilha sonora
```

## Limitações conhecidas e próximos passos

Levantamento honesto do que ainda não está resolvido:

- **Loop sem delta time.** A física avança por quadro, não por tempo decorrido, então o jogo roda mais rápido em monitores de alta taxa de atualização. Normalizar o movimento pelo tempo entre quadros é a próxima correção prioritária.
- **IA sem antecipação.** A IA persegue a posição atual da bola a 75% da velocidade da raquete, sem prever a trajetória. Funciona, mas é previsível — falta níveis de dificuldade e uma margem de erro deliberada.
- **Resolução interna fixa** em 1100×750, escalada por CSS.
- **Sem persistência** de placar ou recordes.
- **Sem testes automatizados.**

## Licença

MIT — sinta-se livre para estudar, modificar e reaproveitar o código.

> ⚠️ A licença cobre o código. Verifique separadamente os direitos das faixas musicais em `Sound/` antes de redistribuir.

---

Desenvolvido por **Tiago Holanda** · [LinkedIn](https://www.linkedin.com/in/tiagoholanda)
