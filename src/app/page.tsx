"use client"

import { useState, useEffect, useMemo } from "react"
import { TrendingUp, TrendingDown, Activity, BarChart3, Settings, AlertCircle, Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Tipos
interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Signal {
  type: "buy" | "sell"
  time: number
  price: number
  strength: number
  confirmations: string[]
}

interface Config {
  fastEMA: number
  slowEMA: number
  rsiPeriod: number
  rsiBuy: number
  rsiSell: number
  atrPeriod: number
  atrMult: number
  volPeriod: number
  volMult: number
  sensitivity: number
  requireAll: boolean
  useRSI: boolean
  useVolume: boolean
  useATR: boolean
}

interface Coin {
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
}

// Funções de cálculo de indicadores
function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const ema: number[] = []
  ema[0] = data[0]
  
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k)
  }
  
  return ema
}

function calculateRSI(closes: number[], period: number): number[] {
  const rsi: number[] = []
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(50)
      continue
    }
    
    let gains = 0
    let losses = 0
    
    for (let j = i - period + 1; j <= i; j++) {
      const change = closes[j] - closes[j - 1]
      if (change > 0) gains += change
      else losses -= change
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) {
      rsi.push(100)
    } else {
      const rs = avgGain / avgLoss
      rsi.push(100 - (100 / (1 + rs)))
    }
  }
  
  return rsi
}

function calculateATR(candles: Candle[], period: number): number[] {
  const atr: number[] = []
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      atr.push(candles[i].high - candles[i].low)
      continue
    }
    
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      const tr = Math.max(
        candles[j].high - candles[j].low,
        Math.abs(candles[j].high - candles[j - 1].close),
        Math.abs(candles[j].low - candles[j - 1].close)
      )
      sum += tr
    }
    
    atr.push(sum / period)
  }
  
  return atr
}

function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(data[i])
      continue
    }
    
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j]
    }
    sma.push(sum / period)
  }
  
  return sma
}

// Gerador de dados simulados
function generateCandles(count: number, basePrice: number): Candle[] {
  const candles: Candle[] = []
  let price = basePrice
  const now = Date.now()
  
  for (let i = 0; i < count; i++) {
    const volatility = 0.02
    const trend = Math.sin(i / 20) * 0.005
    
    const open = price
    const change = (Math.random() - 0.5) * price * volatility + price * trend
    const close = price + change
    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const low = Math.min(open, close) * (1 - Math.random() * 0.01)
    const volume = 100 + Math.random() * 200
    
    candles.push({
      time: now - (count - i) * 60000,
      open,
      high,
      low,
      close,
      volume
    })
    
    price = close
  }
  
  return candles
}

// Lista de moedas disponíveis
const availableCoins: Coin[] = [
  { symbol: "BTC/USDT", name: "Bitcoin", price: 67234.50, change24h: 2.34, volume24h: 28500000000, high24h: 68500, low24h: 65200 },
  { symbol: "ETH/USDT", name: "Ethereum", price: 3456.78, change24h: -1.23, volume24h: 15200000000, high24h: 3520, low24h: 3380 },
  { symbol: "BNB/USDT", name: "Binance Coin", price: 589.45, change24h: 0.87, volume24h: 1200000000, high24h: 595, low24h: 582 },
  { symbol: "SOL/USDT", name: "Solana", price: 145.67, change24h: 5.43, volume24h: 3400000000, high24h: 148, low24h: 138 },
  { symbol: "XRP/USDT", name: "Ripple", price: 0.6234, change24h: -2.15, volume24h: 2100000000, high24h: 0.64, low24h: 0.61 },
  { symbol: "ADA/USDT", name: "Cardano", price: 0.4567, change24h: 1.45, volume24h: 890000000, high24h: 0.47, low24h: 0.45 },
  { symbol: "DOGE/USDT", name: "Dogecoin", price: 0.0823, change24h: 3.21, volume24h: 1500000000, high24h: 0.085, low24h: 0.079 },
  { symbol: "AVAX/USDT", name: "Avalanche", price: 34.56, change24h: -0.98, volume24h: 780000000, high24h: 35.2, low24h: 33.8 },
]

export default function TradingDashboard() {
  const [selectedCoin, setSelectedCoin] = useState<Coin>(availableCoins[0])
  const [candles, setCandles] = useState<Candle[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [config, setConfig] = useState<Config>({
    fastEMA: 21,
    slowEMA: 55,
    rsiPeriod: 14,
    rsiBuy: 55,
    rsiSell: 45,
    atrPeriod: 14,
    atrMult: 1.0,
    volPeriod: 20,
    volMult: 1.25,
    sensitivity: 4,
    requireAll: true,
    useRSI: true,
    useVolume: true,
    useATR: true
  })

  // Gerar dados iniciais
  useEffect(() => {
    const initialCandles = generateCandles(200, selectedCoin.price)
    setCandles(initialCandles)
    setSignals([])
  }, [selectedCoin])

  // Atualizar dados em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const newCandles = [...prev]
        const lastCandle = newCandles[newCandles.length - 1]
        
        const volatility = 0.02
        const trend = Math.sin(newCandles.length / 20) * 0.005
        const change = (Math.random() - 0.5) * lastCandle.close * volatility + lastCandle.close * trend
        
        const newCandle: Candle = {
          time: Date.now(),
          open: lastCandle.close,
          close: lastCandle.close + change,
          high: Math.max(lastCandle.close, lastCandle.close + change) * (1 + Math.random() * 0.01),
          low: Math.min(lastCandle.close, lastCandle.close + change) * (1 - Math.random() * 0.01),
          volume: 100 + Math.random() * 200
        }
        
        newCandles.push(newCandle)
        if (newCandles.length > 200) newCandles.shift()
        
        return newCandles
      })
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])

  // Calcular indicadores e sinais
  const indicators = useMemo(() => {
    if (candles.length < 100) return null
    
    const closes = candles.map(c => c.close)
    const volumes = candles.map(c => c.volume)
    
    const fastEMA = calculateEMA(closes, config.fastEMA)
    const slowEMA = calculateEMA(closes, config.slowEMA)
    const rsi = calculateRSI(closes, config.rsiPeriod)
    const atr = calculateATR(candles, config.atrPeriod)
    const volSMA = calculateSMA(volumes, config.volPeriod)
    const atrSMA = calculateSMA(atr, config.atrPeriod)
    
    return { fastEMA, slowEMA, rsi, atr, volSMA, atrSMA }
  }, [candles, config])

  // Detectar sinais
  useEffect(() => {
    if (!indicators || candles.length < 100) return
    
    const { fastEMA, slowEMA, rsi, atr, volSMA, atrSMA } = indicators
    const lastIdx = candles.length - 1
    
    // Confirmações
    const confirmations: string[] = []
    
    // Tendência
    const trendUp = fastEMA[lastIdx] > slowEMA[lastIdx]
    const trendDown = fastEMA[lastIdx] < slowEMA[lastIdx]
    
    if (trendUp) confirmations.push("Tendência Alta")
    if (trendDown) confirmations.push("Tendência Baixa")
    
    // RSI
    const rsiValue = rsi[lastIdx]
    const rsiBuySignal = config.useRSI && rsiValue >= config.rsiBuy
    const rsiSellSignal = config.useRSI && rsiValue <= config.rsiSell
    
    if (rsiBuySignal) confirmations.push("RSI Compra")
    if (rsiSellSignal) confirmations.push("RSI Venda")
    
    // Volume
    const volSpike = candles[lastIdx].volume > volSMA[lastIdx] * config.volMult
    if (config.useVolume && volSpike) confirmations.push("Volume Alto")
    
    // Volatilidade
    const highVol = atr[lastIdx] > atrSMA[lastIdx] * config.atrMult
    if (config.useATR && highVol) confirmations.push("Volatilidade Alta")
    
    // Contar confirmações
    const buyConfirms = [trendUp, rsiBuySignal || !config.useRSI, volSpike || !config.useVolume, highVol || !config.useATR].filter(Boolean).length
    const sellConfirms = [trendDown, rsiSellSignal || !config.useRSI, volSpike || !config.useVolume, highVol || !config.useATR].filter(Boolean).length
    
    const totalRequired = [config.useRSI, config.useVolume, config.useATR].filter(Boolean).length + 1
    
    const buyReady = config.requireAll ? buyConfirms === totalRequired : buyConfirms >= config.sensitivity
    const sellReady = config.requireAll ? sellConfirms === totalRequired : sellConfirms >= config.sensitivity
    
    // Gerar sinal
    if (buyReady && trendUp) {
      setSignals(prev => {
        const lastSignal = prev[prev.length - 1]
        if (lastSignal && Date.now() - lastSignal.time < 10000) return prev
        
        return [...prev, {
          type: "buy",
          time: Date.now(),
          price: candles[lastIdx].close,
          strength: buyConfirms,
          confirmations: confirmations.filter(c => c.includes("Alta") || c.includes("Compra"))
        }].slice(-10)
      })
    } else if (sellReady && trendDown) {
      setSignals(prev => {
        const lastSignal = prev[prev.length - 1]
        if (lastSignal && Date.now() - lastSignal.time < 10000) return prev
        
        return [...prev, {
          type: "sell",
          time: Date.now(),
          price: candles[lastIdx].close,
          strength: sellConfirms,
          confirmations: confirmations.filter(c => c.includes("Baixa") || c.includes("Venda"))
        }].slice(-10)
      })
    }
  }, [candles, indicators, config])

  const currentPrice = candles[candles.length - 1]?.close || selectedCoin.price
  const priceChange = candles.length > 1 ? ((currentPrice - candles[0].close) / candles[0].close) * 100 : selectedCoin.change24h
  const lastSignal = signals[signals.length - 1]
  
  const currentRSI = indicators?.rsi[candles.length - 1] || 50
  const currentATR = indicators?.atr[candles.length - 1] || 0
  const currentVolume = candles[candles.length - 1]?.volume || 0
  const avgVolume = indicators?.volSMA[candles.length - 1] || 0

  const filteredCoins = availableCoins.filter(coin => 
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const lastCandle = candles[candles.length - 1]
  const high24h = Math.max(...candles.slice(-24).map(c => c.high))
  const low24h = Math.min(...candles.slice(-24).map(c => c.low))

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      {/* Header com informações da moeda */}
      <div className="border-b border-slate-800 bg-[#131722]">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Info da moeda selecionada */}
            <div className="flex items-center gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{selectedCoin.symbol}</h1>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                    {selectedCoin.name}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-bold">${currentPrice.toFixed(2)}</span>
                  <span className={`text-lg font-semibold ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Métricas 24h */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-slate-500">Máx 24h</p>
                <p className="font-semibold">${high24h.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-500">Mín 24h</p>
                <p className="font-semibold">${low24h.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-500">Volume 24h</p>
                <p className="font-semibold">${(selectedCoin.volume24h / 1000000000).toFixed(2)}B</p>
              </div>
              <div>
                <p className="text-slate-500">RSI(14)</p>
                <p className={`font-semibold ${currentRSI > 70 ? 'text-red-400' : currentRSI < 30 ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {currentRSI.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Botão de configurações */}
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800/50 hover:bg-slate-800"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>
      </div>

      {/* Grade de Moedas */}
      <div className="border-b border-slate-800 bg-[#131722]">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Search className="w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar moeda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs bg-[#0B0F19] border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {filteredCoins.map((coin) => (
              <button
                key={coin.symbol}
                onClick={() => setSelectedCoin(coin)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg transition-all ${
                  selectedCoin.symbol === coin.symbol
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-semibold text-sm">{coin.symbol}</p>
                    <p className="text-xs opacity-75">{coin.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">${coin.price.toFixed(2)}</p>
                    <p className={`text-xs font-semibold ${coin.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto p-4">
        {/* Configurações */}
        {showSettings && (
          <Card className="mb-4 p-6 bg-[#131722] border-slate-800">
            <h3 className="text-xl font-semibold mb-4">Configurações do Indicador</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label className="text-slate-300">EMA Rápida: {config.fastEMA}</Label>
                <Slider
                  value={[config.fastEMA]}
                  onValueChange={([v]) => setConfig(prev => ({ ...prev, fastEMA: v }))}
                  min={5}
                  max={50}
                  step={1}
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-slate-300">EMA Lenta: {config.slowEMA}</Label>
                <Slider
                  value={[config.slowEMA]}
                  onValueChange={([v]) => setConfig(prev => ({ ...prev, slowEMA: v }))}
                  min={20}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-slate-300">RSI Período: {config.rsiPeriod}</Label>
                <Slider
                  value={[config.rsiPeriod]}
                  onValueChange={([v]) => setConfig(prev => ({ ...prev, rsiPeriod: v }))}
                  min={5}
                  max={30}
                  step={1}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Usar RSI</Label>
                <Switch
                  checked={config.useRSI}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, useRSI: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Usar Volume</Label>
                <Switch
                  checked={config.useVolume}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, useVolume: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Exigir Todas</Label>
                <Switch
                  checked={config.requireAll}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, requireAll: v }))}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Sinal Atual */}
        {lastSignal && Date.now() - lastSignal.time < 30000 && (
          <Alert className={`mb-4 border-2 ${lastSignal.type === 'buy' ? 'border-emerald-500 bg-emerald-950/30' : 'border-red-500 bg-red-950/30'}`}>
            <AlertCircle className={`h-5 w-5 ${lastSignal.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`} />
            <AlertDescription>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <span className="font-bold text-lg">
                    {lastSignal.type === 'buy' ? '🟢 SINAL DE COMPRA FORTE' : '🔴 SINAL DE VENDA FORTE'}
                  </span>
                  <span className="ml-3 text-slate-300">
                    ${lastSignal.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={lastSignal.type === 'buy' ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}>
                    Força: {lastSignal.strength}/4
                  </Badge>
                  {lastSignal.confirmations.map((conf, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-slate-800 text-slate-300">
                      {conf}
                    </Badge>
                  ))}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Gráfico Principal - MAIOR */}
          <Card className="lg:col-span-3 p-6 bg-[#131722] border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Gráfico</h3>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="border-emerald-500 text-emerald-400">
                  EMA {config.fastEMA}
                </Badge>
                <Badge variant="outline" className="border-red-500 text-red-400">
                  EMA {config.slowEMA}
                </Badge>
              </div>
            </div>
            
            {/* Indicadores Técnicos */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-xs">
              <div className="bg-[#0B0F19] p-2 rounded">
                <p className="text-slate-500">Abertura</p>
                <p className="font-semibold">${lastCandle?.open.toFixed(2)}</p>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded">
                <p className="text-slate-500">Máxima</p>
                <p className="font-semibold text-emerald-400">${lastCandle?.high.toFixed(2)}</p>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded">
                <p className="text-slate-500">Mínima</p>
                <p className="font-semibold text-red-400">${lastCandle?.low.toFixed(2)}</p>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded">
                <p className="text-slate-500">Fechamento</p>
                <p className="font-semibold">${lastCandle?.close.toFixed(2)}</p>
              </div>
              <div className="bg-[#0B0F19] p-2 rounded">
                <p className="text-slate-500">Volume</p>
                <p className="font-semibold">{currentVolume.toFixed(0)}</p>
              </div>
            </div>

            {/* Gráfico */}
            <div className="relative h-[500px] bg-[#0B0F19] rounded-lg overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {candles.length > 0 && (() => {
                  const padding = 5
                  const width = 100
                  const height = 100
                  const visibleCandles = candles.slice(-100)
                  
                  const maxPrice = Math.max(...visibleCandles.map(c => c.high))
                  const minPrice = Math.min(...visibleCandles.map(c => c.low))
                  const priceRange = maxPrice - minPrice
                  
                  const candleWidth = (width - padding * 2) / visibleCandles.length
                  
                  return (
                    <>
                      {/* Grid lines */}
                      {[0, 25, 50, 75, 100].map(y => (
                        <line
                          key={y}
                          x1={padding}
                          y1={y}
                          x2={width - padding}
                          y2={y}
                          stroke="#1e293b"
                          strokeWidth="0.1"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}

                      {/* EMAs */}
                      {indicators && (
                        <>
                          <polyline
                            points={visibleCandles.map((c, i) => {
                              const x = padding + i * candleWidth
                              const y = height - padding - ((indicators.fastEMA[candles.length - 100 + i] - minPrice) / priceRange) * (height - padding * 2)
                              return `${x},${y}`
                            }).join(' ')}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="0.3"
                            vectorEffect="non-scaling-stroke"
                          />
                          <polyline
                            points={visibleCandles.map((c, i) => {
                              const x = padding + i * candleWidth
                              const y = height - padding - ((indicators.slowEMA[candles.length - 100 + i] - minPrice) / priceRange) * (height - padding * 2)
                              return `${x},${y}`
                            }).join(' ')}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="0.3"
                            vectorEffect="non-scaling-stroke"
                          />
                        </>
                      )}
                      
                      {/* Candles */}
                      {visibleCandles.map((candle, i) => {
                        const x = padding + i * candleWidth
                        const yHigh = height - padding - ((candle.high - minPrice) / priceRange) * (height - padding * 2)
                        const yLow = height - padding - ((candle.low - minPrice) / priceRange) * (height - padding * 2)
                        const yOpen = height - padding - ((candle.open - minPrice) / priceRange) * (height - padding * 2)
                        const yClose = height - padding - ((candle.close - minPrice) / priceRange) * (height - padding * 2)
                        
                        const isGreen = candle.close > candle.open
                        const color = isGreen ? '#10b981' : '#ef4444'
                        
                        return (
                          <g key={i}>
                            <line
                              x1={x}
                              y1={yHigh}
                              x2={x}
                              y2={yLow}
                              stroke={color}
                              strokeWidth="0.15"
                              vectorEffect="non-scaling-stroke"
                            />
                            <rect
                              x={x - candleWidth * 0.35}
                              y={Math.min(yOpen, yClose)}
                              width={candleWidth * 0.7}
                              height={Math.abs(yClose - yOpen) || 0.3}
                              fill={color}
                            />
                          </g>
                        )
                      })}
                    </>
                  )
                })()}
              </svg>
            </div>
          </Card>

          {/* Painel Lateral */}
          <div className="space-y-4">
            {/* Métricas */}
            <Card className="p-4 bg-[#131722] border-slate-800">
              <h3 className="text-sm font-semibold mb-3 text-slate-400">INDICADORES</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">RSI(14)</span>
                  <span className={`font-semibold ${currentRSI > 70 ? 'text-red-400' : currentRSI < 30 ? 'text-emerald-400' : 'text-white'}`}>
                    {currentRSI.toFixed(1)}
                  </span>
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">ATR(14)</span>
                  <span className="font-semibold">{currentATR.toFixed(2)}</span>
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Volume</span>
                  <span className={`font-semibold ${currentVolume > avgVolume * 1.5 ? 'text-emerald-400' : 'text-white'}`}>
                    {currentVolume.toFixed(0)}
                  </span>
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">EMA {config.fastEMA}</span>
                  <span className="font-semibold text-emerald-400">
                    ${indicators?.fastEMA[candles.length - 1]?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">EMA {config.slowEMA}</span>
                  <span className="font-semibold text-red-400">
                    ${indicators?.slowEMA[candles.length - 1]?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Histórico de Sinais */}
            <Card className="p-4 bg-[#131722] border-slate-800">
              <h3 className="text-sm font-semibold mb-3 text-slate-400">SINAIS RECENTES</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {signals.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">Aguardando sinais...</p>
                ) : (
                  signals.slice().reverse().slice(0, 5).map((signal, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded border ${
                        signal.type === 'buy'
                          ? 'bg-emerald-950/30 border-emerald-800/50'
                          : 'bg-red-950/30 border-red-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${signal.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {signal.type === 'buy' ? '▲ COMPRA' : '▼ VENDA'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(signal.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-mono font-semibold">${signal.price.toFixed(2)}</p>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="outline" className={`text-xs ${signal.type === 'buy' ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}`}>
                          {signal.strength}/4
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
