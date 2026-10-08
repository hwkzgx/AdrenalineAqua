import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Send, UserRound } from "lucide-react";

export default function Chat({
  orderId,
  currentUserId,
  otherUserId,
  otherUserName = "User",
  otherUserRole = "",
  onClose,
  messageType = "delivery"
}) {

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // LOAD MESSAGES
 const loadMessages = async () => {
  let query = supabase
    .from("messages")
    .select("*")
    .eq("message_type", messageType);

  if (messageType === "delivery") {
    query = query.eq("order_id", orderId);
  } else {
    query = query.or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
    );
  }

  const { data, error } = await query.order("created_at", {
    ascending: true
  });

  if (error) {
    console.error("Load messages error:", error);
    return;
  }

  setMessages(data || []);
};
  // SEND MESSAGE
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

  const { error } = await supabase
  .from("messages")
  .insert([
    {
      order_id: messageType === "delivery" ? orderId : null,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      message: newMessage.trim(),
      is_read: false,
      message_type: messageType
    }
  ]);

    if (error) {
      console.error("Send message error:", error);
      return;
    }

    setNewMessage("");
    loadMessages();
  };

  // LOAD MESSAGES WHEN CHAT OPENS
 useEffect(() => {
  if (messageType === "delivery" && !orderId) return;
  if (!currentUserId || !otherUserId) return;

  loadMessages();

  const channel = supabase
    .channel(`messages-${messageType}-${currentUserId}-${otherUserId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages"
      },
      (payload) => {
        const newMessage = payload.new;

        const isSameType =
          newMessage.message_type === messageType;

        if (!isSameType) return;

        let belongsToThisChat = false;

        if (messageType === "delivery") {
          belongsToThisChat =
            String(newMessage.order_id) === String(orderId);
        } else {
          const sender = String(newMessage.sender_id);
          const receiver = String(newMessage.receiver_id);
          const me = String(currentUserId);
          const other = String(otherUserId);

          belongsToThisChat =
            (sender === me && receiver === other) ||
            (sender === other && receiver === me);
        }

        if (!belongsToThisChat) return;

        setMessages((prev) => {
          const exists = prev.some(
            (msg) =>
              msg.messages_id === newMessage.messages_id
          );

          if (exists) return prev;

          return [...prev, newMessage];
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [
  orderId,
  currentUserId,
  otherUserId,
  messageType
]);



  // AUTO SCROLL TO NEWEST MESSAGE
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  // FORMAT MESSAGE TIME
  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff"
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          paddingBottom: "14px",
          borderBottom: "1px solid #e5e7eb"
        }}
      >
        {/* AVATAR */}
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "#dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#1e40af",
            flexShrink: 0
          }}
        >
          <UserRound size={22} />
        </div>

        {/* NAME + ROLE */}
        <div
          style={{
            marginLeft: "10px"
          }}
        >
          <div
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#111827"
            }}
          >
            {otherUserName}
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#64748b"
            }}
          >
{otherUserRole}
          </div>
        </div>

        {/* CLOSE BUTTON - FAR RIGHT */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: "auto",
              width: "36px",
              height: "36px",
              transform: "translateY(-8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              fontSize: "20px",
              lineHeight: 1,
              cursor: "pointer",
              color: "#64748b",
              padding: 0,
              flexShrink: 0
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* MESSAGE AREA */}
      <div
        style={{
          height: "320px",
          overflowY: "auto",
          padding: "16px 6px",
          background: "#f8fafc"
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: "13px",
              textAlign: "center"
            }}
          >
            <div>
              No messages yet.
              <br />
              Start a conversation.
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine =
              String(msg.sender_id) === String(currentUserId);

            return (
              <div
                key={msg.messages_id}
                style={{
                  display: "flex",
                  justifyContent: isMine
                    ? "flex-end"
                    : "flex-start",
                  marginBottom: "10px"
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "9px 12px",
                    borderRadius: isMine
                      ? "14px 14px 4px 14px"
                      : "14px 14px 14px 4px",
                    background: isMine
                      ? "#1e40af"
                      : "#ffffff",
                    color: isMine
                      ? "#ffffff"
                      : "#111827",
                    border: isMine
                      ? "none"
                      : "1px solid #e5e7eb",
                    boxShadow:
                      "0 1px 2px rgba(0,0,0,0.04)",
                    wordBreak: "break-word"
                  }}
                >
                  {/* MESSAGE TEXT */}
                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: "1.4"
                    }}
                  >
                    {msg.message}
                  </div>

                  {/* TIME */}
                  <div
                    style={{
                      fontSize: "10px",
                      marginTop: "4px",
                      textAlign: "right",
                      color: isMine
                        ? "#bfdbfe"
                        : "#94a3b8"
                    }}
                  >
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* MESSAGE INPUT */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          paddingTop: "12px",
          borderTop: "1px solid #e5e7eb"
        }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) =>
            setNewMessage(e.target.value)
          }
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "11px 14px",
            border: "1px solid #cbd5e1",
            borderRadius: "999px",
            outline: "none",
            background: "#ffffff",
            color: "#111827",
            fontSize: "14px"
          }}
        />

        {/* SEND BUTTON */}
        <button
          type="button"
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            border: "none",
            background: newMessage.trim()
              ? "#1e40af"
              : "#cbd5e1",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: newMessage.trim()
              ? "pointer"
              : "not-allowed",
            flexShrink: 0
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}