# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: playwright-e2e.spec.js >> Series 2: Functional Testing >> TC-FUN-001: Verify functional validation rule #1
- Location: tests\playwright-e2e.spec.js:240:5

# Error details

```
Error: apiRequestContext.get: connect ECONNREFUSED ::1:3000
Call log:
  - → GET http://localhost:3000/api/health
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```