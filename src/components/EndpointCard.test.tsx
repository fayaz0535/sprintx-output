import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import EndpointCard from './EndpointCard';

describe('EndpointCard', () => {
  const defaultProps = {
    method: 'GET',
    route: '/hello',
    description: 'Returns a greeting message with a server timestamp',
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering ────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders the HTTP method', () => {
      render(<EndpointCard {...defaultProps} />);
      expect(screen.getByText('GET')).toBeInTheDocument();
    });

    it('renders the route', () => {
      render(<EndpointCard {...defaultProps} />);
      expect(screen.getByText('/hello')).toBeInTheDocument();
    });

    it('renders the description', () => {
      render(<EndpointCard {...defaultProps} />);
      expect(
        screen.getByText('Returns a greeting message with a server timestamp')
      ).toBeInTheDocument();
    });

    it('renders without crashing when onClick is not provided', () => {
      const { method, route, description } = defaultProps;
      render(<EndpointCard method={method} route={route} description={description} />);
      expect(screen.getByText('/hello')).toBeInTheDocument();
    });

    it('renders a POST method correctly', () => {
      render(<EndpointCard {...defaultProps} method="POST" />);
      expect(screen.getByText('POST')).toBeInTheDocument();
    });

    it('renders various HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      methods.forEach((method) => {
        const { unmount } = render(
          <EndpointCard {...defaultProps} method={method} />
        );
        expect(screen.getByText(method)).toBeInTheDocument();
        unmount();
      });
    });

    it('renders all known API routes', () => {
      const routes = ['/hello', '/', '/api/status', '/api/tests/results'];
      routes.forEach((route) => {
        const { unmount } = render(
          <EndpointCard {...defaultProps} route={route} />
        );
        expect(screen.getByText(route)).toBeInTheDocument();
        unmount();
      });
    });
  });

  // ─── Variants ─────────────────────────────────────────────────────────────

  describe('variants', () => {
    it('applies default variant classes when no variant is specified', () => {
      const { container } = render(<EndpointCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
    });

    it('applies active variant styling when variant="active"', () => {
      const { container } = render(
        <EndpointCard {...defaultProps} variant="active" />
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('data-variant', 'active');
    });

    it('applies disabled variant styling when variant="disabled"', () => {
      const { container } = render(
        <EndpointCard {...defaultProps} variant="disabled" />
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('data-variant', 'disabled');
    });

    it('applies default variant when variant prop is omitted', () => {
      const { container } = render(<EndpointCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('data-variant', 'default');
    });
  });

  // ─── Interaction ──────────────────────────────────────────────────────────

  describe('interaction', () => {
    it('calls onClick when the card is clicked', async () => {
      const user = userEvent.setup();
      render(<EndpointCard {...defaultProps} />);
      const card = screen.getByRole('button');
      await user.click(card);
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick with method and route payload', async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      render(<EndpointCard {...defaultProps} onClick={onClick} />);
      const card = screen.getByRole('button');
      await user.click(card);
      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', route: '/hello' })
      );
    });

    it('does not throw when clicked and onClick is undefined', () => {
      render(
        <EndpointCard
          method="GET"
          route="/hello"
          description="Test"
        />
      );
      const card = screen.getByRole('button');
      expect(() => fireEvent.click(card)).not.toThrow();
    });

    it('is focusable via keyboard', () => {
      render(<EndpointCard {...defaultProps} />);
      const card = screen.getByRole('button');
      card.focus();
      expect(card).toHaveFocus();
    });

    it('triggers onClick when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<EndpointCard {...defaultProps} />);
      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Enter}');
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('triggers onClick when Space key is pressed', async () => {
      const user = userEvent.setup();
      render(<EndpointCard {...defaultProps} />);
      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard(' ');
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when variant is disabled', async () => {
      const user = userEvent.setup();
      render(<EndpointCard {...defaultProps} variant="disabled" />);
      const card = screen.getByRole('button');
      await user.click(card);
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    it('has aria-disabled attribute when variant is disabled', () => {
      render(<EndpointCard {...defaultProps} variant="disabled" />);
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('has an accessible role', () => {
      render(<EndpointCard {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has an accessible label that includes method and route', () => {
      render(<EndpointCard {...defaultProps} />);
      const card = screen.getByRole('button');
      const label = card.getAttribute('aria-label') || card.textContent || '';
      expect(label).toMatch(/GET/i);
      expect(label).toMatch(/\/hello/i);
    });

    it('has a tooltip or title on the disabled card explaining unavailability', () => {
      render(<EndpointCard {...defaultProps} variant="disabled" />);
      const card = screen.getByRole('button');
      const hasTitle = card.hasAttribute('title');
      const hasAriaDescribedBy = card.hasAttribute('aria-describedby');
      expect(hasTitle || has