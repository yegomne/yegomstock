import FinanceDataReader as fdr
import json
import os

def generate_stock_master():
    print("Fetching KRX stock list...")
    df = fdr.StockListing('KRX')
    
    stocks = []
    # DataFrame에서 이름과 코드 추출
    for idx, row in df.iterrows():
        name = str(row['Name']).strip()
        code = str(row['Code']).strip()
        
        # 주식코드(6자리)인 경우만 추가
        if len(code) == 6 and code.isdigit():
            stocks.append({'name': name, 'code': code})
            
    print(f"Total valid stocks found: {len(stocks)}")
    
    # public 디렉토리 존재 확인
    if not os.path.exists('public'):
        os.makedirs('public')
        
    output_path = 'public/stock_master.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(stocks, f, ensure_ascii=False)
        
    print(f"Successfully saved to {output_path}")

if __name__ == "__main__":
    generate_stock_master()
