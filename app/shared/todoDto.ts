import { Todo } from "@prisma/client";
export interface TodoDto {
  id: number;
  title: string;
  dueDate: string | null; // ISO string
  createdAt: string;
  description: string;
  imageUrl: string;
  workUnits: number | null;
  dependencies: Todo[];
  dependents: Todo[];
}

export interface todoCreateDto {
  title: string;
  dueDate: string | null; // ISO string
  description: string;
  selectedDependencyIds: number[];
}
