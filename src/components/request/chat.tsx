"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { type ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Conversation for one request. Polls while the tab is visible; cheap and reliable on mobile data. */
export function Chat({
  requestId,
  canSend,
  otherName,
}: {
  requestId: string;
  canSend: boolean;
  otherName: string;
}) {
  const toast = useToast();
  const client = useQueryClient();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const key = ["requests", requestId, "messages"];

  const messages = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api<{ messages: ChatMessage[] }>(`/requests/${requestId}/messages`)).messages,
    refetchInterval: canSend ? 6000 : false,
    refetchIntervalInBackground: false,
  });

  const send = useMutation({
    mutationFn: (body: string) =>
      api<ChatMessage>(`/requests/${requestId}/messages`, { method: "POST", body: { body } }),
    onSuccess: (message) => {
      client.setQueryData<ChatMessage[]>(key, (old) => [...(old ?? []), message]);
      setText("");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const count = messages.data?.length ?? 0;
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [count]);

  const submit = () => {
    const body = text.trim();
    if (body && !send.isPending) send.mutate(body);
  };

  return (
    <div className="flex flex-col">
      <div
        ref={listRef}
        className="max-h-96 min-h-40 space-y-2 overflow-y-auto rounded-xl bg-muted/50 p-3"
        role="log"
        aria-live="polite"
        aria-label={`Messages with ${otherName}`}
      >
        {messages.isPending ? (
          <Spinner className="mx-auto mt-10" />
        ) : count === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No messages yet.{" "}
            {canSend ? `Ask ${otherName} a question or share details about the job.` : ""}
          </p>
        ) : (
          messages.data?.map((m) => (
            <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-3.5 py-2 text-sm",
                  m.mine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-card shadow-sm",
                )}
              >
                <p className="break-words whitespace-pre-wrap">{m.body}</p>
                <p
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 text-[10px]",
                    m.mine ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {formatTime(m.createdAt)}
                  {m.mine && m.read && <CheckCheck className="size-3" aria-label="Read" />}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      {canSend ? (
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="sr-only" htmlFor="chat-input">
            Message
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Write a message"
            className="max-h-32 field min-h-11 flex-1 resize-none"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={!text.trim() || send.isPending}
          >
            {send.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          This conversation is closed.
        </p>
      )}
    </div>
  );
}
