# Genesis Control Plane — Pre-Migration Checklist

Use this checklist before ANY stage migration (1→2, 2→3, 3→4).

---

## Test 1: Configuration Portability

- [ ] Can you change `DATABASE_URL` without code changes?
- [ ] Can you change `REDIS_URL` without code changes?
- [ ] Can you change `SUPABASE_URL` without code changes?
- [ ] Are ALL secrets in env vars (not hardcoded)?
- [ ] Can you change 5 env vars, restart, and the system works?

**Pass Criteria:** Change 5 env vars, restart Control Plane, verify all services start.

---

## Test 2: Horizontal Scalability

- [ ] Run 2 Control Plane instances locally:
  ```bash
  docker-compose up --scale control-plane=2
  ```
- [ ] Send 100 jobs to BullMQ:
  ```bash
  node scripts/seed-test-jobs.js --count=100
  ```
- [ ] Verify both instances process jobs without duplicates
- [ ] Verify no crashes or deadlocks

**Pass Criteria:** No duplicate processing, no crashes, all 100 jobs completed.

---

## Test 3: Stateless Verification

- [ ] Start Control Plane and enqueue 50 jobs
- [ ] Kill Control Plane mid-processing (SIGKILL)
- [ ] Restart Control Plane
- [ ] Verify remaining jobs resume from BullMQ (not lost)

**Pass Criteria:** No data loss, all 50 jobs eventually complete.

---

## Test 4: Rollback Speed

- [ ] Deploy to new platform (Railway/ECS/K8s)
- [ ] Inject artificial failure (e.g., wrong REDIS_URL)
- [ ] Measure time to rollback to old platform
- [ ] Verify old platform processes backlog

**Pass Criteria:** Complete rollback in <5 minutes.

---

## Test 5: Health Check Validation

- [ ] Verify `/health` returns 200 when healthy
- [ ] Verify `/health` returns 503 when degraded
- [ ] Verify load balancer detects unhealthy instance
- [ ] Verify auto-restart on Health check failure

---

## Test 6: Graceful Shutdown

- [ ] Send SIGTERM to Control Plane
- [ ] Verify in-flight BullMQ jobs complete before exit
- [ ] Verify no new jobs are picked up after SIGTERM
- [ ] Verify exit code is 0

**Pass Criteria:** No data loss, clean shutdown within `GRACEFUL_SHUTDOWN_TIMEOUT_MS`.

---

## Test 7: Monitoring

- [ ] Verify structured JSON logs are emitted
- [ ] Verify logs include service name, environment, timestamp
- [ ] Verify error logs include stack traces
- [ ] Verify log aggregation works on target platform

---

## Final Sign-Off

| Test | Status | Date | Notes |
|------|--------|------|-------|
| Configuration Portability | ☐ | | |
| Horizontal Scalability | ☐ | | |
| Stateless Verification | ☐ | | |
| Rollback Speed | ☐ | | |
| Health Check Validation | ☐ | | |
| Graceful Shutdown | ☐ | | |
| Monitoring | ☐ | | |

**Migration approved by:** ________________  
**Date:** ________________
