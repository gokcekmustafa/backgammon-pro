export default function ChatPanel() {
  return (
    <div className="flex h-full flex-col rounded-lg border border-stone-800 bg-stone-900/50">
      <div className="border-b border-stone-800 px-4 py-3">
        <p className="text-sm font-semibold text-stone-200">Chat</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-center text-xs text-stone-600">No messages yet</p>
      </div>
      <div className="border-t border-stone-800 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
            disabled
          />
          <button
            disabled
            className="shrink-0 rounded-lg bg-stone-800 px-3 py-2 text-xs font-medium text-stone-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
