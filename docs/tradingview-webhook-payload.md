# TradingView Webhook Payload Rehberi

Bu doküman, TradingView `alert()` çağrılarından Kuarkcoin sinyal webhook'una gönderilmesi önerilen JSON payload formatını açıklar.

## Legacy payload desteği

Mevcut/legacy payload formatı desteklenmeye devam eder. En düşük uyumluluk için webhook aşağıdaki alanları bekler:

```json
{
  "secret": "<SCAN_SECRET>",
  "symbol": "BTCUSDT",
  "signal": "BUY",
  "price": 65000,
  "score": 82,
  "reasons": "Trend güçlü; hacim yüksek",
  "t": 1719835200000
}
```

> Not: `secret`, uygulamadaki `SCAN_SECRET` ortam değişkeni ile eşleşmelidir. Gerçek secret değerini Pine Script koduna, dokümana veya herkese açık bir yere yazmayın; örneklerde `<SCAN_SECRET>` placeholder'ı kullanılır.

## Önerilen yeni payload alanları

Yeni alarm kurulumlarında aşağıdaki alanların gönderilmesi önerilir. Sistem legacy alanları kabul etmeye devam eder; ek alanlar sinyalin izlenebilirliğini, analizini ve ileride yapılacak genişletmeleri kolaylaştırır.

| Alan | Tip | Açıklama | Örnek |
| --- | --- | --- | --- |
| `secret` | string | Webhook isteğini yetkilendirmek için kullanılan gizli anahtar. `SCAN_SECRET` ile eşleşmelidir. | `<SCAN_SECRET>` |
| `symbol` | string | İşlem sembolü veya paritesi. TradingView için `syminfo.ticker` ya da `syminfo.tickerid` kullanılabilir. | `BTCUSDT` |
| `name` | string | Sinyal/gösterge adı veya strateji adı. | `Kuark Momentum Scan` |
| `price` | number | Alarm anındaki güncel/kapanış fiyatı. | `65000.25` |
| `entry_price` | number | Önerilen giriş fiyatı. Çoğu durumda `close` ile aynı olabilir. | `65000.25` |
| `signal` | string | Sinyal yönü. Desteklenen temel değerler: `BUY`, `SELL`. | `BUY` |
| `position_mode` | string | Pozisyon modu/yön mantığı. Örn. spot, long/short veya hedge bilgisi. | `LONG` |
| `score` | number | Sinyalin kalite/öncelik skoru. | `87` |
| `reasons` | string | Sinyalin oluşma nedenleri. Birden fazla nedeni `;` ile ayırabilirsiniz. | `RSI toparlandı; RVOL yüksek` |
| `t` | number | TradingView zaman damgası. Saniye veya milisaniye kabul edilebilir; Pine'da `time` milisaniyedir. | `1719835200000` |
| `timeframe` | string | Alarmın üretildiği grafik periyodu. | `15` |
| `rvol` | number | Relative volume değeri. | `1.8` |
| `rsi` | number | RSI değeri. | `58.4` |
| `atr` | number | ATR değeri. | `420.5` |
| `stop_price` | number | Önerilen stop fiyatı. | `63800` |
| `target_1` | number | İlk kar alma hedefi. | `66200` |
| `target_2` | number | İkinci kar alma hedefi. | `67500` |
| `target_3` | number | Üçüncü kar alma hedefi. | `69000` |
| `exchange` | string | Borsa adı. TradingView için `syminfo.prefix` kullanılabilir. | `BINANCE` |
| `market` | string | Piyasa türü. | `crypto` |
| `source` | string | Sinyalin kaynağı veya Pine Script adı. | `tradingview` |
| `event_id` | string | Tekil olay kimliği. Tekrar eden sinyalleri ayırt etmek için önerilir. | `BINANCE:BTCUSDT-15-1719835200000-BUY` |

## Pine Script v6 uyumlu `alert()` örnekleri

Aşağıdaki örnekler Pine Script v6 ile uyumlu olacak şekilde `alert()` fonksiyonunu kullanır. `alert.freq_once_per_bar_close` kullanıldığında TradingView alarmı yalnızca mum kapandıktan sonra gönderir; yani webhook isteği canlı mum sırasında değil, bar kapanışında tetiklenir.

### BUY örneği

```pine
//@version=6
indicator("Kuarkcoin Webhook BUY Example", overlay=true)

rsiValue = ta.rsi(close, 14)
atrValue = ta.atr(14)
rvolValue = volume / ta.sma(volume, 20)
buySignal = ta.crossover(rsiValue, 50)

if buySignal
    alert(
         '{' +
         '"secret":"<SCAN_SECRET>",' +
         '"symbol":"' + syminfo.ticker + '",' +
         '"name":"Kuark Momentum Scan",' +
         '"price":' + str.tostring(close) + ',' +
         '"entry_price":' + str.tostring(close) + ',' +
         '"signal":"BUY",' +
         '"position_mode":"LONG",' +
         '"score":' + str.tostring(85) + ',' +
         '"reasons":"RSI 50 uzerine kesti; RVOL guclu",' +
         '"t":' + str.tostring(time) + ',' +
         '"timeframe":"' + timeframe.period + '",' +
         '"rvol":' + str.tostring(rvolValue) + ',' +
         '"rsi":' + str.tostring(rsiValue) + ',' +
         '"atr":' + str.tostring(atrValue) + ',' +
         '"stop_price":' + str.tostring(close - atrValue * 1.5) + ',' +
         '"target_1":' + str.tostring(close + atrValue * 1.0) + ',' +
         '"target_2":' + str.tostring(close + atrValue * 2.0) + ',' +
         '"target_3":' + str.tostring(close + atrValue * 3.0) + ',' +
         '"exchange":"' + syminfo.prefix + '",' +
         '"market":"crypto",' +
         '"source":"tradingview",' +
         '"event_id":"' + syminfo.tickerid + '-' + timeframe.period + '-' + str.tostring(time) + '-BUY"' +
         '}',
         alert.freq_once_per_bar_close
     )
```

### SELL örneği

```pine
//@version=6
indicator("Kuarkcoin Webhook SELL Example", overlay=true)

rsiValue = ta.rsi(close, 14)
atrValue = ta.atr(14)
rvolValue = volume / ta.sma(volume, 20)
sellSignal = ta.crossunder(rsiValue, 50)

if sellSignal
    alert(
         '{' +
         '"secret":"<SCAN_SECRET>",' +
         '"symbol":"' + syminfo.ticker + '",' +
         '"name":"Kuark Momentum Scan",' +
         '"price":' + str.tostring(close) + ',' +
         '"entry_price":' + str.tostring(close) + ',' +
         '"signal":"SELL",' +
         '"position_mode":"SHORT",' +
         '"score":' + str.tostring(82) + ',' +
         '"reasons":"RSI 50 altina indi; momentum zayifladi",' +
         '"t":' + str.tostring(time) + ',' +
         '"timeframe":"' + timeframe.period + '",' +
         '"rvol":' + str.tostring(rvolValue) + ',' +
         '"rsi":' + str.tostring(rsiValue) + ',' +
         '"atr":' + str.tostring(atrValue) + ',' +
         '"stop_price":' + str.tostring(close + atrValue * 1.5) + ',' +
         '"target_1":' + str.tostring(close - atrValue * 1.0) + ',' +
         '"target_2":' + str.tostring(close - atrValue * 2.0) + ',' +
         '"target_3":' + str.tostring(close - atrValue * 3.0) + ',' +
         '"exchange":"' + syminfo.prefix + '",' +
         '"market":"crypto",' +
         '"source":"tradingview",' +
         '"event_id":"' + syminfo.tickerid + '-' + timeframe.period + '-' + str.tostring(time) + '-SELL"' +
         '}',
         alert.freq_once_per_bar_close
     )
```

## TradingView alarm kurulum adımları

1. Pine Script kodunu TradingView Pine Editor'a ekleyin ve grafiğe uygulayın.
2. Alarm oluştururken **Condition** alanında ilgili göstergeyi seçin.
3. Condition seçeneklerinde **Any alert() function call** seçeneğini seçin. Bu seçim, alarm mesajının Pine Script içindeki `alert()` çağrısından gelmesini sağlar.
4. **Webhook URL** alanına Kuarkcoin sinyal endpoint'ini girin. Örnek: `https://<domain>/api/signals`.
5. Alarmı kaydedin.
6. Pine Script kodunu güncellerseniz alarmı yeniden oluşturun. TradingView, mevcut alarmın içinde kodun eski derlenmiş halini tutabilir; bu nedenle webhook payload değişikliklerinin uygulanması için alarmı silip yeniden oluşturmak en güvenli yöntemdir.

## Kontrol listesi

- `secret` gerçek değerle TradingView alarmında ayarlı mı?
- `signal` yalnızca `BUY` veya `SELL` olarak mı gönderiliyor?
- `symbol` boş değil mi?
- `alert.freq_once_per_bar_close` kullanıldığında sinyalin mum kapanışında gönderileceği dikkate alındı mı?
- Kod değişikliği sonrası TradingView alarmı yeniden oluşturuldu mu?
