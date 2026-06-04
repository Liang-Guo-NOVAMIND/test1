import './style.css';
import { LudoGame } from './game';
import { GomokuGame } from './gomoku/game';

const app = document.querySelector<HTMLDivElement>('#app')!;

function showGameSelector(): void {
  app.innerHTML = '';

  const selector = document.createElement('div');
  selector.className = 'setup-screen';

  const title = document.createElement('h1');
  title.textContent = 'Game Lobby';
  title.className = 'game-title';
  selector.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Choose a game to play';
  subtitle.className = 'game-subtitle';
  selector.appendChild(subtitle);

  const games = [
    { name: 'Ludo', desc: 'Classic board game for 2-4 players', init: () => new LudoGame(app) },
    { name: 'Gomoku', desc: 'Five in a row — play vs AI or a friend', init: () => new GomokuGame(app, showGameSelector) },
  ];

  for (const game of games) {
    const card = document.createElement('button');
    card.className = 'game-card';

    const name = document.createElement('span');
    name.className = 'game-card-name';
    name.textContent = game.name;
    card.appendChild(name);

    const desc = document.createElement('span');
    desc.className = 'game-card-desc';
    desc.textContent = game.desc;
    card.appendChild(desc);

    card.addEventListener('click', () => {
      app.innerHTML = '';
      game.init();
    });
    selector.appendChild(card);
  }

  app.appendChild(selector);
}

showGameSelector();
