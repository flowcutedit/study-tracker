import { StudyType, StudyLog } from "../types";

export const fetchStudyTypes = async (): Promise<StudyType[]> => {
  const res = await fetch("/api/study-types");
  if (!res.ok) throw new Error("Failed to fetch study types");
  return res.json();
};

export const createStudyType = async (name: string, color: string, icon: string): Promise<StudyType> => {
  const res = await fetch("/api/study-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color, icon }),
  });
  if (!res.ok) throw new Error("Failed to create study type");
  return res.json();
};

export const fetchTotalStudyTime = async (studyTypeId: number): Promise<number> => {
  const res = await fetch(`/api/study-types/${studyTypeId}/total`);
  if (!res.ok) throw new Error("Failed to fetch total study time");
  const data = await res.json();
  return data.total;
};

export const fetchGlobalTotalStudyTime = async (): Promise<number> => {
  const res = await fetch("/api/total-study-time");
  if (!res.ok) throw new Error("Failed to fetch global total study time");
  const data = await res.json();
  return data.total;
};

export const deleteStudyType = async (id: number): Promise<void> => {
  const res = await fetch(`/api/study-types/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete study type");
};

export const deleteStudyLog = async (id: number): Promise<void> => {
  const res = await fetch(`/api/study-logs/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete study log");
};

export const fetchStudyLogs = async (startDate: string, endDate: string, studyTypeId?: number): Promise<StudyLog[]> => {
  const url = new URL("/api/study-logs", window.location.origin);
  url.searchParams.append("start_date", startDate);
  url.searchParams.append("end_date", endDate);
  if (studyTypeId) url.searchParams.append("study_type_id", studyTypeId.toString());

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch study logs");
  return res.json();
};

export const logStudyTime = async (studyTypeId: number, minutes: number, date: string): Promise<void> => {
  const res = await fetch("/api/study-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ study_type_id: studyTypeId, minutes, date }),
  });
  if (!res.ok) throw new Error("Failed to log study time");
};
