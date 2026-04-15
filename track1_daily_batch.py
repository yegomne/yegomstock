import asyncio
import aiohttp
import json
import logging
import os
import sys
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, firestore

from fetchers.krx_fetcher import fetch_krx_data
from fetchers.dart_fetcher import fetch_dart_data
from fetchers.naver_fetcher import fetch_naver_data
from fetchers.pubdata_fetcher import fetch_pubdata

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("DailyBatch")

load_dotenv()

# ==========================================
# 1. Firebase Firestore 초기화 설정
# ==========================================
def init_firebase():
    try:
        # 클라우드 환경에서는 Default credentials를 사용할 수 있지만, 
        # 로컬 테스트를 위해 .env 환경변수의 경로를 참조합니다.
        key_path = os.getenv("FIREBASE_KEY_PATH", "firebase-service-account.json")
        
        if not firebase_admin._apps:
            if os.path.exists(key_path):
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
            else:
                # Cloud Functions 환경 등 마스터 키 파일이 내장되지 않은 경우 Application Default Credentials 사용
                firebase_admin.initialize_app()
                
        db = firestore.client()
        logger.info("✅ Firebase SDK 연결 완료!")
        return db
    except Exception as e:
        logger.error(f"❌ Firebase 초기화 실패:\n{e}")
        return None

# ==========================================
# 2. 비동기 묶음 (Orchestrator) 
# ==========================================
async def process_single_stock(session: aiohttp.ClientSession, stock: dict, endpoints: dict):
    code = stock["code"]
    name = stock["name"]
    
    logger.info(f"🚀 [{name}({code})] 4대 API 동시 패치 시작...")
    
    # 4개의 비동기 Task를 병렬로 실행 (await asyncio.gather)
    # 지연시간이 가장 긴 서버의 응답시간 수준으로 최적화됩니다.
    tasks = [
        fetch_krx_data(session, endpoints["krx"], code),
        fetch_dart_data(session, endpoints["dart"], code),
        fetch_naver_data(session, endpoints["naver_news"], name),
        fetch_pubdata(session, endpoints["pubdata"], code)
    ]
    
    krx_res, dart_res, naver_res, pubdata_res = await asyncio.gather(*tasks, return_exceptions=True)
    
    # 리턴값이 Exception인 경우 방어 (Exception 발생 시 빈 딕셔너리로 치환)
    krx_res = krx_res if not isinstance(krx_res, Exception) and krx_res else {}
    dart_res = dart_res if not isinstance(dart_res, Exception) and dart_res else {}
    naver_res = naver_res if not isinstance(naver_res, Exception) and naver_res else {}
    pubdata_res = pubdata_res if not isinstance(pubdata_res, Exception) and pubdata_res else {}

    # 최종 취합본 (Firestore 모델)
    merged_data = {
        "종목명": name,
        "종목코드": code,
        "krx_data": krx_res,
        "dart_data": dart_res,
        "naver_news": naver_res,
        "pubdata": pubdata_res,
        "last_updated": firestore.SERVER_TIMESTAMP
    }
    
    return code, name, merged_data

async def main():
    db = init_firebase()
    if not db:
        return

    # 설정 파일 로드 (엔드포인트 전용)
    with open("config.json", "r", encoding="utf-8") as f:
        config = json.load(f)
        
    endpoints = config["endpoints"]
    
    # 🎯 이제 로컬 config.json 대신 Firestore에서 최신 모니터링 타겟 종목을 가져옵니다!
    target_stocks_ref = db.collection("target_stocks").stream()
    stocks = [{"code": doc.id, "name": doc.to_dict().get("name")} for doc in target_stocks_ref]
    
    # 만약 Firestore에 아무 종목도 없다면 기존 config.json 종목을 기본값으로 사용
    if not stocks:
        logger.warning("Firestore에 종목이 없습니다! config.json 값을 기본값으로 가져옵니다.")
        stocks = config["target_stocks"]
        # 기본값을 Firestore에 1회 초기화 저장해줍니다
        for s in stocks:
            db.collection("target_stocks").document(s["code"]).set({"name": s["name"], "code": s["code"]})
    
    logger.info(f"📊 총 {len(stocks)}개 종목에 대한 데일리 배치 작업을 시작합니다.")
    
    # 세션 1개로 접속 풀(Pool) 공유
    async with aiohttp.ClientSession() as session:
        # 각 종목들에 대해 병렬 처리 (필요에 따라 Semaphore로 동시 접속수 제한 가능)
        # pykrx 등 외부 데이터 연동 시 동시 요청(병렬)하면 IP 차단 또는 파싱 에러(rate limit)가 발생하므로 직렬(순차) 처리로 변경
        results = []
        for stock in stocks:
            res = await process_single_stock(session, stock, endpoints)
            results.append(res)
            await asyncio.sleep(1) # 1초 지연으로 API 부하 분산
        
        for code, name, data in results:
            try:
                # Firestore의 daily_fundamentals 콜렉션에 문서를 UPSERT (병합)
                db.collection("daily_fundamentals").document(code).set(data, merge=True)
                logger.info(f"✅ [{name}({code})] Firestore 적재 완료")
            except Exception as e:
                logger.error(f"❌ [{name}({code})] Firestore 업로드 실패: {e}")

    logger.info("🎉 모든 데일리 배치 작업 및 Firestore 적재가 완료되었습니다.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
