import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export interface DateRange { from: Date; to: Date }

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(value.from, "MMM dd")} – {format(value.to, "MMM dd, yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2 w-auto">
        <div className="p-2">
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={(range: any) => {
              if (range?.from && range?.to) onChange({ from: range.from, to: range.to });
            }}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
