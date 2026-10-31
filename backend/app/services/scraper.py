"""Safe Web and Social Media Scraping Service for RealityCheck AI 2.0.
Performs SSRF-safe HTTP fetching, structured HTML parsing, and public social post extraction.
"""
import re
import logging
from urllib.parse import urlparse
from typing import Optional, Dict, Any
import httpx
from bs4 import BeautifulSoup

from app.config import settings
from app.services.security import is_safe_url

logger = logging.getLogger(__name__)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 RealityCheckBot/2.0"

class ScraperService:
    def __init__(self):
        self.timeout = settings.max_scrape_timeout_seconds
        self.max_bytes = settings.max_scrape_bytes

    async def fetch_article(self, url: str) -> Dict[str, Any]:
        """
        Safely fetches an article URL after SSRF validation.
        Extracts title, author, date, publisher, canonical URL, and clean body text.
        """
        # SSRF Security check
        is_safe, error_msg = is_safe_url(url)
        if not is_safe:
            return {
                "success": False,
                "url": url,
                "error": error_msg or "URL validation failed.",
                "title": "",
                "text": "",
                "publisher": "",
                "author": None,
                "publish_date": None,
                "canonical_url": url,
                "is_social": False,
            }

        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
        }

        try:
            async with httpx.AsyncClient(
                headers=headers,
                follow_redirects=True,
                max_redirects=settings.max_redirects,
                timeout=httpx.Timeout(self.timeout),
                verify=True
            ) as client:
                response = await client.get(url)
                
                # Check status code
                if response.status_code >= 400:
                    return {
                        "success": False,
                        "url": url,
                        "status_code": response.status_code,
                        "error": f"HTTP {response.status_code}: Page could not be retrieved.",
                        "title": "",
                        "text": "",
                        "publisher": urlparse(url).netloc,
                        "canonical_url": str(response.url)
                    }

                # Check final URL after redirects for SSRF
                final_safe, final_err = is_safe_url(str(response.url))
                if not final_safe:
                    return {
                        "success": False,
                        "url": url,
                        "error": f"Redirected to disallowed location: {final_err}",
                        "title": "",
                        "text": "",
                        "publisher": urlparse(url).netloc
                    }

                content_type = response.headers.get("content-type", "")
                if "html" not in content_type.lower() and "text" not in content_type.lower():
                    return {
                        "success": False,
                        "url": url,
                        "error": f"Unsupported content type: {content_type}",
                        "title": "",
                        "text": "",
                        "publisher": urlparse(url).netloc
                    }

                html_bytes = response.content[:self.max_bytes]
                html_text = html_bytes.decode(response.encoding or "utf-8", errors="replace")

                return self.parse_html_article(html_text, original_url=url, final_url=str(response.url))

        except httpx.TimeoutException:
            return {
                "success": False,
                "url": url,
                "error": f"Request timed out after {self.timeout}s.",
                "publisher": urlparse(url).netloc
            }
        except httpx.RequestError as exc:
            return {
                "success": False,
                "url": url,
                "error": f"Network request error: {str(exc)}",
                "publisher": urlparse(url).netloc
            }
        except Exception as exc:
            logger.exception(f"Unexpected error scraping {url}")
            return {
                "success": False,
                "url": url,
                "error": f"Scraping error: {str(exc)}",
                "publisher": urlparse(url).netloc
            }

    def parse_html_article(self, html: str, original_url: str, final_url: str) -> Dict[str, Any]:
        """Parses clean text and metadata from raw HTML."""
        soup = BeautifulSoup(html, "html.parser")

        # 1. Title extraction
        title = ""
        og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
        if og_title and og_title.get("content"):
            title = og_title["content"].strip()
        elif soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.find("h1"):
            title = soup.find("h1").get_text(strip=True)

        # 2. Author extraction
        author = None
        author_meta = (
            soup.find("meta", attrs={"name": "author"}) or
            soup.find("meta", property="article:author") or
            soup.find("a", rel="author")
        )
        if author_meta:
            author = author_meta.get("content") or author_meta.get_text(strip=True)

        # 3. Publish Date extraction
        publish_date = None
        date_meta = (
            soup.find("meta", property="article:published_time") or
            soup.find("meta", attrs={"name": "pubdate"}) or
            soup.find("meta", attrs={"name": "date"}) or
            soup.find("time")
        )
        if date_meta:
            publish_date = date_meta.get("content") or date_meta.get("datetime") or date_meta.get_text(strip=True)

        # 4. Publisher / Site name
        site_name = None
        site_meta = soup.find("meta", property="og:site_name")
        if site_meta and site_meta.get("content"):
            site_name = site_meta["content"].strip()
        else:
            site_name = urlparse(final_url).netloc

        # 5. Canonical URL
        canonical = final_url
        canon_meta = soup.find("link", rel="canonical")
        if canon_meta and canon_meta.get("href"):
            canonical = canon_meta["href"].strip()

        # 6. Extract clean readable text
        # Remove unwanted interactive/script tags
        for unwanted in soup(["script", "style", "nav", "header", "footer", "aside", "noscript", "svg", "form"]):
            unwanted.decompose()

        # Find main article container if available
        article_elem = soup.find("article") or soup.find("main") or soup.find("div", class_=re.compile(r"article|content|post-body|entry-content", re.I)) or soup.body

        body_text = ""
        if article_elem:
            paragraphs = []
            for p in article_elem.find_all(["p", "h2", "h3", "h4", "li"]):
                text = p.get_text(strip=True)
                if text and len(text) > 20:
                    paragraphs.append(text)
            body_text = "\n\n".join(paragraphs)

        if not body_text and soup.body:
            body_text = soup.body.get_text(separator="\n", strip=True)

        # Trim body to reasonable evidentiary size
        body_text = body_text[:12000].strip()

        return {
            "success": True,
            "url": original_url,
            "final_url": final_url,
            "canonical_url": canonical,
            "title": title or "Untitled Web Article",
            "publisher": site_name or urlparse(final_url).netloc,
            "author": author,
            "publish_date": publish_date,
            "text": body_text,
            "word_count": len(body_text.split()),
            "is_social": False
        }

    async def fetch_social_media_post(self, url: str) -> Dict[str, Any]:
        """
        Specialized fetcher for public social media URLs (Twitter/X, Reddit, YouTube, Telegram).
        Uses official oEmbed or public read-only endpoints.
        """
        parsed = urlparse(url.strip())
        domain = parsed.netloc.lower()

        # Twitter / X via official oEmbed
        if "twitter.com" in domain or "x.com" in domain:
            oembed_url = f"https://publish.twitter.com/oembed?url={url}"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(oembed_url)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_html = data.get("html", "")
                        soup = BeautifulSoup(raw_html, "html.parser")
                        text = soup.get_text(separator=" ", strip=True)
                        return {
                            "success": True,
                            "url": url,
                            "publisher": "X (formerly Twitter)",
                            "author": data.get("author_name"),
                            "title": f"Post by {data.get('author_name', 'User')}",
                            "text": text,
                            "is_social": True,
                            "platform": "twitter"
                        }
                    else:
                        return {
                            "success": False,
                            "url": url,
                            "publisher": "X (formerly Twitter)",
                            "is_social": True,
                            "platform": "twitter",
                            "error": "This post is either private, deleted, or restricted by platform access limits."
                        }
            except Exception as e:
                return {
                    "success": False,
                    "url": url,
                    "publisher": "X (formerly Twitter)",
                    "is_social": True,
                    "platform": "twitter",
                    "error": f"Could not fetch tweet: {str(e)}"
                }

        # YouTube via official oEmbed
        if "youtube.com" in domain or "youtu.be" in domain:
            oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(oembed_url)
                    if resp.status_code == 200:
                        data = resp.json()
                        return {
                            "success": True,
                            "url": url,
                            "publisher": "YouTube",
                            "author": data.get("author_name"),
                            "title": data.get("title", "YouTube Video"),
                            "text": f"Video title: {data.get('title')}. Channel: {data.get('author_name')}.",
                            "is_social": True,
                            "platform": "youtube"
                        }
            except Exception as e:
                logger.warning(f"YouTube oEmbed error: {e}")

        # Reddit via public JSON endpoint
        if "reddit.com" in domain or "redd.it" in domain:
            clean_url = url.split("?")[0].rstrip("/") + ".json"
            try:
                headers = {"User-Agent": "RealityCheckAI:v2.0 (by /u/realitycheck_bot)"}
                async with httpx.AsyncClient(headers=headers, timeout=8.0) as client:
                    resp = await client.get(clean_url)
                    if resp.status_code == 200:
                        data = resp.json()
                        post = data[0]["data"]["children"][0]["data"]
                        title = post.get("title", "")
                        selftext = post.get("selftext", "")
                        author = post.get("author", "")
                        subreddit = post.get("subreddit_name_prefixed", "")
                        return {
                            "success": True,
                            "url": url,
                            "publisher": f"Reddit ({subreddit})",
                            "author": f"u/{author}",
                            "title": title,
                            "text": f"{title}\n\n{selftext}".strip(),
                            "is_social": True,
                            "platform": "reddit"
                        }
            except Exception as e:
                logger.warning(f"Reddit JSON error: {e}")

        # Telegram via public channel preview
        if "t.me" in domain:
            # Check if public preview format t.me/s/...
            t_url = url
            if "/s/" not in url:
                t_url = url.replace("t.me/", "t.me/s/")
            try:
                return await self.fetch_article(t_url)
            except Exception as e:
                logger.warning(f"Telegram preview error: {e}")

        # Default fallback to standard safe article fetcher
        return await self.fetch_article(url)

scraper_service = ScraperService()

