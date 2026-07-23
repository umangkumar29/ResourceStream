<div align="center">
  
  # 🌊 ResourceStream
  
  **Eliminate bench downtime with a real-time, hybrid vector matching engine.**

  <br />

  [![React](https://img.shields.io/badge/React-18-0F172A.svg?style=for-the-badge&logo=react&logoColor=22d3ee)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-0F172A.svg?style=for-the-badge&logo=fastapi&logoColor=009688)](https://fastapi.tiangolo.com)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-0F172A.svg?style=for-the-badge&logo=postgresql&logoColor=336791)](https://postgresql.org)
  [![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Celery-0F172A.svg?style=for-the-badge&logo=rabbitmq&logoColor=FF6600)](https://rabbitmq.com)
  [![Docker](https://img.shields.io/badge/Docker-Compose-0F172A.svg?style=for-the-badge&logo=docker&logoColor=2496ED)](https://docker.com)

  [**Live Demo Showcase**](https://resource-stream-umangkumar301.vercel.app/) • [**Report Bug**](https://github.com/umangkumar29/ResourceStream/issues) • [**Request Feature**](https://github.com/umangkumar29/ResourceStream/issues)

  <br />
  

</div>

---

## 🚀 The Vision

**ResourceStream** (formerly TalentStream) is a high-performance orchestration platform designed to replace manual Resource Management Group (RMG) bench-tracking spreadsheets. By leveraging a **highly asymmetric 3-stage AI retrieval pipeline (Dense Vectors + BM25 + Jina AI Reranker + LLM)**, it autonomously connects bench candidates with active project demands based on actual semantic meaning—not just rigid boolean keyword overlap. 

---

## ✨ Architectural Marvels

### 🧠 The Semantic AI Pipeline


<details>
<summary><b>1. Hybrid Retrieval (pgvector + BM25)</b></summary>
The first stage rapidly narrows down thousands of unstructured candidate documents into a highly relevant sub-pool utilizing PostgreSQL's native vector similarity and sparse keyword search.
</details>

<details>
<summary><b>2. Jina AI Cross-Encoder Reranking</b></summary>
The secondary stage pushes retrieved candidates through a contextual neural network to eliminate hallucinations and dynamically recalculate absolute relevance scores based on true semantic fit.
</details>

<details>
<summary><b>3. LLM Zero-Shot Evaluator</b></summary>
The final stage forces an LLM to generate strict, structured JSON schemas assessing a candidate's <i>Fit Insights</i>, <i>Skill Gaps</i>, and <i>Experience Overlaps</i> against the raw Job Description.
</details>

### ⚡ Distributed Worker Subsystem
Integrating massive 5+ minute LLM processing pipelines into web applications fundamentally degrades UX. ResourceStream solves this via **Resilience Engineering**:
* **Offloaded Blocking Tasks:** All CPU-heavy AI tasks are passed to an asynchronous **Celery + RabbitMQ** message broker network.
* **Instant I/O Loop:** The FastAPI event-loop remains 100% unblocked, serving high-throughput UI data instantly.
* **Framer Motion Integration:** Real-time polling states implemented via React drive stateless status bridges without costly WebSocket overhead.

---

## �️ Technology Stack

<table>
  <tr>
    <td align="center" width="25%">
      <img src="https://skillicons.dev/icons?i=react,ts,tailwind" /><br />
      <b>Frontend (SPA)</b>
    </td>
    <td align="center" width="25%">
      <img src="https://skillicons.dev/icons?i=py,fastapi" /><br />
      <b>Backend API</b>
    </td>
    <td align="center" width="25%">
      <img src="https://skillicons.dev/icons?i=postgres,docker" /><br />
      <b>Data & Ops</b>
    </td>
    <td align="center" width="25%">
      <img src="https://skillicons.dev/icons?i=rabbitmq,linux" /><br />
      <b>Event Bus</b>
    </td>
  </tr>
</table>

---

## ⚙️ Local Deployment (Docker)

ResourceStream is strictly containerized for infinite scalability. You can spin up the entire distributed cluster (API, Database, RabbitMQ, and Celery Workers) locally with a single command.

### 1. Requirements
* Docker Desktop & Docker Compose 
* Node.js v18+ 
* OpenAI API Key

### 2. Infrastructure Spin-up
```bash
# Clone the repository
git clone https://github.com/umangkumar29/ResourceStream.git
cd ResourceStream

# Copy the environment file and insert your API keys
cp .env.example backend/.env

# Spin up the entire backend cluster (Detached Mode)
docker compose up -d
```
*Note: The first execution will pull PostgreSQL, RabbitMQ, and Python binaries natively.*

### 3. Frontend Execution
The backend is now running securely on `localhost:8000`. Next, serve the SPA interface:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` to experience the application.

---

## 🔒 Security & Data Sovereignty
The production architecture is designed around strict data privacy. The LLM extraction pipeline interacts with zero-retention API endpoints, and all vector encodings remain securely locked within your proprietary PostgreSQL instance. No organizational telemetry or PII is leaked to model training layers.

---

## 👨‍💻 Author
**Umang Kumar** 
* Full-Stack / Product / AI Engineer
* [Connect on LinkedIn](https://www.linkedin.com/in/umangkumar29)

<div align="center">
  <i>If you found this architecture interesting, please consider leaving a ⭐ on the repository!</i>
</div>
