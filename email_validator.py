"""
Email Validation Module
Comprehensive validation without SMTP probing
"""

import re
import dns.resolver
import whois
from datetime import datetime
from typing import Dict, Tuple, List, Optional
from email_validator import validate_email as validate_email_format, EmailNotValidError

# Free email providers to exclude
FREE_PROVIDERS = {
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'live.com', 'msn.com', 'rediffmail.com', 'protonmail.com',
    'yandex.com', 'zoho.com', 'mail.com', 'aol.com'
}

# Disposable email providers
DISPOSABLE_PROVIDERS = {
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'throwaway.email', 'temp-mail.org'
}

# Role-based addresses (deprioritize)
ROLE_PATTERNS = [
    'info', 'admin', 'support', 'sales', 'contact',
    'hello', 'help', 'team', 'noreply', 'no-reply'
]


def validate_email_syntax(email: str) -> Optional[str]:
    """
    Validate email syntax according to RFC 5322
    Returns normalized email or None if invalid
    """
    try:
        v = validate_email_format(email, check_deliverability=False)
        return v.email
    except EmailNotValidError:
        return None


def is_free_provider(email: str) -> bool:
    """Check if email uses a free provider"""
    try:
        domain = email.split('@')[1].lower()
        return domain in FREE_PROVIDERS
    except IndexError:
        return True


def is_disposable_provider(email: str) -> bool:
    """Check if email uses a disposable/temporary provider"""
    try:
        domain = email.split('@')[1].lower()
        return domain in DISPOSABLE_PROVIDERS
    except IndexError:
        return True


def is_role_based(email: str) -> bool:
    """Check if email is a role-based address"""
    try:
        local_part = email.split('@')[0].lower()
        return any(pattern in local_part for pattern in ROLE_PATTERNS)
    except IndexError:
        return True


def validate_domain_dns(domain: str) -> Dict[str, any]:
    """
    Validate domain exists and has proper DNS records
    """
    result = {
        'exists': False,
        'has_mx': False,
        'has_a': False,
        'mx_records': [],
        'error': None
    }
    
    try:
        # Check for A/AAAA records
        try:
            dns.resolver.resolve(domain, 'A')
            result['has_a'] = True
            result['exists'] = True
        except dns.resolver.NoAnswer:
            try:
                dns.resolver.resolve(domain, 'AAAA')
                result['has_a'] = True
                result['exists'] = True
            except:
                pass
        except Exception as e:
            result['error'] = f"DNS lookup failed: {str(e)}"
            return result
        
        # Check for MX records
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            result['has_mx'] = True
            result['mx_records'] = [str(r.exchange) for r in mx_records]
        except dns.resolver.NoAnswer:
            # No MX records, but A record exists - might still accept mail
            pass
        except Exception as e:
            result['error'] = f"MX lookup failed: {str(e)}"
    
    except Exception as e:
        result['error'] = str(e)
    
    return result


def get_domain_age(domain: str) -> Optional[int]:
    """
    Get domain age in days using WHOIS
    Returns None if unable to determine
    """
    try:
        w = whois.whois(domain)
        
        if w.creation_date:
            # Handle both single date and list of dates
            creation = w.creation_date
            if isinstance(creation, list):
                creation = creation[0]
            
            age_days = (datetime.now() - creation).days
            return age_days
    except:
        pass
    
    return None


def check_domain_reputation(domain: str) -> Dict[str, any]:
    """
    Check domain reputation indicators
    """
    result = {
        'age_days': None,
        'is_new': False,
        'is_established': False,
        'risk_score': 0
    }
    
    age = get_domain_age(domain)
    if age is not None:
        result['age_days'] = age
        result['is_new'] = age < 90  # Less than 3 months
        result['is_established'] = age > 365  # More than 1 year
        
        # Risk scoring
        if age < 30:
            result['risk_score'] = 50  # Very new domain
        elif age < 90:
            result['risk_score'] = 30  # New domain
        elif age < 180:
            result['risk_score'] = 10  # Young domain
        else:
            result['risk_score'] = 0  # Established domain
    else:
        # Unable to determine age
        result['risk_score'] = 20
    
    return result


def calculate_confidence_score(
    email: str,
    domain: str,
    source_url: Optional[str],
    domain_dns: Dict[str, any],
    domain_reputation: Dict[str, any]
) -> Tuple[str, int, List[str]]:
    """
    Calculate confidence score based on multiple signals
    Returns: (confidence_label, score, factors)
    """
    score = 0
    factors = []
    
    # Base score for having an email (20 points)
    score += 20
    factors.append('has_email')
    
    # Published on official source (30 points)
    if source_url and domain in source_url:
        score += 30
        factors.append('official_source')
    elif source_url:
        score += 15
        factors.append('published_source')
    
    # Domain has MX records (20 points)
    if domain_dns.get('has_mx'):
        score += 20
        factors.append('mx_valid')
    # Domain has A record but no MX (10 points - can still receive mail)
    elif domain_dns.get('has_a'):
        score += 10
        factors.append('a_record')
    
    # Domain age and reputation (30 points max)
    if domain_reputation.get('is_established'):
        score += 20
        factors.append('established_domain')
    elif not domain_reputation.get('is_new'):
        score += 10
        factors.append('mature_domain')
    
    # Email domain matches expected domain (10 points)
    email_domain = email.split('@')[1] if '@' in email else ''
    if email_domain == domain or email_domain in domain or domain in email_domain:
        score += 10
        factors.append('domain_match')
    
    # Penalties
    if is_free_provider(email):
        score -= 40
        factors.append('free_provider_penalty')
    
    if is_disposable_provider(email):
        score -= 50
        factors.append('disposable_penalty')
    
    if is_role_based(email):
        score -= 10
        factors.append('role_based')
    
    if domain_reputation.get('is_new'):
        score -= 20
        factors.append('new_domain_penalty')
    
    # Convert to confidence label
    if score >= 80:
        confidence = 'High'
    elif score >= 60:
        confidence = 'Medium'
    elif score >= 40:
        confidence = 'Low'
    else:
        confidence = 'Very Low'
    
    return confidence, max(0, min(100, score)), factors


def validate_email_comprehensive(
    email: str,
    expected_domain: str,
    source_url: Optional[str] = None
) -> Dict[str, any]:
    """
    Comprehensive email validation
    Returns detailed validation results
    """
    result = {
        'email': email,
        'valid': False,
        'normalized_email': None,
        'confidence': 'Very Low',
        'confidence_score': 0,
        'factors': [],
        'checks': {
            'syntax': False,
            'free_provider': False,
            'disposable': False,
            'role_based': False,
            'domain_exists': False,
            'has_mx': False,
        },
        'domain_info': {},
        'should_include': False,
        'exclusion_reason': None
    }
    
    # Step 1: Syntax validation
    normalized = validate_email_syntax(email)
    if not normalized:
        result['exclusion_reason'] = 'invalid_syntax'
        return result
    
    result['normalized_email'] = normalized
    result['checks']['syntax'] = True
    
    # Step 2: Provider checks
    result['checks']['free_provider'] = is_free_provider(email)
    result['checks']['disposable'] = is_disposable_provider(email)
    result['checks']['role_based'] = is_role_based(email)
    
    # Exclude free providers
    if result['checks']['free_provider']:
        result['exclusion_reason'] = 'free_provider'
        return result
    
    # Exclude disposable providers
    if result['checks']['disposable']:
        result['exclusion_reason'] = 'disposable_provider'
        return result
    
    # Step 3: Domain validation
    domain = email.split('@')[1]
    dns_result = validate_domain_dns(domain)
    result['domain_info']['dns'] = dns_result
    result['checks']['domain_exists'] = dns_result.get('exists', False)
    result['checks']['has_mx'] = dns_result.get('has_mx', False)
    
    # Exclude if domain doesn't exist
    if not result['checks']['domain_exists']:
        result['exclusion_reason'] = 'domain_not_found'
        return result
    
    # Step 4: Domain reputation
    reputation = check_domain_reputation(domain)
    result['domain_info']['reputation'] = reputation
    
    # Step 5: Calculate confidence
    confidence, score, factors = calculate_confidence_score(
        email=normalized,
        domain=expected_domain,
        source_url=source_url,
        domain_dns=dns_result,
        domain_reputation=reputation
    )
    
    result['confidence'] = confidence
    result['confidence_score'] = score
    result['factors'] = factors
    result['valid'] = True
    
    # Step 6: Determine if should be included
    # Only include High confidence emails with published sources
    if (confidence == 'High' and 
        source_url and 
        result['checks']['has_mx'] and
        not result['checks']['role_based']):
        result['should_include'] = True
    else:
        if confidence != 'High':
            result['exclusion_reason'] = 'low_confidence'
        elif not source_url:
            result['exclusion_reason'] = 'no_source'
        elif not result['checks']['has_mx']:
            result['exclusion_reason'] = 'no_mx_records'
        elif result['checks']['role_based']:
            result['exclusion_reason'] = 'role_based_address'
    
    return result


def batch_validate_emails(
    emails: List[Dict[str, str]]
) -> List[Dict[str, any]]:
    """
    Validate a batch of emails
    Input: [{'email': '...', 'domain': '...', 'source_url': '...'}, ...]
    Returns: List of validation results
    """
    results = []
    
    for item in emails:
        validation = validate_email_comprehensive(
            email=item['email'],
            expected_domain=item.get('domain', ''),
            source_url=item.get('source_url')
        )
        
        validation['company'] = item.get('company')
        validation['person'] = item.get('person')
        validation['role'] = item.get('role')
        
        results.append(validation)
    
    return results


def filter_high_confidence_only(validation_results: List[Dict[str, any]]) -> List[Dict[str, any]]:
    """
    Filter to only high-confidence, includable emails
    """
    return [
        r for r in validation_results
        if r.get('should_include', False)
    ]


# Example usage
if __name__ == "__main__":
    # Test email validation
    test_cases = [
        {
            'email': 'founder@mamaearth.in',
            'domain': 'mamaearth.in',
            'source_url': 'https://mamaearth.in/about'
        },
        {
            'email': 'test@gmail.com',
            'domain': 'example.com',
            'source_url': None
        }
    ]
    
    for test in test_cases:
        result = validate_email_comprehensive(
            email=test['email'],
            expected_domain=test['domain'],
            source_url=test.get('source_url')
        )
        
        print(f"\nEmail: {test['email']}")
        print(f"Confidence: {result['confidence']} ({result['confidence_score']})")
        print(f"Should Include: {result['should_include']}")
        print(f"Factors: {', '.join(result['factors'])}")
        if result['exclusion_reason']:
            print(f"Excluded: {result['exclusion_reason']}")
