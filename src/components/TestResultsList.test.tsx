import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestResultsList from './TestResultsList';

interface TestResult {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'error';
  duration?: number;
  message?: string;
}

const mockPassResults: TestResult[] = [
  {
    id: 'test-001',
    name: 'GET /hello returns 200 status code',
    status: 'pass',
    duration: 42,
  },
  {
    id: 'test-002',
    name: 'GET /hello response contains message key',
    status: 'pass',
    duration: 38,
  },
  {
    id: 'test-003',
    name: 'GET /hello timestamp conforms to ISO 8601',
    status: 'pass',
    duration: 51,
  },
];

const mockMixedResults: TestResult[] = [
  {
    id: 'test-001',
    name: 'GET /hello returns 200 status code',
    status: 'pass',
    duration: 42,
  },
  {
    id: 'test-002',
    name: 'GET /hello response contains message key',
    status: 'fail',
    duration: 15,
    message: 'Expected message key to be a non-empty string',
  },
  {
    id: 'test-003',
    name: 'GET /hello timestamp conforms to ISO 8601',
    status: 'error',
    duration: 5,
    message: 'Unexpected runtime error during assertion',
  },
];

describe('TestResultsList', () => {
  describe('Loading state', () => {
    it('renders 3 skeleton rows when isLoading is true', () => {
      render(
        <TestResultsList
          results={[]}
          passCount={0}
          failCount={0}
          isLoading={true}
        />
      );

      const skeletonRows = screen.getAllByTestId('skeleton-row');
      expect(skeletonRows).toHaveLength(3);
    });

    it('does not render result items while loading', () => {
      render(
        <TestResultsList
          results={mockPassResults}
          passCount={3}
          failCount={0}
          isLoading={true}
        />
      );

      expect(screen.queryByTestId('test-result-item')).not.toBeInTheDocument();
    });

    it('does not render summary counts while loading', () => {
      render(
        <TestResultsList
          results={mockPassResults}
          passCount={3}
          failCount={0}
          isLoading={true}
        />
      );

      expect(screen.queryByTestId('pass-count')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fail-count')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('renders empty state message when results array is empty and not loading', () => {
      render(
        <TestResultsList
          results={[]}
          passCount={0}
          failCount={0}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText(/no tests run yet/i)).toBeInTheDocument();
    });

    it('renders a run suite button in empty state', () => {
      render(
        <TestResultsList
          results={[]}
          passCount={0}
          failCount={0}
          isLoading={false}
        />
      );

      const runButton = screen.getByRole('button', { name: /run suite/i });
      expect(runButton).toBeInTheDocument();
    });

    it('does not render result items in empty state', () => {
      render(
        <TestResultsList
          results={[]}
          passCount={0}
          failCount={0}
          isLoading={false}
        />
      );

      expect(screen.queryByTestId('test-result-item')).not.toBeInTheDocument();
    });
  });

  describe('All-pass variant', () => {
    it('renders all result items when all tests pass', () => {
      render(
        <TestResultsList
          results={mockPassResults}
          passCount={3}
          failCount={0}
          isLoading={false}
        />
      );

      const resultItems = screen.getAllByTestId('test-result-item');
      expect(resultItems).toHaveLength(3);
    });

    it('displays correct pass count', () => {
      render(
        <TestResultsList
          results={mockPassResults}
          passCount={3}
          failCount={0}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('pass-count')).toHaveTextContent('3');
    });

    it('displays zero fail count', () => {
      render(
        <TestResultsList
          results={mockPassResults}
          passCount={3}
          failCount={0}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('fail-count')).toHaveTextContent('0');
    });

    it('renders each test name', () => {
      render(
        <TestResultsList
          results={mockPassResults}
          passCount={3}
          failCount={0}
          isLoading={false}
        />
      );

      mockPassResults.forEach((result) => {
        expect(screen.getByText(result.name)).toBeInTheDocument();
      });
    });

    it('renders pass status indicator for each result', () => {
      render(
        <TestResultsList
          results={mockPassResults}
          passCount={3}
          failCount={0}
          isLoading={false}
        />
      );

      const passIndicators = screen.getAllByTestId('status-pass');
      expect(passIndicators).toHaveLength(3);
    });

    it('does not render runner error banner when all tests pass', () => {
      render(
        <TestResultsList
          results={mockPassResults}
          passCount={3}
          failCount={0}
          isLoading={false}
        />
      );

      expect(screen.queryByTestId('runner-error-banner')).not.toBeInTheDocument();
    });

    it('applies success colour styling to pass count', () => {
      render(
        <TestResultsList
          results={mockPassResults}
          passCount={3}
          failCount={0}
          isLoading={false}
        />
      );

      const passCount = screen.getByTestId('pass-count');
      expect(passCount).toHaveClass('text-green-700');
    });
  });

  describe('Has-failures variant', () => {
    it('renders all result items including failures', () => {
      render(
        <TestResultsList
          results={mockMixedResults}
          passCount={1}
          failCount={2}
          isLoading={false}
        />
      );

      const resultItems = screen.getAllByTestId('test-result-item');
      expect(resultItems).toHaveLength(3);
    });

    it('displays correct pass count', () => {
      render(
        <TestResultsList
          results={mockMixedResults}
          passCount={1}
          failCount={2}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('pass-count')).toHaveTextContent('1');
    });

    it('displays correct fail count', () => {
      render(
        <TestResultsList
          results={mockMixedResults}
          passCount={1}
          failCount={2}
          isLoading={false}
        />
      );