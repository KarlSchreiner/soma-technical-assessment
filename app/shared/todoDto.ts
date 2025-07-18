export interface TodoDto {
  id: number;
  title: string;
  dueDate: string | null; // ISO string
  createdAt: string;
}
