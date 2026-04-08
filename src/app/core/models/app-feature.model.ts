import { BaseDocument } from './base-document.model';

export interface AppFeature extends BaseDocument {
  key: string; // e.g., 'pricelists' (Used for code/permissions)
  label: string; // e.g., 'Pricelists' (Used for the UI)
  description?: string; // Optional: To explain what the feature does
  isActive: boolean; // Allows you to disable a feature system-wide
  order?: number; // Optional: To sort them nicely in the UI
  icon?: string; // Optional: Material icon name for UI display
}
