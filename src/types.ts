export interface StudyType {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface StudyLog {
  id: number;
  study_type_id: number;
  minutes: number;
  date: string;
  type_name: string;
  color: string;
}

export interface WeeklyData {
  date: string;
  dayName: string;
  totalMinutes: number;
  [key: string]: any; // For dynamic study type keys
}
