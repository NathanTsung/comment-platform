import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Comment Analysis Tool heading', () => {
  render(<App />);
  const heading = screen.getByText(/Comment Analysis Tool/i);
  expect(heading).toBeInTheDocument();
});
