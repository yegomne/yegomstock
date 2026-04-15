// 1. Firebase 모듈 (CDN 방식) 임포트
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TODO: 대표님! 아래 빈칸에 Firebase 프로젝트 설정값(Config) 객체를 붙여넣어 주세요! (대시보드 "프로젝트 설정" 메뉴에 있습니다)
const firebaseConfig = {
    apiKey: "AIzaSyAVar9XwnXfwCzbmkyvHWHYQDNMJdgjjq8",
    authDomain: "yegomstock.firebaseapp.com",
    projectId: "yegomstock",
    storageBucket: "yegomstock.firebasestorage.app",
    messagingSenderId: "417050058129",
    appId: "1:417050058129:web:0a494a3c236b03c38a4e30"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const stocksContainer = document.getElementById("stocks-container");
const newsContainer = document.getElementById("news-container");
const liveTimeText = document.getElementById("live-time");
const addStockForm = document.getElementById("add-stock-form");

// 2. 숫자에 콤마(,) 찍어주는 유틸 함수
function formatNumber(num) {
    if (!num) return "-";
    return Number(num).toLocaleString('ko-KR');
}

// 3. Firestore 데이터 렌더링 로직
async function fetchAndRenderData() {
    try {
        const querySnapshot = await getDocs(collection(db, "daily_fundamentals"));
        let stocksHtml = "";
        let globalNewsData = {};

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const symbol = doc.id; // 예: "005930"

            // DART 데이터 추출 (없으면 기본 빈 객체)
            const dart = data.dart_data || {};
            // KRX 데이터 (파이썬 pykrx 적재 포맷 매핑)
            const krx = data.krx_data || { market_cap: 0, close_price: 0, change_rate: 0, per: 0, pbr: 0 };
            const stockName = data["종목명"] || "이름 누락";

            // 상태 표시용 (네온 효과)
            const rateClass = krx.change_rate >= 0 ? "rate-up" : "rate-down";
            const rateSign = krx.change_rate > 0 ? "+" : "";

            // --- 주식 카드 HTML 조립 ---
            stocksHtml += `
                <div class="stock-card" data-symbol="${symbol}" style="cursor: pointer;">
                    <div class="stock-header">
                        <div class="stock-name-box">
                            <h3>${stockName}</h3>
                            <span>${symbol}</span>
                        </div>
                        <div class="stock-price-box">
                            <span class="stock-price">${formatNumber(krx.close_price)}</span>
                            <span class="stock-rate ${rateClass}">${rateSign}${krx.change_rate ? krx.change_rate.toFixed(2) : 0}%</span>
                        </div>
                    </div>
                    <div class="stock-info">
                        <div class="info-row">
                            <span>시가총액</span>
                            <span>${formatNumber(krx.market_cap)} 억</span>
                        </div>
                        <div class="info-row">
                            <span>PER / PBR</span>
                            <span>${krx.per > 0 ? krx.per : '-'} / ${krx.pbr > 0 ? krx.pbr : '-'}</span>
                        </div>
                        <div class="info-row">
                            <span>분류 (DART)</span>
                            <span>${dart.industry || '-'}</span>
                        </div>
                    </div>
                </div>
            `;

            // 뉴스를 객체에 저장
            if (data.naver_news && Array.isArray(data.naver_news.recent_news)) {
                globalNewsData[symbol] = {
                    name: stockName,
                    news: data.naver_news.recent_news
                };
            }
        });

        // 4. 화면 업데이트
        stocksContainer.innerHTML = stocksHtml || "<p style='padding:1rem;'>Firestore에 데이터가 없습니다. (API 설정 확인)</p>";
        newsContainer.innerHTML = "<div style='display:flex; height:100%; align-items:center; justify-content:center; color:#888;'><p>좌측에서 종목을 클릭하시면 관련 기사가 표시됩니다 👆</p></div>";
        
        // 4-1. 카드 클릭 이벤트 바인딩
        document.querySelectorAll('.stock-card').forEach(card => {
            card.addEventListener('click', () => {
                // 강조 스타일 변동
                document.querySelectorAll('.stock-card').forEach(c => {
                    c.style.border = '1px solid rgba(255,255,255,0.05)';
                    c.style.background = 'rgba(255, 255, 255, 0.03)';
                });
                card.style.border = '1px solid var(--accent)';
                card.style.background = 'rgba(108, 92, 231, 0.1)';

                const sym = card.getAttribute('data-symbol');
                const newsInfo = globalNewsData[sym];
                
                let selectedNewsHtml = "";
                if (newsInfo && newsInfo.news.length > 0) {
                    selectedNewsHtml = newsInfo.news.map(n => `
                        <a href="${n.link}" target="_blank" class="news-card">
                            <h4>${n.title}</h4>
                            <p>
                                <span>[${newsInfo.name}] 관련 기사</span>
                                <span>${n.pubDate}</span>
                            </p>
                        </a>
                    `).join('');
                } else {
                    selectedNewsHtml = "<p style='padding:1rem;'>해당 종목의 최신 뉴스가 없습니다.</p>";
                }
                newsContainer.innerHTML = selectedNewsHtml;
            });
        });

        // 현재 시간 찍어주기
        const now = new Date();
        liveTimeText.innerText = `🟢 Live: ${now.toLocaleString('ko-KR')}`;

    } catch (error) {
        console.error("Firestore 연결 에러:", error);
        stocksContainer.innerHTML = `
            <div class="loading-state" style="color:#FF2E63;">
                <i class="ri-error-warning-line"></i> Firestore 데이터를 가져오지 못했습니다.<br>
                1. Firebase 설정값(apiKey 등)이 정확한지 app.js를 확인해 주세요.<br>
                2. Firestore 데이터베이스가 'Test mode'로 생성되었는지 확인해 주세요.
            </div>`;
    }
}

// 스크립트 로드 시 데이터 패치 시작
fetchAndRenderData();

// 5. 종목 검색(자동완성) 로직
const searchInput = document.getElementById("new-stock-name");
const codeInput = document.getElementById("new-stock-code");
const autocompleteList = document.getElementById("autocomplete-list");
let searchTimeout;
let stockMasterList = [];

// stock_master.json 비동기 로딩 (서버 오버헤드나 CORS 없이 즉시 실행됨)
async function loadStockMaster() {
    try {
        const response = await fetch("stock_master.json");
        const data = await response.json();
        stockMasterList = data;
    } catch (e) {
        console.error("Failed to load stock_master.json:", e);
    }
}

if (searchInput) {
    // 최초 실행 시 마스터 데이터 로드
    loadStockMaster();

    // 입력 이벤트 처리 (타이핑 시)
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        codeInput.value = ""; // 종목명 변경 시 코드는 리셋
        
        if(query.length === 0 || stockMasterList.length === 0) {
            autocompleteList.style.display = "none";
            return;
        }
        
        clearTimeout(searchTimeout);
        // 메모리 필터링이므로 딜레이 최소화 (150ms)
        searchTimeout = setTimeout(() => {
            // 필터링: 종목명에 검색어가 포함되거나(초성검색 미지원), 코드에 포함되는 경우 최대 30개 항목 추출
            const matches = stockMasterList.filter(item => 
                item.name.toLowerCase().includes(query) || item.code.includes(query)
            ).slice(0, 30);
            
            autocompleteList.innerHTML = "";
            
            if(matches.length === 0) {
                autocompleteList.style.display = "none";
                return;
            }
            
            matches.forEach(item => {
                const name = item.name;
                const code = item.code;
                
                const div = document.createElement("div");
                div.style.padding = "0.7rem 1rem";
                div.style.cursor = "pointer";
                div.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
                div.style.transition = "background-color 0.2s ease";
                
                // 검색어 하이라이트 등도 가능하지만 심플하게 표현
                div.innerHTML = `<strong>${name}</strong> <span style="color:#aaa; font-size:0.85em; margin-left:8px;">${code}</span>`;
                
                div.addEventListener("mouseenter", () => div.style.backgroundColor = "rgba(255,255,255,0.05)");
                div.addEventListener("mouseleave", () => div.style.backgroundColor = "transparent");
                
                div.addEventListener("click", () => {
                    searchInput.value = name;
                    codeInput.value = code;
                    autocompleteList.style.display = "none";
                });
                
                autocompleteList.appendChild(div);
            });
            
            autocompleteList.style.display = "block";
        }, 150);
    });

    // 검색창 바깥 클릭 시 닫기
    document.addEventListener("click", (e) => {
        if(e.target !== searchInput && e.target !== autocompleteList) {
            autocompleteList.style.display = "none";
        }
    });
}


// 5. 종목 추가 기능 (Web UI -> Firestore `target_stocks` 컬렉션 저장용)
if(addStockForm) {
    addStockForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const stockName = document.getElementById("new-stock-name").value.trim();
        const stockCode = document.getElementById("new-stock-code").value.trim();
        
        // 종목코드가 비어있는 경우 방어 로직!
        if(!stockCode) {
            alert("⚠️ 종목명을 검색하시고, 아래 뜨는 자동완성 리스트에서 종목을 클릭하여 명확히 선택해 주세요!");
            return; // 폼 제출 중지 (Firebase 빈 문서 참조 에러 방지)
        }

        try {
            // Firestore target_stocks 컬렉션에 새 종목 저장
            const docRef = doc(db, "target_stocks", stockCode);
            await setDoc(docRef, { name: stockName, code: stockCode });
            
            alert(`🎉 [${stockName}] 종목이 모니터링 목록에 추가되었습니다!\n💡 파이썬 배치 스크립트가 다시 돌면 데이터를 가져옵니다!`);
            
            // 입력창 초기화
            document.getElementById("new-stock-name").value = "";
            document.getElementById("new-stock-code").value = "";
        } catch (error) {
            console.error(error);
            alert("❌ 종목 추가 통신 에러: " + error.message);
        }
    });
}
