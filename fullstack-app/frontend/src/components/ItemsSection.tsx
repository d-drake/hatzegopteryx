"use client";

import { useState, useEffect } from "react";
import { Item, CreateItem } from "@/types";
import { itemsApi } from "@/lib/api";

export default function ItemsSection() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await itemsApi.getAll();
      setItems(data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch items");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    try {
      const newItem: CreateItem = {
        title: newItemTitle.trim(),
        description: newItemDescription.trim() || undefined,
      };
      const created = await itemsApi.create(newItem);
      setItems([...items, created]);
      setNewItemTitle("");
      setNewItemDescription("");
    } catch (err) {
      setError("Failed to create item");
      console.error(err);
    }
  };

  const handleToggleItem = async (id: number, completed: boolean) => {
    try {
      const updated = await itemsApi.update(id, { completed });
      setItems(items.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError("Failed to update item");
      console.error(err);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await itemsApi.delete(id);
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      setError("Failed to delete item");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleAddItem} className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Add New Item</h2>
        <div className="space-y-4">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Item title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <textarea
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Item
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow p-6 flex items-start space-x-4"
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => handleToggleItem(item.id, !item.completed)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <h3
                className={`text-lg font-medium ${item.completed ? "line-through text-gray-500" : "text-gray-900"}`}
              >
                {item.title}
              </h3>
              {item.description && (
                <p className="text-gray-600 mt-1">{item.description}</p>
              )}
              <p className="text-sm text-gray-400 mt-2">
                Created: {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleDeleteItem(item.id)}
              className="text-red-600 hover:text-red-800 focus:outline-none"
            >
              Delete
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items found. Add your first item above!
          </div>
        )}
      </div>
    </div>
  );
}
