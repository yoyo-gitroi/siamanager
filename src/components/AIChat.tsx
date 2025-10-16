import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SetupAssistant } from "./SetupAssistant";

interface Msg { role: "user" | "assistant"; content: string }

const AIChat = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>();
  const { toast } = useToast();

  const send = async () => {
    if (!input.trim()) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: { messages: [...messages, userMsg], threadId },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Chat failed");
      
      // Save thread ID for conversation continuity
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }
      
      const assistant: Msg = { role: "assistant", content: data.message };
      setMessages((prev) => [...prev, assistant]);
    } catch (e: any) {
      toast({ title: "Chat error", description: e.message || "Failed to chat", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <SetupAssistant />
      <Card className="p-6 rounded-2xl shadow-lg border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <MessageSquare className="h-5 w-5" />
        </div>
        <h3 className="font-semibold">AI Insights Assistant</h3>
      </div>

      <div className="h-64 overflow-y-auto rounded-md border p-3 bg-card/50 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ask questions about your data and get actionable insights.</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div className={`inline-block px-3 py-2 rounded-lg ${m.role === "user" ? "bg-primary/10" : "bg-muted"}`}>
                <span className="text-sm whitespace-pre-wrap">{m.content}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about trends, best time to post, cross-platform ideas..." className="min-h-10" />
        <Button onClick={send} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      </Card>
    </div>
  );
};

export default AIChat;
