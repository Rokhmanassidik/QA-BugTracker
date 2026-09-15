export type UserRole = "PM" | "DEV" | "QA";

export const USER_ROLES: UserRole[] = ["PM", "DEV", "QA"];

export type BugPriority = "Low" | "Medium" | "High" | "Critical";
export const BUG_PRIORITIES: BugPriority[] = ["Low", "Medium", "High", "Critical"];

export type BugSeverity = "Minor" | "Major" | "Critical" | "Blocker";
export const BUG_SEVERITIES: BugSeverity[] = ["Minor", "Major", "Critical", "Blocker"];

export type BugStatus = "Open" | "In Progress" | "Resolved" | "Closed" | "Reopened";
export const BUG_STATUSES: BugStatus[] = [
  "Open",
  "In Progress",
  "Resolved",
  "Closed",
  "Reopened",
];

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  role: UserRole;
  created_at: string;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  priority: BugPriority;
  severity: BugSeverity;
  steps_to_reproduce: string | null;
  actual_result: string | null;
  expected_result: string | null;
  status: BugStatus;
  reporter_id: string | null;
  assignee_id: string | null;
  ai_generated: boolean;
  original_report: string | null;
  created_at: string;
  updated_at: string;
}

export interface BugWithRelations extends Bug {
  reporter: Profile | null;
  assignee: Profile | null;
  evidence: BugEvidence[];
}

export type EvidenceFileType = "image" | "video";

export interface BugEvidence {
  id: string;
  bug_id: string;
  file_path: string;
  file_type: EvidenceFileType;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface BugComment {
  id: string;
  bug_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
}

export type NotificationType = "assigned" | "status_change" | "new_comment";

export interface AppNotification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  bug_id: string;
  type: NotificationType;
  message: string;
  read_at: string | null;
  created_at: string;
}
