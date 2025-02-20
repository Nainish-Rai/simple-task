"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Menu, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Todo {
  id: string;
  content: string;
  color: string;
}

function SortableItem(props: { todo: Todo }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${props.todo.color} p-4 rounded-lg shadow-lg mb-4 flex items-center`}
    >
      <div {...attributes} {...listeners} className="cursor-move mr-2">
        <GripVertical className="text-gray-500" />
      </div>
      <div>
        <h3 className="text-black font-semibold mb-2">{props.todo.content}</h3>
      </div>
    </li>
  );
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: "1", content: "Buy honey 100% original", color: "bg-[#FFB3BA]" },
    { id: "2", content: "Plan for the day", color: "bg-[#FFDFBA]" },
    {
      id: "3",
      content: "Tax payment before the end of march",
      color: "bg-[#BAE1FF]",
    },
    {
      id: "4",
      content: "Password WiFi gelato cafe near the station",
      color: "bg-[#BAFFC9]",
    },
  ]);
  const [newTodo, setNewTodo] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setTodos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const addTodo = () => {
    if (newTodo.trim() !== "") {
      const colors = [
        "bg-[#FFB3BA]",
        "bg-[#FFDFBA]",
        "bg-[#BAE1FF]",
        "bg-[#BAFFC9]",
      ];
      const newId = (todos.length + 1).toString();
      const newTodoItem: Todo = {
        id: newId,
        content: newTodo,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
      setTodos([...todos, newTodoItem]);
      setNewTodo("");
    }
  };

  return (
    <div className="min-h-screen  text-white p-4">
      <main>
        <h2 className="text-3xl font-bold mb-4">My Notes</h2>
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          <Button variant="secondary" className="whitespace-nowrap">
            All (20)
          </Button>
          <Button variant="outline" className="whitespace-nowrap">
            Important
          </Button>
          <Button variant="outline" className="whitespace-nowrap">
            Bookmarked
          </Button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={todos} strategy={verticalListSortingStrategy}>
            <ul className="space-y-4">
              {todos.map((todo) => (
                <SortableItem key={todo.id} todo={todo} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <div className="mt-6 flex space-x-2">
          <Input
            type="text"
            placeholder="Add a new todo"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={addTodo}>Add Todo</Button>
        </div>
      </main>
    </div>
  );
}
