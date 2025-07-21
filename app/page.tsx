"use client";
import toast, { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";
import { TodoDto, todoCreateDto } from "./shared/todoDto";
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  MiniMap,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  computeEarliestDates,
  computeLatestDates,
  formatAsLocalDateString,
} from "./utils";
export default function Home() {
  function createEmptyNewToDo(): todoCreateDto {
    return {
      title: "",
      dueDate: null,
      description: "",
      workUnits: 1,
      parentIds: [],
      childIds: [],
    };
  }
  const [newTodo, setNewTodo] = useState(createEmptyNewToDo());
  const [todos, setTodos] = useState([] as TodoDto[]);
  const [todoIdToClickMap, setTodoIdToClickMap] = useState<Map<number, number>>(
    new Map()
  );

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      const todoItems: TodoDto[] = await res.json();
      setTodos(todoItems);
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) return;
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTodo),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData?.error?.toLowerCase().includes("cycle")) {
          toast.error(
            "⚠️ Cannot add todo: it would create a circular dependency. Please fix relationship."
          );
          return; //don't clear selection let user try to fix relation
        } else {
          toast.error("❌ Failed to add todo.");
        }
      }

      setNewTodo(createEmptyNewToDo());
      setTodoIdToClickMap(new Map());
      fetchTodos();
    } catch (error) {
      toast.error("❌ Failed to add todo.");
    }
  };

  const handleDeleteTodo = async (id: any) => {
    try {
      await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });
      setNewTodo(createEmptyNewToDo());
      setTodoIdToClickMap(new Map());
      fetchTodos();
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };
  function groupTodosIntoDAGs(todos: TodoDto[]): TodoDto[][] {
    const visited = new Set<number>();
    const idToTodo = new Map<number, TodoDto>(
      todos.map((todo) => [todo.id, todo])
    );
    const groups: TodoDto[][] = [];

    for (const todo of todos) {
      if (visited.has(todo.id)) continue;

      const group: TodoDto[] = [];
      const stack = [todo];

      while (stack.length > 0) {
        const current = stack.pop();
        if (!current || visited.has(current.id)) continue;

        visited.add(current.id);
        group.push(current);

        // Traverse dependencies and dependents
        const neighbors = [
          ...(current.dependencies || []),
          ...(current.dependents || []),
        ];

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.id)) {
            const newNeighbor = idToTodo.get(neighbor.id);
            if (newNeighbor) stack.push(newNeighbor);
          }
        }
      }

      groups.push(group);
    }

    return groups;
  }

  function layoutTodosWithSpacing(todos: TodoDto[]): {
    nodes: Node[];
    edges: Edge[];
  } {
    const dagGroups = groupTodosIntoDAGs(todos);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const holidays = new Set<string>();

    const earliestDates = computeEarliestDates(todos, holidays);

    const latestDates = computeLatestDates(todos, earliestDates);

    const criticalEdges = new Set<string>();
    const criticalNodes = new Set<number>();

    for (const todo of todos) {
      const early = earliestDates.get(todo.id);
      const late = latestDates.get(todo.id);
      if (!early || !late) continue;

      const isCritical =
        early.earliestStart.getTime() === late.latestStart.getTime();
      if (isCritical) {
        criticalNodes.add(todo.id);

        todo.dependencies?.forEach((dep) => {
          const depEarly = earliestDates.get(dep.id);
          const depLate = latestDates.get(dep.id);
          if (
            depEarly &&
            depLate &&
            depEarly.earliestStart.getTime() === depLate.latestStart.getTime()
          ) {
            criticalEdges.add(`e-${dep.id}-${todo.id}`);
          }
        });
      }
    }

    const spacingX = 600;
    const spacingY = 200;

    dagGroups.forEach((group, groupIndex) => {
      // ...existing group logic...
      const idToTodo = new Map<number, TodoDto>(group.map((t) => [t.id, t]));
      const depths = new Map<number, number>();

      const roots = group.filter((t) => !t.dependencies?.length);
      function computeDepth(todo: TodoDto, depth: number) {
        if ((depths.get(todo.id) ?? -1) >= depth) return;
        depths.set(todo.id, depth);
        todo.dependents?.forEach((dep) => {
          const fullDep = idToTodo.get(dep.id);
          if (fullDep) computeDepth(fullDep, depth + 1);
        });
      }
      roots.forEach((r) => computeDepth(r, 0));

      // Group todos by depth for horizontal layout
      const layers = new Map<number, TodoDto[]>();
      for (const todo of group) {
        const depth = depths.get(todo.id) ?? 0;
        if (!layers.has(depth)) layers.set(depth, []);
        layers.get(depth)!.push(todo);
      }

      for (const [depth, layer] of [...layers.entries()].sort(
        (a, b) => a[0] - b[0]
      )) {
        layer.forEach((todo, index) => {
          const dateInfo = earliestDates.get(todo.id);
          const bgColor = newTodo.parentIds.includes(todo.id)
            ? "bg-indigo-500"
            : newTodo.childIds.includes(todo.id)
            ? "bg-green-400"
            : todo.dueDate &&
              dateInfo &&
              todo.dueDate < dateInfo.earliestFinish.toISOString() //If our earliest finish date is after our due date we need to flag
            ? "bg-red-300"
            : "bg-white";
          const projectStart = new Date(
            Math.min(
              ...Array.from(earliestDates.values()).map((d) =>
                d.earliestStart.getTime()
              )
            )
          );

          const daysFromStart = Math.floor(
            ((dateInfo?.earliestStart?.getTime?.() ?? projectStart.getTime()) -
              projectStart.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          nodes.push({
            id: todo.id.toString(),
            type: "default",
            position: {
              x: groupIndex * 800 + index * spacingX,
              y: daysFromStart * 200,
            },
            data: {
              label: (
                <div
                  key={todo.id}
                  className={`flex flex-col bg-opacity-90 p-4 mb-4 rounded-lg shadow-lg ${bgColor}`}
                  onClick={() => {
                    const count = todoIdToClickMap.get(todo.id) ?? 0;
                    const newCount = (count + 1) % 3;
                    const updatedClickMap = new Map(todoIdToClickMap);
                    updatedClickMap.set(todo.id, newCount);
                    setTodoIdToClickMap(updatedClickMap);

                    setNewTodo((prev) => {
                      let deps = [...prev.parentIds].filter(
                        (id) => id !== todo.id
                      );
                      let dependents = [...prev.childIds].filter(
                        (id) => id !== todo.id
                      );
                      if (newCount === 1) deps.push(todo.id);
                      if (newCount === 2) dependents.push(todo.id);
                      return { ...prev, parentIds: deps, childIds: dependents };
                    });
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-gray-800">
                        {todo.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {todo.description}
                      </p>
                      {dateInfo && (
                        <p className="text-xs text-gray-500 mt-1">
                          🕒 Start:{" "}
                          {formatAsLocalDateString(
                            dateInfo.earliestStart.toISOString()
                          )}{" "}
                          <br />⏳ Finish:{" "}
                          {formatAsLocalDateString(
                            dateInfo.earliestFinish.toISOString()
                          )}
                          {todo.dueDate && (
                            <>
                              <br /> 📅 Due Date:
                              {` ${formatAsLocalDateString(todo.dueDate)}`}
                            </>
                          )}
                        </p>
                      )}
                    </div>

                    {todo.imageUrl && (
                      <img
                        src={todo.imageUrl}
                        alt={todo.title}
                        className="w-12 h-12 object-cover rounded-full"
                      />
                    )}
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="text-red-500 hover:text-red-700 transition duration-300"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ),
            },
            style: {
              width: "auto",
              height: "auto",
            },
          });

          todo.dependencies?.forEach((dep) => {
            edges.push({
              id: `e-${todo.id}-${dep.id}`,
              source: dep.id.toString(),
              target: todo.id.toString(),
              animated: true,
              style: {
                stroke: criticalEdges.has(`e-${dep.id}-${todo.id}`)
                  ? "#dc2626"
                  : "#6366f1",
                strokeWidth: criticalEdges.has(`e-${dep.id}-${todo.id}`)
                  ? 3
                  : 1.5,
              },
            });
          });
        });
      }
    });

    return { nodes, edges };
  }

  const { nodes, edges } = layoutTodosWithSpacing(todos);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col items-center p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w flex flex-col items-center">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          Things To Do App
        </h1>
        <div className="bg-white text-sm text-gray-700 rounded-md p-3 mb-4 max-w-3xl shadow">
          <p>
            <strong>Instructions:</strong> Click an existing todo to define
            relationships for the one you're creating:
          </p>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>
              <span className="text-indigo-600 font-semibold">
                Click once (Indigo)
              </span>
              : The selected todo must be completed <strong>before</strong> the
              one you're creating can begin.
            </li>
            <li>
              <span className="text-green-600 font-semibold">
                Click twice (Green)
              </span>
              : The todo you're creating must be completed{" "}
              <strong>before</strong> the selected one can begin.
            </li>
            <li>Click a third time to remove the connection.</li>
          </ul>
        </div>
        <div className="flex mb-6">
          <input
            type="text"
            className="flex-grow p-3 rounded-l-full focus:outline-none text-gray-700"
            placeholder="Add a new todo"
            value={newTodo.title}
            onChange={(e) =>
              setNewTodo((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
          />
          <input
            type="text"
            placeholder="Description"
            value={newTodo.description}
            onChange={(e) =>
              setNewTodo((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />
          <label className="flex items-center  bg-white">
            How many days will this take?
            <input
              type="number"
              min={1}
              className="ml-2 p-2 rounded text-gray-800 w-20"
              value={newTodo.workUnits}
              onChange={(e) =>
                setNewTodo((prev) => ({
                  ...prev,
                  workUnits: parseInt(e.target.value),
                }))
              }
            />
          </label>
          <label className="flex items-center  bg-white">
            Due Date
            <input
              type="date"
              className="pl-2"
              value={newTodo.dueDate ? newTodo.dueDate.split("T")[0] : ""}
              onChange={(e) => {
                setNewTodo((prev) => ({
                  ...prev,
                  dueDate: new Date(e.target.value)
                    ? new Date(e.target.value).toISOString()
                    : null,
                }));
              }}
            />
          </label>
          <button
            onClick={handleAddTodo}
            className="bg-white text-indigo-600 p-3 rounded-r-full hover:bg-gray-100 transition duration-300"
          >
            Add
          </button>
        </div>
        <div className="h-[700px] w-full bg-white rounded-lg shadow-lg overflow-hidden">
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <MiniMap />
            <Controls />
            <Background gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
