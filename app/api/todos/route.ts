import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TodoDto } from "@/app/shared/todoDto";

export async function GET() {
  try {
    const todos: TodoDto[] = (
      await prisma.todo.findMany({
        orderBy: {
          createdAt: "desc",
        },
      })
    ).map((todo) => ({
      id: todo.id,
      title: todo.title,
      createdAt: todo.createdAt.toISOString(),
      dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
    }));
    return NextResponse.json(todos);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching todos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate } = await request.json();

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate,
      },
    });
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error creating todo" }, { status: 500 });
  }
}
