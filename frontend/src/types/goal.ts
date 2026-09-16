export interface GoalContribution {
  id: number;
  goal: number;
  user: number;
  amount: string;
  contribution_date: string;
  notes: string;
}

export interface FinancialGoal {
  id: number;
  name: string;
  description: string;
  goal_type: "INDIVIDUAL" | "SHARED";
  participants: number[];
  target_amount: string;
  deadline: string | null;
  contributions: GoalContribution[];
  current_amount: number;
  progress_percentage: number;
  created_at: string;
}
