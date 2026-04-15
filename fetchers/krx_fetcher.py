import logging
import asyncio
from pykrx import stock
from datetime import datetime, timedelta

logger = logging.getLogger("KrxFetcher")

def _get_pykrx_data(stock_code: str):
    # 오늘 또는 가장 최근 거래일 기준으로 데이터를 가져옵니다.
    today = datetime.today().strftime("%Y%m%d")
    try:
        # 종가 및 등락률 데이터
        df_price = stock.get_market_ohlcv(today, today, stock_code)
        # PER/PBR 마켓 데이터
        df_fundamental = stock.get_market_fundamental(today, today, stock_code)
        # 시가총액 데이터
        df_cap = stock.get_market_cap(today, today, stock_code)
        
        close_price = 0
        change_rate = 0.0
        mkt_cap = 0 # 억 단위 처리를 위해 그대로 반환하고 프론트에서 나눌 수도 있음 (보통 원 단위)
        per, pbr, bps = 0.0, 0.0, 0
        
        if not df_price.empty:
            close_price = int(df_price['종가'].iloc[0])
            change_rate = float(df_price['등락률'].iloc[0])
            
        if not df_fundamental.empty:
            per = float(df_fundamental['PER'].iloc[0])
            pbr = float(df_fundamental['PBR'].iloc[0])
            bps = int(df_fundamental['BPS'].iloc[0])
            
        if not df_cap.empty:
            # pykrx의 시가총액은 원(KRW) 단위이므로 억 단위로 내려줌 (// 100000000)
            mkt_cap = int(df_cap['시가총액'].iloc[0] // 100000000)
            
        return {
            "close_price": close_price,
            "change_rate": change_rate,
            "market_cap": mkt_cap,
            "per": per,
            "pbr": pbr,
            "bps": bps
        }
    except Exception as e:
        logger.error(f"pykrx 데이터 수집 에러 [{stock_code}]: {e}")
        return {}

async def fetch_krx_data(session, endpoint: str, stock_code: str):
    # aiohttp session과 endpoint는 하위 호환성을 위해 유지하되 무시함
    # 동기 함수인 pykrx 로직을 비동기 이벤트 루프에서 블로킹 없이 실행
    return await asyncio.to_thread(_get_pykrx_data, stock_code)
