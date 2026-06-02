export function setupApp(element: HTMLElement): void {
  element.innerHTML = `
    <h1>Ludo</h1>
    <p>Welcome to Ludo! Game coming soon.</p>
  `;
}

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  setupApp(app);
}
