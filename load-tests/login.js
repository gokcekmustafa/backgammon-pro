import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 1000 },
    { duration: '1m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
    login_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const payload = JSON.stringify({
    email: `user${__VU}@test.com`,
    password: 'testpass123',
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  const duration = Date.now() - start;

  loginDuration.add(duration);
  errorRate.add(res.status !== 200);

  check(res, {
    'login status 200': (r) => r.status === 200,
    'has accessToken': (r) => JSON.parse(r.body).accessToken !== undefined,
  });

  sleep(1);
}