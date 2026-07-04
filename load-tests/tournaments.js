import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const tDuration = new Trend('tournament_duration');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.02'],
    http_req_duration: ['p(95)<3000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/tournaments?limit=20&offset=0`);
  const duration = Date.now() - start;

  tDuration.add(duration);
  errorRate.add(res.status !== 200);

  check(res, {
    'tournament list status 200': (r) => r.status === 200,
    'has tournaments data': (r) => JSON.parse(r.body).tournaments !== undefined,
  });

  sleep(1);
}