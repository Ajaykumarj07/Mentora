import fs from 'fs';
import path from 'path';

function getMetric(obj, pathStr, defaultValue = 0) {
  const parts = pathStr.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return defaultValue;
    current = current[part];
  }
  return current !== undefined ? current : defaultValue;
}

try {
  fs.mkdirSync('reports', { recursive: true });

  const baselineData = JSON.parse(fs.readFileSync('reports/baseline-summary.json', 'utf8'));
  const apiData = JSON.parse(fs.readFileSync('reports/api-summary.json', 'utf8'));

  const metricsB = baselineData.metrics || {};
  const metricsA = apiData.metrics || {};

  // Extract baseline metrics
  const bReqs = getMetric(metricsB, 'http_reqs.count', 0);
  const bRate = getMetric(metricsB, 'http_reqs.rate', 0).toFixed(2);
  const bAvg = getMetric(metricsB, 'http_req_duration.avg', 0).toFixed(2);
  const bP95 = getMetric(metricsB, 'http_req_duration.p(95)', 0).toFixed(2);
  const bP99 = getMetric(metricsB, 'http_req_duration.p(99)', 0).toFixed(2);
  const bMax = getMetric(metricsB, 'http_req_duration.max', 0).toFixed(2);
  const bErrRate = (getMetric(metricsB, 'http_req_failed.value', 0) * 100).toFixed(2);

  // Extract api metrics
  const notesAvg = getMetric(metricsA, 'notes_duration.avg', 0).toFixed(2);
  const notesP95 = getMetric(metricsA, 'notes_duration.p(95)', 0).toFixed(2);
  const notesP99 = getMetric(metricsA, 'notes_duration.p(99)', 0).toFixed(2);
  const notesMax = getMetric(metricsA, 'notes_duration.max', 0).toFixed(2);
  const notesSuccessRate = getMetric(metricsA, 'notes_success.value', 0);
  const notesErrRate = ((1 - notesSuccessRate) * 100).toFixed(2);

  const quizAvg = getMetric(metricsA, 'quiz_duration.avg', 0).toFixed(2);
  const quizP95 = getMetric(metricsA, 'quiz_duration.p(95)', 0).toFixed(2);
  const quizP99 = getMetric(metricsA, 'quiz_duration.p(99)', 0).toFixed(2);
  const quizMax = getMetric(metricsA, 'quiz_duration.max', 0).toFixed(2);
  const quizSuccessRate = getMetric(metricsA, 'quiz_success.value', 0);
  const quizErrRate = ((1 - quizSuccessRate) * 100).toFixed(2);

  const roadmapAvg = getMetric(metricsA, 'roadmap_duration.avg', 0).toFixed(2);
  const roadmapP95 = getMetric(metricsA, 'roadmap_duration.p(95)', 0).toFixed(2);
  const roadmapP99 = getMetric(metricsA, 'roadmap_duration.p(99)', 0).toFixed(2);
  const roadmapMax = getMetric(metricsA, 'roadmap_duration.max', 0).toFixed(2);
  const roadmapSuccessRate = getMetric(metricsA, 'roadmap_success.value', 0);
  const roadmapErrRate = ((1 - roadmapSuccessRate) * 100).toFixed(2);

  // Verdict logic: PASS if baseline error rate < 1%, baseline avg < 200ms, and API error rates < 5%
  const isPass = parseFloat(bErrRate) < 1.0 && parseFloat(bAvg) < 200.0 && parseFloat(notesErrRate) < 5.0 && parseFloat(quizErrRate) < 5.0 && parseFloat(roadmapErrRate) < 5.0;
  const verdict = isPass ? 'PASS' : 'FAIL';

  const report = `# Mentora Performance Test Report

## Baseline Load Test

Virtual Users:
100

Duration:
1 minute

Results:

* Requests/sec: ${bRate}
* Avg Response Time: ${bAvg} ms
* p95: ${bP95} ms
* Max: ${bMax} ms
* Error Rate: ${bErrRate}%

## API Load Test

Results:

* Notes API: Avg: ${notesAvg} ms, p95: ${notesP95} ms, Error Rate: ${notesErrRate}%
* Quiz API: Avg: ${quizAvg} ms, p95: ${quizP95} ms, Error Rate: ${quizErrRate}%
* Roadmap API: Avg: ${roadmapAvg} ms, p95: ${roadmapP95} ms, Error Rate: ${roadmapErrRate}%

## Production Readiness Verdict

${verdict}
`;

  fs.writeFileSync('reports/k6-summary.md', report, 'utf8');
  console.log('Successfully generated reports/k6-summary.md');
} catch (err) {
  console.error('Failed to generate report:', err);
  process.exit(1);
}
