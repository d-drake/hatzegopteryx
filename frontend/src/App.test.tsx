import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock the api module
jest.mock('./services/api', () => ({
  itemsApi: {
    getAll: jest.fn(() => Promise.resolve([])),
  },
}));

test('renders app title', async () => {
  render(<App />);
  
  // Wait for the component to finish loading
  await waitFor(() => {
    const titleElement = screen.getByText(/Fullstack Todo App/i);
    expect(titleElement).toBeInTheDocument();
  });
});
