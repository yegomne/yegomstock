import React, { useState } from 'react';
import StockDashboard from './StockDashboard';
import './index.css';

function App() {
  const [activeStock, setActiveStock] = useState("삼성전자");
  const [searchInput, setSearchInput] = useState("");
  const stocks = ["삼성전자", "SK하이닉스", "카카오", "에코프로"];

  const handleSearch = (e) => {
    e.preventDefault();
    if(searchInput.trim()) {
      setActiveStock(searchInput.trim());
      setSearchInput("");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#e5e2e1] flex flex-col items-center pt-8 px-4">
      
      {/* 🟢 검색창 영역 (Glassmorphism & Neon) */}
      <div className="max-w-md w-full mx-auto mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="종목명 또는 코드입력 (ex. 삼성전자, 005930)" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-[#1c1b1b] border border-white/10 rounded-full px-5 py-3 text-[#e5e2e1] placeholder-gray-500 focus:outline-none focus:border-[#2ae500] focus:shadow-[0_0_12px_rgba(42,229,0,0.3)] transition-all"
          />
          <button type="submit" className="bg-[#2ae500] text-[#022100] px-6 py-3 rounded-full font-bold shadow-[0_0_12px_rgba(42,229,0,0.6)] hover:bg-[#39ff14] transition-all">
            검색
          </button>
        </form>

        {/* 빠른 검색 버튼들 */}
        <div className="flex flex-wrap justify-center gap-2">
          {stocks.map(stock => (
            <button 
              key={stock}
              onClick={() => setActiveStock(stock)}
              className={`px-4 py-1.5 rounded-full font-bold text-[12px] tracking-wide transition-all duration-300 ${activeStock === stock ? 'bg-[#2ae500]/20 border border-[#2ae500] text-[#2ae500]' : 'bg-[#1c1b1b] border border-white/10 text-[#c3c6cf] hover:text-white hover:bg-white/10'}`}
            >
              {stock}
            </button>
          ))}
        </div>
      </div>

      <StockDashboard stockName={activeStock} />
    </div>
  );
}

export default App;
