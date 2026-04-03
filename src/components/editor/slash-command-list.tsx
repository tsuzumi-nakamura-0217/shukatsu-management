"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useRef,
  useCallback,
} from "react";
import type { SlashCommandItem } from "./slash-command";

interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandList = forwardRef<
  SlashCommandListRef,
  SlashCommandListProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Scroll selected item into view
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const selected = container.children[selectedIndex] as HTMLElement | undefined;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [items, command]
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="slash-command-menu">
        <div className="slash-command-empty">コマンドが見つかりません</div>
      </div>
    );
  }

  return (
    <div className="slash-command-menu" ref={scrollRef}>
      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          className={`slash-command-item ${
            index === selectedIndex ? "is-selected" : ""
          }`}
          onClick={() => selectItem(index)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="slash-command-icon">{item.icon}</span>
          <div className="slash-command-text">
            <span className="slash-command-title">{item.title}</span>
            <span className="slash-command-description">
              {item.description}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
});

SlashCommandList.displayName = "SlashCommandList";
