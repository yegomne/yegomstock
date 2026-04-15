import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

// 1. 구글 클라우드 보안 금고에서 암호화된 API 키 끌어오기
const krxApiKey = defineSecret("KRX_API_KEY");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ==========================================
// [Track 1 백엔드] 프론트엔드 통신 API
// ==========================================
app.get("/api/stock/:code", async (req, res) => {
    const { code } = req.params;
    
    try {
        console.log(`[통신📡] ${code} 기초(뼈대) 데이터 요청 수신 (Track 1)`);
        const url = `http://data-dbg.krx.co.kr/svc/apis/sto/stock_info?iscd=${code}`;
        
        // 함수가 실제로 실행될 때 금고를 열어서 키를 넣음 (krxApiKey.value())
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'AUTH_KEY': krxApiKey.value()
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP 통신 에러: ${response.status}`);
        }
        
        const data = await response.json();
        let price = 0, change = 0, changeRate = 0.0;
        
        if (data && data.OutBlock_1 && data.OutBlock_1.length > 0) {
            const item = data.OutBlock_1[0];
            price = parseInt(item.TDD_CLSPRC, 10) || 0;
            change = parseInt(item.CMPPREVDD_PRC, 10) || 0;
            changeRate = parseFloat(item.FLTCRT) || 0.0;
        }

        // 추후 DART(재무), 외부 API(뉴스) 등의 고정 데이터들이 여기 모두 병합됩니다!
        res.json({
            source: "Track 1 - Firebase Functions",
            code: code,
            foundation: {
                price,
                change,
                changeRate
            }
        });

    } catch (error) {
        console.error("API 통신 실패:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. 엔진 인스턴스 전역 노출 (접근 권한 허용) - 서울 리전 사용
export const api = onRequest({ secrets: [krxApiKey], region: 'asia-northeast3' }, app);
