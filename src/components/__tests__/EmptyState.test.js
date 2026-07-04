import React from 'react';
import { render, screen } from '@testing-library/react';
import EmptyState from '../EmptyState';

describe('EmptyState component', () => {
  it('renders default no-data variant correctly', () => {
    render(<EmptyState title="No Data Found" description="Try again later" />);
    
    expect(screen.getByText('No Data Found')).toBeInTheDocument();
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });

  it('renders error variant correctly', () => {
    render(
      <EmptyState 
        title="An Error Occurred" 
        description="Something went wrong" 
        variant="error" 
      />
    );
    
    expect(screen.getByText('An Error Occurred')).toBeInTheDocument();
  });

  it('renders action button when action property is provided', () => {
    const handleAction = jest.fn();
    render(
      <EmptyState 
        title="No Results" 
        action={{ label: 'Clear Filters', onClick: handleAction }} 
      />
    );
    
    const button = screen.getByRole('button', { name: 'Clear Filters' });
    expect(button).toBeInTheDocument();
    
    button.click();
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
