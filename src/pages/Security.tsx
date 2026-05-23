import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

interface Finding {
  id: string;
  category: string;
  title: string;
  severity: "pass" | "warn" | "fail";
  detail: string;
}
interface Scan {
  id: string;
  created_at: string;
  pass_count: number;
  warn_count: number;
  fail_count: number;
  duration_ms: number | null;
  findings: Finding[];
}

const ADMIN_EMAIL = "ianwmurphy@gmail.com";

export default function Security() {
  const { user, loading: authLoading } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const loadScans = async () => {
    const { data, error } = await supabase
      .from("security_scans" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error("Could not load scans");
    } else {
      setScans((data as unknown as Scan[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadScans();
    else setLoading(false);
  }, [isAdmin]);

  const runScan = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("run-security-scan");
      if (error) throw error;
      toast.success("Scan completed");
      await loadScans();
    } catch (e: any) {
      toast.error(e.message ?? "Scan failed");
    } finally {
      setRunning(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="container max-w-5xl py-8">Loading…</div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <SEO title="Security — LoveToDate" description="Admin only" path="/security" />
        <div className="container max-w-md py-16 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <h1 className="font-serif text-2xl mb-2">Restricted</h1>
          <p className="text-muted-foreground">This page is for the site administrator only.</p>
        </div>
      </AppLayout>
    );
  }

  const latest = scans[0];
  const chartData = [...scans].reverse().map((s) => ({
    date: new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    pass: s.pass_count,
    warn: s.warn_count,
    fail: s.fail_count,
  }));

  return (
    <AppLayout>
      <SEO title="Security Findings — LoveToDate" description="Security scan history and findings" path="/security" />
      <div className="container max-w-5xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-gold flex items-center gap-2">
              <Shield className="h-7 w-7" /> Security Findings
            </h1>
            <p className="text-muted-foreground text-sm">In-app scanner — admin only.</p>
          </div>
          <Button onClick={runScan} disabled={running} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Scanning…" : "Run scan"}
          </Button>
        </div>

        {latest && (
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Pass" value={latest.pass_count} />
            <SummaryCard icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />} label="Warn" value={latest.warn_count} />
            <SummaryCard icon={<XCircle className="h-5 w-5 text-red-600" />} label="Fail" value={latest.fail_count} />
          </div>
        )}

        {chartData.length > 1 && (
          <Card className="p-4">
            <h2 className="font-serif text-lg mb-3">Trend</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <RTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pass" stroke="#16a34a" />
                  <Line type="monotone" dataKey="warn" stroke="#ca8a04" />
                  <Line type="monotone" dataKey="fail" stroke="#dc2626" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Tabs defaultValue="latest">
          <TabsList>
            <TabsTrigger value="latest">Latest findings</TabsTrigger>
            <TabsTrigger value="history">History ({scans.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="latest" className="space-y-2 mt-4">
            {!latest ? (
              <Card className="p-6 text-center text-muted-foreground">
                No scans yet — click "Run scan" to start.
              </Card>
            ) : (
              latest.findings.map((f) => <FindingRow key={f.id} finding={f} />)
            )}
          </TabsContent>
          <TabsContent value="history" className="space-y-2 mt-4">
            {scans.map((s) => (
              <Card key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{new Date(s.created_at).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.duration_ms}ms · {s.findings.length} findings
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-green-600 text-green-700">{s.pass_count} pass</Badge>
                  <Badge variant="outline" className="border-yellow-600 text-yellow-700">{s.warn_count} warn</Badge>
                  <Badge variant="outline" className="border-red-600 text-red-700">{s.fail_count} fail</Badge>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      {icon}
      <div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const sev = finding.severity;
  const sevColor =
    sev === "pass" ? "border-green-600 text-green-700" :
    sev === "warn" ? "border-yellow-600 text-yellow-700" :
    "border-red-600 text-red-700";
  const Icon = sev === "pass" ? CheckCircle2 : sev === "warn" ? AlertTriangle : XCircle;
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 ${sev === "pass" ? "text-green-600" : sev === "warn" ? "text-yellow-600" : "text-red-600"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{finding.title}</span>
            <Badge variant="outline" className={sevColor}>{sev}</Badge>
            <Badge variant="secondary" className="text-xs">{finding.category}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 break-words">{finding.detail}</p>
        </div>
      </div>
    </Card>
  );
}
