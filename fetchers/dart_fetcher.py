import os
import logging
import asyncio
import OpenDartReader

logger = logging.getLogger("DartFetcher")

def _get_opendart_data(stock_code: str):
    dart_key = os.getenv("DART_API_KEY")
    if not dart_key:
        logger.error("DART_API_KEY가 없습니다.")
        return {}

    try:
        dart = OpenDartReader(dart_key)
        # 회사 기본정보 가져오기 (종목코드로 조회 가능)
        company = dart.company(stock_code)
        
        if company:
            # Series 또는 dict 반환 시 모두 딕셔너리로 처리 가능하도록 변환/추출
            comp_dict = company if isinstance(company, dict) else company.to_dict()
            return {
                "corp_name": comp_dict.get("corp_name"),
                "ceo_nm": comp_dict.get("ceo_nm"),
                "jurir_no": comp_dict.get("jurir_no"),
                "industry": comp_dict.get("induty_desc", "알수없음")
            }
    except Exception as e:
        logger.error(f"OpenDartReader 에러 [{stock_code}]: {e}")
        
    return {}

async def fetch_dart_data(session, endpoint: str, stock_code: str):
    # 비동기 블로킹 방지를 위한 to_thread 사용
    return await asyncio.to_thread(_get_opendart_data, stock_code)
