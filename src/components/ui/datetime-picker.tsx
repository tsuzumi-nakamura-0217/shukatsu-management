"use client";

import * as React from "react";
import { format, setHours, setMinutes } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DateTimePickerProps {
  date?: Date;
  onChange?: (date?: Date) => void;
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({ date, onChange, placeholder = "日時を選択", className }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);

  React.useEffect(() => {
    setSelectedDate(date);
  }, [date]);

  const handleDateSelect = (d: Date | undefined) => {
    if (!d) {
      setSelectedDate(undefined);
      onChange?.(undefined);
      return;
    }

    const newDate = selectedDate ? 
      setMinutes(setHours(d, selectedDate.getHours()), selectedDate.getMinutes()) : 
      setHours(setMinutes(d, 0), 9); // Default to 9:00 AM if no time set

    setSelectedDate(newDate);
    onChange?.(newDate);
  };

  const handleTimeChange = (type: "hour" | "minute", value: number) => {
    if (!selectedDate) return;
    const newDate = type === "hour" ? setHours(selectedDate, value) : setMinutes(selectedDate, value);
    setSelectedDate(newDate);
    onChange?.(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-bold rounded-xl h-11 border-none bg-background/50 focus:ring-2 focus:ring-primary/20 transition-all hover:bg-background/80",
            !selectedDate && "text-muted-foreground font-medium",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
          {selectedDate ? format(selectedDate, "yyyy/MM/dd HH:mm", { locale: ja }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl flex" align="start">
        <div className="p-1">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            locale={ja}
            className="rounded-2xl"
          />
        </div>
        <div className="flex flex-col border-l border-white/10 p-2 gap-2 bg-muted/30">
          <div className="flex items-center gap-1.5 px-2 py-1 mb-1 border-b border-border/50">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Time</span>
          </div>
          <div className="flex h-[280px] gap-1">
            <ScrollArea className="w-12 h-full rounded-md bg-background/50">
              <div className="flex flex-col p-1 gap-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <Button
                    key={i}
                    variant={selectedDate?.getHours() === i ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-full p-0 text-xs font-bold"
                    onClick={() => handleTimeChange("hour", i)}
                  >
                    {i.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            <ScrollArea className="w-12 h-full rounded-md bg-background/50">
              <div className="flex flex-col p-1 gap-1">
                {Array.from({ length: 12 }).map((_, i) => {
                   const minute = i * 5;
                   return (
                    <Button
                      key={minute}
                      variant={selectedDate?.getMinutes() === minute ? "default" : "ghost"}
                      size="sm"
                      className="h-8 w-full p-0 text-xs font-bold"
                      onClick={() => handleTimeChange("minute", minute)}
                    >
                      {minute.toString().padStart(2, "0")}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
