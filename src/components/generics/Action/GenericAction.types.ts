export interface GenericActions {
  name?: string;
  mandatoryFields?: string[];
  mode?: "primary" | "secondary" | "tertiary" | "integrated";
  cssContainer?: "left" | "right" | "full";
  cssButton?: string;
  permissions?: string[];
  /** Name of the callback function registered in GenericFormContext.actionCallbacks */
  onAction?: string;
  /** Field names that must all have non-empty values in the form for this action to be shown */

  /** Optional dependencies to determine if the action should be enabled or visible */
  dependency?: {
    shouldDisableSection?: boolean;
    showAction?: {
      permissions?: string[]; // Required permissions for the action
      roles?: string[]; // Required roles for the action
      statuses?: string[]; // Required statuses for the action
      modes?: ("view" | "edit" | "create")[]; // Required modes for the action
      nonEmpty?: string[];
      method?: string; // Optional custom method to determine action visibility based on form values
    };
    enableAction?: {
      permissions?: string[]; // Required permissions for the action
      roles?: string[]; // Required roles for the action
      statuses?: string[]; // Required statuses for the action
      modes?: ("view" | "edit" | "create")[];
      nonEmpty?: string[];
      method?: string;
    };
  };
}
