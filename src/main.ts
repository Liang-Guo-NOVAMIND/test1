import './style.css';
import { LudoGame } from './game';

const app = document.querySelector<HTMLDivElement>('#app')!;
new LudoGame(app);
