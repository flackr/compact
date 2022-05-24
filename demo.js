class TimeElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.render();
  }
  render = () => {
    let time = (new Date()).toTimeString();
    this.shadowRoot.update(`
    <h3>Time</h3>
    <p>The time is now ${time}</p>
    `);
    setInterval(this.render, 1000);
  }
};
customElements.define("time-element", TimeElement);

document.getElementById('root').update(`
  <h1>Title</h1>
  <time-element />
`);

