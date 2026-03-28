"use client";

import * as React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  onChange?: (date?: Date) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ date, onChange, placeholder = "日付を選択", className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draftDate, setDraftDate] = React.useState<Date | undefined>(date);
  const displayDate = open ? draftDate : date;

  React.useEffect(() => {
    if (!open) {
      setDraftDate(date);
    }
  }, [date, open]);

  const handleApply = () => {
    onChange?.(draftDate);
    setOpen(false);
  };

  const handleClear = () => {
    setDraftDate(undefined);
    onChange?.(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-bold rounded-xl h-11 border-none bg-background/50 focus:ring-2 focus:ring-primary/20 transition-all hover:bg-background/80",
            !displayDate && "text-muted-foreground font-medium",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
          {displayDate ? format(displayDate, "PPP", { locale: ja }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
        <Calendar
          mode="single"
          selected={draftDate}
          onSelect={setDraftDate}
          initialFocus
          locale={ja}
          className="rounded-2xl"
        />
        <div className="flex items-center justify-end gap-2 border-t border-border/40 p-2">
          <Button type="button" size="sm" variant="ghost" onClick={handleClear}>クリア</Button>
          <Button type="button" size="sm" onClick={handleApply}>完了</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
