import sys
import os
import time
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from PyQt5.QtWidgets import QApplication
from pykiwoom.kiwoom import Kiwoom

# .env 환경 변수 로드 (로컬 경로에 있는 .env 파일 인식)
load_dotenv()

# ==========================================
# 1. Firebase Firestore 초기화 설정 (마스터키 JSON 연동)
# ==========================================
try:
    # 대표님이 다운받으신 비공개 키 .json 파일의 절대 경로를 .env의 FIREBASE_KEY_PATH 변수로 관리합니다.
    # .env에 값이 없다면 파이썬 파일과 동일한 폴더에 있는 "firebase-service-account.json"을 기본으로 찾습니다.
    key_path = os.getenv("FIREBASE_KEY_PATH", "firebase-service-account.json")
    
    # 1-1. 키 파일 존재 여부 명시적 체크
    if not os.path.exists(key_path):
        raise FileNotFoundError(f"⚠️ Firebase 비공개 키(마스터키) .json 파일을 찾을 수 없습니다!\n경로를 다시 확인해주세요: {key_path}")

    # 1-2. 관리자(Admin) 권한으로 Firebase 초기화
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print(f"✅ Firebase 관리자 SDK (마스터키: {key_path}) 연결 완벽 성공!")
except Exception as e:
    print(f"❌ Firebase 인증 초반 파이어스토어 셋업 실패:\n{e}")
    sys.exit(1)

# ==========================================
# 2. Firestore 전송 모듈
# ==========================================
def push_to_firestore(code, price, change, change_rate):
    """키움에서 받은 실시간 호가/시세를 파이어베이스 서버로 전송"""
    try:
        doc_ref = db.collection('realtime_quotes').document(code)
        doc_ref.set({
            'code': code,
            'price': price,
            'change': change,
            'changeRate': change_rate,
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        print(f"🚀 [Firestore 전송] {code} - 현재가: {price}원 (등락률: {change_rate}%)")
    except Exception as e:
        print(f"⚠️ [전송 실패] {code}: {e}")

# ==========================================
# 3. 키움증권 API 연동 봇 클라이언트
# ==========================================
class KiwoomRelayBot:
    def __init__(self):
        # 키움증권 로그인 창 호출 및 프로세스 연결
        self.kiwoom = Kiwoom()
        self.kiwoom.CommConnect(block=True)
        print("✅ 키움증권 Open API+ 로그인 완료!")

        # 실시간 데이터 수신 이벤트 발생 시 콜백 연결
        self.kiwoom.ocx.OnReceiveRealData.connect(self._on_receive_real_data)
        
    def _on_receive_real_data(self, code, real_type, real_data):
        """실시간 데이터 수신 이벤트 핸들러"""
        
        if real_type == "주식체결":
            # 키움증권 실시간 FID 설명: 
            # 10=현재가, 11=전일대비, 12=등락율
            
            # 현재가는 +/- 기호가 붙어있으므로 절대값(abs) 처리
            price = abs(int(self.kiwoom.GetCommRealData(code, 10)))
            change = int(self.kiwoom.GetCommRealData(code, 11))
            change_rate = float(self.kiwoom.GetCommRealData(code, 12))
            
            # 파이어베이스 실시간 DB로 값 쏘기!
            push_to_firestore(code, price, change, change_rate)

    def subscribe_target_stocks(self, codes):
        """관심 종목들 실시간 구독 요청"""
        # 화면번호는 임의의 번호 지정(1000)
        screen_no = "1000"
        code_string = ";".join(codes)
        
        # SetRealReg(화면번호, 종목코드목록, FID목록, 타입: 0=최초, 1=추가)
        # 10;11;12 = 현재가, 전일대비, 등락율
        self.kiwoom.SetRealReg(screen_no, code_string, "10;11;12", 1)
        print(f"📡 [구독 시작] 타겟 종목: {codes}")


if __name__ == "__main__":
    # PyQt5는 COM 객체(키움 API) 구동을 위한 필수 메인 루프입니다.
    app = QApplication(sys.argv)
    
    # 봇 가동
    bot = KiwoomRelayBot()
    
    # 대표님이 웹에서 렌더링하고 싶은 6대 핵심 종목
    target_stocks = [
        "005930", # 삼성전자
        "035720", # 카카오
        "086520", # 에코프로
        "000660", # SK하이닉스
        "035420", # 네이버
        "005380"  # 현대차
    ]
    
    # 실시간 호가 구독 시작 -> 변동 생길 때마다 파이어베이스로 무한 푸시
    bot.subscribe_target_stocks(target_stocks)
    
    # 종료 방지 루프
    sys.exit(app.exec_())
