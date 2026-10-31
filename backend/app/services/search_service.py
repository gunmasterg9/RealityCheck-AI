"""Search and Fact-Checking Retrieval Service for RealityCheck AI 2.0.
Integrates:
1. Google Fact Check Tools API (ClaimReview database)
2. Pluggable Web Search (Tavily, Brave Search)
3. Open Encyclopedic Search fallback (Wikipedia API + Open DuckDuckGo)
"""
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import quote, urlparse
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self):
        self.fact_check_key = settings.resolved_fact_check_key
        self.tavily_key = settings.tavily_api_key
        self.brave_key = settings.brave_search_api_key

    async def search_fact_check_tools(self, query: str, language_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Query the Google Fact Check Tools API (`claims.search`).
        Extracts verified ClaimReview ratings, publishers, dates, and review URLs.
        """
        if not self.fact_check_key:
            logger.info("Fact Check Tools API key not configured. Skipping Google Fact Check Tools lookup.")
            return []

        endpoint = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        params = {
            "query": query.strip()[:100],
            "key": self.fact_check_key
        }
        if language_code and language_code != "en":
            params["hl"] = language_code

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(endpoint, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    claims_data = data.get("claims", [])
                    results = []
                    for item in claims_data:
                        claim_text = item.get("text", "")
                        claimant = item.get("claimant", "")
                        claim_date = item.get("claimDate", "")
                        
                        reviews = item.get("claimReview", [])
                        for rev in reviews:
                            pub = rev.get("publisher", {})
                            results.append({
                                "claim_text": claim_text,
                                "claimant": claimant,
                                "claim_date": claim_date,
                                "publisher": pub.get("name", "Fact Checker"),
                                "publisher_site": pub.get("site", ""),
                                "rating": rev.get("textualRating", "Unknown Rating"),
                                "review_url": rev.get("url", ""),
                                "review_title": rev.get("title", f"Fact check by {pub.get('name')}"),
                                "review_date": rev.get("reviewDate", ""),
                                "language_code": rev.get("languageCode", "en"),
                                "source_type": "official_fact_checker"
                            })
                    logger.info(f"Fact Check Tools returned {len(results)} ClaimReviews for query: {query[:40]}")
                    return results
                elif resp.status_code in (400, 401, 403):
                    logger.info(f"Google Fact Check Tools API returned {resp.status_code}. Key may not have FactCheck API enabled; falling back cleanly.")
                    return []
                else:
                    logger.warning(f"Google Fact Check Tools HTTP {resp.status_code}: {resp.text[:120]}")
                    return []
        except Exception as e:
            logger.warning(f"Error querying Google Fact Check Tools API: {e}")
            return []

    async def search_web(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Pluggable web search across Tavily, Brave, or open public search fallbacks.
        Returns deduplicated web results with title, url, snippet, publisher, and score.
        """
        # 1. Tavily Search (if key provided)
        if self.tavily_key:
            results = await self._search_tavily(query, num_results)
            if results:
                return results

        # 2. Brave Search (if key provided)
        if self.brave_key:
            results = await self._search_brave(query, num_results)
            if results:
                return results

        # 3. Open Encyclopedic & Public API Search Fallback (Zero-API-key fallback)
        logger.info(f"Using open web & encyclopedic search fallback for query: '{query[:40]}'")
        return await self._search_open_fallback(query, num_results)

    async def _search_tavily(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """Query Tavily Search API."""
        try:
            url = "https://api.tavily.com/search"
            payload = {
                "api_key": self.tavily_key,
                "query": query,
                "search_depth": "advanced",
                "max_results": num_results,
                "include_answer": True
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    out = []
                    for item in data.get("results", []):
                        parsed_url = urlparse(item.get("url", ""))
                        out.append({
                            "title": item.get("title", "Search Result"),
                            "url": item.get("url", ""),
                            "snippet": item.get("content", ""),
                            "publisher": parsed_url.netloc,
                            "source_type": "web_search",
                            "score": item.get("score", 0.8)
                        })
                    return out
                else:
                    logger.warning(f"Tavily API error HTTP {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            logger.warning(f"Tavily search exception: {e}")
        return []

    async def _search_brave(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """Query Brave Search API."""
        try:
            url = f"https://api.search.brave.com/res/v1/web/search?q={quote(query)}&count={num_results}"
            headers = {
                "Accept": "application/json",
                "X-Subscription-Token": self.brave_key
            }
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("web", {}).get("results", [])
                    out = []
                    for item in results:
                        parsed_url = urlparse(item.get("url", ""))
                        out.append({
                            "title": item.get("title", ""),
                            "url": item.get("url", ""),
                            "snippet": item.get("description", ""),
                            "publisher": parsed_url.netloc,
                            "source_type": "web_search",
                            "score": 0.8
                        })
                    return out
        except Exception as e:
            logger.warning(f"Brave search exception: {e}")
        return []

    async def _search_open_fallback(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Open fallback using Wikipedia Public API and DuckDuckGo Instant Answer API.
        Enables real-time evidence retrieval without requiring third-party search subscriptions.
        """
        results = []
        
        # 1. Wikipedia API lookup
        try:
            wiki_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={quote(query)}&format=json&srlimit={num_results}"
            headers = {"User-Agent": "RealityCheckBot/2.0 (FactVerificationHackathonProject)"}
            async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
                resp = await client.get(wiki_url)
                if resp.status_code == 200:
                    data = resp.json()
                    search_items = data.get("query", {}).get("search", [])
                    for item in search_items:
                        title = item.get("title", "")
                        snippet = item.get("snippet", "").replace('<span class="searchmatch">', "").replace('</span>', "")
                        page_url = f"https://en.wikipedia.org/wiki/{quote(title.replace(' ', '_'))}"
                        results.append({
                            "title": f"Wikipedia: {title}",
                            "url": page_url,
                            "snippet": snippet,
                            "publisher": "en.wikipedia.org",
                            "source_type": "encyclopedia",
                            "score": 0.85
                        })
        except Exception as e:
            logger.warning(f"Wikipedia open search error: {e}")

        # 2. DuckDuckGo Instant Answer API
        try:
            ddg_url = f"https://api.duckduckgo.com/?q={quote(query)}&format=json&no_html=1&skip_disambig=1"
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(ddg_url)
                if resp.status_code == 200:
                    ddg_data = resp.json()
                    abstract = ddg_data.get("AbstractText", "")
                    abstract_url = ddg_data.get("AbstractURL", "")
                    abstract_source = ddg_data.get("AbstractSource", "DuckDuckGo Knowledge")
                    if abstract and abstract_url:
                        results.append({
                            "title": f"{abstract_source}: {ddg_data.get('Heading', 'Summary')}",
                            "url": abstract_url,
                            "snippet": abstract,
                            "publisher": urlparse(abstract_url).netloc or abstract_source,
                            "source_type": "encyclopedia",
                            "score": 0.90
                        })
                    
                    # Related topics
                    for topic in ddg_data.get("RelatedTopics", [])[:3]:
                        if isinstance(topic, dict) and "Text" in topic and "FirstURL" in topic:
                            results.append({
                                "title": topic.get("Text", "")[:60] + "...",
                                "url": topic.get("FirstURL", ""),
                                "snippet": topic.get("Text", ""),
                                "publisher": urlparse(topic.get("FirstURL", "")).netloc,
                                "source_type": "web_search",
                                "score": 0.75
                            })
        except Exception as e:
            logger.warning(f"DuckDuckGo API error: {e}")

        # Deduplicate by URL
        seen_urls = set()
        deduped = []
        for r in results:
            if r["url"] and r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                deduped.append(r)

        return deduped[:num_results]

search_service = SearchService()
