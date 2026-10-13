"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { Circle } from "@/lib/contracts";
import { Avatar } from "./Avatar";
import { EmptyState } from "./ui/EmptyState";
import { shortAddr } from "@/lib/format";
import { getMessages, isSupabaseConfigured, sendMessage } from "@/lib/supabase";
import { useWalletSession } from "@/lib/useWalletSession";

export function CircleChat({
  circle,
  names,
}: {
  circle: Circle;
  names: Record<string, string>;
}) {
  const { address } = useAccount();
  const {
    isAuthenticated,
    isChecking,
    isSigningIn,
    error: sessionError,
    signIn,
  } = useWalletSession();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const isMember =
    !!address &&
    circle.members.some(
      (member) => member.toLowerCase() === address.toLowerCase(),
    );
  const queryClient = useQueryClient();
  const {
    data: messages = [],
    isLoading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: [
      "circle-messages",
      circle.address.toLowerCase(),
      address?.toLowerCase(),
    ],
    queryFn: () => getMessages(circle.address),
    // Do not request or retain a Circle's discussion for a visitor who is not
    // a member. The locked state below deliberately contains no message data.
    enabled: isSupabaseConfigured && isMember && isAuthenticated,
    refetchInterval: isMember && isAuthenticated ? 5_000 : false,
  });

  useEffect(() => {
    if (!isMember || !isAuthenticated) {
      queryClient.removeQueries({
        queryKey: [
          "circle-messages",
          circle.address.toLowerCase(),
          address?.toLowerCase(),
        ],
      });
      setBody("");
    }
  }, [address, circle.address, isMember, isAuthenticated, queryClient]);

  const latestId = messages[0]?.id;
  useEffect(() => {
    if (follow.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [latestId, isAuthenticated]);

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!address || !body.trim() || sending || !isAuthenticated) return;
    setSending(true);
    setError("");
    try {
      await sendMessage(circle.address, address, body);
      setBody("");
      follow.current = true;
      await queryClient.invalidateQueries({
        queryKey: [
          "circle-messages",
          circle.address.toLowerCase(),
          address?.toLowerCase(),
        ],
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn’t send message.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      aria-label="Circle conversation"
      className="flex h-[min(680px,76dvh)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-panel"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">
            The conversation
          </h2>
          <p className="mt-1 text-xs text-muted">
            A private space for your Circle.
          </p>
        </div>
        <span className="rounded-full bg-panel-hi px-3 py-1.5 text-xs text-muted">
          {circle.members.length} members
        </span>
      </div>
      {!isSupabaseConfigured ? (
        <div className="m-5">
          <EmptyState title="Chat is temporarily unavailable">
            Please check back shortly.
          </EmptyState>
        </div>
      ) : !isMember ? (
        <div className="m-auto p-6">
          <EmptyState title="This conversation is for members">
            Ask a member for an invitation, then join to read and reply.
          </EmptyState>
        </div>
      ) : !isAuthenticated ? (
        <div className="m-auto p-6">
          <EmptyState
            title="Return to your conversation"
            action={
              <button
                onClick={() => void signIn().catch(() => undefined)}
                disabled={isChecking || isSigningIn}
                className="primary-button"
              >
                {isChecking
                  ? "Checking your sign-in…"
                  : isSigningIn
                    ? "Confirm your account…"
                    : "Continue to chat"}
              </button>
            }
          >
            Confirm your account to finish signing in. This costs no gas.
          </EmptyState>
          {sessionError && (
            <p role="alert" className="mt-3 text-sm text-forfeit">
              {sessionError}
            </p>
          )}
        </div>
      ) : (
        <>
          <div
            ref={scroll}
            onScroll={() => {
              if (scroll.current)
                follow.current =
                  scroll.current.scrollHeight -
                    scroll.current.scrollTop -
                    scroll.current.clientHeight <
                  80;
            }}
            className="chat-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5"
          >
            {loadError ? (
              <EmptyState
                title="Couldn’t load the conversation"
                action={
                  <button
                    onClick={() => void refetch()}
                    className="secondary-button"
                  >
                    Try again
                  </button>
                }
              >
                Please retry. Your unsent message is still below.
              </EmptyState>
            ) : isLoading ? (
              <div aria-label="Loading messages" className="space-y-5">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`h-14 w-2/3 animate-pulse rounded-2xl bg-panel-hi ${n === 2 ? "ml-auto" : ""}`}
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-xs text-center">
                  <span aria-hidden="true" className="text-4xl text-gold">
                    ☏
                  </span>
                  <h3 className="font-display mt-4 text-xl font-semibold">
                    Every Circle starts with hello.
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    Share what you’re working on, ask for a little
                    encouragement, or welcome your friends.
                  </p>
                </div>
              </div>
            ) : (
              [...messages].reverse().map((message, index, ordered) => {
                const own =
                  message.sender_address.toLowerCase() ===
                  address?.toLowerCase();
                const date = new Date(message.created_at);
                const newDay =
                  index === 0 ||
                  date.toDateString() !==
                    new Date(ordered[index - 1].created_at).toDateString();
                const name =
                  names[message.sender_address.toLowerCase()] ||
                  shortAddr(message.sender_address);
                return (
                  <div key={message.id}>
                    {newDay && (
                      <p className="my-5 text-center text-[11px] text-faint">
                        {date.toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                    <div
                      className={`mb-4 flex items-end gap-2.5 ${own ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar
                        addr={message.sender_address as `0x${string}`}
                        size={28}
                      />
                      <div className="min-w-0 max-w-[80%]">
                        <p
                          className={`mb-1.5 text-xs text-muted ${own ? "text-right" : ""}`}
                        >
                          {own ? "You" : name}
                        </p>
                        <p
                          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere] ${own ? "rounded-br-sm bg-gold/15 text-bone" : "rounded-bl-sm bg-panel-hi text-bone"}`}
                        >
                          {message.body}
                        </p>
                        <time
                          dateTime={message.created_at}
                          className={`mt-1 block text-[10px] text-faint ${own ? "text-right" : ""}`}
                        >
                          {date.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={submit} className="shrink-0 border-t border-line p-4">
            <div className="flex items-end gap-2">
              <textarea
                aria-label="Message your Circle"
                maxLength={500}
                rows={2}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder="A check-in, a question, a little encouragement…"
                className="product-field min-w-0 flex-1 resize-none"
              />
              <button
                disabled={sending || !body.trim()}
                className="primary-button mb-0.5"
                aria-label="Send message"
              >
                {sending ? "Sending…" : "Send ↑"}
              </button>
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-faint">
              <span>Enter to send · Shift + Enter for a new line</span>
              <span>{body.length}/500</span>
            </div>
            {error && (
              <p role="alert" className="mt-2 text-sm text-forfeit">
                {error}
              </p>
            )}
          </form>
        </>
      )}
    </section>
  );
}
