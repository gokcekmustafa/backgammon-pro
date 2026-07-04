import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ws_connecting: ['p(95)<2000'],
    ws_session_duration: ['p(95)>10000'],
  },
};

const WS_URL = __ENV.WS_URL || 'ws://localhost:3002';

export default function () {
  const url = `${WS_URL}`;

  const res = ws.connect(url, { tags: { type: 'websocket' } }, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'PING' }));
    });

    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'PONG') {
        socket.send(JSON.stringify({ type: 'PING' }));
      }
    });

    socket.setTimeout(() => {
      socket.close();
    }, 15000);

    socket.on('error', (e) => {
      console.log('WS Error:', e.error());
    });
  });

  check(res, {
    'WS connection established': (r) => r && r.status === 101,
  });

  sleep(1);
}