export interface LinkedInData {
  date: string;
  impressions: number;
  engagements: number;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
  publishDate: string;
  views: number;
  watchTimeHours: number;
  subscribers: number;
  impressions: number;
  ctr: number;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  agentKey: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  inputData: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  executionTimeMs?: number;
}

export interface Agent {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: 'idle' | 'running' | 'failed';
  lastRun?: Date;
  webhookUrl?: string;
  inputSchema: AgentInputField[];
}

export interface AgentInputField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'slider' | 'dropdown' | 'checkbox' | 'textarea' | 'datetime' | 'daterange';
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  default?: any;
  placeholder?: string;
  maxLength?: number;
}

export interface WebhookPayload {
  userId: string;
  agentId: string;
  agentKey: string;
  executionId: string;
  timestamp: string;
  input: Record<string, any>;
}
