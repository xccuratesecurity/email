# India D2C Lead Research System - Technical Architecture

## Executive Summary

This is a **compliant, high-quality lead research system** that discovers and surfaces only publicly published contact information from India-based D2C brands. The system prioritizes quality over quantity, legal compliance over aggressive tactics, and genuine value over risky shortcuts.

---

## System Architecture

### High-Level Flow

```
User Input (Filters) 
    ↓
Discovery Pipeline (Web Research)
    ↓
Company Validation (Active/Relevant)
    ↓
Role Identification (Founders/Marketing)
    ↓
Email Discovery (Published Sources Only)
    ↓
Quality Filtering (Strict Validation)
    ↓
Results Export (CSV/JSON)
```

---

## Core Components

### 1. Discovery Engine

**Purpose**: Find India-based D2C companies using public signals

**Data Sources** (All Public, No Authentication Required):
- News articles (Economic Times, YourStory, Inc42, TechCrunch India)
- Press releases (via Google News API)
- Public company websites
- Social media (public profiles only)
- Startup databases with free tiers (Crunchbase public data)

**Discovery Strategy**:
```
FOR each category (Fashion, Beauty, Food, etc.):
  1. Search: "India D2C [category] startup funding 2024-2026"
  2. Search: "India [category] brand launch recent"
  3. Search: "[city] D2C [category] company"
  4. Extract company names from articles
  5. Validate company is:
     - India-based (check domain, address, news)
     - Active (website live, recent content)
     - D2C (direct-to-consumer model)
     - Meets funding/profitability filters
```

**Implementation**:
- Uses Claude API with web_search tool
- Aggregates results from multiple searches
- Deduplicates companies
- Validates domain activity

---

### 2. Role Identification

**Purpose**: Find decision-maker names and roles

**Sources**:
- Company "About" pages
- "Team" or "Leadership" pages
- Press articles quoting executives
- Blog author bios
- LinkedIn public company pages (no login scraping)

**Target Roles**:
- Founder / Co-Founder
- CEO / Managing Director
- Head of Marketing / CMO
- Head of Growth / Brand
- Marketing Lead / Director

**Extraction Logic**:
```python
def identify_decision_makers(company_url):
    """
    1. Scrape /about, /team, /leadership pages
    2. Extract names with NLP (spaCy PERSON entities)
    3. Match roles using regex patterns:
       - "Founder|Co-Founder"
       - "CMO|Chief Marketing Officer"
       - "Head of Marketing|Marketing Head"
    4. Validate person is current (not alumni/advisor)
    5. Return [{name, role, confidence}]
    """
```

---

### 3. Email Discovery (STRICT RULES)

**Only Accept Emails If Explicitly Published On**:
1. Company contact page
2. Press release
3. Blog author bio
4. Media/PR page
5. Official announcement

**Discovery Process**:
```python
def find_published_email(person_name, company_domain):
    """
    1. Search: "site:{company_domain} {person_name} email"
    2. Scrape contact, about, team pages
    3. Extract email addresses using regex
    4. Match email to person name (fuzzy matching)
    5. Verify email domain matches company domain
    6. Return email + source_url or None
    """
    
    # NEVER return pattern-generated emails
    # NEVER return gmail/yahoo/outlook
    # NEVER return if not found on official source
```

---

### 4. Quality Validation (Multi-Layer)

**Layer 1: Format & Syntax**
```python
import re
from email_validator import validate_email

def validate_email_format(email):
    try:
        v = validate_email(email)
        return v.email  # Normalized
    except EmailNotValidError:
        return None
```

**Layer 2: Domain Health**
```python
import dns.resolver
import whois

def validate_domain(domain):
    checks = {
        'dns_exists': False,
        'has_mx': False,
        'domain_age': None,
        'is_active': False
    }
    
    # DNS A record check
    try:
        dns.resolver.resolve(domain, 'A')
        checks['dns_exists'] = True
    except:
        return checks  # Fail fast
    
    # MX record check
    try:
        mx_records = dns.resolver.resolve(domain, 'MX')
        checks['has_mx'] = len(mx_records) > 0
    except:
        pass
    
    # WHOIS check for domain age
    try:
        w = whois.whois(domain)
        if w.creation_date:
            age_days = (datetime.now() - w.creation_date).days
            checks['domain_age'] = age_days
            checks['is_active'] = age_days > 90  # At least 3 months old
    except:
        pass
    
    return checks
```

**Layer 3: Free Provider Detection**
```python
FREE_PROVIDERS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'rediffmail.com', 'protonmail.com', 'yandex.com'
]

def is_free_provider(email):
    domain = email.split('@')[1].lower()
    return domain in FREE_PROVIDERS
```

**Layer 4: Website Activity Check**
```python
import requests
from bs4 import BeautifulSoup

def check_website_activity(domain):
    """
    Check if website shows signs of activity:
    - Has recent blog posts (timestamps)
    - Has multiple pages (not just landing)
    - Has working contact form
    - Has social media links
    """
    try:
        response = requests.get(f"https://{domain}", timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Count internal links
        links = soup.find_all('a', href=True)
        internal_links = [l for l in links if domain in l['href']]
        
        # Look for date patterns (blog activity)
        text = soup.get_text()
        has_recent_dates = bool(re.search(r'202[4-6]', text))
        
        return {
            'has_content': len(soup.find_all('p')) > 5,
            'has_navigation': len(internal_links) > 3,
            'shows_activity': has_recent_dates
        }
    except:
        return None
```

**Layer 5: Confidence Scoring**
```python
def calculate_confidence(email, domain, source_url, domain_checks, activity):
    """
    Confidence = weighted sum of signals
    """
    score = 0
    factors = []
    
    # Email found on official source (+40)
    if source_url and domain in source_url:
        score += 40
        factors.append('official_source')
    
    # Domain has MX records (+20)
    if domain_checks['has_mx']:
        score += 20
        factors.append('mx_valid')
    
    # Domain age > 1 year (+15)
    if domain_checks['domain_age'] and domain_checks['domain_age'] > 365:
        score += 15
        factors.append('established_domain')
    
    # Website shows activity (+15)
    if activity and activity['shows_activity']:
        score += 15
        factors.append('active_site')
    
    # Email matches company domain (+10)
    if email.endswith(f"@{domain}"):
        score += 10
        factors.append('domain_match')
    
    # Convert to label
    if score >= 80:
        return 'High', score, factors
    elif score >= 60:
        return 'Medium', score, factors
    else:
        return 'Low', score, factors
```

**Filtering Logic**:
```python
def should_include_email(email, confidence_label, validation_results):
    """
    Only include if ALL conditions met:
    1. Confidence = 'High'
    2. Not a free provider
    3. Domain has MX records
    4. Found on official source
    """
    if confidence_label != 'High':
        return False
    
    if is_free_provider(email):
        return False
    
    if not validation_results['domain']['has_mx']:
        return False
    
    if not validation_results['source_url']:
        return False
    
    return True
```

---

## 5. System Workflow (End-to-End)

```python
async def research_leads(filters):
    """
    Main orchestration function
    """
    results = []
    
    # Phase 1: Discovery
    companies = await discover_companies(
        categories=filters['categories'],
        cities=filters['cities'],
        funding_stage=filters['funding_stage'],
        limit=filters['batch_size'] * 3  # Over-discover to compensate for filtering
    )
    
    # Phase 2: Role Identification
    for company in companies:
        decision_makers = await find_decision_makers(company['domain'])
        company['people'] = decision_makers
    
    # Phase 3: Email Discovery
    for company in companies:
        for person in company['people']:
            email_result = await find_published_email(
                person['name'], 
                company['domain']
            )
            
            if email_result:
                person['email'] = email_result['email']
                person['source_url'] = email_result['source_url']
    
    # Phase 4: Validation & Filtering
    for company in companies:
        for person in company['people']:
            if 'email' not in person:
                continue
            
            # Run all validation checks
            domain_checks = validate_domain(company['domain'])
            activity = check_website_activity(company['domain'])
            
            confidence, score, factors = calculate_confidence(
                person['email'],
                company['domain'],
                person.get('source_url'),
                domain_checks,
                activity
            )
            
            # Only include high-confidence
            if should_include_email(person['email'], confidence, {
                'domain': domain_checks,
                'source_url': person.get('source_url')
            }):
                results.append({
                    'company': company['name'],
                    'website': company['domain'],
                    'person': person['name'],
                    'role': person['role'],
                    'email': person['email'],
                    'source': person['source_url'],
                    'confidence': confidence,
                    'confidence_score': score,
                    'validation_factors': factors
                })
    
    # Phase 5: Limit to requested batch size
    return results[:filters['batch_size']]
```

---

## Data Models

### Company
```python
{
    'name': str,           # "Mamaearth"
    'domain': str,         # "mamaearth.in"
    'category': str,       # "Beauty & Cosmetics"
    'city': str,           # "Gurugram"
    'funding_stage': str,  # "Series E"
    'last_funding_date': str,  # "2023-01"
    'website_active': bool,
    'discovered_from': str  # URL of source article
}
```

### Person
```python
{
    'name': str,           # "Varun Alagh"
    'role': str,           # "Co-Founder & CEO"
    'email': str,          # "varun@mamaearth.in"
    'source_url': str,     # "https://mamaearth.in/about"
    'confidence': str,     # "High" | "Medium" | "Low"
    'confidence_score': int,  # 0-100
    'validation_factors': list  # ['official_source', 'mx_valid', ...]
}
```

### Result (Export Format)
```python
{
    'company': str,
    'website': str,
    'person': str,
    'role': str,
    'email': str,
    'source': str,
    'confidence': str,
    'timestamp': str  # ISO 8601
}
```

---

## Rate Limiting & Proxy Strategy

### No Aggressive Scraping
- **Respect robots.txt**
- **Implement delays** between requests (2-5 seconds)
- **Use User-Agent rotation** to appear as normal browsers
- **No SMTP probing** (doesn't test mail servers directly)

### API Usage
- Claude API with web_search: ~1-2 calls per company
- Google Custom Search API: Free tier (100 queries/day)
- DNS lookups: No rate limits (use public resolvers)

### Proxy Strategy (If Needed)
```python
# Only if blocked by rate limits
PROXY_CONFIG = {
    'provider': 'ScraperAPI or Bright Data',
    'rotation': 'per-request',
    'type': 'residential',
    'cost': '~$0.001 per request'
}

# Conservative approach
MAX_CONCURRENT = 5  # Don't overwhelm sites
DELAY_BETWEEN_REQUESTS = 3  # seconds
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Precision (Valid emails) | >90% | Manual verification of 100 sample |
| Discovery rate | 50-200 companies/hour | Depends on filters |
| Email find rate | 30-50% of companies | Many don't publish emails |
| Processing time (50 leads) | 5-10 minutes | Including validation |
| Processing time (200 leads) | 20-30 minutes | Parallel processing |

---

## Technology Stack

### Backend
- **Python 3.11+**
- **FastAPI** (REST API)
- **Anthropic Claude API** (discovery with web_search)
- **BeautifulSoup4** (HTML parsing)
- **spaCy** (NLP for name extraction)
- **dnspython** (DNS validation)
- **python-whois** (domain age)
- **requests** (HTTP client)
- **Redis** (caching)
- **PostgreSQL** (result storage)

### Frontend
- **React 18**
- **Lucide Icons**
- **Tailwind CSS** (via CDN)

### Infrastructure
- **Local**: Docker Compose (all services)
- **Cloud**: Railway/Render (simple deployment)
- **Database**: Supabase/PlanetScale (free tier)
- **Cache**: Upstash Redis (free tier)

---

## Deployment Instructions

### Local Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd lead-research-system

# 2. Install dependencies
pip install -r requirements.txt
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Start services
docker-compose up -d

# 5. Run backend
python -m uvicorn main:app --reload --port 8000

# 6. Run frontend
npm run dev
```

### Environment Variables
```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379

# Optional
GOOGLE_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
SENTRY_DSN=...
```

### Docker Compose
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: leads
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/leads
      REDIS_URL: redis://redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:8000

volumes:
  postgres_data:
```

---

## Legal & Ethical Compliance

### Data Collection
✅ **Only public data** (no authentication required)
✅ **Explicit publication** (found on official sources)
✅ **Purpose limitation** (B2B research only)
✅ **No automated outreach** (tool provides data, user controls usage)

### Usage Guidelines
⚠️ **Always obtain consent** before sending emails
⚠️ **Include opt-out mechanism** in all communications
⚠️ **Respect anti-spam laws** (DPDP Act, CAN-SPAM, GDPR)
⚠️ **Don't use for harassment** or unwanted solicitation

### Terms of Service Compliance
- **No login scraping** (LinkedIn, etc.)
- **Respect robots.txt**
- **Use official APIs** where available
- **Rate limit requests** to avoid overload
- **Don't circumvent paywalls** or access controls

---

## Limitations & Edge Cases

### Known Limitations

1. **Email Discovery Rate: 30-50%**
   - Many companies don't publish executive emails
   - Privacy practices vary by company
   - Some use contact forms instead

2. **No Real-Time Verification**
   - Cannot test if mailbox accepts mail (SMTP)
   - Cannot detect full inboxes or vacation replies
   - Some validation is heuristic

3. **Provider-Specific Issues**
   - **Gmail for Business**: May not reveal mailbox existence
   - **Microsoft 365**: Similar privacy protections
   - **Catch-all domains**: Cannot distinguish valid from invalid

4. **Catch-All Domains**
   - Domain accepts all addresses
   - Cannot determine if specific email is valid
   - Marked as "Medium" confidence

5. **Temporal Decay**
   - People change jobs
   - Emails become invalid over time
   - Recommend re-verification after 6 months

### Mitigations

```python
# For catch-all detection
def test_catch_all(domain):
    """
    Test a random, unlikely email on domain
    If it passes validation, domain is likely catch-all
    """
    test_email = f"random-{uuid.uuid4()}@{domain}"
    # If this passes validation, mark domain as catch-all

# For temporal decay
def add_verification_timestamp(result):
    result['verified_at'] = datetime.now().isoformat()
    result['expires_at'] = (datetime.now() + timedelta(days=180)).isoformat()
```

---

## Testing Strategy

### Unit Tests
```python
# test_validation.py
def test_email_format_validation():
    assert validate_email_format("valid@company.com") == "valid@company.com"
    assert validate_email_format("invalid@") is None

def test_free_provider_detection():
    assert is_free_provider("test@gmail.com") == True
    assert is_free_provider("test@company.com") == False

def test_confidence_scoring():
    score = calculate_confidence(
        email="founder@startup.com",
        domain="startup.com",
        source_url="https://startup.com/about",
        domain_checks={'has_mx': True, 'domain_age': 500},
        activity={'shows_activity': True}
    )
    assert score[0] == 'High'
    assert score[1] >= 80
```

### Integration Tests
```python
# test_end_to_end.py
async def test_full_research_pipeline():
    """
    Test with known good company (e.g., Mamaearth)
    Verify:
    1. Company is discovered
    2. Decision makers are identified
    3. Published emails are found
    4. Validation passes
    5. Confidence is high
    """
    filters = {
        'categories': ['Beauty & Cosmetics'],
        'cities': ['Gurugram'],
        'batch_size': 1
    }
    
    results = await research_leads(filters)
    
    assert len(results) > 0
    assert results[0]['confidence'] == 'High'
    assert '@' in results[0]['email']
    assert results[0]['source'].startswith('http')
```

### Quality Assurance
```python
# Manual verification process
1. Export 100 random results
2. Manually check:
   - Email is published on source URL
   - Person is in stated role
   - Company is active D2C brand
3. Calculate precision = valid / total
4. Target: >90% precision
```

---

## Cost Estimates

### API Costs (for 200 leads)
- **Claude API**: ~$0.50-1.00 (web search calls)
- **Google Search API**: $0 (free tier sufficient)
- **DNS/WHOIS**: $0 (public services)
- **Total per 200 leads**: ~$0.50-1.00

### Infrastructure (Monthly)
- **Hobby deployment**: $0 (local) to $20 (cloud)
- **Database**: $0 (free tier)
- **Cache**: $0 (free tier)
- **Proxies**: $0 (not needed for compliant approach)

### Time Investment
- **Initial setup**: 4-6 hours
- **Per research job**: 10-30 minutes (automated)

---

## Future Enhancements

### Phase 2 Features
1. **CRM Integration**
   - Export to Salesforce, HubSpot
   - API webhooks

2. **Enrichment**
   - Company size estimation
   - Recent news aggregation
   - Social media handle discovery

3. **Smart Filtering**
   - ML-based role classification
   - Company category auto-detection
   - Duplicate detection across batches

4. **Monitoring**
   - Email deliverability tracking
   - Re-verification scheduler
   - Update notifications

---

## Conclusion

This system prioritizes **quality, compliance, and sustainability** over aggressive tactics. By focusing on publicly published information and strict validation, it delivers genuine value while respecting legal and ethical boundaries.

The approach trades raw volume for verified accuracy, resulting in a tool that:
- ✅ Complies with data protection laws
- ✅ Respects platform terms of service
- ✅ Delivers high-confidence results
- ✅ Maintains sender reputation
- ✅ Provides audit trails for transparency

**This is not a spam tool—it's a research assistant that helps you find the right people to reach out to, responsibly.**
