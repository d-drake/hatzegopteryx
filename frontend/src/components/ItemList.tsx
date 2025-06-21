import React from 'react';
import { Item } from '../types/Item';

interface ItemListProps {
  items: Item[];
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}

const ItemList: React.FC<ItemListProps> = ({ items, onToggle, onDelete }) => {
  return (
    <div className="item-list">
      {items.map((item) => (
        <div key={item.id} className="item">
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => onToggle(item.id, !item.completed)}
          />
          <div className="item-content">
            <h3 className={item.completed ? 'completed' : ''}>{item.title}</h3>
            {item.description && <p>{item.description}</p>}
          </div>
          <button onClick={() => onDelete(item.id)} className="delete-btn">
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};

export default ItemList;