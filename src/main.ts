import './style.css';
import { ParkourGame } from './game';

const app = document.querySelector<HTMLDivElement>('#app')!;
new ParkourGame(app);
