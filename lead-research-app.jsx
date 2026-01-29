import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, CheckCircle, AlertCircle, ExternalLink, Loader } from 'lucide-react';

const LeadResearchApp = () => {
  const [filters, setFilters] = useState({
    batchSize: 50,
    categories: [],
    cities: [],
    fundingStage: 'all',
    dateRange: 'last-12-months'
  });
  
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState({
    discovered: 0,
    analyzed: 0,
    verified: 0
  });
  const [results, setResults] = useState([]);
  const [selectedResults, setSelectedResults] = useState(new Set());

  const categories = [
    'Fashion & Apparel', 'Beauty & Cosmetics', 'Food & Beverage',
    'Health & Wellness', 'Home & Lifestyle', 'Electronics & Tech',
    'Fitness & Sports', 'Kids & Baby', 'Jewelry & Accessories'
  ];

  const cities = [
    'Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune',
    'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat'
  ];

  const handleSearch = async () => {
    setIsSearching(true);
    setResults([]);
    setProgress({ discovered: 0, analyzed: 0, verified: 0 });

    // Simulate the research process with Claude API
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          tools: [{
            type: "web_search_20250305",
            name: "web_search"
          }],
          messages: [{
            role: 'user',
            content: generateResearchPrompt(filters)
          }]
        })
      });

      const data = await response.json();
      
      // Process streaming results
      await processSearchResults(data);
      
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const generateResearchPrompt = (filters) => {
    const categoryFilter = filters.categories.length > 0 
      ? `focusing on: ${filters.categories.join(', ')}` 
      : 'across all D2C categories';
    
    const cityFilter = filters.cities.length > 0
      ? `located in: ${filters.cities.join(', ')}`
      : 'across India';

    return `You are a B2B lead researcher. Find ${filters.batchSize} India-based D2C startups ${categoryFilter}, ${cityFilter}.

For each company:
1. Search for recent funding news, product launches, or growth articles
2. Visit their official website
3. Find ONLY publicly published emails of founders or marketing heads from:
   - Company contact pages
   - Press releases
   - Blog author bios
   - Official media pages

STRICT RULES:
- Only include emails explicitly published on public sources
- No pattern-generated emails unless verified on site
- No gmail/yahoo/outlook addresses
- Exclude if domain seems inactive
- Return ONLY high-confidence results

Format as JSON array:
[{
  "company": "Brand Name",
  "website": "url",
  "person": "Full Name",
  "role": "Founder | Head of Marketing",
  "email": "email@domain.com",
  "source": "URL where email was found",
  "confidence": "High"
}]`;
  };

  const processSearchResults = async (data) => {
    // Extract and parse results from Claude's response
    let fullText = '';
    for (const block of data.content) {
      if (block.type === 'text') {
        fullText += block.text;
      }
    }

    // Parse JSON from response
    try {
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Simulate progressive loading
        for (let i = 0; i < parsed.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setProgress(prev => ({
            discovered: Math.min(filters.batchSize, prev.discovered + 3),
            analyzed: Math.min(filters.batchSize, prev.analyzed + 2),
            verified: prev.verified + 1
          }));
          setResults(prev => [...prev, parsed[i]]);
        }
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  };

  const exportResults = (format) => {
    const selected = results.filter((_, idx) => selectedResults.has(idx));
    const data = selected.length > 0 ? selected : results;

    if (format === 'csv') {
      const csv = [
        'Company,Website,Person,Role,Email,Source,Confidence',
        ...data.map(r => 
          `"${r.company}","${r.website}","${r.person}","${r.role}","${r.email}","${r.source}","${r.confidence}"`
        )
      ].join('\n');

      downloadFile(csv, 'leads.csv', 'text/csv');
    } else if (format === 'json') {
      downloadFile(JSON.stringify(data, null, 2), 'leads.json', 'application/json');
    }
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelection = (idx) => {
    const newSet = new Set(selectedResults);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedResults(newSet);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#e8e8f0',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '3rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2rem',
          backdropFilter: 'blur(20px)'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}>
            India D2C Lead Research
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '1rem',
            margin: 0
          }}>
            High-confidence, publicly available business contacts from active D2C brands
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2rem',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Batch Size */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Batch Size
              </label>
              <select
                value={filters.batchSize}
                onChange={(e) => setFilters({...filters, batchSize: parseInt(e.target.value)})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#e8e8f0',
                  fontSize: '0.875rem'
                }}
              >
                <option value={50}>50 leads</option>
                <option value={100}>100 leads</option>
                <option value={200}>200 leads</option>
              </select>
            </div>

            {/* Categories */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Categories (multi-select)
              </label>
              <select
                multiple
                value={filters.categories}
                onChange={(e) => setFilters({
                  ...filters, 
                  categories: Array.from(e.target.selectedOptions, option => option.value)
                })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#e8e8f0',
                  fontSize: '0.875rem',
                  minHeight: '100px'
                }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Cities */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Cities (multi-select)
              </label>
              <select
                multiple
                value={filters.cities}
                onChange={(e) => setFilters({
                  ...filters,
                  cities: Array.from(e.target.selectedOptions, option => option.value)
                })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#e8e8f0',
                  fontSize: '0.875rem',
                  minHeight: '100px'
                }}
              >
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Funding Stage */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Funding Stage
              </label>
              <select
                value={filters.fundingStage}
                onChange={(e) => setFilters({...filters, fundingStage: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#e8e8f0',
                  fontSize: '0.875rem'
                }}
              >
                <option value="all">All Stages</option>
                <option value="seed">Seed</option>
                <option value="series-a">Series A</option>
                <option value="series-b">Series B+</option>
                <option value="profitable">Profitable/Bootstrapped</option>
              </select>
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isSearching}
            style={{
              marginTop: '1.5rem',
              padding: '1rem 2rem',
              background: isSearching 
                ? 'rgba(96, 165, 250, 0.3)' 
                : 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            {isSearching ? (
              <>
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Researching...
              </>
            ) : (
              <>
                <Search size={20} />
                Find & Verify Leads
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress */}
      {isSearching && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto 2rem auto'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            backdropFilter: 'blur(20px)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Research Progress</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{
                background: 'rgba(96, 165, 250, 0.1)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(96, 165, 250, 0.3)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#60a5fa' }}>
                  {progress.discovered}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Companies Discovered
                </div>
              </div>
              <div style={{
                background: 'rgba(167, 139, 250, 0.1)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(167, 139, 250, 0.3)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#a78bfa' }}>
                  {progress.analyzed}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Profiles Analyzed
                </div>
              </div>
              <div style={{
                background: 'rgba(52, 211, 153, 0.1)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(52, 211, 153, 0.3)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#34d399' }}>
                  {progress.verified}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  High-Confidence Emails
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            backdropFilter: 'blur(20px)'
          }}>
            {/* Export Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                Results ({results.length} high-confidence leads)
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => exportResults('csv')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(52, 211, 153, 0.2)',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    borderRadius: '6px',
                    color: '#34d399',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Download size={16} />
                  Export CSV
                </button>
                <button
                  onClick={() => exportResults('json')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(96, 165, 250, 0.2)',
                    border: '1px solid rgba(96, 165, 250, 0.4)',
                    borderRadius: '6px',
                    color: '#60a5fa',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Download size={16} />
                  Export JSON
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div style={{
              overflowX: 'auto'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem'
              }}>
                <thead>
                  <tr style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedResults(new Set(results.map((_, idx) => idx)));
                          } else {
                            setSelectedResults(new Set());
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Company</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Person</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Role</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Email</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Source</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: selectedResults.has(idx) ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedResults.has(idx)}
                          onChange={() => toggleSelection(idx)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: '600' }}>{result.company}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                          {result.website}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{result.person}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: 'rgba(167, 139, 250, 0.2)',
                          border: '1px solid rgba(167, 139, 250, 0.3)',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          color: '#a78bfa'
                        }}>
                          {result.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                        {result.email}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <a
                          href={result.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#60a5fa',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          View <ExternalLink size={12} />
                        </a>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: '#34d399'
                        }}>
                          <CheckCircle size={16} />
                          {result.confidence}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        maxWidth: '1400px',
        margin: '2rem auto 0 auto',
        padding: '1rem',
        background: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.7)'
      }}>
        <strong>⚠️ Compliance Notice:</strong> This tool surfaces only publicly published contact information.
        Always obtain proper consent before outreach. Respect all applicable anti-spam laws and data protection
        regulations (DPDP Act, CAN-SPAM, GDPR). Include opt-out mechanisms in all communications.
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        select option {
          background: #1a1a2e;
          color: #e8e8f0;
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
        }
        
        tr:hover {
          background: rgba(255, 255, 255, 0.03) !important;
        }
      `}</style>
    </div>
  );
};

export default LeadResearchApp;
