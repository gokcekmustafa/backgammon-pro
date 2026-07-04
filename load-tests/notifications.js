import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const nDuration = new Trend('notification_duration');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.02'],
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

function getToken() {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: `loadtest@test.com`,
    password: 'testpass123',
  }), { headers: { 'Content-Type': 'application/json' } });
  if (loginRes.status === 200) {
    return JSON.parse(loginRes.body).accessToken;
  }
  return null;
}

const token = getToken();

export default function () {
  if (!token) {
    errorRate.add(1);
    return;
  }

  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/notifications?limit=20&offset=0`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const duration = Date.now() - start;

  nDuration.add(duration);
  errorRate.add(res.status !== 200);

  check(res, {
    'notifications status 200': (r) => r.status === 200,
    'has notifications data': (r) => JSON.parse(r.body).notifications !== undefined,
  });

  const countRes = http.get(`${BASE_URL}/api/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(countRes, {
    'unread count status 200': (r) => r.status === 200,
  });

  sleep(2);
}