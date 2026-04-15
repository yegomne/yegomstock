import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';

// ⏱️ 스켈레톤 로딩 (완벽한 다크모드)
const SkeletonLoader = () => (
  <div className="w-full max-w-lg mx-auto p-6 space-y-6 min-h-screen bg-[#0a0a0b] animate-pulse">
    <div className="flex flex-col items-center justify-center py-10 space-y-4">
      <div className="w-12 h-12 border-4 border-[#2ae500] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[#c3c6cf] font-medium tracking-wide">금고의 문을 여는 중입니다... 🔐</p>
    </div>
    <div className="h-40 bg-white/5 rounded-3xl w-full border border-white/5"></div>
    <div className="h-32 bg-white/5 rounded-3xl w-full border border-white/5"></div>
    <div className="h-48 bg-white/5 rounded-3xl w-full border border-white/5"></div>
  </div>
);

export default function StockDashboard({ stockName }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [realtimePrice, setRealtimePrice] = useState(null);

  useEffect(() => {
    // ✅ 유부장이 백엔드 통신(Node.js)으로 직결시켰습니다!
    const fetchData = async () => {
      setLoading(true);
      try {
        let stockCode = "005930"; // 기본 삼성전자
        let targetName = stockName;
        
        // 간단한 종목명 -> 코드 매핑 맵
        const stockMap = {
           "삼성전자": "005930",
           "카카오": "035720",
           "에코프로": "086520",
           "SK하이닉스": "000660",
           "네이버": "035420",
           "현대차": "005380",
        };

        if (stockMap[stockName]) {
           stockCode = stockMap[stockName];
        } else if (/^\d{6}$/.test(stockName)) {
           // 6자리 코드 직접 입력 시
           stockCode = stockName;
           targetName = `종목코드 ${stockCode}`;
        } else {
           targetName = `미지원 종목 (${stockName})`;
           throw new Error("미지원 종목이거나 코드가 아닙니다.");
        }

        // 백엔드로 정적 뼈대 데이터 요첨 (Track 1)
        const response = await fetch(`/api/stock/${stockCode}`);
        
        if (!response.ok) {
           throw new Error("백엔드 통신 불안정");
        }
        const apiData = await response.json();

        // UI에 맞게 기초 데이터를 매핑
        setData({
          metadata: { stockName: targetName, stockCode: stockCode },
          foundation: apiData.foundation,
          // 아래 뼈대 데이터는 DART 백엔드 통신 시 채워질 Mock
          financialData: { revenue: 3000000, netProfit: 450000 },
          valueData: { per: 15.2, indPer: 18.0, pbr: 1.5 },
          newsData: { items: [{title: "🚨 실시간 API 통신 가동 중!"}, {title: "Node.js 백엔드 연결 성공!"}] }
        });
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // ===============================================
    // [Track 2] 윈도우 키움 봇이 쏴주는 실시간 호가 구독!
    // ===============================================
    let scode = "005930";
    if (/^\d{6}$/.test(stockName)) { scode = stockName; }
    else if (stockName === "카카오") scode = "035720";
    else if (stockName === "에코프로") scode = "086520";
    else if (stockName === "SK하이닉스") scode = "000660";
    else if (stockName === "네이버") scode = "035420";
    else if (stockName === "현대차") scode = "005380";

    const unsub = onSnapshot(doc(db, "realtime_quotes", scode), (docSnap) => {
        if (docSnap.exists()) {
            setRealtimePrice(docSnap.data());
        }
    });

    return () => unsub();
  }, [stockName]);

  if (loading) return <SkeletonLoader />;

  const priceData = realtimePrice || data?.foundation;
  const finance = data?.financialData;
  const value = data?.valueData;
  const news = data?.newsData;

  const isPositive = priceData?.change >= 0;
  // Stitch 디자인 시스템 룰 적용: 긍정은 네온그린, 부정은 네온레드
  const accentColor = isPositive ? 'text-[#2ae500]' : 'text-[#ffb4ab]';
  const neonShadow = isPositive ? 'drop-shadow-[0_0_8px_rgba(42,229,0,0.5)]' : 'drop-shadow-[0_0_8px_rgba(255,180,171,0.5)]';

  return (
    <div className="w-full max-w-lg mx-auto p-4 space-y-6 bg-[#0a0a0b] min-h-screen font-sans text-[#e5e2e1]">
      
      {/* 🔴 상단: 시세 및 미니 차트 (Glassmorphism) */}
      <section className="bg-[#1c1b1b]/60 backdrop-blur-xl p-6 rounded-[24px] border border-white/10 shadow-2xl relative overflow-hidden">
        {/* 내부 은은한 반사광 효과 */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        {priceData ? (
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[#c3c6cf] text-sm tracking-wider font-semibold mb-1">{data.metadata?.stockCode}</p>
              <h1 className="text-3xl font-extrabold tracking-tight mb-2">{data.metadata?.stockName}</h1>
              <div className="flex items-baseline space-x-3">
                <span key={priceData?.price} className={`text-4xl font-black ${neonShadow} ${realtimePrice ? 'animate-pulse' : ''}`}>{priceData?.price?.toLocaleString()}</span>
                <span className={`text-lg font-bold ${accentColor}`}>
                  {isPositive ? '▲' : '▼'} {Math.abs(priceData?.changeRate || 0)}%
                </span>
              </div>
            </div>
            
            {/* Sparkline (Neon Glow Effect) */}
            <div className="w-28 h-12 flex items-end justify-center opacity-90">
               <svg viewBox="0 0 100 30" fill="none" strokeWidth="2.5" strokeLinecap="round" className={`w-full h-full ${isPositive ? 'stroke-[#2ae500]' : 'stroke-[#ffb4ab]'}`} style={{ filter: isPositive ? 'drop-shadow(0 4px 6px rgba(42,229,0,0.3))' : 'drop-shadow(0 4px 6px rgba(255,180,171,0.3))'}}>
                 <polyline points="0,20 20,25 40,10 60,15 80,5 100,10" />
               </svg>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 font-medium">시세 데이터 지연 ⏳</div>
        )}
      </section>

      {/* 🟡 중단: 실적 및 가치지표 (Grid) */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-[#1c1b1b]/60 backdrop-blur-xl p-5 rounded-[20px] border border-white/10 shadow-lg relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          <h2 className="text-[11px] font-bold text-[#c7c6ca] tracking-widest uppercase mb-4">2025 Financials</h2>
          {finance ? (
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-[#919094] text-xs font-semibold mb-0.5">매출액 (Revenue)</span>
                <span className="font-extrabold text-lg tracking-tight">{finance.revenue.toLocaleString()}억</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#919094] text-xs font-semibold mb-0.5">순이익 (Net Profit)</span>
                <span className="font-extrabold text-lg tracking-tight">{finance.netProfit.toLocaleString()}억</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm py-2">정보 없음</div>
          )}
        </div>

        <div className="bg-[#1c1b1b]/60 backdrop-blur-xl p-5 rounded-[20px] border border-white/10 shadow-lg relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          <h2 className="text-[11px] font-bold text-[#c7c6ca] tracking-widest uppercase mb-4">Key Indicators</h2>
          {value ? (
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-[#919094] text-xs font-semibold mb-0.5">PER</span>
                <div className="flex items-baseline space-x-1">
                  <span className="font-extrabold text-lg tracking-tight">{value.per}배</span>
                  <span className="text-[10px] text-[#022100] font-bold bg-[#2ae500] px-1.5 py-0.5 rounded">업계 {value.indPer}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[#919094] text-xs font-semibold mb-0.5">PBR</span>
                <span className="font-extrabold text-lg tracking-tight">{value.pbr}배</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm py-2">정보 없음</div>
          )}
        </div>
      </section>

      {/* 🔵 하단: 최신 뉴스 및 수급 */}
      <section className="bg-[#1c1b1b]/60 backdrop-blur-xl p-6 rounded-[24px] border border-white/10 shadow-lg space-y-6 relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div>
          <h2 className="text-sm font-bold text-[#e5e2e1] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#2ae500] rounded-full"></span> Latest Issues
          </h2>
          {news && news.items?.length > 0 ? (
            <ul className="space-y-4">
              {news.items.slice(0, 3).map((item, idx) => (
                <li key={idx} className="group cursor-pointer">
                  <p className="text-[13px] text-[#c7c6ca] font-medium leading-relaxed group-hover:text-white transition-colors duration-200">
                    {item.title}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
             <div className="text-sm text-gray-400">뉴스를 불러오지 못했습니다.</div>
          )}
        </div>

        <div className="pt-5 border-t border-white/5">
          <h2 className="text-sm font-bold text-[#e5e2e1] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#ffb4ab] rounded-full"></span> Market Sentiment (3 Days)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center justify-center p-3 bg-black/40 rounded-xl border border-white/5">
              <span className="text-[#c3c6cf] text-[11px] uppercase tracking-wider font-semibold mb-2">Foreign</span>
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ed2126] drop-shadow-[0_0_4px_#ed2126]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#ed2126] drop-shadow-[0_0_4px_#ed2126]"></div>
                <div className={`w-2.5 h-2.5 rounded-full ${isPositive ? 'bg-[#ed2126] drop-shadow-[0_0_4px_#ed2126]' : 'bg-[#106e00]'}`}></div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-black/40 rounded-xl border border-white/5">
              <span className="text-[#c3c6cf] text-[11px] uppercase tracking-wider font-semibold mb-2">Institutions</span>
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#106e00]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#106e00]"></div>
                <div className={`w-2.5 h-2.5 rounded-full ${isPositive ? 'bg-[#106e00]' : 'bg-[#ed2126] drop-shadow-[0_0_4px_#ed2126]'}`}></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
