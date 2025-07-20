"use client";
import { Todo } from "@prisma/client";
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
export default function Home() {
  const [newTodo, setNewTodo] = useState({
    title: "",
    dueDate: null,
    description: "",
    selectedDependencyIds: [],
  } as todoCreateDto);
  const [todos, setTodos] = useState([] as TodoDto[]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      const todoItems: TodoDto[] = await res.json();
      setTodos(todoItems);
      console.log("todo items", todoItems);
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) return;
    try {
      await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTodo),
      });
      setNewTodo({
        title: "",
        dueDate: null,
        description: "",
        selectedDependencyIds: [],
      });
      fetchTodos();
    } catch (error) {
      console.error("Failed to add todo:", error);
    }
  };

  const handleDeleteTodo = async (id: any) => {
    try {
      await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });
      setNewTodo({
        title: "",
        dueDate: null,
        description: "",
        selectedDependencyIds: [],
      });
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

    const spacingX = 600; // horizontal distance between DAGs
    const spacingY = 200;

    dagGroups.forEach((group, groupIndex) => {
      const idToTodo = new Map<number, TodoDto>(group.map((t) => [t.id, t]));
      const depths = new Map<number, number>();

      // Find roots (nodes with no dependencies)
      const roots = group.filter(
        (todo) => !todo.dependencies || todo.dependencies.length === 0
      );

      // Compute max depth from root → leaf using DFS
      function computeDepth(todo: TodoDto, depth: number) {
        if ((depths.get(todo.id) ?? -1) >= depth) return;
        depths.set(todo.id, depth);
        todo.dependents?.forEach((dep) => {
          const fullDep = idToTodo.get(dep.id);
          if (fullDep) computeDepth(fullDep, depth + 1);
        });
      }

      roots.forEach((root) => computeDepth(root, 0));

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
          const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date();

          nodes.push({
            id: todo.id.toString(),
            type: "default",
            position: {
              x: groupIndex * 800 + index * spacingX, // spread out horizontally across layers
              y: depth * spacingY,
            },
            data: {
              label: (
                <div
                  key={todo.id}
                  className={`flex justify-between items-center bg-opacity-90 p-4 mb-4 rounded-lg shadow-lg ${
                    newTodo.selectedDependencyIds.includes(todo.id)
                      ? "bg-indigo-500"
                      : isOverdue
                      ? "bg-red-300"
                      : "bg-white"
                  }`}
                  onClick={() =>
                    setNewTodo((prev) =>
                      prev.selectedDependencyIds.includes(todo.id)
                        ? {
                            ...prev,
                            selectedDependencyIds:
                              prev.selectedDependencyIds.filter(
                                (id) => id !== todo.id
                              ),
                          }
                        : {
                            ...prev,
                            selectedDependencyIds: [
                              ...prev.selectedDependencyIds,
                              todo.id,
                            ],
                          }
                    )
                  }
                >
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-800">
                      {todo.title}
                    </p>
                    <p className="text-sm text-gray-600">{todo.description}</p>
                  </div>
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    {todo.dueDate}
                  </span>
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
                    {/* Delete Icon */}
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
              style: { stroke: "#6366f1" },
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
      <div className="w-full max-w flex flex-col items-center">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          Things To Do App
        </h1>
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
          <input
            type="date"
            value={newTodo.dueDate ? newTodo.dueDate.split("T")[0] : ""}
            onChange={(e) =>
              setNewTodo((prev) => ({
                ...prev,
                dueDate: new Date(e.target.value)
                  ? new Date(e.target.value).toISOString()
                  : null,
              }))
            }
          />
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
