import { useGetBinanceMulti, getGetBinanceMultiQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function Binance() {
  const { data: binanceAssets, isLoading } = useGetBinanceMulti({
    query: {
      queryKey: getGetBinanceMultiQueryKey(),
      refetchInterval: 10000,
    }
  });

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Binance Futures</h1>
        <p className="text-muted-foreground mt-1">Live perpetual contract data across major assets.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {binanceAssets?.map((asset) => (
            <Card key={asset.symbol} className="border-border bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{asset.asset}</span>
                  <span className="text-xs font-mono text-muted-foreground">{asset.symbol}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div>
                  <div className="text-sm text-muted-foreground font-mono mb-1">MARK PRICE</div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    ${asset.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-mono mb-1">FUNDING RATE</div>
                  <div className={`text-xl font-bold font-mono flex items-center gap-1 ${asset.fundingRatePercent > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {asset.fundingRatePercent > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {asset.fundingRatePercent.toFixed(4)}%
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {asset.fundingRatePercent > 0 ? 'Bullish (Longs pay)' : 'Bearish (Shorts pay)'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Arbitrage Mechanism Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            This dashboard identifies divergences between binary options (Polymarket) and linear perpetual futures (Binance). When Polymarket probability diverges significantly from implied probability derived from Binance's mark price and funding rate, an arbitrage or sentiment signal is generated.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <h4 className="font-bold text-emerald-500 mb-2 font-mono">UNDERPRICED SIGNAL</h4>
              <p>Occurs when Polymarket crowd assigns a significantly lower probability to a price target than current market trajectory implies. Opportunity to go long on YES shares.</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <h4 className="font-bold text-amber-500 mb-2 font-mono">OVERBOUGHT SIGNAL</h4>
              <p>Occurs when Polymarket crowd assigns an excessively high probability driven by hype, ignoring actual futures resistance. Opportunity to go long on NO shares.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}