import os
import aiohttp
from utils.async_retry import fetch_with_retry
import logging

logger = logging.getLogger("NaverFetcher")

async def fetch_naver_data(session: aiohttp.ClientSession, endpoint: str, stock_name: str):
    client_id = os.getenv("NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        logger.error("NAVER_CLIENT_ID 혹은 NAVER_CLIENT_SECRET가 없습니다.")
        return None
        
    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret
    }
    
    # 해당 종목명으로 네이버 검색(뉴스) 최신 3건 가져오기
    params = {"query": stock_name, "display": 3, "sort": "sim"}
    
    data = await fetch_with_retry(session, endpoint, params=params, headers=headers)
    
    if data and "items" in data:
        # 간단한 html 태그(<b/> 등) 제거 등 클리닝은 생략하거나 별도 처리 가능
        news_list = [{"title": item.get("title", "").replace("<b>", "").replace("</b>", ""), "link": item.get("link")} for item in data.get("items", [])]
        return {"recent_news": news_list}
        
    return None
