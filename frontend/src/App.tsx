import React, { useState, useEffect } from 'react';
import './App.css';
import ItemList from './components/ItemList';
import ItemForm from './components/ItemForm';
import { Item, CreateItem } from './types/Item';
import { itemsApi } from './services/api';

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError('Failed to fetch items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (newItem: CreateItem) => {
    try {
      const created = await itemsApi.create(newItem);
      setItems([...items, created]);
    } catch (err) {
      setError('Failed to create item');
      console.error(err);
    }
  };

  const handleToggleItem = async (id: number, completed: boolean) => {
    try {
      const updated = await itemsApi.update(id, { completed });
      setItems(items.map(item => item.id === id ? updated : item));
    } catch (err) {
      setError('Failed to update item');
      console.error(err);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await itemsApi.delete(id);
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      setError('Failed to delete item');
      console.error(err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Fullstack Todo App</h1>
      </header>
      <main>
        {error && <div className="error">{error}</div>}
        <ItemForm onSubmit={handleAddItem} />
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <ItemList
            items={items}
            onToggle={handleToggleItem}
            onDelete={handleDeleteItem}
          />
        )}
      </main>
    </div>
  );
}

export default App;
