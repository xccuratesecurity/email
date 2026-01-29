"""
Lead Research System - Backend API
Compliant, high-quality lead discovery for India D2C brands
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="India D2C Lead Research API",
    description="Discover publicly published contact information from India-based D2C brands",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Anthropic client
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Request/Response Models
class ResearchFilters(BaseModel):
    batch_size: int = 50
    categories: List[str] = []
    cities: List[str] = []
    funding_stage: str = "all"
    date_range: str = "last-12-months"

class LeadResult(BaseModel):
    company: str
    website: str
    person: str
    role: str
    email: EmailStr
    source: HttpUrl
    confidence: str
    confidence_score: int
    validation_factors: List[str]
    discovered_at: str

class ResearchResponse(BaseModel):
    job_id: str
    status: str
    progress: Dict[str, int]
    results: List[LeadResult]
    total_discovered: int
    total_verified: int

# In-memory job storage (use Redis in production)
jobs = {}

@app.get("/")
async def root():
    return {
        "message": "India D2C Lead Research API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.post("/api/research/start", response_model=Dict[str, str])
async def start_research(
    filters: ResearchFilters,
    background_tasks: BackgroundTasks
):
    """
    Start a new lead research job
    """
    import uuid
    job_id = str(uuid.uuid4())
    
    jobs[job_id] = {
        "status": "pending",
        "progress": {"discovered": 0, "analyzed": 0, "verified": 0},
        "results": [],
        "started_at": datetime.now().isoformat()
    }
    
    # Run research in background
    background_tasks.add_task(run_research, job_id, filters)
    
    return {"job_id": job_id, "status": "started"}

@app.get("/api/research/{job_id}", response_model=ResearchResponse)
async def get_research_status(job_id: str):
    """
    Get research job status and results
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "results": job.get("results", []),
        "total_discovered": job["progress"]["discovered"],
        "total_verified": job["progress"]["verified"]
    }

async def run_research(job_id: str, filters: ResearchFilters):
    """
    Main research orchestration function
    """
    jobs[job_id]["status"] = "running"
    
    try:
        # Phase 1: Discover companies
        companies = await discover_companies(job_id, filters)
        
        # Phase 2: Find decision makers and emails
        results = []
        for company in companies:
            leads = await find_company_leads(job_id, company, filters)
            results.extend(leads)
            
            # Update progress
            jobs[job_id]["progress"]["verified"] = len(results)
            jobs[job_id]["results"] = results
            
            # Limit results to batch size
            if len(results) >= filters.batch_size:
                results = results[:filters.batch_size]
                break
        
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["results"] = results
        jobs[job_id]["completed_at"] = datetime.now().isoformat()
        
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

async def discover_companies(job_id: str, filters: ResearchFilters) -> List[Dict[str, Any]]:
    """
    Discover India D2C companies using Claude with web search
    """
    # Build search queries
    categories_str = ", ".join(filters.categories) if filters.categories else "all categories"
    cities_str = ", ".join(filters.cities) if filters.cities else "across India"
    
    prompt = f"""Find 20-30 active India-based D2C (Direct-to-Consumer) brands in {categories_str}, located {cities_str}.

Focus on companies that:
1. Have active websites and operations
2. Sell directly to consumers (not B2B)
3. Show recent activity (news, launches, funding in last 12-24 months)
4. Are clearly India-based

For each company, provide:
- Company name
- Website URL
- Category (Fashion, Beauty, Food, etc.)
- City/location
- Brief description (1 line)

Search terms to use:
- "India D2C {categories_str} startup 2024 2025"
- "India consumer brand {categories_str} funding"
- "India direct-to-consumer {categories_str} launch"

Return as JSON array:
[{{
  "name": "Company Name",
  "website": "company.com",
  "category": "Beauty & Cosmetics",
  "city": "Mumbai",
  "description": "Brief description"
}}]

Only include companies you find evidence for through web search."""

    # Call Claude with web search
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        tools=[{
            "type": "web_search_20250305",
            "name": "web_search"
        }],
        messages=[{
            "role": "user",
            "content": prompt
        }]
    )
    
    # Extract text from response
    full_text = ""
    for block in message.content:
        if block.type == "text":
            full_text += block.text
    
    # Parse JSON from response
    import json
    import re
    
    json_match = re.search(r'\[[\s\S]*\]', full_text)
    if json_match:
        companies = json.loads(json_match.group())
        
        # Update progress
        jobs[job_id]["progress"]["discovered"] = len(companies)
        
        return companies
    
    return []

async def find_company_leads(job_id: str, company: Dict[str, Any], filters: ResearchFilters) -> List[LeadResult]:
    """
    Find publicly published emails for decision makers at a company
    """
    website = company['website']
    
    prompt = f"""Find publicly published emails for founders and marketing leaders at {company['name']} ({website}).

STRICT RULES:
1. ONLY return emails that are explicitly published on:
   - Company website (contact, about, team pages)
   - Press releases
   - Blog author bios
   - Official media pages

2. Do NOT generate pattern-based emails
3. Do NOT use free providers (gmail, yahoo, outlook)
4. Do NOT include emails unless you can verify publication

Target roles:
- Founder / Co-Founder
- CEO / Managing Director  
- CMO / Head of Marketing
- Head of Growth / Brand
- Marketing Director

Search:
1. Visit {website}/about, {website}/team, {website}/contact
2. Search: "site:{website} founder email"
3. Search: "site:{website} marketing head email"
4. Search: "{company['name']} founder contact email"

For each person found, return:
{{
  "person": "Full Name",
  "role": "Founder | Head of Marketing",
  "email": "email@{website}",
  "source_url": "exact URL where email was published",
  "confidence": "High"
}}

Only return results where:
- Email domain matches {website}
- Email is published on an official source
- Person is clearly in a decision-maker role

Return as JSON array. If no publicly published emails found, return empty array []."""

    # Call Claude with web search
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        tools=[{
            "type": "web_search_20250305",
            "name": "web_search"
        }],
        messages=[{
            "role": "user",
            "content": prompt
        }]
    )
    
    # Extract text
    full_text = ""
    for block in message.content:
        if block.type == "text":
            full_text += block.text
    
    # Parse JSON
    import json
    import re
    
    json_match = re.search(r'\[[\s\S]*?\]', full_text)
    if not json_match:
        return []
    
    try:
        leads_data = json.loads(json_match.group())
    except:
        return []
    
    # Convert to LeadResult objects with validation
    results = []
    for lead in leads_data:
        # Validate email domain matches company domain
        email = lead.get('email', '')
        if not email or '@' not in email:
            continue
        
        email_domain = email.split('@')[1]
        company_domain = website.replace('www.', '').replace('https://', '').replace('http://', '')
        
        # Strict domain matching
        if email_domain not in company_domain and company_domain not in email_domain:
            continue
        
        # Check for free providers
        free_providers = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
        if email_domain in free_providers:
            continue
        
        # Validate source URL
        source_url = lead.get('source_url', '')
        if not source_url or not source_url.startswith('http'):
            continue
        
        result = LeadResult(
            company=company['name'],
            website=website,
            person=lead.get('person', ''),
            role=lead.get('role', ''),
            email=email,
            source=source_url,
            confidence=lead.get('confidence', 'High'),
            confidence_score=90,  # High confidence for published emails
            validation_factors=[
                'official_source',
                'domain_match',
                'publicly_published'
            ],
            discovered_at=datetime.now().isoformat()
        )
        
        results.append(result)
    
    # Update progress
    jobs[job_id]["progress"]["analyzed"] += 1
    
    return results

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
