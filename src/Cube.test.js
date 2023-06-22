import { render, screen } from '@testing-library/react';
import Cube from './Cube';

test('renders learn react link', () => {
  render(<Cube />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
