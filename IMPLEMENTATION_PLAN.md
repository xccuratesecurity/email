# Implementation Plan & Milestones

## Project: India D2C Lead Research System
**Goal**: Compliant, high-quality lead discovery tool for personal B2B research

---

## Phase 1: Core Infrastructure (Week 1)
**Duration**: 5-7 days

### Milestone 1.1: Backend Foundation
- [x] FastAPI project setup with CORS
- [x] Pydantic models for requests/responses
- [x] Basic job queue system (in-memory)
- [x] Health check endpoints
- [ ] Deploy locally with Docker Compose
- [ ] Test API with Postman/curl

**Deliverables**:
- `backend/main.py` - Working API
- `backend/requirements.txt` - Dependencies
- `.env` configuration
- Basic tests

**Success Criteria**:
- API responds to health checks
- Can create and query research jobs
- Environment variables load correctly

---

### Milestone 1.2: Email Validation Module
- [x] Syntax validation (RFC 5322)
- [x] DNS/MX record checking
- [x] Free provider detection
- [x] Domain age verification
- [x] Confidence scoring algorithm
- [ ] Unit tests (>90% coverage)

**Deliverables**:
- `backend/email_validator.py` - Validation logic
- `backend/tests/test_validator.py` - Test suite
- Documentation on scoring algorithm

**Success Criteria**:
- Can validate 100 emails in <5 seconds
- Correctly identifies free providers
- Confidence scores are reproducible

---

### Milestone 1.3: Frontend UI
- [x] React app setup
- [x] Filter interface (categories, cities, batch size)
- [x] Research trigger button
- [x] Progress indicators
- [x] Results table with sorting
- [x] CSV/JSON export functionality
- [ ] Responsive design testing

**Deliverables**:
- `frontend/src/App.jsx` - React application
- CSS styling (embedded)
- Export functions

**Success Criteria**:
- UI loads without errors
- Filters update state correctly
- Export generates valid files

---

## Phase 2: Discovery Engine (Week 2)
**Duration**: 7-10 days

### Milestone 2.1: Company Discovery
- [ ] Claude API integration with web_search
- [ ] Multi-query search strategy
- [ ] Company data extraction from articles
- [ ] Domain verification
- [ ] Activity checking (recent content)
- [ ] Deduplication logic

**Deliverables**:
- `backend/discovery.py` - Discovery engine
- Search query templates
- Company validation rules

**Success Criteria**:
- Discovers 20-50 companies per batch
- 90%+ are active D2C brands
- Results match filter criteria

**Test Case**:
```python
filters = {
    'categories': ['Beauty & Cosmetics'],
    'cities': ['Mumbai', 'Bangalore'],
    'batch_size': 50
}
companies = await discover_companies(filters)
assert len(companies) >= 30
assert all(c['category'] == 'Beauty & Cosmetics' for c in companies)
```

---

### Milestone 2.2: Role Identification
- [ ] Website scraping (About, Team pages)
- [ ] NLP name extraction with spaCy
- [ ] Role pattern matching
- [ ] Person-to-role confidence scoring
- [ ] Current employee verification

**Deliverables**:
- `backend/role_finder.py` - Role identification
- spaCy NER pipeline
- Role regex patterns

**Success Criteria**:
- Identifies 1-3 decision makers per company
- 80%+ accuracy on role classification
- Handles various page layouts

**Test Case**:
```python
company = {'name': 'Mamaearth', 'website': 'mamaearth.in'}
people = await find_decision_makers(company)
assert len(people) > 0
assert any('Founder' in p['role'] for p in people)
```

---

### Milestone 2.3: Email Discovery
- [ ] Multi-source email search
- [ ] Contact page scraping
- [ ] Press release parsing
- [ ] Author bio extraction
- [ ] Email-to-person matching
- [ ] Source URL verification

**Deliverables**:
- `backend/email_discovery.py` - Email finding logic
- Matching algorithms
- Source attribution

**Success Criteria**:
- Finds published emails for 30-50% of people
- 100% of returned emails have source URLs
- No pattern-generated emails without verification

**Test Case**:
```python
person = {'name': 'Varun Alagh', 'role': 'Founder'}
company = {'name': 'Mamaearth', 'domain': 'mamaearth.in'}
result = await find_published_email(person, company)
if result:
    assert '@mamaearth.in' in result['email']
    assert result['source_url'].startswith('http')
```

---

## Phase 3: Integration & Refinement (Week 3)
**Duration**: 5-7 days

### Milestone 3.1: End-to-End Pipeline
- [ ] Connect all components in workflow
- [ ] Add error handling and retries
- [ ] Implement progress tracking
- [ ] Add result caching
- [ ] Background job processing

**Deliverables**:
- `backend/orchestrator.py` - Main workflow
- Error recovery logic
- Progress update system

**Success Criteria**:
- Full pipeline runs without manual intervention
- Handles errors gracefully (network, parsing, etc.)
- Progress updates in real-time

**Test Case**:
```python
filters = {'batch_size': 50, 'categories': ['Fashion']}
job_id = await start_research_job(filters)

# Wait for completion
await poll_until_complete(job_id, timeout=300)

results = await get_job_results(job_id)
assert len(results) >= 25  # At least 50% success rate
assert all(r['confidence'] == 'High' for r in results)
```

---

### Milestone 3.2: Quality Assurance
- [ ] Manual verification of 100 samples
- [ ] Measure precision (valid/total)
- [ ] Identify common failure modes
- [ ] Implement fixes for edge cases
- [ ] Document limitations

**Deliverables**:
- QA report with metrics
- Edge case handling
- Known limitations doc

**Success Criteria**:
- Precision >90% on manual verification
- Documented workarounds for known issues
- Clear user guidance on limitations

---

### Milestone 3.3: Performance Optimization
- [ ] Add Redis caching for domains
- [ ] Implement concurrent processing
- [ ] Optimize API calls (batching)
- [ ] Add request throttling
- [ ] Profile and optimize slow functions

**Deliverables**:
- Caching layer
- Concurrent worker pool
- Performance benchmarks

**Success Criteria**:
- 50 leads in <10 minutes
- 200 leads in <30 minutes
- Domain checks cached (90% hit rate)

---

## Phase 4: Production Readiness (Week 4)
**Duration**: 5-7 days

### Milestone 4.1: Deployment
- [ ] Docker Compose configuration
- [ ] PostgreSQL schema and migrations
- [ ] Redis setup
- [ ] Environment-based config
- [ ] Production logging
- [ ] Health checks and monitoring

**Deliverables**:
- `docker-compose.yml`
- `backend/alembic/` - Database migrations
- Deployment guide (local & cloud)

**Success Criteria**:
- One-command local deployment
- All services start successfully
- Logs are structured and searchable

---

### Milestone 4.2: Documentation
- [x] Architecture document
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guide with examples
- [ ] Compliance guidelines
- [ ] Troubleshooting guide

**Deliverables**:
- `ARCHITECTURE.md`
- `USER_GUIDE.md`
- `COMPLIANCE.md`
- API docs at `/docs` endpoint

**Success Criteria**:
- New user can deploy in <30 minutes
- All endpoints documented
- Legal considerations clearly stated

---

### Milestone 4.3: Final Testing
- [ ] Integration test suite
- [ ] Load testing (100-500 leads)
- [ ] Error scenario testing
- [ ] Cross-browser frontend testing
- [ ] Security audit (basic)

**Deliverables**:
- `backend/tests/` - Full test suite
- Load test results
- Security checklist

**Success Criteria**:
- 80%+ test coverage
- No critical security issues
- System handles 500 leads without crashing

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low email discovery rate | High | Set realistic expectations (30-50%), over-discover companies |
| API rate limits (Claude) | Medium | Implement caching, batch requests efficiently |
| Domain verification slow | Medium | Cache results, use async DNS lookups |
| False positives in results | High | Strict validation rules, manual QA sampling |
| Legal compliance concerns | Critical | Clear documentation, no SMTP probing, published sources only |

---

## Success Metrics

### Quantitative
- **Precision**: >90% of returned emails are valid and deliverable
- **Discovery Rate**: 30-50% of companies have discoverable emails
- **Processing Speed**: 50 leads in <10 minutes, 200 in <30 minutes
- **System Uptime**: >95% during research jobs
- **User Satisfaction**: N/A (single user, but code quality & documentation matter)

### Qualitative
- Code is maintainable and well-documented
- System respects legal and ethical boundaries
- Results are genuinely useful for B2B research
- User can understand and audit each result

---

## Timeline Summary

| Phase | Duration | Key Outcome |
|-------|----------|-------------|
| Phase 1: Infrastructure | Week 1 (7 days) | Working API + UI + validation |
| Phase 2: Discovery | Week 2 (10 days) | End-to-end discovery pipeline |
| Phase 3: Refinement | Week 3 (7 days) | Quality & performance optimization |
| Phase 4: Production | Week 4 (7 days) | Deployable, documented system |
| **Total** | **~1 month** | Production-ready system |

---

## Next Steps (Right Now)

1. **Set up development environment**:
   ```bash
   cd lead-research-system
   python -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   ```

2. **Configure API keys**:
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env and add ANTHROPIC_API_KEY
   ```

3. **Start backend**:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

4. **Test basic functionality**:
   ```bash
   curl http://localhost:8000/api/health
   ```

5. **Run first research job**:
   - Open React app
   - Select filters
   - Click "Find & Verify Leads"
   - Observe results

---

## Future Enhancements (Post-MVP)

### Phase 5: Advanced Features
- [ ] CRM integrations (Salesforce, HubSpot)
- [ ] Scheduled re-verification
- [ ] ML-based quality scoring
- [ ] Multi-user support with auth
- [ ] Analytics dashboard
- [ ] Email sequence templates
- [ ] A/B testing for search queries

### Phase 6: Scale & Optimize
- [ ] Distributed worker architecture
- [ ] Kubernetes deployment
- [ ] Advanced caching (CDN for static data)
- [ ] Real-time notifications (WebSocket)
- [ ] Bulk import/export (10k+ leads)

---

## Appendix: Quick Start Commands

```bash
# Local development
docker-compose up -d
cd backend && uvicorn main:app --reload &
cd frontend && npm run dev

# Run tests
pytest backend/tests/ -v --cov

# Export results
curl -X GET http://localhost:8000/api/research/{job_id} > results.json

# Stop all services
docker-compose down
```

---

**Status**: Ready to begin Phase 1 implementation
**Last Updated**: 2026-01-29
