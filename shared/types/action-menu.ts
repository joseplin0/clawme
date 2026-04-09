export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: string;
  description?: string;
  color?: "error" | "info" | "neutral" | "primary" | "secondary" | "success" | "warning";
  disabled?: boolean;
  hidden?: boolean;
  onSelect: () => void | Promise<void>;
}
