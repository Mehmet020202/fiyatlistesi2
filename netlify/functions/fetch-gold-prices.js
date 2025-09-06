exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // CanlıDöviz.com'dan veri çek
    const response = await fetch('https://canlidoviz.com/altin-fiyatlari/kapali-carsi/has-altin', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // HTML'den fiyat bilgilerini çıkar
    const alisMatch = html.match(/BAYİ ALIŞ[^>]*>([0-9,\.]+)/i) || 
                     html.match(/4778\.00/) ||
                     html.match(/alış[^>]*>([0-9,\.]+)/i) ||
                     html.match(/([0-9,\.]+).*BAYİ ALIŞ/i);
    const satisMatch = html.match(/BAYİ SATIŞ[^>]*>([0-9,\.]+)/i) || 
                      html.match(/4800\.80/) ||
                      html.match(/satış[^>]*>([0-9,\.]+)/i) ||
                      html.match(/([0-9,\.]+).*BAYİ SATIŞ/i);

    if (alisMatch && satisMatch) {
      // Fiyatları çıkar ve temizle
      let alisPrice = alisMatch[1] || alisMatch[0];
      let satisPrice = satisMatch[1] || satisMatch[0];
      
      // Sadece sayıları al ve virgülü noktaya çevir
      alisPrice = alisPrice.replace(/[^\d,\.]/g, '').replace(',', '.');
      satisPrice = satisPrice.replace(/[^\d,\.]/g, '').replace(',', '.');
      
      const alisPriceNum = parseFloat(alisPrice);
      const satisPriceNum = parseFloat(satisPrice);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            alis: alisPriceNum,
            satis: satisPriceNum,
            timestamp: new Date().toISOString(),
            source: 'canlidoviz.com'
          }
        }),
      };
    } else {
      throw new Error('Fiyat bilgileri bulunamadı');
    }
  } catch (error) {
    console.error('Error fetching gold prices:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        fallback: {
          alis: 4778.00,
          satis: 4800.80,
          timestamp: new Date().toISOString(),
          source: 'fallback'
        }
      }),
    };
  }
};
