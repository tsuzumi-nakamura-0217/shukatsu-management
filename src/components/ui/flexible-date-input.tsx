"use client";

import * as React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar as CalendarIcon, CalendarDays, CalendarRange, Clock, Timer } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface FlexibleDateInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function FlexibleDateInput({
  value = "",
  onChange,
  placeholder = "日付や期間を入力・選択...",
  className,
}: FlexibleDateInputProps) {
  const [open, setOpen] = React.useState(false);
  const [singleDate, setSingleDate] = React.useState<Date>();
  const [rangeDate, setRangeDate] = React.useState<DateRange>();
  const [aroundDate, setAroundDate] = React.useState<Date>();
  const [untilDate, setUntilDate] = React.useState<Date>();

  const handleSingleSelect = (date: Date | undefined) => {
    setSingleDate(date);
    if (date) {
      onChange(format(date, "M/d(E)", { locale: ja }));
      setOpen(false);
    }
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setRangeDate(range);
    if (range?.from) {
      if (range.to) {
        onChange(
          `${format(range.from, "M/d(E)", { locale: ja })}〜${format(range.to, "M/d(E)", { locale: ja })}`
        );
      } else {
        onChange(`${format(range.from, "M/d(E)", { locale: ja })}〜`);
      }
    }
  };

  const handleAroundSelect = (date: Date | undefined) => {
    setAroundDate(date);
    if (date) {
      onChange(`${format(date, "M/d(E)", { locale: ja })}ごろ`);
      setOpen(false);
    }
  };

  const handleUntilSelect = (date: Date | undefined) => {
    setUntilDate(date);
    if (date) {
      onChange(`${format(date, "M/d(E)", { locale: ja })}までに`);
      setOpen(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-xl h-9 border border-input bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all shadow-sm text-xs bg-white dark:bg-card"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl border border-input bg-white dark:bg-card hover:bg-muted shadow-sm transition-all"
            aria-label="日付を選択"
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 rounded-2xl border border-border/50 shadow-xl" align="end">
          <Tabs defaultValue="single" className="w-[300px]">
            <TabsList className="w-full grid-cols-4 grid mb-3 h-10 bg-muted/60 rounded-xl p-1 gap-1">
              <TabsTrigger value="single" className="rounded-lg text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm px-1 font-bold">
                <CalendarDays className="h-3 w-3 mr-1" />日
              </TabsTrigger>
              <TabsTrigger value="range" className="rounded-lg text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm px-1 font-bold">
                <CalendarRange className="h-3 w-3 mr-1" />期間
              </TabsTrigger>
              <TabsTrigger value="around" className="rounded-lg text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm px-1 font-bold">
                <Clock className="h-3 w-3 mr-1" />ごろ
              </TabsTrigger>
              <TabsTrigger value="until" className="rounded-lg text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm px-1 font-bold">
                <Timer className="h-3 w-3 mr-1" />までに
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="mt-0">
              <Calendar
                mode="single"
                selected={singleDate}
                onSelect={handleSingleSelect}
                locale={ja}
                className="rounded-xl border bg-card p-2 shadow-sm"
              />
            </TabsContent>
            
            <TabsContent value="range" className="mt-0">
              <Calendar
                mode="range"
                selected={rangeDate}
                onSelect={handleRangeSelect}
                locale={ja}
                className="rounded-xl border bg-card p-2 shadow-sm"
              />
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={() => setOpen(false)} className="h-8 rounded-lg px-4 text-xs font-bold">
                  期間を決定
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="around" className="mt-0">
              <Calendar
                mode="single"
                selected={aroundDate}
                onSelect={handleAroundSelect}
                locale={ja}
                className="rounded-xl border bg-card p-2 shadow-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-2 text-center font-medium">選択した日付に「ごろ」を追加します</p>
            </TabsContent>

            <TabsContent value="until" className="mt-0">
              <Calendar
                mode="single"
                selected={untilDate}
                onSelect={handleUntilSelect}
                locale={ja}
                className="rounded-xl border bg-card p-2 shadow-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-2 text-center font-medium">選択した日付に「までに」を追加します</p>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}
