import { useState, useEffect } from "react";
import { useGetRecommendations, getGetRecommendationsQueryKey, Recommendation } from "@workspace/api-client-react";
import { RefreshCw, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Recommendations() {
  const [countdown, setCountdown] = useState(60);

  const { data: recommendations, isLoading, isFetching } = useGetRecommendations({
    query: {
      queryKey: getGetRecommendationsQueryKey(),
      refetchInterval: 60000,
    }
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isFetching) {
      setCountdown(60);
    } else {
      timer = setInterval(() => {
        setCountdown((c) => Math.max(0, c - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isFetching]);

  const renderActionBadge = (action: Recommendation['action']) => {
    if (action === 'BUY_YES') return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">BUY YES</Badge>;
    if (action === 'BUY_NO') return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">BUY NO</Badge>;
    return <Badge variant="outline" className="text-muted-foreground border-muted">WATCH</Badge>;
  };

  const renderConfidenceBadge = (confidence: Recommendation['confidence']) => {
    if (confidence === 'HIGH') return <Badge className="bg-primary/20 text-primary border-primary/30">HIGH CONFIDENCE</Badge>;
    if (confidence === 'MEDIUM') return <Badge className="bg-secondary text-secondary-foreground border-border">MEDIUM CONFIDENCE</Badge>;
    return <Badge variant="outline" className="opacity-50 text-muted-foreground border-muted">LOW CONFIDENCE</Badge>;
  };

  const renderSignalBadge = (signal: Recommendation['signal']) => {
    if (signal.type === 'overbought_sentiment') {
      return <Badge variant="outline" className="border-amber-500/30 text-amber-500">OVERBOUGHT</Badge>;
    }
    if (signal.type === 'underpriced_probability') {
      return <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">UNDERPRICED</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">NEUTRAL</Badge>;
  };

  const groupRecommendations = () => {
    if (!recommendations) return { HIGH: [], MEDIUM: [], LOW: [] };
    const groups: Record<string, Recommendation[]> = { HIGH: [], MEDIUM: [], LOW: [] };
    recommendations.forEach(r => {
      if (groups[r.confidence]) groups[r.confidence].push(r);
    });
    return groups;
  };

  const grouped = groupRecommendations();

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recommendations</h1>
          <p className="text-muted-foreground mt-1">Top ranked actionable signals across all assets.</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono bg-card px-4 py-2 rounded-md border border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            Refresh in
          </div>
          <span className="text-primary font-bold">{countdown}s</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !recommendations || recommendations.length === 0 ? (
        <Card className="border-border border-dashed bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">No actionable signals</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              No actionable signals detected across all assets at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-12">
          {['HIGH', 'MEDIUM', 'LOW'].map((confidenceLevel) => {
            const list = grouped[confidenceLevel as keyof typeof grouped];
            if (list.length === 0) return null;
            return (
              <div key={confidenceLevel} className="space-y-4">
                <h3 className={`text-sm font-bold tracking-widest uppercase border-b border-border pb-2 ${confidenceLevel === 'HIGH' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {confidenceLevel} CONFIDENCE
                </h3>
                <div className="space-y-4">
                  {list.map((rec) => (
                    <Card key={rec.rank} className={`border-border ${confidenceLevel === 'HIGH' ? 'bg-primary/5 border-primary/20' : 'bg-card/50'}`}>
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-none flex flex-col items-center justify-center p-4 bg-background/50 rounded-lg border border-border min-w-[100px]">
                            <span className="text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider mb-1">Rank</span>
                            <span className="text-4xl font-bold font-mono tracking-tighter">#{rec.rank}</span>
                          </div>
                          
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {renderActionBadge(rec.action)}
                              {renderConfidenceBadge(rec.confidence)}
                              {renderSignalBadge(rec.signal)}
                              <Badge variant="outline" className="font-mono bg-background">{rec.market.assetTag}</Badge>
                            </div>
                            
                            <h4 className="text-lg font-medium leading-tight">{rec.market.question}</h4>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-background/50 border border-border">
                              <div>
                                <span className="block text-xs text-muted-foreground font-mono mb-1">SYMBOL</span>
                                <span className="font-mono font-medium">{rec.binanceSymbol}</span>
                              </div>
                              <div>
                                <span className="block text-xs text-muted-foreground font-mono mb-1">MARK PRICE</span>
                                <span className="font-mono font-medium">${rec.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div>
                                <span className="block text-xs text-muted-foreground font-mono mb-1">TARGET PRICE</span>
                                <span className="font-mono font-medium">{rec.market.targetPrice ? `$${rec.market.targetPrice.toLocaleString()}` : '-'}</span>
                              </div>
                              <div>
                                <span className="block text-xs text-muted-foreground font-mono mb-1">DISTANCE</span>
                                <span className={`font-mono font-medium ${rec.distanceToTargetPercent > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {rec.distanceToTargetPercent > 0 ? '+' : ''}{rec.distanceToTargetPercent.toFixed(2)}%
                                </span>
                              </div>
                            </div>

                            <div className="text-sm text-muted-foreground leading-relaxed p-4 rounded-lg border-l-2 border-primary/50 bg-primary/5">
                              {rec.rationale}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}