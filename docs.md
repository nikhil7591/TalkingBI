# Talking BI — Technical Documentation

> Complete technical reference for the Talking BI agentic BI platform.  
> Version: 1.0.0 · Stack: Next.js 14 + FastAPI + OpenAI + Groq + Prisma + Mem0

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [4-Agent Pipeline](#2-4-agent-pipeline)
3. [SQL Agent](#3-sql-agent)
4. [DeepPrep Agent](#4-deepprep-agent)
5. [Doc2Chart Agent](#5-doc2chart-agent)
6. [InsightEval Agent](#6-insighteval-agent)
7. [Dataset URL Feature](#7-dataset-url-feature)
8. [BI Chatbot + Mem0](#8-bi-chatbot--mem0)
9. [Prisma Schema](#9-prisma-schema)
10. [Frontend Components](#10-frontend-components)
11. [API Reference](#11-api-reference)
12. [Auth & Tokens](#12-auth--tokens)
13. [Environment Variables](#13-environment-variables)
14. [Deployment](#14-deployment)

---

## 1. Architecture Overview

Talking BI is a multi-layer system where each layer has a single responsibility.

```
Layer 0  User            Browser / Mobile
Layer 1  Frontend        Next.js 14 · Tailwind · ECharts · Vercel
Layer 2  Auth            NextAuth.js · JWT · Google OAuth · Token system
Layer 3  Backend         FastAPI · Python · Railway
Layer 4  AI Agents       SQL Agent · DeepPrep · Doc2Chart · InsightEval
Layer 5  AI Models       OpenAI gpt-5.4-mini · Groq llama-3.3-70b
Layer 6  Memory          Mem0 (BI Chatbot only)
Layer 7  Database        Prisma ORM · PostgreSQL · Railway
Layer 8  Data Sources    PostgreSQL · MySQL · REST API · CSV · BigQuery · Snowflake
```

**Key design decision:** Each of the 4 agents has its own dedicated FastAPI endpoint, its own system prompt (persona), and makes its own independent OpenAI call. No shared state between agents — each receives a clean payload and returns a structured JSON response.

---

## 2. 4-Agent Pipeline

The pipeline is sequential. Each agent's output is the next agent's input.

```
User KPI Input
      │
      ▼
POST /agent/sql
      │  Returns: { rows: [...], columns: [...], dataset_name: "..." }
      │
      ▼
POST /agent/deepprep
      │  Returns: { rows: [...], columns: [...], meta: {...} }
      │
      ▼
POST /agent/doc2chart
      │  Returns: { dashboards: [...4 specs...], narrative: {...} }
      │
      ▼
POST /agent/insights
      │  Returns: { insights: {...6 types...}, voice_narration: "...", top_insight: "..." }
      │
      ▼
Frontend renders 4 dashboards + insights + voice
```

### Fallback Behavior

If the user has not provided a Dataset URL and no database is connected, the pipeline falls back to the legacy CSV-based flow via `POST /gen-dashboard`. This preserves backward compatibility.

```python
# Frontend logic (lib/api.ts)
if (datasetUrl) {
  await fetch('/dataset/url', { ... })    // store URL data
  return agentPipeline(kpi)              // use agent flow
} else {
  return legacyDashboard(kpi)            // use CSV fallback
}
```

---

## 3. SQL Agent

**File:** `backend/app/routers/agents.py` → `run_sql_agent()`  
**Endpoint:** `POST /agent/sql`  
**Model:** `gpt-5.4-mini-2026-03-17`

### Persona
```
You are a senior data engineer with 10 years of experience in SQL 
and database design. Your job is to analyze database schemas and 
write accurate, efficient SQL queries. Never hallucinate column 
names. Always verify against the schema provided.
```

### Request Payload
```json
{
  "kpi": "Monthly Revenue by Region and Category",
  "session_id": "abc123",
  "dataset_id": "optional-dynamic-dataset-id"
}
```

### Response
```json
{
  "rows": [
    { "Region": "North", "Category": "Electronics", "Sales": 284500 },
    ...
  ],
  "columns": ["Region", "Category", "Sales"],
  "query_used": "SELECT Region, Category, SUM(Sales) ...",
  "dataset_name": "Power BI Sales"
}
```

### Internal Flow
1. Load schema from `DynamicDataset` (if URL was provided) or scan CSV catalog
2. Send schema + KPI to `gpt-5.4-mini` → receive SQL query
3. Execute query against data source
4. If execution fails → send error back to model → retry (max 3 attempts)
5. Return normalized rows

### InfoAgent + GenAgent Pattern
Inspired by the SQL Agent research paper:
- **InfoAgent:** Extracts relevant tables/columns from schema given KPI intent
- **GenAgent:** Writes the actual SQL using InfoAgent's context as in-context examples

---

## 4. DeepPrep Agent

**File:** `backend/app/routers/agents.py` → `run_deepprep_agent()`  
**Endpoint:** `POST /agent/deepprep`  
**Model:** `gpt-5.4-mini-2026-03-17`

### Persona
```
You are a data preparation specialist. Your job is to clean, 
join, reshape, and aggregate raw data tables into analysis-ready 
format. Use the minimum operators needed. Always verify your 
output has no nulls in key columns.
```

### Request Payload
```json
{
  "kpi": "Monthly Revenue by Region and Category",
  "rows": [...raw rows from SQL Agent...],
  "columns": ["Region", "Category", "Sales", "OrderDate"]
}
```

### Response
```json
{
  "rows": [...cleaned, aggregated rows, max 60...],
  "columns": ["region", "category", "sales"],
  "meta": {
    "operators_applied": ["deduplicate", "groupby"],
    "row_count": 48,
    "metric": "sales",
    "dimensions": ["region", "category"]
  }
}
```

### Supported Operators

| Operator | Description |
|---|---|
| `Deduplicate` | Remove duplicate rows by key columns |
| `Join` | Merge two tables on common key |
| `GroupBy` | Aggregate rows by dimension columns |
| `Pivot` | Reshape long → wide format |
| `Filter` | Remove rows matching condition |
| `SplitColumn` | Split one column into multiple |
| `SelectColumn` | Keep only needed columns |
| `ValueTransform` | Standardize values (dates, currency) |

### Tree-Based Backtracking
Inspired by the DeepPrep research paper:
- Each operator creates a new "node" in the execution tree
- If an operator fails (empty result, type error) → backtrack to parent node
- Try alternative operator from the same parent
- Max depth: 5 operators, max retries: 3

---

## 5. Doc2Chart Agent

**File:** `backend/app/routers/agents.py` → `run_doc2chart_agent()`  
**Endpoint:** `POST /agent/doc2chart`  
**Model:** `gpt-5.4-mini-2026-03-17`

### Persona
```
You are a data visualization expert specializing in executive 
dashboards. You create PowerBI-grade visualizations. You always 
choose the most appropriate chart type based on data structure 
and business intent. Never use a chart type just because it looks 
impressive — it must serve the insight.
```

### Request Payload
```json
{
  "kpi": "Monthly Revenue by Region and Category",
  "rows": [...clean rows from DeepPrep...],
  "columns": ["region", "category", "sales"],
  "selected_charts": [],
  "selected_themes": []
}
```

### Response
```json
{
  "dashboards": [
    {
      "id": "dashboard_1",
      "title": "Executive Overview",
      "theme": {
        "background": "#0A1628",
        "cardBackground": "#0D2137",
        "primaryColor": "#1E88E5",
        "accentColor": "#00E5FF",
        "textColor": "#FFFFFF"
      },
      "kpiCards": [
        { "id": "kpi_1", "label": "Total Revenue", "value": 284500, "formattedValue": "₹2.84L", "delta": 8.5, "deltaDirection": "up" }
      ],
      "charts": [
        {
          "id": "chart_1",
          "type": "line",
          "title": "Revenue Trend",
          "position": { "x": 0, "y": 0, "w": 8, "h": 5 },
          "xAxis": { "field": "region", "label": "Region" },
          "yAxis": { "field": "sales", "label": "Revenue" },
          "data": [...]
        }
      ],
      "insightText": "North region leads with ₹1.2L, up 14% MoM."
    },
    ...3 more dashboards...
  ]
}
```

### Chart Type Heuristics

| Data Pattern | Recommended Chart |
|---|---|
| Time series, 4+ points | Line / Area / Step Line |
| Time series, ≤3 points | Bar |
| Category comparison, many | Horizontal Bar |
| Category comparison, few | Bar |
| Part-of-whole, ≤6 segments | Donut / Pie |
| Part-of-whole, many | Treemap |
| Hierarchy | Sunburst |
| Flow between categories | Sankey |
| Correlation | Scatter / Bubble |
| Performance vs target | Gauge / Radial Bar |
| Distribution intensity | Heatmap |
| Step changes | Waterfall |
| Stage conversion | Funnel |

### 4 Dashboard Themes

| Dashboard | Theme | Colors |
|---|---|---|
| Executive Overview | Dark Navy | `#0A1628` bg · `#1E88E5` primary · `#00E5FF` accent |
| Comparative Analysis | Clean White | `#FAFAFA` bg · `#E53935` primary · `#FF7043` accent |
| Deep Dive | Dark Slate | `#1A1A2E` bg · `#7C4DFF` primary · `#FFD740` accent |
| Performance Metrics | Dark Green | `#0D1F1A` bg · `#00BFA5` primary · `#FFD740` accent |

---

## 6. InsightEval Agent

**File:** `backend/app/routers/agents.py` → `run_insights_agent()`  
**Endpoint:** `POST /agent/insights`  
**Model:** `gpt-5.4-mini-2026-03-17`

### Persona
```
You are a senior business intelligence analyst with expertise in 
finding non-obvious patterns in data. You never state obvious 
facts. Every insight must contain real numbers from the data. 
You think like a CFO reading a board report.
```

### Request Payload
```json
{
  "kpi": "Monthly Revenue by Region and Category",
  "rows": [...clean rows...],
  "columns": ["region", "category", "sales"]
}
```

### Response
```json
{
  "insights": {
    "descriptive":  "North region generated ₹1.2L, contributing 42% of total revenue across 6 categories.",
    "diagnostic":   "Electronics drove 68% of North's revenue, suggesting strong B2B demand in that segment.",
    "predictive":   "At current growth rate of 14% MoM, North region is on track to cross ₹1.5L by next quarter.",
    "prescriptive": "Allocate 20% more marketing budget to South region — it has highest growth rate (31%) but lowest absolute revenue.",
    "evaluative":   "Performance is 23% above same-period benchmark; only West region missed its target by 8%.",
    "exploratory":  "Furniture category shows unusual spike in December — possible seasonal pattern not seen in other categories."
  },
  "kpi_coverage_percent": 91,
  "top_insight": "South region's 31% growth rate is the highest but it receives the least marketing investment.",
  "voice_narration": "Your revenue dashboard shows strong overall performance with ₹2.84 lakhs total. North leads at 42% share, but South is your fastest-growing region at 31% month-over-month. Electronics dominates across all regions. Immediate opportunity: reallocate budget to South to capitalize on its momentum."
}
```

### 6 Insight Types Reference

| Type | Question Answered | Example |
|---|---|---|
| **Descriptive** | What happened? | "Total revenue was ₹2.84L across 4 regions" |
| **Diagnostic** | Why did it happen? | "North outperformed due to Electronics demand spike" |
| **Predictive** | What will happen? | "Q2 projected at ₹3.2L at current growth rate" |
| **Prescriptive** | What should we do? | "Increase South region budget by 20%" |
| **Evaluative** | How are we performing? | "23% above benchmark, West missed by 8%" |
| **Exploratory** | What hidden patterns exist? | "Furniture shows unusual December seasonality" |

---

## 7. Dataset URL Feature

Users can paste a URL pointing to any CSV, JSON, or API endpoint. The data is fetched, stored temporarily in Prisma, used for dashboard generation, then deleted.

### Flow
```
POST /dataset/url
  { url: "https://example.com/sales.csv", session_id: "abc123" }

  ↓ fetch URL → pandas.read_csv() / requests.get()
  ↓ parse → DataFrame
  ↓ store in DynamicDataset (Prisma)
    { userId, sessionId, rawData: JSON, expiresAt: now+2hours }

  ↓ SQL Agent uses this data for KPI query
  ↓ Dashboard generated

POST /dataset/clear
  { session_id: "abc123" }
  ↓ DELETE FROM DynamicDataset WHERE sessionId = "abc123"
```

### DynamicDataset Prisma Model
```prisma
model DynamicDataset {
  id        String   @id @default(cuid())
  userId    String
  sessionId String
  tableName String
  rawData   Json
  columns   Json
  rowCount  Int
  sourceUrl String
  createdAt DateTime @default(now())
  expiresAt DateTime           // auto-cleanup after 2 hours
  user      User     @relation(fields: [userId], references: [id])

  @@index([sessionId])
  @@index([expiresAt])
}
```

### Supported URL Formats
- `.csv` files — parsed with `pandas.read_csv()`
- `.json` files — parsed with `pandas.read_json()`
- REST API endpoints returning JSON array — fetched with `requests.get()`
- Google Sheets export URLs (`/export?format=csv`)

---

## 8. BI Chatbot + Mem0

**File:** `backend/app/services/bi_chat_service.py`  
**Endpoint:** `POST /chat`  
**LLM:** Groq `llama-3.3-70b` (fast responses)  
**Memory:** Mem0 (per user_id)

### Memory Types

| Type | What is stored | Lifetime |
|---|---|---|
| Short-term | Current session conversation | Session |
| Long-term | User preferences, KPI patterns, theme choices | Permanent |
| Entity | Specific KPIs, regions, categories user cares about | Permanent |

### Chat Flow
```python
async def chat(user_id, message, conversation_id):
    # 1. Fetch relevant memories
    memories = mem0.search(query=message, user_id=user_id)

    # 2. Build context
    context = f"""
    User memories: {memories}
    Current dashboard KPI: {current_kpi}
    Conversation history: {last_10_messages}
    """

    # 3. Call SQL Agent if data needed
    if needs_data(message):
        data = await run_sql_agent(SqlAgentRequest(kpi=message))
        context += f"\nFresh data: {data['rows'][:20]}"

    # 4. Generate response with Groq
    response = groq_client.chat(system=CHATBOT_PERSONA, context=context, message=message)

    # 5. Save to Mem0
    mem0.add(messages=[{"role":"user","content":message},
                        {"role":"assistant","content":response}],
              user_id=user_id)

    # 6. Save to Prisma (Conversation + Message models)
    save_to_db(conversation_id, message, response)

    return response
```

### Chatbot Persona
```
You are a world-class BI analyst assistant embedded in a 
dashboard tool. You have access to the user's current data 
and past preferences. You give concise, number-backed answers. 
You always relate answers back to the KPI being analyzed.
```

---

## 9. Prisma Schema

Full schema at `frontend/prisma/schema.prisma`.

### Core Models

```prisma
model User {
  id             String          @id @default(cuid())
  name           String?
  email          String          @unique
  emailVerified  DateTime?
  image          String?
  passwordHash   String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  accounts       Account[]
  sessions       Session[]
  subscriptions  Subscription[]
  usages         UsageEvent[]
  conversations  Conversation[]
  dynamicDatasets DynamicDataset[]
}

model Subscription {
  id          String   @id @default(cuid())
  userId      String
  plan        PlanTier               // FREE | PRO | ENTERPRISE
  status      String   @default("active")
  periodStart DateTime @default(now())
  periodEnd   DateTime
  createdAt   DateTime @default(now())
  user        User     @relation(...)
}

model UsageEvent {
  id        String      @id @default(cuid())
  userId    String
  metric    UsageMetric // KPI_QUERY | DASHBOARD_GENERATION | BI_CHAT_QUERY | etc.
  value     Int         @default(1)
  createdAt DateTime    @default(now())
  user      User        @relation(...)
}

model Conversation {
  id        String    @id @default(cuid())
  userId    String
  title     String
  kpi       String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
  user      User      @relation(...)
}

model DynamicDataset {
  id        String   @id @default(cuid())
  userId    String
  sessionId String
  tableName String
  rawData   Json
  columns   Json
  rowCount  Int
  sourceUrl String
  createdAt DateTime @default(now())
  expiresAt DateTime
  user      User     @relation(...)

  @@index([sessionId])
  @@index([expiresAt])
}
```

### Enums
```prisma
enum PlanTier    { FREE · PRO · ENTERPRISE }
enum UsageMetric { KPI_QUERY · DASHBOARD_GENERATION · PREMIUM_CHART_SELECTION · BI_CHAT_QUERY · VOICE_EXPLANATION }
enum MessageRole { USER · ASSISTANT }
```

---

## 10. Frontend Components

| Component | File | Purpose |
|---|---|---|
| `KpiInput` | `components/KpiInput.tsx` | Voice + text KPI entry |
| `DatasetUrlInput` | `components/DatasetUrlInput.tsx` | Paste dataset URL |
| `DashboardRenderer` | `components/DashboardRenderer.tsx` | 4-theme dashboard render |
| `ChartRenderer` | `components/ChartRenderer.tsx` | Routes to 24 chart components |
| `BIChatbot` | `components/BIChatbot.tsx` | Mem0-powered chat panel |
| `VoicePlayer` | `components/VoicePlayer.tsx` | SpeechSynthesis narration |
| `DashboardTabs` | `components/DashboardTabs.tsx` | Switch between 4 dashboards |
| `KpiCard` | `components/KpiCard.tsx` | Metric card with delta |
| `TopNavbar` | `components/TopNavbar.tsx` | Navigation + user profile |

### Chart Components (24)

```
charts/
├── LineChartComp.tsx
├── BarChartComp.tsx
├── AreaChartComp.tsx
├── DonutChartComp.tsx
├── PieChartComp.tsx
├── TreemapComp.tsx
├── HeatmapComp.tsx
├── GaugeComp.tsx
├── ScatterComp.tsx
├── BubbleChartComp.tsx
├── RadarChartComp.tsx
├── SankeyChartComp.tsx
├── SunburstChartComp.tsx
├── FunnelChartComp.tsx
├── WaterfallComp.tsx
├── ComboChartComp.tsx
├── RadialBarChartComp.tsx
├── PolarBarChartComp.tsx
├── RoseChartComp.tsx
├── NightingaleChartComp.tsx
├── SparklineComp.tsx
├── StepLineChartComp.tsx
└── PictorialBarChartComp.tsx
```

---

## 11. API Reference

### Agent Endpoints

#### `POST /agent/sql`
```json
Request:  { "kpi": string, "session_id": string, "dataset_id"?: string }
Response: { "rows": [...], "columns": [...], "query_used": string, "dataset_name": string }
```

#### `POST /agent/deepprep`
```json
Request:  { "kpi": string, "rows": [...], "columns": [...] }
Response: { "rows": [...], "columns": [...], "meta": { "operators_applied": [...], "row_count": int } }
```

#### `POST /agent/doc2chart`
```json
Request:  { "kpi": string, "rows": [...], "columns": [...], "selected_charts"?: [...], "selected_themes"?: [...] }
Response: { "dashboards": [...4 dashboard specs...] }
```

#### `POST /agent/insights`
```json
Request:  { "kpi": string, "rows": [...], "columns": [...] }
Response: { "insights": {...6 types...}, "kpi_coverage_percent": int, "top_insight": string, "voice_narration": string }
```

### Dataset Endpoints

#### `POST /dataset/url`
```json
Request:  { "url": string, "session_id": string, "user_id": string }
Response: { "dataset_id": string, "columns": [...], "row_count": int, "preview": [...5 rows...] }
```

#### `DELETE /dataset/session/{session_id}`
```json
Response: { "deleted": int, "message": "Session data cleared" }
```

### Chat Endpoint

#### `POST /chat`
```json
Request:  { "message": string, "conversation_id": string, "user_id": string }
Response: { "response": string, "conversation_id": string }
```

---

## 12. Auth & Tokens

### Authentication Flow
```
User visits /login
  → Google OAuth → NextAuth.js callback → JWT created (7d expiry)
  OR
  → Email + Password → bcrypt verify → JWT created (7d expiry)
  → 500 tokens credited on first signup
```

### Token Deduction

| Action | Tokens |
|---|---|
| KPI Query | 10 |
| Dashboard Generation | 20 |
| Premium Chart Selection | 5 per chart |
| BI Chat Query | 5 |
| Voice Explanation | 3 |

### Plans

| Plan | Tokens/month | Features |
|---|---|---|
| FREE | 500 | Basic charts · Standard themes |
| PRO | 5,000 | All 24 charts · All themes · Priority |
| ENTERPRISE | Unlimited | Custom deployment · SLA |

---

## 13. Environment Variables

### Backend (`backend/.env`)
```env
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
MEM0_API_KEY=m0-...               # optional
ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app
DATA_FOLDER=../data               # fallback CSV folder
```

### Frontend (`frontend/.env.local`)
```env
DATABASE_URL=postgresql://user:pass@host:5432/talkingbi
NEXTAUTH_SECRET=your-secret-min-32-chars
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

---

## 14. Deployment

### Frontend → Vercel
```bash
# Push to GitHub → connect to Vercel
# Add all frontend env vars in Vercel dashboard
# Set NEXTAUTH_URL to your Vercel domain
npx prisma migrate deploy    # run migrations
```

### Backend → Railway
```bash
# Connect GitHub repo to Railway
# Add all backend env vars
# Railway auto-detects Python → runs uvicorn
# Set start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Database → Railway PostgreSQL
```bash
# Provision Railway PostgreSQL service
# Copy DATABASE_URL to both frontend and backend env vars
# Run: npx prisma migrate deploy
```

### Health Check
```bash
curl https://your-backend.railway.app/ping
# → { "status": "alive" }
```

---

<div align="center">

**Talking BI** · Technical Documentation v1.0.0  


</div>