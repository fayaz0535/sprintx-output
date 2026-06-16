import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  describe('running variant', () => {
    it('renders with running status and default label', () => {
      render(<StatusBadge status="running" label="Running" />);
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('applies success colour styles for running status', () => {
      render(<StatusBadge status="running" label="Running" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-700');
    });

    it('renders the running indicator dot', () => {
      render(<StatusBadge status="running" label="Running" />);
      expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
    });
  });

  describe('stopped variant', () => {
    it('renders with stopped status and provided label', () => {
      render(<StatusBadge status="stopped" label="Stopped" />);
      expect(screen.getByText('Stopped')).toBeInTheDocument();
    });

    it('applies error colour styles for stopped status', () => {
      render(<StatusBadge status="stopped" label="Stopped" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-700');
    });
  });

  describe('loading variant', () => {
    it('renders skeleton pill when status is loading', () => {
      render(<StatusBadge status="loading" />);
      expect(screen.getByTestId('status-badge-skeleton')).toBeInTheDocument();
    });

    it('skeleton has minimum width of 64px', () => {
      render(<StatusBadge status="loading" />);
      const skeleton = screen.getByTestId('status-badge-skeleton');
      expect(skeleton).toHaveClass('w-16');
    });

    it('skeleton has animate-pulse class', () => {
      render(<StatusBadge status="loading" />);
      const skeleton = screen.getByTestId('status-badge-skeleton');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('does not render text content while loading', () => {
      render(<StatusBadge status="loading" label="Running" />);
      expect(screen.queryByText('Running')).not.toBeInTheDocument();
    });
  });

  describe('unknown / error state', () => {
    it('renders grey badge for unknown status', () => {
      render(<StatusBadge status="unknown" label="Unknown" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('bg-gray-100');
      expect(badge).toHaveClass('text-gray-600');
    });

    it('renders warning icon for unknown status', () => {
      render(<StatusBadge status="unknown" label="Unknown" />);
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    });

    it('renders grey badge when status prop is undefined', () => {
      render(<StatusBadge status={undefined as any} label="Unknown" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('bg-gray-100');
    });
  });

  describe('empty state', () => {
    it('renders checking animation when no status provided and not loading', () => {
      render(<StatusBadge status="" label="" />);
      expect(screen.getByTestId('status-badge-empty')).toBeInTheDocument();
    });

    it('shows Checking... text for empty state', () => {
      render(<StatusBadge status="" label="" />);
      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });

    it('applies pulse animation to empty state', () => {
      render(<StatusBadge status="" label="" />);
      const emptyBadge = screen.getByTestId('status-badge-empty');
      expect(emptyBadge).toHaveClass('animate-pulse');
    });
  });

  describe('size prop', () => {
    it('renders with default size when size prop is omitted', () => {
      render(<StatusBadge status="running" label="Running" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
    });

    it('applies small size classes when size is sm', () => {
      render(<StatusBadge status="running" label="Running" size="sm" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
    });

    it('applies medium size classes when size is md', () => {
      render(<StatusBadge status="running" label="Running" size="md" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('text-sm');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1');
    });

    it('applies large size classes when size is lg', () => {
      render(<StatusBadge status="running" label="Running" size="lg" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('text-base');
      expect(badge).toHaveClass('px-4');
      expect(badge).toHaveClass('py-1.5');
    });
  });

  describe('label prop', () => {
    it('renders custom label text', () => {
      render(<StatusBadge status="running" label="API Online" />);
      expect(screen.getByText('API Online')).toBeInTheDocument();
    });

    it('renders without label when label is not provided', () => {
      render(<StatusBadge status="running" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="status" on the badge element', () => {
      render(<StatusBadge status="running" label="Running" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has an aria-label that includes the status', () => {
      render(<StatusBadge status="running" label="Running" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', expect.stringContaining('running'));
    });

    it('has aria-live="polite" for dynamic status updates', () => {
      render(<StatusBadge status="running" label="Running" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });

    it('warning icon has aria-hidden when unknown status shown', () => {
      render(<StatusBadge status="unknown" label="Unknown" />);
      const icon = screen.getByTestId('warning-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('pill shape', () => {
    it('applies rounded-full class for pill shape', () => {
      render(<StatusBadge status="running" label="Running" />);
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('rounded-full');
    });
  });

  describe