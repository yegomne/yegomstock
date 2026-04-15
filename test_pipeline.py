import os
import sys
import requests
import json
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

# 1. 로컬 환경변수(.env) 로드
load_dotenv()

KRX_KEY = os.getenv("KRX_API_KEY")

def test_krx_api(stock_code):
    print(f"\n[김데이터 파이프라인] KRX API 실시간 테스트 시작 (종목코드: {stock_code})")
    
    if not KRX_KEY:
        print("[에러] .env 파일에 KRX_API_KEY가 없습니다!")
        return
        
    url = "http://data-dbg.krx.co.kr/svc/apis/sto/stock_info"
    params = {"iscd": stock_code}
    headers = {"AUTH_KEY": KRX_KEY}
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if 'OutBlock_1' in data and len(data['OutBlock_1']) > 0:
            item = data['OutBlock_1'][0]
            current_price = item.get('TDD_CLSPRC', '0')
            change = item.get('CMPPREVDD_PRC', '0')
            rate = item.get('FLTCRT', '0')
            
            print("✅ 통신 및 파싱 성공!")
            print("-" * 40)
            print(f"📊 종목명: {item.get('ISU_NM', '알수없음')}")
            print(f"💰 현재 종가: {current_price}원")
            print(f"📈 전일 대비: {change}원 ({rate}%)")
            print("-" * 40)
        else:
            print("⚠️ API 요청은 성공했으나, 반환된 데이터(OutBlock_1)가 비어있습니다.")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ [API 통신 예외 발생] 원인: {e}")

if __name__ == "__main__":
    # 삼성전자(005930), 카카오(035720) 종목 코드로 테스트 실행
    test_krx_api("005930")
    test_krx_api("035720")
