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
        include: { dependencies: true, dependents: true },
        orderBy: {
          createdAt: "desc",
        },
      })
    ).map((todo) => ({
      ...todo,
      createdAt: todo.createdAt.toISOString(),
      dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
      workUnits: todo.workUnits ? todo.workUnits : null,
    }));
    return NextResponse.json(todos);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching todos" },
      { status: 500 }
    );
  }
}

async function hasCycle(
  newTodoId: number, // use -1 if creating a new todo
  parentIds: number[]
): Promise<boolean> {
  const visited = new Set<number>();
  const stack = [...parentIds];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) continue;

    if (currentId === newTodoId) {
      return true; // 🔁 cycle detected
    }

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Fetch parents of the current node (i.e., dependencies of the todo)
    const current = await prisma.todo.findUnique({
      where: { id: currentId },
      select: { dependencies: { select: { id: true } } },
    });

    if (current?.dependencies) {
      const dependencyIds = current.dependencies.map((d) => d.id);
      stack.push(...dependencyIds);
    }
  }

  return false; // ✅ no cycle
}

export async function POST(request: Request) {
  try {
    const processedRequst = await request.json();
    console.log(processedRequst);
    const { title, dueDate, description, parentIds, childIds } =
      processedRequst;
    let imageUrl = "";

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    try {
      const pexelsPhotoResponse = await pexelsClient.photos.search({
        query: description ? description : title,
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

    if (childIds.length && parentIds.length) {
      for (const childId of childIds) {
        const willCycle = await hasCycle(childId, parentIds);
        if (willCycle) {
          return NextResponse.json(
            { error: "Cycle detected: Cannot link todos in this way." },
            { status: 400 }
          );
        }
      }
    }

    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate,
        description,
        imageUrl,
        dependencies: {
          connect: parentIds.map((id: number) => ({ id })),
        },
        dependents: {
          connect: childIds.map((id: number) => ({ id })),
        },
      },
    });
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Error creating todo" }, { status: 500 });
  }
}
