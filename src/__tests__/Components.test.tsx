import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent } from '../components';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600');
  });

  it('renders different variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-gray-100');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button').className).toContain('border-gray-300');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button').className).toContain('hover:bg-gray-100');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-3');
    expect(button.className).toContain('text-sm');

    rerender(<Button size="lg">Large</Button>);
    const largeButton = screen.getByRole('button');
    expect(largeButton.className).toContain('px-6');
    expect(largeButton.className).toContain('text-lg');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.className).toContain('opacity-50');
  });
});

describe('Input Component', () => {
  it('renders with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByRole('textbox').className).toContain('border-red-500');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input label="Test" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('supports different input types', () => {
    render(<Input label="Password" type="password" />);
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });
});

describe('Select Component', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ];

  it('renders with label and options', () => {
    render(<Select label="Choose" options={options} />);
    
    expect(screen.getByLabelText(/choose/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Option 1')).toBeInTheDocument();
  });

  it('displays placeholder when provided', () => {
    render(<Select label="Choose" options={options} placeholder="Select an option" />);
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<Select label="Choose" options={options} error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
    expect(screen.getByRole('combobox').className).toContain('border-red-500');
  });

  it('handles selection changes', () => {
    const handleChange = vi.fn();
    render(<Select label="Choose" options={options} onChange={handleChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('Card Components', () => {
  it('renders basic card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Test content</p>
        </CardContent>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders different card variants', () => {
    const { rerender } = render(<Card variant="outlined">Outlined</Card>);
    const outlinedCard = screen.getByText('Outlined').closest('div');
    expect(outlinedCard?.className).toContain('border-2');

    rerender(<Card variant="elevated">Elevated</Card>);
    const elevatedCard = screen.getByText('Elevated').closest('div');
    expect(elevatedCard?.className).toContain('shadow-lg');
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card?.className).toContain('custom-class');
  });
});