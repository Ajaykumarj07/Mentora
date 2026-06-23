import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics to track specific APIs
export const notesDuration = new Trend('notes_duration');
export const notesSuccess = new Rate('notes_success');

export const quizDuration = new Trend('quiz_duration');
export const quizSuccess = new Rate('quiz_success');

export const roadmapDuration = new Trend('roadmap_duration');
export const roadmapSuccess = new Rate('roadmap_success');

export const options = {
  vus: 5,
  duration: '30s',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  const host = 'http://localhost:3000';
  const headers = { 'Content-Type': 'application/json' };

  // 1. POST note generation endpoint
  const notesPayload = JSON.stringify({
    topic: 'Machine Learning Foundations',
    detailLevel: 'intermediate',
    customInstructions: 'Focus on gradient descent.'
  });
  const notesRes = http.post(`${host}/api/gemini/generate-notes`, notesPayload, { headers });
  check(notesRes, {
    'Notes API status is 200': (r) => r.status === 200,
  });
  notesDuration.add(notesRes.timings.duration);
  notesSuccess.add(notesRes.status === 200);

  sleep(2);

  // 2. POST quiz generation endpoint
  const quizPayload = JSON.stringify({
    topic: 'Javascript ES6 Features',
    amount: 3,
    difficulty: 'Easy'
  });
  const quizRes = http.post(`${host}/api/gemini/generate-quiz`, quizPayload, { headers });
  check(quizRes, {
    'Quiz API status is 200': (r) => r.status === 200,
  });
  quizDuration.add(quizRes.timings.duration);
  quizSuccess.add(quizRes.status === 200);

  sleep(2);

  // 3. POST roadmap endpoint
  const roadmapPayload = JSON.stringify({
    subject: 'Web Development Foundations',
    durationDays: 5
  });
  const roadmapRes = http.post(`${host}/api/gemini/generate-roadmap`, roadmapPayload, { headers });
  check(roadmapRes, {
    'Roadmap API status is 200': (r) => r.status === 200,
  });
  roadmapDuration.add(roadmapRes.timings.duration);
  roadmapSuccess.add(roadmapRes.status === 200);

  sleep(2);
}
