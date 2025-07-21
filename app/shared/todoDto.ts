import { Todo } from "@prisma/client";
export interface TodoDto {
  id: number;
  title: string;
  dueDate: string | null; // ISO string
  createdAt: string;
  description: string;
  imageUrl: string;
  workUnits: number | null; //currently being treated as days
  dependencies: Todo[];
  dependents: Todo[];
}

export interface todoCreateDto {
  title: string;
  dueDate: string | null; // ISO string
  description: string;
  parentIds: number[]; //the new todo is dependent on these
  childIds: number[]; //existing todos which are dependent on the new todo
}
