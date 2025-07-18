"use client";
import { Todo } from "@prisma/client";
import { useState, useEffect } from "react";
import { TodoDto } from "./shared/todoDto";
interface TodoInput {
  title: string;
  dueDate: Date | null;
}

export default function Home() {
  const [newTodo, setNewTodo] = useState({
    title: "",
    dueDate: null,
  } as TodoInput);
  const [todos, setTodos] = useState([] as Todo[]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      const data: TodoDto[] = await res.json();
      const todoItems: Todo[] = data.map((todo) => ({
        id: todo.id,
        title: todo.title,
        createdAt: new Date(todo.createdAt),
        dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
      }));
      setTodos(todoItems);
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
      setNewTodo({ title: "", dueDate: null });
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
      fetchTodos();
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col items-center p-4">
      <div className="w-full max-w-md">
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
            type="date"
            value={
              newTodo.dueDate ? newTodo.dueDate.toISOString().split("T")[0] : ""
            }
            onChange={(e) =>
              setNewTodo((prev) => ({
                ...prev,
                dueDate: e.target.value ? new Date(e.target.value) : null,
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
        <ul>
          {todos.map((todo: Todo) => {
            const isOverdue =
              todo.dueDate && new Date(todo.dueDate) < new Date();
            return (
              <li
                key={todo.id}
                className={`flex justify-between items-center bg-opacity-90 p-4 mb-4 rounded-lg shadow-lg ${
                  isOverdue ? "bg-red-300" : "bg-white"
                }`}
              >
                <span className="text-gray-800">{todo.title}</span>
                <span className="text-gray-800">
                  {todo.dueDate?.toDateString()}
                </span>
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
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
