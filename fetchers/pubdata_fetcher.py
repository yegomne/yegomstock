import os
import aiohttp
from utils.async_retry import fetch_with_retry
import logging

logger = logging.getLogger("PubDataFetcher")

async def fetch_pubdata(session: aiohttp.ClientSession, endpoint: str, stock_code: str):
    logger.warning(f"PubData API는 인증 권한(403) 오류가 발생하여 현재 제외 처리되었습니다. (대체 데이터: pykrx)")
    return {}
