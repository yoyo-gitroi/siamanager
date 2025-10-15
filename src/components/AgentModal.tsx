import { useState } from "react";
import { Agent, AgentInputField } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface AgentModalProps {
  agent: Agent;
  open: boolean;
  onClose: () => void;
  onSubmit: (inputData: Record<string, any>) => void;
}

const AgentModal = ({ agent, open, onClose, onSubmit }: AgentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
      setFormData({});
    }
  };

  const renderField = (field: AgentInputField) => {
    const value = formData[field.name] ?? field.default;

    switch (field.type) {
      case "text":
        return (
          <Input
            value={value || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: Number(e.target.value) })}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            required={field.required}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            rows={4}
            required={field.required}
          />
        );

      case "slider":
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{field.min}</span>
              <span className="font-medium">{value || field.default}</span>
              <span>{field.max}</span>
            </div>
            <Slider
              value={[value || field.default]}
              onValueChange={([v]) => setFormData({ ...formData, [field.name]: v })}
              min={field.min}
              max={field.max}
              step={1}
            />
          </div>
        );

      case "dropdown":
        return (
          <Select
            value={value || field.default}
            onValueChange={(v) => setFormData({ ...formData, [field.name]: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="space-y-3">
            {field.options?.map((option) => {
              const checked = (value || []).includes(option);
              return (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.name}-${option}`}
                    checked={checked}
                    onCheckedChange={(isChecked) => {
                      const current = value || [];
                      const updated = isChecked
                        ? [...current, option]
                        : current.filter((v: string) => v !== option);
                      setFormData({ ...formData, [field.name]: updated });
                    }}
                  />
                  <label
                    htmlFor={`${field.name}-${option}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {option}
                  </label>
                </div>
              );
            })}
          </div>
        );

      case "datetime":
        return (
          <Input
            type="datetime-local"
            value={value || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );

      case "daterange":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              placeholder="Start date"
              value={value?.start || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [field.name]: { ...value, start: e.target.value },
                })
              }
            />
            <Input
              type="date"
              placeholder="End date"
              value={value?.end || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [field.name]: { ...value, end: e.target.value },
                })
              }
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Configure {agent.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {agent.inputSchema.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-danger ml-1">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgentModal;
