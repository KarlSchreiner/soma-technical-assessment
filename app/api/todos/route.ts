import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { todoCreateDto, TodoDto } from "@/app/shared/todoDto";
import { createClient } from "pexels";
if (!process.env.PEXELS_API_KEY) {
  throw new Error("PEXELS_API_KEY not defined");
}
const pexelsClient = createClient(process.env.PEXELS_API_KEY);
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
      description: todo.description,
      imageUrl: todo.imageUrl,
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
    const { title, dueDate, description } =
      (await request.json()) as todoCreateDto;
    let imageUrl = "";

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (description) {
      try {
        const pexelsPhotoResponse = await pexelsClient.photos.search({
          query: description,
          per_page: 1,
        });
        if ("photos" in pexelsPhotoResponse) {
          imageUrl = pexelsPhotoResponse.photos[0].src.small;
        } else {
          console.error("Error from Pexels API:", pexelsPhotoResponse);
        }
      } catch (error) {
        console.error("Error fetching Pexels photos:", error);
      }
    }
    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate,
        description,
        imageUrl,
      },
    });
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error creating todo" }, { status: 500 });
  }
}
