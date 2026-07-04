import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const lbDuration = new Trend('leaderboard_duration');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/stats/leaderboard?limit=50&offset=0`);
  const duration = Date.now() - start;

  lbDuration.add(duration);
  errorRate.add(res.status !== 200);

  check(res, {
    'leaderboard status 200': (r) => r.status === 200,
    'has leaderboard data': (r) => JSON.parse(r.body).leaderboard !== undefined,
  });

  sleep(0.5);
}