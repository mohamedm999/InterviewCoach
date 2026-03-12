export interface Goal {
  id: string;
  targetScore: number;
  category?: string;
  deadline?: string | null;
  isCompleted: boolean;
  createdAt: string;
}

export interface CreateGoalData {
  targetScore: number;
  category?: string;
  deadline?: string;
}

export interface UpdateGoalData {
  targetScore?: number;
  category?: string;
  deadline?: string;
  isCompleted?: boolean;
}
