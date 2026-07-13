# TalentStream Matching Pipeline — Production Design & Implementation Plan

## 1. Executive Summary

This document turns the two-stage (bi-encoder → cross-encoder) matching architecture into a concrete, buildable production system. It fixes the ambiguities in the original design (top-50 chunk-vs-candidate confusion, missing aggregation formula, missing hybrid search, missing bias/compliance controls) and lays out schema, APIs, worker topology, and a phased delivery plan.

**Core design decisions locked in for this version:**
- Retrieval unit is always the **candidate**, not the chunk. "Top 50" means 50 distinct candidates.
- Hybrid search (BM25 + vector, fused via Reciprocal Rank Fusion) is in Stage 1 from day one, not a future nice-to-have.
- Aggregation happens twice, with an explicit formula each time: once to pick candidates into the Stage 1 shortlist, once to produce a final candidate score after Stage 2 reranking.
- Every ranked result carries an evidence span for explainability.
- Bias auditing and human-in-the-loop review are built into the pipeline, not bolted on later.

---

## 2. Phased Delivery Plan

### Phase 0 — Foundations (Week 1–2)
- Stand up Postgres + pgvector extension, RabbitMQ, FastAPI skeleton, object storage for raw resumes.
- Define and migrate schema (Section 4).
- Ingestion pipeline: parse resume → chunk → embed → store. No matching logic yet.
- **Exit criteria:** given a resume file, the system produces stored, embedded chunks with correct metadata.

### Phase 1 — Stage 1 Retrieval (Week 3–4)
- Implement dense vector search with HNSW index.
- Implement BM25 keyword search (`tsvector`/`ts_rank`) over the same chunks.
- Implement RRF fusion and candidate-level deduplication (`DISTINCT ON` window function).
- Implement Stage 1 aggregation formula (per-chunk-type max, then weighted average — Section 5.3).
- **Exit criteria:** given a JD, return exactly N distinct candidates ranked by fused Stage 1 score, in under 300ms at target data volume.

### Phase 2 — Stage 2 Reranking (Week 5–6)
- Deploy cross-encoder (self-hosted `bge-reranker-v2-m3` on GPU, or managed Cohere/Voyage rerank API — decision gate in Section 6.2).
- Batch (JD, chunk) pairs per shortlisted candidate; compute final aggregated score (Section 6.3).
- Extract evidence spans for explainability.
- **Exit criteria:** end-to-end JD → final ranked top 10 with evidence, completing within the async SLA (Section 7).

### Phase 3 — Async Orchestration & API (Week 7)
- RabbitMQ worker(s) consuming match jobs, idempotent processing, retry/backoff, dead-letter queue.
- FastAPI endpoints for job submission, polling, and WebSocket push.
- **Exit criteria:** load test at expected concurrent JD volume; no dropped jobs, no duplicate writes on retry.

### Phase 4 — Compliance, Bias Audit, Explainability UI (Week 8–9)
- Bias audit harness comparing pass-through rates across measurable groups.
- Human-in-the-loop review gate before any auto-rejection is surfaced to end users.
- Evidence spans surfaced in the frontend.
- **Exit criteria:** legal/compliance sign-off checklist cleared (Section 9).

### Phase 5 — Observability, Evaluation Loop, Hardening (Week 10+)
- Recruiter feedback capture (shortlist/reject/hire) as relevance labels.
- Offline eval harness (precision@10, nDCG@10) run against labeled data on every model/weight change.
- Dashboards, alerting, cost monitoring.
- **Exit criteria:** can answer "is this week's ranking quality better or worse than last month's" with a number, not a guess.

---

## 3. High-Level Architecture

```
                        ┌─────────────────────┐
   PM submits JD  ───▶  │   FastAPI (sync)     │
                        │  POST /matches       │
                        └──────────┬───────────┘
                                   │ enqueue job_id
                                   ▼
                        ┌─────────────────────┐
                        │     RabbitMQ         │
                        │  matching.jobs queue │
                        └──────────┬───────────┘
                                   ▼
                        ┌─────────────────────────────────────┐
                        │           Match Worker               │
                        │  1. Embed JD (text-embedding-3-small)│
                        │  2. Vector search (pgvector, HNSW)   │
                        │  3. Keyword search (tsvector)        │
                        │  4. RRF fuse → distinct top-N cands   │
                        │  5. Cross-encoder rerank (batched)   │
                        │  6. Aggregate final scores            │
                        │  7. Extract evidence spans            │
                        │  8. Write to `matches` table          │
                        └──────────┬────────────────────────────┘
                                   ▼
                        ┌─────────────────────┐
                        │   Postgres (matches) │
                        └──────────┬───────────┘
                                   ▼
                  Frontend polls / WebSocket push ◀── FastAPI (read)
```

Supporting services: object storage (S3-compatible) for raw resume files, a metrics/eval store (can be the same Postgres instance, separate schema) for offline evaluation and bias audits.

---

## 4. Database Schema

```sql
-- Candidates and their parsed resume chunks
CREATE TABLE candidates (
    candidate_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name        TEXT NOT NULL,
    resume_file_url  TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE chunk_type AS ENUM ('skills', 'summary', 'experience', 'education', 'other');

CREATE TABLE candidate_chunks (
    chunk_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id   UUID NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    chunk_type     chunk_type NOT NULL,
    chunk_text     TEXT NOT NULL,
    embedding      VECTOR(1536) NOT NULL,          -- text-embedding-3-small dim
    tsv            TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for fast cosine search
CREATE INDEX idx_chunks_embedding_hnsw
    ON candidate_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- GIN index for keyword search
CREATE INDEX idx_chunks_tsv ON candidate_chunks USING GIN (tsv);

-- Jobs / JDs
CREATE TABLE jobs (
    job_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title          TEXT NOT NULL,
    jd_text        TEXT NOT NULL,
    jd_embedding   VECTOR(1536),
    created_by     UUID NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Match run tracking (one row per matching request/attempt)
CREATE TABLE match_runs (
    match_run_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id         UUID NOT NULL REFERENCES jobs(job_id),
    status         TEXT NOT NULL DEFAULT 'queued',   -- queued|running|completed|failed
    requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at   TIMESTAMPTZ,
    error_message  TEXT
);

-- Final results per match run
CREATE TABLE matches (
    match_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_run_id     UUID NOT NULL REFERENCES match_runs(match_run_id) ON DELETE CASCADE,
    candidate_id     UUID NOT NULL REFERENCES candidates(candidate_id),
    stage1_score     DOUBLE PRECISION NOT NULL,
    stage2_score     DOUBLE PRECISION NOT NULL,
    final_rank       INT NOT NULL,
    evidence_span    TEXT,                 -- best matching excerpt, for explainability
    evidence_chunk_id UUID REFERENCES candidate_chunks(chunk_id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (match_run_id, candidate_id)
);

-- Recruiter feedback for the evaluation loop
CREATE TABLE match_feedback (
    feedback_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id       UUID NOT NULL REFERENCES matches(match_id),
    action         TEXT NOT NULL,           -- shortlisted|rejected|interviewed|hired
    actor_id       UUID NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Idempotency note: `matches` has a unique constraint on `(match_run_id, candidate_id)` so a retried worker can `INSERT ... ON CONFLICT DO NOTHING/UPDATE` safely.

---

## 5. Stage 1: Hybrid Retrieval

### 5.1 Candidate-level deduplication (fixes the "top 50" ambiguity)

Retrieve best chunk per candidate first, so "top 50" always means 50 distinct people:

```sql
WITH ranked_chunks AS (
    SELECT
        candidate_id,
        chunk_id,
        chunk_type,
        1 - (embedding <=> :jd_embedding) AS cosine_sim,
        ROW_NUMBER() OVER (
            PARTITION BY candidate_id
            ORDER BY embedding <=> :jd_embedding
        ) AS rn
    FROM candidate_chunks
)
SELECT candidate_id, chunk_id, chunk_type, cosine_sim
FROM ranked_chunks
WHERE rn = 1
ORDER BY cosine_sim DESC
LIMIT 50;
```

This gives the single best-matching chunk per candidate, guaranteeing 50 unique candidates rather than 50 chunks that might collapse to 35 people.

### 5.2 Hybrid fusion (BM25 + vector via RRF)

Run vector search and keyword search independently, then fuse by rank rather than raw score (cosine similarity and `ts_rank` are not on comparable scales):

```sql
WITH vector_ranked AS (
    SELECT candidate_id, ROW_NUMBER() OVER (ORDER BY embedding <=> :jd_embedding) AS rank
    FROM candidate_chunks
    ORDER BY embedding <=> :jd_embedding
    LIMIT 200
),
keyword_ranked AS (
    SELECT candidate_id, ROW_NUMBER() OVER (ORDER BY ts_rank(tsv, plainto_tsquery('english', :jd_text)) DESC) AS rank
    FROM candidate_chunks
    WHERE tsv @@ plainto_tsquery('english', :jd_text)
    LIMIT 200
)
SELECT
    COALESCE(v.candidate_id, k.candidate_id) AS candidate_id,
    (1.0 / (60 + COALESCE(v.rank, 1000))) + (1.0 / (60 + COALESCE(k.rank, 1000))) AS rrf_score
FROM vector_ranked v
FULL OUTER JOIN keyword_ranked k USING (candidate_id)
GROUP BY COALESCE(v.candidate_id, k.candidate_id), v.rank, k.rank
ORDER BY rrf_score DESC
LIMIT 50;
```

(`k = 60` is the standard RRF smoothing constant; tune empirically.)

### 5.3 Stage 1 aggregation formula (explicit, not left open)

For each shortlisted candidate, compute a per-type max, then a weighted average across types — this avoids one section dominating purely by chunk count while still respecting that Experience should usually outweigh Skills:

```
stage1_score(candidate) =
    0.5 * max_cosine_sim(candidate, 'experience') +
    0.3 * max_cosine_sim(candidate, 'skills') +
    0.2 * max_cosine_sim(candidate, 'summary')
```

Missing chunk types contribute 0 for that term (or renormalize weights over present types — pick one and keep it consistent; renormalizing is recommended so candidates aren't penalized for a resume that lacks a distinct "summary" section).

Weights are config, not code — store them in a `scoring_config` table or env var so they can be tuned per role family without a deploy.

---

## 6. Stage 2: Cross-Encoder Reranking

### 6.1 Batching

For each of the 50 shortlisted candidates, take their top 1–3 chunks (not just the single best one used for Stage 1 dedup — a candidate's *second*-best chunk may still beat another candidate's best). Build `(JD, chunk)` pairs and batch them into the cross-encoder in groups of ~16–32 to maximize GPU utilization.

### 6.2 Local vs. managed — decision gate

| | Self-hosted (`bge-reranker-v2-m3` on GPU) | Managed API (Cohere Rerank / Voyage Rerank) |
|---|---|---|
| Latency at 50–150 pairs | ~200–500ms on a single GPU | ~300–800ms network + inference |
| Cost model | Fixed (GPU instance), scales with idle capacity | Per-call, scales with volume |
| Ops burden | You own model updates, scaling, batching | None |
| Data residency | Full control | Data leaves your infra |
| Recommendation | Choose this if JD volume > ~5,000/day or resumes are sensitive/regulated | Choose this for lower volume or faster time-to-market |

**Decision rule of thumb:** model your expected monthly JD volume against both cost curves before Phase 2 starts; don't default to "local" just because it avoids a per-call bill — CPU-only local reranking without a GPU is not production-viable at any meaningful concurrency (2–4s per batch of 50, serialized, will bottleneck the queue).

### 6.3 Stage 2 final aggregation

Same shape as Stage 1, but using cross-encoder scores instead of cosine similarity, and this is the score actually used for the final top-10 ranking and shown to recruiters:

```
stage2_score(candidate) =
    0.5 * max_reranker_score(candidate, 'experience') +
    0.3 * max_reranker_score(candidate, 'skills') +
    0.2 * max_reranker_score(candidate, 'summary')
```

`final_rank` = dense rank of candidates by `stage2_score` descending.

### 6.4 Evidence extraction

Store the chunk (and ideally the specific sentence within it) that produced the max score per candidate as `evidence_span`. This can be done cheaply: the cross-encoder already tells you which chunk won; a lightweight follow-up (sentence-level cosine similarity against the JD, or a small extractive heuristic) picks the best sentence within that chunk — no extra LLM call required for the MVP.

---

## 7. Async Orchestration

- **Queue:** `matching.jobs` (durable, persistent messages). Message payload: `{match_run_id, job_id}` only — no large payloads in the queue, everything else is read from Postgres by the worker.
- **Idempotency:** worker upserts into `matches` keyed on `(match_run_id, candidate_id)`; safe to reprocess a message after a crash.
- **Retry policy:** 3 retries with exponential backoff (1s, 5s, 25s), then route to a `matching.jobs.dlq` dead-letter queue with `match_runs.status = 'failed'` and `error_message` populated for manual inspection.
- **SLA:** target end-to-end completion (JD submitted → matches ready) under 10s for the 95th percentile at expected load; alert if p95 exceeds 15s.
- **Delivery to frontend:** WebSocket push on completion, with polling (`GET /matches/{match_run_id}`) as a fallback for clients that drop the socket.

### API surface

```
POST   /jobs                      create a JD, triggers embedding
POST   /jobs/{job_id}/matches     kick off a match run → { match_run_id, status: "queued" }
GET    /matches/{match_run_id}    poll status / results
WS     /matches/{match_run_id}/ws push completion event
POST   /matches/{match_id}/feedback   recruiter shortlist/reject/hire action
```

---

## 8. Compliance, Bias, and Explainability

Automated resume screening is subject to real regulatory scrutiny (e.g. rules like NYC Local Law 144 requiring bias audits for automated employment decision tools, and general EEOC disparate-impact exposure in the US, with analogous rules developing elsewhere). Build these in from Phase 4, not as an afterthought:

- **No auto-rejection.** The system produces a ranked shortlist; a human always makes the final reject/advance decision. `match_feedback` captures that human action, not an automated one.
- **Bias audit harness.** Where legally permissible to collect, periodically compare shortlist rates across demographic groups on a held-out sample; flag statistically significant disparities for review before each model or weight-config change ships.
- **No demographic-adjacent features.** Do not embed or chunk photos, names-in-context, graduation years used as age proxies, or addresses in ways that let the model key off them.
- **Explainability by default.** Every match ships with `evidence_span` — recruiters see *why* a candidate ranked where they did, not just a number.
- **Audit trail.** `match_runs` and `matches` are append-only/immutable once written; if scoring config changes, log the config version alongside each match run so past decisions can be reconstructed.

---

## 9. Observability & Evaluation Loop

- **Metrics to track per match run:** Stage 1 latency, Stage 2 latency, queue wait time, end-to-end latency, DLQ rate.
- **Ranking quality metrics:** using `match_feedback` as relevance labels (shortlisted/hired = relevant), compute precision@10 and nDCG@10 on a rolling window; track over time as a single trend line so a bad reranker/config change is caught, not shipped silently.
- **Cost metrics:** embedding API calls/day, reranker calls or GPU-hours/day, cost per match run — surfaced on a dashboard so volume growth doesn't cause a cost surprise.
- **Alerting:** p95 latency breach, DLQ depth > 0, bias audit disparity flag, ranking quality metric drop > threshold week-over-week.

---

## 10. Tech Stack Summary

| Layer | Choice |
|---|---|
| API | FastAPI |
| Queue | RabbitMQ |
| Vector + relational store | PostgreSQL + pgvector (HNSW index) |
| Keyword search | Postgres `tsvector`/GIN |
| Bi-encoder | OpenAI `text-embedding-3-small` |
| Cross-encoder | `BAAI/bge-reranker-v2-m3` (self-hosted GPU) or Cohere/Voyage Rerank (managed) — per Section 6.2 |
| Object storage | S3-compatible, for raw resume files |
| Frontend delivery | WebSocket + polling fallback |

---

## 11. Open Decisions to Resolve Before Build

1. Expected JD volume/month → determines local-GPU vs. managed reranker (Section 6.2).
2. Which demographic data (if any) is available/legal to collect for bias auditing in your jurisdiction(s) of operation.
3. Scoring weights (Section 5.3, 6.3) — start with the proposed 0.5/0.3/0.2 split, tune against `match_feedback` once real data exists.
4. Resume/JD update policy — event-driven re-embedding on edit vs. nightly batch (affects index staleness).