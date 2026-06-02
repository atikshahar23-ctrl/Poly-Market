import { useGetPolymarketMarkets, getGetPolymarketMarketsQueryKey, GetPolymarketMarketsAsset } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function Markets() {
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState<GetPolymarketMarketsAsset>("ALL");
  
  const { data: markets, isLoading } = useGetPolymarketMarkets({ asset: assetFilter, search }, {
    query: {
      queryKey: getGetPolymarketMarketsQueryKey({ asset: assetFilter, search }),
      refetchInterval: 60000,
    }
  });

  const getAssetBadgeColor = (tag: string) => {
    switch (tag) {
      case 'BTC': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'ETH': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'SOL': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'BNB': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Polymarket Contracts</h1>
        <p className="text-muted-foreground mt-1">All active prediction markets across tracked assets.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={assetFilter} onValueChange={(v) => setAssetFilter(v as GetPolymarketMarketsAsset)}>
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="ALL">ALL</TabsTrigger>
            <TabsTrigger value="BTC">BTC</TabsTrigger>
            <TabsTrigger value="ETH">ETH</TabsTrigger>
            <TabsTrigger value="SOL">SOL</TabsTrigger>
            <TabsTrigger value="BNB">BNB</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Markets Directory</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search contracts..."
              className="pl-9 bg-secondary/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="font-mono text-xs w-20">ASSET</TableHead>
                  <TableHead className="font-mono text-xs">QUESTION</TableHead>
                  <TableHead className="text-right font-mono text-xs">YES PRICE</TableHead>
                  <TableHead className="text-right font-mono text-xs">NO PRICE</TableHead>
                  <TableHead className="text-right font-mono text-xs">PROBABILITY</TableHead>
                  <TableHead className="text-right font-mono text-xs">VOLUME</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : !markets || markets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No markets match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  markets.map((m, i) => (
                    <TableRow key={m.conditionId || `market-${i}`} className="hover:bg-secondary/20">
                      <TableCell>
                        <Badge variant="outline" className={`font-mono text-[10px] ${getAssetBadgeColor(m.assetTag)}`}>
                          {m.assetTag}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{m.question}</TableCell>
                      <TableCell className="text-right font-mono">${m.yesPrice.toFixed(3)}</TableCell>
                      <TableCell className="text-right font-mono">${m.noPrice.toFixed(3)}</TableCell>
                      <TableCell className="text-right font-mono text-primary">{m.yesProbabilityPercent.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {m.volume ? `$${m.volume.toLocaleString()}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}