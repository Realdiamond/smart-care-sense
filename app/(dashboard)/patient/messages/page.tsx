"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Loader2, WifiOff, Wifi, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";


const supabase = createClient();
// ─── Offline queue (localStorage) ───────────────────────────
const QUEUE_KEY = "hp_msg_queue";

interface QueuedMessage {
  clientId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

function getQueue(): QueuedMessage[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); }
  catch { return []; }
}
function saveQueue(q: QueuedMessage[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}
function enqueue(msg: QueuedMessage) {
  saveQueue([...getQueue(), msg]);
}
function dequeue(clientId: string) {
  saveQueue(getQueue().filter(m => m.clientId !== clientId));
}

// ─── Deterministic conversation ID ──────────────────────────
function conversationId(a: string, b: string) {
  return [a, b].sort().join("_");
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  client_id?: string | null;
  is_read: boolean;
  pending?: boolean; // optimistic
}

interface Doctor { id: string; name: string; specialty: string; }

export default function Messages() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const scrollRef = useRef<HTMLDivElement>(null);
  const convId = doctor ? conversationId(user!.id, doctor.id) : null;

  useEffect(() => { document.title = "Messages — HealthPulse"; }, []);

  // Track online status
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Load assigned doctor
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: assignment } = await supabase
        .from("doctor_patient_assignments")
        .select("doctor_id")
        .eq("patient_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();
        
      if (assignment) {
        const docId = assignment.doctor_id;
        const [profRes, docProfRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", docId).maybeSingle(),
          supabase.from("doctor_profiles").select("specialty").eq("user_id", docId).maybeSingle()
        ]);
        
        setDoctor({
          id: docId,
          name: profRes.data?.full_name ?? "Doctor",
          specialty: docProfRes.data?.specialty ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  // Load message history
  const loadMessages = useCallback(async () => {
    if (!convId) return;
    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (!error) setMessages((data ?? []) as Message[]);
  }, [convId]);

  useEffect(() => { if (convId) loadMessages(); }, [loadMessages, convId]);

  // Real-time subscription
  useEffect(() => {
    if (!convId) return;
    const ch = supabase.channel(`conv-${convId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${convId}` },
        (payload: any) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            // Replace optimistic message if same client_id
            if (newMsg.client_id && prev.some(m => m.client_id === newMsg.client_id)) {
              return prev.map(m => m.client_id === newMsg.client_id ? newMsg : m);
            }
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Sync queued messages when coming back online
  useEffect(() => {
    if (!online || !convId || !user || !doctor) return;
    const pending = getQueue().filter(m => m.conversationId === convId);
    if (pending.length === 0) return;

    (async () => {
      for (const pm of pending) {
        try {
          const { error } = await supabase.from("direct_messages").insert({
            conversation_id: pm.conversationId,
            sender_id:       pm.senderId,
            recipient_id:    pm.recipientId,
            content:         pm.content,
            client_id:       pm.clientId,
          });
          if (!error) dequeue(pm.clientId);
        } catch {}
      }
    })();
  }, [online, convId, user, doctor]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user || !doctor || !convId) return;

    setSending(true);
    setInput("");

    const clientId  = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: Message = {
      id: clientId,
      content: text,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      client_id: clientId,
      is_read: false,
      pending: true,
    };

    setMessages(prev => [...prev, optimistic]);

    if (!online) {
      // Store for later sync
      enqueue({ clientId, conversationId: convId, senderId: user.id, recipientId: doctor.id, content: text, createdAt: optimistic.created_at });
      toast.info("You're offline — message will send when reconnected.");
      setSending(false);
      return;
    }

    try {
      const { error } = await supabase.from("direct_messages").insert({
        conversation_id: convId,
        sender_id:       user.id,
        recipient_id:    doctor.id,
        content:         text,
        client_id:       clientId,
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error("Failed to send message");
      setMessages(prev => prev.filter(m => m.client_id !== clientId));
    }
    setSending(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <span className="text-gradient-primary">Messages</span>
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {online
              ? <Badge className="bg-success/15 text-success border-0 gap-1.5"><Wifi className="h-3 w-3" />Online</Badge>
              : <Badge variant="outline" className="gap-1.5 text-warning border-warning/40"><WifiOff className="h-3 w-3" />Offline — messages queued</Badge>
            }
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !doctor ? (
          <Card className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-card/40 backdrop-blur-xl">
            <Stethoscope className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="font-semibold">No Doctor Assigned</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">Your administrator will assign a doctor to you. Once assigned, you can message them here.</p>
          </Card>
        ) : (
          <Card className="flex-1 flex flex-col overflow-hidden border-border/60 bg-card/40 backdrop-blur-xl">
            {/* Doctor info bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-muted/20">
              <UserAvatar name={doctor.name} role="doctor" size="sm" />
              <div>
                <p className="text-sm font-medium">Dr. {doctor.name}</p>
                <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
              </div>
              <div className="ml-auto">
                <span className="h-2 w-2 rounded-full bg-success inline-block mr-1.5" />
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence initial={false}>
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet. Say hello to Dr. {doctor.name}!</p>
                  </div>
                )}
                {messages.map(m => {
                  const isMine = m.sender_id === user!.id;
                  return (
                    <motion.div key={m.id || m.client_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                      className={cn("flex gap-2", isMine ? "justify-end" : "justify-start")}>
                      {!isMine && <UserAvatar name={doctor.name} role="doctor" size="sm" />}
                      <div className={cn("max-w-[75%] px-4 py-2.5 rounded-2xl text-sm",
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted/60 text-foreground rounded-bl-sm border border-border/40",
                        m.pending && "opacity-60"
                      )}>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <p className={cn("text-[10px]", isMine ? "text-primary-foreground/60" : "text-muted-foreground/60")}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {m.pending && <span className="text-[9px] text-primary-foreground/50">Sending…</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Input */}
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="border-t border-border/60 p-3 bg-background/40">
              <div className="flex items-end gap-2">
                <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                  placeholder={online ? "Message your doctor…" : "Offline — message will sync when reconnected…"}
                  rows={1} className="min-h-[44px] max-h-36 resize-none bg-background/60" />
                <Button type="submit" size="icon" disabled={!input.trim() || sending} className="h-11 w-11 shrink-0 bg-gradient-primary">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                For emergencies, call 911. This chat is not for urgent medical advice.
              </p>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
