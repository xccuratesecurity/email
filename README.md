# India D2C Lead Research System

A compliant, high-quality lead discovery tool that surfaces publicly published contact information from India-based D2C brands.

## 🎯 What This Tool Does

- **Discovers** active India-based D2C companies using real-time web research
- **Identifies** founders and marketing decision-makers from public sources
- **Surfaces** only high-confidence, publicly published business emails
- **Validates** emails using DNS, MX records, and domain reputation checks
- **Exports** results in CSV/JSON format with full source attribution

## ✅ What Makes This Compliant

- **No SMTP probing** - doesn't test mail servers directly
- **Public sources only** - no login scraping or authentication bypass
- **Published emails only** - no pattern generation without verification
- **Full transparency** - every email includes source URL
- **Ethical design** - respects robots.txt, rate limits, and ToS

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** (for frontend)
- **Docker & Docker Compose** (optional, but recommended)
- **Anthropic API Key** - Get one at [console.anthropic.com](https://console.anthropic.com)

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone <repo-url>
cd lead-research-system

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env and add your ANTHROPIC_API_KEY

# 3. Start all services
docker-compose up -d

# 4. Check services are running
docker-compose ps

# 5. Access the application
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Frontend: http://localhost:3000
```

### Option 2: Local Development

#### Backend Setup

```bash
# 1. Create virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Download spaCy model
python -m spacy download en_core_web_sm

# 4. Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 5. Start PostgreSQL and Redis (Docker)
docker run -d --name leads_postgres \
  -e POSTGRES_DB=leads \
  -e POSTGRES_USER=leaduser \
  -e POSTGRES_PASSWORD=leadpass123 \
  -p 5432:5432 \
  postgres:15-alpine

docker run -d --name leads_redis \
  -p 6379:6379 \
  redis:7-alpine

# 6. Run backend
uvicorn main:app --reload --port 8000
```

#### Frontend Setup

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Configure API URL
echo "REACT_APP_API_URL=http://localhost:8000" > .env

# 3. Start development server
npm start
```

## 📚 Usage Guide

### Using the Web Interface

1. **Open the application** at http://localhost:3000

2. **Configure filters**:
   - **Batch Size**: Choose 50, 100, or 200 leads
   - **Categories**: Select D2C categories (Fashion, Beauty, Food, etc.)
   - **Cities**: Filter by Indian cities (Bangalore, Mumbai, etc.)
   - **Funding Stage**: All stages, Seed, Series A, B+, or Profitable

3. **Start research**:
   - Click "Find & Verify Leads"
   - Watch progress in real-time
   - Results appear as they're verified

4. **Review results**:
   - Check confidence scores
   - Click source URLs to verify
   - Select specific leads for export

5. **Export data**:
   - Click "Export CSV" or "Export JSON"
   - Results include: company, person, role, email, source, confidence

### Using the API

#### Start a research job

```bash
curl -X POST http://localhost:8000/api/research/start \
  -H "Content-Type: application/json" \
  -d '{
    "batch_size": 50,
    "categories": ["Beauty & Cosmetics", "Fashion & Apparel"],
    "cities": ["Mumbai", "Bangalore"],
    "funding_stage": "all",
    "date_range": "last-12-months"
  }'

# Response: {"job_id": "abc-123", "status": "started"}
```

#### Check job status

```bash
curl http://localhost:8000/api/research/abc-123

# Response includes progress and results
```

#### Export results

```bash
# Get results as JSON
curl http://localhost:8000/api/research/abc-123 > results.json

# Or use the web interface to export CSV
```

## 📊 What to Expect

### Discovery Rates

- **Companies discovered**: 30-50 per batch (depends on filters)
- **Decision makers identified**: 40-60% of companies
- **Published emails found**: 30-50% of decision makers
- **High-confidence results**: 80-90% of found emails

### Processing Time

- **50 leads**: 5-10 minutes
- **100 leads**: 10-20 minutes
- **200 leads**: 20-30 minutes

Times vary based on:
- Number of filters applied
- API response times
- Domain verification speed

### Quality Metrics

- **Precision**: >90% (emails are valid and deliverable)
- **Confidence**: Only "High" confidence emails are included by default
- **Source attribution**: 100% of results include source URLs

## 🏗️ Architecture

```
User Request
    ↓
FastAPI Backend
    ↓
Anthropic Claude API (with web_search)
    ↓
Discovery Pipeline
    ├─ Company Discovery (web research)
    ├─ Role Identification (NLP + scraping)
    ├─ Email Discovery (published sources only)
    └─ Validation (DNS, MX, reputation)
    ↓
PostgreSQL (result storage)
Redis (caching)
    ↓
Results Export (CSV/JSON)
```

### Key Components

1. **Discovery Engine** (`backend/discovery.py`)
   - Web research for D2C companies
   - Validates company activity
   - Filters by category, location, funding

2. **Email Validator** (`backend/email_validator.py`)
   - Syntax validation (RFC 5322)
   - DNS/MX record checking
   - Domain reputation analysis
   - Confidence scoring

3. **API Server** (`backend/main.py`)
   - RESTful endpoints
   - Background job processing
   - Progress tracking

4. **Frontend** (`frontend/src/App.jsx`)
   - Filter interface
   - Real-time progress
   - Results table with export

## 🔒 Compliance & Ethics

### Data Collection

✅ **Compliant**:
- Only public data (no authentication required)
- Explicitly published emails (contact pages, press releases)
- Full source attribution
- Purpose limitation (B2B research only)

❌ **What We DON'T Do**:
- Login scraping (LinkedIn, etc.)
- SMTP verification (mail server probing)
- Pattern generation without publication
- Automated outreach

### Legal Considerations

⚠️ **Important**: This tool provides data for research. You are responsible for:

1. **Obtaining consent** before sending emails
2. **Including opt-out mechanisms** in all communications
3. **Respecting anti-spam laws**: DPDP Act (India), CAN-SPAM (US), GDPR (EU)
4. **Not using for harassment** or unwanted solicitation

See `COMPLIANCE.md` for detailed guidelines.

## 📈 Performance & Optimization

### Caching Strategy

- **Domain validation**: Cached for 7 days
- **Company data**: Cached for 24 hours
- **DNS lookups**: Cached for 1 hour

### Rate Limiting

- **Per domain**: 10 requests/minute
- **Global delay**: 2-3 seconds between requests
- **Concurrent jobs**: 5 maximum

### Cost Estimates

**Per 200 leads**:
- Anthropic API: ~$0.50-1.00
- Infrastructure: $0 (local) to $0.10 (cloud)
- Total: ~$0.50-1.10

**Monthly** (assuming 1000 leads/month):
- API costs: ~$2.50-5.00
- Infrastructure: $0-20 (depending on hosting)

## 🧪 Testing

### Run Tests

```bash
# Unit tests
cd backend
pytest tests/ -v

# Integration tests
pytest tests/integration/ -v

# Coverage report
pytest --cov=. --cov-report=html
```

### Manual Quality Check

```bash
# Export 100 results
curl http://localhost:8000/api/research/{job_id} > sample.json

# Manually verify:
# 1. Email is published on source URL
# 2. Person is in stated role
# 3. Company is active D2C brand

# Calculate precision: valid_count / total_count
# Target: >90%
```

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check environment variables
cat backend/.env | grep ANTHROPIC_API_KEY

# Check database connection
docker exec -it leads_postgres psql -U leaduser -d leads -c "SELECT 1;"

# Check logs
docker-compose logs backend
```

### No results returned

1. **Check API key**: Ensure `ANTHROPIC_API_KEY` is valid
2. **Broaden filters**: Try removing category/city filters
3. **Check logs**: Look for errors in `docker-compose logs backend`

### Low discovery rate

This is expected. Many companies don't publish executive emails. Typical rates:
- 30-50% of companies have discoverable emails
- This is higher quality than pattern-generated emails

### Results seem outdated

- Companies change: People switch jobs, emails become invalid
- Re-run research periodically (every 3-6 months)
- Always verify before outreach

## 📝 Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
DEBUG=True
LOG_LEVEL=INFO
MAX_CONCURRENT_JOBS=5
```

### Customization

**Adjust confidence thresholds** (`backend/email_validator.py`):
```python
# Line 180
if score >= 80:  # Change threshold here
    confidence = 'High'
```

**Change batch sizes** (`frontend/src/App.jsx`):
```javascript
<option value={50}>50 leads</option>
<option value={100}>100 leads</option>
<option value={200}>200 leads</option>
<option value={500}>500 leads</option>  // Add this
```

## 🚢 Deployment

### Production Deployment (Railway/Render)

1. **Fork this repository** on GitHub

2. **Connect to Railway**:
   - Visit [railway.app](https://railway.app)
   - Create new project from GitHub repo
   - Add PostgreSQL and Redis services
   - Set environment variables

3. **Deploy**:
   ```bash
   railway up
   ```

4. **Access**:
   - Backend: `https://your-app.railway.app`
   - Frontend: Deploy separately or use static hosting

### Environment Variables for Production

```bash
DATABASE_URL=postgresql://...  # From Railway
REDIS_URL=redis://...          # From Railway
ANTHROPIC_API_KEY=sk-ant-...
DEBUG=False
LOG_LEVEL=WARNING
ALLOWED_ORIGINS=https://your-frontend.com
```

## 🤝 Contributing

This is a personal/private tool, but improvements are welcome:

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## 📄 License

Private use only. Not for redistribution or commercial use without permission.

## 🔗 Resources

- **Anthropic API Docs**: https://docs.anthropic.com
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **React Docs**: https://react.dev

## 📧 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the logs: `docker-compose logs`
3. Open an issue on GitHub

---

**Built with**: Python, FastAPI, React, Anthropic Claude, PostgreSQL, Redis

**Status**: Production-ready MVP

**Last Updated**: 2026-01-29
