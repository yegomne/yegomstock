import asyncio
import aiohttp
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("AsyncRetry")

async def fetch_with_retry(session: aiohttp.ClientSession, url: str, params: dict = None, headers: dict = None, max_retries: int = 3, timeout: int = 5):
    """
    통신 장애를 대비한 비동기 재시도 래퍼 함수 (Exponential Backoff 적용)
    """
    attempt = 0
    backoff = 2  # 초기 2초 대기
    
    while attempt < max_retries:
        try:
            async with session.get(url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=timeout)) as response:
                response.raise_for_status()
                return await response.json()
                
        except asyncio.TimeoutError:
            logger.warning(f"[Timeout] {url} 요청 시간 초과 (Attempt {attempt+1}/{max_retries})")
        except aiohttp.ClientResponseError as e:
            logger.error(f"[HTTP Error] {e.status} 에러 발생: {url} (Attempt {attempt+1}/{max_retries})")
        except Exception as e:
            logger.error(f"[Unknown Error] {e} (Attempt {attempt+1}/{max_retries})")
            
        attempt += 1
        if attempt < max_retries:
            logger.info(f"🔄 {backoff}초 후 재시도합니다...")
            await asyncio.sleep(backoff)
            backoff *= 2  # 에러 반복 시 대기시간 2배 증가 (Exponential Backoff)

    logger.error(f"❌ 최대 재시도({max_retries}회) 초과로 요청을 포기합니다: {url}")
    return None
