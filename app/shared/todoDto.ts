export interface TodoDto {
  id: number;
  title: string;
  dueDate: string | null; // ISO string
  createdAt: string;
  description: string;
  imageUrl: string;
}

export interface todoCreateDto {
  title: string;
  dueDate: string | null;
  description: string;
}
