import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const binary = process.env.GSTACK_BROWSE;
if (!binary || !process.env.BROWSE_STATE_FILE) throw new Error('Set GSTACK_BROWSE and a dedicated BROWSE_STATE_FILE. Start tests/e2e/server.mjs and the three Vite apps first.');
const run = (...args) => {
  const out = execFileSync(binary, args.map(String), { encoding: 'utf8', timeout: 25_000, windowsHide: true });
  if (/\bERROR:/.test(out)) throw new Error(out);
  return out.trim();
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = expression => /(?:^|\n)true(?:\n|$)/.test(run('js', `Boolean(${expression})`));
async function until(expression) {
  for (let i = 0; i < 30; i++) { if (check(expression)) return; await pause(150); }
  throw new Error(`Browser condition failed: ${expression}\n${run('text').slice(0, 1600)}`);
}
function tab(url) { const out = run('newtab', url, '--json'); return Number(out.match(/"tabId"\s*:\s*(\d+)/)?.[1]); }
function button(text) { return `button:has-text("${text}")`; }
const suffix = Date.now().toString(36).slice(-4).toUpperCase();
const codes = [`A1${suffix}`, `B1${suffix}`];
const admin = tab('http://localhost:5175');
run('snapshot', '-i');
run('fill', 'input[type="password"]', 'test-operator-credential-not-production');
run('click', button('Sign in')); run('wait', '.ops');
const rooms = [];
for (const code of codes) {
  run('tab', admin);
  run('fill', 'input[maxlength="6"]', code); run('click', button('Create room'));
  await until(`document.querySelector('[role="status"]')?.textContent === 'synchronized' && document.querySelector('select')?.selectedOptions[0]?.textContent === '${code}'`);
  const players = [];
  for (let i = 0; i < 4; i++) {
    const id = tab('http://localhost:5173'); run('snapshot', '-i');
    run('fill', 'input[placeholder="6 characters"]', code);
    run('fill', 'input[autocomplete="nickname"]', `${code} Player ${i + 1}`);
    run('click', button('Join the room')); run('wait', '.lobby');
    assert.equal(check(`document.body.textContent.includes('Demonstration board')`), false);
    players.push(id);
  }
  run('tab', admin); run('click', button('Initialize game'));
  let selected = 0;
  for (let pass = 0; pass < 6 && selected < 4; pass++) for (const id of players) {
    run('tab', id);
    if (check(`document.querySelector('.eco-option') !== null`)) {
      run('click', '.eco-option:first-child');
      await until(`document.querySelector('.eco-option') === null`);
      selected++;
    }
  }
  assert.equal(selected, 4, 'All players choose one objective through the UI');
  const projector = tab('http://localhost:5174'); run('snapshot', '-i');
  run('fill', 'input[aria-label="Room code"]', code);
  run('fill', 'input[aria-label="Projector access key"]', 'test-projector-credential-not-production');
  run('click', button('Connect projector')); run('wait', '.cast');
  assert.equal(check(`location.href.includes('key=')`), false);
  rooms.push({ code, players, projector });
  console.log(`PASS: ${code} four browser joins, objective selection, projector authentication`);
}

for (const room of rooms) {
  run('tab', admin); run('select', 'select[aria-label="Existing rooms"]', room.code);
  await until(`document.querySelector('[role="status"]')?.textContent === 'synchronized'`);
  run('click', button('Start game'));
  await until(`document.body.textContent.includes('player_turn')`);
  run('fill', 'input[maxlength="240"]', 'Browser regression pause');
  run('click', 'button:text-is("Pause")');
  await until(`document.body.textContent.includes('· paused')`);
  assert.equal(check(`document.querySelector('[data-private-inspection]') !== null`), false);
  run('fill', 'input[type="password"]', 'test-operator-credential-not-production');
  run('click', button('Inspect private state'));
  run('wait', '[data-private-inspection]');
  assert.equal(check(`document.querySelector('input[type="password"]').value === ''`), true);
  run('click', button('Hide private state'));
  await until(`document.querySelector('[data-private-inspection]') === null`);
  run('tab', room.projector);
  assert.equal(check(`document.body.textContent.includes('Sealed bids:') || document.body.textContent.includes('Unrevealed Council allocations:')`), false);
  run('reload'); run('wait', '.cast');
  console.log(`PASS: ${room.code} room-admin pause, audited inspection UI, projector refresh and privacy`);
}

const probe = role => `(async () => {
  const raw = Object.entries(sessionStorage).find(([key]) => key.endsWith(':${role}'))?.[1];
  if (!raw) return false;
  const before = JSON.parse(raw).session;
  window.dispatchEvent(new Event('offline'));
  await new Promise(resolve => setTimeout(resolve, 100));
  const message = await new Promise((resolve, reject) => {
    const socket = new WebSocket('ws://127.0.0.1:3100/ws');
    const timer = setTimeout(() => { socket.close(); reject(new Error('snapshot timeout')); }, 5000);
    socket.onopen = () => socket.send(JSON.stringify({ type: 'resume', sessionToken: before.token }));
    socket.onmessage = event => { const message = JSON.parse(event.data); if (message.type === 'state_snapshot') { clearTimeout(timer); socket.close(); resolve(message); } };
  });
  const projection = message.projection;
  const publicState = projection.public ?? projection;
  const valid = message.audience === '${role}' && message.roomId === before.roomId && !JSON.stringify(publicState).includes('"cards"') && !JSON.stringify(publicState).includes('"objectiveOffer"') && (${role === 'player' ? 'projection.self.playerId === before.playerId' : '!projection.self'});
  window.dispatchEvent(new Event('online'));
  return valid;
})()`;
for (const room of rooms) {
  run('tab', room.players[0]);
  assert.match(run('js', probe('player')), /true/);
  await until(`!document.body.textContent.includes('Reconnecting —')`);
  run('reload'); run('wait', '.player-stage');
  run('tab', room.projector);
  assert.match(run('js', probe('projector')), /true/);
  run('reload'); run('wait', '.cast');
}
console.log('PASS: authorized browser WebSocket payload privacy, offline/online recovery, player/projector refresh; no automatic command replay');
console.log(JSON.stringify({ admin, rooms }));
