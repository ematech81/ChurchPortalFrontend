export type FieldType =
  | 'short_text' | 'long_text' | 'phone' | 'email' | 'number'
  | 'dropdown' | 'radio' | 'checkbox' | 'date' | 'yes_no';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

export type EventStatus = 'open' | 'closed' | 'full' | 'scheduled';

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  venue: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
  isOpen: boolean;
  uniquePhone: boolean;
  confirmationMessage: string | null;
  fields: FormField[];
  churchId: string;
  churchName: string | null;
  createdAt: string;
  registrationCount: number;
  status: EventStatus;
  shareUrl: string | null;
}

export interface Registration {
  id: string;
  fullName: string;
  phone: string;
  ticketCode: string;
  answers: Record<string, unknown>;
  createdAt: string;
}

export const FIELD_TYPE_LABELS: Record<FieldType, { label: string; icon: string }> = {
  short_text: { label: 'Short answer', icon: 'text' },
  long_text:  { label: 'Paragraph', icon: 'reorder-three' },
  phone:      { label: 'Phone number', icon: 'call' },
  email:      { label: 'Email', icon: 'mail' },
  number:     { label: 'Number', icon: 'calculator' },
  dropdown:   { label: 'Dropdown', icon: 'chevron-down-circle' },
  radio:      { label: 'Multiple choice (pick one)', icon: 'radio-button-on' },
  checkbox:   { label: 'Checkboxes (pick many)', icon: 'checkbox' },
  date:       { label: 'Date', icon: 'calendar' },
  yes_no:     { label: 'Yes / No', icon: 'swap-horizontal' },
};

export const CHOICE_TYPES: FieldType[] = ['dropdown', 'radio', 'checkbox'];

export const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  open:   { bg: '#DCFCE7', fg: '#166534', label: 'Open' },
  closed: { bg: '#F3F4F6', fg: '#4B5563', label: 'Closed' },
  full:   { bg: '#FEF3C7', fg: '#92400E', label: 'Full' },
};

